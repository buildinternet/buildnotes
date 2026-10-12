---
name: build-story
description: Turn the real history of a feature (its issues, PRs, commits, reviews, design docs and screenshots) into a public-facing post about how it was built and why, with diagrams, simple motion, before/after visuals and code where it helps, published as a page. Three flavors, from a release-notes-style launch story to a technical deep dive. Use when asked to write up how a feature was built, the thinking or design behind a change, a technical blog post, devlog, case study, launch post or behind-the-scenes piece about work in a git repo, even when the request never says "blog".
---

# Build story

A build story explains a feature to someone who knows what the product does but wasn't in the room: what problem it solves, how it works, and the two or three decisions that shaped it. It is written for people outside the team.

The record is the source, not the story. Issues, PRs, commits and reviews say what happened and in what order, and they are a small slice of the picture. Read the product the way its users meet it, and find the angle a product marketer would: what changed for users, and why it is worth their attention. Organize by idea, not by date.

Three failures this skill exists to prevent:

- **The play-by-play.** The development process narrated in order, with timestamps, PR numbers and who reviewed what.
- **The changelog in prose.** Every change listed, no argument.
- **The press release.** Confident claims with nothing behind them.

The cure for all three is the same. Find the few ideas and decisions that made the feature what it is, explain each at the level the reader needs, and back each one with real evidence.

## The rules

Each rule carries the fault that taught it, and links to the reference that holds the detail where there is one.

