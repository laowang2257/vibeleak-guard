import Stripe from 'stripe';
import { markPaid } from '@/lib/store';

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string; report_id?: string }> }) {
  const sp = await searchParams;
  let ok = false;
  if (sp.session_id && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('replace_me')) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sp.session_id);
    const reportId = session.metadata?.reportId || sp.report_id;
    if (session.payment_status === 'paid' && reportId) { await markPaid(reportId, session.id); ok = true; }
  }
  return <main className="wrap"><div className="card"><h1>{ok ? 'Payment confirmed' : 'Payment verification pending'}</h1><p className="muted">If webhook delivery is configured, your report is unlocked automatically. Local fallback also verifies paid Checkout sessions.</p>{sp.report_id && <a className="btn" href={`/report/${sp.report_id}`}>Open report</a>}</div></main>;
}
