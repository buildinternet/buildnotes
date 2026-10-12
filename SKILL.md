---
name: build-story
description: Turn the real history of a feature (its issues, PRs, commits, reviews, design docs and screenshots) into a public-facing post about how it was built and why, with diagrams, simple motion, before/after visuals and code where it helps, published as a page. Three flavors, from a release-notes-style launch story to a technical deep dive. Use when asked to write up how a feature was built, the thinking or design behind a change, a technical blog post, devlog, case study, launch post or behind-the-scenes piece about work in a git repo, even when the request never says "blog".
---

# Build story

A build story explains a feature to someone who knows what the product does but wasn't in the room: what problem it solves, how it works, and the two or three challenges that shaped it. It is written for people outside the team. The repo supplies the evidence; the story comes from understanding what the work means for the people who use the product.

The record is the source, not the story. Issues, PRs, commits and reviews tell you what happened and in what order, and they are a small sliver of the picture. Zoom out: read the product the way its users meet it, and find the angle a product marketer would, meaning what changed for users and why it's worth their attention. The post tells the reader what was built, why it matters, and why it is the way it is. Organize by idea, not by date.

Three failures this skill exists to prevent:

- **The play-by-play.** The development process narrated in order, with timestamps, PR numbers and who reviewed what. True, and useless to a reader.
- **The changelog in prose.** Every change listed, no argument.
- **The press release.** Confident claims with nothing behind them.

The cure for all three is the same. Find the few ideas and decisions that made the feature what it is, explain each at the altitude your reader needs, and back each one with real evidence.

## The rules

Each rule carries the fault that taught it.

- **Earn every detail.** Before keeping any detail (a date, a number, a quote, a tool name, a review comment, a code excerpt), ask: would the reader understand the feature or its design less without it? If not, cut it, however true or interesting it is. Nothing in the record is owed a place in the post. *(Fault: an adversarial-review quote that added color and no understanding.)*
- **Ideas, not chronology.** Chapters are concepts, challenges or parts of the system, never days or PRs. Mention timing only when it is the point ("it shipped in a week because the write path already existed"), and then in days, never minutes. *(Fault: "At 14:56 UTC the decision went the other way; the API half merged at 15:33.")*
- **Lead with what people can do.** The headline is the capability users see, not the mechanism behind it; the mechanism leads only in a deep dive, when the author asks, or when it *is* what users touch. Open with what the reader would recognize: what was slow, missing or fragile, and what they can do now. Internal names come later, glossed once. *(Fault: a post about one-click preview links whose centerpiece was how the scheduler pools build machines.)*
- **Show the turn, briefly.** The chapters that matter name a decision, the alternative that lost, and why, in a few sentences. That is strategy, and readers want it. How the team got there (meetings, reviews, reversals) belongs in the post only when the path itself teaches something. *(Fault: "we added per-branch databases" with no word on why not share one with a schema per branch.)*
- **Process detail is optional.** Review comments, which tools or agents did the work, PR counts and timelines are never required. Light iteration labels are fine and often useful ("round one", "a later pass", "as it ships"), especially on a before/after or a progression of screenshots. Clock times and commit-by-commit narration are not. Include one when it changes the reader's picture: a review that found a flaw the reader would otherwise wonder about, a reversal that explains an odd-looking design. *(Fault: three review quotes in a row, each crediting a reviewer, none needed to understand the design.)*
- **References are rare and reachable.** Link only what the reader can open and would want to: public docs, the product, the open-source repo, at most a handful of key PRs in a deep dive. In a private project, link nothing internal (issues, PRs, commits, internal docs, dashboards). The prose never depends on a link. *(Fault: a superscript issue number on every other paragraph of a post about a closed-source product.)*
- **Every number has a source, and earns its place.** A count, a size or a duration comes from the dossier, a file, or a command you ran for this post. Prefer numbers about the product and its users ("a preview is ready about 40 seconds after you push", "links expire after 30 days") over numbers about the process (lines changed, PRs merged). A number in the masthead must make sense before the reader has read anything; most posts have none. *(Fault: "cut latency by ~40%" with no measurement anywhere; a masthead reading "Write paths: 1".)*
- **Real code, only where the code is the idea.** An excerpt is copied from the shipped commit, at most about 15 lines, labelled with its file name and nothing else, with cuts marked `…`. Release stories rarely need code beyond a usage example; deep dives can carry several. Never write illustrative code and present it as the real thing. *(Fault: a tidy snippet that matches nothing in the repo.)*
- **One visual per chapter, at most, and it must explain.** A flow, a before/after, a screenshot of what the reader will see, a motion that shows something moving. Decoration goes. *(Fault: a diagram that restates the heading.)*
- **Infer the angle; don't invent the facts.** Implications, context and hooks the record never states are yours to find and propose. Motives, quotes, events and numbers are not: when the record doesn't say why, ask the author or leave the claim out. *(Faults: a post that only restates the PRs; a plausible but fictional origin story.)*
- **Safe to publish.** No secrets, tokens, internal hostnames, customer names, personal paths or emails, internal links, or unreleased plans unless the author clears them. *(Fault: a terminal excerpt with a live API key in it.)*

