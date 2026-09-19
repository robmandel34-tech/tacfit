# Muster Up — Updated App Store Details

Prepared September 19, 2026

Copy-ready listing fields, launch-only additions, and audit notes. This document does not change the live App Store listing or app settings.

## 1. App name

Muster Up Fitness

## 2. Subtitle — retain existing

Team Fitness Competitions

## 3. Promotional text

Join the next Zero Day: a two-week cardio challenge, starting every other Monday. Explore cardio, strength, mobility and mindfulness across Muster Up competitions.

Publishing note: Confirm the current Zero Day schedule before using this campaign text. Zero Day remains described as cardio; the broader activity range belongs to the app, not necessarily that competition.

## 4. Keywords — proposed replacement

accountability,squad,workout,challenge,group,habit,motivation,cardio,strength,mindfulness,friends

Publishing note: Compare with your existing hidden keyword field before replacing it. These terms avoid title/subtitle duplication and competitor trademarks. No claim is made that search volume or ranking has been validated.

## 5. Description — base copy

Copy only the text between START and END into the Description field. The existing opening and bullet structure are preserved because the audit awarded them full marks. Camera verification and paid-entry claims are held separately until their release conditions are met.

START DESCRIPTION

Muster Up — Find your team.

Muster Up turns fitness into a team sport. Form a squad, join a competition, log workouts together, and grow stronger in body, mind, and spirit.

Most fitness apps leave you to grind alone. Muster Up is built on the two strongest motivators there are: camaraderie and competition. You're placed on a team where every single member matters, then you go head-to-head with other teams in fitness competitions sized so no one can hide and no one gets left behind.

A supportive team can be the missing piece for anyone who struggles to stay consistent — and a meaningful way to lift others up if you're already going strong.

WHY MUSTER UP
• Team vs. team competitions where every member counts
• Daily teamwork that keeps you accountable — when you show up, your team notices; when you go quiet, they reach out
• Track a full range of activities: cardio, strength, mobility, and mindfulness
• Earn points, climb the leaderboard, and win together
• Built-in chat, activity feed, and encouragement to keep the fire burning
• Apple Health integration for automatic workout tracking

YOUR EFFORT COUNTS TOWARD A SHARED GOAL
Team progress combines members' eligible activity submissions. If your team has a 1,000-rep goal and two teammates each submit 100 reps, your team is 20% of the way there. Follow your team's progress on the map. User points are personal rewards, separate from competition progress.

BUILT ON THREE SIMPLE BELIEFS
• Built to lift others, not just yourself
• Strength worth having is strength you can share
• Win the competition, win at life — together

Join Muster Up and let it be a bridge to a supportive community, a healthier life, and a brighter future. Your team is waiting.

END DESCRIPTION

## 6. Launch-only additions — do not paste until verified live

Insert the relevant approved sections after WHY MUSTER UP and before YOUR EFFORT COUNTS TOWARD A SHARED GOAL. These additions address the audit's missing-feature findings without presenting planned functionality as available today.

### Camera verification

CAMERA-VERIFIED ACTIVITIES
Show your effort with live camera verification on supported activities. Complete a timed session or let the camera count reps for supported exercises. Successfully completed verified sessions earn bonus user points. Availability depends on the activity and competition.

Release gate: Enable supported activity types in production, configure rep-counted exercises with the correct verification mode, and test the full flow on the release build. At the preceding live-settings check, no activity types had verification enabled. Do not describe this feature as generally available until that is resolved. Do not promise cheat-proof results or medical-grade tracking.

### Optional paid competitions

OPTIONAL PAID COMPETITIONS
Choose a free competition or enter an optional paid competition for added accountability. Paid competitions use camera-verified activities, with the entry fee and participation requirements shown before you join.

Release gate: Use only when both free and paid competitions are available, paid competitions actually enforce camera verification, and entry fees and rules are visible before payment. Confirm the payment flow meets Apple's applicable rules for your storefronts and competition model. This draft does not establish payment-policy compliance or imply that Stripe is automatically permitted.

### Pricing note if all competitions are still free

FREE WHILE WE'RE GETTING STARTED
Muster Up is free to download, and all competitions are currently free to enter.

Release gate: Verify current pricing before use. Use this instead of OPTIONAL PAID COMPETITIONS, never alongside it. Do not add unconfirmed prices, prize claims, or a permanent “free forever” promise.