- **Earn every detail.** Keep a date, number, quote, tool name, review comment or code excerpt only if the reader would understand the feature less without it. Nothing in the record is owed a place. *(Fault: an adversarial-review quote that added color and no understanding.)*
- **Lead with what people can do.** The headline is the capability users see, not the mechanism behind it. The mechanism leads only in a deep dive, when the author asks, or when it *is* what users touch. [brief.md](references/brief.md#the-six-fields) *(Fault: a post about one-click preview links whose centerpiece was how the scheduler pools build machines.)*
- **Ideas, not chronology.** Chapters are concepts, challenges or parts of the system, never days or PRs. Mention timing only when it is the point, and then in days. Iteration labels ("round one", "as it ships") are fine; clock times and commit-by-commit narration are not. [story.md](references/story.md#altitude) *(Fault: "At 14:56 UTC the decision went the other way; the API half merged at 15:33.")*
- **Show the turn, briefly.** A chapter that matters names the decision, the alternative that lost, and why, in a few sentences. *(Fault: "we added per-branch databases" with no word on why not one shared database with a schema per branch.)*
- **Process detail is optional.** Review comments, PR counts, timelines, and which tools or agents did the work are never required. Include one only when it changes the reader's picture: a review that found a flaw they would wonder about, a reversal that explains an odd-looking design. If coding agents or automated reviewers did part of the work, say nothing about it by default and don't ask; the `how-made` module is there if the author wants it. *(Fault: three review quotes in a row, each crediting a reviewer, none needed to understand the design.)*
- **References are rare and reachable.** Link only what the reader can open and would want: public docs, the product, an open-source repo, a few key PRs in a public deep dive. In a private repo, link nothing internal. The text never depends on a link. [story.md](references/story.md#references) *(Fault: a superscript issue number on every other paragraph of a post about a closed-source product.)*
- **Every number has a source, and earns its place.** It comes from the dossier, a file, or a command you ran for this post. Prefer numbers about the product ("a preview is ready about 40 seconds after you push") over numbers about the process (lines changed, PRs merged). Masthead stats are off by default; keep one only if a stranger gets it cold. [evidence.md](references/evidence.md#numbers-worth-having) *(Fault: "cut latency by ~40%" with no measurement anywhere; a masthead reading "Write paths: 1".)*
- **Name ideas, not identifiers.** In the story, say what a thing does; save function names, flags and enum values for the try-it section and code blocks. [story.md](references/story.md#name-ideas-not-identifiers) *(Fault: a chapter whose sentences are strung between `flush()`, `commit()` and `edit_rev`.)*
- **Real code, only where the code is the idea.** Copied from the shipped commit, at most about 15 lines, captioned with the file name only, cuts marked `…`. Never present illustrative code as the real thing. *(Fault: a tidy snippet that matches nothing in the repo.)*
- **One visual per chapter, at most, and it must explain.** Decoration goes. [visuals.md](references/visuals.md) *(Fault: a diagram that restates the heading.)*
- **Infer the angle; don't invent the facts.** Implications, context and hooks the record never states are yours to find. Motives, quotes, events and numbers are not: when the record doesn't say, leave the claim out and put it on the open questions. *(Faults: a post that only restates the PRs; a plausible but fictional origin story.)*
- **Plain, scannable voice.** "We" (or "I"), plain English (STE-lite: short sentences, active voice, one term per thing; strict STE only if the author asks), bold the key decision about once per chapter, lists for three or more items. Sound like a person, not a writer. [story.md](references/story.md#voice) *(Fault: "We added three things. A retry… A queue… And an alert…", a list pretending to be a paragraph.)*
- **Safe to publish.** No secrets, tokens, internal hostnames, customer names, personal paths or emails, internal links, or unreleased plans unless the author clears them. *(Fault: a terminal excerpt with a live API key in it.)*

## Flavors and size

Pick one in Scope. It sets the reader, the level of detail and the defaults below.

| | **Release story** | **Build story** (default) | **Technical deep dive** |
|---|---|---|---|
| Reader | Users and prospective users | Developers who know the product | Engineers who want the mechanism |
| Answers | What's new, why it matters, how to use it | What we built, how it works, what shaped it | How it works inside, the trade-offs, the edge cases |
| Detail | Product and outcomes; internals in a sentence | Concepts and decisions; internals where they explain | Mechanisms, data structures, failure modes |
| Visuals | Screenshots, before/after, one simple flow | Diagrams, motion, before/after | Diagrams, terminal runs, charts |
| Code | A usage example at most | Only where the code is the idea | Where it helps |
| Process detail | None | Only where it explains a design | Where it teaches |
| References | Docs and product links | A short "Further reading" at most | Key PRs and docs, if public |

**Size it to the subject, not the flavor.** Word counts are ceilings with no minimum (release story up to 1,200, build story up to 2,500, deep dive as long as it needs; chapters and visuals per flavor in [story.md](references/story.md#length)). A small change gets a **note**: a paragraph or three, no chapters, no masthead, at most one visual.

**Say when it isn't worth a write-up.** If the subject is thin (a typo, a one-line fix, a dependency bump, a refactor users never see), check the nearby work first. If the thin change is one piece of a bigger idea, that is a change of subject and worth stopping for: say in a sentence why the change alone isn't a post, name the bigger idea and the angle you'd lead with, and ask whether to write that instead (check it first with `--pr`). If there is no bigger idea, say plainly it's not worth a post and offer a short note or a changelog line.

## Workflow

### 1. Scope

Settle these from the request, the repo and the defaults. Don't ask about scope on its own; if something is truly unclear, fold it into the one message in step 3.

- **Subject.** The idea the post is about. Whatever the author points at (an issue, a few PRs, a search phrase, a commit range, a path) is a breadcrumb, not a boundary. Related work landing around the same time (the dossier's **Nearby work**) often belongs to the same idea, and some of what was pointed at may not. Draw the boundary around the idea.
- **Flavor and size.** Default: build story for a real feature, a note or "not worth a post" for a thin one.
- **Visibility.** `gh repo view --json visibility -q .visibility` (the gatherer records it too). Private or unknown means nothing internal is linked.
- **House style.** The product's exact name and terms to use or avoid. For a private repo, add names that must not appear (customers, partners, internal codenames). Pass the avoid-list to `lint.mjs --avoid`; paraphrase around an avoided term, never inside a quotation.
- **Modules.** Opt-in appendix extras (build log, process numbers, by-day timeline, review notes, how-made, sources), all off by default. Include the ones the author asks for; offer one in a single line only when the evidence makes it unusually good. [modules.md](references/modules.md)
- **Other repos.** If part of the feature shipped elsewhere (a CLI, an SDK), repeat the search there with `--search … --also-repo owner/name`.

### 2. Gather the evidence

Make a work dir outside the repo, so it survives worktrees and never lands in tracked files. `<work-dir>` below means this path, or the author's own place if they name one.

```bash
WORK=$(node <skill-dir>/scripts/workdir.mjs preview-links)   # → $BUILD_STORY_DIR (default ~/.build-stories)/<repo>/<date>-preview-links
```

Run the gatherer (needs `git` and an authenticated `gh`; `--help` lists every flag):

```bash
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --issue 412
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --pr 120,131,140 --download
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --search "rate limit" --also-repo acme/cli
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --since 2026-09-01 --path src/limits   # git only
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --issue 412 --prior "rate limit"     # earlier PRs matching this phrase
```

It writes `dossier.md` (a skimmable digest) and `dossier.json` (everything). The digest opens with totals, hot files and **Story candidates**, then **Nearby work** (other merged PRs within `--window` days, default 2; ★n = files shared with the selected work), **Prior work**, feedback signals, cross-repo references, a timeline, and each issue and PR. Issues the selected PRs close are pulled in automatically. Almost none of this detail goes in the post.

Read `dossier.md`, then the design docs it lists, then code only where a chosen idea lives. Stop when you have the story. [evidence.md](references/evidence.md)

### 3. Frame the story

Decide which story this is before planning beats. Zoom out to the product as users meet it, earlier releases in the area, and how other tools do the same job. Run the lenses, draft two or three **angles**, and recommend one. Then write the **brief** at the top of `plan.md`: headline, starting point, endpoint, prior context, audience, supporting cast and what's out of frame.

Ask as little as possible. Decide what you can infer and mark it *assumed*. Ask only about a guess that would change the shape of the post (usually the audience, or two angles too close to call): one message, rarely more than two questions, zero is fine. Either way, tell the author the frame in two or three lines and keep going; wait only if you asked. [brief.md](references/brief.md)

### 4. Plan the beats

Under the brief in `plan.md`:

1. **Thesis.** One sentence from the brief's starting point to its endpoint.
2. **Beats.** One per chapter, each with the idea, the decision and the alternative if there is one, the evidence, and the **takeaway** (what the reader understands after it). A beat with no takeaway is cut.
3. **Cuts.** What you're leaving out and why. Most of the dossier lands here.
4. **Open questions.** Gaps only the author can fill, each with the claim you left out because of it.
5. **Notes for the author.** Things they should know that aren't questions, such as docs that lag the code. [evidence.md](references/evidence.md#when-sources-disagree)

Don't stop to ask unless an answer would change the headline or a chapter; both lists go with the draft. Shapes, beats and length: [story.md](references/story.md).

### 5. Make the visuals

For each beat, decide whether a visual earns its place, and make it before writing the text around it. Most visuals are components: write a small spec in `<work-dir>/viz/` and let `scripts/viz.mjs` draw it (flows, steps, bars, before/after numbers, line charts, tables, strips, code and terminal blocks, WebGL shaders; each one with its spec in [assets/components.html](assets/components.html)). Code and terminal blocks are evidence, not visuals. Kinds, spec formats, capture recipes and motion rules: [visuals.md](references/visuals.md).

### 6. Write the page

Copy [assets/template.html](assets/template.html) to `<work-dir>/post.html` and replace its example content. Its components are a toolbox: most posts use four or five and delete the rest. Point each `<!-- viz … -->` marker at your own spec and render them all with `node <skill-dir>/scripts/viz.mjs build <work-dir>/post.html`; run it again after editing a spec. Opted-in modules go after the last chapter; generate the data ones with `node <skill-dir>/scripts/module.mjs <build-log|numbers|timeline> <work-dir>/evidence/dossier.json`. If the project has its own brand, restyle the `:root` tokens.

### 7. Check

```bash
node <skill-dir>/scripts/lint.mjs <work-dir>/post.html --flavor build --avoid "term one,term two" [--private] [--ste]
```

The linter reports words per chapter, banned and writerly phrasing, process detail against the flavor's budget, every sentence with a number, sentence length and passive voice, scan aids, identifiers in the text, masthead stats, terminal blocks, animated-dot faults, rendered components (stale markers, bars off scale, more than one visual in a chapter), leftover template text and a safety scan. It exits 1 on a hard failure; with `--private`, any link to the repo's issues, PRs or commits is one. Then do the half it can't:

- **Detail pass.** Apply *earn every detail* to each paragraph. A linter flag is a prompt to cut, not a count to hit.
- **Fact pass.** Tick each number against the dossier, a file or your own run. Test counts come from running the tests, never from grep. Check every shipped/live claim against the code, the release and the docs; record any gap under Notes for the author.
- **Safety pass.** Read every safety hit, reread each code and terminal block, and open every image.
- **Render pass.** Desktop and phone width, light and dark, once each. [visuals.md](references/visuals.md#checking-the-render)

### 8. Publish

An artifact page can't load images from other hosts, so embed them first:

```bash
node <skill-dir>/scripts/inline-assets.mjs <work-dir>/post.html > <work-dir>/post.published.html
```

Publish `post.published.html` as a private Artifact (title = the post's name) and give the author the link with the open questions and notes. For their own site, add `--standalone` (doctype and viewport meta) or hand over `post.html` plus `assets/`. The chapters convert cleanly to Markdown/MDX on request.

## Files

- `scripts/gather.mjs`: evidence dossier from git and GitHub
- `scripts/workdir.mjs`: a work dir under `$BUILD_STORY_DIR` (default `~/.build-stories/<repo>/`)
- `scripts/lint.mjs`: the mechanical half of the Check step
- `scripts/module.mjs`: an opt-in module (build log, numbers, timeline) from the dossier
- `scripts/viz.mjs`: visual components rendered from small specs (`scripts/viz/`, one file per kind)
- `scripts/export.mjs`: one figure as PNG, GIF, MP4/WebM or standalone SVG, for slides or another blog ([visuals.md](references/visuals.md#exporting-a-figure))
- `scripts/inline-assets.mjs`: embed local images and video (`src`, `poster`, `srcset`) as data URIs and drop authoring comments
- `assets/template.html`: page template and component toolbox
- `assets/components.html`: every component with its spec; the specs are in `assets/specs/`
- `references/brief.md`: angles, the brief, and how little to ask the author
- `references/evidence.md`: what to read, what to skip, numbers, terminal blocks, sources that disagree
- `references/story.md`: shapes, beats, altitude, references, voice, length
- `references/visuals.md`: diagram, motion, screenshot and chart patterns
- `references/modules.md`: the opt-in module menu and placement rules
