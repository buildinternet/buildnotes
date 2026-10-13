<h1 align="center">build-story</h1>

<p align="center"><b>A Claude Code skill that turns the history of a feature into a post about how it was built and why.</b><br>It reads the issues, PRs, commits, reviews and screenshots, finds the two or three decisions that shaped the feature,<br>and publishes a self-contained page with diagrams, motion, before/after visuals and real code.</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#example">Example</a> ·
  <a href="#flavors">Flavors</a> ·
  <a href="#visual-components">Visual components</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#install">Install</a> ·
  <a href="#scripts">Scripts</a> ·
  <a href="#developing">Developing</a> ·
  <a href="#limits">Limits</a>
</p>

<p align="center">
  <img src=".github/assets/post-masthead.webp" width="720" alt="The top of a build story titled 'Making the weekly digest worth opening'. The dek reads: a collection's weekly digest now opens with a picture of the week, can play that week back, and comes to your inbox on Monday. Below it, a short intro, three bullet points (a card, a replay, a weekly email) and a five-chapter table of contents.">
</p>

<p align="center"><sub><code>examples/weekly-digests</code>: the masthead and opening of a build story written by the skill from a public repo's PRs.</sub></p>

> [!NOTE]
> Prototype. Expect the rules and scripts to change.

---

Point Claude at an issue, a few PRs, a search phrase or a commit range, and ask it to write up how the feature was built. build-story gathers the record into a dossier, zooms out to the product as users meet it, picks an angle, and plans one chapter per idea, not per day. Then it draws the visuals from small specs, writes the page, and checks it: a linter for length, phrasing, process detail and safety, a link check, and a render pass at desktop and phone width in light and dark.

The skill exists to prevent three kinds of post:

- **The play-by-play.** The development process narrated in order, with timestamps, PR numbers and who reviewed what.
- **The changelog in prose.** Every change listed, no argument.
- **The press release.** Confident claims with nothing behind them.

The cure is the same for all three: find the few ideas and decisions that made the feature what it is, explain each at the level the reader needs, and back each one with real evidence from the record.

## Quick start

```bash
git clone https://github.com/buildinternet/buildnotes.git ~/.claude/skills/build-story
```

Then, in Claude Code, inside the repo the feature lives in:

```text
/build-story write up how we built the weekly digests (#412)
```

You need `git`, an authenticated `gh`, Node 18 or later, and Chrome for the render pass and figure export. The scripts use only Node's built-in modules: there is nothing to `npm install`.

## Example

[`examples/weekly-digests/`](examples/weekly-digests) is a full run against the public `buildinternet/releases` repo, kept as a committed example. Open [`post.html`](examples/weekly-digests/post.html) in a browser; it is one self-contained file with every image embedded. The folder also holds the story plan the agent wrote before drafting and its notes for the author.

<table>
  <tr>
    <td width="50%"><img src=".github/assets/digest-card.webp" alt="A card titled 'The week at a glance': a treemap of releases per product (Codex, Claude Code, Devin, Grok Build) split into features, enhancements and fixes, with a numbered list of the five biggest releases below."></td>
    <td width="50%"><img src=".github/assets/digest-flow.gif" alt="An animated flow diagram: Monday run, then 'week just closed?', then one message per subscriber, a delivery queue, and 'claim the week' per reader before the email is sent. A dot travels the route."></td>
  </tr>
  <tr>
    <td><sub><b>A screenshot that is the subject.</b> Chapter 1 shows the shipped card, captioned with the collection and week it shows.</sub></td>
    <td><sub><b>A flow with motion.</b> Chapter 4 explains how each reader gets exactly one email a week. The diagram is drawn by <code>viz.mjs</code> from a short JSON spec.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src=".github/assets/digest-replay.webp" alt="Two dark screenshots side by side, labeled Tuesday and End of the week: the same replay timeline partway through the week and at its end."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>Before and after in one figure.</b> Two frames of the week replay, mid-week and at the end.</sub></td>
  </tr>
