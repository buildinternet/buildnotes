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

- `SKILL.md`: the workflow (scope, gather, plan, visuals, write, check, publish) and the rules.
- `references/`: how to shape the story and voice, read the evidence, make visuals, and add opt-in modules.
- `scripts/gather.mjs`: collects issues, PRs, commits and review threads into a dossier.
- `scripts/lint.mjs`: checks length, banned phrasing, process detail, plain English, scannability and safety.
- `scripts/module.mjs`: builds the opt-in appendix modules (build log, numbers, timeline).
- `scripts/inline-assets.mjs`: embeds images so the page is one self-contained file.
- `assets/template.html`: the page template and its components.