### Future user-point redemption — omit from the current listing

Keep the planned ability to use user points for paid competition entry out of current App Store copy until redemption is available and its terms are defined. It is not a current benefit.

## 7. First three screenshot captions

Copy recommendations only; no screenshots have been created or changed.

1. TEAM FITNESS COMPETITIONS
   Supporting line: Find your team. Work toward a shared goal.
   Use: Actual competition screen.

2. EVERY MEMBER COUNTS
   Supporting line: Your effort moves the whole team forward.
   Use: Actual team contribution or progress screen.

3. CLIMB THE LEADERBOARD
   Supporting line: Log your activity. See where your team stands.
   Use: Actual leaderboard screen.

Retain the existing readable visual treatment. Move a suitable existing lifestyle image into position four or five if it accurately represents the product. Do not fabricate testimonials, ratings, member counts, awards, or results.

## 8. Before publishing

• Confirm the app name is available in App Store Connect.
• Keep the subtitle, icon, and readable screenshot treatment that the audit scored at full marks.
• Confirm the Zero Day schedule, current prices, and which activities each competition accepts.
• Paste only approved listing copy, not the editorial notes or release gates.
• If adding camera verification, enable it in production and test the reviewer-accessible path. A new Codemagic build alone does not enable activity settings.
• Review privacy disclosures against actual collection. On-device camera analysis is different from separately uploaded evidence; do not assume the entire feature records or uploads video.
• Compare the proposed keywords with the current hidden keyword field. Competitor brand names suggested by the audit have deliberately not been included.
• Add real screenshots and an actual-app preview video separately. This document does not contain those assets.
• Genuine reviews, user testimonials with permission, localization, review-prompt implementation, Custom Product Pages, and release cadence remain separate work. No ratings or conversion uplift are promised.

## 9. Audit change log — draft document only

Scores below are the audit's original scores, not new scores or claims of completed App Store changes.

- FIT (was 7/10) — broadened promotional text without misrepresenting Zero Day's cardio format; drafted gated camera-verification and optional paid-competition sections in sections 3 and 6.
- D1.1 (was 2.5/5) — proposed “Muster Up Fitness” to place a clear category keyword in the app name in section 1.
- D1.3 (was 1.5/3) — supplied a non-duplicative keyword draft for owner comparison with the hidden keyword field in section 4.
- D1.4 (was 1.5/3) — shortened the proposed app name to 17 characters so the category signal appears earlier in section 1; actual display varies by device.
- D1.5 (was 2/4) — added audience terms including accountability, squad, workout, and challenge to the keyword draft in section 4; left the full-mark subtitle unchanged.
- D8.1 (was 1.5/3) — drafted clear optional-entry pricing language rather than an assumed subscription model in section 6; held for launch verification.
- D8.2 (was 1/2) — drafted explicit paid-entry disclosure with fees and requirements shown before joining in section 6; held for launch verification.
- D8.4 (was 1.5/3) — distinguished free participation from optional paid entry in section 6 without inventing prices or competitor savings; exact pricing remains to be confirmed.
- D3.1 (was 2/4) — proposed “Team Fitness Competitions” as the first screenshot headline in section 7; image production remains outstanding.
- D3.2 (was 1.5/3) — drafted a non-repetitive category → teamwork → outcome sequence for the first three screenshots in section 7.
- D3.4 (was 1.5/3) — recommended an existing suitable lifestyle image in position four or five in section 7; screenshot reordering remains outstanding.

Flags for the owner: Camera and paid-entry launch readiness; current pricing and Zero Day schedule; app-name availability; hidden keyword comparison; genuine social proof; actual screenshots and preview footage; localization; review prompts; Custom Product Pages. Findings outside this copy document are not marked fixed.

## 10. Sources and scope

Audit: https://app.heycatch.ai/audit/hck_pk_RFfvs65QXI_qS_mc3FXOTVjeL_du86XB

Existing US listing: https://apps.apple.com/us/app/id6764738732

The full audit, including expanded finding details and the prioritized action plan, was reviewed. Existing description copy was obtained from Apple's public listing lookup. This deliverable follows the copy-related quick wins, preserves full-mark content where possible, and flags work requiring launch configuration, original assets, or actions outside this document. No site redesign, app-code change, or App Store submission was performed.