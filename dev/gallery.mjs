#!/usr/bin/env node
// gallery.mjs — render every example spec in assets/specs/ into one page that uses the template's
// own CSS, for checking components by eye and by screenshot.
//
// Usage: node dev/gallery.mjs [--only flow] [--out runs/components/gallery.html]
// Each spec sits in its own chapter-width figure, the way a post would hold it.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderKind } from "../scripts/viz.mjs";
import { takeWarnings, esc } from "../scripts/viz/util.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const only = opt("only");
const out = resolve(opt("out") ?? join(root, "runs/components/gallery.html"));

const template = readFileSync(join(root, "assets/template.html"), "utf8");
const head = template.slice(template.indexOf("<link rel=\"preconnect\""), template.indexOf("</style>") + "</style>".length);
const script = template.slice(template.lastIndexOf("<script>"));

const specs = readdirSync(join(root, "assets/specs")).filter((f) => /\.(json|md)$/.test(f)).sort()
  .filter((f) => !only || f.startsWith(`${only}-`));
const sections = [];
let warned = 0;
for (const f of specs) {
  const kind = f.split("-")[0];
  const id = f.replace(/\.\w+$/, "");
  const frag = renderKind(kind, readFileSync(join(root, "assets/specs", f), "utf8"), { id, base: join(root, "assets/specs") });
  for (const w of takeWarnings()) { warned++; console.error(`! ${f}: ${w}`); }
  sections.push(`  <section class="ch" id="${id}">
    <h2><span class="n">${kind}</span>${esc(id)}</h2>
${/^(code|term)$/.test(kind) ? `    ${frag}
    <p class="label">${esc(f)}</p>` : `    <figure class="wide">
${frag}
      <figcaption>${esc(f)}</figcaption>
    </figure>`}
  </section>`);
}

mkdirSync(dirname(out), { recursive: true });
// Specs point at images relative to themselves; the gallery page needs them beside it.
cpSync(join(root, "assets/specs/img"), join(dirname(out), "img"), { recursive: true });
writeFileSync(out, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Component gallery</title>
${head}
</head><body>
<article class="post">
  <header class="mast"><h1>Component gallery</h1><p class="byline">${specs.length} specs from assets/specs</p></header>
${sections.join("\n")}
</article>
${script}
</body></html>
`);
console.error(`wrote ${out} (${specs.length} specs${warned ? `, ${warned} warnings` : ""})`);
