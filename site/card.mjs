#!/usr/bin/env node
// card.mjs — render the link-preview images (1200 × 630): site/assets/og.png from site/src/card.html,
// and one site/assets/og-<slug>.png per example from site/src/card-example.html. Needs Chrome, through
// the skill's scripts/chrome.mjs; the site build itself does not. Run it again when a headline or a
// card's picture changes, and commit the PNGs.
//
// Usage: node site/card.mjs

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openPage } from "../skills/buildnotes/scripts/chrome.mjs";
import { fill, SHARE, EXAMPLES, exampleCard } from "./build.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tmp = join(here, "src/.card.built.html");
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function render(html, out) {
  writeFileSync(tmp, html);
  let page;
  try {
    page = await openPage(pathToFileURL(tmp).href, { width: 1200, height: 630, scale: 1, theme: "light", reduced: true });
    writeFileSync(out, await page.screenshot({ x: 0, y: 0, width: 1200, height: 630 }));
  } finally {
    await page?.close();
    rmSync(tmp, { force: true });
  }
  console.error(`wrote ${out}`);
}

const warnings = [];
await render(fill(readFileSync(join(here, "src/card.html"), "utf8"), { warnings }), join(here, SHARE.image));

// An example's card: its product, the post's headline, its formats, and its picture.
const template = readFileSync(join(here, "src/card-example.html"), "utf8");
for (const ex of EXAMPLES) {
  const post = readFileSync(join(root, "examples", ex.slug, ex.file), "utf8");
  const headline = post.match(/<header class="mast">\s*<h1>([^<]+)<\/h1>/)?.[1] ?? ex.name;
  const fields = {
    product: esc(ex.product),
    headline,
    formats: ["Post", "Video", ...(ex.deck ? ["Slides"] : [])].join(" · "),
    image: relative(dirname(tmp), join(root, ex.image)),
  };
  await render(template.replace(/\{\{(\w+)\}\}/g, (_, k) => fields[k]), join(here, exampleCard(ex)));
}
for (const w of warnings) console.error(`! ${w}`);