</table>

The images on this page were made with the skill's own [`scripts/export.mjs`](scripts/export.mjs), which exports any figure as a PNG, GIF, video or standalone SVG.

## Flavors

Three flavors. The skill picks one from the request and the size of the change, and you can ask for another.

| | **Release story** | **Build story** (default) | **Technical deep dive** |
|---|---|---|---|
| Reader | Users and prospective users | Developers who know the product | Engineers who want the mechanism |
| Answers | What's new, why it matters, how to use it | What we built, how it works, what shaped it | How it works inside, the trade-offs, the edge cases |
| Visuals | Screenshots, before/after, one simple flow | Diagrams, motion, before/after | Diagrams, terminal runs, charts |
| Code | A usage example at most | Only where the code is the idea | Where it helps |
| Length | Up to 1,200 words | Up to 2,500 words | As long as it needs |

Word counts are ceilings, not targets. A small change gets a **note** of a paragraph or three. A typo fix or a dependency bump gets an honest "not worth a post", and if it is one piece of a bigger idea, the skill names that idea and asks whether to write about it instead.

## Visual components

`scripts/viz.mjs` draws every visual from a small spec: JSON for most kinds, Markdown tables for options and matrices, GLSL for shaders. The output is plain HTML, SVG and CSS that inherits the page's theme, works in light and dark, reflows at phone width, and respects reduced motion. Each spec can be edited by hand and re-rendered.

<table>
  <tr>
    <td colspan="2"><img src=".github/assets/flow.gif" alt="A flow diagram: git push to Build over a webhook, then fanning out to a preview link per branch and a build log kept 30 days. Dashes march along the route."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>flow</b>: boxes and routes with branches, labels and marching dashes. On a phone it stacks into a vertical drawing.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src=".github/assets/options-database.webp" alt="A table of three options: one shared database (rejected), database per branch (chosen, highlighted), schema per branch (rejected), each with a one-line reason."></td>
    <td width="50%"><img src=".github/assets/matrix-previews.webp" alt="A comparison matrix of three options against four criteria, with check marks, crosses and short notes. The chosen column is highlighted."></td>
  </tr>
  <tr>
    <td><sub><b>options</b>: the decision and the alternatives that lost, with a reason for each.</sub></td>
    <td><sub><b>matrix</b>: options against criteria. A mark can carry a short note.</sub></td>
  </tr>
  <tr>
    <td><img src=".github/assets/delta-build.webp" alt="A before and after figure: 38 s before, 9 s as it ships, 4x faster, median time from push to preview link over 200 builds."></td>
    <td><img src=".github/assets/line-latency.webp" alt="A line chart of latency over twelve days, dropping from about 420 ms to 166 ms at a point marked 'cache on'."></td>
  </tr>
  <tr>
    <td><sub><b>delta</b>: a before/after number, and what was measured.</sub></td>
    <td><sub><b>line</b>: one or two series with a marked event.</sub></td>
  </tr>
  <tr>
    <td><img src=".github/assets/strip-rounds.webp" alt="Three screenshots in a row labeled round one, round two and as it ships, showing a design getting simpler."></td>
    <td><img src=".github/assets/term-gather.webp" alt="A terminal block running node scripts/gather.mjs with its output: a dossier of 6 issues, 9 PRs and 4 images."></td>
  </tr>
  <tr>
    <td><sub><b>strip</b>: rounds of a design, or a filmstrip of states.</sub></td>
    <td><sub><b>term</b> and <b>code</b>: real output and real code, captioned with the file name.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src=".github/assets/shader-banding.webp" alt="Two gradients rendered by a WebGL shader: twelve levels rounded, showing visible bands, and twelve levels dithered, showing a smooth ramp."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>shader</b>: a WebGL fragment shader, for posts where the pixels are the subject, shown on the reader's own screen.</sub></td>
  </tr>
</table>

Also: **steps** (a numbered pipeline with a moving highlight) and **bars** (a bar chart with one row marked). Open [`assets/components.html`](assets/components.html) in a browser to see every component next to its spec. The example specs are in [`assets/specs/`](assets/specs).

