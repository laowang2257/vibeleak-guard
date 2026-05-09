# Deployment guide

## Vercel

1. Push this folder to a private Git repository.
2. Create a Vercel project from the repository.
3. Add environment variables:
   - `NEXT_PUBLIC_APP_URL=https://your-domain.example`
   - `PRICE_AMOUNT_CENTS=900`
   - `CURRENCY=usd`
   - `STRIPE_SECRET_KEY=...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...`
   - `STRIPE_WEBHOOK_SECRET=...`
4. In Stripe Dashboard, create a webhook endpoint:
   - URL: `https://your-domain.example/api/webhook`
   - Event: `checkout.session.completed`
5. Deploy.
6. Run a test-mode card payment through Stripe Checkout and confirm the report becomes paid/unlocked.

## Local production check

```bash
npm install
npm run build
npm run start
```

## Notes about persistence

This version uses `data/reports.json` for speed and simplicity. On serverless hosts, filesystem writes may not persist across deployments/instances. For real production on Vercel, replace `lib/store.ts` with a hosted lightweight DB such as Turso, Neon, Supabase, or Vercel Postgres. The app interface is intentionally isolated to three functions: `createReport`, `getReport`, and `markPaid`.

## Autodeploy guard

This scheduled build did not deploy automatically because external deployment/account creation requires all of:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- deployment token such as `VERCEL_TOKEN`
- `AGENT_MONEY_AUTODEPLOY_APPROVED=true`
