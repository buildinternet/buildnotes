// flow.mjs — a flow diagram from nodes and edges, drawn twice from one layout: left to right for
// wide screens (svg.h) and top to bottom for phones (svg.v). The template's CSS shows one of the two
// by the width of the .flow box (data-fold, in rem). Motion follows the drawn edges by construction.
//
// Spec:
//   { "title": "…", "desc": "…" (optional; generated from the edges if left out),
//     "nodes": [{ "id": "build", "label": "Build", "sub": "runner", "hot": true, "rank": 1, "lane": 0 }],
//     "edges": [["push", "build", "webhook"], { "from": "build", "to": "push", "label": "retry" }],
//     "motion": { "route": ["push", "build", "preview"], "style": "dashes" | "dot" | "none" } }
// rank (column when wide) and lane (row when wide) are optional overrides; by default a node's rank
// is its longest path from a source, and lanes are centred and ordered to cut crossings.
// A label may break with "\n". An edge that points back (a loop or retry) runs around the outside.
// With opts.style "field-notes", boxes and wires are drawn by hand (seeded by the figure's id, so the
// same spec draws the same strokes); the motion route stays on the exact geometry.

import { esc, slug, width, r, warn, W_LABEL, W_SUB, W_EDGE, rand, handLine, handRect } from "./util.mjs";

const PAD = 8;
const PHONE = 320; // the stacked drawing's width budget in SVG units (a 390px phone shows ~324px of stage)

export function render(spec, opts = {}) {
  const id = opts.id ?? spec.id ?? slug(spec.title);
  const g = graph(spec, id);
  const hand = opts.style === "field-notes";
  const h = draw(g, spec, "h", `${id}-h`, hand);
  const v = draw(g, spec, "v", `${id}-v`, hand);
  // Show the stacked drawing when the wide one would shrink below ~88% (13px labels → 11.4px).
  const need = (h.w * 0.88) / 16;
  // Buckets are the .flow box's inner width (rem) in a column figure (38) up to a wide one (52, i.e.
  // 54rem less padding): a bucket above 52 could never show the wide drawing.
  const fold = [30, 38, 46, 52].find((t) => t >= need) ?? 52;
  if (need > 52) warn(`flow "${id}": the wide drawing is ${Math.round(h.w)} units across, too wide for any figure, so only the stacked drawing shows; use fewer ranks, shorter labels, or "steps" for a straight line`);
  if (v.w > PHONE + 2 * PAD + 4) warn(`flow "${id}": the stacked drawing is ${Math.round(v.w)} units across (phone budget ${PHONE + 2 * PAD}); shorten labels or use fewer lanes`);
  return `<div class="flow" data-fold="${fold}">\n${h.svg}\n${v.svg}\n</div>`;
}

