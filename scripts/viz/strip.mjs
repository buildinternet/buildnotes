// strip.mjs — a progression strip: 2–4 frames in order, "Before" → "As it ships". A before/after
// pair is the two-frame case.
//
// Spec:
//   { "frames": [
//       { "label": "Round one", "src": "img/r1.png", "alt": "…", "width": 1600, "height": 900 },
//       { "label": "As it ships", "src": "img/r3.png", "alt": "…" },
//       { "label": "Before", "term": { "out": ["…"] } },                    (terminal output, no command needed)
//       { "label": "After", "code": { "file": "src/x.ts", "lines": "3-9" } }  (a code excerpt, as in code.mjs)
//   ] }
// Frames sit in a row with arrows on wide screens and stack on phones. The last frame gets the accent
// label unless another frame says "hot": true. Label frames by iteration, never by commit or PR.
// Image paths are relative to the spec.

import { esc, warn, NAMES_COMMIT, assetSrc } from "./util.mjs";
import { render as code } from "./code.mjs";
import { body as termBody } from "./term.mjs";

export function render(spec, { id = "strip", base, page } = {}) {
  const frames = spec.frames ?? [];
  if (frames.length < 2 || frames.length > 4) throw new Error(`strip: ${frames.length} frames; use 2 to 4`);
  const hot = frames.some((f) => f.hot) ? frames.findIndex((f) => f.hot) : frames.length - 1;
  const out = [`<div class="strip-box"><div class="strip" style="--n:${frames.length}">`];
  frames.forEach((f, k) => {
    if (!f.label) throw new Error(`strip: frame ${k + 1} needs a label ("Before", "Round two", "As it ships")`);
    if (NAMES_COMMIT.test(f.label)) warn(`strip "${id}": label "${f.label}" names a commit or PR; label frames by iteration`);
    let inner;
    if (f.src) {
      if (!f.alt) warn(`strip "${id}": frame "${f.label}" has no alt text`);
      const size = f.width && f.height ? ` width="${f.width}" height="${f.height}"` : "";
      inner = `<img src="${esc(assetSrc(f.src, { base, page }, `strip "${id}"`))}" alt="${esc(f.alt ?? "")}"${size}>`;
    } else if (f.code) {
      inner = code(f.code, { id, base });
    } else if (f.term) {
      const { html, wrap } = termBody(f.term, id);
      inner = `<figure class="code term${wrap ? " wrap" : ""}"><pre><code>${html}</code></pre></figure>`;
    } else if (f.html) {
      inner = f.html;
    } else throw new Error(`strip: frame "${f.label}" needs src, code, term or html`);
    out.push(`  <div class="frame"><span class="tag${k === hot ? " after" : ""}">${esc(f.label)}</span>${inner}</div>`);
  });
  out.push(`</div></div>`);
  return out.join("\n");
}
