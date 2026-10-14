#!/usr/bin/env node
// gallery.mjs — render every example spec in assets/specs/ into one page that uses the template's
// own CSS: a preview of all the components, each with its spec.
//
// Usage: node dev/gallery.mjs [--only flow] [--style field-notes] [--out runs/components/gallery.html]
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
const style = opt("style") ?? "plain";
const publish = argv.includes("--publish");
const out = resolve(publish ? join(root, "assets/components.html") : opt("out") ?? join(root, "runs/components/gallery.html"));
const specDir = join(root, "assets/specs");
const num = (i) => String(i + 1).padStart(2, "0");

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
  anatomy: "The parts of one thing, named: a keyed figure drawn from a parts list measured on a capture. Flat shows it straight on with its own labels, iso at an angle as structure only (it comes apart on request), screenshot puts the keys on the capture itself. Pointing at a part lifts it; pointing at a key fades the rest.",
  shader: "A WebGL figure drawn by a fragment shader, for what boxes and lines can't show: many things moving at once, a field or gradient, or pixels that are themselves the subject. Follows the theme, pauses off screen, holds a still frame for reduced motion.",
};
const ORDER = Object.keys(ABOUT);
// The examples shown, in order, each with what it demonstrates. A second example of a kind earns its
// place only by showing something new. Specs not listed here are left out of the preview, such as
// options-record.md, which exists for the page template.
const EXAMPLES = {
  "flow-preview.json": "A fan-out, with marching dashes along the route.",
  "flow-limits.json": "A fan-in from three sources, with a moving dot.",
  "flow-retry.json": "A retry loop, which runs around the outside.",
  "flow-pipeline.json": "A fan-out that joins again, with a moving dot. Used by the page template.",
  "steps-pipeline.json": "Four steps with the moving highlight. Used by the page template.",
  "bars-budget.json": "One row marked hot; the others turn grey.",
  "bars-limit.json": "Values with a unit, and a limit line.",
  "delta-build.json": "A written change, and what was measured.",
  "line-latency.json": "One series with a marked point.",
  "line-two.json": "Two series: the second is grey and gets a legend.",
  "options-database.md": "The bold first cell marks the chosen row.",
  "matrix-previews.md": "The bold header marks the option built; a mark can carry a short note.",
  "code-gather.json": "Lines read from git at a pinned commit, with the middle cut.",
  "term-gather.json": "Two of four output lines kept; each gap becomes \"…\".",
  "strip-rounds.json": "Three rounds of a design, as images.",
  "strip-filter.json": "Before and after, as terminal output.",
  "anatomy-card.json": "At an angle: structure only, with the object's title on its base. Assembled / Apart lifts the parts off, and the keys go with them.",
  "anatomy-card-flat.json": "Straight on, with the object's own labels. The same spec, through \"from\".",
  "anatomy-card-shot.json": "Keys over the capture itself. Expand opens it full size.",
  "shader-jitter.json": "Many things at once: 80 clients retrying, and the load they put on the server. Loops every 5 s on u_phase; labels sit over the canvas.",
  "shader-rehash.json": "The mechanism behind a number: which keys move when a server joins, and why the ring moves so few. Loops every 5 s.",
  "shader-banding.json": "When the pixels are the subject: a rendering fix, shown on the reader's own screen. A still shader, with the level count as an extra uniform.",
};

const template = readFileSync(join(root, "assets/template.html"), "utf8");
const head = template.slice(template.indexOf("<link rel=\"preconnect\""), template.indexOf("</style>") + "</style>".length);
const script = template.slice(template.lastIndexOf("<script>"));

const onDisk = new Set(readdirSync(specDir).filter((f) => /\.(json|md)$/.test(f)));
for (const f of Object.keys(EXAMPLES)) if (!onDisk.has(f)) throw new Error(`gallery: ${f} is listed but missing from assets/specs`);
const specs = Object.keys(EXAMPLES).filter((f) => !only || f.startsWith(`${only}-`))
  .sort((a, b) => ORDER.indexOf(a.split("-")[0]) - ORDER.indexOf(b.split("-")[0]));
// Specs point at images relative to themselves; point them at the spec folder from the page instead.
const imgBase = relative(dirname(out), specDir) || ".";
// One section per kind, headed by the kind's name; each example is a subheading inside it.
const byKind = new Map();
let warned = 0;
for (const f of specs) {
  const kind = f.split("-")[0];
  const id = f.replace(/\.\w+$/, "");
  const text = readFileSync(join(specDir, f), "utf8");
  const frag = renderKind(kind, text, { id, base: specDir, style }).replace(/src="img\//g, `src="${imgBase}/img/`);
  for (const w of takeWarnings()) { warned++; console.error(`! ${f}: ${w}`); }
  const name = id.slice(kind.length + 1);
  const whole = /^(code|term)$/.test(kind);
  const example = `    <div class="ex" id="${id}">
      <h3>${esc(name[0].toUpperCase() + name.slice(1))}</h3>
${whole ? `      ${frag}\n      <p class="label">${esc(EXAMPLES[f])}</p>` : `      <figure class="wide">\n${frag}\n        <figcaption>${esc(EXAMPLES[f])}</figcaption>\n      </figure>`}
      <details class="spec"><summary>${esc(f)}</summary><figure class="code"><pre><code>${esc(text.trim())}</code></pre></figure></details>
    </div>`;
  if (!byKind.has(kind)) byKind.set(kind, []);
  byKind.get(kind).push(example);
}
const kinds = [...byKind.keys()];
const toc = kinds.map((k, i) => `<li><a href="#${k}"><span>${num(i)}</span>${k}</a></li>`);
const sections = kinds.map((k, i) => `  <section class="ch" id="${k}">
    <h2><span class="n">${num(i)}</span>${k}</h2>
    <p>${esc(ABOUT[k] ?? "")}</p>
${byKind.get(k).join("\n")}
  </section>`);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Build story components</title>
${head}
<style>
/* each example's parts sit in the chapter grid, so wide figures can still break out of the column */
.ex { display: contents; }
.ex > * { width: 100%; max-width: var(--col); margin-inline: auto; min-width: 0; }
.ex > .wide { max-width: var(--wide); }
.ex h3 { margin-top: 1.25rem; }
.ex h3 + * { margin-top: -0.35rem; }
.spec summary { cursor: pointer; font: 0.75rem var(--font-mono); color: var(--muted); }
.spec[open] summary { margin-bottom: 0.5rem; }
.theme { justify-self: start; font: 0.75rem var(--font-mono); color: var(--ink); background: var(--wash); border: 1px solid var(--rule); border-radius: 4px; padding: 0.3rem 0.6rem; cursor: pointer; }
</style>
</head><body>
<article class="post"${style === "plain" ? "" : ` data-style="${style}"`}>
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
