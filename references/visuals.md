# Visuals: diagrams, motion, screenshots and charts

Every visual answers a question a chapter raises. Before making one, write its caption: if the caption only restates the heading, skip the visual.

## Picking the kind

| The chapter needs to show | Use | Source |
|---|---|---|
| A straight-line flow (A → B → C) | Step flow, optionally with a moving highlight | HTML `ol.steps` in the template; stacks on phones |
| A flow that branches, loops or fans in | Flow diagram, optionally with a moving dot | Inline SVG, `figure.diagram` in the template |
| A decision between options | Options table, chosen row marked | `figure.options` in the template |
| What a thing looked like before and after | Before/after pair | Screenshots from PRs, or captures at two commits |
| How a design converged over several iterations | Progression strip (2–4 frames), captioned "Round one" … "As it ships" | PR screenshots in order, or captures at milestone commits |
| What the user actually sees | Screenshot of the real UI | Browser capture of the running app or the live site |
| An interaction or a sequence over time | Short loop (GIF/MP4/WebM) or a frame strip | Browser recording, or a contact sheet of stills |
| A state machine, a lifecycle, a set of rules | Small state diagram or a table | Inline SVG or HTML |
| How the work unfolded | Timeline | `dossier.json` → `timeline` |
| Size, speed, counts | One simple chart | Numbers from the dossier or your own run |
| What the tool prints | Terminal block | A command you ran for this post, output pasted verbatim (redacted) |
| The core idea in code | Code block | The shipped file, ≤15 lines |

At most one per chapter. A chapter with nothing worth drawing gets a code or terminal block, or nothing.

## Diagrams

For a straight line of steps, use the template's HTML `ol.steps`: it wraps to a column on phones, so nothing is cut off. Use SVG for everything with branches.

Prefer **inline SVG** written by hand: it is small, sharp at any size, themes with CSS tokens, and ports to any blog. The template's `figure.diagram` is the pattern.

- Draw the real components with the names the post uses. Five to nine boxes is the useful range; more means split the diagram or the chapter.
- Colour comes from tokens (`var(--ink)`, `var(--accent)`, `var(--rule)`) via `fill`/`stroke` on classes, so it works in light and dark. Give every shape an explicit fill.
- Lines end on a box edge. Label edges with the thing that travels ("batch POST", "token check"), not with verbs alone.
- Highlight the one part the chapter is about in the accent colour; everything else stays neutral.
- Set `viewBox`, `width="100%"`, a `role="img"` and a `<title>` and `<desc>`. Wrap wide diagrams in a scroll container rather than shrinking text below 11px.
- Design for 390px too. The template's SVG keeps a 30rem minimum and scrolls inside its frame below that, so put the part the chapter is about on the left, where a phone reader sees it first. If the key part would be off-screen, draw the diagram top-to-bottom instead: boxes stacked in one column at about 320 units wide, with the outcome at the bottom, fits a phone with no scrolling. A flow whose conclusion sits on the right is the usual case for this.

Mermaid (`<pre class="mermaid">`) renders inside Claude artifacts with no library and is fine for a quick sequence or state diagram. It doesn't render on most external blogs, so convert to SVG before the post leaves the artifact.

## Motion

Motion is for things that move in the real system: a request travelling, a queue draining, a state changing, a cache filling. Use it once or twice per post.

- **Moving dot along a path**: SVG `<animateMotion>` on a small circle with `<mpath href="#path-id">`. The template's flow diagram has one. Keep durations 2–4 s, `repeatCount="indefinite"`, and a pause built into `keyTimes` so it reads as discrete trips.
  - Two ways this goes wrong, both caught by `lint.mjs`: the circle must have `cx="0" cy="0"`, because `animateMotion` adds its path to the circle's own position; and the motion path must reuse the exact vertices of the wires it travels along, or the dot drifts off the lines. Turning a corner inside a box is fine, since the box hides it. Draw the dot *before* the boxes (right after `<defs>`), so boxes cover it: it should travel the wires and disappear into each step, never slide across a label. Check one paused frame (`svg.pauseAnimations(); svg.setCurrentTime(1)`) before publishing.
