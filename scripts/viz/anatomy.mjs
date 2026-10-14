// anatomy.mjs — the parts of one thing, named. One parts list draws three ways: "flat" (straight on),
// "iso" (at an angle, structure only, and it comes apart on request) or "screenshot" (numbered keys
// over the capture itself). Every view renders as a keyed figure: hotspots and a legend, which the
// template's script links. Parts are measured in the capture's own pixels, so the drawing matches it.
//
// Spec:
//   { "title": "…" (for screen readers), "view": "flat" | "iso" | "screenshot",
//     "src": "img/card.png", "srcDark": "img/card-dark.png" (optional, same size), "size": [w, h] (the capture's pixels),
//     "frame": [x, y, w, h] (the object's outline in the capture; default the whole capture),
//     "label": "The week at a glance" (the object's own title; drawn on it),
//     "parts": [{ "id": "codex", "box": [x, y, w, h], "label": "Codex", "header": 87,
//                 "split": [363, 92, 207] (columns, left to right), "lit": true,
//                 "rows": 5 or ["row text", …] (a list) }],
//     "marks": [{ "at": [x, y], "kind": "landmark" | "major" | "cursor", "part": "codex" }],
//     "keys": [{ "part": "codex", "text": "**Tile size.** …", "marks": true (the key is about the
//               part's marks), "at": [x, y] (where the hotspot sits; default the part's centre) }],
//     "from": "other-spec.json" (start from another spec; fields here override it) }
// Keys are numbered in order. At most six; lint warns past that. With opts.style "field-notes" the
// lines are drawn by hand, seeded by the figure's id.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { esc, inline, slug, r, warn, rand, handLine, handRect, assetSrc } from "./util.mjs";

const U = 430; // the drawing's width in its own units, whatever the capture's size

export function parse(text) { return JSON.parse(text); }

export function deps(spec, base) { return spec.from ? [resolve(base, spec.from)] : []; }

function load(spec, base) {
  if (!spec.from) return spec;
  const parent = load(JSON.parse(readFileSync(resolve(base ?? ".", spec.from), "utf8")), base);
  const { from, ...rest } = spec;
  return { ...parent, ...rest };
}

