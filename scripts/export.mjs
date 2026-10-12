#!/usr/bin/env node
// export.mjs — export one figure from a post as a still image, a GIF, a video, or a standalone SVG,
// for slides, social posts or another blog.
//
// Usage:
//   node export.mjs <post.html> --list                         number the figures, with their kind and caption
//   node export.mjs <post.html> --figure 2 --png               the resting frame (what reduced-motion readers see)
//   node export.mjs <post.html> --figure 2 --gif               one full loop of the motion
//   node export.mjs <post.html> --figure 2 --mp4 | --webm      the same loop as video
//   node export.mjs <post.html> --figure 2 --svg               the drawing alone, styles inlined (flow and hand-drawn SVG)
//
// Options:
//   --select <css>      export this element instead of a numbered figure
//   --out <path>        default: <post dir>/export/fig-<n>.<ext>
//   --theme light|dark  default light
//   --width <px>        page width; 390 gives the phone layout (a flow's stacked drawing). Default 1280
//   --scale <n>         pixel density; default 2 (1 for GIFs, to keep them small)
//   --fps <n>           frames per second for GIF and video; default 30 (20 for GIFs)
//   --seconds <s>       length of the loop; default: found from the figure's own animations
//   --at <s>            for --png: the moment to freeze; default 0
//   --from <s>          for GIF and video: start the loop this far in (after a figure settles); default 0
//   --click <css>       click this element first, as a reader would (a "Run" or "Ignite" button);
//                       repeat it for several clicks, in order
//   --caption           include the figure's caption
//   --pad <px>          page background around the figure; default 16
//   --transparent       for --svg: no background rectangle
//   --frames            for GIF and video: keep the PNG frames next to the output
//
// GIF and video need ffmpeg. Frames are stepped, not recorded: SVG and CSS motion is paused and moved
// to each frame's time, and the page's scripts run on a virtual clock (requestAnimationFrame,
// performance.now, Date, timers) that only moves when the exporter moves it, so canvas and WebGL
// animations step the same way. Frames are even and the loop closes without a jump. A canvas can't
// report its loop length: declare it with data-loop="<seconds>" on the figure or canvas, or pass
// --seconds. Needs Chrome (set CHROME_PATH if it isn't found).

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openPage } from "./chrome.mjs";

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const FORMATS = ["png", "gif", "mp4", "webm", "svg"];
const SWITCHES = ["list", ...FORMATS, "caption", "transparent", "frames"].map((k) => `--${k}`);
const file = argv.find((a, i) => !a.startsWith("--") && !(argv[i - 1]?.startsWith("--") && !SWITCHES.includes(argv[i - 1])));
const format = FORMATS.find(has);
if (!file || (!has("list") && !format) || has("help")) {
  console.error("usage: export.mjs <post.html> --list | (--figure N | --select css) (--png | --gif | --mp4 | --webm | --svg) [options]; see the header for options");
  process.exit(has("help") ? 0 : 2);
}

const gif = format === "gif";
const width = Number(opt("width") ?? 1280);
const scale = Number(opt("scale") ?? (gif ? 1 : 2));
const fps = Number(opt("fps") ?? (gif ? 20 : 30));
const pad = Number(opt("pad") ?? 16);
const theme = opt("theme") ?? "light";
const figure = Number(opt("figure") ?? 1);
const clicks = argv.flatMap((a, i) => (a === "--click" && argv[i + 1] ? [argv[i + 1]] : []));
const from = Number(opt("from") ?? 0);

// In the page: the visual figures in order (not code or terminal blocks, not figures nested in another).
const FIGURES = `[...document.querySelectorAll("figure")].filter((f) => !f.parentElement.closest("figure") && !f.classList.contains("code") && !f.closest("details"))`;
const KIND = `(f) => { const el = f.querySelector(".flow, .steps, .bars, .delta, .line-box, .options, .matrix, .strip-box, .diagram, .timeline, img, video"); return !el ? "figure" : el.matches("img, video") ? "image" : el.classList[0].replace("-box", ""); }`;

