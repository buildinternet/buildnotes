// bars.mjs — horizontal bars drawn to scale, labelled directly.
//
// Spec:
//   { "rows": [{ "label": "Before", "value": 420 }, { "label": "After", "value": 90, "hot": true }],
//     "unit": "ms", "prefix": "", "decimals": 0,       (optional formatting)
//     "max": 500,                                       (optional; default the largest value or limit)
//     "limit": { "value": 300, "label": "budget" } }    (optional; a dashed rule across the bars)
// A row may carry "display" to print its value its own way ("2.1 s"). With a hot row, the other bars
// turn grey, so the one the chapter is about stands out.

import { esc, fmt, decimalsFor, warn } from "./util.mjs";

export function render(spec, { id = "bars" } = {}) {
  const rows = spec.rows ?? [];
  if (!rows.length) throw new Error("bars: the spec needs rows");
  for (const row of rows) if (!(Number.isFinite(row.value) && row.value >= 0)) throw new Error(`bars: "${row.label}" needs a value of zero or more`);
  if (rows.length === 1) warn(`bars "${id}": one bar is a number, not a chart; use delta, or say it in a sentence`);
  if (rows.length > 12) warn(`bars "${id}": ${rows.length} rows; a chart that long wants a table or fewer rows`);
  const limit = spec.limit && Number.isFinite(spec.limit.value) ? spec.limit : null;
  const max = spec.max ?? Math.max(...rows.map((x) => x.value), limit?.value ?? 0);
  if (!(max > 0)) throw new Error("bars: every value is zero");
  const decimals = spec.decimals ?? decimalsFor(rows.map((x) => x.value));
  const show = (v) => fmt(v, { unit: spec.unit, prefix: spec.prefix, decimals });
  const printed = rows.map((x) => x.display ?? show(x.value));
  const lw = Math.min(16, Math.max(...rows.map((x) => String(x.label).length)));
  const vw = Math.max(...printed.map((p) => p.length));
  const scale = (v) => Math.round((v / max) * 1000) / 1000;
  const hot = rows.some((x) => x.hot);
  const l = limit ? scale(limit.value) : null;
  const rule = limit ? `<s class="limit" style="--l:${l}"></s>` : "";

  const out = [`<div class="bars${hot ? " emph" : ""}" role="list" style="--lw:${lw}ch;--vw:${vw}ch">`];
  rows.forEach((x, k) => {
    out.push(`  <div class="row${x.hot ? " hot" : ""}" role="listitem" style="--v:${scale(x.value)}"><span>${esc(x.label)}</span><span class="track"><i></i>${rule}</span><b>${esc(printed[k])}</b></div>`);
  });
  if (limit) {
    const text = `${limit.label ? `${limit.label} ` : ""}${limit.display ?? show(limit.value)}`;
    out.push(`  <div class="row note" aria-hidden="true"><span></span><span class="track"><em class="${l > 0.7 ? "at-end" : l < 0.3 ? "at-start" : ""}" style="--l:${l}">${esc(text)}</em></span><b></b></div>`);
  }
  out.push(`</div>`);
  return out.join("\n");
}
