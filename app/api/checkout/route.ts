import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getReport } from '@/lib/store';

const Body = z.object({ reportId: z.string().uuid() });

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!secret || secret.includes('replace_me')) {
    return NextResponse.json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.' }, { status: 503 });
  }

  try {
    const { reportId } = Body.parse(await req.json());
    const report = await getReport(reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const stripe = new Stripe(secret);
    const amount = Number(process.env.PRICE_AMOUNT_CENTS || 900);
    const currency = process.env.CURRENCY || 'usd';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: 'VibeLeak Guard full security report', description: `Full report for ${report.url}` }
        },
        quantity: 1
      }],
      metadata: { reportId },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&report_id=${reportId}`,
      cancel_url: `${appUrl}/report/${reportId}`
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
