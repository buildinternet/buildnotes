// hero.js — the home page's hero: a tilted table with one cluster per example (see layout.js), drawn as one
// three.js scene. Every post, figure, slide and video is a textured plane on the table; the room model stands
// on it and casts its shadow onto it; one camera gives the table its angle (rotateX(52deg) rotateZ(-22deg),
// scaled by the stage's --s) and the page's perspective (2400 px from 50% 10% of the stage). The chip with
// the request and the pager under it are HTML.
//
// It renders on demand: every frame while the table glides or something lifts, 30 fps while the hero is on
// screen (the video and the camera's orbit), and not at all when it is scrolled away or the tab is hidden.
// Until the scene is ready the stage shows a baked poster of the Sunny view (made by site/hero.mjs), which is
// also the whole hero under reduced motion or without WebGL.
import { PITCH, POST, FIG, VIDEO, DECK, ROOM, CLUSTERS, cutFor } from "./layout.js";

const hero = document.querySelector('[data-hero]');
if (hero) boot();

function boot() {
  const stage = hero.querySelector('.stage');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('WebGLRenderingContext' in window)) { hero.classList.add('static'); return; }
  const io = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    start(stage).catch((e) => { console.warn('hero:', e); hero.classList.add('static'); });
  }, { rootMargin: '300px' });
  io.observe(hero);
}

// cubic-bezier(x1, y1, x2, y2) as a function of time, for the same easing curves E2's CSS uses.
const bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (t) => {
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * u + bx) * u + cx) * u - t, d = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    u = Math.min(1, Math.max(0, u));
    return ((ay * u + by) * u + cy) * u;
  };
};
const glideEase = bezier(.65, 0, .35, 1), liftEase = bezier(.22, 1, .36, 1);
const GLIDE = 2800, DWELL = 7000, LIFT = 450, ORBIT = 16500;

