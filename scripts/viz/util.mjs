// Shared helpers for the viz renderers.

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Short content hash, stamped into a viz marker so lint can tell when a spec changed after its render.
export const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 6);

// A slug for ids: "From push to preview" → "from-push-to-preview".
export const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "fig";

// Rough text widths in SVG units, for fit checks and layout. The template's fonts:
// labels 13px Archivo 600 (Source Serif 4 in field notes), sub-labels 11px IBM Plex Mono
// (Martian Mono at 87.5% width), edge labels 10.5px mono. The widths cover both.
export const W_LABEL = 7.6, W_SUB = 6.7, W_EDGE = 6.4;
export const width = (s, per) => Math.max(0, ...String(s ?? "").split("\n").map((l) => l.length * per));

// Round to 0.1 so paths are short and vertices compare exactly.
export const r = (n) => Math.round(n * 10) / 10;

// value ÷ max, to 3 places: the --v of a bar.
export const share = (v, max) => Math.round((v / max) * 1000) / 1000;

// A strip label that names a commit or PR instead of an iteration.
export const NAMES_COMMIT = /#\d+|\b[0-9a-f]{7,40}\b|\bPR\b|\bcommit\b/i;

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

// The page styles a renderer can draw for. "field-notes" draws strokes by hand; "plain" is the default.
export const STYLES = ["plain", "field-notes"];

// A small seeded random source, so a drawn stroke comes out the same on every build.
export function rand(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One drawn segment as a quadratic from a to b: the midpoint bows sideways by up to `bow`, never more
// than 0.8% of the length, so a stroke looks drawn without moving off its line.
function bend([x0, y0], [x1, y1], next, bow) {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  const off = Math.min(bow, len * 0.008) * (next() < 0.5 ? -1 : 1) * (0.5 + next() / 2);
  const t = 0.4 + next() * 0.2;
  const mx = x0 + (x1 - x0) * t - ((y1 - y0) / len) * off;
  const my = y0 + (y1 - y0) * t + ((x1 - x0) / len) * off;
  return `Q${r(mx)},${r(my)} ${r(x1)},${r(y1)}`;
}

// A polyline drawn by hand: each leg bows a little. Ends stay exactly on their points, so arrows
// and joints still meet.
export function handLine(pts, next, bow = 1.2) {
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let k = 1; k < pts.length; k++) d += ` ${bend(pts[k - 1], pts[k], next, bow)}`;
  return d;
}

// A rectangle drawn by hand, closed so it can be filled: bowed sides and slightly uneven corners.
export function handRect(x, y, w, h, next, rad = 6) {
  const j = () => (next() - 0.5) * 1.2;
  const c = [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()]];
  const toward = (a, b, d) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [a[0] + ((b[0] - a[0]) / len) * d, a[1] + ((b[1] - a[1]) / len) * d]; };
  let d = "";
  for (let k = 0; k < 4; k++) {
    const p = c[k], q = c[(k + 1) % 4], o = c[(k + 3) % 4];
    const rr = rad * (0.75 + next() * 0.5);
    const start = toward(p, q, rr), end = toward(q, p, rad);
    d += k ? ` Q${r(p[0])},${r(p[1])} ${r(start[0])},${r(start[1])}` : `M${r(toward(p, o, rr)[0])},${r(toward(p, o, rr)[1])} Q${r(p[0])},${r(p[1])} ${r(start[0])},${r(start[1])}`;
    d += ` ${bend(start, end, next, 1)}`;
  }
  return `${d} Z`;
}

// An image path in a spec is relative to the spec, like every other path in it. On a page it must be
// relative to the page, so rewrite it when the page's folder is known (viz.mjs build passes it). A path
// that only resolves from the page still works, with a warning, so older specs keep rendering.
export function assetSrc(p, { base, page } = {}, who = "spec") {
  if (!p || !base || !page || /^(https?:|data:|\/)/.test(p)) return p;
  const fromSpec = resolve(base, p);
  if (!existsSync(fromSpec)) {
    if (existsSync(resolve(page, p))) { warn(`${who}: "${p}" resolves from the page, not the spec; image paths are relative to the spec ("${relative(base, resolve(page, p))}")`); return p; }
    warn(`${who}: image "${p}" not found (paths are relative to the spec)`);
  }
  return relative(page, fromSpec);
}
