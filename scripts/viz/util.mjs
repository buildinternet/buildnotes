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

// Inline Markdown for table cells and labels: `code`, **bold**, *em*, [text](url). Everything else is escaped.
export function inline(s) {
  const parts = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    parts.push(esc(s.slice(last, m.index)));
    if (m[1] !== undefined) parts.push(`<code>${esc(m[1])}</code>`);
    else if (m[2] !== undefined) parts.push(`<strong>${inline(m[2])}</strong>`);
    else if (m[3] !== undefined) parts.push(`<em>${inline(m[3])}</em>`);
    else parts.push(`<a href="${esc(m[5])}">${inline(m[4])}</a>`);
    last = re.lastIndex;
  }
  parts.push(esc(s.slice(last)));
  return parts.join("");
}

// A Markdown pipe table → { head: [cells], rows: [[cells]] }. Text outside the table is ignored.
export function mdTable(text) {
  const split = (line) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  const lines = text.split("\n").filter((l) => l.trim().startsWith("|"));
  const sep = lines.findIndex((l) => /^\s*\|?\s*:?-{2,}/.test(l));
  if (sep < 1) throw new Error("expected a Markdown table: a header row, a |---| row, then rows");
  const head = split(lines[sep - 1]);
  const rows = lines.slice(sep + 1).map(split);
  for (const r of rows) if (r.length !== head.length) throw new Error(`table row "${r[0]}" has ${r.length} cells for ${head.length} columns`);
  return { head, rows };
}

// "**x**" → { text: "x", bold: true }
export const unbold = (s) => { const m = String(s).match(/^\*\*(.+)\*\*$/); return m ? { text: m[1], bold: true } : { text: String(s), bold: false }; };

// "1-3,8" → [1, 2, 3, 8]
export const ranges = (s) => String(s).split(",").flatMap((part) => {
  const [a, b] = part.trim().split("-").map(Number);
  if (!Number.isInteger(a)) throw new Error(`bad line range "${s}"`);
  return Array.from({ length: (b || a) - a + 1 }, (_, k) => a + k);
});

// The copy button in a code or terminal caption. The template's script makes it work (and shows it).
export const copyButton = (label) => `<button type="button" class="copy" aria-label="${label}">`
  + `<svg class="idle" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"/></svg>`
  + `<svg class="done" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg></button>`;
