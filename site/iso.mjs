// iso.mjs — the site's own pictures, drawn at an angle in the anatomy component's style
// (skills/buildnotes/scripts/viz/anatomy.mjs): paper slabs with ink edges, grey and blue faces, soft shadows.
// The page styles every class (.iso .face, .f2, .l2, ...). Coordinates: a sheet is 64 wide (x) and 84 deep (y).
//
//   import { drawing, NAMES } from "./iso.mjs";
//   drawing("pipeline")  →  "<svg class="iso" ...>"

const C = Math.cos(Math.PI / 6);
const P = (x, y, z = 0) => [(x - y) * C, (x + y) * 0.5 - z];
const f = (n) => Number(n.toFixed(1));

class Draw {
  parts = [];
  pts = [];
  poly(pts3, cls, extra = "") {
    const pts = pts3.map((p) => P(...p));
    this.pts.push(...pts);
    this.parts.push(`<polygon class="${cls}" points="${pts.map(([u, v]) => `${f(u)},${f(v)}`).join(" ")}"${extra}/>`);
  }
  // A box standing on z: shadow, the two sides that face the reader, then the top.
  slab(x, y, w, d, { z = 0, t = 3, top = "fp", side = ["s1", "s2"], dash = false, shadow = true } = {}) {
    const ex = dash ? ' stroke-dasharray="3 3"' : "";
    if (shadow && z === 0) this.poly([[x + 4, y + 6, 0], [x + w + 4, y + 6, 0], [x + w + 4, y + d + 6, 0], [x + 4, y + d + 6, 0]], "shadow");
    const zt = z + t;
    if (t) {
      this.poly([[x + w, y, zt], [x + w, y + d, zt], [x + w, y + d, z], [x + w, y, z]], `face ${side[0]}`, ex);
      this.poly([[x, y + d, zt], [x + w, y + d, zt], [x + w, y + d, z], [x, y + d, z]], `face ${side[1]}`, ex);
    }
    this.poly([[x, y, zt], [x + w, y, zt], [x + w, y + d, zt], [x, y + d, zt]], `face ${top}`, ex);
    return zt;
  }
  bar(x, y, w, d, z, cls = "f2") {
    this.poly([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], `flat ${cls}`);
  }
  raw(s, pts = []) {
    this.parts.push(s);
    this.pts.push(...pts);
  }
  svg(attrs, pad = 8) {
    const us = this.pts.map((p) => p[0]), vs = this.pts.map((p) => p[1]);
    const x0 = Math.min(...us) - pad, y0 = Math.min(...vs) - pad;
    const vb = [x0, y0, Math.max(...us) + pad - x0, Math.max(...vs) + pad - y0].map(f).join(" ");
    return `<svg class="iso" viewBox="${vb}" ${attrs}>${this.parts.join("")}</svg>`;
  }
}

const LIT = { top: "l2", side: ["ls1", "ls2"] };

function rows(dr, x, y, w, z, n, { gap = 7, widths = [1] } = {}) {
  for (let i = 0; i < n; i++) dr.bar(x, y + i * gap, w * widths[i % widths.length], 2.2, z);
}

function pin(dr, x, y, z, n) {
  const [u, v] = P(x, y, z);
  dr.raw(`<g class="pin"><circle cx="${f(u)}" cy="${f(v - 7)}" r="6"/><text x="${f(u)}" y="${f(v - 3.6)}">${n}</text></g>`, [[u, v - 14]]);
}

function cursor(dr, x, y, z) {
  let [u, v] = P(x, y, z);
  u -= 1; v -= 16;
  dr.raw(`<path class="cur" d="M${f(u)},${f(v)} l0,14 l3.5,-3.2 l2.6,5.6 l2.4,-1.1 l-2.6,-5.4 l4.8,-0.2 z"/>`, [[u, v], [u + 10, v + 18]]);
}

// ── objects ──
function post(dr, ox = 0, oy = 0) {
  const zt = dr.slab(ox, oy, 64, 84);
  dr.bar(ox + 8, oy + 8, 34, 4, zt, "f3");
  rows(dr, ox + 8, oy + 16, 44, zt, 2, { widths: [1, 0.7] });
  dr.slab(ox + 8, oy + 31, 48, 26, { z: zt, ...LIT, shadow: false });
  rows(dr, ox + 8, oy + 64, 48, zt, 3, { widths: [1, 0.85, 0.6] });
}

function record(dr, ox = 0, oy = 0) {
  let zt = 0;
  [[10, -8], [5, -4], [0, 0]].forEach(([dx, dy], i) => { zt = dr.slab(ox + dx, oy + dy, 64, 84, { z: i * 5, shadow: i === 0 }); });
  dr.bar(ox + 8, oy + 8, 26, 4, zt, "f3");
  rows(dr, ox + 8, oy + 18, 48, zt, 8, { widths: [1, 0.8, 0.9, 0.55] });
}

function plan(dr, ox = 0, oy = 0) {
  const zt = dr.slab(ox, oy, 64, 84);
  dr.bar(ox + 8, oy + 8, 24, 4, zt, "f3");
  for (let i = 0; i < 3; i++) {
    const y = oy + 22 + i * 21;
    rows(dr, ox + 20, y - 3, 34, zt, 2, { gap: 6, widths: [1, 0.6] });
    pin(dr, ox + 11, y, zt, i + 1);
  }
}

