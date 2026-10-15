#!/usr/bin/env node
// card.mjs — render the link-preview image, site/assets/og.png (1200 × 630), from site/src/card.html.
// Needs Chrome, through the skill's scripts/chrome.mjs; the site build itself does not. Run it again
// when the headline or the card figure changes, and commit the PNG.
//
// Usage: node site/card.mjs

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openPage } from "../skills/buildnotes/scripts/chrome.mjs";
import { fill, SHARE } from "./build.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, "src/.card.built.html");
const out = join(here, SHARE.image);

const warnings = [];
writeFileSync(tmp, fill(readFileSync(join(here, "src/card.html"), "utf8"), { warnings }));
let page;
try {
  page = await openPage(pathToFileURL(tmp).href, { width: 1200, height: 630, scale: 1, theme: "light", reduced: true });
  writeFileSync(out, await page.screenshot({ x: 0, y: 0, width: 1200, height: 630 }));
} finally {
  await page?.close();
  rmSync(tmp, { force: true });
}
for (const w of warnings) console.error(`! ${w}`);
console.error(`wrote ${out}`);