// ── graph: ranks, lanes and edge kinds, shared by both drawings ──────────────────────────────
export function graph(spec, id = "flow") {
  if (!Array.isArray(spec.nodes) || !spec.nodes.length) throw new Error("flow: the spec needs a nodes list");
  const nodes = spec.nodes.map((n, i) => ({ ...n, i, label: String(n.label ?? n.id) }));
  const by = new Map(nodes.map((n) => [n.id, n]));
  if (by.size !== nodes.length) throw new Error("flow: two nodes share an id");
  const edges = (spec.edges ?? []).map((e, i) => {
    const [from, to, label] = Array.isArray(e) ? e : [e.from, e.to, e.label];
    for (const x of [from, to]) if (!by.has(x)) throw new Error(`flow: edge ${from} → ${to} names an unknown node "${x}"`);
    if (from === to) throw new Error(`flow: edge ${from} → ${to} loops on itself; not supported`);
    return { from, to, label, i };
  });
  if (nodes.length > 9) warn(`flow "${id}": ${nodes.length} boxes; five to nine is the useful range, so consider splitting it`);

  // Back edges close a cycle: find them depth-first, starting from the sources in spec order.
  const seen = new Map();
  const back = new Set();
  const visit = (nid) => {
    seen.set(nid, 1);
    for (const e of edges) if (e.from === nid) {
      const s = seen.get(e.to);
      if (s === 1) back.add(e);
      else if (!s) visit(e.to);
    }
    seen.set(nid, 2);
  };
  const sources = nodes.filter((n) => !edges.some((e) => e.to === n.id));
  for (const n of [...sources, ...nodes]) if (!seen.has(n.id)) visit(n.id);

  // Rank = longest path from a source over the forward edges, unless the spec pins it.
  const fwd = edges.filter((e) => !back.has(e));
  const rank = new Map();
  const rankOf = (nid) => {
    if (rank.has(nid)) return rank.get(nid);
    let k = 0;
    for (const e of fwd) if (e.to === nid) k = Math.max(k, rankOf(e.from) + 1);
    const n = by.get(nid);
    if (Number.isInteger(n.rank)) k = n.rank;
    rank.set(nid, k);
    return k;
  };
  for (const n of nodes) n.rank = rankOf(n.id);
  const R = Math.max(...nodes.map((n) => n.rank)) + 1;

  // Lanes: centred in each rank, ordered by the mean lane of their predecessors (spec order breaks ties).
  const ranks = Array.from({ length: R }, (_, k) => nodes.filter((n) => n.rank === k));
  const L = Math.max(...ranks.map((rk) => rk.length), ...nodes.map((n) => (Number.isFinite(n.lane) ? n.lane + 1 : 0)));
  for (const rk of ranks) {
    const bary = (n) => {
      const ps = fwd.filter((e) => e.to === n.id).map((e) => by.get(e.from)).filter((p) => p.rank < n.rank && p.pos !== undefined);
      return ps.length ? ps.reduce((a, p) => a + p.pos, 0) / ps.length : Infinity;
    };
    const free = rk.filter((n) => !Number.isFinite(n.lane)).sort((a, b) => (bary(a) - bary(b)) || (a.i - b.i));
    const off = (L - free.length) / 2;
    free.forEach((n, k) => { n.pos = off + k; });
    for (const n of rk) if (Number.isFinite(n.lane)) n.pos = n.lane;
    const taken = new Set();
    for (const n of rk) {
      if (taken.has(n.pos)) warn(`flow "${id}": two boxes share rank ${n.rank}, lane ${n.pos}; set "lane" on one of them`);
      taken.add(n.pos);
    }
  }

  // Edge kinds: forward edges go straight or bend once; an edge that would cross a box, or points
  // back, runs around the outside (forward ones on the near side, back ones on the far side).
  let near = 0, far = 0;
  for (const e of edges) {
    const s = by.get(e.from), t = by.get(e.to);
    if (t.rank <= s.rank) { e.kind = "around"; e.side = 1; e.track = far++; continue; }
    const between = nodes.filter((m) => m.rank > s.rank && m.rank < t.rank);
    const blocked = between.some((m) => Math.abs(m.pos - s.pos) < 1 || Math.abs(m.pos - t.pos) < 1);
    if (blocked) { e.kind = "around"; e.side = -1; e.track = near++; continue; }
    e.kind = s.pos === t.pos ? "straight" : "bend";
  }
  const outdeg = (nid) => edges.filter((e) => e.from === nid && e.kind !== "around").length;
  const indeg = (nid) => edges.filter((e) => e.to === nid && e.kind !== "around").length;
  for (const e of edges) if (e.kind === "bend") e.turnNearTarget = indeg(e.to) > 1 && outdeg(e.from) <= 1;
  // A box is "outermost" on a side when no box in its rank lies further out; an around-edge can
  // leave or enter it straight from that side.
  for (const n of nodes) {
    const rk = ranks[n.rank];
    n.outer = { 1: rk.every((m) => m.pos <= n.pos), [-1]: rk.every((m) => m.pos >= n.pos) };
  }

  const route = spec.motion?.route ?? [];
  const legs = [];
  for (let k = 1; k < route.length; k++) {
    const e = edges.find((x) => x.from === route[k - 1] && x.to === route[k]);
    if (!e) throw new Error(`flow: motion route step ${route[k - 1]} → ${route[k]} is not an edge`);
    legs.push(e);
  }
  return { id, nodes, edges, by, R, L, legs, style: spec.motion?.style ?? (legs.length ? "dashes" : "none") };
}

