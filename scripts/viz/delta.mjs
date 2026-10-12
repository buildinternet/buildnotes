// delta.mjs — one number before and after, with the change, and a pair of bars to scale when both
// sides share a unit. For the chapter whose point is a single measured change.
//
// Spec:
//   { "before": { "label": "Before", "value": 38, "unit": "s" },
//     "after":  { "label": "After",  "value": 9,  "unit": "s" },
//     "better": "lower" | "higher",          (default "lower")
//     "change": "4× faster",                  (optional; default a signed percent and the ratio)
//     "measure": "median build, 200 runs" }   (optional; what was measured, printed small)
// A side may carry "display" ("9.2 s") instead of being formatted from value and unit.

import { esc, fmt, decimalsFor, share } from "./util.mjs";

export function render(spec, { id = "delta" } = {}) {
  const { before: b, after: a } = spec;
  if (!b || !a) throw new Error("delta: the spec needs before and after");
  for (const s of [b, a]) if (!Number.isFinite(s.value) && !s.display) throw new Error("delta: each side needs a value (or a display string)");
  const decimals = decimalsFor([b.value, a.value].filter(Number.isFinite));
  const show = (s) => s.display ?? fmt(s.value, { unit: s.unit, prefix: s.prefix, decimals });
  const numeric = Number.isFinite(b.value) && Number.isFinite(a.value) && b.value >= 0 && a.value >= 0 && (b.unit ?? "") === (a.unit ?? "");

  let change = spec.change;
  if (change === undefined && numeric && b.value > 0) {
    const pct = Math.round(((a.value - b.value) / b.value) * 100);
    const lower = (spec.better ?? "lower") === "lower";
    const ratio = lower ? b.value / a.value : a.value / b.value;
    const r = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    change = `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%${ratio >= 1.5 && Number.isFinite(ratio) ? ` · ${r}× ${lower ? "less" : "more"}` : ""}`;
  }

  const out = [`<div class="delta">`];
  out.push(`  <div class="side"><span class="tag">${esc(b.label ?? "Before")}</span><span class="num">${esc(show(b))}</span></div>`);
  out.push(`  <span class="to" aria-hidden="true">→</span>`);
  out.push(`  <div class="side after"><span class="tag after">${esc(a.label ?? "After")}</span><span class="num">${esc(show(a))}</span></div>`);
  if (change || spec.measure) out.push(`  <div class="change">${change ? `<b>${esc(change)}</b>` : ""}${change && spec.measure ? " · " : ""}${spec.measure ? esc(spec.measure) : ""}</div>`);
  if (numeric) {
    const max = Math.max(b.value, a.value) || 1;
    out.push(`  <div class="pair" aria-hidden="true"><i style="--v:${share(b.value, max)}"></i><i class="after" style="--v:${share(a.value, max)}"></i></div>`);
  }
  out.push(`</div>`);
  return out.join("\n");
}
