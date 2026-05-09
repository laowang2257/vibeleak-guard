import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getReport } from '@/lib/store';

const Body = z.object({ reportId: z.string().uuid() });

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const { reportId } = Body.parse(await req.json());
    const report = await getReport(reportId);
    if (!report) return NextResponse.json({ error: 'レポートが見つかりません' }, { status: 404 });

    if (!secret || secret.includes('replace_me')) {
      if (process.env.ALLOW_DEMO_CHECKOUT === 'true') {
        return NextResponse.json({ url: `${appUrl}/success?demo=1&report_id=${reportId}` });
      }
      return NextResponse.json({ error: 'Stripe が未設定です。STRIPE_SECRET_KEY と NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY を設定してください。デモ解放を使う場合は ALLOW_DEMO_CHECKOUT=true を設定してください。' }, { status: 503 });
    }

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
          product_data: { name: 'VibeLeak Guard 完全セキュリティレポート', description: `${report.url} の完全レポート` }
        },
        quantity: 1
      }],
      metadata: { reportId },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&report_id=${reportId}`,
      cancel_url: `${appUrl}/report/${reportId}`
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout に失敗しました';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
