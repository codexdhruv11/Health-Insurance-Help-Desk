import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { rateLimit } from '@/lib/rate-limit';
import { generatePolicyPDF } from '@/lib/documents/pdf';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'pdf:',
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitInfo = await rateLimit(session.user.id, RATE_LIMIT);
    if (!rateLimitInfo.success) {
      return new NextResponse('Too many requests', { status: 429 });
    }

    // Get policy ID from request
    const { policyId } = await request.json();
    if (!policyId) {
      return new NextResponse('Policy ID is required', { status: 400 });
    }

    // Get policy data
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
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

    if (!policy) {
      return new NextResponse('Policy not found', { status: 404 });
    }

    // Check authorization
    if (
      session.user.role !== 'ADMIN' &&
      session.user.role !== 'AGENT' &&
      policy.customer.userId !== session.user.id
    ) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Generate PDF
    const pdfBuffer = await generatePolicyPDF(policy);

    // Upload to S3
    const key = `policies/${policy.id}/${policy.policyNumber}.pdf`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'AES256',
      })
    );

    // Create document record
    const document = await prisma.document.create({
      data: {
        entityType: 'POLICY',
        entityId: policy.id,
        fileName: `${policy.policyNumber}.pdf`,
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
        s3Key: key,
        uploadedById: session.user.id,
        status: 'READY',
      },
    });

    return NextResponse.json({
      documentId: document.id,
      s3Key: key,
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 