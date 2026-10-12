// line.mjs — a small line chart: one series (two at most), evenly spaced x, an optional marked point.
//
// Spec:
//   { "title": "p95 latency by day",                       (for the hidden data table)
//     "x": ["Mon", "Tue", …],
//     "series": [{ "name": "p95", "values": [420, 410, …], "hot": true }, { "name": "p50", "values": […] }],
//     "y": { "unit": "ms", "min": 0, "max": 500, "decimals": 0 },   (all optional; min defaults to 0)
//     "mark": { "at": "Thu", "label": "cache on" } }               (optional; "at" is an x label or index)
//
// The line is SVG stretched to the plot (preserveAspectRatio="none", non-scaling strokes); the text,
// the end dots and the mark are HTML placed in percent, so they never stretch or shrink with it.
// The last value of each series is labelled at the line's end; two series also get a legend.
// Every point has a native tooltip, and a visually hidden table carries all the values.

import { esc, fmt, decimalsFor, niceTicks, warn, r } from "./util.mjs";

export function render(spec, { id = "line" } = {}) {
  const x = spec.x ?? [];
  const series = spec.series ?? [];
  if (x.length < 2) throw new Error("line: the spec needs at least two x labels");
  if (!series.length) throw new Error("line: the spec needs a series");
  if (series.length > 2) throw new Error("line: at most two series; more wants small multiples or a table");
  for (const s of series) if (s.values?.length !== x.length) throw new Error(`line: series "${s.name}" has ${s.values?.length ?? 0} values for ${x.length} x labels`);
  if (x.length > 40) warn(`line "${id}": ${x.length} points; a small chart reads best with 4–30`);
  // With one series it is the chart's subject; with two, the hot one (or the first) gets the accent.
  const hotIdx = Math.max(0, series.findIndex((s) => s.hot));
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  const y = spec.y ?? {};
  const lo = y.min ?? Math.min(0, ...all), hi = y.max ?? Math.max(...all);
  const ticks = niceTicks(lo, hi, 4);
  const y0 = y.min ?? ticks[0], y1 = y.max ?? ticks.at(-1);
  const decimals = y.decimals ?? decimalsFor(all);
  const show = (v) => fmt(v, { unit: y.unit, prefix: y.prefix, decimals });
  const tickText = (v) => fmt(v, { prefix: y.prefix, decimals: decimalsFor(ticks) });
  const X = (i) => (i / (x.length - 1)) * 100;
  const Y = (v) => (1 - (v - y0) / (y1 - y0)) * 100;

  // x labels: the first and last always, and up to four evenly spaced between (every other one of
  // those drops out in a narrow chart).
  const step = Math.ceil((x.length - 1) / 5);
  const xShown = x.map((_, i) => i).filter((i) => i === 0 || i === x.length - 1 || (i % step === 0 && x.length - 1 - i >= step));

  const markAt = spec.mark ? (typeof spec.mark.at === "number" ? spec.mark.at : x.indexOf(spec.mark.at)) : -1;
  if (spec.mark && markAt < 0) throw new Error(`line: mark "${spec.mark.at}" is not one of the x labels`);

  // End labels sit beside each line's last point; if two would collide, the legend carries them.
  const ends = series.map((s, k) => ({ k, v: s.values.at(-1), top: Y(s.values.at(-1)) }));
  const endsApart = ends.length < 2 || Math.abs(ends[0].top - ends[1].top) > 14;
  const ew = Math.max(...ends.map((e) => show(e.v).length));
  const yw = Math.max(...ticks.map((t) => tickText(t).length));

  const cls = (k) => (series.length === 1 || k === hotIdx ? "s" : "s dim");
  const out = [`<div class="line-box"><div class="line${spec.mark ? " marked" : ""}" style="--yw:${yw}ch;--ew:${endsApart ? ew : 0}ch">`];
  if (series.length > 1) {
    out.push(`  <p class="legend">${series.map((s, k) => `<span class="${cls(k)}"><i></i>${esc(s.name)}</span>`).join("")}</p>`);
  }
  if (spec.mark) out.push(`  <div class="top"><em style="--x:${r(X(markAt))}" class="${X(markAt) > 75 ? "at-end" : X(markAt) < 25 ? "at-start" : ""}">${esc(spec.mark.label ?? "")}</em></div>`);
  out.push(`  <div class="yaxis" aria-hidden="true">${ticks.filter((t) => t >= y0 && t <= y1).map((t) => `<span style="--y:${r(Y(t))}">${esc(tickText(t))}</span>`).join("")}</div>`);
  out.push(`  <div class="plot">`);
  out.push(`    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">`);
  for (const t of ticks) if (t >= y0 && t <= y1) out.push(`      <line class="${t === y0 ? "base" : "grid"}" x1="0" x2="100" y1="${r(Y(t))}" y2="${r(Y(t))}"/>`);
  if (markAt >= 0) out.push(`      <line class="mark" x1="${r(X(markAt))}" x2="${r(X(markAt))}" y1="0" y2="100"/>`);
  // The accented series is drawn last, so it sits on top.
  const order = series.map((_, k) => k).sort((a, b) => (a === hotIdx) - (b === hotIdx));
  for (const k of order) {
    const d = series[k].values.map((v, i) => (Number.isFinite(v) ? `${i && Number.isFinite(series[k].values[i - 1]) ? "L" : "M"}${r(X(i))},${r(Y(v))}` : "")).join(" ");
    out.push(`      <path class="${cls(k)}" d="${d}"/>`);
  }
  out.push(`    </svg>`);
  for (const k of order) out.push(`    <span class="pt ${cls(k)}" style="--x:100;--y:${r(Y(series[k].values.at(-1)))}"></span>`);
  if (markAt >= 0) {
    const s = series[hotIdx];
    out.push(`    <span class="pt ${cls(hotIdx)} ring" style="--x:${r(X(markAt))};--y:${r(Y(s.values[markAt]))}"></span>`);
  }
  // Hover targets: one column per x value, with a native tooltip.
  out.push(`    ${x.map((xl, i) => `<span class="hit" style="--x:${r(X(i))};--n:${x.length}" title="${esc(`${xl}: ${series.map((s) => `${series.length > 1 ? `${s.name} ` : ""}${show(s.values[i])}`).join(", ")}`)}"></span>`).join("")}`);
  out.push(`  </div>`);
  out.push(`  <div class="ends" aria-hidden="true">${endsApart ? ends.map((e) => `<span style="--y:${r(e.top)}">${esc(show(e.v))}</span>`).join("") : ""}</div>`);
  out.push(`  <div class="xaxis" aria-hidden="true">${xShown.map((i, k) => `<span style="--x:${r(X(i))}" class="${i === 0 ? "at-start" : i === x.length - 1 ? "at-end" : k % 2 ? "odd" : ""}">${esc(x[i])}</span>`).join("")}</div>`);
  out.push(`  <table class="vh"><caption>${esc(spec.title ?? "Values")}</caption><thead><tr><th>${esc(spec.xName ?? "")}</th>${series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${x.map((xl, i) => `<tr><th>${esc(xl)}</th>${series.map((s) => `<td>${esc(show(s.values[i]))}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
  out.push(`</div></div>`);
  return out.join("\n");
}
