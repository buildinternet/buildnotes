# Scripts

The skill's scripts live in [`scripts/`](../skills/buildnotes/scripts). Each one runs on its own and prints usage with `--help` or no arguments. They use only Node's built-in modules.

| Script | What it does |
|---|---|
| [`gather.mjs`](../skills/buildnotes/scripts/gather.mjs) | Evidence dossier from git and GitHub: by `--issue`, `--pr`, `--search`, `--range`, `--since`, `--path` or `--grep`, with `--prior` and `--also-repo`. Needs `gh` for anything beyond commits ([without it](install.md#without-the-github-cli)); `--visibility` records a visibility confirmed elsewhere. |
| [`workdir.mjs`](../skills/buildnotes/scripts/workdir.mjs) | Makes a work dir under `$BUILDNOTES_DIR` and prints the house-style path when one exists |
| [`viz.mjs`](../skills/buildnotes/scripts/viz.mjs) | Renders every `<!-- viz … -->` marker in a page from its spec (`build <post.html>`) |
| [`lint.mjs`](../skills/buildnotes/scripts/lint.mjs) | Words per chapter, banned and writerly phrasing, process detail against the flavor's budget, numbers, sentence length, passive voice, identifiers, the product name in headings, a safety scan and a link check. Exits 1 on a hard failure. |
| [`render.mjs`](../skills/buildnotes/scripts/render.mjs) | Screenshots at 1280 and 390 px, light and dark. Fails on sideways scroll, clipped code and broken images. |
| [`export.mjs`](../skills/buildnotes/scripts/export.mjs) | One figure as PNG, GIF, MP4/WebM or standalone SVG, for slides or another blog (`--list` numbers them) |
| [`module.mjs`](../skills/buildnotes/scripts/module.mjs) | An opt-in appendix module (`build-log`, `numbers`, `timeline`) from the dossier |
| [`motion.mjs`](../skills/buildnotes/scripts/motion.mjs) | The motion cut: checks a scene script (`motion.json`), builds a reel page that plays itself, and exports it as a 1920×1080 MP4, WebM, GIF or still, or one scene as a clip (`--scene`) |
| [`inline-assets.mjs`](../skills/buildnotes/scripts/inline-assets.mjs) | Embeds local images and video as data URIs, so the page is one file |

```bash
node skills/buildnotes/scripts/gather.mjs --out <work-dir>/evidence --pr 120,131,140 --download
node skills/buildnotes/scripts/lint.mjs <work-dir>/post.html --flavor build --product "Release Notes Index,Releases" --avoid "codename"
node skills/buildnotes/scripts/export.mjs <work-dir>/post.html --figure 4 --gif
node skills/buildnotes/scripts/motion.mjs examples/releases-weekly-digests/motion.json --mp4                       # the whole cut → export/motion.mp4
node skills/buildnotes/scripts/motion.mjs examples/releases-weekly-digests/motion.json --gif --scene 5 --size 720  # one scene → export/motion-scene-5.gif
```

## Where the rules live

[`SKILL.md`](../skills/buildnotes/SKILL.md) holds the workflow and the rules. Every rule names the fault that taught it, for example a tidy code snippet that matched nothing in the repo, or a link built by guessing a slug. The detail lives in [`references/`](../skills/buildnotes/references):

| File | Covers |
|---|---|
| [`brief.md`](../skills/buildnotes/references/brief.md) | Angles, the brief, and how little to ask the author |
| [`evidence.md`](../skills/buildnotes/references/evidence.md) | What to read, what to skip, numbers worth having, sources that disagree |
| [`story.md`](../skills/buildnotes/references/story.md) | Shapes, beats, altitude, references, voice, length |
| [`visuals.md`](../skills/buildnotes/references/visuals.md) | Diagram, motion, screenshot and chart patterns; spec formats; the render check |
| [`motion.md`](../skills/buildnotes/references/motion.md) | The motion cut: when to make one, choosing scenes, the script, build and export |
| [`modules.md`](../skills/buildnotes/references/modules.md) | Opt-in appendix modules: build log, numbers, timeline, review notes, how-made, sources |
| [`craft.md`](../skills/buildnotes/references/craft.md) | Titles, naming the product, anti-patterns, the hand-off |
