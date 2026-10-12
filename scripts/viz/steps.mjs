// steps.mjs — a straight-line flow in HTML: a row of boxes on wide screens, a column on phones.
// For anything that branches or loops, use flow.
//
// Spec:
//   { "label": "From record to page",                     (for screen readers)
//     "steps": [{ "label": "Dossier", "sub": "gather.mjs", "hot": true }, …],
//     "live": true,                                        (optional; a highlight steps through the boxes)
//     "cycle": 6 }                                         (optional; seconds for one pass, default 6)
// The highlight stops under reduced motion; the .hot box stays marked either way.

import { esc, warn } from "./util.mjs";

export function render(spec, { id = "steps" } = {}) {
  const steps = spec.steps ?? [];
  if (steps.length < 2) throw new Error("steps: the spec needs at least two steps");
  if (steps.length > 6) warn(`steps "${id}": ${steps.length} steps; more than six wraps badly on wide screens (split it, or use flow)`);
  const cycle = spec.cycle && spec.cycle !== 6 ? `;--cycle:${spec.cycle}s` : "";
  const out = [`<ol class="steps${spec.live ? " live" : ""}" style="--n:${steps.length}${cycle}"${spec.label ? ` aria-label="${esc(spec.label)}"` : ""}>`];
  steps.forEach((s, k) => {
    if (!s.label) throw new Error(`steps: step ${k + 1} needs a label`);
    out.push(`  <li style="--i:${k}"${s.hot ? ` class="hot"` : ""}><div class="box"><b>${esc(s.label)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ""}</div></li>`);
  });
  out.push(`</ol>`);
  return out.join("\n");
}
