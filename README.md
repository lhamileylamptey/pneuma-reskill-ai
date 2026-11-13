# Pneuma Reskill AI — PWA + Paystack subscription integration starter

This is a deployment-ready application package with a USD-facing pricing page and a secure server-side Paystack integration scaffold. It is **not live until the external accounts and environment variables below are configured**.

## Included in this build

- Pneuma Reskill AI responsive Progressive Web App shell, icons and offline app-shell caching.
- Pricing display: Free, Starter ($9.99/month or $99/year), Professional ($19.99/month or $199/year), and Business ($39.99/month or $399/year, marked Coming Soon until team features are built).
- Email/password account registration and sign-in using Supabase Auth.
- Server-side Paystack checkout initialisation and transaction verification.
- Paystack webhook signature validation and subscription renewal/status updates.
- Server-side premium entitlement checks before full-plan generation and premium weekly coaching.
- Supabase SQL schema and environment-variable template.
- Payment-success callback page.

## Currency: important for a Ghana-based merchant

The prices are displayed in **USD**, but Paystack's current currency availability lists **GHS, not USD, for Ghana-based businesses**. This package therefore initializes Paystack subscription plans in GHS. Create the four active Paystack plans in GHS using the then-current USD/GHS conversion you decide to apply. International cardholders may see their bank convert the GHS charge into their card currency. The USD figures on the website are display prices; the GHS amount actually charged is determined by the Paystack plan you create.

Paystack subscriptions are recurring card payments. Mobile Money is not supported for automatic recurring subscription debits. If Pneuma later wants MoMo, add a separate one-time payment route and manage the access term/renewal separately.

## Before deployment: accounts needed

1. **GitHub** — repository to hold this project.
2. **Vercel** — hosting for the PWA and serverless API routes.
3. **Supabase** — user authentication and subscription entitlement database.
4. **Paystack** — payment processing and six GHS subscription plans.
5. **Anthropic** — AI provider key for the existing AI coaching endpoint.

## Step 1 — Create Supabase project and database

1. Create a Supabase project.
2. Open SQL Editor and run `supabase-schema.sql`.
3. In Project Settings → API, copy the Project URL, anon/public key, and service_role key.
4. Enable email/password authentication. Decide whether to require email confirmation; if enabled, customers must confirm their email before signing in.
5. Keep the service_role key private. It belongs only in Vercel server-side environment variables.

## Step 2 — Create four active Paystack plans

In the Paystack Dashboard, create these four active plans. Use the current GHS equivalents of the USD display prices; this project deliberately does not hard-code an exchange rate.

| Plan name | Interval | USD display price |
|---|---|---:|
| Pneuma Starter Monthly | Monthly | $9.99 |
| Pneuma Starter Annual | Annually | $99 |
| Pneuma Professional Monthly | Monthly | $19.99 |
| Pneuma Professional Annual | Annually | $199 |
Business plans are displayed as Coming Soon and are not enabled for checkout in this build.

Set each Paystack plan currency to GHS and its amount to the GHS amount you approve. Copy each resulting `plan_code`. Paystack subscription plans are recurring card billing; this starter requests the `card` channel at checkout.

## Step 3 — Upload to GitHub and deploy on Vercel

1. Create a GitHub account if you do not already have one.
2. Create a new repository, for example `pneuma-reskill-ai`.
3. Upload the **contents** of this folder to the repository root. `index.html`, `api/`, `icons/`, `manifest.webmanifest`, `service-worker.js`, `vercel.json`, and the SQL/schema files should be at the top level.
4. Import the repository into Vercel and deploy it.
5. Add the environment variables below in Vercel → Project → Settings → Environment Variables. Add them to Production and Preview as appropriate, then redeploy.

### Required Vercel environment variables

Copy the names from `.env.example` and fill in your real values:

- `SITE_URL` — your deployed HTTPS website address, without a trailing slash.
- `PAYSTACK_SECRET_KEY` — use the **test** secret key first.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_PLAN_STARTER_MONTHLY`
- `PAYSTACK_PLAN_STARTER_ANNUALLY`
- `PAYSTACK_PLAN_PROFESSIONAL_MONTHLY`
- `PAYSTACK_PLAN_PROFESSIONAL_ANNUALLY`
- `ANTHROPIC_API_KEY` — server-side AI provider key.
- `ANTHROPIC_MODEL` — optional model override.

**Never paste secret keys into `index.html`, GitHub source files, or a public chat.** If a secret is accidentally exposed, rotate it in the provider dashboard immediately.

## Step 4 — Configure Paystack webhook

In Paystack Dashboard → Settings / API Keys & Webhooks, set the webhook URL to:

`https://YOUR-DEPLOYED-DOMAIN/api/paystack-webhook`

Use the same live/test environment as the key configured in Vercel. The endpoint validates Paystack's `x-paystack-signature` using the secret key. Test events before launch.

## Step 5 — Test before going live

1. Keep the Paystack test secret key and test plan codes configured.
2. Create a test user in Pneuma and sign in.
3. Choose a paid plan and complete a Paystack test checkout.
4. Confirm the callback page says the payment was verified.
5. Return to the app; premium full-plan generation should be available only after the server confirms an active entitlement.
6. Test failed payments, expired sessions, webhook delivery, and cancellation/renewal events.
7. Only after all tests pass, create/use live Paystack plans and replace the test secret with the live secret in Vercel.

## Current limitations / launch checklist

- This is an integration scaffold. It cannot accept live payments until Supabase, Paystack plans, Vercel environment variables and webhook URL are configured.
- No external account credentials have been supplied or connected in this build.
- Prices are USD display prices; actual Ghana Paystack plans are billed in GHS at the GHS amounts you set in the dashboard.
- Recurring billing is card-only. MoMo one-time annual purchases are not included in this first integration build.
- Starter unlocks the full 90-day plan; Professional additionally unlocks weekly AI coaching check-ins. Business is shown as Coming Soon and is not enabled for checkout until the team features are developed. The subscription table stores one current plan per user. Paystack cancellation webhooks preserve access until the recorded period end; a customer portal for self-service cancellation, invoices, refunds and plan changes is not included yet.
- Production hardening still needed: abuse/rate limiting for free AI requests, privacy policy, terms, data deletion, customer support contact, monitoring, backups, and full end-to-end payment/webhook testing.
- AI generation needs internet access and a valid Anthropic key. The service worker intentionally does not cache API responses.
- Opening the HTML with `file://` will not enable PWA installation or serverless APIs. Deployment must use HTTPS (or localhost for local testing).

## Local preview

Run from this folder:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. The static page can be previewed, but Supabase, Paystack and AI serverless endpoints require Vercel deployment with environment variables.

## Install the app

- iPhone/iPad: open the deployed HTTPS site in Safari → Share → Add to Home Screen.
- Android: open in Chrome → Install app / Add to Home screen.
- Desktop: use the install control in a supported browser.
