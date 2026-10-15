#!/usr/bin/env node
// build.mjs — build the buildnotes promo video: a 1920 × 1080 page that plays itself, and its MP4.
// It is drawn in the skill's own output styles: the motion cut's blue title card, and the field-notes page in dark.
//
// Usage:
//   node site/promo/build.mjs            build site/promo/dist/promo.html (open it to watch; add ?t=12 to hold a moment)
//   node site/promo/build.mjs --mp4      also export site/assets/promo.mp4 (needs Chrome and ffmpeg; a few minutes)
//   node site/promo/build.mjs --poster   also export site/assets/promo.png, the end card
//
// site/promo/promo.html is the page. Every frame is computed from the clock, so the skill's own export.mjs
// steps it into a video frame by frame. The build fills its markers:
//   // iso.mjs                                       site/iso.mjs inlined, so the page draws with the site's own objects
//   <!-- svg examples/…/file.svg -->                 a hand-drawn figure from an example, inlined
//   <!-- frames --> and <!-- thumbs -->              the Sunny cut's highlights, and one still per scene, as JPEGs in dist/frames
//   <!-- iso post -->                                one of the site's pictures (via site/build.mjs)
// and copies the images the page points at into dist/.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { fill } from "../build.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const dist = join(here, "dist");

// The length of the cut, in seconds; the page's own timeline must end here (it checks).
export const SECONDS = 40;
export const FPS = 30;

// Highlights of the walkthrough-videos cut, as [from, to] seconds of motion.mp4, played at SPEED.
// The player in scene 5 cuts between them; its filmstrip and scrubber show where each sits in the 52-second cut.
export const CLIPS = [[1.4, 3.4], [11, 13], [24.4, 26.4], [32.2, 34.2], [49.2, 51.2]];
export const SPEED = 1.5;
// One still from the middle of each of the cut's seven scenes, for the filmstrip under the player.
export const THUMBS = [2, 7, 15, 24, 32, 41, 49];
const CUT = join(root, "examples/sunny-walkthrough-videos/motion.mp4");

function frames() {
  if (spawnSync("ffmpeg", ["-version"]).status !== 0) throw new Error("the Sunny clip needs ffmpeg (brew install ffmpeg)");
  const dir = join(dist, "frames");
  mkdirSync(dir, { recursive: true });
  const list = [];
  CLIPS.forEach(([a, b], i) => {
    const n = Math.round(((b - a) / SPEED) * FPS);
    const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(a), "-t", String(b - a), "-i", CUT,
      "-vf", `setpts=PTS/${SPEED},fps=${FPS},scale=1280:-2`, "-frames:v", String(n), "-q:v", "3", join(dir, `c${i}-%03d.jpg`)], { encoding: "utf8" });
    if (run.status !== 0) throw new Error(`ffmpeg: ${run.stderr.trim().split("\n").pop()}`);
    const got = readdirSync(dir).filter((f) => f.startsWith(`c${i}-`)).sort();
    got.forEach((f, k) => list.push({ src: `frames/${f}`, clip: i, at: a + (k / FPS) * SPEED }));
  });
  THUMBS.forEach((at, i) => {
    const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(at), "-i", CUT, "-frames:v", "1", "-vf", "scale=320:-2", "-q:v", "3", join(dir, `thumb-${i}.jpg`)], { encoding: "utf8" });
    if (run.status !== 0) throw new Error(`ffmpeg: ${run.stderr.trim().split("\n").pop()}`);
  });
  return list;
}

export function buildPromo() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  let html = readFileSync(join(here, "promo.html"), "utf8");

  const iso = readFileSync(join(here, "../iso.mjs"), "utf8").replace(/^export /gm, "");
  html = html.replace("// iso.mjs\n", () => `${iso}\n`);
  html = html.replace(/<!-- svg (\S+) -->/g, (_, ref) => readFileSync(join(root, ref), "utf8").replace(/<\?xml[^>]*>/, ""));
  const list = frames();
  html = html.replace("<!-- frames -->", () => list.map((f) => `<img src="${f.src}" alt="" data-clip="${f.clip}" data-at="${f.at.toFixed(3)}">`).join(""));
  html = html.replace("<!-- thumbs -->", () => THUMBS.map((_, i) => `<img src="frames/thumb-${i}.jpg" alt="">`).join(""));
  html = html.replace("/* config */", () => `const SECONDS = ${SECONDS}, CLIP_COUNT = ${CLIPS.length};`);
  const warnings = [];
  html = fill(html, { warnings });
  for (const w of warnings) console.error(`! ${w}`);

  // Images the page points at (in a src attribute or a script's string), from the repo root, published under img/.
  html = html.replace(/(?<=")((?:examples|\.github)\/[^"]+\.(?:png|webp|jpg))(?=")/g, (ref) => {
    const from = join(root, ref);
    if (!existsSync(from)) throw new Error(`src="${ref}": no such file`);
    const to = `img/${basename(ref)}`;
    mkdirSync(join(dist, "img"), { recursive: true });
    copyFileSync(from, join(dist, to));
    return to;
  });
  writeFileSync(join(dist, "promo.html"), html);
  return join(dist, "promo.html");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  try {
    const page = buildPromo();
    console.error(`built ${page}`);
    const exporter = join(root, "skills/buildnotes/scripts/export.mjs");
    const common = [exporter, page, "--select", "#stage", "--width", "1920", "--scale", "1", "--pad", "0"];
    if (argv.includes("--poster")) {
      const r = spawnSync("node", [...common, "--png", "--at", String(SECONDS - 0.5), "--out", join(here, "../assets/promo.png")], { stdio: "inherit" });
      if (r.status !== 0) process.exit(r.status ?? 1);
    }
    if (argv.includes("--mp4")) {
      const r = spawnSync("node", [...common, "--mp4", "--fps", String(FPS), "--seconds", String(SECONDS), "--out", join(here, "../assets/promo.mp4")], { stdio: "inherit" });
      if (r.status !== 0) process.exit(r.status ?? 1);
    }
  } catch (err) {
    console.error(`site/promo/build.mjs: ${err.message}`);
    process.exit(1);
  }
}
