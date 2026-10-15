---
name: buildnotes
description: Turn the real history of a feature (its issues, PRs, commits, reviews, design docs and screenshots) into a public-facing post about how it was built and why, with diagrams, simple motion, before/after visuals and code where it helps, published as a page, plus a short video cut on request. Three flavors, from a release-notes-style launch story to a technical deep dive. Use when asked to write up how a feature was built, the thinking or design behind a change, a technical blog post, devlog, case study, launch post or behind-the-scenes piece about work in a git repo, even when the request never says "blog".
argument-hint: "[post|video] [what to write about]"
license: MIT
compatibility: Written for Claude Code; also runs in OpenCode and Codex. Needs Node.js 22 or later, git, and Chrome or Chromium for the render pass. An authenticated gh is best for GitHub data; a GitHub MCP server or public GitHub pages also work.
metadata:
  opencode/slash: "true"
---

# Buildnotes

A build story explains a feature to someone who knows what the product does but wasn't in the room: what problem it solves, how it works, and the two or three decisions that shaped it. It is written for people outside the team.

The record is the source, not the story. Issues, PRs, commits and reviews say what happened and in what order, and they are a small slice of the picture. Read the product the way its users meet it, and find the angle a product marketer would: what changed for users, and why it is worth their attention. Organize by idea, not by date.

Three failures this skill exists to prevent:

- **The play-by-play.** The development process narrated in order, with timestamps, PR numbers and who reviewed what.
- **The changelog in prose.** Every change listed, no argument.
- **The press release.** Confident claims with nothing behind them.

The cure for all three is the same. Find the few ideas and decisions that made the feature what it is, explain each at the level the reader needs, and back each one with real evidence.

## Output

The request may open with the output it wants, as in `/buildnotes video tech explainer of our latest PR`. Read the first word:

- **`post`**: the page. This is the default.
- **`video`**: the page and its motion cut. The cut is made from the finished post, so write the post first, then go straight on to step 9 without offering it.
- **`deck`**: the page and its deck, slides to click through and a PDF. The deck is built from the motion cut's scene script, so write the post and `motion.json` first, then go on to step 10.
- **Anything else**: there is no output word. The whole request is the brief, and a request for a video, a reel or a quick version still means `video`.

The rest of the request is the brief: the subject, plus anything about flavor, reader or style, in plain words. "Tech explainer" or "deep dive" means the technical deep dive, and "launch post" or "release notes" means the release story. Read these as you would any other request; they are not fixed values. When it's unclear whether the author wants a video, don't ask: write the post and offer the cut in the hand-off, as step 9 says.

## The rules

Each rule carries the fault that taught it, and links to the reference that holds the detail where there is one.