## Flavors

Pick one in Scope. It sets the reader, the altitude and the defaults below.

| | **Release story** | **Build story** (default) | **Technical deep dive** |
|---|---|---|---|
| Reader | Users and prospective users | Developers who know the product | Engineers who want the mechanism |
| Answers | What's new, why it matters, how to use it | What we built, how it works, what shaped it | How it works inside, the trade-offs, the edge cases |
| Altitude | Product and outcomes; internals in a sentence | Concepts and decisions; internals where they explain | Mechanisms, data structures, failure modes |
| Length | 600–1,200 words | 1,500–2,500 words | 3,000+ words |
| Visuals | Screenshots, before/after, one simple flow | Diagrams, motion, before/after | Diagrams, terminal runs, charts |
| Code | A usage example at most | Only where the code is the idea (0–3) | Where it helps (several) |
| Process detail | None | Only where it explains a design | Where it teaches (a reversal, a review that found a flaw) |
| References | Docs and product links | A short "Further reading" at most | Key PRs and docs, if public |

Ryan's anatomy post sits between build story and deep dive: technical, with real code, yet organized entirely by idea, with no dates or process narration.

## Workflow

### 1. Scope

Settle these from the request, the repo and the defaults below. Don't ask about scope on its own: if something here is truly unclear, fold it into the single message in step 3.