// Frames (PNG, GIF, video) run the page on a virtual clock, so script-driven motion (canvas, WebGL)
// steps exactly like SVG and CSS motion.
const frameFormat = format && format !== "svg";
const page = await openPage(pathToFileURL(resolve(file)).href, { width, height: 900, scale, theme, init: frameFormat ? `(${virtualClock})()` : undefined });
const done = async (code, msg) => { if (msg) console.error(msg); await page.close(); process.exit(code); };

try {
  if (has("list")) {
    const list = await page.evaluate(`${FIGURES}.map((f, i) => ({ n: i + 1, kind: (${KIND})(f), caption: (f.querySelector("figcaption")?.textContent ?? "").trim().replace(/\\s+/g, " ").slice(0, 70) }))`);
    if (!list.length) await done(1, "no figures to export");
    for (const f of list) console.log(`${String(f.n).padStart(2)}  ${f.kind.padEnd(8)} ${f.caption}`);
    await done(0);
  }

  // The element to export: the component inside the figure (not the caption), unless --caption.
  const select = opt("select");
  const target = select
    ? `document.querySelector(${JSON.stringify(select)})`
    : `(() => { const f = ${FIGURES}[${figure - 1}]; if (!f) return null; return ${has("caption")} ? f : [...f.children].find((c) => c.tagName !== "FIGCAPTION" && !c.matches("details")) ?? f; })()`;
  const found = await page.evaluate(`(() => { const el = ${target}; if (!el) return null; window.__target = el; el.scrollIntoView({ block: "center" }); return true; })()`);
  if (!found) await done(1, select ? `nothing matches ${select}` : `there is no figure ${figure}; run with --list`);

  const out = resolve(opt("out") ?? join(dirname(resolve(file)), "export", `${select ? "selection" : `fig-${figure}`}.${format}`));
  mkdirSync(dirname(out), { recursive: true });

  if (format === "svg") {
    const svg = await page.evaluate(`(${standaloneSvg})(window.__target, ${has("transparent")})`);
    if (!svg) await done(1, "this figure has no SVG drawing; export it as --png, --gif or --mp4 instead");
    writeFileSync(out, svg);
    await done(0, `wrote ${out}`);
  }

  // Two real frames, so the compositor paints what the page just drew (WebGL included), and anything
  // that reacts to a scroll or click (an IntersectionObserver resuming a canvas) has done so.
  // Then freeze all motion, and add a way to move it to any moment.
  await page.evaluate(`window.__settle = () => {
    const raf = window.__clock?.realRAF ?? requestAnimationFrame;
    return new Promise((r) => raf(() => raf(() => r(true))));
  };
  window.__seek = (t) => {
    document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(t); });
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
    // Walk the clock there in 60 fps steps: a page that clamps the time between frames (most game
    // loops do) would barely move on one big jump.
    if (window.__clock) { while (t * 1000 - window.__clock.now > 1000 / 60) window.__clock.to(window.__clock.now + 1000 / 60); window.__clock.to(t * 1000); }
    return window.__settle();
  }; true`);
  // Clicks happen at time 0, before any frame, so what they start plays out on the virtual clock.
  for (const sel of clicks) {
    const ok = await page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) await done(1, `--click: nothing matches ${sel}`);
  }
  await page.evaluate("window.__settle()");
  // Show only the exported element: its neighbours (a caption, the next paragraph) keep their space
  // but don't paint into the margin. The page background still shows.
  await page.evaluate(`document.body.style.visibility = "hidden"; window.__target.style.visibility = "visible"; true`);
  const box = await page.evaluate(`(() => { const r = window.__target.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.ceil(box.width + 2 * pad), height: Math.ceil(box.height + 2 * pad) };

  if (format === "png") {
    await page.evaluate(`window.__seek(${Number(opt("at") ?? 0)})`);
    writeFileSync(out, await page.screenshot(clip));
    await done(0, `wrote ${out} (${Math.round(clip.width * scale)}×${Math.round(clip.height * scale)})`);
  }

  // One loop: the least common multiple of the figure's animation lengths (to 0.1 s), capped at 12 s.
  // A canvas can't report its loop: the page declares it with data-loop="<seconds>" on the figure,
  // the canvas or anything inside, or --seconds sets it.
  const durs = await page.evaluate(`[
    ...[window.__target.closest("[data-loop]"), ...window.__target.querySelectorAll("[data-loop]")].filter(Boolean).map((e) => parseFloat(e.dataset.loop)),
    ...[...window.__target.querySelectorAll("animate, animateMotion, animateTransform")].map((a) => parseFloat(a.getAttribute("dur"))),
    ...window.__target.getAnimations({ subtree: true }).map((a) => a.effect.getTiming().duration / 1000),
  ].filter((d) => d > 0)`);
  let seconds = Number(opt("seconds") ?? 0);
  if (!seconds) {
    if (!durs.length) {
      const canvas = await page.evaluate(`window.__target.matches("canvas") || !!window.__target.querySelector("canvas")`);
      await done(1, canvas ? 'this figure draws on a canvas, which can\'t report its loop length: set data-loop="<seconds>" on it, or pass --seconds' : "nothing in this figure moves; export it with --png");
    }
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const tenths = [...new Set(durs.map((d) => Math.round(d * 10)))];
    const lcm = tenths.reduce((a, b) => (a * b) / gcd(a, b));
    seconds = lcm <= 120 ? lcm / 10 : Math.max(...tenths) / 10;
  }
  const count = Math.max(2, Math.round(seconds * fps));
  const missed = await page.evaluate(`[...(window.__clock?.missed ?? []), ...(window.__target.querySelector("video") ? ["a <video>"] : [])]`);
  if (missed.length) console.error(`! this page uses ${missed.join(" and ")}, which runs on real time; those parts may step unevenly`);
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) await done(1, "GIF and video need ffmpeg (brew install ffmpeg); --png works without it");

  const frames = mkdtempSync(join(tmpdir(), "build-story-frames-"));
  for (let k = 0; k < count; k++) {
    await page.evaluate(`window.__seek(${(from + k / fps).toFixed(4)})`);
    writeFileSync(join(frames, `frame-${String(k).padStart(4, "0")}.png`), await page.screenshot(clip));
  }
  const input = ["-framerate", String(fps), "-i", join(frames, "frame-%04d.png")];
  const even = "pad=ceil(iw/2)*2:ceil(ih/2)*2";
  const args = {
    gif: [...input, "-vf", "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0"],
    mp4: [...input, "-vf", even, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart"],
    webm: [...input, "-vf", even, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-pix_fmt", "yuv420p"],
  }[format];
  const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args, out], { encoding: "utf8" });
  if (run.status !== 0) { rmSync(frames, { recursive: true, force: true }); await done(1, `ffmpeg failed: ${run.stderr.trim().split("\n").pop()}`); }
  if (has("frames")) {
    const keep = out.replace(/\.\w+$/, "-frames");
    if (existsSync(keep)) rmSync(keep, { recursive: true, force: true });
    renameSync(frames, keep);
  } else rmSync(frames, { recursive: true, force: true });
  await done(0, `wrote ${out} (${count} frames, ${seconds} s at ${fps} fps, ${Math.round(clip.width * scale)}×${Math.round(clip.height * scale)})`);
} catch (err) {
  await done(1, `export.mjs: ${err.message}`);
}

// Runs in the page before its own scripts: time stands still until the exporter moves it.
// requestAnimationFrame, performance.now, Date and timers all read this clock; __clock.to(ms) runs the
// timers that fall due, in order, then one round of animation frames. Workers, OffscreenCanvas and
// <video> keep real time; the clock records the first two in __clock.missed so the exporter can warn.
function virtualClock() {
  const realRAF = window.requestAnimationFrame.bind(window);
  const RealDate = Date;
  const epoch = RealDate.now();
  let now = 0;
  let rafs = new Map();
  let rafId = 0;
  const timers = new Map();
  let timerId = 0;
  window.requestAnimationFrame = (cb) => { rafs.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafs.delete(id); };
  performance.now = () => now;
  function VirtualDate(...a) {
    if (!new.target) return new RealDate(epoch + now).toString();
    return a.length ? new RealDate(...a) : new RealDate(epoch + now);
  }
  VirtualDate.prototype = RealDate.prototype;
  VirtualDate.now = () => epoch + now;
  VirtualDate.parse = RealDate.parse;
  VirtualDate.UTC = RealDate.UTC;
  window.Date = VirtualDate;
  window.setTimeout = (cb, ms = 0, ...args) => { timers.set(++timerId, { cb, args, at: now + Math.max(0, Number(ms) || 0), every: 0 }); return timerId; };
  window.setInterval = (cb, ms = 0, ...args) => { const every = Math.max(1, Number(ms) || 0); timers.set(++timerId, { cb, args, at: now + every, every }); return timerId; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  const missed = new Set();
  if (window.Worker) window.Worker = new Proxy(window.Worker, { construct(T, a) { missed.add("a Web Worker"); return new T(...a); } });
  const transfer = HTMLCanvasElement.prototype.transferControlToOffscreen;
  if (transfer) HTMLCanvasElement.prototype.transferControlToOffscreen = function () { missed.add("an OffscreenCanvas"); return transfer.call(this); };
  const call = (fn, ...a) => { try { if (typeof fn === "function") fn(...a); } catch (err) { console.error(err); } };
  window.__clock = {
    realRAF,
    missed,
    get now() { return now; },
    to(t) {
      for (let guard = 0; guard < 10000; guard++) {
        let next = null;
        for (const [id, x] of timers) if (x.at <= t && (!next || x.at < next[1].at)) next = [id, x];
        if (!next) break;
        const [id, x] = next;
        now = Math.max(now, x.at);
        if (x.every) x.at += x.every; else timers.delete(id);
        call(x.cb, ...x.args);
      }
      now = Math.max(now, t);
      const due = rafs;
      rafs = new Map();
      for (const cb of due.values()) call(cb, now);
    },
  };
}

// Runs in the page: the visible <svg> inside el, cloned with its computed styles written onto each
// element, so it renders the same outside the page. Motion carries over: SMIL as is, and the marching
// dashes as a small <style>.
function standaloneSvg(el, transparent) {
  const svg = [...(el.matches("svg") ? [el] : el.querySelectorAll("svg"))].find((s) => s.getBoundingClientRect().width > 0);
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  const PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "paint-order", "font-family", "font-size", "font-weight", "font-style", "letter-spacing"];
  const src = [svg, ...svg.querySelectorAll("*")];
  const dst = [clone, ...clone.querySelectorAll("*")];
  src.forEach((node, i) => {
    if (i === 0 || ["title", "desc", "defs", "marker", "animateMotion", "animate", "mpath"].includes(node.tagName)) return;
    const cs = getComputedStyle(node);
    dst[i].setAttribute("style", PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";"));
  });
  const [, , w, h] = svg.getAttribute("viewBox").split(/\s+/).map(Number);
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = "@keyframes march { to { stroke-dashoffset: -20; } } .route { animation: march 1.2s linear infinite; } @media (prefers-reduced-motion: reduce) { .route { animation: none; } }";
  clone.insertBefore(style, clone.firstChild);
  if (!transparent) {
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", getComputedStyle(document.body).backgroundColor);
    clone.insertBefore(bg, style.nextSibling);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}\n`;
}
