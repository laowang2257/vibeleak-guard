import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../lib/scanner.ts', import.meta.url), 'utf8');
const required = ['Stripe secret key', 'OpenAI API key', 'Missing ${header}', 'Public source map detected'];
for (const token of required) {
  if (!src.includes(token)) throw new Error(`scanner missing token: ${token}`);
}
const sample = 'const key="' + 'sk_' + 'test_' + '1234567890abcdefghijklmnop";';
const stripeRe = /sk_(live|test)_[A-Za-z0-9]{16,}/g;
if (!stripeRe.test(sample)) throw new Error('Stripe regex sanity check failed');
console.log('scanner sanity checks passed');
