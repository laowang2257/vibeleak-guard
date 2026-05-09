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
  { name: 'OpenAI API key', regex: /sk-[A-Za-z0-9_-]{20,}/g, severity: 'critical', recommendation: 'Revoke the key, rotate affected secrets, and move API calls behind a server-side endpoint.' },
  { name: 'Stripe secret key', regex: /sk_(live|test)_[A-Za-z0-9]{16,}/g, severity: 'critical', recommendation: 'Revoke the Stripe secret key and ensure only publishable keys are shipped to the browser.' },
  { name: 'AWS access key id', regex: /AKIA[0-9A-Z]{16}/g, severity: 'high', recommendation: 'Disable or rotate the IAM key and audit CloudTrail for unexpected usage.' },
  { name: 'Private key block', regex: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical', recommendation: 'Remove the private key from public assets and rotate certificates or deploy keys.' },
  { name: 'Firebase/Google API key', regex: /AIza[0-9A-Za-z_-]{25,}/g, severity: 'medium', recommendation: 'Restrict the key by HTTP referrer and API scope; keep privileged services server-side.' },
  { name: 'JWT token', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: 'high', recommendation: 'Invalidate the token, shorten token TTLs, and avoid embedding user/session tokens in static output.' },
  { name: 'Likely env assignment', regex: /(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL)\s*[:=]\s*['\"][^'\"]{8,}/gi, severity: 'high', recommendation: 'Remove environment values from client bundles and use server-only environment variables.' }
];

const SECURITY_HEADERS = [
  ['content-security-policy', 'Add a Content-Security-Policy to reduce data exfiltration and script injection impact.'],
  ['x-frame-options', 'Add X-Frame-Options or frame-ancestors to reduce clickjacking risk.'],
  ['x-content-type-options', 'Add X-Content-Type-Options: nosniff.'],
  ['referrer-policy', 'Add a strict Referrer-Policy to avoid leaking paths or tokens to third parties.'],
  ['permissions-policy', 'Add a Permissions-Policy to disable unused browser capabilities.']
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
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http/https URLs are supported');

  const findings: Finding[] = [];
  const checkedAssets: string[] = [url.toString()];
  const main = await fetchText(url.toString());

  for (const [header, recommendation] of SECURITY_HEADERS) {
    if (!main.headers[header]) {
      findings.push({ severity: 'low', title: `Missing ${header}`, evidence: 'Response header not present', recommendation });
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
        findings.push({ severity: 'medium', title: 'Public source map detected', evidence: asset, recommendation: 'Disable production source maps or restrict access if they reveal source code or internal paths.' });
      }
    } catch {
      // keep scan resilient; asset fetch failures are not fatal
    }
  }

  for (const pat of SECRET_PATTERNS) {
    const matches = combined.match(pat.regex) || [];
    for (const match of [...new Set(matches)].slice(0, 5)) {
      findings.push({ severity: pat.severity, title: `Possible exposed ${pat.name}`, evidence: redact(match), recommendation: pat.recommendation });
    }
  }

  const finalScore = score(findings);
  const summary = findings.some(f => f.severity === 'critical')
    ? 'Critical exposed-secret indicators found. Treat this as urgent until manually disproven.'
    : findings.some(f => f.severity === 'high')
      ? 'High-risk leakage indicators found. Review and rotate affected values.'
      : findings.length
        ? 'No obvious critical secret found, but hardening gaps were detected.'
        : 'No obvious client-side leakage indicators detected in the checked assets.';

  return { url: url.toString(), score: finalScore, summary, findings, headers: main.headers, checkedAssets };
}
