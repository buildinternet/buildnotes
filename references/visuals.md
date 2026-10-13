# Visuals: components, diagrams, motion, screenshots and charts

Every visual answers a question a chapter raises. Before making one, write its caption: if the caption only restates the heading, skip the visual.

## Picking the kind

| The chapter needs to show | Use | Component |
|---|---|---|
| A straight-line flow (A → B → C) | Step flow, optionally with a moving highlight | `steps` |
| A flow that branches, loops or fans in | Flow diagram, optionally with motion | `flow` |
| A decision between options | Options table, chosen row marked | `options` |
| Options compared on several points | Comparison table with ✓ ✗ ~ marks | `matrix` |
| What a thing looked like before and after | Before/after pair | `strip` (two frames) |
| How a design converged over several iterations | Progression strip (2–4 frames), "Round one" … "As it ships" | `strip` |
| What the user actually sees | Screenshot of the real UI | `figure.shot` in the template |
| An interaction or a sequence over time | Short loop (GIF/MP4/WebM) or a frame strip | `figure.shot`, or `strip` |
| A state machine, a lifecycle, a set of rules | Small state diagram or a table | `flow` (with a back edge), or `options` |
| Pace, when the pace is the point | Timeline, by day | template partial, from `dossier.json` → `timeline` |
| Sizes or counts | Bars, to scale | `bars` |
| One measured change | The number before and after | `delta` |
| A trend over time | Small line chart | `line` |
| Many things moving at once (retries, keys, requests), or pixels that are the subject (a rendering fix) | WebGL figure | `shader` |

