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
//   --brand <file>      a brand file other than the repo's brand.json; --no-brand for none
//   --no-render         skip the headless pass that checks every slide's text fits the frame
//
// The script's "output" settings (references/motion.md) apply here too: "name" and "theme" set the PDF's
// defaults. A flag still wins. The brand follows the motion cut's: the repo's brand.json, then the script's "brand".
//
// The script is the motion cut's (references/motion.md), checked by motion.mjs, and the page is the same
// template (assets/motion.html) in deck mode: each scene plays its motion once when you reach it and holds
// its last frame. references/deck.md has the rest. The PDF is printed by headless Chrome, so its text is
// vector; images stay as they are embedded. Warnings go to stderr.

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { addClips, build, check, openCut, problems } from "./motion.mjs";
import { exportName, exportStem } from "./names.mjs";
import { brandFlag, brandNote } from "./brand.mjs";

// The script checked as a deck: the motion cut's checks, less the reel's running time.
export const checkDeck = (input, base, opts = {}) => check(input, base, { ...opts, deck: true });

// Where the files go: the page next to the script, the PDF in export/ beside the page, named after the story.
// An --out ending in .pdf sets the PDF and asks for it.
export function outputs(file, cut, { out, name } = {}) {
  const base = dirname(resolve(file));
  const isPdf = !!out && extname(out).toLowerCase() === ".pdf";
  const page = resolve(out && !isPdf ? out : join(base, "deck.html"));
  const stem = exportStem({ name: name ?? cut.output?.name, dir: base, title: cut.title });
  return { page, pdf: isPdf ? resolve(out) : join(dirname(page), "export", exportName(stem, "deck", "pdf")), wantPdf: isPdf };
}

// Print every slide at rest, one to a 1920×1080 page (20 × 11.25 in), with its backgrounds, from an open tab.
export async function printDeck(tab, { theme = "light" } = {}) {
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
}

async function main(argv) {
  const has = (k) => argv.includes(`--${k}`);
  const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const file = argv.find((a, i) => !a.startsWith("--") && !["--out", "--theme", "--name", "--brand"].includes(argv[i - 1]));
  if (!file || has("help")) {
    console.error("usage: deck.mjs <motion.json> [--check] [--pdf] [--out page.html | deck.pdf] [--theme light|dark] [--name slug] [--brand file | --no-brand] [--no-render]");
    return has("help") ? 0 : 2;
  }
  const base = dirname(resolve(file));
  let input;
  try { input = JSON.parse(readFileSync(file, "utf8")); } catch (e) { console.error(`can't read ${file}: ${e.message}`); return 1; }
  const { cut, errors, warnings, images, brand } = checkDeck(input, base, { brand: brandFlag(argv) });
  for (const w of warnings) console.error(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) return 1;
  if (has("check")) { console.log(`ok: ${cut.scenes.length} slides (${cut.scenes.map((d) => d.kind).join(", ")})`); return 0; }
  const theme = opt("theme") ?? cut.output?.theme ?? "light";
  if (!["light", "dark"].includes(theme)) { console.error(`error: --theme ${theme}: light or dark`); return 2; }

  const { page, pdf, wantPdf } = outputs(file, cut, { out: opt("out"), name: opt("name") });
  try { addClips(cut, images); } catch (e) { console.error(`error: ${e.message}`); return 1; }
  const html = build(cut, images, { brand });
  writeFileSync(page, html);
  console.log(`wrote ${page} (${cut.scenes.length} slides, ${Math.round(html.length / 1024)} KB${brandNote(brand)})`);
  const printing = wantPdf || has("pdf");
  if (!printing && has("no-render")) return 0;

  // One headless tab does both: the fit check, then the print.
  const tab = await openCut(page, { reduced: true, theme });
  if (!tab) {
    if (printing) { console.error("error: the PDF needs Chrome; set CHROME_PATH"); return 1; }
    console.error("warning: no Chrome found, so nothing checked that the text fits (set CHROME_PATH)");
    return 0;
  }
  try {
    if (!has("no-render")) for (const p of await problems(tab, "slide")) console.error(`warning: ${p}`);
    if (printing) {
      const buf = await printDeck(tab, { theme });
      mkdirSync(dirname(pdf), { recursive: true });
      writeFileSync(pdf, buf);
      console.log(`wrote ${pdf} (${cut.scenes.length} pages, ${theme}, ${Math.round(statSync(pdf).size / 1024)} KB)`);
    }
  } finally { await tab.close(); }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await main(process.argv.slice(2)));
