#!/usr/bin/env node
// fonts.mjs — copy the site's web fonts from Google Fonts into site/assets/fonts, with a stylesheet for them.
//
// Usage:
//   node site/fonts.mjs        fetch every family in FAMILIES and rewrite site/assets/fonts.css
//
// The site serves its own fonts rather than linking Google's stylesheet: that stylesheet sits on another
// host and only names the font files, which are on a third, so a first visit waited on two connections and
// two requests in a row before any font could load, and painted in the fallback fonts meanwhile. Served
// from the site, the files can be preloaded and arrive with the page.
//
// Only the latin and latin-ext subsets are kept; each face keeps Google's unicode-range, so a browser
// fetches latin-ext only for a page that uses it. Each family with a fallback in FALLBACKS also gets a
// "<family> Fallback" face: a local font resized to take the same space, so if the web font is late the
// text doesn't move when it swaps in. A page lists that face right after the family (site/build.mjs does
// this for the example posts and decks). Run this again after changing FAMILIES; commit what it writes.

import { writeFileSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DIR = join(here, "assets/fonts");
const CSS = join(here, "assets/fonts.css");

// Every family any served page uses, with the axes and weights it asks for. The example posts and decks
// link Google Fonts themselves (they are written for the Artifact viewer); site/build.mjs swaps their link
// for fonts.css, and stops if one asks for a family that isn't here.
export const FAMILIES = [
  "Archivo:wdth,wght@62..125,400..800",
  "IBM+Plex+Mono:wght@400;500",
  "Martian+Mono:wdth,wght@75..112.5,300..500",
  "Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400",
  "Shantell+Sans:wght@300..600",
  "Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400",
];
export const familyNames = FAMILIES.map((f) => f.split(":")[0].replace(/\+/g, " "));

const SUBSETS = ["latin", "latin-ext"];

// Metric overrides that make a local font take the space of the web font. `ascent` and `descent` are the
// web font's line box in ems (its OS/2 typo metrics, which all six use; measured with fontTools). Each face
// sets size-adjust so a run of text is as wide in the local font as in the web font, measured in Chrome
// at the size and weight the site sets it in: Source Serif 4 and Newsreader change width with optical
// size, so the regular face is matched at body sizes (16–20px) and the bold face, Georgia Bold for weights
// 500 and up, at headline sizes; Martian Mono is matched at the 87.5% width the labels use. Fallbacks are
// Georgia, Arial and Courier New, which macOS and Windows both have.
const GEORGIA = ["Georgia"], GEORGIA_BOLD = ["Georgia Bold", "Georgia-Bold"], ARIAL = ["Arial", "ArialMT"], COURIER = ["Courier New", "CourierNewPSMT"];
export const FALLBACKS = {
  "Source Serif 4": { ascent: 1.0361, descent: 0.335, faces: [{ local: GEORGIA, size: 103.14 }, { local: GEORGIA_BOLD, weight: "500 800", size: 84 }] },
  "Newsreader": { ascent: 0.7349, descent: 0.265, faces: [{ local: GEORGIA, size: 92 }, { local: GEORGIA_BOLD, weight: "500 800", size: 85.31 }] },
  "Archivo": { ascent: 0.878, descent: 0.21, faces: [{ local: ARIAL, size: 97.83 }] },
  "Martian Mono": { ascent: 1.0, descent: 0.2001, faces: [{ local: COURIER, size: 108.32 }] },
  "IBM Plex Mono": { ascent: 1.025, descent: 0.2749, faces: [{ local: COURIER, size: 99.98 }] },
  "Shantell Sans": { ascent: 1.02, descent: 0.32, faces: [{ local: ARIAL, size: 111.14 }] },
};

// Google serves woff2 with unicode-range only to a browser it recognises.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function get(url, as) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return as === "bytes" ? Buffer.from(await res.arrayBuffer()) : res.text();
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const pct = (n) => `${(Math.round(n * 100) / 100).toFixed(2)}%`;
export function fallbackCss() {
  return Object.entries(FALLBACKS).flatMap(([family, f]) => f.faces.map((face) => `@font-face {
  font-family: "${family} Fallback";
  src: ${face.local.map((n) => `local("${n}")`).join(", ")};${face.weight ? `\n  font-weight: ${face.weight};` : ""}
  size-adjust: ${pct(face.size)};
  ascent-override: ${pct((f.ascent * 1e4) / face.size)};
  descent-override: ${pct((f.descent * 1e4) / face.size)};
  line-gap-override: 0%;
}`)).join("\n");
}

async function main() {
  const url = `https://fonts.googleapis.com/css2?${FAMILIES.map((f) => `family=${f}`).join("&")}&display=swap`;
  const css = await get(url);
  // Google's stylesheet is a run of "/* <subset> */ @font-face { … }" blocks.
  const blocks = [...css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face \{([^}]+)\}/g)].filter(([, subset]) => SUBSETS.includes(subset));
  if (!blocks.length) throw new Error(`no ${SUBSETS.join(" or ")} faces in ${url}`);
  // Download into a folder beside the real one, and swap it in only once every file and the stylesheet
  // are written: a failed run leaves the fonts the site has working.
  const stage = `${DIR}.new`;
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  const files = new Map(); // Google's URL → our file name; a variable face serves several weights from one file
  const faces = [];
  for (const [, subset, body] of blocks) {
    const prop = (name) => body.match(new RegExp(`${name}: ([^;]+);`))?.[1].trim();
    const family = prop("font-family").replace(/'/g, "");
    const src = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!src) throw new Error(`${family} (${subset}): no woff2 url`);
    if (!files.has(src)) {
      const name = `${slug(family)}-${prop("font-style")}-${slug(prop("font-weight"))}-${subset}.woff2`;
      writeFileSync(join(stage, name), await get(src, "bytes"));
      files.set(src, name);
    }
    const lines = [
      `  font-family: "${family}";`,
      `  font-style: ${prop("font-style")};`,
      `  font-weight: ${prop("font-weight")};`,
      prop("font-stretch") && `  font-stretch: ${prop("font-stretch")};`,
      `  font-display: swap;`,
      `  src: url(fonts/${files.get(src)}) format("woff2");`,
      `  unicode-range: ${prop("unicode-range")};`,
    ].filter(Boolean);
    faces.push(`/* ${family}, ${subset} */\n@font-face {\n${lines.join("\n")}\n}`);
  }
  const sheet = `/* The site's web fonts, served from here. Written by site/fonts.mjs; don't edit by hand. */\n\n${faces.join("\n")}\n\n/* Local fonts resized to take the web fonts' space while those load. */\n${fallbackCss()}\n`;
  writeFileSync(`${CSS}.new`, sheet);
  rmSync(DIR, { recursive: true, force: true });
  renameSync(stage, DIR);
  renameSync(`${CSS}.new`, CSS);
  console.log(`wrote ${CSS} and ${files.size} font files in ${DIR}`);
}

const isMain = process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) main().catch((e) => { console.error(e.message); process.exit(1); });
