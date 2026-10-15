// Checks for the chart renderers (bars, delta, line). Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { render as bars } from "../../skills/buildnotes/scripts/viz/bars.mjs";
import { render as delta } from "../../skills/buildnotes/scripts/viz/delta.mjs";
import { render as line } from "../../skills/buildnotes/scripts/viz/line.mjs";
import { fmt, niceTicks, numberIn, takeWarnings } from "../../skills/buildnotes/scripts/viz/util.mjs";

test("fmt: separators, decimals and units", () => {
  assert.equal(fmt(1240, { unit: "ms" }), "1,240 ms");
  assert.equal(fmt(42, { unit: "%" }), "42%");
  assert.equal(fmt(3.5, { unit: "×" }), "3.5×");
  assert.equal(fmt(9, { unit: "xp" }), "9 xp");
  assert.equal(fmt(0.25), "0.25");
  assert.equal(fmt(12, { prefix: "$" }), "$12");
});

test("niceTicks covers the data on round steps", () => {
  for (const [lo, hi] of [[0, 437], [0, 1], [0, 38], [0, 2600], [180, 240], [3, 3]]) {
    const t = niceTicks(lo, hi);
    assert.ok(t[0] <= lo && t.at(-1) >= hi, `${lo}–${hi}: ${t}`);
    assert.ok(t.length >= 3 && t.length <= 7, `${lo}–${hi}: ${t.length} ticks`);
  }
});

test("bars are drawn to scale", () => {
  const html = bars({ rows: [{ label: "a", value: 1840 }, { label: "b", value: 620 }, { label: "c", value: 95, hot: true }], unit: "ms" });
  const rows = [...html.matchAll(/--v:([\d.]+)"[^>]*>.*?<b>([^<]+)<\/b>/g)].map((m) => [Number(m[1]), numberIn(m[2])]);
  assert.equal(rows.length, 3);
  const max = Math.max(...rows.map((x) => x[1]));
  for (const [v, n] of rows) assert.ok(Math.abs(v - n / max) < 0.002, `--v ${v} for ${n}`);
  assert.match(html, /class="bars emph"/);
});

test("bars: a limit stretches the scale and draws a rule", () => {
  const html = bars({ rows: [{ label: "a", value: 50 }], limit: { value: 200, label: "budget" } });
  takeWarnings();
  assert.match(html, /--v:0\.25/);
  assert.match(html, /class="limit" style="--l:1"/);
  assert.match(html, /budget 200/);
});

test("bars reject bad values", () => {
  assert.throws(() => bars({ rows: [] }), /rows/);
  assert.throws(() => bars({ rows: [{ label: "a", value: -1 }] }), /zero or more/);
});

test("delta: change text and bars to scale", () => {
  const html = delta({ before: { value: 38, unit: "s" }, after: { value: 9, unit: "s" } });
  assert.match(html, /−76% · 4\.2× less/);
  assert.match(html, /<i style="--v:1"><\/i><i class="after" style="--v:0\.237">/);
  const mixed = delta({ before: { value: 3, unit: "min" }, after: { value: 40, unit: "s" }, change: "4× faster" });
  assert.doesNotMatch(mixed, /class="pair"/, "no bars when the units differ");
});

test("line: points, ends, mark and the hidden table", () => {
  const html = line({ x: ["a", "b", "c", "d"], series: [{ name: "p95", values: [400, 420, 180, 170] }], y: { unit: "ms" }, mark: { at: "c", label: "cache on" } });
  assert.equal((html.match(/<tbody>.*<\/tbody>/)[0].match(/<tr>/g) ?? []).length, 4, "one table row per x");
  assert.match(html, /cache on/);
  assert.match(html, /170 ms/);
  const d = html.match(/<path class="s" d="([^"]+)"/)[1];
  assert.equal(d.split(" ").length, 4);
  assert.match(d, /^M0,/);
  assert.match(d, /L100,/);
});

test("line rejects mismatched series", () => {
  assert.throws(() => line({ x: ["a", "b"], series: [{ name: "s", values: [1] }] }), /1 values for 2/);
  assert.throws(() => line({ x: ["a", "b"], series: [1, 2, 3].map((k) => ({ name: `${k}`, values: [1, 2] })) }), /at most two/);
  assert.throws(() => line({ x: ["a", "b"], series: [{ name: "s", values: [1, 2] }], mark: { at: "z" } }), /not one of the x labels/);
});