## How it works

<p align="center">
  <img src=".github/assets/steps.gif" width="720" alt="Four steps with a moving highlight: Issues and PRs (git and gh), Dossier (gather.mjs), Story plan (plan.md), Page (post.html).">
</p>

[`SKILL.md`](SKILL.md) holds the workflow and the rules. In short:

1. **Scope.** Settle the subject, flavor, repo visibility, house style and any opt-in modules. What you point at is a breadcrumb, not a boundary: related work landing around the same time often belongs to the same idea.
2. **Gather.** [`gather.mjs`](scripts/gather.mjs) pulls issues, PRs, commits, review threads, linked issues, nearby work and prior work into `dossier.md` and `dossier.json`, in a work dir outside the repo.
3. **Frame.** Zoom out to the product as users meet it, draft two or three angles, recommend one, and write a brief. Ask the author as little as possible: usually nothing, at most two questions.
4. **Plan.** A thesis, one beat per chapter (each with a decision, the alternative and a takeaway), cuts, and at most three open questions.
5. **Visuals.** For each beat, decide whether a visual earns its place, then write its spec and render it.
6. **Write.** Fill in [`assets/template.html`](assets/template.html). Most posts use four or five of its components and delete the rest.
7. **Check.** [`lint.mjs`](scripts/lint.mjs) does the mechanical half; then detail, craft, fact, safety and render passes.
8. **Publish.** [`inline-assets.mjs`](scripts/inline-assets.mjs) embeds the images, and the page goes up as a private Artifact with the open questions alongside.

Every rule in `SKILL.md` names the fault that taught it, for example a tidy code snippet that matched nothing in the repo, or a link built by guessing a slug. The detail lives in [`references/`](references):

| File | Covers |
|---|---|
| [`brief.md`](references/brief.md) | Angles, the brief, and how little to ask the author |
| [`evidence.md`](references/evidence.md) | What to read, what to skip, numbers worth having, sources that disagree |
| [`story.md`](references/story.md) | Shapes, beats, altitude, references, voice, length |
| [`visuals.md`](references/visuals.md) | Diagram, motion, screenshot and chart patterns; spec formats; the render check |
| [`modules.md`](references/modules.md) | Opt-in appendix modules: build log, numbers, timeline, review notes, how-made, sources |
| [`craft.md`](references/craft.md) | Titles, naming the product, anti-patterns, the hand-off |

## Install

build-story is a standard Agent Skill: a folder with a `SKILL.md` at its root. Put the folder (or a link to it) in your skills directory so that `SKILL.md` ends up at `~/.claude/skills/build-story/SKILL.md`.

```bash
git clone https://github.com/buildinternet/buildnotes.git ~/.claude/skills/build-story
```

Update with `git pull` in that folder. If you already keep a checkout elsewhere, link it in instead, so the skill stays in step with that checkout:

```bash
ln -s /path/to/buildnotes ~/.claude/skills/build-story
```

For one project only, use `.claude/skills/build-story` in that repo instead.

### Requirements

| Needs | For |
|---|---|
| Node 18+ | Every script. No npm packages. |
| `git` and an authenticated `gh` | Gathering the evidence |
| Chrome or Chromium | The render pass, figure export and component screenshots. Set `CHROME_PATH` if it isn't found. |
| `ffmpeg` (optional) | GIF and video export |

### Configuration

- `BUILD_STORY_DIR`: where work dirs go (default `~/.build-stories/<repo>/`). They live outside any repo, so runs survive worktrees and never land in tracked files.
- `house-style.md`: put one beside a repo's work dirs to record the product's exact name, shorthand, and terms to use or avoid. The skill reads it first and adds to it when you settle a term.

## Usage

Ask in plain words. The skill triggers on any request to write up how a feature was built, even one that never says "blog".