At most one per chapter (lint warns at two). A chapter with nothing worth drawing gets a code or terminal block, or nothing. Those are evidence, not visuals: code is ≤15 shipped lines (SKILL.md rules), terminal blocks follow [evidence.md](evidence.md#terminal-blocks). Both have components too (`code`, `term`).

## Components

Each kind in the table renders from a small spec into static HTML or SVG, with no script. It uses the template's CSS and works in light and dark and at phone width. **`assets/components.html` shows every kind with its spec**; the specs themselves are in `assets/specs/`, and are the best starting point to copy.

1. Write the spec in `<work-dir>/viz/`, one file per figure (JSON, or Markdown for the two tables).
2. Put a marker where the figure goes. Wrap it in a `<figure>` and write the caption yourself, except for `code` and `term`, which render the whole figure with its caption:

   ```html
   <figure class="wide">
   <!-- viz flow viz/preview-flow.json -->
   <!-- /viz -->
     <figcaption>Fig. 1. A push builds once, and both the preview and the log come from that build.</figcaption>
   </figure>
   ```

3. Render every marker in place: `node <skill-dir>/scripts/viz.mjs build <work-dir>/post.html`. Run it again after any spec change; it is safe to repeat. Warnings (labels too long for a phone, too many boxes or rows) go to stderr. To print one fragment instead, run `viz.mjs <kind> <spec>`.

`code` and `term` render as a light card with a copy button: a terminal copies its command, a code block its excerpt. The button needs the template's script and stays hidden without it.

Lint lists the specs behind the page, so the fact pass can tick their numbers there. It also warns when a marker is empty or its spec changed since the last render, and fails while a marker still points at the template's `specs/…` examples. The rendered markup is ordinary HTML: a hand edit is fine, but the next `build` replaces it, so edit the spec when you can.

| Kind | Spec, in short |
|---|---|
| `flow` | `nodes` (`id`, `label`, `sub`, `hot`), `edges` (`[from, to, label]`), optional `motion` (`route`: node ids in order, `style`: `dashes` (default), `dot` or `none`). Optional `rank`/`lane` on a node to override the layout; `\n` breaks a label. |
| `steps` | `steps` (`label`, `sub`, `hot`), optional `live` (a highlight steps through the boxes) and `label` (for screen readers). |
| `bars` | `rows` (`label`, `value`, `hot`, optional `display`), optional `unit`, `prefix`, `decimals`, `max`, `limit` (`value`, `label`). |
| `delta` | `before` and `after` (`label`, `value`, `unit`, or `display`), optional `change` ("4× faster"), `measure` (what was measured), `better` (`lower` or `higher`). |
| `line` | `x` (labels), `series` (one or two: `name`, `values`, `hot`), optional `y` (`unit`, `min`, `max`), `mark` (`at`: an x label, `label`), `title` (for the hidden data table). |
| `options` | A Markdown table. Bold the first cell of the chosen row; a column headed "Verdict" is set small. |
| `matrix` | A Markdown table. Cells start with ✓, ✗ or ~ (or yes, no, partly), then an optional short note. Marks answer yes/no rows; a row whose answer is a value (a count, who, a time) takes plain text, with no mark. A row where every cell has the same mark and a note warns. Bold the header of the option the post is about. |
| `code` | `file`, then `lines` ("12-40") or `start` (text on the first line; the excerpt runs until its brackets close, or to the line containing `end`), optional `cut` (ranges shown as one `…` line each; with `start`, counted from the excerpt's first line), `rev` (default `HEAD`), `repo` (relative to the spec), `lang`. Reads from git, so the excerpt is the committed code. Prefer `start` when `rev` isn't the commit you read the line numbers at: lines move, text doesn't. It warns when a bracket closes something the excerpt never opened. |
| `term` | `cmd` (one command), `out` (lines), optional `keep` ("1-3,8"; each gap becomes `…`), `dim`, `wrap` (set it for help text and other two-column output, which clips otherwise). |
| `shader` | `label` (required), `frag` (a `.glsl` file next to the spec) or `glsl`, `loop` and `rest` (seconds; leave out `loop` for a still), optional `aspect`, `uniforms` (extra values: a number or 2–4 numbers), `labels` (text over the canvas), `fallback`. See below. |
| `strip` | `frames`: 2–4 of `{ label, src, alt, width, height }`, `{ label, code: {…} }` or `{ label, term: { out } }`. The last frame gets the accent label unless another says `hot`. |

## Diagrams

Use `steps` for a straight line and `flow` for everything with branches. Both stack on phones with nothing cut off.

- Draw the real components with the names the post uses. Five to nine boxes is the useful range; the renderer warns past nine.
- Label edges with the thing that travels ("webhook", "build log"), not with verbs alone.
- Mark the one part the chapter is about `hot`; everything else stays neutral.
- `flow` lays the boxes out by itself: a box's column is its longest path from a start, and boxes in a column are ordered to cut crossings. An edge that points back (a retry, a loop) runs around the outside. `flow` draws the diagram twice, left to right for wide screens and top to bottom for phones, and the page shows whichever fits. Keep labels short enough for the phone drawing; the renderer names any that don't fit.

Mermaid (`<pre class="mermaid">`) renders inside Claude artifacts with no library and is fine for a quick sequence diagram there. It doesn't render in a local file or on most external blogs, so outside an artifact (or before the post leaves one) convert it to a component or SVG.

### Hand-drawn SVG

For a figure no spec can express, hand-write inline SVG in a `figure.diagram` (the template keeps its CSS). Set `viewBox`, `role="img"`, a `<title>` and `<desc>`; colour every shape from the tokens (`var(--ink)`, `var(--accent)`, `var(--rule)`); end lines on box edges. The SVG doesn't reflow, so for a phone draw it top to bottom, about 320 units wide, with the outcome at the bottom.

A moving dot in hand-drawn SVG goes wrong in two ways, both caught by `lint.mjs`: the circle must have `cx="0" cy="0"`, because `animateMotion` adds its path to the circle's own position; and the motion path must reuse the exact vertices of the wires it travels, or the dot drifts off the lines (turning a corner inside a box is fine). Draw the dot after the wires and before the boxes, so it disappears into each box instead of sliding across a label.

## Motion

Motion is for things that move in the real system: a request travelling, a queue draining, a state changing, a cache filling. Use it once or twice per post.

- **Marching dashes** (`"style": "dashes"`, the default) for a stream or a steady path: an accent dashed line marches along the route. It is CSS only and calm.
- **Moving dot** (`"style": "dot"`) when one item's trip is the point ("a request travels from the CLI to the handler"). It makes one trip every few seconds with a pause, and it follows the drawn edges by construction.
- **Step highlight** (`steps` with `"live": true`) for a straight line of stages.
- **Reduced motion**: the CSS stops the dashes and the step highlight, and the template's script pauses SVG motion. The resting frame must still explain the idea: the route stays drawn and the `hot` box stays marked.
- Nothing pops: fade or ease every change. No motion that starts on scroll and is invisible until then.

For a longer explainer clip (20 s+, narrated or captioned), a video tool such as Remotion is the next step up. Offer it; don't default to it.

## Screenshots and recordings

- **Crop to the subject.** A PR screenshot often shows the feature in one corner of a wide frame. Crop to the part the caption talks about before using it (`sips -c <h> <w> --cropOffset <y> <x> in.png --out out.png` on macOS, or ImageMagick `magick in.png -crop WxH+X+Y out.png`).
- **From the record**: `gather.mjs --download` saves images embedded in PR and issue bodies to `evidence/assets/` and notes which PR each came from. These are often the best before/after material, because they were taken at the time.
- **No access**: if the screen you'd want sits behind a sign-in you shouldn't use, or the feature has no UI, use the PR's own screenshots, a diagram, or a terminal run of the same behaviour. Don't sign in to anything to get a shot.
- **Fresh captures**: run the app (or open the live site) with whatever browser tool the session has, and capture the element, not the whole window. After each capture, open the image and check it shows what the caption will say; the first capture is often the wrong scroll position. Use a fixed viewport (1280×800 desktop, 390×844 phone), the light theme unless dark is the point, and real-looking data. Crop tight; add a 1px border in the page via `figure.shot`.
- **Before/after at two commits**: check out the parent of the first PR in a scratch worktree, run it, capture; repeat at the last merge. Put both in a `strip`, labelled by iteration ("Before", "Round two", "As it ships"), not by commit; add a date only when the time between them matters.
- **Recordings**: keep loops under 8 s, no cursor flailing, MP4/WebM over GIF when the destination allows it. For a single-file page, a frame strip (4–6 stills side by side) is often clearer than a video and costs less.
- **Redact** anything personal or secret before the image enters the work dir: emails, tokens, account names, internal URLs. Blur or replace with example data; never rely on cropping alone.

### Capture recipe (agent-browser)

```bash
agent-browser set viewport 1280 800
agent-browser open https://example.com/docs/feature
agent-browser eval "document.querySelector('main h1').scrollIntoView()"
agent-browser screenshot "$PWD/assets/feature-docs.png"   # absolute path: the daemon has its own cwd; add --full for the whole page
```

Other tools (Playwright, a browser MCP, a built-in browser pane) work the same way: fixed viewport, scroll the target into view, capture, then look at the file. agent-browser's element screenshots (`screenshot <selector> <path>`) can come out wrong for elements below the first screen; hide what is above the element, or capture the full page and crop.

### Dark mode

A light screenshot glares on a dark page. The template dims `.shot` and `.strip` images slightly in dark mode; add `class="dark-ok"` to opt out. For a hero image, capture both themes and ship a pair:

```html
<picture>
  <source srcset="assets/panel-dark.png" media="(prefers-color-scheme: dark)">
  <img src="assets/panel.png" alt="…">
</picture>
```

## Charts

One idea per chart, drawn to scale, labelled directly. Chart product numbers, not the process: a before/after, a limit against real traffic, a trend from a run you made. If a chart needs more than a sentence to explain, it's the wrong chart.

- **One number** is not a chart: use `delta`, or say it in a sentence.
- **A few sizes or counts**: `bars`. Mark the row the chapter is about `hot`, and the rest turn grey. Add a `limit` when a budget or threshold is the point.
- **A trend**: `line`, one series. Add a second only when the comparison is the point; it gets the grey and a legend. Never two y-axes: two measures of different scale are two charts.
- The colours come from the tokens: the accent for the series that matters and `--dim` for the rest. Both themes are checked for contrast and for colour-blind readers, so don't add hues.

## Checking the render

Run `node <skill-dir>/scripts/render.mjs <work-dir>/post.html`. It renders the page at 1280×800 and 390×844, in light and dark, saves a full-page screenshot of each to `<work-dir>/render/`, and fails on what a reader would hit: the page scrolling sideways, a code or terminal line clipped at desktop width, an image that didn't load. On a phone, code that scrolls inside its card is normal and only noted.

Then look at the four screenshots, because the script checks fit, not taste: the stacked flow and the table cards read on the phone, screenshots read in dark mode, nothing looks cramped. Clipped help text or prose in a terminal takes `"wrap": true` on the `term` spec; a long string in code (a prompt, a message) takes `"wrap": true` on the `code` spec. Don't loop: one look per width, one round of fixes.

## Canvas and WebGL

WebGL is the tool for what boxes and lines can't show. In a build story that usually means one of two things:

- **Many things at once**, where the behaviour only shows in the crowd: retries piling into a spike, cache keys moving when a server joins, requests spreading over a pool, a queue backing up. Draw each thing as a dot and the total underneath.
- **The pixels are the subject**: a rendering bug or fix (banding, aliasing, a blur, colour handling), shown on the reader's own screen where a screenshot would be recompressed or scaled.

Keep it in the same rules as any visual: one per chapter, and it must explain something. A shader that only decorates is out.

**Start with the `shader` component.** Write only a fragment shader; the template's script does the rest. It sizes the canvas for the screen, follows light and dark, pauses off screen, holds the `rest` frame for reduced motion, and shows the fallback text when WebGL is missing or the shader fails (check the browser console for the compile error). The shader gets these uniforms, already declared:

- `vec2 u_resolution` (canvas pixels), `float u_dpr`, `vec2 u_pointer` (0–1 across and up, or -1 when away)
- `float u_time` (seconds) and **`float u_phase`** (0 → 1 once per `loop`). Build motion on `u_phase` (`sin(TAU * u_phase * n)` with whole `n`) and the loop closes exactly.
- `vec3 u_paper, u_ink, u_muted, u_accent, u_accent_wash, u_dim, u_mark` (the page's colour tokens) and `float u_dark`. Colour only from these, so both themes work: background `u_paper`, the subject `u_accent`, the rest `u_dim` or `u_muted`.
- `#define TAU`

`assets/specs/jitter.glsl` (retries with and without jitter, looping), `rehash.glsl` (keys that move when a server joins: hash mod N against a hash ring) and `banding.glsl` (a still before/after) are worked examples. Declare extra uniforms in the shader and set them in the spec's `uniforms`. Shaders can't draw text, so put words in the spec's `labels` (`text`, `x` and `y` from 0 to 1, top left; optional `align` and `tone`), which sit over the canvas. A shader that doesn't use `u_time` or `u_phase` is still: drop `loop` and it draws once (and again on hover if it reads `u_pointer`).

For more than one fragment shader can do (geometry, several passes, 2D canvas drawing), write the canvas by hand. So that it exports and behaves:

- **Drive motion from the animation-frame time** (`requestAnimationFrame((t) => …)` or `performance.now()`), not from a frame counter. Clamping the time between frames is fine.
- **Declare the loop**: `data-loop="<seconds>"` on the figure or the canvas, for anything that repeats.
- **Read colours from the page tokens** (`getComputedStyle(document.documentElement).getPropertyValue("--accent")`), and redraw when `prefers-color-scheme` changes.
- **Reduced motion**: check `matchMedia("(prefers-reduced-motion: reduce)")` and draw one frame that explains the idea.
- **Keep it on the main thread.** A Web Worker, an OffscreenCanvas or a `<video>` runs on real time; export warns, and those parts may step unevenly.
- Size the canvas for the device pixel ratio, and give it a text alternative (`role="img"` and `aria-label`, or a caption that says what it shows).

## Exporting a figure

For slides, a social post or another blog, export one figure as a still, a loop or an SVG. Run `--list` first to number the figures (code and terminal blocks aren't counted):

```bash
node <skill-dir>/scripts/export.mjs <work-dir>/post.html --list
node <skill-dir>/scripts/export.mjs <work-dir>/post.html --figure 2 --png              # the resting frame
node <skill-dir>/scripts/export.mjs <work-dir>/post.html --figure 2 --gif              # one full loop
node <skill-dir>/scripts/export.mjs <work-dir>/post.html --figure 2 --mp4 --theme dark
node <skill-dir>/scripts/export.mjs <work-dir>/post.html --figure 2 --svg --width 390  # the stacked drawing, standalone
```

Files land in `<work-dir>/export/`. `--width 390` gives the phone layout, `--theme dark` the dark one. Frames are stepped rather than recorded: SVG and CSS motion is moved to each frame's time, and the page's scripts run on a virtual clock (animation frames, `performance.now`, `Date`, timers) that only moves when the exporter moves it. So canvas and WebGL figures export as cleanly as SVG ones, and a loop closes without a jump. The loop length comes from the figure's own animations; a canvas can't report one, so declare it (see below) or pass `--seconds`. For a figure that starts on a button, `--click "<css>"` presses it first and `--from <s>` starts the loop once it has settled. GIF and video need `ffmpeg`; every format needs Chrome (`CHROME_PATH` if it isn't found). `--svg` works for flows and hand-drawn SVG; it inlines the styles, so the file renders on its own, in the system font unless the fonts are installed.

## Getting assets into the page

The published page should only show images that ship with it (an artifact page blocks other hosts). Reference local files as `src="assets/name.png"` while drafting (in a `strip` spec, paths are relative to the post, like everything else in it), then run `scripts/inline-assets.mjs` to embed them as data URIs before publishing. Keep the total under a few MB: resize screenshots to 2× their display width and prefer WebP or optimized PNG (`sips -Z 1600 file.png` on macOS, or `magick` elsewhere).

For an external blog, keep the `assets/` folder and the un-inlined `post.html` instead; most blog tools want the files.
