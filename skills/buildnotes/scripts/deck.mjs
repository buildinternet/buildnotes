#!/usr/bin/env node
// deck.mjs — a build story's deck: the motion cut's scene script as slides you click through,
// one scene to a slide, as one self-contained page and, on request, a PDF.
//
// Usage:
//   node deck.mjs <motion.json>                  check the script, write deck.html next to it
//   node deck.mjs <motion.json> --pdf            and a 16:9 PDF, one page per slide at rest, to <dir>/export/<story>-deck.pdf
//   node deck.mjs <motion.json> --pdf --theme dark
//   node deck.mjs <motion.json> --check          check the script only; exit 1 on an error
//
// Options:
//   --out <file>        a .html sets the page (default: deck.html next to the script); a .pdf sets the PDF and implies --pdf
//   --theme light|dark  for the PDF; default light
//   --name <slug>       the <story> part of the PDF's name; default: the work dir's name without its date, else the title
//   --no-render         skip the headless pass that checks every slide's text fits the frame
//
// The script is the motion cut's (references/motion.md), checked by motion.mjs, and the page is the same
// template (assets/motion.html) in deck mode: each scene plays its motion once when you reach it and holds
// its last frame. references/deck.md has the rest. The PDF is printed by headless Chrome, so its text is
// vector; images stay as they are embedded. Warnings go to stderr.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, check, clipSprite } from "./motion.mjs";
import { exportName, slugify, storySlug } from "./names.mjs";

// The page is laid out at the width motion.mjs checks at, so a slide that fits the reel fits the deck.
const VIEW = { width: 1280, height: 900 };

// The script checked as a deck: the motion cut's checks, less the ones about the reel's running time.
export function checkDeck(input, base) {
  const r = check(input, base);
  r.warnings = r.warnings.filter((w) => !/ s in all; aim for under a minute/.test(w));
  if (r.cut.scenes) r.cut.deck = true;
  return r;
}

// Each clip scene's footage becomes one sprite sheet, as in motion.mjs. Changes cut and images in place.
export function addClips(cut, images) {
  for (const d of cut.scenes.filter((x) => x.kind === "clip")) {
    const sp = clipSprite(d);
    const key = `${d.src}#${d.from ?? 0}-${d.to}`;
    images[key] = sp.sheet;
    Object.assign(d, { sprite: key, frames: sp.frames, fps: sp.fps, cols: sp.cols, rows: sp.rows, size: sp.size });
    delete d.file;
  }
}

// Where the files go: the page next to the script, the PDF in export/ beside the page, named after the story.
export function outputs(file, cut, { out, name } = {}) {
  const base = dirname(resolve(file));
  const pdfOut = out && extname(out).toLowerCase() === ".pdf" ? resolve(out) : null;
  const page = resolve(out && !pdfOut ? out : join(base, "deck.html"));
  const stem = name ? slugify(name, 8) : storySlug(base, cut.title);
  return { page, pdf: pdfOut ?? join(dirname(page), "export", exportName(stem, "deck", "pdf")) };
}

async function open(page, opts = {}) {
  const { openPage } = await import("./chrome.mjs");
  const tab = await openPage(pathToFileURL(page).href, { ...VIEW, scale: 1, ...opts });
  await tab.evaluate(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300)))`);
  return tab;
}

// Open the page headless and ask it which slides' text didn't fit, and which images didn't load.
async function renderCheck(page) {
  const { chromePath } = await import("./chrome.mjs");
  if (!chromePath()) return ["no Chrome found, so nothing checked that the text fits (set CHROME_PATH)"];
  const tab = await open(page, { reduced: true });
  try {
    return await tab.evaluate(`[...window.__cut.problems.map((p) => p.replace(/^scene/, "slide")), ...[...document.images].filter((i) => !i.naturalWidth).map((i) => "an image didn't load: " + i.src.slice(0, 60))]`);
  } finally { await tab.close(); }
}

// Print every slide at rest, one to a 1920×1080 page (20 × 11.25 in), with its backgrounds. Returns the PDF.
export async function printDeck(page, { theme = "light" } = {}) {
  const tab = await open(page, { reduced: true, theme });
  try {
    await tab.evaluate(`(async () => {
      document.documentElement.dataset.theme = ${JSON.stringify(theme)};
      window.__cut.sheets();
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);
    const { data } = await tab.send("Page.printToPDF", {
      printBackground: true, preferCSSPageSize: true, paperWidth: 20, paperHeight: 11.25,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    });
    return Buffer.from(data, "base64");
  } finally { await tab.close(); }
}

async function main(argv) {
  const has = (k) => argv.includes(`--${k}`);
  const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const file = argv.find((a, i) => !a.startsWith("--") && !["--out", "--theme", "--name"].includes(argv[i - 1]));
  if (!file || has("help")) {
    console.error("usage: deck.mjs <motion.json> [--check] [--pdf] [--out page.html | deck.pdf] [--theme light|dark] [--name slug] [--no-render]");
    return has("help") ? 0 : 2;
  }
  const theme = opt("theme") ?? "light";
  if (!["light", "dark"].includes(theme)) { console.error(`error: --theme ${theme}: light or dark`); return 2; }
  const base = dirname(resolve(file));
  let input;
  try { input = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`can't read ${file}: ${e.message}`); return 1; }
  const { cut, errors, warnings, images } = checkDeck(input, base);
  for (const w of warnings) console.error(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) return 1;
  if (has("check")) { console.log(`ok: ${cut.scenes.length} slides (${cut.scenes.map((d) => d.kind).join(", ")})`); return 0; }

  const { page, pdf } = outputs(file, cut, { out: opt("out"), name: opt("name") });
  try { addClips(cut, images); } catch (e) { console.error(`error: ${e.message}`); return 1; }
  const html = build(cut, images);
  writeFileSync(page, html);
  console.log(`wrote ${page} (${cut.scenes.length} slides, ${Math.round(html.length / 1024)} KB)`);
  if (!has("no-render")) for (const p of await renderCheck(page)) console.error(`warning: ${p}`);

  if (has("pdf") || extname(opt("out") ?? "").toLowerCase() === ".pdf") {
    const { chromePath } = await import("./chrome.mjs");
    if (!chromePath()) { console.error("error: the PDF needs Chrome; set CHROME_PATH"); return 1; }
    const buf = await printDeck(page, { theme });
    if (!existsSync(dirname(pdf))) mkdirSync(dirname(pdf), { recursive: true });
    writeFileSync(pdf, buf);
    console.log(`wrote ${pdf} (${cut.scenes.length} pages, ${theme}, ${Math.round(statSync(pdf).size / 1024)} KB)`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)));