// ── draw: one orientation ──────────────────────────────────────────────────────────────────────
// Layout runs in (u, v): u along the flow, v across it. "h" maps (u, v) → (x, y); "v" maps → (v, u).
function draw(g, spec, o, sid, hand = false) {
  const { nodes, edges, by, L } = g;
  const lines = Math.max(...nodes.map((n) => n.label.split("\n").length));
  const hasSub = nodes.some((n) => n.sub);
  const boxH = Math.max(o === "h" ? 56 : 48, lines * 16 + (hasSub ? 14 : 0) + 20);
  const need = (n) => Math.max(width(n.label, W_LABEL), width(n.sub, W_SUB)) + 24;
  const want = Math.max(...nodes.map(need));
  const edgeLbl = Math.max(0, ...edges.filter((e) => e.kind !== "around").map((e) => width(e.label, W_EDGE)));
  const aroundLbl = Math.max(0, ...edges.filter((e) => e.kind === "around").map((e) => width(e.label, W_EDGE)));

  // Boxes share one size along the flow (M). Across it (C), the wide drawing uses one size for all;
  // the stacked one sizes each rank to its own widest label, within the phone's width budget.
  let M, C, G;
  const P = (u, v) => (o === "h" ? [u, v] : [v, u]);
  if (o === "h") {
    M = Math.min(190, Math.max(120, want)); C = boxH; G = Math.max(56, edgeLbl + 30);
    for (const n of nodes) { n.C = C; n.vc = n.pos * (C + 28) + C / 2; }
  } else {
    M = boxH; G = 48;
    const reserve = edges.some((e) => e.kind === "around") ? 26 + aroundLbl : 0;
    const mid = ((L - 1) / 2) * 112;
    for (let k = 0; k < g.R; k++) {
      const rk = nodes.filter((n) => n.rank === k);
      if (!rk.length) continue;
      const span = Math.max(...rk.map((n) => n.pos)) - Math.min(...rk.map((n) => n.pos)) + 1;
      const most = Math.min(220, (PHONE - reserve - (span - 1) * 16) / span);
      const c = Math.min(most, Math.max(96, ...rk.map(need)));
      for (const n of rk) {
        n.C = c;
        n.vc = mid + (n.pos - (L - 1) / 2) * (c + 16);
        if (need(n) - 8 > c) warn(`flow "${g.id}": "${n.label.replace(/\n/g, " ")}" is too long for a ${Math.round(c)}-unit box on phones; shorten it or break it with \\n`);
      }
    }
  }
  for (const n of nodes) {
    n.u0 = n.rank * (M + G); n.uc = n.u0 + M / 2;
    n.v0 = n.vc - n.C / 2;
  }
  const vMax = Math.max(...nodes.map((n) => n.v0 + n.C));
  const vMin = Math.min(...nodes.map((n) => n.v0));

  // Edge geometry, in (u, v).
  const geo = new Map();
  for (const e of edges) {
    const s = by.get(e.from), t = by.get(e.to);
    let pts, lab;
    const kind = e.kind === "around" ? "around" : Math.abs(s.vc - t.vc) < 0.5 ? "straight" : "bend";
    if (kind === "straight") {
      pts = [[s.u0 + M, s.vc], [t.u0, t.vc]];
      lab = { u: (s.u0 + M + t.u0) / 2, v: s.vc, along: false };
    } else if (kind === "bend") {
      const a = [s.u0 + M, s.vc], b = [t.u0, t.vc];
      const ut = e.turnNearTarget ? b[0] - 16 : a[0] + 16;
      pts = [a, [ut, a[1]], [ut, b[1]], b];
      lab = e.turnNearTarget ? { u: (a[0] + ut) / 2, v: a[1] } : { u: (ut + b[0]) / 2, v: b[1] };
    } else {
      const sd = e.side;
      const tv = sd > 0 ? vMax + 20 + 14 * e.track : vMin - 20 - 14 * e.track;
      const edgeV = (n) => (sd > 0 ? n.v0 + n.C : n.v0);
      const exit = s.outer[sd] ? [[s.uc, edgeV(s)], [s.uc, tv]] : [[s.u0 + M, s.vc], [s.u0 + M + 10, s.vc], [s.u0 + M + 10, tv]];
      const enter = t.outer[sd] ? [[t.uc, tv], [t.uc, edgeV(t)]] : [[t.u0 - 10, tv], [t.u0 - 10, t.vc], [t.u0, t.vc]];
      pts = [...exit, ...enter];
      lab = { u: (exit.at(-1)[0] + enter[0][0]) / 2, v: tv, side: sd };
    }
    geo.set(e, { pts: pts.map(([u, v]) => P(u, v)), lab });
  }

  // Elements in (x, y), then a bounding box for the viewBox.
  const xs = [], ys = [];
  const see = (x, y) => { xs.push(x); ys.push(y); };
  for (const n of nodes) { const [x, y] = P(n.u0, n.v0); const [w, h] = P(M, n.C); n.box = { x, y, w, h }; see(x, y); see(x + w, y + h); }
  for (const [, { pts }] of geo) for (const [x, y] of pts) see(x, y);
  const labels = [];
  const left = Math.min(...nodes.map((n) => n.box.x)), right = Math.max(...nodes.map((n) => n.box.x + n.box.w));
  for (const e of edges) {
    if (!e.label) continue;
    const { lab } = geo.get(e);
    const w = width(e.label, W_EDGE);
    let x, y, anchor;
    if (o === "h") {
      [x, y] = [lab.u, lab.v + (lab.side > 0 ? 13 : -6)];
      anchor = "middle";
      see(x - w / 2, y - 9); see(x + w / 2, y + 3);
    } else if (lab.side) {
      [x, y] = [lab.v + 6 * lab.side, lab.u + 4];
      anchor = lab.side > 0 ? "start" : "end";
      see(x + w * lab.side, y - 9); see(x, y + 3);
    } else {
      // A straight drop: the label goes right of the wire, or left when the right runs past the
      // boxes or into another wire or label. If neither side is clear, it stays right, with a warning.
      y = lab.u + 4;
      const clear = (x0, x1) => x0 >= left && x1 <= right
        && !labels.some((l) => Math.abs(l.y - y) < 12 && l.x0 < x1 + 10 && x0 < l.x1 + 10)
        && ![...geo].some(([f, { pts }]) => f !== e && pts.some(([ax, ay], k) => k && ax === pts[k - 1][0] && ax > x0 - 2 && ax < x1 + 2 && Math.min(ay, pts[k - 1][1]) < y + 3 && Math.max(ay, pts[k - 1][1]) > y - 9));
      const side = clear(lab.v + 6, lab.v + 6 + w) ? 1 : clear(lab.v - 6 - w, lab.v - 6) ? -1 : 0;
      if (!side) warn(`flow "${g.id}": edge label "${e.label}" doesn't fit beside its wire in the stacked drawing; shorten it`);
      x = lab.v + 6 * (side || 1);
      anchor = side < 0 ? "end" : "start";
      see(x + w * (side || 1), y - 9); see(x, y + 3);
    }
    const [x0, x1] = anchor === "middle" ? [x - w / 2, x + w / 2] : anchor === "end" ? [x - w, x] : [x, x + w];
    labels.push({ x, y, x0, x1, anchor, text: e.label });
  }
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const dx = PAD - minX, dy = PAD - minY;
  const W = r(Math.max(...xs) - minX + 2 * PAD), H = r(Math.max(...ys) - minY + 2 * PAD);
  const X = (x) => r(x + dx), Y = (y) => r(y + dy);
  const d = (pts) => pts.map(([x, y], k) => `${k ? "L" : "M"}${X(x)},${Y(y)}`).join(" ");
  const next = hand ? rand(sid) : null;
  const wire = (pts) => (hand ? handLine(pts.map(([x, y]) => [X(x), Y(y)]), next) : d(pts));

  // The motion route: the legs' own vertices, joined through each box (hidden under it).
  const routePts = [];
  for (const e of g.legs) for (const p of geo.get(e).pts) {
    const last = routePts.at(-1);
    if (!last || last[0] !== p[0] || last[1] !== p[1]) routePts.push(p);
  }
  const onRoute = new Set(g.legs);

  const out = [];
  const desc = spec.desc ?? describe(g);
  out.push(`<svg class="${o}" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${Math.ceil(W)}px" role="img" aria-labelledby="${sid}-t ${sid}-d">`);
  out.push(`  <title id="${sid}-t">${esc(spec.title ?? "Flow diagram")}</title>`);
  out.push(`  <desc id="${sid}-d">${esc(desc)}</desc>`);
  out.push(`  <defs><marker id="${sid}-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path class="arrow" d="M0,0 L8,4 L0,8 z"/></marker></defs>`);
  for (const e of edges) {
    const live = g.style === "dashes" && onRoute.has(e) ? " live" : "";
    out.push(`  <path class="wire${live}" d="${wire(geo.get(e).pts)}" marker-end="url(#${sid}-ah)"/>`);
  }
  if (routePts.length > 1 && g.style === "dashes") out.push(`  <path class="route" d="${d(routePts)}"/>`);
  if (routePts.length > 1 && g.style === "dot") {
    // Drawn after the wires and before the boxes: the dot rides the wires and disappears into each box.
    // cx/cy stay 0 because animateMotion adds its path to the circle's own position.
    let len = 0;
    for (let k = 1; k < routePts.length; k++) len += Math.hypot(routePts[k][0] - routePts[k - 1][0], routePts[k][1] - routePts[k - 1][1]);
    const travel = Math.min(3.5, Math.max(1.5, len / 140));
    out.push(`  <circle class="dot" r="4" cx="0" cy="0"><animateMotion dur="${r(travel / 0.75)}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear" path="${d(routePts)}"/></circle>`);
  }
  for (const n of nodes) {
    const { x, y, w, h } = n.box;
    out.push(hand
      ? `  <path class="box${n.hot ? " hot" : ""}" d="${handRect(X(x), Y(y), r(w), r(h), next)}"/>`
      : `  <rect class="box${n.hot ? " hot" : ""}" x="${X(x)}" y="${Y(y)}" width="${r(w)}" height="${r(h)}" rx="6"/>`);
    const ls = n.label.split("\n");
    const block = ls.length * 16 + (n.sub ? 14 : 0);
    const cx = X(x + w / 2);
    const ty = y + h / 2 - block / 2 + 12;
    const tsp = ls.map((l, k) => `<tspan x="${cx}" ${k ? 'dy="16"' : ""}>${esc(l)}</tspan>`).join("");
    out.push(`  <text class="lbl" x="${cx}" y="${Y(ty)}" text-anchor="middle">${ls.length > 1 ? tsp : esc(n.label)}</text>`);
    if (n.sub) out.push(`  <text class="sub" x="${cx}" y="${Y(ty + ls.length * 16 - 1)}" text-anchor="middle">${esc(n.sub)}</text>`);
  }
  for (const l of labels) out.push(`  <text class="edge" x="${X(l.x)}" y="${Y(l.y)}" text-anchor="${l.anchor}">${esc(l.text)}</text>`);
  out.push(`</svg>`);
  return { svg: out.join("\n"), w: W, h: H };
}

// A plain-text description for screen readers, from the edges.
function describe(g) {
  const name = (nid) => g.by.get(nid).label.replace(/\n/g, " ");
  return g.edges.map((e) => `${name(e.from)} to ${name(e.to)}${e.label ? ` (${e.label})` : ""}`).join("; ") + ".";
}
