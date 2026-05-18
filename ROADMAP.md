# TacFit Roadmap

Living plan for upcoming work. Ask for "the roadmap" anytime and we'll come back here, update what's done, and pick the next step.

Last updated: 2026-05-18

---

## Where things stand right now

- ✅ Marketing site built (`/marketing.html`, `/contact-us.html`, `/privacy.html`)
- ✅ Marketing site packaged as `marketing-site.zip` for Netlify
- ✅ Netlify deploy + DNS records in GoDaddy (`tacfit.app` A record → `75.2.60.5`, `www` CNAME → `apex-loadbalancer.netlify.com`)
- ⏳ Waiting on DNS propagation + Netlify HTTPS provisioning
- ⏳ iOS app currently in App Store review

---

## Track 1 — Paid Competitions (Stripe)

**Goal:** Charge users to join select competitions. Web-only at first, no Apple In-App Purchase needed.

### Decisions still open (need answers before build starts)
1. Pricing model — flat fee per competition, tiered ($5/$15/$25), or organizer-set price per competition?
2. Who can create paid competitions — admins only, or any user?
3. Refund policy — e.g., "full refund until competition start, none after"?
4. Free competitions stay alongside paid ones — yes/no?

### Steps
1. ☐ **You:** Sign up for Stripe, start business verification (1–3 days for approval)
2. ☐ **You:** Answer the 4 decision questions above
3. ☐ **Me:** Add `price`, `currency`, `is_paid` to competition schema
4. ☐ **Me:** Stripe Checkout integration for join flow
5. ☐ **Me:** Webhook handler — payment confirmed → unlock competition
6. ☐ **Me:** Refund flow + admin tools
7. ☐ **Me:** Payment history page in user profile
8. ☐ **Me:** Price display + "Join for $X" button on competition cards
9. ☐ **Me:** Terms of Service page (companion to privacy)
10. ☐ **Us:** Full end-to-end test in Stripe test mode (cards like `4242 4242 4242 4242`)
11. ☐ **Cutover:** Swap Stripe test keys for live keys + smoke test with $1

### What requires the iOS rebuild
- "Pay on the web" button + Apple-required disclosure inside iOS app
- Deep link back into app after payment
- Bundle this with the HealthKit work (Track 2) into one iOS resubmission

---

## Track 2 — Health/Fitness API Integration (Apple HealthKit first)

**Goal:** Auto-import user workouts so they don't have to manually log everything.

**Why HealthKit first:** iOS-only audience right now; HealthKit aggregates data from Apple Watch + most third-party devices (Whoop, Garmin, etc. all sync into Health anyway); already on the project roadmap.

### Decisions still open
1. Which Health data types map to TacFit activities? (Cardio / Strength / Mobility / Meditation are the current types)
2. Auto-import GPS routes for cardio activities — yes?
3. Manual confirmation per workout, or auto-submit?
4. Backfill — new workouts only, or pull last 30 days on first connect?

### Steps
1. ☐ Add HealthKit Capacitor plugin
2. ☐ Permission request flow on first connect
3. ☐ Backend endpoint to receive HealthKit workout payloads
4. ☐ Mapping logic: HealthKit workout types → TacFit activity types
5. ☐ GPS route conversion to map images (already have Google Maps Static API)
6. ☐ Optional review step in the UI before submission

### Future API integrations to consider
- **Strava** — cross-platform, great for running/cycling crowd (~1 week to add)
- **Google Fit / Health Connect** — only when/if you add an Android app
- **Whoop / Oura / Garmin direct** — only if specific user demand emerges (most data flows into HealthKit anyway)

---

## Track 3 — Domain / Email Polish (small, do whenever)

1. ☐ Confirm `https://tacfit.app` loads marketing site with green padlock
2. ☐ Set up SendGrid domain authentication for `tacfit.app` (~20 min, GoDaddy DNS records). Improves email deliverability.
3. ☐ Decide later: move app from `tacfit.replit.app` to `app.tacfit.app` (clean subdomain split). Not urgent — bundle with a future iOS release since it requires updating `VITE_API_URL`.

---

## Sequencing recommendation

| When | What |
|------|------|
| **This week** | You: Stripe signup + decision questions. Me: nothing (waiting on you). |
| **Next 2 weeks** | Me: Build Phase 1 of Stripe (web only) in test mode. You: Plan HealthKit decisions. |
| **When iOS app approved** | Me: Add HealthKit + iOS payment-redirect to the app in one go. |
| **Next iOS submission** | Bundle Stripe-redirect + HealthKit into a single new version. |
| **After that submission lands** | Flip Stripe to live mode. Marketing push around paid comps + auto-import. |

---

## Notes / things to remember

- Apple takes 30% (15% under $1M/yr) of in-app purchases. By using web checkout, we avoid this entirely — but must follow Apple's external-payment-link rules (US/EU allowed; specific button labels + system "scare sheet" on tap).
- Terms of Service is **required** before taking money. Build it before flipping to live mode.
- Legal heads-up: avoid prize-pool/staking models for v1 — adds gambling-law complexity. Start with flat entry fee + optional branded prizes only.
- Apple's external-payment-link rules change frequently; recheck before submission.
