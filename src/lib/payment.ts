import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(params: {
  amount: number;
  currency: string;
  customerEmail: string;
  cancelUrl: string;
  successUrl: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: 'Insurance Premium',
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }
  
  return session.url;
}
