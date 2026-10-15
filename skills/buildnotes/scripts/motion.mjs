#!/usr/bin/env node
// motion.mjs — a build story's motion cut: the post cut down to a short reel that plays itself,
// built from a scene script, as one self-contained page and, on request, a video.
//
// Usage:
//   node motion.mjs <motion.json>                      check the script, write motion.html next to it
//   node motion.mjs <motion.json> --mp4 | --webm | --gif   and export the reel to <dir>/export/motion.<ext>
//   node motion.mjs <motion.json> --poster [--at <s>]  and one still frame as PNG (default: the end of the first scene)
//   node motion.mjs <motion.json> --gif --scene 5 --size 720   one scene as a short clip, for a README or a reply
//   node motion.mjs <motion.json> --check              check the script only; exit 1 on an error
//
// Options:
//   --out <page.html>   default: motion.html next to the script
//   --theme light|dark  for the export; default light
//   --fps <n>           for the export; default 30 (15 for a GIF)
//   --scene <n>         export scene n alone (from 1), to <dir>/export/motion-scene-<n>.<ext>; with --poster, its last frame
//   --size <px>         width of the export; default 1920 (960 for a GIF). Height follows at 16:9
//   --no-render         skip the headless pass that checks every scene's text fits the frame
//
// The script format and the scene kinds are in references/motion.md. Each scene's length comes from its
// kind and from how long its words take to read; a "dur" in the script overrides it. Image paths are
// relative to the script, and the page embeds them. The page is assets/motion.html with the script filled
// in. Video is 1920×1080: export.mjs steps the stage frame by frame on a virtual clock, so it needs Chrome
// and ffmpeg. Warnings go to stderr.

import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, "../assets/motion.html");
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
// Footage a clip scene can play: a GIF or a video, turned into one sprite sheet of frames at build time.
const FOOTAGE = [".gif", ".mp4", ".webm", ".mov"];
export const COLORS = ["green", "blue", "red", "yellow", "gray", "accent", "dim"];
export const ICONS = ["grid", "play", "mail", "check", "clock", "code", "bolt"];
// The screen is 64rem (1024 px) wide on a 1280 px page; this scale makes the exported stage 1920×1080.
const EXPORT = { width: 1280, scale: 1920 / 1024 };

const words = (s) => String(s ?? "").replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
const round = (x) => Math.round(x * 10) / 10;

// The text a scene shows: its lines, which are read in full, and the rest (sub, labels, notes), which is skimmed.
function textOf(d) {
  const lines = [d.headline, ...(d.lines || []), d.before?.headline, d.after?.headline].filter(Boolean);
  const rest = [d.sub, d.foot, d.before?.tag, d.after?.tag, d.from?.say, d.to?.say];
  for (const it of d.items || []) rest.push(it.title, it.text);
  for (const r of d.regions || []) rest.push(r.say);
  for (const n of d.nodes || []) rest.push(n.text, n.small);
  for (const r of d.runs || []) rest.push(r.say);
  for (const p of d.pills || []) rest.push(typeof p === "string" ? p : p.text);
  return { lines: lines.join(" "), rest: rest.filter(Boolean).join(" ") };
}

// How long each kind's own motion takes, in seconds. These follow the timings in assets/motion.html.
const BASE = {
  title: () => 4.5,
  statement: (d) => 1.2 + (d.lines?.length || 1) * 2.3,
  list: (d) => 3.6 + (d.items?.length || 0) * 0.45,
  // Each region is held 2.2 s and the ring takes 0.9 s to move on; the last hold runs to the end.
  shot: (d) => 1.3 + Math.max(1, d.regions?.length || 0) * 3.1 + 0.2,
  swap: () => 6.6,
  // The footage plays once from 0.6 s, then holds its last frame for a moment.
  clip: (d) => 1.4 + Math.max(0, (d.to ?? 0) - (d.from ?? 0)) / (d.speed || 1),
  morph: () => 6.8,
  bars: (d) => 3.2 + (d.rows?.length || 0) * 0.4 + (d.cap ? 1.2 : 0),
  flow: (d) => 2.6 + (d.runs?.length || 1) * 2.8,
  end: () => 4.2,
};
export const KINDS = Object.keys(BASE);
// A viewer reads a line at about three and a half words a second and skims the rest at about five,
// after the text has had a second to arrive. Kickers, bar labels and tile names are scanned, not read.
export const readingTime = (d) => { const t = textOf(d); return 1 + words(t.lines) / 3.5 + words(t.rest) / 5; };

