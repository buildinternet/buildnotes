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
