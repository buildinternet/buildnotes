#!/usr/bin/env node
// gallery.mjs — render every example spec in assets/specs/ into one page that uses the template's
// own CSS: a preview of all the components, each with its spec.
//
// Usage: node dev/gallery.mjs [--only flow] [--out runs/components/gallery.html]
//        node dev/gallery.mjs --publish      writes assets/components.html, images embedded (commit it)
// Each spec sits in its own chapter-width section, the way a post would hold it.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { renderKind } from "../scripts/viz.mjs";
import { takeWarnings, esc } from "../scripts/viz/util.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const only = opt("only");
const publish = argv.includes("--publish");
const out = resolve(publish ? join(root, "assets/components.html") : opt("out") ?? join(root, "runs/components/gallery.html"));
const specDir = join(root, "assets/specs");

// What each kind is for, in the order a writer would reach for them.
const ABOUT = {
  flow: "A flow that branches, fans in or loops. One spec gives a left-to-right drawing and a stacked one for phones; the marching dashes or the dot follow the drawn lines.",
  steps: "A straight line of steps. A row on wide screens, a column on phones; the highlight steps through the boxes.",
  bars: "Sizes or counts, drawn to scale and labelled directly. Mark one row hot to grey the rest; add a limit for a budget.",
  delta: "One measured change: the number before and after, the change, and two bars to scale.",
  line: "A trend over time: one series (two at most), the last value at the line's end, an optional marked point.",
  options: "The turn: the options the record shows were weighed, the winner marked. Becomes cards on phones.",
  matrix: "Options compared on several points, with ✓ ✗ ~ marks and short notes. Becomes cards on phones.",
  code: "Real code from git at a given commit, cut to the lines that make the point. Renders the whole figure.",
  term: "One command and the output lines that matter. Renders the whole figure.",
  strip: "Before/after, or a progression of up to four rounds: images, code or terminal output.",
};
const ORDER = Object.keys(ABOUT);

const template = readFileSync(join(root, "assets/template.html"), "utf8");
const head = template.slice(template.indexOf("<link rel=\"preconnect\""), template.indexOf("</style>") + "</style>".length);
const script = template.slice(template.lastIndexOf("<script>"));

const specs = readdirSync(specDir).filter((f) => /\.(json|md)$/.test(f))
  .filter((f) => !only || f.startsWith(`${only}-`))
  .sort((a, b) => (ORDER.indexOf(a.split("-")[0]) - ORDER.indexOf(b.split("-")[0])) || a.localeCompare(b));
// Specs point at images relative to themselves; point them at the spec folder from the page instead.
const imgBase = relative(dirname(out), specDir) || ".";
const sections = [];
const toc = [];
let warned = 0;
let lastKind;
for (const f of specs) {
  const kind = f.split("-")[0];
  const id = f.replace(/\.\w+$/, "");
  const text = readFileSync(join(specDir, f), "utf8");
  const frag = renderKind(kind, text, { id, base: specDir }).replace(/src="img\//g, `src="${imgBase}/img/`);
  for (const w of takeWarnings()) { warned++; console.error(`! ${f}: ${w}`); }
  const first = kind !== lastKind;
  lastKind = kind;
  if (first) toc.push(`<li><a href="#${id}"><span>${String(toc.length + 1).padStart(2, "0")}</span>${kind}</a></li>`);
  const whole = /^(code|term)$/.test(kind);
  sections.push(`  <section class="ch" id="${id}">
    <h2><span class="n">${kind}</span>${esc(id.slice(kind.length + 1))}</h2>
${first ? `    <p>${esc(ABOUT[kind] ?? "")}</p>\n` : ""}${whole ? `    ${frag}` : `    <figure class="wide">\n${frag}\n      <figcaption>Rendered from ${esc(f)}.</figcaption>\n    </figure>`}
    <details class="spec"><summary>${esc(f)}</summary><figure class="code"><pre><code>${esc(text.trim())}</code></pre></figure></details>
  </section>`);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Build story components</title>
${head}
<style>
.spec summary { cursor: pointer; font: 0.75rem var(--font-mono); color: var(--muted); }
.spec[open] summary { margin-bottom: 0.5rem; }
.theme { justify-self: start; font: 0.75rem var(--font-mono); color: var(--ink); background: var(--wash); border: 1px solid var(--rule); border-radius: 4px; padding: 0.3rem 0.6rem; cursor: pointer; }
</style>
</head><body>
<article class="post">
  <header class="mast">
    <p class="kicker">build-story · assets/components.html</p>
    <h1>Components</h1>
    <p class="dek">Every visual the skill can render from a spec, drawn by the same CSS as the page template.</p>
    <p class="byline">Write a spec in the post's <code>viz/</code> folder, put a marker where the figure goes, and run <code>node scripts/viz.mjs build post.html</code>. Regenerate this page with <code>node dev/gallery.mjs --publish</code>.</p>
    <button class="theme" type="button">Theme: auto</button>
  </header>
  <nav class="toc" aria-label="Components"><ol>${toc.join("")}</ol></nav>
${sections.join("\n")}
</article>
${script.replace("</script>", `  // Theme switch for the preview: auto → light → dark.
  const btn = document.querySelector(".theme");
  const modes = ["auto", "light", "dark"];
  btn?.addEventListener("click", () => {
    const next = modes[(modes.indexOf(btn.textContent.replace("Theme: ", "")) + 1) % 3];
    if (next === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
    btn.textContent = "Theme: " + next;
  });
</script>`)}
</body></html>
`);
if (publish) {
  // One self-contained file: embed the images.
  const inlined = execFileSync("node", [join(root, "scripts/inline-assets.mjs"), out, "--keep-comments"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  writeFileSync(out, inlined);
}
console.error(`wrote ${out} (${specs.length} specs${warned ? `, ${warned} warnings` : ""})`);
