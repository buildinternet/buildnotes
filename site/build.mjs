#!/usr/bin/env node
// build.mjs — build the buildnotes website from site/src into a folder of static files.
//
// Usage:
//   node site/build.mjs                 build into site/dist
//   node site/build.mjs --out <dir>     build somewhere else
//   node site/build.mjs --url <url>     where it will be served: sets the canonical link, og:url and an og:image there
//
// site/src/index.html is the page. The build fills in its markers (<!-- share --> and <!-- description -->
// become the link-preview tags, from SHARE below), including these:
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

// What link previews show. og:image must be an absolute URL, and the site has no home yet: with --url it
// points into the built site, without it at the committed image on GitHub (live once merged to main).
export const SHARE = {
  title: "buildnotes: turn pull requests into posts and videos worth sharing",
  description: "A skill for coding agents. It reads a feature's issues, PRs and reviews, finds the few decisions that shaped it, and writes them up as a post, a short video or a deep dive.",
  image: "assets/og.png",
  imageAlt: "buildnotes: Turn pull requests into posts and videos worth sharing. How it was built, and why. Beside it, an isometric drawing of a weekly digest card with numbered parts.",
  fallback: "https://raw.githubusercontent.com/buildinternet/buildnotes/main/site/assets/og.png",
};

const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function shareTags(url) {
  const image = url ? new URL(SHARE.image, url).href : SHARE.fallback;
  const tags = [
    url && `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="buildnotes">`,
    `<meta property="og:title" content="${esc(SHARE.title)}">`,
    `<meta property="og:description" content="${esc(SHARE.description)}">`,
    url && `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(SHARE.imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(SHARE.title)}">`,
    `<meta name="twitter:description" content="${esc(SHARE.description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(SHARE.imageAlt)}">`,
  ];
  return tags.filter(Boolean).join("\n");
}

// Fill a page's markers: template CSS and script, iso drawings, live figures, share tags.
export function fill(html, { url, warnings = [] } = {}) {
  const { css, js } = templateParts();
  html = html.replace("/* template: keyed-anatomy */", () => `/* From skills/buildnotes/assets/template.html, unchanged */\n${css}`);
  html = html.replace("// template: keyed\n", () => js);
  html = html.replace("<!-- share -->", () => shareTags(url));
  html = html.replace("<!-- description -->", () => `<meta name="description" content="${esc(SHARE.description)}">`);
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
  const leftover = html.match(/<!-- (figure|iso|share|description)\b[^>]*-->|\/\* template: |\/\/ template: /);
  if (leftover) throw new Error(`unfilled marker: ${leftover[0]}`);
  return html;
}

// url: where site/dist will be served, e.g. https://example.com/buildnotes/ (a trailing slash is added).
export function build({ out = join(here, "dist"), url } = {}) {
  if (url) {
    if (!/^https?:\/\//.test(url)) throw new Error(`--url must start with http:// or https:// (got "${url}")`);
    if (!url.endsWith("/")) url += "/";
  }
  const warnings = [];
  const src = readFileSync(join(here, "src/index.html"), "utf8");
  for (const m of ["/* template: keyed-anatomy */", "// template: keyed\n", "<!-- share -->", "<!-- description -->"]) {
    if (src.split(m).length !== 2) throw new Error(`src/index.html needs exactly one ${m.trim()}`);
  }
  let html = fill(src, { url, warnings });

  const files = new Map([[SHARE.image, join(here, SHARE.image)]]);
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
    if (!existsSync(from)) throw new Error(`missing ${from}${to === SHARE.image ? " (make it with node site/card.mjs)" : ""}`);
    mkdirSync(dirname(join(out, to)), { recursive: true });
    copyFileSync(from, join(out, to));
  }
  return { html, files: [...files.keys()], warnings, out };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.error("usage: node site/build.mjs [--out <dir>] [--url https://where.it.is.served/]");
    process.exit(0);
  }
  const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  try {
    const out = opt("out");
    const { files, warnings, out: dir } = build({ out: out ? resolve(out) : undefined, url: opt("url") });
    for (const w of warnings) console.error(`! ${w}`);
    console.error(`built ${dir}/index.html and ${files.length} file${files.length === 1 ? "" : "s"}`);
  } catch (err) {
    console.error(`site/build.mjs: ${err.message}`);
    process.exit(1);
  }
}
