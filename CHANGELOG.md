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

- The `anatomy` component (`scripts/viz/anatomy.mjs`): the parts of one thing, named. One parts list, measured on a capture, draws as keys over the capture (`screenshot`, with an optional dark capture), a flat drawing with the object's own labels (`flat`), or an angled drawing of its structure that comes apart on request (`iso`). Each renders as a keyed figure; pointing at a part lifts it, and pointing at a key fades the rest. A spec can start from another with `from`. Example specs in `assets/specs/anatomy-card*.json`, measured on the shipped digest card; tests in `dev/test/anatomy.test.mjs`.
- `examples/weekly-digests/post-field-notes.html`, the example in the field notes style, and `examples/weekly-digests/viz/`, the specs behind its rendered figures.

### Changed

- The weekly-digests example uses the current template: the card is a keyed figure over the shipped capture, the patch-pool bars and the replay frames use the `bars` and `strip` components, chapter 2 closes with a finding, and the sentence about the card's colors now says columns, as the card has. The README shows the keyed card and the field notes version.
- `viz.mjs build` passes the page's folder to the renderers, so an image a spec names resolves relative to the page.
- `export.mjs` hides the expand icon and hotspot notes in exports, and the README's images are re-exported with it from the current gallery and example.
- Figures get more room above and below than paragraphs. A caption stays in the reading column under a figure that breaks out wider, set in the heading face a step below the text, with its figure number ("Fig. 2.") as a label; a keyed figure's legend uses the heading face too. The examples and the gallery pick this up, and the README's two keyed images are re-exported.
- `lint.mjs` counts a sentence that names a pull request as process talk only when it's about the record (a number, "the second pull request", or what was done to one), so a post about a product built around pull requests isn't flagged for describing it. The colon-reveal check flags only a short payoff after the colon.
- `gather.mjs` names a repo's changelog folder (one file per entry, such as `apps/web/src/content/changelog/`) under Prior work, and the entries the selected work added there.

### Fixed

- Image paths in `strip` specs are relative to the spec, as they already were in `anatomy` specs; both now share one rule, and a path that only resolves from the page still renders, with a warning.
- `gather.mjs` no longer looks up placeholder references such as `owner/repo#123` in PR bodies.
- `workdir.mjs --help` prints its usage instead of making a folder called `--help`.
- `references/visuals.md`: how to hide sticky headers before a capture, and a crop command that honours its offset (`sips -c` crops around the centre).
- Plain replaces the template's previous look: Archivo, Newsreader and IBM Plex Mono on a white page, and figures (flows, steps, diagrams) on plain ground between two rules instead of a bordered dot grid.
