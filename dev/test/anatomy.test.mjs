// Checks for the anatomy renderer: one parts list, three views, margin notes or numbered keys. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../../skills/buildnotes/scripts/viz/anatomy.mjs";
import { takeWarnings } from "../../skills/buildnotes/scripts/viz/util.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const skill = join(root, "skills/buildnotes");
const base = join(skill, "assets/specs");
const spec = (f) => JSON.parse(readFileSync(join(base, f), "utf8"));
const card = spec("anatomy-card.json");
const hotspots = (html) => [...html.matchAll(/<button type="button" class="hs" data-k="(\d+)" style="--x:([\d.-]+)%;--y:([\d.-]+)%/g)].map((m) => [m[1], Number(m[2]), Number(m[3])]);
const entries = (html) => [...html.matchAll(/<li data-k="(\d+)">/g)].map((m) => m[1]);

const notes = (html) => [...html.matchAll(/<g class="nk" data-k="(\d+)">/g)].map((m) => m[1]);
const numbers = (html) => [...html.matchAll(/<g class="nn" data-k="(\d+)">/g)].map((m) => m[1]);
const viewBox = (html, cls) => html.match(new RegExp(`<svg class="${cls}" viewBox="([^"]+)"`))[1].split(" ").map(Number);

for (const view of ["flat", "screenshot"]) {
  test(`${view}: margin notes by default, one per key, with numbers and a legend for narrow screens`, () => {
    const html = render({ ...card, view }, { id: "t", base });
    assert.deepEqual(takeWarnings(), []);
    assert.match(html, new RegExp(`class="keyed anatomy anatomy-${view} anatomy-margin"`));
    const ks = card.keys.map((_, i) => String(i + 1));
    assert.deepEqual(notes(html).sort(), ks);
    assert.deepEqual(numbers(html), ks);
    assert.deepEqual(entries(html), ks);
    assert.doesNotMatch(html, /class="hs"/, "no hotspot buttons in the margin view");
    // the wide drawing grows sideways for the notes; the narrow one is the figure alone
    const [wx, , ww] = viewBox(html, "wide"), [nx, , nw] = viewBox(html, "narrow");
    assert.ok(wx < nx && wx + ww > nx + nw, "notes on both sides widen the drawing both ways");
  });

  test(`${view}: notes: "keys" keeps the numbered hotspots`, () => {
    const html = render({ ...card, view, notes: "keys" }, { id: "t", base });
    assert.deepEqual(takeWarnings(), []);
    assert.deepEqual(hotspots(html).map((h) => h[0]), entries(html));
    for (const [k, x, y] of hotspots(html)) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `key ${k} at ${x}%, ${y}%`);
  });
}

test("iso: a keyed figure whose hotspots match its legend and sit on the figure", () => {
  const html = render({ ...card, view: "iso" }, { id: "t", base });
  assert.deepEqual(takeWarnings(), []);
  assert.match(html, /class="keyed anatomy anatomy-iso"/);
  const hs = hotspots(html);
  assert.deepEqual(hs.map((h) => h[0]), entries(html));
  assert.equal(hs.length, card.keys.length);
  for (const [k, x, y] of hs) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `key ${k} at ${x}%, ${y}%`);
});

test("margin notes: a span key brackets its part, a point key gets a dot where the spec says", () => {
  const html = render({ ...card, view: "screenshot" }, { id: "t", base });
  const note = (k) => html.match(new RegExp(`<g class="nk" data-k="${k}">([\\s\\S]*?)</g>`))[1];
  const codex = card.parts.find((p) => p.id === "codex").box;
  assert.match(note(2), new RegExp(`V${codex[1] + codex[3]} H`), "the tile key brackets the Codex tile's height");
  assert.doesNotMatch(note(2), /<circle/);
  assert.match(note(1), /<circle class="nd" cx="640" cy="217"/, "the flame key's dot sits at its at");
  assert.match(note(1), /<tspan class="lead">Flames\.<\/tspan>/, "the bold lead-in stays bold");
  assert.match(html, /<image class="img" href="img\/digest-card\.webp"/);
});

test("margin notes on one side only leave the other margin off", () => {
  const keys = card.keys.map((k) => ({ ...k, side: "right" }));
  const html = render({ ...card, view: "flat", keys }, { id: "t", base });
  assert.equal(viewBox(html, "wide")[0], viewBox(html, "narrow")[0]);
  assert.throws(() => render({ ...card, view: "flat", keys: [{ ...keys[0], side: "top" }] }, { id: "t", base }), /side "top"/);
  assert.throws(() => render({ ...card, view: "flat", keys: [{ at: [10, 10], span: true, text: "x" }] }, { id: "t", base }), /"span" but no part/);
});

test("a screenshot key about the whole frame needs only an at, no part", () => {
  const html = render({ ...card, view: "screenshot", notes: "keys", keys: [...card.keys.slice(0, 2), { at: [896, 1700], text: "**The whole card.** No part to outline." }] }, { id: "t", base });
  assert.deepEqual(takeWarnings(), []);
  assert.deepEqual(hotspots(html).at(-1), ["3", 50, Math.round((1700 / 1878) * 1000) / 10]);
  assert.throws(() => render({ ...card, view: "screenshot", keys: [{ text: "Nowhere." }] }, { id: "t", base }), /key 1 needs "at" or a part with a box/);
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
