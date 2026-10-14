# Notes — before/after comparison build story (skill test run, 2026-10-14)

## 1. Open questions for the author

None that would change a claim.

## 2. Notes for the author

- The docs section "Pair a before and after" describes the `--state` and name rules but not the file page's Compare mode. A sentence and a link to a live pair would help people find it.

## 3. Skill friction

- **The record's screenshots weren't the product in use.** The PRs' images were seeded placeholders ("BEFORE" and "AFTER" boxes) and dev captures of the file page itself. The strongest figures came from outside the record: real pairs found with `uploads find state=before`, a real pull request comment captured from GitHub, and the live file page in Compare. `evidence.md` has no recipe for "find a real instance of the feature in use", which for a tool like this is the best evidence there is.
- **Recording an interaction for the motion cut.** The Compare scene is a recording of the live page with the divider moved frame by frame through the component's own `value`. It took a one-off script over `chrome.mjs`. A small `capture` helper (open a URL, run a step function per frame, write an MP4) would make `clip` scenes easy to make from any page.
- **Motion cut: the first region of a `shot` was held only about a second.** Region k was timed from the scene start, not from the previous hold, so with two regions the first left early. Fixed in this run: every region holds 2.2 s.
- **Lint counts "uploads.sh" at the start of a sentence as part of the sentence before it.** The opening's "31 words" is two sentences; the product name starts with a lowercase letter.
- **Lint's one-command-per-block rule fires on a strip of terminal frames.** The overwrite figure shows two captures per frame on purpose. Dropping the `$` prompts quieted it; a strip frame could be exempt.
- `gather.mjs` pulled in #618 and #620 (the overwrite bug and its fix) through the issue's reference to #419. That was the best chapter in the post, and nothing in the request pointed at it.

## 4. Lint summary

```text
Process detail (build budget): clock times 0/0 · dates 0/3 · references in prose 0/0 · process-talk sentences 2/4
Product name "uploads.sh": 2 in the prose, none in the title or headings.
Plain English: 14.1 words/sentence (aim ≤15) · passive 5% (aim ≤10%) · 1 over 25 words (a false positive, above)
Components: 2 rendered from specs: strip viz/strip-file-page.json · strip viz/strip-names.json
Links: all 2 open.
Total prose: 845 words (build: up to 2500, no minimum).
```
