import { getReport } from '@/lib/store';
import PayButton from './pay-button';
import { notFound } from 'next/navigation';

const severityLabel: Record<string, string> = {
  critical: '重大',
  high: '高',
  medium: '中',
  low: '低',
  info: '情報'
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();
  const visible = report.paid ? report.findings : report.findings.slice(0, 3);

  return (
    <main className="wrap">
      <a className="muted" href="/">← 新しいスキャン</a>
      <div className="card">
        <span className="badge">スコア {report.score}/100</span>
        <h1>漏えいチェックレポート</h1>
        <p><b>URL:</b> {report.url}</p>
        <p className="muted">{report.summary}</p>
        {!report.paid && (
          <div className="card">
            <h2>完全レポートを解放</h2>
            <p className="muted">プレビューでは最初の3件のみ表示しています。$9 の支払いで、全証拠、確認済みアセット、修正手順を表示します。</p>
            <PayButton reportId={report.id} />
          </div>
        )}
        <h2>検出結果 {report.paid ? '' : '（プレビュー）'}</h2>
        {visible.length === 0 && <p className="ok">確認したアセットでは明らかな問題は見つかりませんでした。</p>}
        {visible.map((f, i) => (
          <div className="finding" key={i}>
            <div className={`sev ${f.severity}`}>{severityLabel[f.severity] || f.severity}</div>
            <h3>{f.title}</h3>
            <p><b>証拠:</b> {f.evidence}</p>
            <p><b>修正:</b> {f.recommendation}</p>
          </div>
        ))}
        {!report.paid && report.findings.length > 3 && <p className="muted">残り {report.findings.length - 3} 件はペイウォールの後に表示されます。</p>}
        {report.paid && (
          <>
            <h2>確認済みアセット</h2>
            <ul>{report.checkedAssets.map(a => <li key={a}><code>{a}</code></li>)}</ul>
            <h2>レスポンスヘッダー</h2>
            <pre>{JSON.stringify(report.headers, null, 2)}</pre>
          </>
        )}
      </div>
    </main>
  );
}
