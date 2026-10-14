# Changelog

All notable changes to this repository are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Until the first release, changes are recorded under [Unreleased].

## [Unreleased]

### Added

- The build-story skill: `SKILL.md` and the references in `references/` (brief, evidence, story, visuals, modules, craft). It turns issues, pull requests, commits, reviews, and screenshots into a post, in three flavors (release story, build story, and technical deep dive), and it says when a change is only a note.
- `scripts/gather.mjs`, which writes `dossier.md` and `dossier.json` from `git` and `gh`: issues, pull requests, commits, review threads, nearby work, and prior work.
- Visual components in `scripts/viz.mjs` (flow, bars, delta, line, options, matrix, code, term, strip, steps, shader), the page template in `assets/template.html`, and the component gallery.
- `scripts/lint.mjs`, `scripts/render.mjs`, `scripts/export.mjs`, `scripts/inline-assets.mjs`, `scripts/module.mjs`, `scripts/workdir.mjs`, and `scripts/chrome.mjs`.
- `examples/weekly-digests`, a committed run against a public repository.
- Install paths for Claude Code, OpenCode, and Codex, and the MIT license, including the notice for the capture script adapted from [anatomy](https://github.com/wheresryan22/anatomy).
- Node.js 22 as the minimum (`package.json` engines, the README, and `SKILL.md`). GitHub Actions checks script syntax, `SKILL.md` frontmatter, and the test suite on Node 22 ([#1](https://github.com/buildinternet/buildnotes/pull/1)).
- This changelog, a pull request template that asks for an Unreleased line, and fixture tests for `scripts/gather.mjs` (`dev/test/gather.test.mjs`, `dev/test/fixtures/gather/`).
- Two page styles in `assets/template.html`: Plain, the default, and field notes (`data-style="field-notes"` on the article), each in light and dark. Colour tokens now have roles, with `--landmark` added for landmarks and target lines, and `--font-label` and `--font-code` for labels and code. `viz.mjs build` reads the style and draws flows by hand in field notes, seeded so every build matches (`--style` for a single figure, `dev/gallery.mjs` and `dev/shots.mjs`). The styles and the colour roles are in `references/visuals.md#styles`.

- Template components: a `finding` (one sentence a chapter found), margin notes (`<span class="sidenote">`, in the right margin on wide screens), and keyed figures (numbered hotspots on a screenshot with a legend; the page's script links the two and shows one note at a time). Screenshots in `.shot`, `.strip` and keyed figures open full size in a shared dialog when drawn smaller than their real size. `lint.mjs` checks keyed figures (hotspots and legend match, positions set, at most about six), findings (one per chapter) and margin-note length. Docs in `references/story.md` and `references/visuals.md`.

### Changed

- Plain replaces the template's previous look: Archivo, Newsreader and IBM Plex Mono on a white page, and figures (flows, steps, diagrams) on plain ground between two rules instead of a bordered dot grid.