function video(dr, ox = 0, oy = 0) {
  const zt = dr.slab(ox, oy, 96, 54, { t: 4 });
  dr.bar(ox + 8, oy + 8, 30, 4, zt, "f3");
  rows(dr, ox + 8, oy + 16, 22, zt, 1);
  dr.poly([[ox + 52, oy + 18, zt], [ox + 52, oy + 36, zt], [ox + 68, oy + 27, zt]], "flat play");
  dr.bar(ox + 8, oy + 45, 80, 2.4, zt);
  dr.bar(ox + 8, oy + 45, 34, 2.4, zt, "l3");
}

function deep(dr, ox = 0, oy = 0) {
  const zt = dr.slab(ox, oy, 64, 84);
  dr.bar(ox + 8, oy + 8, 34, 4, zt, "f3");
  [[0, 26], [6, 34], [6, 22], [12, 28], [6, 18], [0, 12]].forEach(([ix, w], i) => dr.bar(ox + 8 + ix, oy + 18 + i * 6, w, 2.2, zt));
  dr.slab(ox + 10, oy + 58, 14, 14, { z: zt, t: 6, shadow: false });
  dr.bar(ox + 24, oy + 64, 16, 1.6, zt, "l3");
  dr.slab(ox + 40, oy + 58, 14, 14, { z: zt, t: 6, ...LIT, shadow: false });
}

function release(dr, ox = 0, oy = 0) {
  const zt = dr.slab(ox, oy, 64, 84);
  dr.bar(ox + 8, oy + 8, 30, 4, zt, "f3");
  const zs = dr.slab(ox + 8, oy + 18, 48, 34, { z: zt, t: 4, shadow: false });
  dr.bar(ox + 8, oy + 18, 48, 6, zs);
  dr.bar(ox + 14, oy + 30, 24, 14, zs, "l1");
  cursor(dr, ox + 40, oy + 40, zs);
  rows(dr, ox + 8, oy + 62, 48, zt, 3, { widths: [1, 0.8, 0.5] });
}

function figures(dr, ox = 0, oy = 0) {
  const zt = dr.slab(ox, oy, 54, 54);
  [10, 22, 15].forEach((h, i) => dr.slab(ox + 8 + i * 14, oy + 30, 9, 9, { z: zt, t: h, shadow: false, ...(i === 1 ? LIT : {}) }));
  const z2 = dr.slab(ox + 66, oy + 12, 40, 54);
  dr.slab(ox + 74, oy + 20, 12, 10, { z: z2, t: 4, shadow: false });
  dr.bar(ox + 86, oy + 24, 8, 1.6, z2, "l3");
  dr.bar(ox + 79, oy + 30, 1.6, 12, z2, "l3");
  dr.slab(ox + 74, oy + 42, 12, 10, { z: z2, t: 4, ...LIT, shadow: false });
  dr.slab(ox + 92, oy + 20, 8, 10, { z: z2, t: 4, shadow: false });
}

function deck(dr, ox = 0, oy = 0) {
  let zt = 0;
  for (let i = 0; i < 3; i++) zt = dr.slab(ox, oy, 96, 54, { z: i * 12, t: 2, shadow: i === 0 });
  dr.bar(ox + 8, oy + 8, 30, 4, zt);
  rows(dr, ox + 8, oy + 18, 40, zt, 2, { widths: [1, 0.6] });
  dr.slab(ox + 56, oy + 14, 32, 30, { z: zt, t: 3, ...LIT, shadow: false });
}

// The record becomes a plan, then the post: three objects in a row, a dot travelling between them.
function pipeline() {
  const dr = new Draw();
  const step = 200;
  const anchors = [record, plan, post].map((fn, i) => {
    const s = (i * step) / C / 2; // equal steps along +x and −y move straight right on screen
    fn(dr, s, -s);
    return P(s + 32, -s + 42);
  });
  const segs = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [u0, v0] = anchors[i], [u1] = anchors[i + 1];
    const a = u0 + 52, b = u1 - 50, y = v0 - 6;
    segs.push(`M${f(a)},${f(y)} C${f(a + 18)},${f(y - 12)} ${f(b - 18)},${f(y + 12)} ${f(b)},${f(y)}`);
    dr.raw(`<path class="route" d="${segs[i]}"/><path class="tip" d="M${f(b - 6)},${f(y - 4)} L${f(b)},${f(y)} L${f(b - 6)},${f(y + 4)}"/>`);
  }
  const route = segs.map((s, i) => (i ? s.replace("M", "L") : s)).join(" ");
  dr.raw(`<circle class="dot" cx="0" cy="0" r="4"><animateMotion dur="6s" repeatCount="indefinite" path="${route}"/></circle>`);
  [["the record", "issues · PRs · reviews"], ["plan", "the few decisions"], ["post, video", "and slides"]].forEach(([name, file], i) => {
    const [u, v] = anchors[i];
    dr.raw(`<text class="name" x="${f(u)}" y="${f(v + 70)}" text-anchor="middle">${name}</text><text class="file" x="${f(u)}" y="${f(v + 86)}" text-anchor="middle">${file}</text>`, [[u - 60, v + 90], [u + 60, v + 90]]);
  });
  return dr.svg('role="img" aria-label="The record of a feature becomes a plan, and the plan a post and a video."');
}

const OBJECTS = { post, video, deep, release, figures, deck };
export const NAMES = ["pipeline", ...Object.keys(OBJECTS)];

// Every drawing but the pipeline sits beside a heading that names it, so it is hidden from screen readers.
export function drawing(name) {
  if (name === "pipeline") return pipeline();
  const fn = OBJECTS[name];
  if (!fn) throw new Error(`iso: unknown drawing "${name}" (drawings: ${NAMES.join(", ")})`);
  const dr = new Draw();
  fn(dr);
  return dr.svg('aria-hidden="true"');
}
