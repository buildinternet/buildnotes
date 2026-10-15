# Evidence: what to read, what to skip

The record of a feature is large and mostly noise for a reader. A 16-PR feature produces a dossier of around 80 KB. You need perhaps a dozen facts from it. Read for those facts, not for completeness.

## Choosing selectors

| You have | Use | Notes |
|---|---|---|
| An umbrella or epic issue | `--issue N` | Best start. Pulls sub-issues one level down, and merged PRs that mention each issue. |
| A known set of PRs | `--pr a,b,c` | Exact. Combine with `--issue` freely. Issues these PRs close are pulled in too. |
| A theme, no tracking issue | `--search "phrase"` | Merged PRs only (up to 50), GitHub search syntax (`label:auth`, `author:me`). Check the list; search over-matches. `--also-repo a/b` runs the same search in other repos. |
| No PRs (direct commits, other forges) | `--range v1..v2`, `--since DATE --path dir`, `--grep word` | Commits with their files. Works without GitHub. |
| Earlier work in the area | `--prior "terms"` | Adds merged PRs from before the feature to **Prior work**. Several plain words search as one phrase; search syntax passes through. |

Run it once, look at the timeline and **Nearby work**, and rerun with a tighter or wider selector if the set is wrong. Re-running is cheap; writing about the wrong set of changes is not.

## Reading order

1. **`dossier.md` → At a glance and Timeline.** Note the span, the shape (one big PR, or a burst of small ones on one day, or a slow trickle), and gaps. A burst usually means the design was settled beforehand, so look for the design doc. A long gap between two PRs often hides a rethink.
2. **Issue bodies.** They state the problem in the team's own words before any solution existed. The umbrella issue's "why" and "success" sections are often the post's opening.
3. **Docs touched.** Architecture docs, ADRs and READMEs changed alongside the code hold the reasoning in finished form. Read the sections the PRs changed (`git show <sha> -- <doc>` or `git log -p --follow -- <doc>` narrowed to the span).
4. **PR descriptions.** Look for "why", "alternatives", "trade-offs", "follow-ups", "out of scope". Those paragraphs are beats.
5. **Branch commits.** Read the headlines only. Look for the path the work took: `revert`, `try`, `actually`, `back to`, `fix review`, a rename halfway through. Each is a candidate dead end.
6. **Feedback.** See below.
7. **Code.** Last, and only to find excerpts for beats you've already chosen. Use the hot-files list to find where the core idea lives. Each PR in the dossier carries its merge commit, and each hot file shows the commit that last changed it on HEAD: if that's the feature's own PR, HEAD is safe to quote; if not, read the shipped version with `git show <merge-sha>:<path>` and say which you used.
8. **Other repos.** "Referenced elsewhere" lists issues and PRs in other repositories. If the feature's story crosses into one (a CLI, an SDK), rerun a `--search` with `--also-repo`, or read those PRs directly (`gh pr view N -R owner/name`).

## Mining feedback

Review threads, issue comments and follow-up issues are where the design changed under pressure, so they're the fastest way to find out *why* things are the way they are. Read them to understand the design. Very little of them belongs in the post: usually the reason, restated in your own words at the reader's altitude, and not the comment, the reviewer or the date. In the dossier:

- **A thread with replies** is a conversation: find what the reviewer asked and what the author changed. Check the branch commits after the thread's date for the fix.
- **A follow-up issue opened right after a merge** ("let reviewers extend a link", "clean up previews when a PR closes") is a gap someone noticed. A cluster of them on the same day usually means a review pass or a dogfooding session. Which one rarely matters to the post, so don't ask.
- **Automated reviewers** (CodeRabbit, Copilot and similar) sometimes catch the real bug. Their findings often sit below a collapsed analysis block; if the dossier cut one off, read the full comment with `gh api repos/OWNER/REPO/pulls/comments/<id>`. If a bot's catch does belong in the post, credit it as a bot's, not a person's.
- **Reviews described in prose.** Some of the most important reviews never appear as review threads: an author's PR comment or PR-body paragraph saying "an adversarial review found…". The dossier lists these under feedback signals. Weigh them with the threads, not only the thread count.
- **The author's own notes**, such as PR comments to self, TODOs that were later removed, and "known limitation" sections, show the thinking in motion.

Note the useful ones in `plan.md` with their source link, so the fact pass can find them later. Mark the rare one worth quoting in the post: it explains a design the reader would otherwise find odd, and the original words say it better than a paraphrase would.

## What to skip

