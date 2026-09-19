---
name: Competition recaps (momento cards + feed auto-post)
description: Design rules for end-of-competition recaps — frozen at completion, atomic completion claim, feed post derived from recap table, share sheet without a Capacitor plugin.
---

**Rule:** Final standings are computed once at completion (valid points = non-flagged activities from startDate through end of the end day; progress% tiebreak) and frozen in `competition_recaps` / `competition_recap_user_stats`. Rewards, `competition_history.finalRank` and the momento card all read from that same computation so they can never disagree.

**Why:** Before this, rewards ranked by all-time `teams.points` while the standings page ranked by activities since start — the two could differ. Recaps are also the feed "auto-post", so they must be immutable and created exactly once.

**How to apply:**
- Completion is claimed atomically (`UPDATE ... WHERE is_completed = false RETURNING`); only the claimer computes the recap and pays rewards. Concurrent `/api/competitions` loads used to be able to double-pay. If recap persistence fails, completion is rolled back so the next pass retries — never leave a completed competition without a recap.
- The feed recap is NOT an `admin_posts` row; `/api/competition-recaps` returns structured items merged client-side. Recaps with `participantCount === 0` are stored but not posted. Private competitions' recaps only go to participants/admin; individual stats are gated by `canViewProfileDetails` (`userStatsHidden`).
- Only competitions completing after this shipped get recaps — no backfill (user decision). `hasRecap` on history rows drives the profile "View momento card" button.
- Sharing uses `navigator.share({ files })` called synchronously inside the tap (iOS refuses otherwise); image is drawn purely with Canvas 2D (no external images → no tainted canvas). No `@capacitor/share` → no Podfile change.
- Manual `POST /api/competitions/:id/complete` is admin-only (it was open before; it now publishes to the feed).
