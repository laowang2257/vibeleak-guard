'use client';
import { useState } from 'react';

export default function PayButton({ reportId }: { reportId: string }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setMsg('');
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reportId })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Checkout を開始できませんでした');
      location.href = j.url;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Checkout を開始できませんでした');
    } finally {
      setBusy(false);
    }
  }

  return <><button className="btn" onClick={pay} disabled={busy}>{busy ? 'Stripeを開いています…' : 'カードで支払う'}</button>{msg && <p className="danger">{msg}</p>}</>;
}
