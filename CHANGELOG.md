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
- A command line in the template, `<div class="cmd"><code>…</code></div>`, for a command the reader will copy: a bar with a copy button, the command name in full ink, flags quieter and quoted strings in the accent. A long command scrolls inside the bar with a fade at the edge. `lint.mjs` points at a one-line `<pre>` that should be one. Docs in `references/visuals.md#components`.
- The motion cut, an optional step 9: the post as a reel of five to nine scenes that plays itself in under a minute, for people who would rather watch than read. The agent writes a scene script (`motion.json`); `scripts/motion.mjs` checks it, sets each scene's length from its motion and its words, builds one self-contained page from `assets/motion.html`, and exports a 1920×1080 MP4, WebM, GIF or still through `export.mjs`. Nine scene kinds: title, statement, list, shot, swap, bars, flow, morph and end. Docs in `references/motion.md`; the weekly-digests example has its cut in `motion.json` and `motion.html`; tests in `dev/test/motion.test.mjs`.
- Motion cut clips: `motion.mjs --scene <n>` exports one scene as a short clip and `--size <px>` sets the export width. The README has a Motion cut section with four clips from the weekly-digests cut (`.github/assets/motion-*.gif`) and the full video, and the example keeps its export as `examples/weekly-digests/motion.mp4` (1280×720, 0.8 MB).

### Changed

- Each beat now passes a reader test: what would a reader see differently if this had gone the other way? In a release or build story, a beat that only shows in the service's logs, costs or dashboards is cut. The build flavor keeps internals only where they explain something the reader sees.
- `SKILL.md` adds *understood beats exact*, and `references/evidence.md` a section on how far to check a claim: check what would mislead, and treat a claim only production data can confirm as a sign the beat is about running the service.
- Field notes sets margin notes in Source Serif 4 italic, in the note colour, instead of a handwritten face. The handwritten face (`--font-hand`, Shantell Sans) is kept for keyed-figure numbers and labels of a few words: no editorial site we checked sets sidenotes in one, and past a few words it reads slowly and re-wraps when the font loads. Margin notes have their own `--font-note` and `--note-style` tokens.
- The weekly-digests example uses the current template: the card is a keyed figure over the shipped capture, the patch-pool bars and the replay frames use the `bars` and `strip` components, chapter 2 closes with a finding, and the sentence about the card's colors now says columns, as the card has. The README shows the keyed card and the field notes version.
- `viz.mjs build` passes the page's folder to the renderers, so an image a spec names resolves relative to the page.
- `export.mjs` hides the expand icon and hotspot notes in exports, and the README's images are re-exported with it from the current gallery and example.
- Figures get more room above and below than paragraphs. A caption stays in the reading column under a figure that breaks out wider, set in the heading face a step below the text, with its figure number ("Fig. 2.") as a label; a keyed figure's legend uses the heading face too. The examples and the gallery pick this up, and the README's two keyed images are re-exported.
- `lint.mjs` counts a sentence that names a pull request as process talk only when it's about the record (a number, "the second pull request", or what was done to one), so a post about a product built around pull requests isn't flagged for describing it. The colon-reveal check flags only a short payoff after the colon.
- `gather.mjs` names a repo's changelog folder (one file per entry, such as `apps/web/src/content/changelog/`) under Prior work, and the entries the selected work added there.
- `gather.mjs` lists **Since then**: PRs merged after the selected work that touch two or more of its files, since they can change what ships today. The digest cuts a long body at a section break and prints the command to read it whole, `gather.mjs --out <dir> --show <number>`.
- Several images in one figure (a strip's frames) page with ← and → in the expanded view, with arrow buttons, a count and each frame's label.
- `render.mjs` fails an SVG label cut off at the drawing's edge, and reminds you to look at the screenshots even when every check passes.
- `references/visuals.md`: a row and a recipe for a path over a plan (computed from the product's own code), hotspot placement in a crowded corner, a screenshot key that needs no part, and how wide a hand drawing should be. `workdir.mjs` says where to start `house-style.md` when there isn't one.

### Fixed

- Margin notes: on a narrow screen a note is set off from the text by a rule, so it doesn't read as body text; on a wide one it sits level with its line without making the paragraph taller (it was floated, and a paragraph in the chapter grid grew to hold it, leaving a gap). `lint.mjs` flags a note placed mid-paragraph or mid-item, which splits the text on a phone; the example's one note moves to the end of its item.
- The `delta` component's before and after values lost their layout when the margin note class was renamed; the template styles `.delta .side` again.
- A keyed figure's legend lost its own spacing to the chapter's list rule (no gap above it, an indent, rows packed tight); the list rule now leaves the legend alone.
- Image paths in `strip` specs are relative to the spec, as they already were in `anatomy` specs; both now share one rule, and a path that only resolves from the page still renders, with a warning.
- `gather.mjs` no longer looks up placeholder references such as `owner/repo#123` in PR bodies.
- `workdir.mjs --help` prints its usage instead of making a folder called `--help`.
- `gather.mjs` no longer pulls a pull request in a second time as an issue when another PR says it is "part of" it (its body printed twice, and `--download` saved its images twice).
- A strip label that wraps to two lines no longer pushes its picture below the others: labels share one row.
- A hand-drawn SVG in `figure.diagram` fits the column instead of being held at 30rem and scrolling on a phone; `figure.diagram.wide` keeps the 30rem minimum.
- `lint.mjs`'s moving-dot warning says why the dot goes under the boxes in a flow, and that a route over a plan can ignore it.
- Headless Chrome gets 45 s to start instead of 20, since a busy CI runner starting several at once can take longer.
- `references/visuals.md`: how to hide sticky headers before a capture, and a crop command that honours its offset (`sips -c` crops around the centre).
- Plain replaces the template's previous look: Archivo, Newsreader and IBM Plex Mono on a white page, and figures (flows, steps, diagrams) on plain ground between two rules instead of a bordered dot grid.
