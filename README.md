# build-story

A Claude Code skill that turns the history of a feature (its issues, PRs, commits, reviews and screenshots) into a public-facing post about how it was built and why. It has three flavors: a short release story, a build story (the default) and a technical deep dive.

Prototype. Expect the rules and scripts to change.

## Install

Link the folder into your user skills so every project can use it:

```bash
ln -s ~/Code/story-skill ~/.claude/skills/build-story
```

Requires `git`, an authenticated `gh`, and Node 18+. The scripts have no dependencies.

## Layout

- `SKILL.md`: the workflow (scope, gather, frame the story, plan, visuals, write, check, publish) and the rules.
- `references/`: how to frame the story, shape it and its voice, read the evidence, make visuals, and add opt-in modules.
- `scripts/gather.mjs`: collects issues, PRs, commits, review threads and prior work in the same area into a dossier.
- `scripts/lint.mjs`: checks length, banned phrasing, process detail, plain English, scannability and safety.
- `scripts/module.mjs`: builds the opt-in appendix modules (build log, numbers, timeline).
- `scripts/workdir.mjs`: makes a work dir under `$BUILD_STORY_DIR` (default `~/.build-stories/<repo>/`), outside any repo so runs survive worktrees.
- `scripts/viz.mjs`: renders the visual components (flows, steps, charts, tables, strips, code and terminal blocks) from small specs.
- `scripts/export.mjs`: exports one figure as a PNG, GIF, video or standalone SVG (`--list` to number them; GIF and video need ffmpeg).
- `scripts/inline-assets.mjs`: embeds images so the page is one self-contained file.
- `assets/template.html`: the page template and its components.
- `assets/components.html`: a preview of every component with its spec (open it in a browser). The example specs are in `assets/specs/`.

## Developing the components

```bash
node --test dev/test/*.test.mjs   # renderer tests
node dev/shots.mjs                # screenshots at 1280 and 390 px, light and dark → runs/components/
node dev/gallery.mjs --publish    # rebuild assets/components.html after changing a renderer or spec
node scripts/viz.mjs build assets/template.html   # re-render the template's examples
```

## Run history

`runs/` keeps a local, git-ignored history of test runs: each run's self-contained page (`post.html`), its plan, notes, author message, lint output and dossier, plus a `meta.json` with the skill commit and artifact link. Runs can hold private-repo content, which is why they stay out of git.

```bash
node dev/save-run.mjs <work-dir> --note "what this run tested" --artifact <url>
open runs/index.html
```

To keep a public run as a committed example, copy its page, plan and notes into `examples/<name>/` by hand after checking it (`examples/weekly-digests/` is the first).
