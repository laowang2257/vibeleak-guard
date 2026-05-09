export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Finding = {
  severity: FindingSeverity;
  title: string;
  evidence: string;
  recommendation: string;
};

export type ScanReport = {
  id: string;
  url: string;
  createdAt: string;
  paid: boolean;
  checkoutSessionId?: string;
  score: number;
  summary: string;
  findings: Finding[];
  headers: Record<string, string>;
  checkedAssets: string[];
};

const SECRET_PATTERNS: { name: string; regex: RegExp; severity: FindingSeverity; recommendation: string }[] = [
  { name: 'OpenAI API key', regex: /sk-[A-Za-z0-9_-]{20,}/g, severity: 'critical', recommendation: 'キーを失効・ローテーションし、API呼び出しをサーバー側エンドポイントへ移してください。' },
  { name: 'Stripe secret key', regex: /sk_(live|test)_[A-Za-z0-9]{16,}/g, severity: 'critical', recommendation: 'Stripe secret key を失効し、ブラウザへは publishable key のみ配信してください。' },
  { name: 'AWS access key id', regex: /AKIA[0-9A-Z]{16}/g, severity: 'high', recommendation: 'IAMキーを無効化またはローテーションし、CloudTrailで不審利用を監査してください。' },
  { name: 'Private key block', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical', recommendation: '公開アセットから秘密鍵を削除し、証明書またはデプロイキーをローテーションしてください。' },
  { name: 'Firebase/Google API key', regex: /AIza[0-9A-Za-z_-]{25,}/g, severity: 'medium', recommendation: 'HTTP referrer とAPIスコープでキーを制限し、特権サービスはサーバー側に置いてください。' },
  { name: 'JWT token', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'high', recommendation: 'トークンを無効化し、TTLを短縮し、ユーザー/セッショントークンを静的出力へ埋め込まないでください。' },
  { name: 'Likely env assignment', regex: /(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL)\s*[:=]\s*['\"][^'\"]{8,}/gi, severity: 'high', recommendation: 'クライアントバンドルから環境値を削除し、サーバー専用環境変数を使用してください。' }
];

const SECURITY_HEADERS = [
  ['content-security-policy', 'データ流出やスクリプト注入の影響を抑えるため、Content-Security-Policy を追加してください。'],
  ['x-frame-options', 'クリックジャッキング対策として X-Frame-Options または frame-ancestors を追加してください。'],
  ['x-content-type-options', 'X-Content-Type-Options: nosniff を追加してください。'],
  ['referrer-policy', 'パスやトークンが第三者へ漏れないよう、厳格な Referrer-Policy を追加してください。'],
  ['permissions-policy', '未使用のブラウザ機能を無効化するため、Permissions-Policy を追加してください。']
] as const;

function redact(s: string) {
  return s.replace(/[A-Za-z0-9_\-]{12,}/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`).slice(0, 240);
}

function score(findings: Finding[]) {
  const weights: Record<FindingSeverity, number> = { critical: 35, high: 20, medium: 10, low: 5, info: 0 };
  return Math.max(0, 100 - findings.reduce((sum, f) => sum + weights[f.severity], 0));
}

async function fetchText(url: string): Promise<{ text: string; headers: Record<string, string> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'VibeLeakGuard/1.0' } });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text') && !contentType.includes('javascript') && !contentType.includes('json') && !contentType.includes('html')) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }
    const text = (await res.text()).slice(0, 700_000);
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
    return { text, headers };
  } finally {
    clearTimeout(timer);
  }
}

function extractAssets(baseUrl: string, html: string): string[] {
  const out = new Set<string>();
  const re = /<(?:script|link)[^>]+(?:src|href)=["']([^"']+\.(?:js|json|map)(?:\?[^"']*)?)["']/gi;
  let m;
  while ((m = re.exec(html)) && out.size < 8) {
    try { out.add(new URL(m[1], baseUrl).toString()); } catch {}
  }
  return [...out];
}

export async function scanUrl(inputUrl: string): Promise<Omit<ScanReport, 'id' | 'createdAt' | 'paid' | 'checkoutSessionId'>> {
  const url = new URL(inputUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('http/https のURLのみ対応しています');

  const findings: Finding[] = [];
  const checkedAssets: string[] = [url.toString()];
  const main = await fetchText(url.toString());

  for (const [header, recommendation] of SECURITY_HEADERS) {
    if (!main.headers[header]) {
      findings.push({ severity: 'low', title: `${header} が未設定です`, evidence: 'レスポンスヘッダーが存在しません', recommendation });
    }
  }

  const assets = extractAssets(url.toString(), main.text);
  let combined = `/* ${url} */\n${main.text}`;
  for (const asset of assets) {
    try {
      const fetched = await fetchText(asset);
      checkedAssets.push(asset);
      combined += `\n/* ${asset} */\n${fetched.text}`;
      if (asset.includes('.map')) {
        findings.push({ severity: 'medium', title: '公開 source map を検出しました', evidence: asset, recommendation: 'ソースコードや内部パスが含まれる場合、本番 source map を無効化するかアクセス制限してください。' });
      }
    } catch {
      // keep scan resilient; asset fetch failures are not fatal
    }
  }

  for (const pat of SECRET_PATTERNS) {
    const matches = combined.match(pat.regex) || [];
    for (const match of [...new Set(matches)].slice(0, 5)) {
      findings.push({ severity: pat.severity, title: `${pat.name} が露出している可能性があります`, evidence: redact(match), recommendation: pat.recommendation });
    }
  }

  const finalScore = score(findings);
  const summary = findings.some(f => f.severity === 'critical')
    ? '重大なシークレット漏えいの兆候があります。手動確認で否定できるまで緊急扱いしてください。'
    : findings.some(f => f.severity === 'high')
      ? '高リスクの漏えい兆候があります。影響値を確認し、必要に応じてローテーションしてください。'
      : findings.length
        ? '明らかな重大シークレットは見つかりませんでしたが、堅牢化不足が検出されました。'
        : '確認したアセットでは明らかなクライアント側漏えい兆候は検出されませんでした。';

  return { url: url.toString(), score: finalScore, summary, findings, headers: main.headers, checkedAssets };
}