```text
/build-story how we built preview links, from PRs 120, 131 and 140
/build-story a release story for the rate-limit work (search "rate limit", the CLI half is in acme/cli)
/build-story a technical deep dive on the sync engine since v1.2.0, with the build log module
```

You get back a link to a private Artifact page, plus at most three open questions and two notes, one line each. The plan, notes, dossier and `post.html` stay in the work dir. Ask for `--standalone` HTML for your own site, or for the chapters as Markdown or MDX.

## Scripts

Each script runs on its own and prints usage with `--help` or no arguments.

| Script | What it does |
|---|---|
| [`gather.mjs`](scripts/gather.mjs) | Evidence dossier from git and GitHub: by `--issue`, `--pr`, `--search`, `--range`, `--since`, `--path` or `--grep`, with `--prior` and `--also-repo` |
| [`workdir.mjs`](scripts/workdir.mjs) | Makes a work dir under `$BUILD_STORY_DIR` and prints the house-style path when one exists |
| [`viz.mjs`](scripts/viz.mjs) | Renders every `<!-- viz … -->` marker in a page from its spec (`build <post.html>`) |
| [`lint.mjs`](scripts/lint.mjs) | Words per chapter, banned and writerly phrasing, process detail against the flavor's budget, numbers, sentence length, passive voice, identifiers, the product name in headings, a safety scan and a link check. Exits 1 on a hard failure. |
| [`render.mjs`](scripts/render.mjs) | Screenshots at 1280 and 390 px, light and dark. Fails on sideways scroll, clipped code and broken images. |
| [`export.mjs`](scripts/export.mjs) | One figure as PNG, GIF, MP4/WebM or standalone SVG, for slides or another blog (`--list` numbers them) |
| [`module.mjs`](scripts/module.mjs) | An opt-in appendix module (`build-log`, `numbers`, `timeline`) from the dossier |
| [`inline-assets.mjs`](scripts/inline-assets.mjs) | Embeds local images and video as data URIs, so the page is one file |

```bash
node scripts/lint.mjs <work-dir>/post.html --flavor build --product "Release Notes Index,Releases" --avoid "codename"
node scripts/export.mjs <work-dir>/post.html --figure 4 --gif
```

## Developing

```bash
node --test dev/test/*.test.mjs                    # renderer, lint and export tests
node dev/shots.mjs                                 # every component at 1280 and 390 px, light and dark → runs/components/
node dev/gallery.mjs --publish                     # rebuild assets/components.html after changing a renderer or spec
node scripts/viz.mjs build assets/template.html    # re-render the template's examples
```

Like the render pass and figure export, `dev/shots.mjs` drives headless Chrome through [`scripts/chrome.mjs`](scripts/chrome.mjs), with no packages. It runs the four modes in parallel.

### Run history

`runs/` keeps a local, git-ignored history of test runs: each run's self-contained page, its plan, notes, author message, lint output and dossier, plus a `meta.json` with the skill commit and artifact link. Runs can hold private-repo content, which is why they stay out of git.

```bash
node dev/save-run.mjs <work-dir> --note "what this run tested" --artifact <url>
open runs/index.html
```

To keep a public run as a committed example, check it, then copy its page, plan and notes into `examples/<name>/` by hand.

## Limits

- **Built around GitHub.** Issues, PRs and review threads come through `gh`. Without them, the dossier is commit history only (`--range`, `--since`, `--grep`), and the story is thinner for it.
- **The record has to say it.** The skill infers angles and context, but not motives, quotes or numbers. When the record doesn't say why something was done, the reason stays out of the post and goes on the open questions.
- **Private repos link nothing internal.** The linter fails a `--private` post that links the repo's issues, PRs or commits.
- **No sign-ins for screenshots.** If a screen sits behind a sign-in the skill shouldn't use, it falls back to the PR's own images, a diagram or a terminal run.
- **One example so far.** `examples/` holds a single public run.

## License

MIT. See [LICENSE](LICENSE), which also carries the notice for the capture script adapted from [anatomy](https://github.com/wheresryan22/anatomy).
