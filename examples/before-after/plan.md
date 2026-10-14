# Plan: before/after comparison (build story, Plain)

Repo public (buildinternet/uploads). Product: "uploads.sh". Links: public docs and the product only; no PR numbers in prose.
Lint: `--flavor build --product "uploads.sh"`.

## Angles
1. **A before and an after belong in one row.** (recommended) For: developers and agents who attach screenshots to PRs. Evidence: comment pairing (#419, #424), file-page compare (#420, #425, #550), the overwrite bug that broke the most common capture (#618, #620). Inference: the reviewer's job is comparing, so the tool should line the two up instead of asking them to.
2. **A slider with no framework.** For: web developers. Evidence: #550's dependency choice and sizing contract. Folded into 1 as chapters 2 and 3.
3. **The pair that overwrote itself.** For: CLI users. Evidence: #618, #620. Kept as chapter 4: it's the turn readers would otherwise hit.

## Brief
- Headline: Before and after screenshots, side by side. (sure)
- Start → end: a before/after pair rendered stacked in upload order and compared across two tabs → tagged pairs share one row in the PR comment, and the file page slides a divider across both. (sure)
- Prior context: path and state metadata already showed in the managed comment (#365, #370). One clause.
- Audience: developers (and their coding agents) who already attach screenshots to PRs with uploads.sh. (likely)
- Supporting cast: pairing rules; the v1 thumbnails that hid the change; the slider dependency; registration; the same-URL overwrite.
- Out of frame: goldens contract, D1 query tiers, ARIA details, test counts, process (agents, timing).

## Thesis
A before and an after used to arrive as two unrelated images; now, tagged with their state, they share one row in the pull request comment, and the file page lets you drag a divider across both.

## Beats
1. **Pairs that find each other.** Rule: same page (`path`) with one before and one after; else names that differ only by a before/after word. Decision: pair only when there is exactly one of each; an ambiguous group stays unpaired rather than guessed. Untagged shots render as before. Layout capped at 320 px a side so the pair fits a phone (checked at 375 px). Takeaway: tag the state and the comment does the pairing. Visual: the real managed comment on buildinternet/releases#2234 (an unpaired "after" above, a paired row below). Evidence: #419, #424, comment captured 2026-10-14.
2. **A divider instead of thumbnails.** v1 (#425) put two 220 px panels above the image: too small to see a change, not links, a copy of the stage below. #550 replaced them with Compare on the main stage: This image | Compare, single by default. Decision: `img-comparison-slider` (~3.6 kB, no dependencies) over a React slider, because the page ships no framework; loaded only when a pair exists. Visibility: a public page never reveals a private counterpart. Takeaway: the comparison is the main view, at full size. Visual: strip, round one vs as it ships (#550's own captures). Evidence: #420, #425, #550.
3. **Two shots that line up.** Shots of the same page differ by a few pixels. The after sizes the box; the before is fitted into it from the top-left, so content registers and a mismatch letterboxes instead of cropping. Known edge: a before several times taller renders narrower. Takeaway: what moved is what changed. Visual: live capture of Compare on the releases.sh docs pair, 2026-10-14. Evidence: #550.
4. **The pair that overwrote itself.** `uploads screenshot` named the file from the URL only, so the normal flow (same page, before then after) wrote both to one key; the PR showed the after twice, silently. Fix: the state goes into the name (`…-before.webp`, `…-after.webp`) and a replaced capture says so. Takeaway: the one-command capture now produces a pair. Visual: strip of two code frames, before and after the fix. Evidence: #618, #620.
5. Try it (in ch 4): `uploads put` with `--state`, or `uploads screenshot` twice; docs link.

## Numbers (each with source)
- 320 px per side, checked at 375 px: #424 body.
- 220 px panels: #550 body.
- ~3.6 kB gzipped, zero transitive deps: #550 body.

## Cuts
- Goldens, CLI/API byte-identical render copies, D1 tiers, `findObjectsByMetadata`.
- ARIA added to the slider, FOUC guard (true, but no reader sees it).
- Test counts, timing (all merged within a day), agent signals.
- The canonical-state hardening in #620 (only enum states fold): one clause at most; cut.
- Transitional note about pre-upgrade keys.

## Open questions
None that would change a claim.

## Status check
- Comment pairing on main: tests "pairs same-path before/after metadata into one side-by-side row" (apps/api/src/github-comment-render.test.ts); live on releases#2234's comment, captured 2026-10-14.
- File page Compare on main: ImagePreview.astro imports img-comparison-slider; live on uploads.sh/f/…/2234/localhost-docs-api-rest-after.webp, captured 2026-10-14.
- Docs: uploads.sh/docs/attach-pull-request-images#before-after describes `--state` pairing and the path/name rules.