- Lockfiles, generated files, snapshots, changesets, version bumps, formatting-only commits.
- Test files, except to count them or to show the one test that pins down the core behaviour.
- CI and bot comments (the gatherer drops most).
- Every PR that is plumbing for another. Fold it into the beat it serves.

## Numbers worth having

Pull these from `dossier.json` and from runs of your own, and keep each with its source. Prefer numbers that describe the product (limits, thresholds, sizes, speeds, counts a user would see). Process numbers help you understand the work; they rarely help the reader.

- Process (mostly for you): span in days, PR count, lines added/removed, files touched, review threads.
- Size of the core idea: lines in the key module, number of routes, tables, states, flags.
- Before/after measurements, only when a run you made or a log in the record shows them. Measure real addresses: take them from the code's routes, the sitemap or the live site's own links, and confirm each returns 200 before timing it. A guessed address measures an error page. Re-run a benchmark or a test command if it is cheap, and show the real output in a terminal block.
- Tests for the feature: run them and quote the runner's own count, with the date. Grep counts are wrong (skipped, parameterized and nested tests), and a PR body's count is the count at merge, not today.

## Terminal blocks

Every terminal block is a command you ran for this post, pasted verbatim. Keep each one small enough to read in a glance:

- **One command per block.** Two commands that tell one story become two blocks with a sentence between them, or you keep the one that matters.
- **Only the output that makes the point.** Usually 1–8 lines: the summary, the one error, the count. Cut the rest and mark the cut with a single `…` line. You may never edit a line you keep.
- **The command as a reader would type it.** No `| head`, `| jq` or `2>&1` plumbing; trim the output instead. Drop optional flags that aren't part of the idea.
- **A bare caption.** "Terminal", or the file or tool name. The run date, fixture, environment and "API calls: none" go in `plan.md` (and the sources module if the author wants one), not on the block. If the reader needs a fact about the run (it was a dry run), say it in the prose.

A runner's own summary (`12 pass · 0 fail`, `audit passed`) is often the whole block. Replace real ids, hostnames and tokens with obvious stand-ins (`proj_example`, `example.com`) and run the command against those where you can, so the output is still real. A dry-run mode or a throwaway fixture repo is usually the safest way to show a write path.

**Stage a cause a reader would hit.** When a run needs something to find (a slow build, a failing check, a missing page), plant the mistake a real user makes, not a synthetic one, then fix it and run again. The before and after numbers are the payoff; a delta or bars component carries them ([visuals.md](visuals.md#components)). *(Fault: a post about a build-timings report whose only run used a plugin slowed with a busy-wait. The project's own post planted a fetch waterfall in a component, read the report down to it, and showed page generation fall by about half once the fetches ran together.)*

## When sources disagree

Issues stay open after the work ships; docs lag the code; a PR body states the plan, not what merged. For any claim about status (shipped, released, live, default-on), check the code on the default branch, the release or tag, and the public docs. Trust them in that order for what exists, and the docs for what users are told.

**Writing ahead of launch is fine.** Posts are often drafted while the work is still landing, and they can describe the product as it will be when the post goes out. Know where the gaps are (merged but not deployed, still in review, planned) and list them under **Notes for the author** in `plan.md`, with which source is stale. Don't block on them, and don't fill the post with hedges. Only an outright contradiction is worth raising before the draft: the post would promise something the code doesn't do, and no work is under way.

**Read the claim in its context before calling it wrong.** A changelog line is often written about one setup: its example, one adapter, one plan. Check what the sentence is describing, then read the current docs page, before a note says a source overstates the feature. If the docs already spell out the difference, there is nothing to flag; the post can still state it plainly. *(Fault: a note saying a changelog overstated how screenshots reach the model, when the changelog was describing the one adapter that sends images, and the docs already listed how the others differ.)*

## How far to check

Check a claim in proportion to what a wrong one would cost the reader. A wrong limit, price, step or default misleads them; check it. A rounded duration, an approximate count or a simplified description of how something works doesn't, as long as the reader comes away with the right idea. Being understood matters more than being exact.

A claim that only production data can confirm (hit rates, latency in the field, error counts, traffic) is a sign the beat is about running the service. In a release or build story, cut the beat or drop the claim rather than go and measure. In a deep dive it can be the point; then measure it, or say what the record shows and stop there.

## Things the record can't tell you

Motive, surprises, what the author would do differently, and anything decided in a meeting or a chat. Write around the gap rather than inventing an answer, and put it on the open questions that go with the draft ([brief.md](brief.md#asking-the-author-as-little-as-possible)).
