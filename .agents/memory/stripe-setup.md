---
name: Stripe setup and key modes
description: How Stripe is wired (paid competition entry via PaymentIntent), which environments use live vs test keys, and how to health-check it without charging anyone.
---

**State (verified 2026-09-19):** The only live Stripe feature is paid competition entry (PaymentIntent → client confirm → `enter-with-payment`, with a `payment_intent.succeeded` webhook as the fallback). The subscription endpoint is unreachable dead code with a placeholder price.

**Key modes are intentionally mixed:** `STRIPE_SECRET_KEY` is a LIVE restricted key in every environment. The published web bundle is built with a LIVE publishable key, so production works. The dev/preview `VITE_STRIPE_PUBLIC_KEY` is a TEST key, so the card form in the preview fails with "No such payment_intent" (live intent, test-mode client). The user chose to leave this as is (only production matters). Codemagic supplies its own `VITE_STRIPE_PUBLIC_KEY` from its "stripe" variable group; the committed `ios/App/App/public` bundle is a stale local build and says nothing about the shipped iOS key.

**Why:** Dev competitions are all free anyway; aligning dev would need a test secret key from the user's dashboard.

**How to health-check:** run a throwaway tsx script under `scripts/` (tsx can't resolve `stripe` from /tmp; top-level await needs `.mts`): `balance.retrieve()` (livemode + key validity), `webhookEndpoints.list()` (registered at the old `tacfit.replit.app` host, which still serves the same deployment), create a PaymentIntent and read it back with the publishable key to prove same account/mode, then CANCEL every intent you created (they're live). Stripe only lists events from the last 30 days, so old webhook deliveries can't be audited via API — use the dashboard's endpoint delivery log. When printing API responses, redact `client_secret` with a pattern that allows underscores in the id (`pi_3XXX_secret_...`) — a too-strict regex leaked one once and the intent had to be cancelled.
