# VibeLeak Guard

A production-oriented micro SaaS built for the public trend around vibe-coded apps exposing corporate or personal data.

## Value proposition

Paste a public app URL and get a client-side leakage report: exposed secret patterns, public source maps, missing security headers, checked assets, and remediation guidance. A free preview is shown first; the full report is unlocked after Stripe Checkout payment.

## Target users

- Indie hackers shipping AI/vibe-coded apps quickly
- Small agencies delivering client prototypes
- Solo founders who need a quick pre-launch public asset check

## Pricing

Suggested launch price: **US$9 per scan/report**.

## Features

- Next.js/React web app
- URL scanner for public HTML/JS/JSON/source-map assets
- Secret-pattern detection for common leaked keys/tokens
- Security header hardening checks
- Local JSON report store (`data/reports.json`)
- Stripe Checkout payment route
- Stripe webhook handler for `checkout.session.completed`
- Success-page payment verification fallback for local testing
- Paid report gate: preview before payment, full findings after payment
- Privacy notice and safe-use copy

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 and scan a public URL you own or are authorized to test.

## Payments

Real card payments require:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` for production webhook verification
- `NEXT_PUBLIC_APP_URL` set to your deployed URL

The app never stores card numbers. Card collection is handled by Stripe Checkout. The app stores only report data, paid status, and Checkout Session ID.

## Test / verification

```bash
npm run test:scanner
npm run build
```

## Deployment

See `DEPLOYMENT.md`.

## Privacy and safety

Use only on public URLs you own or are authorized to test. The scanner does not log into sites, bypass access controls, or collect private credentials. If a possible secret is found, evidence is redacted in the report.
