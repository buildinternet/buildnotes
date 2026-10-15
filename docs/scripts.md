# Scripts

The skill's scripts live in [`scripts/`](../scripts). Each one runs on its own and prints usage with `--help` or no arguments. They use only Node's built-in modules.

| Script | What it does |
|---|---|
| [`gather.mjs`](../scripts/gather.mjs) | Evidence dossier from git and GitHub: by `--issue`, `--pr`, `--search`, `--range`, `--since`, `--path` or `--grep`, with `--prior` and `--also-repo`. Needs `gh` for anything beyond commits ([without it](install.md#without-the-github-cli)); `--visibility` records a visibility confirmed elsewhere. |
| [`workdir.mjs`](../scripts/workdir.mjs) | Makes a work dir under `$BUILDNOTES_DIR` and prints the house-style path when one exists |
| [`viz.mjs`](../scripts/viz.mjs) | Renders every `<!-- viz … -->` marker in a page from its spec (`build <post.html>`) |
| [`lint.mjs`](../scripts/lint.mjs) | Words per chapter, banned and writerly phrasing, process detail against the flavor's budget, numbers, sentence length, passive voice, identifiers, the product name in headings, a safety scan and a link check. Exits 1 on a hard failure. |
| [`render.mjs`](../scripts/render.mjs) | Screenshots at 1280 and 390 px, light and dark. Fails on sideways scroll, clipped code and broken images. |
| [`export.mjs`](../scripts/export.mjs) | One figure as PNG, GIF, MP4/WebM or standalone SVG, for slides or another blog (`--list` numbers them) |
| [`module.mjs`](../scripts/module.mjs) | An opt-in appendix module (`build-log`, `numbers`, `timeline`) from the dossier |
| [`motion.mjs`](../scripts/motion.mjs) | The motion cut: checks a scene script (`motion.json`), builds a reel page that plays itself, and exports it as a 1920×1080 MP4, WebM, GIF or still, or one scene as a clip (`--scene`) |
| [`inline-assets.mjs`](../scripts/inline-assets.mjs) | Embeds local images and video as data URIs, so the page is one file |

```bash
node scripts/gather.mjs --out <work-dir>/evidence --pr 120,131,140 --download
node scripts/lint.mjs <work-dir>/post.html --flavor build --product "Release Notes Index,Releases" --avoid "codename"
node scripts/export.mjs <work-dir>/post.html --figure 4 --gif
node scripts/motion.mjs examples/weekly-digests/motion.json --mp4                       # the whole cut → export/motion.mp4
node scripts/motion.mjs examples/weekly-digests/motion.json --gif --scene 5 --size 720  # one scene → export/motion-scene-5.gif
```

## Where the rules live

[`SKILL.md`](../SKILL.md) holds the workflow and the rules. Every rule names the fault that taught it, for example a tidy code snippet that matched nothing in the repo, or a link built by guessing a slug. The detail lives in [`references/`](../references):

| File | Covers |
|---|---|
| [`brief.md`](../references/brief.md) | Angles, the brief, and how little to ask the author |
| [`evidence.md`](../references/evidence.md) | What to read, what to skip, numbers worth having, sources that disagree |
| [`story.md`](../references/story.md) | Shapes, beats, altitude, references, voice, length |
| [`visuals.md`](../references/visuals.md) | Diagram, motion, screenshot and chart patterns; spec formats; the render check |
| [`motion.md`](../references/motion.md) | The motion cut: when to make one, choosing scenes, the script, build and export |
| [`modules.md`](../references/modules.md) | Opt-in appendix modules: build log, numbers, timeline, review notes, how-made, sources |
| [`craft.md`](../references/craft.md) | Titles, naming the product, anti-patterns, the hand-off |
