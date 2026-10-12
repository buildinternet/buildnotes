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
//   --caption           include the figure's caption
//   --pad <px>          page background around the figure; default 16
//   --transparent       for --svg: no background rectangle
//   --frames            for GIF and video: keep the PNG frames next to the output
//
// GIF and video need ffmpeg. Frames are stepped, not recorded: motion is paused and moved to each
// frame's time, so frames are even and the loop closes without a jump. Needs Chrome (set CHROME_PATH
// if it isn't found).

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openPage } from "./chrome.mjs";

const argv = process.argv.slice(2);
const has = (k) => argv.includes(`--${k}`);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const file = argv.find((a, i) => !a.startsWith("--") && !(argv[i - 1]?.startsWith("--") && !["--list", "--png", "--gif", "--mp4", "--webm", "--svg", "--caption", "--transparent", "--frames"].includes(argv[i - 1])));
const format = ["png", "gif", "mp4", "webm", "svg"].find(has);
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

// In the page: the visual figures in order (not code or terminal blocks, not figures nested in another).
const FIGURES = `[...document.querySelectorAll("figure")].filter((f) => !f.parentElement.closest("figure") && !f.classList.contains("code") && !f.closest("details"))`;
const KIND = `(f) => { const el = f.querySelector(".flow, .steps, .bars, .delta, .line-box, .options, .matrix, .strip-box, .diagram, .timeline, img, video"); return !el ? "figure" : el.matches("img, video") ? "image" : el.classList[0].replace("-box", ""); }`;

const page = await openPage(pathToFileURL(resolve(file)).href, { width, height: 900, scale, theme });
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

  // Freeze all motion, and a way to move it to any moment.
  await page.evaluate(`window.__seek = (t) => {
    document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(t); });
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; });
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))));
  }; true`);
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
  const durs = await page.evaluate(`[
    ...[...window.__target.querySelectorAll("animate, animateMotion, animateTransform")].map((a) => parseFloat(a.getAttribute("dur"))),
    ...window.__target.getAnimations({ subtree: true }).map((a) => a.effect.getTiming().duration / 1000),
  ].filter((d) => d > 0)`);
  let seconds = Number(opt("seconds") ?? 0);
  if (!seconds) {
    if (!durs.length) await done(1, "nothing in this figure moves; export it with --png");
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const tenths = [...new Set(durs.map((d) => Math.round(d * 10)))];
    const lcm = tenths.reduce((a, b) => (a * b) / gcd(a, b));
    seconds = lcm <= 120 ? lcm / 10 : Math.max(...tenths) / 10;
  }
  const count = Math.max(2, Math.round(seconds * fps));
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) await done(1, "GIF and video need ffmpeg (brew install ffmpeg); --png works without it");

  const frames = mkdtempSync(join(tmpdir(), "build-story-frames-"));
  for (let k = 0; k < count; k++) {
    await page.evaluate(`window.__seek(${(k / fps).toFixed(4)})`);
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