- **A starting point, not the manual.** Go only as deep as it takes to get the idea across; the docs carry the rest. Show one way to try it and link the docs, unless the author asks for a full guide. *(Fault: a closing chapter touring every setup path, a menu, an agent tool's argument, two CLI flags and a help screen, for a feature you set up once.)*
- **Earn every detail.** Keep a date, number, quote, tool name, review comment or code excerpt only if the reader would understand the feature less without it. Nothing in the record is owed a place. *(Fault: an adversarial-review quote that added color and no understanding.)*
- **Lead with what people can do.** The headline is the capability users see, not the mechanism behind it. The mechanism leads only in a deep dive, when the author asks, or when it *is* what users touch. [brief.md](references/brief.md#the-six-fields) *(Fault: a post about one-click preview links whose centerpiece was how the scheduler pools build machines.)*
- **Don't name yourself in the title.** The title says plainly what shipped; the angle and the play go in the dek and the opening. The title and chapter headings are about what the reader gets; the product and company name stay out of them, and the prose names the product once where a newcomer needs it. In a feed where every title names its own company, the name stops meaning anything. [craft.md](references/craft.md) *(Fault: "Tell Releases what you care about".)*
- **Ideas, not chronology.** Chapters are concepts, challenges or parts of the system, never days or PRs. Mention timing only when it is the point, and then in days. Iteration labels ("round one", "as it ships") are fine; clock times and commit-by-commit narration are not. [story.md](references/story.md#altitude) *(Fault: "At 14:56 UTC the decision went the other way; the API half merged at 15:33.")*
- **Show the turn, briefly.** A chapter that matters names the decision, the alternative that lost, and why, in a few sentences. *(Fault: "we added per-branch databases" with no word on why not one shared database with a schema per branch.)*
- **Process detail is optional.** Review comments, PR counts, timelines, and which tools or agents did the work are never required. Include one only when it changes the reader's picture: a review that found a flaw they would wonder about, a reversal that explains an odd-looking design. If coding agents or automated reviewers did part of the work, say nothing about it by default and don't ask; the `how-made` module is there if the author wants it. *(Fault: three review quotes in a row, each crediting a reviewer, none needed to understand the design.)*
- **References are rare and reachable.** Link only what the reader can open and would want: public docs, the product, an open-source repo, a few key PRs in a public deep dive. In a private repo, link nothing internal. The text never depends on a link. [story.md](references/story.md#references) *(Fault: a superscript issue number on every other paragraph of a post about a closed-source product.)*
- **Confirm every URL before you use it.** Link to or measure only an address you have seen: in the record, the code's routes, the sitemap, or a link on the live site. Open it and get a 200 first. Never build one by guessing a slug or an id; `lint.mjs` opens every link and fails on one that doesn't load. *(Fault: a speed check on a made-up collection address, whose 404 then became a question for the author.)*
- **Every number has a source, and earns its place.** It comes from the dossier, a file, or a command you ran for this post. Prefer numbers about the product ("a preview is ready about 40 seconds after you push") over numbers about the process (lines changed, PRs merged). Masthead stats are off by default; keep one only if a stranger gets it cold. [evidence.md](references/evidence.md#numbers-worth-having) *(Fault: "cut latency by ~40%" with no measurement anywhere; a masthead reading "Write paths: 1".)*
- **Understood beats exact.** Better a reader who gets the idea from a detail that's close enough than one who gets every detail right and misses the idea. Never mislead, but don't chase precision a reader wouldn't notice. If confirming a claim would take production data, the beat is about running the service: cut it or say less before you investigate. [evidence.md](references/evidence.md#how-far-to-check) *(Fault: a chapter about a cache's hit rate in a post for the product's users, and a trip into server logs to back it up.)*
- **Name ideas, not identifiers.** In the story, say what a thing does; save function names, flags and enum values for the try-it section and code blocks. [story.md](references/story.md#name-ideas-not-identifiers) *(Fault: a chapter whose sentences are strung between `flush()`, `commit()` and `edit_rev`.)*
- **Real code, only where the code is the idea.** Copied from the shipped commit, at most about 15 lines, captioned with the file name only, cuts marked `…`. Never present illustrative code as the real thing. *(Fault: a tidy snippet that matches nothing in the repo.)*
- **One visual per chapter, at most, and it must explain.** Decoration goes. [visuals.md](references/visuals.md) *(Fault: a diagram that restates the heading.)*
- **Infer the angle; don't invent the facts.** Implications, context and hooks the record never states are yours to find. Motives, quotes, events and numbers are not: describe what the record shows the change does, and when it doesn't say why, leave the reason out and put it on the open questions. *(Faults: a post that only restates the PRs; a plausible but fictional origin story; "no fallback model, because another model's score wouldn't mean the same thing", stated as fact with nothing behind it.)*
- **Plain, scannable voice.** "We" (or "I"), plain English (STE-lite: short sentences, active voice, one term per thing; strict STE only if the author asks), bold the key decision about once per chapter, lists for three or more items. Sound like a person, not a writer. [story.md](references/story.md#voice) *(Fault: "We added three things. A retry… A queue… And an alert…", a list pretending to be a paragraph.)*
- **Safe to publish.** No secrets, tokens, internal hostnames, customer names, personal paths or emails, internal links, or unreleased plans unless the author clears them. *(Fault: a terminal excerpt with a live API key in it.)*

## Flavors and size

Pick one in Scope. It sets the reader, the level of detail and the defaults below.

| | **Release story** | **Build story** (default) | **Technical deep dive** |
|---|---|---|---|
| Reader | Users and prospective users | Developers who know the product | Engineers who want the mechanism |
| Answers | What's new, why it matters, how to use it | What we built, how it works, what shaped it | How it works inside, the trade-offs, the edge cases |
| Detail | Product and outcomes; internals in a sentence | Concepts and decisions; internals only where they explain something the reader sees | Mechanisms, data structures, failure modes |
| Visuals | Screenshots, before/after, one simple flow | Diagrams, motion, before/after | Diagrams, terminal runs, charts |
| Code | A usage example at most | Only where the code is the idea | Where it helps |
| Process detail | None | Only where it explains a design | Where it teaches |
| Operator and admin tooling | Out | Out, unless it explains a design | In, when it teaches |
| References | Docs and product links | A short "Further reading" at most | Key PRs and docs, if public |

**Size it to the subject, not the flavor.** Word counts are ceilings with no minimum (release story up to 1,200, build story up to 2,500, deep dive as long as it needs; chapters and visuals per flavor in [story.md](references/story.md#length)). A small change gets a **note**: a paragraph or three, no chapters, no masthead, at most one visual.

**Say when it isn't worth a write-up.** If the subject is thin (a typo, a one-line fix, a dependency bump, a refactor users never see), check the nearby work first. If the thin change is one piece of a bigger idea, that is a change of subject and worth stopping for: say in a sentence why the change alone isn't a post, name the bigger idea and the angle you'd lead with, and ask whether to write that instead (check it first with `--pr`). If there is no bigger idea, say plainly it's not worth a post and offer a short note or a changelog line.

## Workflow

### 1. Scope

Settle these from the request, the repo and the defaults. Don't ask about scope on its own; if something is truly unclear, fold it into the one message in step 3.

- **Subject.** The idea the post is about. Whatever the author points at (an issue, a few PRs, a search phrase, a commit range, a path) is a breadcrumb, not a boundary. Related work landing around the same time (the dossier's **Nearby work**) often belongs to the same idea, and some of what was pointed at may not. Draw the boundary around the idea.
- **Flavor and size.** Default: build story for a real feature, a note or "not worth a post" for a thin one. If the author asks for a technical or engineering post, that's the deep dive: the internals, operator tooling and trade-offs can be the subject, and the reader-facing tests in [craft.md](references/craft.md) and [brief.md](references/brief.md#zoom-out-first-find-the-angle) bend to that reader.
- **Visibility.** `gh repo view --json visibility -q .visibility` (the gatherer records it too), or the repo's details from a GitHub MCP server when there is no `gh`. Private or unknown means nothing internal is linked.
- **House style.** The product's exact name (pass it, and any shorthand, to `lint.mjs --product "Full Name,Short"`) and terms to use or avoid. Read `house-style.md` in the repo's folder of work dirs first (`workdir.mjs` prints its path, and says where to create it when there isn't one yet); when the author settles a name or term, add it there so the next run doesn't ask. For a private repo, add names that must not appear (customers, partners, internal codenames). Pass the avoid-list to `lint.mjs --avoid`; paraphrase around an avoided term, never inside a quotation.
- **Modules.** Opt-in appendix extras (build log, process numbers, by-day timeline, review notes, how-made, sources), all off by default. Include the ones the author asks for; offer one in a single line only when the evidence makes it unusually good. [modules.md](references/modules.md)
- **Other repos.** If part of the feature shipped elsewhere (a CLI, an SDK), repeat the search there with `--search … --also-repo owner/name`.

### 2. Gather the evidence

Make a work dir outside the repo, so it survives worktrees and never lands in tracked files. `<work-dir>` below means this path, or the author's own place if they name one. `<skill-dir>` means the folder this `SKILL.md` was loaded from (for example `~/.claude/skills/buildnotes`, `~/.agents/skills/buildnotes` or `~/.config/opencode/skills/buildnotes`).

```bash
WORK=$(node <skill-dir>/scripts/workdir.mjs preview-links)   # → $BUILDNOTES_DIR (default ~/.buildnotes)/<repo>/<date>-preview-links
```

Run the gatherer (needs `git` and an authenticated `gh`; `--help` lists every flag):

```bash
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --issue 412
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --pr 120,131,140 --download
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --search "rate limit" --also-repo acme/cli
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --since 2026-09-01 --path src/limits   # git only
node <skill-dir>/scripts/gather.mjs --out <work-dir>/evidence --issue 412 --prior "rate limit"     # earlier PRs matching this phrase
```

It writes `dossier.md` (a skimmable digest) and `dossier.json` (everything). The digest opens with totals, hot files and **Story candidates**, then **Nearby work** (other merged PRs within `--window` days, default 2; ★n = files shared with the selected work), **Prior work**, feedback signals, cross-repo references, a timeline, and each issue and PR. Issues the selected PRs close, or say they are part of ("Part of #12", "Refs #12"), are pulled in automatically; they often hold the problem statement. **Since then** lists PRs merged after the selected work that touch several of its files: read each before the post says how something behaves today. The digest cuts long bodies at a section break; `gather.mjs --out <work-dir>/evidence --show 2911` prints one PR or issue in full. `--download` keeps each image's own format (often WebP); `sips -s format png in.webp --out in.png` makes a copy any viewer opens. Almost none of this detail goes in the post.

**No `gh`?** Check with `gh auth status`. The gatherer needs `gh` for issues, PRs, reviews and search, and stops on `--issue`, `--pr` and `--search` without it (exit 2, one line). Git-only runs still work and read the repo from the `origin` remote. Fall back in this order, and name the source you used in the hand-off:

1. **A GitHub MCP server**, if one is connected. Confirm the repo's visibility there, then run the gatherer git-only (`--range`, `--since`, `--grep`, `--path`) with `--visibility public` or `private`, and read the issues, PRs, review comments and linked issues you need through the MCP tools. Nearby work, prior work and "since then" aren't computed for you: list the merged PRs around the span yourself.
2. **Public GitHub pages**, as a last resort and only for a public repo. Read the issue and PR pages on github.com like any web page. Long threads fold and some review comments hide, so lean on what the page plainly shows. Never sign in to see more.
3. **Neither.** Build from commits alone, and say in the hand-off that the post is thinner for it.

Read `dossier.md`, then the design docs it lists, then code only where a chosen idea lives. Stop when you have the story. [evidence.md](references/evidence.md)

### 3. Frame the story

Decide which story this is before planning beats. Zoom out to the product as users meet it, earlier releases in the area, and how other tools do the same job. Run the lenses, draft two or three **angles**, and recommend one. Then write the **brief** at the top of `plan.md`: headline, starting point, endpoint, prior context, audience, supporting cast and what's out of frame.

Ask as little as possible. Decide what you can infer and mark it *assumed*. Ask only about a guess that would change the shape of the post (usually the audience, or two angles too close to call): one message, rarely more than two questions, zero is fine. Either way, tell the author the frame in two or three lines and keep going; wait only if you asked. [brief.md](references/brief.md)

### 4. Plan the beats

Under the brief in `plan.md`:

1. **Thesis.** One sentence from the brief's starting point to its endpoint.
2. **Beats.** One per chapter, each with the idea, the decision and the alternative if there is one, the evidence, and the **takeaway** (what the reader understands after it). A beat with no takeaway is cut.
3. **Cuts.** What you're leaving out and why. Most of the dossier lands here.
4. **Open questions.** At most three: gaps only the author can fill whose answer would change a claim, ordered by impact, each with the claim you left out because of it. A gap that wouldn't change the post isn't a question; it stays in Cuts. [craft.md](references/craft.md#5-the-hand-off)
5. **Notes for the author.** At most two, and only things they would act on, such as docs that contradict the shipped feature. [evidence.md](references/evidence.md#when-sources-disagree)

Don't stop to ask unless an answer would change the headline or a chapter; both lists go with the draft. Shapes, beats and length: [story.md](references/story.md).

### 5. Make the visuals

For each beat, decide whether a visual earns its place, and make it before writing the text around it. Most visuals are components: write a small spec in `<work-dir>/viz/` and let `scripts/viz.mjs` draw it (flows, steps, bars, before/after numbers, line charts, tables, strips, the parts of one thing, code and terminal blocks, WebGL shaders; each one with its spec in [assets/components.html](assets/components.html)). Code and terminal blocks are evidence, not visuals. Kinds, spec formats, capture recipes and motion rules: [visuals.md](references/visuals.md).

### 6. Write the page

Copy [assets/template.html](assets/template.html) to `<work-dir>/post.html` and replace its example content. Its components are a toolbox: most posts use four or five and delete the rest. Point each `<!-- viz … -->` marker at your own spec and render them all with `node <skill-dir>/scripts/viz.mjs build <work-dir>/post.html`; run it again after editing a spec. Opted-in modules go after the last chapter; generate the data ones with `node <skill-dir>/scripts/module.mjs <build-log|numbers|timeline> <work-dir>/evidence/dossier.json`.

Pick the style before rendering. **Plain** (the default) is the base: a white page, figures on plain ground, nothing drawn by hand; a project with its own brand restyles its tokens. **Field notes** (`data-style="field-notes"` on the article) suits a post that explains a concept or shares a discovery: a serif page, figures on a dot grid, flows drawn by hand. Ask only when the author has a house look; otherwise choose, and say which in the hand-off. Both work in light and dark. [visuals.md](references/visuals.md#styles)

Beyond the figures, the template has a `finding` (what a chapter found, in one sentence; at most one per chapter), margin notes for asides (`<span class="sidenote">`), and keyed figures that name the parts of a screenshot. [story.md](references/story.md#make-it-easy-to-scan), [visuals.md](references/visuals.md#keyed-figures)

### 7. Check

```bash
node <skill-dir>/scripts/lint.mjs <work-dir>/post.html --flavor build --product "Name" --avoid "term one,term two" [--private] [--ste] [--offline]
```

The linter reports words per chapter, banned and writerly phrasing, process detail against the flavor's budget, every sentence with a number, sentence length and passive voice, scan aids, identifiers in the text, masthead stats, terminal blocks, animated-dot faults, rendered components (stale markers, bars off scale, more than one visual in a chapter), the product name in the title or headings (`--product`), leftover template text, a safety scan and a link check (it opens every link; `--offline` skips it). It exits 1 on a hard failure; with `--private`, any link to the repo's issues, PRs or commits is one. Then do the half it can't:

- **Detail pass.** Apply *earn every detail* to each paragraph. A linter flag is a prompt to cut, not a count to hit.
- **Craft pass.** Read the title, the dek and the headings alone, against [craft.md](references/craft.md): about the reader, no self-naming, concrete. Then cut the open questions to the three that would change the post.
- **Fact pass.** Tick each number against the dossier, a file or your own run. Test counts come from running the tests, never from grep. Check every shipped/live claim against the code, the release and the docs; record any gap under Notes for the author. Check what would mislead the reader if it were wrong, not every detail.
- **Safety pass.** Read every safety hit, reread each code and terminal block, and open every image.
- **Render pass.** `node <skill-dir>/scripts/render.mjs <work-dir>/post.html` renders desktop and phone width, light and dark, saves the screenshots and fails on sideways scroll, clipped code and broken images. Then look at the screenshots once. [visuals.md](references/visuals.md#checking-the-render)

### 8. Publish

Embed the images first, so the page is one self-contained file (an Artifact can't load images from other hosts):

```bash
node <skill-dir>/scripts/inline-assets.mjs <work-dir>/post.html > <work-dir>/post.published.html
```

Publish `post.published.html` as a private Artifact (title = the post's name) when the host has an Artifact tool; otherwise leave it in the work dir and give its absolute path. Hand the author the link or path with the open questions and notes: three questions and two notes at most, one line each. The rest stays in `plan.md`. For their own site, add `--standalone` (doctype and viewport meta) or hand over `post.html` plus `assets/`. The chapters convert cleanly to Markdown/MDX on request.

### 9. Motion cut (optional)

A short reel of the post, for people who would rather watch than read: a title, the problem, one scene per idea, and how to try it, in under a minute. Make one when the request opens with `video` or asks for a video, a reel or a quick version ([Output](#output)); otherwise offer it in one line in the hand-off when the post has two or more visuals that move or compare. Write `<work-dir>/motion.json` from `plan.md` and the finished page (every word, number and screenshot comes from the post), then build and export it:

```bash
node <skill-dir>/scripts/motion.mjs <work-dir>/motion.json --check
node <skill-dir>/scripts/motion.mjs <work-dir>/motion.json --mp4 --poster   # → motion.html, export/<story>-motion.mp4, export/<story>-motion.png
```

Play it once and scrub to the end of each scene before handing it over. Publish `motion.html` as its own private Artifact and give the author the MP4. `--gif --scene <n> --size 720` exports one scene as a short clip, for a README or a thread. Scene kinds, the script format and what the checks catch: [motion.md](references/motion.md).

Exports are named after the story: `<story>` is the work dir's name without its date, so files dragged out of `export/` still say where they came from. When the author names the files, or the work dir's name wouldn't tell a reader which story a file is from, set `"output": { "name": "…" }` in `motion.json` (it also takes `theme`, `size` and `fps`) or pass `--name <slug>` to `export.mjs`, `motion.mjs` and `deck.mjs`; `--out` sets one file's whole path.

### 10. Deck (optional)

The same scene script as slides: one scene to a slide, each playing its motion once and then holding, with a 16:9 PDF for meetings and email. Make one when the request opens with `deck` or asks for slides, a deck or a PDF; otherwise mention it in the hand-off line about the cut.

```bash
node <skill-dir>/scripts/deck.mjs <work-dir>/motion.json --pdf   # → deck.html, export/<story>-deck.pdf
```

Click through every slide forward and back before handing it over. Publish `deck.html` as its own private Artifact and give the author the PDF. Keys, the PDF and what it leaves out: [deck.md](references/deck.md).

## Files

- `scripts/gather.mjs`: evidence dossier from git and GitHub
- `scripts/workdir.mjs`: a work dir under `$BUILDNOTES_DIR` (default `~/.buildnotes/<repo>/`)
- `scripts/lint.mjs`: the mechanical half of the Check step
- `scripts/module.mjs`: an opt-in module (build log, numbers, timeline) from the dossier
- `scripts/viz.mjs`: visual components rendered from small specs (`scripts/viz/`, one file per kind)
- `scripts/render.mjs`: the render pass: both widths and themes, screenshots, and the fit faults
- `scripts/export.mjs`: one figure as PNG, GIF, MP4/WebM or standalone SVG, for slides or another blog ([visuals.md](references/visuals.md#exporting-a-figure))
- `scripts/motion.mjs`: the motion cut: checks a scene script, builds the reel page from `assets/motion.html`, and exports it as MP4, WebM, GIF or a still, whole or one scene at a time
- `scripts/deck.mjs`: the deck: the motion script as click-through slides (`deck.html`) and a 16:9 PDF
- `scripts/names.mjs`: export file names, `<story>-<what>.<ext>`
- `scripts/inline-assets.mjs`: embed local images and video (`src`, `poster`, `srcset`) as data URIs and drop authoring comments
- `assets/template.html`: page template and component toolbox
- `assets/motion.html`: the reel page the motion cut and the deck fill in
- `assets/components.html`: every component with its spec; the specs are in `assets/specs/`
- `references/brief.md`: angles, the brief, and how little to ask the author
- `references/evidence.md`: what to read, what to skip, numbers, terminal blocks, sources that disagree
- `references/story.md`: shapes, beats, altitude, references, voice, length
- `references/visuals.md`: diagram, motion, screenshot and chart patterns
- `references/modules.md`: the opt-in module menu and placement rules
- `references/motion.md`: the motion cut: when to make one, choosing scenes, the script, build and export
- `references/deck.md`: the deck: slides from the motion script, keys, the PDF, limits
- `references/craft.md`: what makes a post read as crafted: titles, naming the product, anti-patterns, the hand-off
