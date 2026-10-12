// Geometry checks for the flow renderer. Run: node --test dev/test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, graph } from "../../scripts/viz/flow.mjs";
import { build } from "../../scripts/viz.mjs";
import { takeWarnings } from "../../scripts/viz/util.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const specs = readdirSync(join(root, "assets/specs")).filter((f) => f.startsWith("flow-"))
  .map((f) => [f, JSON.parse(readFileSync(join(root, "assets/specs", f), "utf8"))]);

const svgs = (html) => html.match(/<svg\b[\s\S]*?<\/svg>/g);
const pts = (d) => (d.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) ?? []);
const rects = (svg) => [...svg.matchAll(/<rect\b([^>]*)>/g)].map((m) => ["x", "y", "width", "height"].map((k) => Number(m[1].match(new RegExp(`\\b${k}="([^"]+)"`))[1])));

for (const [f, spec] of specs) {
  test(`${f}: two drawings, motion on the wires`, () => {
    const html = render(spec, { id: "t" });
    takeWarnings();
    const [h, v] = svgs(html);
    assert.match(h, /class="h"/);
    assert.match(v, /class="v"/);
    for (const svg of [h, v]) {
      const wires = new Set([...svg.matchAll(/<path class="wire[^"]*" d="([^"]+)"/g)].flatMap((m) => pts(m[1])));
      const boxes = rects(svg);
      const inBox = (p) => { const [x, y] = p.split(",").map(Number); return boxes.some(([rx, ry, w, h]) => x >= rx && x <= rx + w && y >= ry && y <= ry + h); };
      const motion = svg.match(/<animateMotion[^>]*path="([^"]+)"/)?.[1] ?? svg.match(/<path class="route" d="([^"]+)"/)?.[1];
      if (spec.motion) {
        assert.ok(motion, "motion path present");
        for (const p of pts(motion)) assert.ok(wires.has(p) || inBox(p), `route point ${p} is on a wire or inside a box`);
      }
      const dot = svg.match(/<circle\b[^>]*>/)?.[0];
      if (dot) {
        assert.match(dot, /cx="0" cy="0"/);
        assert.ok(svg.indexOf("<circle") < svg.indexOf("<rect"), "dot is drawn before the boxes");
      }
      // Boxes never overlap.
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const apart = a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1];
        assert.ok(apart, `boxes ${i} and ${j} overlap`);
      }
    }
    const vw = Number(v.match(/viewBox="0 0 ([\d.]+)/)[1]);
    assert.ok(vw <= 340, `stacked drawing fits a phone (${vw} units)`);
  });
}

test("back edges are found and routed around the outside", () => {
  const g = graph({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [["a", "b"], ["b", "c"], ["c", "a", "again"]] });
  assert.deepEqual(g.edges.map((e) => e.kind), ["straight", "straight", "around"]);
  assert.deepEqual(g.nodes.map((n) => n.rank), [0, 1, 2]);
});

test("a forward edge that would cross a box goes around", () => {
  const g = graph({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [["a", "b"], ["b", "c"], ["a", "c"]] });
  assert.equal(g.edges[2].kind, "around");
});

test("stacked edge labels stay clear of each other, or warn", () => {
  const spec = (deep) => ({
    nodes: [{ id: "a", label: "Changelog URL" }, { id: "b", label: "Cached page" }, { id: "c", label: "Deep-link route" }, { id: "d", label: "Changelog view" }],
    edges: [["a", "b", "no query"], ["a", "c", deep], ["b", "d"], ["c", "d"]],
  });
  takeWarnings();
  const ok = render(spec("deep link"), { id: "ok" });
  assert.deepEqual(takeWarnings(), []);
  const v = ok.match(/<svg class="v"[\s\S]*?<\/svg>/)[0];
  const [l1, l2] = [...v.matchAll(/<text class="edge" x="([\d.]+)"[^>]*>([^<]+)</g)].map((m) => ({ x: +m[1], text: m[2] }));
  assert.ok(l2.x - (l1.x + l1.text.length * 6.4) > 10, "the two labels keep a gap");
  render(spec("?path, ?offset"), { id: "long" });
  assert.match(takeWarnings().join("\n"), /edge label "\?path, \?offset" doesn't fit beside its wire/);
});

test("bad specs fail with a message", () => {
  assert.throws(() => graph({ nodes: [] }), /nodes/);
  assert.throws(() => graph({ nodes: [{ id: "a" }], edges: [["a", "z"]] }), /unknown node "z"/);
  assert.throws(() => graph({ nodes: [{ id: "a" }, { id: "b" }], edges: [["a", "b"]], motion: { route: ["b", "a"] } }), /not an edge/);
});

test("build renders markers in place, stamps a hash, and is idempotent", () => {
  const dir = mkdtempSync(join(tmpdir(), "viz-"));
  mkdirSync(join(dir, "viz"));
  writeFileSync(join(dir, "viz/p.json"), JSON.stringify(specs[0][1]));
  const post = `<figure class="wide">\n<!-- viz flow viz/p.json -->\n<!-- /viz -->\n<figcaption>x</figcaption></figure>`;
  const once = build(post, dir);
  assert.equal(once.count, 1);
  assert.match(once.html, /<!-- viz flow viz\/p\.json #[0-9a-f]{6} -->\n<div class="flow"/);
  assert.equal(build(once.html, dir).html, once.html);
  assert.equal(build(once.html, dir, { check: true }).problems.length, 0);
  writeFileSync(join(dir, "viz/p.json"), JSON.stringify({ ...specs[0][1], title: "changed" }));
  assert.match(build(once.html, dir, { check: true }).problems[0], /changed since the last render/);
  assert.match(build(post, dir, { check: true }).problems[0], /not rendered yet/);
});
