import { getReport } from '@/lib/store';
import PayButton from './pay-button';
import { notFound } from 'next/navigation';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();
  const visible = report.paid ? report.findings : report.findings.slice(0, 3);
  return <main className="wrap"><a className="muted" href="/">← New scan</a><div className="card"><span className="badge">Score {report.score}/100</span><h1>Leak report</h1><p><b>URL:</b> {report.url}</p><p className="muted">{report.summary}</p>{!report.paid && <div className="card"><h2>Unlock full report</h2><p className="muted">Preview shows first 3 findings only. Pay $9 to view all evidence, checked assets, and remediation steps.</p><PayButton reportId={report.id}/></div>}<h2>Findings {report.paid ? '' : '(preview)'}</h2>{visible.length===0 && <p className="ok">No obvious findings in checked assets.</p>}{visible.map((f,i)=><div className="finding" key={i}><div className={`sev ${f.severity}`}>{f.severity}</div><h3>{f.title}</h3><p><b>Evidence:</b> {f.evidence}</p><p><b>Fix:</b> {f.recommendation}</p></div>)}{!report.paid && report.findings.length>3 && <p className="muted">{report.findings.length-3} more finding(s) hidden behind the paywall.</p>}{report.paid && <><h2>Checked assets</h2><ul>{report.checkedAssets.map(a=><li key={a}><code>{a}</code></li>)}</ul><h2>Response headers</h2><pre>{JSON.stringify(report.headers,null,2)}</pre></>}</div></main>
}