async function start(stage) {
  // three.js r160, served from assets/hero/three/ through the page's import map
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const here = (path) => new URL(path, import.meta.url).href;

  let raf = 0, prev = 0, last = 0, dirty = true;   // frame loop state (see the loop below); textures can land early
  // The browser's own antialiasing is 4× multisampling, and it was the biggest single cost in GPU memory
  // (colour and depth, four times over). The scene renders into a 2× multisampled target instead and is copied
  // onto the canvas, which needs no depth of its own. The canvas is opaque paper, like the stage behind it.
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  renderer.domElement.className = 'gl3';
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  const PR = Math.min(devicePixelRatio || 1, 1.25);   // the table is drawn small; more pixels than this buy little
  renderer.setPixelRatio(PR);

  const css = getComputedStyle(document.documentElement), tok = (n) => new THREE.Color(css.getPropertyValue(n).trim());
  const ink = tok('--ink'), paper = tok('--paper'), accent = tok('--accent'), rule = tok('--rule'), white = new THREE.Color(0xffffff);
  renderer.setClearColor(paper, 1);
  const target = new THREE.WebGLRenderTarget(1, 1, { samples: 2, stencilBuffer: false }); target.texture.colorSpace = THREE.SRGBColorSpace;
  const copy = new THREE.ShaderMaterial({   // the target is sRGB, so samples come back linear: encode on the way out
    uniforms: { map: { value: target.texture } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = linearToOutputTexel(texture2D(map, vUv)); }',
  });
  const post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copy));
  const draw = () => { renderer.setRenderTarget(target); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(post, postCam); };
  const on = (base, c, t) => base.clone().lerp(c, t);   // like color-mix(c t%, base)

  // ---- Camera. Table px in, three's y-up screen px out, exactly as the CSS composes it: the tilt's origin
  // (550, 700) sits at the stage centre; the eye is 2400 px in front of the stage at 50% 10%.
  const scene = new THREE.Scene(), root = new THREE.Group(), camera = new THREE.PerspectiveCamera();
  root.matrixAutoUpdate = false; scene.add(root);
  const readS = () => parseFloat(getComputedStyle(stage).getPropertyValue('--s')) || .64;
  let W = 0, H = 0, s = readS();
  // Images come in two sizes cut to how they're drawn (site/hero.mjs): desktop at --s 0.64, phones at 0.36.
  const cut = cutFor(s);
  const M4 = () => new THREE.Matrix4(), R = Math.PI / 180;
  const layout = () => {
    W = stage.clientWidth; H = stage.clientHeight; s = readS();
    root.matrix.copy(M4().makeScale(1, -1, 1).multiply(M4().makeTranslation(W / 2, H / 2, 0)).multiply(M4().makeRotationX(52 * R))
      .multiply(M4().makeRotationZ(-22 * R)).multiply(M4().makeScale(s, s, s)).multiply(M4().makeTranslation(-550, -700, 0)));
    root.matrixWorldNeedsUpdate = true;
    const P = 2400, ox = W / 2, oy = H * .1, n = 20;
    camera.position.set(ox, -oy, P); camera.updateMatrixWorld();
    camera.projectionMatrix.makePerspective(-ox * n / P, (W - ox) * n / P, oy * n / P, (oy - H) * n / P, n, P + 4000);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    renderer.setSize(W, H, false);
    target.setSize(Math.round(W * PR), Math.round(H * PR));
    for (const it of items) it.lift = it.liftPx / s;   // E2 lifts in screen px; the table here is scaled by s
    renderer.shadowMap.needsUpdate = true;
  };

  // ---- Materials and textures. Everything on the table is unlit, so the colours are the page's own.
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()), cache = new Map();
  const loader = new THREE.TextureLoader();
  const prep = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = aniso; return t; };
  const tex = (src) => {
    if (!cache.has(src)) cache.set(src, loader.loadAsync(here(`${cut}/${src}`)).then((t) => { invalidate(); return prep(t); }));
    return cache.get(src);
  };
  const basic = (color, more = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...more });
  const M = {
    border: basic(rule), white: basic(white), shadow: basic(on(paper, ink, .07)), shadowUp: on(paper, ink, .1), shadowDown: on(paper, ink, .07),
    bar: basic(on(white, ink, .24)), lead: new THREE.LineBasicMaterial({ color: accent }), dotRing: basic(white), dot: basic(accent),
    ring: basic(accent), gap: basic(paper),
  };
  const fadeTex = (() => {   // the post's bottom fade: transparent to white at 85%
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, '#000'); gr.addColorStop(.85, '#fff'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
    const t = new THREE.CanvasTexture(c); t.flipY = false; return t;
  })();
  M.fade = basic(white, { alphaMap: fadeTex, transparent: true, depthWrite: false });

  const roundRect = (w, h, r) => {
    const p = new THREE.Shape();
    p.moveTo(r, 0); p.lineTo(w - r, 0); p.quadraticCurveTo(w, 0, w, r); p.lineTo(w, h - r); p.quadraticCurveTo(w, h, w - r, h);
    p.lineTo(r, h); p.quadraticCurveTo(0, h, 0, h - r); p.lineTo(0, r); p.quadraticCurveTo(0, 0, r, 0);
    return new THREE.ShapeGeometry(p, 3);
  };
  // A rectangle in table px (y down), lying on the table at height z.
  const rect = (parent, x, y, w, h, z, mat, r = 0) => {
    const m = new THREE.Mesh(r ? roundRect(w, h, r) : new THREE.PlaneGeometry(w, h).translate(w / 2, h / 2, 0), mat);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const image = (parent, x, y, w, h, z, src) => {
    const mat = basic(white); tex(src).then((t) => { mat.map = t; mat.needsUpdate = true; });
    return rect(parent, x, y, w, h, z, mat);
  };
  // Greeked labels: E2 draws its 10 px uppercase mono labels as bars; same width, same band.
  const meas = document.createElement('canvas').getContext('2d');
  const barW = (text) => { meas.font = '400 10px "Martian Mono", ui-monospace, monospace'; return meas.measureText(text.toUpperCase()).width + text.length * .5; };
  const bar = (parent, x, y, text, z, center = false) => { const w = barW(text); return rect(parent, center ? x - w / 2 : x, y + 3.9, w, 5.7, z, M.bar, 1); };

  // ---- Items: anything that lifts on hover. The group lifts; the hard shadow stays on the table and slides out.
  const items = [];
  const item = (parent, x, y, w, h, { liftPx = 18, shadow = true } = {}) => {
    const g = new THREE.Group(); g.position.set(x, y, 0); parent.add(g);
    const it = { g, x, y, w, h, liftPx, lift: 0, t: 0, to: 0, from: 0, t0: 0, hits: [], sh: null, onLift: null };   // lift: set by layout()
    if (shadow) { it.sh = rect(parent, 0, 0, 1, 1, .2, M.shadow.clone()); placeShadow(it, 0); }
    items.push(it); return it;
  };
  // E2's shadow: -10px 14px, spread -2 at rest; -22px 30px, spread -6 (and darker) when lifted.
  const placeShadow = (it, e) => {
    const dx = -10 - 12 * e, dy = 14 + 16 * e, sp = 2 + 4 * e;
    it.sh.position.set(it.x + dx + sp, it.y + dy + sp, .2); it.sh.scale.set(it.w - 2 * sp, it.h - 2 * sp, 1);
    it.sh.material.color.copy(M.shadowDown).lerp(M.shadowUp, e);
  };
  const card = (parent, x, y, w, h, opts) => {   // white card with E2's 1 px rule border, 4 px corners
    const it = item(parent, x, y, w, h, opts);
    it.hits.push(rect(it.g, 0, 0, w, h, .4, M.border, 4)); rect(it.g, 1, 1, w - 2, h - 2, .5, M.white, 3);
    return it;
  };
  const FW = FIG.w - 14;   // image width inside a figure card (6 px padding, 1 px border)

  // ---- One cluster: the video, the deck, the post with its fade and tag, the figures and their leaders, and
  // for Sunny the room. Clusters sit PITCH apart; the first repeats at the end so the glide can wrap.
  const N = CLUSTERS.length, inst = [], videos = [];
  for (const c of CLUSTERS) {   // one video and one material per example, shared by its copy
    const v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, preload: 'none', crossOrigin: 'anonymous' });
    const mat = basic(white); tex(c.still).then((t) => { if (!mat.map) { mat.map = t; mat.needsUpdate = true; } });
    const vt = prep(new THREE.VideoTexture(v));
    v.addEventListener('playing', () => { mat.map = vt; mat.needsUpdate = true; });
    videos.push({ v, mat, src: here(c.video) });
  }
  const plane = new THREE.Group(); root.add(plane);
  const rooms = [];
  [...CLUSTERS, CLUSTERS[0]].forEach((c, i) => {
    const g = new THREE.Group(); g.position.x = i * PITCH; plane.add(g);
    const me = { g, i, ring: null, room: null };
    // Video
    const vh = FW * 9 / 16, vid = card(g, VIDEO.x, VIDEO.y, VIDEO.w, vh + 36);
    vid.hits.push(rect(vid.g, 7, 7, FW, vh, .6, videos[i % N].mat)); bar(vid.g, 7, 7 + vh + 9, 'Video · ' + c.name, .6);
    me.ring = new THREE.Group(); vid.g.add(me.ring);
    rect(me.ring, -5, -5, VIDEO.w + 10, vh + 46, .3, M.ring, 7); rect(me.ring, -3, -3, VIDEO.w + 6, vh + 42, .35, M.gap, 6);
    // Deck: three slides fanned; pointing at it fans them further.
    const deck = item(g, DECK.x, DECK.y, 300, 228, { shadow: false }), slideH = DECK.slide * 9 / 16, slides = [];
    c.deck.forEach((d, k) => {
      const sg = new THREE.Group(); sg.position.set(k * 26, k * 18, 1 + k * 1.5); deck.g.add(sg);
      rect(sg, -6, 12, DECK.slide - 4, slideH - 4, 0, M.shadow); deck.hits.push(rect(sg, 0, 0, DECK.slide, slideH, .3, M.border, 3));   // shadow: -8px 10px, spread -2
      image(sg, 1, 1, DECK.slide - 2, slideH - 2, .6, d); slides.push(sg);
    });
    bar(deck.g, 0, 196, 'Deck · slides and a PDF', .6);
    deck.onLift = (e) => slides.forEach((sg, k) => sg.position.set(k * (26 + 18 * e), k * (18 + 12 * e), 1 + k * 1.5));
    // Post
    const post = card(g, POST.x, 0, POST.w, POST.h, { liftPx: 10 });
    image(post.g, 1, 1, POST.w - 2, (POST.w - 2) * 1800 / 440, .6, c.post);
    rect(post.g, 1, POST.h * .7, POST.w - 2, POST.h * .3 - 1, .7, M.fade);
    bar(post.g, POST.w / 2, POST.h - 25, 'Post · ' + c.name, .8, true);
    // Figures, with a leader from where each sits in the post
    for (const f of c.figs) {
      const ih = FW * f.h / f.w, fig = card(g, FIG.x, f.top, FIG.w, ih + 36);
      image(fig.g, 7, 7, FW, ih, .6, f.src); bar(fig.g, 7, 7 + ih + 9, f.label, .6);
      const y1 = Math.round(f.at * POST.h), y2 = f.top + Math.round(FIG.w * f.h / f.w / 2), x1 = POST.x + POST.w;
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([[x1, y1], [FIG.x - 26, y1], [FIG.x - 26, y2], [FIG.x - 4, y2]].map(([x, y]) => new THREE.Vector3(x, y, .3))), M.lead));
      const dot = new THREE.Group(); dot.position.set(x1, y1, 1.2); g.add(dot);
      const core = new THREE.Mesh(new THREE.CircleGeometry(3, 20), M.dot); core.position.z = .1;
      dot.add(new THREE.Mesh(new THREE.CircleGeometry(5, 20), M.dotRing), core);
    }
    if (c.room) {
      me.room = item(g, ROOM.x, ROOM.y, ROOM.w, ROOM.h, { shadow: false }); rooms.push(me);
      me.room.onLift = () => { renderer.shadowMap.needsUpdate = true; };   // its cast shadow stays on the table
      bar(me.room.g, 0, ROOM.h + 84, 'Prop · the Reception Lounge', .6);
    }
    inst.push(me);
  });

  // ---- The room: the Blender model, its orbiting camera, and one sun whose shadow falls on the table.
  const sun = new THREE.DirectionalLight(0xffffff, 1.15), sunT = new THREE.Object3D();
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005; sun.target = sunT;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e8e4, 2.1));
  const shadowMat = new THREE.ShadowMaterial({ color: ink, opacity: .11 });
  let orbitT = 0;
  const cams = [];
  const modelReady = new GLTFLoader().loadAsync(here('room.glb')).then((gltf) => {
    const src = gltf.scene, box = new THREE.Box3().setFromObject(src), size = box.getSize(new THREE.Vector3());   // metres
    const Wm = size.x - .24, Dm = size.z - .24, K = ROOM.w / Wm;   // metres to table px; the slab overhangs the walls by 0.12 m
    src.traverse((o) => {
      if (!o.isMesh) return;
      o.material = new THREE.MeshLambertMaterial({ color: o.material.color.clone() });
      o.castShadow = true;
      o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: .42 })));
    });
    // (x, height, depth) in metres → (x, y down the table, z up off it) in px, centred on the room's box
    const place = M4().makeTranslation(ROOM.w / 2, ROOM.h / 2, 0).multiply(M4().makeScale(K, K, K))
      .multiply(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1))
      .multiply(M4().makeTranslation(-(box.min.x + .12) - Wm / 2, -box.min.y, -(box.min.z + .12) - Dm / 2));
    for (const r of rooms) {
      const m = src.clone(true); m.matrixAutoUpdate = false; m.matrix.copy(place); r.room.g.add(m);
      m.traverse((o) => { if (o.isMesh) r.room.hits.push(o); });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(760, 700).translate(ROOM.x + ROOM.w / 2, ROOM.y + ROOM.h / 2, 0), shadowMat); floor.receiveShadow = true;
      floor.position.z = .15; r.g.add(floor);
      // The camera's orbit: a dashed ring on the table and the camera riding 120 px above it.
      const rig = new THREE.Group(); rig.position.set(ROOM.w / 2, ROOM.h / 2, 0); r.room.g.add(rig);
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([...Array(120)].map((_, k) => new THREE.Vector3(Math.cos(k / 120 * Math.PI * 2) * 180, Math.sin(k / 120 * Math.PI * 2) * 180, .5))),
        new THREE.LineDashedMaterial({ color: accent, dashSize: 2.3, gapSize: 6.4 }));
      ring.computeLineDistances(); rig.add(ring);
      const cam = new THREE.Group(); rig.add(cam);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(6.9, 20, 14), basic(accent)), halo = new THREE.Mesh(new THREE.SphereGeometry(9.6, 20, 14), basic(white, { side: THREE.BackSide }));
      dot.position.z = halo.position.z = 120;
      const spot = new THREE.Mesh(new THREE.CircleGeometry(6, 20), basic(ink, { transparent: true, opacity: .18, depthWrite: false })); spot.position.z = .6;
      const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, .6), new THREE.Vector3(0, 0, 109)]),
        new THREE.LineDashedMaterial({ color: accent, dashSize: 1.8, gapSize: 3.7, transparent: true, opacity: .55 }));
      drop.computeLineDistances(); cam.add(dot, halo, spot, drop); cams.push(cam);
    }
  });
  // The sun stands with whichever room is in view (the real one or the wrap's copy), up and to the viewer's left.
  const lightRoom = (r) => {
    const x = ROOM.x + ROOM.w / 2, y = ROOM.y + ROOM.h / 2, m = 46;   // m: table px per metre, near enough
    r.g.add(sun, sunT); sunT.position.set(x, y, 0); sun.position.set(x - 4 * m, y + 5 * m, 9 * m);
    const e = 520 * s; Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 4000 }); sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  };

  // ---- The camera's glide, the chip, the pager and the videos: the same timing as E2.
  const stops = [...hero.querySelectorAll('.stops button')], typed = hero.querySelector('.req .typed');
  let idx = 0, from = 0, to = 0, g0 = -1, timer = 0, typing = 0, live = false, visible = false;
  const type = (text) => {
    if (typed.textContent === text) return;
    clearInterval(typing); let n = 0; typed.textContent = '';
    typing = setInterval(() => { n = Math.min(text.length, n + 2); typed.textContent = text.slice(0, n); if (n === text.length) clearInterval(typing); }, 45);
  };
  const active = () => {
    const k = idx % N;
    stops.forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
    type(CLUSTERS[k].brief);
    inst.forEach((m) => { m.ring.visible = m.i === idx; });
    videos.forEach((o, i) => {
      if (i === k && live) { if (!o.v.src) o.v.src = o.src; o.v.play().catch(() => {}); } else if (!o.v.paused) o.v.pause();
    });
    const r = rooms.find((m) => m.i === idx) || rooms[0]; if (sun.parent !== r.g) lightRoom(r);
  };
  let dur = GLIDE;   // a glide's length: the full 2.8 s, or shorter when a swipe lets go
  const slideAt = (now) => {
    if (g0 < 0) return to;
    const p = Math.min(1, (now - g0) / dur);
    if (p < 1) return from + (to - from) * glideEase(p);
    g0 = -1;
    if (idx === N) { idx = 0; to = 0; active(); }   // the copy is in view: snap back to the real first cluster
    return to;
  };
  const go = (i, ms = GLIDE) => { from = slideAt(performance.now()); to = i * PITCH; idx = i; dur = ms; g0 = performance.now(); active(); kick(); };
  const schedule = () => { clearInterval(timer); if (live) timer = setInterval(() => go(idx + 1), DWELL); };
  stops.forEach((b, i) => b.addEventListener('click', () => { go(i); schedule(); }));

  // ---- Swipe: drag the table sideways to the next or previous example. The stage keeps vertical page
  // scrolling (touch-action: pan-y in the CSS); a drag that starts mostly sideways takes the table with the
  // finger, and letting go glides on to the nearest example, or the next one if it was flicked.
  let drag = null;
  const along = (dx) => dx / (s * Math.cos(22 * R));   // screen px to table px along the table's length, near enough
  stage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button > 0 || !live) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, base: 0, on: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      drag.on = true; clearInterval(timer);
      try { stage.setPointerCapture(drag.id); } catch {}   // keeps the drag when the finger leaves the stage
      drag.base = slideAt(performance.now()); g0 = -1;
      if (drag.base < PITCH / 2 && dx > 0) { drag.base += N * PITCH; idx = N; active(); }   // back from the first: use its copy at the end
      ptrIn = false; ptrDirty = true;
    }
    to = Math.min(N * PITCH, Math.max(0, drag.base - along(dx)));
    const dt = e.timeStamp - drag.lt;
    if (dt > 0) { drag.v = .7 * drag.v + .3 * (e.clientX - drag.lx) / dt; drag.lx = e.clientX; drag.lt = e.timeStamp; }
    kick();
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.on) return;
    const at = to / PITCH, flick = Math.abs(d.v) > .3;
    let i = flick ? (d.v < 0 ? Math.floor(at + .02) + 1 : Math.ceil(at - .02) - 1) : Math.round(at);
    i = Math.min(N, Math.max(0, i));
    go(i, 650 + 250 * Math.abs(i - at)); schedule();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  // ---- Hover: a ray from the pointer picks the item under it, which lifts with E2's easing.
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let ptrIn = false, ptrDirty = false;
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || drag?.on) return;   // a finger drags the table; it doesn't hover
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ptrIn = true; ptrDirty = true; kick();
  });
  stage.addEventListener('pointerleave', () => { ptrIn = false; ptrDirty = true; kick(); });
  const hover = (now) => {
    ptrDirty = false;
    let hit = null;
    if (ptrIn) {
      ray.setFromCamera(ptr, camera);
      let best = Infinity;
      for (const it of items) for (const m of ray.intersectObjects(it.hits, false)) if (m.distance < best) { best = m.distance; hit = it; }
    }
    for (const it of items) {
      const want = it === hit ? 1 : 0;
      if (it.to !== want) { it.from = it.t; it.to = want; it.t0 = now; }
    }
  };

  // ---- The frame loop: render when something moved, when asked, or at 30 fps while live.
  function invalidate() { dirty = true; kick(); }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const dt = prev ? Math.min(100, now - prev) : 0; prev = now;
    if (ptrDirty) hover(now);
    let moving = g0 >= 0 || !!drag?.on;
    plane.position.x = -slideAt(now);
    for (const it of items) {
      if (it.t === it.to) continue;
      const p = Math.min(1, (now - it.t0) / LIFT), e = it.from + (it.to - it.from) * liftEase(p);
      it.t = p >= 1 ? it.to : e; it.g.position.z = it.lift * it.t;
      if (it.sh) placeShadow(it, it.t);
      if (it.onLift) it.onLift(it.t);
      moving = true;
    }
    if (live) {
      orbitT += dt;
      const a = orbitT / ORBIT * Math.PI * 2 + .35;
      for (const c of cams) c.position.set(Math.cos(a) * 180, Math.sin(a) * 180, 0);
    }
    if (moving || dirty || (live && now - last >= 33)) {
      draw(); last = now; dirty = false;
    }
    if (live || moving) kick(); else prev = 0;
  }

  const update = () => {
    const was = live; live = visible && !document.hidden;
    if (live === was) return;
    if (live) { prev = 0; active(); schedule(); kick(); } else { clearInterval(timer); videos.forEach((o) => o.v.pause()); }
  };
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; update(); }, { threshold: .15 }).observe(hero);
  document.addEventListener('visibilitychange', update);
  new ResizeObserver(() => { layout(); invalidate(); }).observe(stage);

  // Ready once the model and the first cluster's images are in: then the canvas fades in over the poster.
  layout();
  const first = CLUSTERS[0];
  await Promise.all([modelReady, tex(first.post), tex(first.still), ...first.figs.map((f) => tex(f.src)), ...first.deck.map(tex)]);
  stage.prepend(renderer.domElement);
  lightRoom(rooms[0]); active(); draw(); hero.classList.add('ready');
}
