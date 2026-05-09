'use client';
import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const r = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'スキャンに失敗しました');
      location.href = '/report/' + j.id;
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'スキャンに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <section className="hero">
        <span className="badge">AI / vibe-coded アプリの公開前チェック</span>
        <h1>ユーザーやSNSに見つかる前に、公開漏えいを検出。</h1>
        <p className="muted">
          VibeLeak Guard は公開Webアプリとクライアントアセットをスキャンし、漏えいした可能性のあるキー、公開 source map、ブラウザ向けセキュリティヘッダー不足を確認します。無料プレビュー後、完全レポートを解放できます。
        </p>
      </section>
      <div className="grid">
        <form onSubmit={submit} className="card">
          <h2>公開アプリURLをスキャン</h2>
          <p className="muted">自分が所有している、または検査許可のあるURLだけを入力してください。ログインや非公開データは不要です。</p>
          <input className="input" placeholder="https://your-app.example" value={url} onChange={e => setUrl(e.target.value)} required />
          <br /><br />
          <button className="btn" disabled={loading}>{loading ? 'スキャン中…' : '無料プレビューを開始'}</button>
          {err && <p className="danger">{err}</p>}
        </form>
        <aside className="card">
          <h2>完全レポートの解放</h2>
          <div className="price">$9</div>
          <p className="muted">Stripe Checkout による1回払いで、全検出項目、証拠スニペット、確認済みアセット、修正チェックリストを表示します。</p>
          <ul>
            <li>シークレットらしき文字列の検出</li>
            <li>セキュリティヘッダー確認</li>
            <li>source map 公開チェック</li>
            <li>小規模セルフホスト向けJSON保存</li>
          </ul>
        </aside>
      </div>
      <p className="footer">プライバシー: 公開URLのみ取得します。カード情報は Stripe が処理し、このアプリでは保存しません。</p>
    </main>
  );
}