export function render(input, opts = {}) {
  const spec = load(input, opts.base);
  const id = opts.id ?? spec.id ?? slug(spec.title ?? "anatomy");
  const view = spec.view ?? "flat";
  if (!["flat", "iso", "screenshot"].includes(view)) throw new Error(`anatomy: view "${view}" (use flat, iso or screenshot)`);
  const keys = spec.keys ?? [];
  if (!keys.length) throw new Error("anatomy: no keys; a figure with nothing named is a screenshot");
  if (keys.length > 6) warn(`anatomy "${id}": ${keys.length} keys; past about six the numbers stop helping`);
  const parts = spec.parts ?? [];
  const byId = new Map(parts.map((p) => [p.id, p]));
  for (const k of keys) if (k.part && !byId.has(k.part)) throw new Error(`anatomy: key "${k.text.slice(0, 30)}" names part "${k.part}", which isn't in parts`);
  const size = spec.size ?? (spec.frame ? [spec.frame[0] + spec.frame[2], spec.frame[1] + spec.frame[3]] : null);
  if (!size) throw new Error("anatomy: give size (the capture's pixels) or frame");
  const frame = spec.frame ?? [0, 0, size[0], size[1]];
  const s = frame[2] / U; // capture pixels per drawing unit
  const toU = ([x, y]) => [(x - frame[0]) / s, (y - frame[1]) / s];
  const boxU = (b) => [(b[0] - frame[0]) / s, (b[1] - frame[1]) / s, b[2] / s, b[3] / s];
  const D = frame[3] / s;
  const hand = opts.style === "field-notes";
  const next = hand ? rand(id) : null;
  const src = (p) => assetSrc(p, opts, `anatomy "${id}"`);

  // Which data-k each part and each part's marks answer to: a part lights for its first plain key,
  // its marks for a key with "marks": true.
  const kPart = new Map(), kMarks = new Map();
  keys.forEach((k, i) => {
    if (!k.part) return;
    const map = k.marks ? kMarks : kPart;
    if (!map.has(k.part)) map.set(k.part, i + 1);
  });

  let stage, hs, ratio;
  if (view === "screenshot") {
    if (!spec.src) throw new Error("anatomy: the screenshot view needs src");
    const img = `<img${spec.srcDark ? ' class="dark-ok"' : ""} src="${esc(src(spec.src))}" alt="${esc(spec.alt ?? spec.title ?? "")}" width="${size[0]}" height="${size[1]}">`;
    stage = spec.srcDark ? `<picture><source srcset="${esc(src(spec.srcDark))}" media="(prefers-color-scheme: dark)">${img}</picture>` : img;
    hs = keys.map((k, i) => {
      const at = k.at ?? centre(byId.get(k.part)?.box);
      if (!at) throw new Error(`anatomy: key ${i + 1} needs "at" or a part with a box`);
      return { k: i + 1, x: (at[0] / size[0]) * 100, y: (at[1] / size[1]) * 100 };
    });
  } else {
    const draw = view === "iso" ? iso : flat;
    const out = draw({ spec, parts, keys, byId, kPart, kMarks, toU, boxU, D, s, hand, next });
    stage = `<svg viewBox="${out.vb.map(r).join(" ")}" role="img" aria-label="${esc(spec.title ?? "Parts of the object")}">${out.body}</svg>`;
    hs = keys.map((k, i) => {
      const a = out.anchor(k);
      return { k: i + 1, x: ((a[0] - out.vb[0]) / out.vb[2]) * 100, y: ((a[1] - out.vb[1]) / out.vb[3]) * 100, ex: (a.lift ?? 0) / out.vb[2] * 100, d: a.delay };
    });
  }
  for (const h of hs) if (h.x < 0 || h.x > 100 || h.y < 0 || h.y > 100) warn(`anatomy "${id}": key ${h.k} sits outside the figure`);

  const btns = hs.map((h) => `    <button type="button" class="hs" data-k="${h.k}" style="--x:${r(h.x)}%;--y:${r(h.y)}%${h.ex ? `;--ex:${r(h.ex)}cqw;--do:${h.d[0]}ms;--dc:${h.d[1]}ms` : ""}" aria-label="${h.k}"><span class="dot" aria-hidden="true">${h.k}</span></button>`);
  const legend = keys.map((k, i) => `    <li data-k="${i + 1}"><span>${inline(k.text)}</span></li>`);
  const toggle = view === "iso"
    ? `  <fieldset class="parts-view"><legend class="vh">View</legend><label><input type="radio" name="${id}-view" checked>Assembled</label><span aria-hidden="true">/</span><label><input type="radio" name="${id}-view" class="apart">Apart</label></fieldset>\n`
    : "";
  return `<div class="keyed anatomy anatomy-${view}" id="anatomy-${id}">
${toggle}  <div class="stage">
    ${stage}
${btns.join("\n")}
  </div>
  <ol class="keys">
${legend.join("\n")}
  </ol>
</div>`;
}

const centre = (b) => (b ? [b[0] + b[2] / 2, b[1] + b[3] / 2] : null);

// ── drawing helpers ──────────────────────────────────────────────────────────────────────────
const path = (d, cls) => `<path class="${cls}" d="${d}"/>`;
const poly = (pts, cls) => path(`M${pts.map(([x, y]) => `${r(x)},${r(y)}`).join(" L")} Z`, cls);
const line = (a, b, cls, hand, next) => path(hand ? handLine([a, b], next, 0.8) : `M${r(a[0])},${r(a[1])} L${r(b[0])},${r(b[1])}`, cls);
const outline = (x, y, w, h, cls, hand, next) => path(hand ? handRect(x, y, w, h, next, 3) : `M${r(x)},${r(y)} h${r(w)} v${r(h)} h${r(-w)} Z`, cls);
const text = (x, y, s, cls, size, extra = "") => `<text class="${cls}" x="${r(x)}" y="${r(y)}" font-size="${size}"${extra}>${esc(s)}</text>`;

// A flame: filled for a landmark, outlined for a major release. Base centre at (x, y), height h.
function flame(x, y, h, kind) {
  const w = h * 0.42;
  const d = `M${r(x)},${r(y)} C${r(x - w)},${r(y - h * 0.12)} ${r(x - w * 0.85)},${r(y - h * 0.6)} ${r(x)},${r(y - h)} C${r(x + w * 0.85)},${r(y - h * 0.6)} ${r(x + w)},${r(y - h * 0.12)} ${r(x)},${r(y)} Z`;
  return path(d, kind === "landmark" ? "mk-l" : "mk-m");
}
const cursor = (x, y, k = 1) => `<path class="cur" transform="translate(${r(x)} ${r(y)}) scale(${k})" d="M0 0L0 16L4.2 12.2L7.4 19L10 17.8L6.9 11.2L12 11.2Z"/>`;

