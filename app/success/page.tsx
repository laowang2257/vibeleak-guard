import Stripe from 'stripe';
import { markPaid } from '@/lib/store';

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string; report_id?: string }> }) {
  const sp = await searchParams;
  let ok = false;
  if (sp.session_id && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('replace_me')) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sp.session_id);
    const reportId = session.metadata?.reportId || sp.report_id;
    if (session.payment_status === 'paid' && reportId) {
      await markPaid(reportId, session.id);
      ok = true;
    }
  }
  return (
    <main className="wrap">
      <div className="card">
        <h1>{ok ? '支払いを確認しました' : '支払い確認を待機中です'}</h1>
        <p className="muted">Webhook が設定されている場合、レポートは自動的に解放されます。ローカル/単体環境では Checkout セッション確認のフォールバックも行います。</p>
        {sp.report_id && <a className="btn" href={`/report/${sp.report_id}`}>レポートを開く</a>}
      </div>
    </main>
  );
}