- **Marching dashes** for a stream: `stroke-dasharray` plus a CSS `@keyframes` on `stroke-dashoffset`.
- **Step-through**: a small row of buttons that sets a `data-step` attribute on the figure, with CSS showing each step's highlight. Better than autoplay for anything with more than three stages.
- **Reduced motion**: the template's script calls `svg.pauseAnimations()` and the CSS stops keyframes under `prefers-reduced-motion: reduce`. The resting frame must still explain the idea, so place the dot at a meaningful start position.
- Nothing pops: fade or ease every change. No motion that starts on scroll and is invisible until then.

For a longer explainer clip (20 s+, narrated or captioned), a video tool such as Remotion is the next step up. Offer it; don't default to it.

## Screenshots and recordings

- **Crop to the subject.** A PR screenshot often shows the feature in one corner of a wide frame. Crop to the part the caption talks about before using it (`sips -c <h> <w> --cropOffset <y> <x> in.png --out out.png` on macOS, or ImageMagick `magick in.png -crop WxH+X+Y out.png`).
- **From the record**: `gather.mjs --download` saves images embedded in PR and issue bodies to `evidence/assets/` and notes which PR each came from. These are often the best before/after material, because they were taken at the time.
- **No access**: if the screen you'd want sits behind a sign-in you shouldn't use, or the feature has no UI, use the PR's own screenshots, a diagram, or a terminal run of the same behaviour. Don't sign in to anything to get a shot.
- **Fresh captures**: run the app (or open the live site) with whatever browser tool the session has, and capture the element, not the whole window. After each capture, open the image and check it shows what the caption will say; the first capture is often the wrong scroll position. Use a fixed viewport (1280×800 desktop, 390×844 phone), the light theme unless dark is the point, and real-looking data. Crop tight; add a 1px border in the page via `figure.shot`.
- **Before/after at two commits**: check out the parent of the first PR in a scratch worktree, run it, capture; repeat at the last merge. Label each by iteration ("Before", "Round two", "As it ships"), not by commit; add a date only when the time between them matters.
- **Recordings**: keep loops under 8 s, no cursor flailing, MP4/WebM over GIF when the destination allows it. For an artifact page, a frame strip (4–6 stills side by side) is often clearer than a video and costs less.
- **Redact** anything personal or secret before the image enters the work dir: emails, tokens, account names, internal URLs. Blur or replace with example data; never rely on cropping alone.

### Capture recipe (agent-browser)

```bash
agent-browser set viewport 1280 800
agent-browser open https://example.com/docs/feature
agent-browser eval "document.querySelector('main h1').scrollIntoView()"
agent-browser screenshot "$PWD/assets/feature-docs.png"   # absolute path: the daemon has its own cwd; add --full for the whole page
```

Other tools (Playwright, a browser MCP, a built-in browser pane) work the same way: fixed viewport, scroll the target into view, capture, then look at the file.

### Dark mode

A light screenshot glares on a dark page. The template dims `.shot` and `.compare` images slightly in dark mode; add `class="dark-ok"` to opt out. For a hero image, capture both themes and ship a pair:

```html
<picture>
  <source srcset="assets/panel-dark.png" media="(prefers-color-scheme: dark)">
  <img src="assets/panel.png" alt="…">
</picture>
```

## Charts

One number per chart, drawn to scale, labelled directly (no legend if you can avoid it). Draw small charts as inline SVG from the dossier numbers. Good candidates: lines changed per PR along the timeline, a before/after bar, a distribution from a run you made. If a chart needs more than a sentence to explain, it's the wrong chart.

## Checking the render

Open the page (or `post.published.html`) once at 1280×800 and once at 390×844, in light and dark. Check: nothing scrolls the page sideways (`document.documentElement.scrollWidth === innerWidth`), diagram key parts are visible on the phone, terminals don't clip long lines (add `.wrap`), screenshots read in dark mode. With agent-browser: `set viewport`, `open file://…`, `eval` the scrollWidth check, `scroll down <px>`, `screenshot`. Don't loop: one look per width, one round of fixes.

## Getting assets into the page

An artifact page can only show images that ship with it: other hosts are blocked. Reference local files as `src="assets/name.png"` while drafting, then run `scripts/inline-assets.mjs` to embed them as data URIs before publishing. Keep the total under a few MB: resize screenshots to 2× their display width and prefer WebP or optimized PNG (`sips -Z 1600 file.png` on macOS, or `magick` elsewhere).

For an external blog, keep the `assets/` folder and the un-inlined `post.html` instead; most blog tools want the files.
