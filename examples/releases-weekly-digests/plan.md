# Story plan — weekly collection digests

Flavor: build story. Voice: "we", for developers and people who follow product changelogs. Plain English (STE-lite).
Repo: public. Further reading may link public docs and the live product; no PR/issue refs in prose.
House style: "Release Notes Index"; avoid "scraping", "scrape", "Releases Index".

Shape: **the problem and the answer**, organized as the four surfaces a reader meets (card → impact → replay → email), with "on by default" as the closing beat.

## Thesis

A weekly collection digest used to be a page you had to find; now it opens with a picture of the week, can play the week back, and arrives by email on Monday — and the hard parts were deciding what "biggest" means and sending each email exactly once.

## Beats

1. **The week at a glance** (card)
   - Idea: before the prose, show who shipped what (treemap, tile area = impact, band = features/enhancements/fixes) and the five biggest releases.
   - Decision: card counts only the releases the digest covers, not every release in the collection that week. Alternative lost: all releases. Why: the card summarizes the digest you're reading; every tile and row links into the prose, and an uncovered release would have nowhere to link. Cost admitted: under-counts weeks where the digest skipped minor activity; fix is at generation, not in the card.
   - Evidence: issue #2454 "Scope decision"; PR #2457 "Open questions from the plan". Screenshot assets/2457-1.webp.
   - Takeaway: the card is a summary of the digest, not of the week's raw feed.
2. **What counts as impact**
   - Idea: release counts mislead (Claude Code's six releases were mostly fixes). Impact = importance-scored weight, scaled by composition; minor releases share a saturating pool so many patches can't outweigh one landmark.
   - Decision: fixes softened to 30% color. Alternative: full or 40–45% strength. Why: at full strength a fix-heavy tile reads as an error state and outweighs the green features band.
   - Evidence: apps/web/src/lib/digest-glance.ts at HEAD (= c9ae1020/e4c77be4, last touched by the feature PRs). Numbers from my own run (below).
   - Visual: bars chart (patch-release totals vs one landmark).
   - Takeaway: tile size rewards what shipped, not how often a team tags.
3. **Replaying the week**
   - Idea: the replay plays a finished week day by day and ends on the card, so the replay ends where the digest begins.
   - Decisions: day-level time (5s per day, 35s per week), rendering as a pure function of time t (scrub exact, testable, later video export); date-only stamps stored at midnight UTC keep their date; reduced motion = no autoplay, step by day.
   - Evidence: issue #2456 Decisions table; PR #2466; digest-replay.ts comment "7 days → 35s".
   - Visual: frame strip, mid-week (Tuesday) and end state (assets 2466-7, 2466-8, both dark).
   - Takeaway: a design where every frame is computed from t gives exact scrubbing and an exact ending for free.
4. **One email per reader per week**
   - Idea: subscribe toggle per collection, Monday email for the week that just closed.
   - Decisions: a subscription, not a follow (follows keep meaning "shape my feed"); only the just-closed week sends (no catch-up, backfill, or forced regen); exactly once via a claim that moves last_sent_week forward with a conditional update before sending, released on failure. Email ranks by importance in the API (not the card's impact math) — admitted: orders can differ on ties.
   - Evidence: issue #2459, PR #2473, collection-digest-subs.ts (claimCollectionDigestSend, ≤15 lines).
   - Visual: SVG flow with branches (Monday run → just-closed? → subscribers → queue → claim → send / skip). Email screenshot considered; only one visual per chapter — picked the diagram since the claim is the idea. Email screenshot moved? No: keep diagram; mention email content in prose.
   - Takeaway: claim-before-send makes retries and redeliveries safe.
5. **On for every new collection** (closing)
   - Idea: weekly digests default on for new collections; can be turned off per collection. The database-level default stays off because SQLite can't change a column default without rebuilding the table (and its dependents); the app supplies the value.
   - Plus: account page lists subscriptions; unverified email gets a hint because unverified accounts don't get mail.
   - Evidence: PR #2485, #2479; docs/architecture/web.md "Weekly digest routes".
   - Takeaway: what readers can do now.

## Numbers (each with source)

- 35s replay, 5s per day: issue #2456 Decisions; digest-replay.ts line 26 comment "7 days → 35s".
- Top 5 biggest releases; card hidden under 3 releases; >8 products fold to "Others": digest-glance.ts constants (GLANCE_TOP_N=5, MAX_GLANCE_TILES=8); #2457 body.
- Impact weights 2/3/4 for importance 3/4/5; pool 4·(1−e^(−sum/8)); 0.6 when composition missing; features 1, enhancements 0.75, fixes 0.5: digest-glance.ts at HEAD.
- Patch-release totals 0.15 / 1.25 / 2.11 / 3.11 for 1/10/20/40 importance-1 releases without composition; landmark all-features = 4, landmark all-fixes = 2: my run, 2026-10-12, `bun scratchpad/impact.ts` importing apps/web/src/lib/digest-glance.ts (no API calls).
- Fixes color 30%: #2457 body.
- Claude Code six releases mostly fixes ("about two-thirds fixes"): #2454, #2457.

## Status check

- Live on releases.sh: digest page shows "The week at a glance", "Replay the week", "Email me this digest weekly" (checked 2026-10-12 with agent-browser, signed out). Replay page live.
- Email sending: code merged and deployed with migration per PR; I could not verify a real email was sent (PR #2473 says it wasn't tested end to end; admin live test-send added in #2482). Post says what it does, not that readers already received one.
- Disagreement: email footer and email shell brand say "Releases Index" (collection-digest-email.ts:112, email-shell.ts BRAND_NAME) — conflicts with the house name "Release Notes Index". The email screenshot from the PR shows it too. Tell author.
- PR #2481 says PATCH doesn't accept weeklyDigestEnabled; #2485 (later) added it. HEAD docs agree with #2485.
- Live card data differs from PR screenshot (Codex 3 releases live vs 4 in the PR shot); the PR shot predates a coverage fix linking a same-launch pair. Caption the PR shot as from the time of building.

## Cuts

- Timeline (all ten PRs merged in one day) — process; not the point.
- Flame alignment fix (#2465), revalidation of replay pages (#2468), plain-text meta fix (#2480), weeklyDigestEnabled on detail (#2481), admin live test-send (#2482): plumbing and polish; fold or cut.
- GraphQL field decisions, changesets, ISR details, rAF loop specifics, row packing, OG/noindex.
- The local shim used to capture screenshots (process).
- Composition "Others" fold details beyond one clause.
- Who reviewed what: no review threads exist anyway.

## Open questions (author can't be asked; written around)

1. Why build the card/replay/email now — what prompted turning digests into a product? → Not claimed. Post opens from the reader problem stated in #2459 ("people only see it if they visit the page"), which is in the record.
2. Why 5 seconds per day / 35 seconds total? → Stated as a decision, no motive given.
3. Have real subscribers received a Monday email yet, and any numbers (subscribers, opens)? → No claim of adoption or delivery.
4. Is the footer brand "Releases Index" intended? → Not mentioned in post; flagged.
5. The design was iterated on a private canvas — are there round-one images the author would share? → No progression strip; none in the record.
