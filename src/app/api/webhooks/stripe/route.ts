import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/email';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generatePolicyPDF } from '@/lib/documents/pdf';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Webhook signing secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handle successful checkout completion
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (!session.metadata?.policyId || !session.metadata?.paymentId) {
    console.error('Missing metadata in session:', session.id);
    return;
  }

  const { policyId, paymentId, customerId } = session.metadata;

  // Update payment status
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'COMPLETED',
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent as string,
    },
  });

  // Activate policy
  const policy = await prisma.policy.update({
    where: { id: policyId },
    data: {
      status: 'ACTIVE',
      effectiveDate: new Date(), // Set effective date to now
    },
    include: {
      customer: {
        include: {
          user: true,
        },
      },
      plan: {
        include: {
          insurer: true,
        },
      },
    },
  });

  // Generate policy documents
  await generatePolicyDocuments(policy);

  // Send welcome email
  await sendWelcomeEmail(policy);
}

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Additional payment success handling if needed
  console.log('Payment succeeded:', paymentIntent.id);
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  if (!paymentIntent.metadata?.policyId || !paymentIntent.metadata?.paymentId) {
    console.error('Missing metadata in payment intent:', paymentIntent.id);
    return;
  }

  const { policyId, paymentId } = paymentIntent.metadata;

  // Update payment status
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'FAILED',
      stripePaymentId: paymentIntent.id,
    },
  });

  // Update policy status
  const policy = await prisma.policy.update({
    where: { id: policyId },
    data: {
      status: 'CANCELLED',
    },
    include: {
      customer: {
        include: {
          user: true,
        },
      },
    },
  });

  // Send payment failure email
  await sendPaymentFailureEmail(policy);
}

// Handle refund
async function handleRefund(charge: Stripe.Charge) {
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
  });

  if (!payment) {
    console.error('Payment not found for charge:', charge.id);
    return;
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
    },
  });

  // Update policy status
  const policy = await prisma.policy.update({
    where: { id: payment.policyId },
    data: {
      status: 'CANCELLED',
    },
    include: {
      customer: {
        include: {
          user: true,
        },
      },
    },
  });

  // Send refund confirmation email
  await sendRefundEmail(policy);
}

// Helper function to generate policy documents
async function generatePolicyDocuments(policy: any) {
  try {
    // Generate policy certificate PDF
    const policyBuffer = await generatePolicyPDF(policy);
    
    // Upload to S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    const fileName = `policy-${policy.policyNumber}-${Date.now()}.pdf`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: `policies/${fileName}`,
      Body: policyBuffer,
      ContentType: 'application/pdf',
    }));
    
    // Create document record in database
    await prisma.document.create({
      data: {
        entityType: 'POLICY',
        entityId: policy.id,
        fileName,
        mimeType: 'application/pdf',
        fileSize: policyBuffer.length,
        s3Key: `policies/${fileName}`,
        uploadedById: policy.customer.userId ?? policy.customerId,
        status: 'READY',
      },
    });
    
    console.log('Policy documents generated for policy:', policy.id);
  } catch (error) {
    console.error('Error generating policy documents:', error);
  }
}

// Helper function to send welcome email
async function sendWelcomeEmail(policy: any) {
  const emailData = {
    to: policy.customer.user.email,
    subject: 'Welcome to Your New Health Insurance Policy',
    template: 'welcome',
    data: {
      customerName: `${policy.customer.firstName} ${policy.customer.lastName}`,
      policyNumber: policy.policyNumber,
      planName: policy.plan.name,
      insurerName: policy.plan.insurer.name,
      effectiveDate: policy.effectiveDate,
      coverageAmount: policy.plan.coverageAmount,
    },
  };

  await sendEmail(emailData.to, emailData.template as any, emailData.data);
}

// Helper function to send payment failure email
async function sendPaymentFailureEmail(policy: any) {
  const emailData = {
    to: policy.customer.user.email,
    subject: 'Payment Failed for Your Insurance Policy',
    template: 'paymentSuccess',
    data: {
      customerName: `${policy.customer.firstName} ${policy.customer.lastName}`,
      policyNumber: policy.policyNumber,
      retryLink: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/retry/${policy.id}`,
    },
  };

  await sendEmail(emailData.to, emailData.template as any, emailData.data);
}

// Helper function to send refund email
async function sendRefundEmail(policy: any) {
  const emailData = {
    to: policy.customer.user.email,
    subject: 'Refund Processed for Your Insurance Policy',
    template: 'paymentSuccess',
    data: {
      customerName: `${policy.customer.firstName} ${policy.customer.lastName}`,
      policyNumber: policy.policyNumber,
      refundAmount: policy.premiumAmount,
    },
  };

  await sendEmail(emailData.to, emailData.template as any, emailData.data);
}