const TONES = ["f3", "f2", "f1"]; // a split's columns, darkest first
const LIT = ["l3", "l2", "l1"];

function columns(p, [x, y, w, h], top, put) {
  const head = p.header ? p.header : 0;
  const body = [y + head, h - head];
  if (!p.split) { put([x, body[0], w, body[1]], p.lit ? "l1" : "f1"); return; }
  const tot = p.split.reduce((a, b) => a + b, 0);
  let cx = x;
  p.split.forEach((c, i) => { const cw = (w * c) / tot; put([cx, body[0], cw, body[1]], (p.lit ? LIT : TONES)[Math.min(i, 2)]); cx += cw; });
}

// ── flat: straight on, with the object's own labels ─────────────────────────────────────────
function flat({ spec, parts, keys, byId, kPart, kMarks, toU, boxU, D, s, hand, next }) {
  let body = outline(0, 0, U, D, "card", hand, next);
  if (spec.label) body += text(12, 22, spec.label, "t-lbl", 12.5);
  for (const p of parts) {
    const [x, y, w, h] = boxU(p.box);
    const head = p.header ? p.header / s : 0;
    const pu = { ...p, header: head };
    let g = "";
    if (p.rows) {
      const rows = Array.isArray(p.rows) ? p.rows : Array.from({ length: p.rows }, () => "");
      const step = h / rows.length;
      rows.forEach((t, i) => {
        const ry = y + step * i + step / 2;
        g += text(x + 2, ry + 3, String(i + 1).padStart(2, "0"), "t-mono", 7);
        g += t ? text(x + 18, ry + 3, t, "t-row", 8.6) : path(`M${r(x + 18)},${r(ry - 2)} h${r((w - 24) * (0.5 + ((i * 37) % 40) / 100))} v4 h${r(-(w - 24) * (0.5 + ((i * 37) % 40) / 100))} Z`, "f2");
      });
    } else {
      if (head) g += path(`M${r(x)},${r(y)} h${r(w)} v${r(head)} h${r(-w)} Z`, "f0");
      columns(pu, [x, y, w, h], 0, (b, cls) => { g += path(`M${r(b[0])},${r(b[1])} h${r(b[2])} v${r(b[3])} h${r(-b[2])} Z`, cls); });
      g += outline(x, y, w, h, "ln", hand, next);
      if (p.label) g += text(x + 6, y + Math.min(14.5, (head || 20) - 6), p.label, "t-part", 9.5);
    }
    g += marksFor(spec, p, toU, kMarks, (m, [mx, my]) => (m.kind === "cursor" ? cursor(mx, my) : flame(mx, my + 4, 9, m.kind)));
    body += `<g class="pt"${kPart.has(p.id) ? ` data-k="${kPart.get(p.id)}"` : ""}>${g}</g>`;
  }
  const anchor = (k) => (k.at ? toU(k.at) : centre(boxU(byId.get(k.part).box)));
  return { vb: [-14, -14, U + 28, D + 28], body, anchor };
}

function marksFor(spec, p, toU, kMarks, draw) {
  const ms = (spec.marks ?? []).filter((m) => m.part === p.id);
  if (!ms.length) return "";
  const k = kMarks.get(p.id);
  return `<g class="mk"${k ? ` data-k="${k}"` : ""}>${ms.map((m) => draw(m, toU(m.at))).join("")}</g>`;
}