// Width and height of a PNG, JPEG, GIF or WebP, from its header.
export function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.toString("ascii", 0, 3) === "GIF") return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (chunk === "VP8L") { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
    if (chunk === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// Check a script and resolve it: each scene gets its length, each image its size.
// Returns { cut, errors, warnings, images } where images maps each path in the script to its file.
export function check(input, base) {
  const errors = [], warnings = [], images = {};
  const cut = structuredClone(input);
  const err = (i, m) => errors.push(i == null ? m : `scene ${i + 1}: ${m}`);
  const warn = (i, m) => warnings.push(i == null ? m : `scene ${i + 1}: ${m}`);
  if (!cut.title) err(null, `the script needs a "title" (the post's title)`);
  if (!Array.isArray(cut.scenes) || !cut.scenes.length) { err(null, `the script needs "scenes"`); return { cut, errors, warnings, images }; }
  const n = cut.scenes.length;
  if (n < 5 || n > 9) warn(null, `${n} scenes: a cut usually has 5 to 9 (a title, the problem, one scene per idea, how to try it)`);

  const image = (i, path, what) => {
    if (typeof path !== "string" || !path) { err(i, `${what} needs an image path`); return null; }
    if (/^(https?:|data:)/.test(path)) { err(i, `${what}: use a local file, not ${path.slice(0, 30)}`); return null; }
    const file = resolve(base, path);
    if (!TYPES[extname(file).toLowerCase()]) { err(i, `${what}: ${path} isn't a PNG, JPEG, WebP or GIF`); return null; }
    if (!existsSync(file)) { err(i, `${what}: no file at ${path}`); return null; }
    images[path] = file;
    const size = imageSize(readFileSync(file));
    if (!size) err(i, `${what}: can't read the size of ${path}`);
    return size;
  };
  const need = (i, d, ...keys) => keys.every((k) => (d[k] == null || d[k] === "" ? (err(i, `${d.kind} needs "${k}"`), false) : true));
  const count = (i, what, arr, lo, hi) => { if (!Array.isArray(arr) || arr.length < lo || arr.length > hi) { err(i, `${what}: ${lo} to ${hi} of them`); return false; } return true; };

  cut.scenes.forEach((d, i) => {
    if (!BASE[d.kind]) { err(i, `unknown kind "${d.kind}" (kinds: ${KINDS.join(", ")})`); return; }
    const heads = [d.headline, d.before?.headline, d.after?.headline, ...(d.lines || [])].filter(Boolean);
    for (const hd of heads) if (words(hd) > 12) warn(i, `"${hd.slice(0, 40)}…" is ${words(hd)} words; a scene is read at a glance, so keep a line to about 10`);
    if (/#\d+|\bPR\b|\bcommit\b/.test(Object.values(textOf(d)).join(" ") + " " + (d.kicker || ""))) warn(i, "names a PR, issue or commit; the cut is for people outside the team");
    switch (d.kind) {
      case "title": need(i, d, "headline"); break;
      case "statement": count(i, "statement lines", d.lines, 1, 3); break;
      case "list":
        need(i, d, "headline");
        if (count(i, "list items", d.items, 2, 4)) d.items.forEach((it, j) => {
          if (!it.title) err(i, `item ${j + 1} needs a "title"`);
          if (it.icon && !ICONS.includes(it.icon)) err(i, `item ${j + 1}: icon "${it.icon}" (icons: ${ICONS.join(", ")})`);
          if (it.img) image(i, it.img, `item ${j + 1}`);
        });
        break;
      case "shot": {
        need(i, d, "headline");
        const size = image(i, d.src, "shot");
        if (d.srcDark) image(i, d.srcDark, "shot (dark)");
        if (size) d.size = size;
        (d.regions || []).forEach((r, j) => {
          const [x, y, w, hh] = r.box || [];
          if (![x, y, w, hh].every(Number.isFinite)) err(i, `region ${j + 1} needs "box": [x, y, width, height] in image pixels`);
          else if (size && (x < 0 || y < 0 || x + w > size[0] + 1 || y + hh > size[1] + 1)) err(i, `region ${j + 1} runs off the ${size[0]}×${size[1]} image`);
        });
        if ((d.regions || []).length > 3) warn(i, `${d.regions.length} regions; two or three is plenty for one shot`);
        break;
      }
      case "clip": {
        need(i, d, "headline", "src");
        if (typeof d.src === "string") {
          const file = resolve(base, d.src);
          if (!FOOTAGE.includes(extname(file).toLowerCase())) err(i, `clip: ${d.src} isn't a GIF, MP4, WebM or MOV`);
          else if (!existsSync(file)) err(i, `clip: no file at ${d.src}`);
          else d.file = file;
        }
        const from = d.from ?? 0;
        if (!Number.isFinite(d.to) || !(d.to > from)) err(i, `clip needs "to", the second the clip ends at, after "from" (${from})`);
        else if ((d.to - from) / (d.speed || 1) > 15) warn(i, `the clip plays ${round((d.to - from) / (d.speed || 1))} s; trim it with "from" and "to", or raise "speed"`);
        if (d.speed != null && !(d.speed > 0 && d.speed <= 4)) err(i, `"speed" is a playback rate from above 0 to 4`);
        break;
      }
      case "swap": {
        need(i, d, "headline", "from", "to");
        const a = image(i, d.from?.src, "swap from"), b = image(i, d.to?.src, "swap to");
        if (a) d.size = a;
        if (a && b && Math.abs(a[0] / a[1] - b[0] / b[1]) > 0.01) warn(i, "the two images have different shapes; the wipe works best on two frames of one screen");
        break;
      }
      case "morph": {
        need(i, d, "before", "after");
        if (!d.before?.headline || !d.after?.headline) err(i, `morph needs "before" and "after", each with a "headline"`);
        if (count(i, "morph tiles", d.tiles, 2, 8)) d.tiles.forEach((t, j) => {
          if (!t.name) err(i, `tile ${j + 1} needs a "name"`);
          if (!(t.before > 0) || !(t.after > 0)) err(i, `tile ${j + 1} needs "before" and "after" sizes above 0`);
        });
        if (d.columns) {
          const flat = d.columns.flat().sort((a, b) => a - b);
          if (flat.join() !== (d.tiles || []).map((_, j) => j).join()) err(i, `"columns" must list each tile index once`);
        }
        for (const k of d.key || []) if (!COLORS.includes(k.color)) err(i, `key colour "${k.color}" (colours: ${COLORS.join(", ")})`);
        break;
      }
      case "bars":
        need(i, d, "headline");
        if (count(i, "bars rows", d.rows, 2, 7)) d.rows.forEach((r, j) => { if (!r.label || !Number.isFinite(r.value)) err(i, `row ${j + 1} needs a "label" and a numeric "value"`); });
        if (d.cap && !Number.isFinite(d.cap.value)) err(i, `"cap" needs a numeric "value"`);
        break;
      case "flow":
        need(i, d, "headline");
        if (count(i, "flow nodes", d.nodes, 2, 5)) d.nodes.forEach((nd, j) => { if (!nd.text) err(i, `node ${j + 1} needs "text"`); });
        if (d.runs && count(i, "flow runs", d.runs, 1, 3)) d.runs.forEach((r, j) => {
          if (r.to != null && !(r.to >= 1 && r.to < (d.nodes?.length || 0))) err(i, `run ${j + 1}: "to" is a node index from 1 to ${(d.nodes?.length || 1) - 1}`);
        });
        break;
      case "end": need(i, d, "headline"); break;
    }
    const motion = BASE[d.kind](d), read = readingTime(d);
    if (d.dur != null) {
      if (!(d.dur > 0)) err(i, `"dur" must be a number of seconds`);
      else if (d.dur < motion) warn(i, `dur ${d.dur} s cuts off the motion, which takes ${round(motion)} s`);
      else if (d.dur < read) warn(i, `dur ${d.dur} s is short for its words; about ${round(read)} s to read`);
    } else d.dur = round(Math.max(motion, read));
  });
  if (cut.scenes[0]?.kind !== "title") warn(null, `the first scene is usually a "title"`);
  if (cut.scenes.at(-1)?.kind !== "end") warn(null, `the last scene is usually an "end": how to try it`);
  const total = cut.scenes.reduce((a, d) => a + (d.dur || 0), 0);
  cut.total = round(total);
  if (total > 75) warn(null, `${Math.round(total)} s in all; aim for under a minute. Cut a scene before shortening the rest`);
  return { cut, errors, warnings, images };
}

const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The page: the template with the script and its images filled in, and the authoring notes dropped.
export function build(cut, images, template = readFileSync(TEMPLATE, "utf8")) {
  const assets = {};
  for (const [path, file] of Object.entries(images)) assets[path] = `data:${TYPES[extname(file).toLowerCase()]};base64,${readFileSync(file).toString("base64")}`;
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(cut.title)}</title>`)
    .replace(/<!--[\s\S]*?-->\n?/g, "")
    .replace(/(<script type="application\/json" id="assets">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json(assets) + b)
    .replace(/(<script type="application\/json" id="cut">)[\s\S]*?(<\/script>)/, (_, a, b) => a + json(cut) + b);
}

// What to export: the whole reel, or one scene as a clip; the clip's place on the timeline, and the scale
// that gives the asked-for width. Scene numbers count from 1.
export function exportPlan(cut, { scene, size, gif = false } = {}) {
  const width = Number(size ?? (gif ? 960 : 1920));
  if (!(width >= 160 && width <= 3840)) throw new Error(`--size ${size}: a width from 160 to 3840`);
  const plan = { scale: (EXPORT.scale * width) / 1920, from: 0, seconds: cut.total, at: round(cut.scenes[0].dur - 0.5), suffix: "" };
  if (scene == null) return plan;
  const n = Number(scene);
  if (!Number.isInteger(n) || n < 1 || n > cut.scenes.length) throw new Error(`--scene ${scene}: a scene from 1 to ${cut.scenes.length}`);
  const from = cut.scenes.slice(0, n - 1).reduce((a, d) => a + d.dur, 0);
  // A clip stops just before the scene's fade-out, so it loops on the scene and not on a blank frame.
  const seconds = round(cut.scenes[n - 1].dur - 0.35);
  return { ...plan, from: round(from), seconds, at: round(from + seconds - 0.1), suffix: `-scene-${n}` };
}

// A clip's footage as one sprite sheet: its frames from "from" to "to" at its own rate up to 15 a second, at most
// 640 px wide, tiled left to right and top to bottom, in one JPEG. Returns the sheet's file and how to step through it.
export function clipSprite(d) {
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) throw new Error("a clip scene needs ffmpeg to read its footage");
  const dir = mkdtempSync(join(tmpdir(), "motion-clip-"));
  // The footage's own frame rate, capped at 15, so a 10 fps GIF isn't padded with repeated frames.
  const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", d.file], { encoding: "utf8" });
  const [num, den] = (probe.stdout || "").trim().split("/").map(Number);
  const from = d.from ?? 0, fps = Math.min(15, d.fps ?? (num > 0 && den > 0 ? num / den : 15));
  const run = (args) => { const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { encoding: "utf8" }); if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr.trim().split("\n").pop()}`); };
  run(["-ss", String(from), "-t", String(d.to - from), "-i", d.file, "-vf", `fps=${fps},scale='min(640,iw)':-2`, join(dir, "f-%04d.png")]);
  const frames = readdirSync(dir).filter((f) => f.startsWith("f-")).length;
  if (!frames) throw new Error(`no frames between ${from} s and ${d.to} s of ${basename(d.file)}`);
  const [w, h] = imageSize(readFileSync(join(dir, "f-0001.png")));
  const cols = Math.min(frames, Math.floor(16000 / w)), rows = Math.ceil(frames / cols);
  if (rows * h > 16000) throw new Error(`${frames} frames don't fit one sheet; trim the clip or lower its fps`);
  // JPEG, because every ffmpeg build can write it (WebP needs libwebp).
  const sheet = join(dir, "sheet.jpg");
  run(["-framerate", String(fps), "-i", join(dir, "f-%04d.png"), "-vf", `tile=${cols}x${rows}`, "-frames:v", "1", "-q:v", "4", sheet]);
  return { sheet, frames, fps, cols, rows, size: [w, h] };
}