- **Subject.** Which feature, as concrete selectors: an umbrella issue, a PR list, a search phrase, a commit range or a path.
- **Flavor.** Release story, build story or deep dive. Default: build story.
- **Visibility.** Is the repo public? `gh repo view --json visibility -q .visibility` (the gatherer records it too). If it's private or unknown, the post links nothing internal and keeps no sources list of issues and PRs.
- **Voice.** "I" or "we". Default: "we", in plain English (STE-lite: short sentences, active voice, one term per thing). Strict Simplified Technical English only if the author asks. See [references/story.md](references/story.md#voice).
- **House style.** The product's exact name, terms to use and avoid, anything the project's docs fix. For a private repo, also add names that must not appear: customers, partners, suppliers, internal codenames you find in the record. Pass the avoid-list to `lint.mjs --avoid`. Paraphrase around an avoided term; never edit inside a quotation.
- **Modules.** Standard opt-in extras that sit after the story as an appendix: a PR-by-PR build log, process numbers, a by-day timeline, review notes, a how-it-was-made note, a sources list. All off by default. Include the ones the author asks for. Offer one in a single line only when the evidence makes it unusually good. Menu and how to add each: [references/modules.md](references/modules.md).
- **Disclosure.** If the record shows coding agents or automated reviewers did part of the work, say nothing about it by default (don't ask). Mention a specific review only when it is part of the story; an author who wants more gets the `how-made` module.
- **Other repos.** If part of the feature shipped elsewhere (a CLI, an SDK), add it with `--also-repo`.

### 2. Gather the evidence

Run the gatherer. It needs only `git` and an authenticated `gh`:

```bash
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --issue 2290
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --pr 120,131,140 --download
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --search "rate limit" --also-repo acme/cli
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --since 2026-09-01 --path src/limits   # git only, no GitHub
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --issue 2290 --prior "rate limit"     # also list earlier work in the area
```

It writes `dossier.md` (a skimmable digest) and `dossier.json` (everything, unabridged). The digest opens with totals and **Story candidates** (decision sections in issue and PR bodies, decision language in comments, bursts of work, follow-up clusters, reverts). Issues that the selected PRs close are pulled in automatically, then feedback signals, hot files, cross-repo references, a timeline, and each issue and PR with bot scaffolding stripped. The dossier is detailed so you can find the story. Almost none of that detail goes in the post.

Read in this order and stop when you have the story: `dossier.md` → the design docs it lists → the hot files, only where a chosen idea lives. Details: [references/evidence.md](references/evidence.md).

### 3. Frame the story

Before planning beats, decide which story this is. Zoom out first: look at the product as users meet it, earlier releases in the area and how other tools handle the same job, and draft two or three **angles** (a hook, who it speaks to, what it rests on). Then draft a **brief** around the one you recommend: the headline (what people can do now), the starting point and endpoint from the user's side, prior context (is this new, or an iteration on something people already know?), the audience (technical or not), and the supporting cast versus what's out of frame. Decide what you can safely infer and mark it *assumed*. Ask the author only about a guess that would change the shape of the post, usually the headline or the audience: one message, rarely more than two questions, zero is fine. Either way, tell the author the frame in two or three lines and keep going; don't wait unless you asked. Fields, examples and how to ask: [references/brief.md](references/brief.md).

### 4. Plan the beats

Under the brief in `plan.md`, put the **story plan**:

1. **Thesis.** One sentence the reader could repeat, running from the brief's starting point to its endpoint: "Reviewing a change used to mean pulling the branch and running it yourself; now every pull request gets a live link."
2. **Beats.** One per chapter (the flavor sets how many), each with: the idea, the decision and the alternative if there is one, the evidence, and the **reader takeaway** (what the reader understands after it). A beat with no takeaway gets cut.
3. **Cuts.** What you're leaving out and why. Most of the dossier lands here: the sequence of events, who reviewed what, timestamps, PR-by-PR detail.
4. **Open questions.** Gaps only the author can fill.

Shapes, altitude examples and voice: [references/story.md](references/story.md).

Questions that come up while planning go on the open-questions list, delivered with the draft. Don't stop to ask unless an answer would change the headline or a chapter. **If you can't ask**, note under each question the claim you did *not* make because of it, and deliver the list with the draft.

### 5. Make the visuals

For each beat, decide whether a visual earns its place: a step flow or diagram, a simple motion, a before/after pair, a screenshot of what the reader will see, a chart, or an image already in a PR. Code and terminal blocks are evidence, not visuals. Make the visuals before writing the prose around them. Patterns and capture recipes: [references/visuals.md](references/visuals.md).

### 6. Write the page

Copy [assets/template.html](assets/template.html) into the work dir as `post.html` and replace its example content. Its components are a toolbox, not a checklist. Most posts use four or five of them and delete the rest. The template has: masthead, chapters, options table, step flow, SVG diagram, before/after, screenshot frame, code and terminal blocks, bars, quote-and-change list, timeline, notes and further reading. Opted-in modules go after the last chapter: generate the data ones with `node <skill-dir>/scripts/module.mjs <build-log|numbers|timeline> <work-dir>/evidence/dossier.json` and paste the fragment in. If the project has its own brand or design system, restyle the `:root` tokens to match it.

### 7. Check

Start with the linter:

```bash
node <skill-dir>/scripts/lint.mjs <work-dir>/post.html --flavor build --avoid "term one,term two" [--private] [--ste]
```

It prints prose words per chapter, banned phrasing, mannered constructions, process detail (clock times, issue and PR references, review and merge talk) against the flavor's budget, the opening sentence of each paragraph, every sentence with a number, sentence length and passive voice, masthead stats to justify, terminal blocks that stack commands or run long, leftover template text, and a safety scan. With `--private`, any link to the repo's issues, PRs or commits fails. Then do the half it can't:

- **Detail pass.** Read each paragraph as the flavor's reader. For every detail, apply *earn every detail*. Process detail flagged by the linter is a prompt to cut, not a count to hit.
- **Fact pass.** Tick each number against the dossier, a file or your own run. Test counts come from running the tests, never from grep. For any shipped/released/live claim, check the code, the release and the public docs; tell the author when they disagree.
- **Safety pass.** Read every safety hit, reread each code and terminal block, and open every image.
- **Render pass.** Open the page once at desktop and phone width, in light and dark. Recipe: [references/visuals.md](references/visuals.md#checking-the-render).

### 8. Publish

Embed local images first, because an artifact page can't load images from other hosts:

```bash
node <skill-dir>/scripts/inline-assets.mjs <work-dir>/post.html > <work-dir>/post.published.html
```

Publish `post.published.html` as a private Artifact (title = the post's name) and give the author the link along with the open questions. For their own site, use `--standalone` (adds the doctype and viewport meta), or hand over `post.html` plus `assets/`. The chapters also convert cleanly to Markdown/MDX on request.

## Files

- `scripts/gather.mjs` — evidence dossier from git + GitHub
- `scripts/lint.mjs` — word counts, banned phrasing, process-detail budget, number ledger, plain-English metrics, terminal and masthead checks, leftovers, safety scan
- `scripts/inline-assets.mjs` — embed local images (`src`, `poster`, `srcset`) as data URIs and drop authoring comments (`--standalone` for a full document)
- `scripts/module.mjs` — render an opt-in module (build log, numbers, timeline) from the dossier
- `assets/template.html` — page template and component toolbox
- `references/evidence.md` — what to read, what to skip, mining the record
- `references/brief.md` — the story brief: headline, start and end, prior context, audience, and the questions to ask the author
- `references/story.md` — shapes, altitude, voice and banned phrasing
- `references/visuals.md` — diagram, motion, screenshot and chart patterns
- `references/modules.md` — the opt-in module menu, placement rules, and when to add a module
