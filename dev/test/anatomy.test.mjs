// Checks for the anatomy renderer: one parts list, three views, each a keyed figure. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../../scripts/viz/anatomy.mjs";
import { takeWarnings } from "../../scripts/viz/util.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const base = join(root, "assets/specs");
const spec = (f) => JSON.parse(readFileSync(join(base, f), "utf8"));
const card = spec("anatomy-card.json");
const hotspots = (html) => [...html.matchAll(/<button type="button" class="hs" data-k="(\d+)" style="--x:([\d.-]+)%;--y:([\d.-]+)%/g)].map((m) => [m[1], Number(m[2]), Number(m[3])]);
const entries = (html) => [...html.matchAll(/<li data-k="(\d+)">/g)].map((m) => m[1]);

for (const view of ["flat", "iso", "screenshot"]) {
  test(`${view}: a keyed figure whose hotspots match its legend and sit on the figure`, () => {
    const html = render({ ...card, view }, { id: "t", base });
    assert.deepEqual(takeWarnings(), []);
    assert.match(html, new RegExp(`class="keyed anatomy anatomy-${view}"`));
    const hs = hotspots(html);
    assert.deepEqual(hs.map((h) => h[0]), entries(html));
    assert.equal(hs.length, card.keys.length);
    for (const [k, x, y] of hs) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `key ${k} at ${x}%, ${y}%`);
  });
}

test("the screenshot view puts each key where the spec says, in percent of the capture", () => {
  const html = render({ ...card, view: "screenshot" }, { id: "t", base });
  const [k, x, y] = hotspots(html)[1];
  assert.equal(k, "2");
  assert.equal(x, Math.round((300 / 1792) * 1000) / 10);
  assert.equal(y, Math.round((560 / 1878) * 1000) / 10);
  assert.match(html, /<img src="img\/digest-card\.webp"/);
});

test("parts and marks carry the key that names them; iso parts lift apart with their keys", () => {
  const html = render(card, { id: "t", base });
  assert.match(html, /<g class="pt" data-k="2">/, "Codex answers to its tile key");
  assert.match(html, /<g class="mk" data-k="1">/, "Codex's flames answer to the flame key");
  assert.match(html, /<g class="pt" data-k="5">/, "the list answers to its key");
  assert.match(html, /class="apart"/);
  assert.equal((html.match(/<g class="lift" style="--lift:-?\d+px;--do:\d+ms;--dc:\d+ms">/g) ?? []).length, card.parts.length);
  for (const [k] of hotspots(html)) assert.match(html, new RegExp(`data-k="${k}" style="[^"]*--ex:-?[\\d.]+cqw`), `key ${k} moves with its part`);
  assert.doesNotMatch(render({ ...card, view: "flat" }, { id: "t", base }), /class="apart"/, "only the iso view comes apart");
});

test("from: a spec can start from another and override fields", () => {
  const flat = render(spec("anatomy-card-flat.json"), { id: "t", base });
  assert.match(flat, /anatomy-flat/);
  assert.match(flat, />Claude Code</, "the flat view keeps the object's own labels");
  assert.doesNotMatch(render(card, { id: "t", base }), />Claude Code</, "the iso view is structure only");
});

test("field notes draws by hand, the same every time", () => {
  const a = render(card, { id: "t", base, style: "field-notes" });
  assert.equal(render(card, { id: "t", base, style: "field-notes" }), a);
  assert.notEqual(render(card, { id: "t", base }), a);
  assert.match(a, /Q[\d.-]+,[\d.-]+/);
});

test("faults: a key for a missing part, no keys, too many keys", () => {
  assert.throws(() => render({ ...card, keys: [{ part: "nope", text: "x" }] }, { base }), /isn't in parts/);
  assert.throws(() => render({ ...card, keys: [] }, { base }), /no keys/);
  render({ ...card, keys: Array.from({ length: 7 }, () => ({ part: "codex", text: "x" })) }, { id: "many", base });
  assert.match(takeWarnings().join("\n"), /7 keys/);
});