// Open the page headless and ask it which scenes' text didn't fit, and which images didn't load.
async function renderCheck(page) {
  const { openPage, chromePath } = await import("./chrome.mjs");
  if (!chromePath()) return ["no Chrome found, so nothing checked that the text fits (set CHROME_PATH)"];
  const tab = await openPage(pathToFileURL(page).href, { width: EXPORT.width, height: 900, scale: 1 });
  try {
    await tab.evaluate(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300)))`);
    return await tab.evaluate(`[...window.__cut.problems, ...[...document.images].filter((i) => !i.naturalWidth).map((i) => "an image didn't load: " + i.src.slice(0, 60))]`);
  } finally { await tab.close(); }
}

async function main(argv) {
  const has = (k) => argv.includes(`--${k}`);
  const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const file = argv.find((a, i) => !a.startsWith("--") && !["--out", "--theme", "--fps", "--at", "--scene", "--size"].includes(argv[i - 1]));
  if (!file || has("help")) {
    console.error("usage: motion.mjs <motion.json> [--check] [--mp4 | --webm | --gif] [--poster [--at s]] [--scene n] [--size px] [--out page.html] [--theme light|dark] [--fps n] [--no-render]");
    return has("help") ? 0 : 2;
  }
  const base = dirname(resolve(file));
  let input;
  try { input = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`can't read ${file}: ${e.message}`); return 1; }
  const { cut, errors, warnings, images } = check(input, base);
  for (const w of warnings) console.error(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) return 1;
  const lengths = cut.scenes.map((d) => `${d.kind} ${d.dur}`).join(", ");
  if (has("check")) { console.log(`ok: ${cut.scenes.length} scenes, ${cut.total} s (${lengths})`); return 0; }

  const page = resolve(opt("out") ?? join(base, "motion.html"));
  for (const d of cut.scenes.filter((x) => x.kind === "clip")) {
    try {
      const sp = clipSprite(d);
      const key = `${d.src}#${d.from ?? 0}-${d.to}`;
      images[key] = sp.sheet;
      Object.assign(d, { sprite: key, frames: sp.frames, fps: sp.fps, cols: sp.cols, rows: sp.rows, size: sp.size });
      delete d.file;
    } catch (e) { console.error(`error: ${e.message}`); return 1; }
  }
  const html = build(cut, images);
  writeFileSync(page, html);
  console.log(`wrote ${page} (${cut.scenes.length} scenes, ${cut.total} s, ${Math.round(html.length / 1024)} KB)`);
  if (!has("no-render")) {
    const problems = await renderCheck(page);
    for (const p of problems) console.error(`warning: ${p}`);
  }

  const theme = opt("theme") ?? "light";
  const video = ["mp4", "webm", "gif"].find(has);
  let plan;
  try { plan = exportPlan(cut, { scene: opt("scene"), size: opt("size"), gif: video === "gif" }); } catch (e) { console.error(`error: ${e.message}`); return 2; }
  const exportOne = (fmt, extra) => {
    const out = join(dirname(page), "export", `${basename(page, ".html")}${plan.suffix}.${fmt}`);
    const args = [join(here, "export.mjs"), page, "--select", "#stage", `--${fmt}`, "--width", String(EXPORT.width), "--pad", "0", "--theme", theme, "--out", out, ...extra];
    const r = spawnSync(process.execPath, args, { stdio: ["ignore", "inherit", "inherit"] });
    return r.status ?? 1;
  };
  if (video) {
    // A GIF at full size is tens of megabytes; half size at 15 fps keeps it shareable.
    const status = exportOne(video, ["--scale", String(plan.scale), "--fps", opt("fps") ?? (video === "gif" ? "15" : "30"), "--from", String(plan.from), "--seconds", String(plan.seconds)]);
    if (status) return status;
  }
  if (has("poster")) {
    const status = exportOne("png", ["--scale", String(plan.scale), "--at", opt("at") ?? String(plan.at)]);
    if (status) return status;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)));
