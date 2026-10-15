#!/usr/bin/env node
// build.mjs — build the buildnotes website from site/src into a folder of static files.
//
// Usage:
//   node site/build.mjs                 build into site/dist
//   node site/build.mjs --out <dir>     build somewhere else
//
// site/src/index.html is the page. The build fills in four kinds of marker:
//   <!-- figure anatomy examples/…/spec.json -->   a live figure, rendered by the skill's own viz.mjs
//   <!-- iso post -->                              one of the site's pictures, drawn by site/iso.mjs
//   /* template: keyed-anatomy */                  the keyed-figure and anatomy CSS, copied from the post template
//   // template: keyed                             the keyed-figure script, copied from the post template
// Then it copies every local file the page points at (src, href, poster): site/assets/… from here,
// everything else from the repo root, so the example posts and videos are served next to the page.
// .github/assets/<file> is published as assets/<file>. Nothing to install; Node 22 or later.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderKind } from "../skills/buildnotes/scripts/viz.mjs";
import { takeWarnings } from "../skills/buildnotes/scripts/viz/util.mjs";
import { drawing } from "./iso.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const TEMPLATE = join(root, "skills/buildnotes/assets/template.html");

// A slice of the post template, from a line it is known to contain up to (but not including) another.
// If the template moves them, the build stops here rather than shipping a page with half a stylesheet.
function slice(text, from, to, what) {
  const a = text.indexOf(from);
  const b = a < 0 ? -1 : text.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`template.html: can't find the ${what} (looked for "${from}" … "${to}")`);
  return text.slice(a, b);
}

// The keyed-figure and anatomy CSS ends with the .parts-view rules; the expand dialog's CSS follows them.
function templateParts() {
  const t = readFileSync(TEMPLATE, "utf8");
  const css = slice(t, "/* keyed figure: numbered hotspots", "/* expand: ", "keyed and anatomy CSS");
  const js = slice(t, "// Keyed figures: copy each legend entry", "// Expand: a screenshot shown smaller", "keyed-figure script");
  return { css, js };
}

// Where a local file the page points at comes from, and where it is published.
function locate(ref) {
  if (ref.startsWith("assets/")) return { from: join(here, ref), to: ref };
  if (ref.startsWith(".github/assets/")) return { from: join(root, ref), to: `assets/${basename(ref)}` };
  return { from: join(root, ref), to: ref };
}

const LOCAL = /\b(src|href|poster)="(?!https?:|data:|mailto:|#|\/)([^"]+)"/g;

export function build({ out = join(here, "dist") } = {}) {
  const warnings = [];
  let html = readFileSync(join(here, "src/index.html"), "utf8");
  const { css, js } = templateParts();

  const count = (re) => (html.match(re) ?? []).length;
  if (count(/\/\* template: keyed-anatomy \*\//g) !== 1 || count(/\/\/ template: keyed\n/g) !== 1) {
    throw new Error("src/index.html needs exactly one of each template marker");
  }
  html = html.replace("/* template: keyed-anatomy */", () => `/* From skills/buildnotes/assets/template.html, unchanged */\n${css}`);
  html = html.replace("// template: keyed\n", () => js);

  html = html.replace(/<!-- iso (\w+) -->/g, (_, name) => drawing(name));

  html = html.replace(/<!-- figure (\w+) (\S+) -->/g, (_, kind, spec) => {
    const path = join(root, spec);
    const frag = renderKind(kind, readFileSync(path, "utf8"), {
      id: basename(spec).replace(/\.\w+$/, ""),
      base: dirname(path),
      page: root,
      style: "field-notes",
    });
    for (const w of takeWarnings()) warnings.push(`${spec}: ${w}`);
    return frag;
  });

  const leftover = html.match(/<!-- (figure|iso) [^>]*-->|\/\* template: |\/\/ template: /);
  if (leftover) throw new Error(`unfilled marker: ${leftover[0]}`);

  const files = new Map();
  html = html.replace(LOCAL, (all, attr, ref) => {
    const { from, to } = locate(ref);
    if (!existsSync(from)) throw new Error(`${attr}="${ref}": no such file (${from})`);
    files.set(to, from);
    return `${attr}="${to}"`;
  });

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), html);
  for (const [to, from] of files) {
    mkdirSync(dirname(join(out, to)), { recursive: true });
    copyFileSync(from, join(out, to));
  }
  return { html, files: [...files.keys()], warnings, out };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.error("usage: node site/build.mjs [--out <dir>]");
    process.exit(0);
  }
  const i = argv.indexOf("--out");
  try {
    const { files, warnings, out } = build(i >= 0 ? { out: resolve(argv[i + 1]) } : {});
    for (const w of warnings) console.error(`! ${w}`);
    console.error(`built ${out}/index.html and ${files.length} file${files.length === 1 ? "" : "s"}`);
  } catch (err) {
    console.error(`site/build.mjs: ${err.message}`);
    process.exit(1);
  }
}
