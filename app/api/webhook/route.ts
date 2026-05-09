import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { markPaid } from '@/lib/store';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret || secret.includes('replace_me') || webhookSecret.includes('replace_me')) {
    return NextResponse.json({ error: 'Stripe webhook が未設定です' }, { status: 503 });
  }

  const stripe = new Stripe(secret);
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'stripe-signature がありません' }, { status: 400 });

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const reportId = session.metadata?.reportId;
      if (reportId && session.id) await markPaid(reportId, session.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook エラー';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
