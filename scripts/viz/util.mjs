// Shared helpers for the viz renderers.

import { createHash } from "node:crypto";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Short content hash, stamped into a viz marker so lint can tell when a spec changed after its render.
export const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 6);

// A slug for ids: "From push to preview" → "from-push-to-preview".
export const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "fig";

// Rough text widths in SVG units, for fit checks and layout. The template's fonts:
// labels 13px Schibsted Grotesk 600, sub-labels 11px JetBrains Mono, edge labels 10.5px mono.
export const W_LABEL = 7.6, W_SUB = 6.7, W_EDGE = 6.4;
export const width = (s, per) => Math.max(0, ...String(s ?? "").split("\n").map((l) => l.length * per));

// Round to 0.1 so paths are short and vertices compare exactly.
export const r = (n) => Math.round(n * 10) / 10;

const warnings = [];
export const warn = (msg) => warnings.push(msg);
export const takeWarnings = () => warnings.splice(0);

// Numbers: thousands separators, a sensible number of decimals, and a unit. "%" and "×" sit tight
// against the number; any other unit gets a space ("420 ms"). A prefix such as "$" goes in front.
export const decimalsFor = (values) => (values.every((v) => Number.isInteger(v)) ? 0 : values.some((v) => Math.abs(v) < 1 && v !== 0) ? 2 : 1);
export function fmt(v, { unit = "", prefix = "", decimals } = {}) {
  const d = decimals ?? decimalsFor([v]);
  const n = Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const tight = /^(%|×|x)?$/.test(unit);
  return `${prefix}${n}${unit ? (tight ? unit : ` ${unit}`) : ""}`;
}

// A "nice" axis: about `count` ticks on round steps (1, 2, 2.5, 5 × 10ⁿ) covering [lo, hi].
export function niceTicks(lo, hi, count = 4) {
  if (hi === lo) hi = lo + 1;
  const mag = 10 ** Math.floor(Math.log10((hi - lo) / count));
  let best;
  for (const m of [0.5, 1, 2, 2.5, 5, 10, 20]) {
    const step = m * mag;
    const start = Math.floor(lo / step + 1e-9) * step, end = Math.ceil(hi / step - 1e-9) * step;
    const n = Math.round((end - start) / step) + 1;
    // Score: distance from the wanted tick count, plus the share of the axis left empty.
    const score = Math.abs(n - (count + 1)) + 2 * ((end - start) - (hi - lo)) / (end - start);
    if (n >= 3 && (!best || score < best.score)) best = { score, start, end, step };
  }
  const ticks = [];
  for (let t = best.start; t <= best.end + best.step / 1e6; t += best.step) ticks.push(Number(t.toFixed(10)));
  return ticks;
}

// The number a printed value starts with ("1,240 ms" → 1240), for to-scale checks.
export const numberIn = (s) => { const m = String(s).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN; };