// ── iso: at an angle; structure only, and the parts lift off the base on request ───────────────
const C = Math.cos(Math.PI / 6), S = 0.5;
function iso({ spec, parts, keys, byId, kPart, kMarks, toU, boxU, D, s, hand, next }) {
  const P = (u, v, z) => [(u - v) * C, (u + v) * S - z];
  const TH = 8;
  const L = (a, b, cls = "ln") => line(P(...a), P(...b), cls, hand, next);
  const slab = (u0, v0, u1, v1, z0, z1, top, sides) => {
    let o = poly([P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top);
    o += poly([P(u1, v0, z1), P(u1, v1, z1), P(u1, v1, z0), P(u1, v0, z0)], sides[0]);
    o += poly([P(u0, v1, z1), P(u1, v1, z1), P(u1, v1, z0), P(u0, v1, z0)], sides[1]);
    for (const [a, b] of [[[u0, v0, z1], [u1, v0, z1]], [[u1, v0, z1], [u1, v1, z1]], [[u1, v1, z1], [u0, v1, z1]], [[u0, v1, z1], [u0, v0, z1]],
      [[u1, v0, z1], [u1, v0, z0]], [[u1, v1, z1], [u1, v1, z0]], [[u0, v1, z1], [u0, v1, z0]], [[u1, v0, z0], [u1, v1, z0]], [[u0, v1, z0], [u1, v1, z0]]]) o += L(a, b);
    return o;
  };
  const face = (u0, v0, u1, v1, z, cls) => poly([P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z)], cls);
  const shadow = [P(0, 0, 0), P(U, 0, 0), P(U, D, 0), P(0, D, 0)].map(([x, y]) => [x + 8, y + 8]);
  let base = poly(shadow, "shadow") + slab(0, 0, U, D, 0, TH, "fp", ["s1", "s2"]);
  if (spec.label) {
    const [x, y] = P(12, 22, TH);
    base += `<text class="t-lbl" transform="matrix(${r(C * 100) / 100} 0.5 ${-r(C * 100) / 100} 0.5 ${r(x)} ${r(y)})" font-size="13">${esc(spec.label)}</text>`;
  }
  let fp = ""; // where each part sits, shown when the parts are apart
  const order = [...parts].sort((a, b) => (a.box[0] + a.box[2] + a.box[1] + a.box[3]) - (b.box[0] + b.box[2] + b.box[1] + b.box[3]));
  const lifts = new Map();
  let body = "";
  order.forEach((p, i) => {
    const [x, y, w, h] = boxU(p.box);
    const isList = !!p.rows;
    const z1 = TH + (isList ? 2.5 : 7);
    const head = p.header ? p.header / s : 0;
    let g = "";
    fp += poly([P(x, y, TH), P(x + w, y, TH), P(x + w, y + h, TH), P(x, y + h, TH)], "fp-out");
    if (isList) {
      const n = Array.isArray(p.rows) ? p.rows.length : p.rows;
      const step = h / n;
      for (let k = 0; k < n; k++) {
        const ry = y + step * k;
        const len = (w - 30) * (0.55 + ((k * 37) % 40) / 100);
        g += slab(x, ry + 2, x + w, ry + step - 3, TH, z1, "fp", ["s1", "s2"]);
        g += face(x + 26, ry + step * 0.3, x + 26 + len, ry + step * 0.45, z1, "f2");
        g += face(x + 26, ry + step * 0.62, x + 56, ry + step * 0.72, z1, "f1");
      }
    } else {
      g += slab(x, y, x + w, y + h, TH, z1, "f0", p.lit ? ["ls1", "ls2"] : ["s1", "s2"]);
      columns({ ...p, header: head }, [x, y, w, h], z1, (b, cls) => { g += face(b[0], b[1], b[0] + b[2], b[1] + b[3], z1, cls); });
      if (head) g += L([x, y + head, z1], [x + w, y + head, z1]);
    }
    g += marksFor(spec, p, toU, kMarks, (m, [u, v]) => {
      const [mx, my] = P(u, v, z1);
      return m.kind === "cursor" ? cursor(mx - 2, my - 24, 1.15) : `<ellipse class="shadow" cx="${r(mx)}" cy="${r(my)}" rx="5" ry="2"/>${flame(mx, my, isList ? 10 : 15, m.kind)}`;
    });
    const lift = isList ? -18 : -34;
    const delay = [i * 35, (order.length - 1 - i) * 35];
    lifts.set(p.id, { lift, delay, z1 });
    body += `<g class="lift" style="--lift:${lift}px;--do:${delay[0]}ms;--dc:${delay[1]}ms"><g class="pt"${kPart.has(p.id) ? ` data-k="${kPart.get(p.id)}"` : ""}>${g}</g></g>`;
  });
  const anchor = (k) => {
    const p = byId.get(k.part);
    const { lift, delay, z1 } = lifts.get(p.id) ?? { lift: 0, delay: [0, 0], z1: TH };
    const [u, v] = k.at ? toU(k.at) : centre(boxU(p.box));
    const a = P(u, v, z1);
    if (k.marks) a[1] -= 26; // above the standing marks
    return Object.assign(a, { lift, delay });
  };
  const pts = [...shadow, P(0, 0, TH + 7), P(U, 0, TH + 7)];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - 16, y0 = Math.min(...ys) - 40, x1 = Math.max(...xs) + 16, y1 = Math.max(...ys) + 16;
  return { vb: [x0, y0, x1 - x0, y1 - y0], body: `<g class="base">${base}<g class="foot">${fp}</g></g>${body}`, anchor };
}
