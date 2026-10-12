# Notes — weekly digests build story (skill test run, 2026-10-12)

## 1. Open questions for the author

1. What prompted turning digests into a product now? Post opens from the problem stated in #2459 ("people only see it if they visit the page") and claims no other motive.
2. Why 5 s per day / 35 s per week? Stated as a decision, no reason given.
3. Have subscribers received a real Monday email yet? Any subscriber/open numbers? Post claims no delivery or adoption. #2473 says it was never sent end to end; #2482 added a live test-send.
4. The email footer and shell brand say "Releases Index" (`apps/api/src/lib/email/collection-digest-email.ts:112`, `packages/rendering/src/email-shell.ts` `BRAND_NAME`), which conflicts with the house name "Release Notes Index". Intended? The email screenshot was left out partly for this reason.
5. Design rounds were done on a private canvas (#2454). Could you share round-one images for a progression strip? None are in the record, so the post has none.

## 2. Skill friction

1. **gather `--issue` doesn't pull issues closed by the PRs you pass with `--pr`.** `--issue 2454 --pr 2466,2473,…` left out #2456 and #2459, which hold the decision tables (the best evidence). I had to notice "closes #2456" in the PR bodies and rerun with `--issue 2454,2456,2459`. The second run also pulled #2480 and #2481 through the issue links (fine, but a surprise).
2. **`inline-assets.mjs` ignores `<source srcset>`.** visuals.md recommends `<picture><source srcset="assets/…-dark.png">` for dark pairs, but the script inlines only `src`: `inlined 3 files` while `srcset="assets/glance-dark.webp"` stayed in post.published.html (broken image in dark mode on an artifact). I patched the published file with a one-off Python replace.
3. **Lint "process talk" false positives.** It flagged three product-data sentences in chapter 2 ("In the week shown above, Claude Code had six releases and Codex had four." etc.), probably because product names like "Claude Code"/"Codex" match agent/tool vocabulary. For a product that indexes coding agents, this will fire constantly and eats the process budget (3/4 used, all false).
4. **Lint "numbers to source" is noisy.** It lists figure-caption numbers ("1.", "2.", "3.") and the byline year ("Release Notes Index · October 2026") as numbers to source. Lint's image count also says "Images: 3" when the page has 4 (the `<source srcset>` image is invisible to both the safety image list and inlining).
5. **Motion-path rule vs. turning inside a box.** Lint flagged `680,60 680,200` as "not on any drawn wire" for vertices hidden inside boxes, though visuals.md says the dot should "disappear into each step". Workaround: diagonal segments inside boxes (`L610,60 L680,90`). The rule is right but should say corners inside a box must be avoided or allowed.
6. **Phone width vs. branching SVG.** The diagram keeps a 30rem minimum and scrolls; the guidance says put the key part on the left, but in a left-to-right flow the conclusion (the claim) naturally lands on the right. No recipe for a top-to-bottom alternative in the template.
7. **agent-browser relative paths.** `agent-browser screenshot scratch/x.png` failed ("No such file or directory") because it resolves against the daemon's cwd. The visuals.md recipe uses relative `assets/feature-docs.png`, which will fail the same way. Absolute paths work.
8. **Dossier "human feedback comments" counts uploads-sh bot comments.** "4 human feedback comments" were all `uploads-sh` screenshot-gallery comments. `uploads-sh` isn't in NOISE_BOTS. Feedback signals were empty, which was correct.
9. **Template header comment and leftover check.** The template's top HTML comment ("Build story page template…") isn't flagged by the leftover check, so it would ship in the published page. I deleted it by hand. The SKILL doesn't say whether to keep `<title>` as the first line (no doctype), which the artifact wants anyway.
10. **Dossier "Story candidates" had only one entry** (a burst of 8 merges). The real story lived in the issue bodies' "Decisions" tables and "Open questions from the plan" sections. DECISION_RE doesn't match "Decided", "Decisions already made" or "Scope decision" in issue bodies, apparently only PR text. (Not verified in the code; inferred from output.)
11. The SKILL says "Publish `post.published.html` as a private Artifact": this run forbade it, so step 7 stopped at inlining. No friction, just noted.

## 3. Rules I bent

- **"Real code … labelled with its file name and nothing else"**: I used the repo-relative path (`apps/api/src/queries/collection-digest-subs.ts`), as the template example does. The excerpt is the function body only (15 lines). The signature is left out with no `…` marker, because the cut is at the start.
- **"One visual per chapter"**: chapter 4 has a diagram plus a code block (code is "evidence, not a visual", so this is within the rule, but it reads as two figures).
- **Screenshots from the record vs. live data.** The card screenshot comes from the PR (captured with a local shim that filled composition; Codex shows 4 releases). The live page now shows 3 after a coverage fix. I kept the PR image ("as built") because the skill prefers images taken at the time, and the caption's claim (Claude Code had more releases, smaller tile) holds in both.
- **Process detail**: chapter 3 says "A test checks that the two are equal". That is process-flavoured, but it is the guarantee the reader cares about.
- **"Days, never dates" in captions**: Fig. 1 says "week of 28 September" because it is the week's identity, not a timeline.

## 4. Final lint summary

```
Process detail (build budget): clock times 0/0 · dates 0/3 · references in prose 0/0 · process-talk sentences 3/4
Plain English: 12.7 words/sentence (aim ≤15) · passive 5% (aim ≤10%) · 0 over 25 words
Images: 3. (actually 4; see friction 4)
Total prose: 1799 words (build: 1500–2500).
```
No banned phrasing, no mannered flags after the fix, no avoided terms, no safety hits, no motion-path warning.

Render pass: 1280×800 light (no sideways scroll: scrollWidth 1280 = innerWidth) and 390×844 dark (390 = 390; the dark `<picture>` source works). Fixed after one look: diagram subtitle overflow, the "each message" label clipped at the right, and the replay frames (cropped to the stage so they're readable side by side).

## 5. Revision pass (new voice guidance)

Before: lint flagged writerly words in the opening ("prose", "this post covers"), c1 ("prose") and c2 ("the reader"); "three things" / "two things" with no list after them; `Scan aids: 9 bold · 1 lists · chapters with neither: c1, c4, c5`.
After: no writerly or count-without-list flags; `Scan aids: 19 bold · 5 lists`; 12.4 words/sentence, 0 over 25; 1,784 prose words. Pre-revision copy: scratch/post.before-revision.html.

Changed (wording and structure only, no new claims; each changed sentence rechecked against #2454/#2457/#2459/#2473/#2485):
- Opening: the three additions are now a bulleted list with bold lead-ins; I cut "This post covers…". Added a `.lede-list` style so the list matches the lede size.
- c1: rewrote the "A digest is prose…" opening as in the skill's own example table; the two questions are now a list; "prose" became "text"/"digest text"; split two long paragraphs; bolded the decision ("We chose the covered ones.") and the card's job.
- c2: "the reader" → "you"; bolded the impact definition.
- c3: bolded "The replay ends on the card." (the list already had bold lead-ins).
- c4: the email contents and the two causes of double sends are now lists; bolded the subscription decision and the one-winner sentence.
- c5: bolded the default-on sentence.
- Re-ran inline-assets; the srcset patch was needed again (friction 2 still applies).

Unclear or disputed:
- The "Sound like a person" table's plain rewrite ("…a lot to read when you just want the highlights") is good enough to copy verbatim, and I did. Agents will paste example rewrites, so they need to be factually neutral.
- "About one bold per chapter" vs. "bold lead-ins on list items": the lint count (19) mixes the two, so it can't tell over-bolding from list lead-ins. It would help to count them separately.
- Banning "prose" works for blog readers, but "the digest text" is clumsier in a post about a written digest. I kept one "text" where "digest" alone would be ambiguous.
- "Lists for what you added" plus "Three or more parallel items become a list" pushed a four-item email-contents sentence into a list. That's fine, but a semicolon list in a 4-item ul reads a little stiff.
