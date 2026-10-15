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
// .github/assets/<file> is published as assets/<file>. Each example in EXAMPLES is served as a folder,
// examples/<slug>/, with its video beside it. Its post is not copied as is: the committed posts are written
// for the Artifact viewer, which wraps them in a document, so the build wraps each one itself (doctype,
// charset, viewport) and adds a site shell around it: a bar naming the example with a way back, and a
// footer with the example's video, its plan, and the other examples. examples/index.html lists them all,
// built from site/src/examples.html with the home page's stylesheet. Nothing to install; Node 22 or later.

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

// The committed examples, in the order the shell's footer walks them. `product` is who the post is about,
// `cut` how long its video runs; the plan link goes to GitHub, where plan.md reads as a page.
// `file` is the committed page to serve as the example's index.html; `image` its card on the examples page.
// `deck`: the example also has deck.html and deck.pdf, the cut as slides, served next to its video.
export const EXAMPLES = [
  { slug: "sunny-walkthrough-videos", name: "Walkthrough videos", product: "Sunny", about: "a furniture and space planner", cut: "52 seconds", deck: true, file: "post.html", style: "field notes", image: ".github/assets/walkthrough-keyed.webp",
    blurb: "One export turns a room, a floor or a project into a looping 1080p tour. The repo is private, so the post quotes no code and links nothing internal." },
  { slug: "uploads-before-after", name: "Before and after, side by side", product: "uploads.sh", about: "screenshots for pull requests", cut: "47 seconds", file: "post.html", style: "Plain", image: ".github/assets/before-after-compare.webp",
    blurb: "Tag two screenshots before and after, and the pull request comment shows them in one row. Its figures are the product in use, captured live." },
  { slug: "releases-weekly-digests", name: "Weekly digests", product: "Release Notes Index", about: "release notes, indexed", cut: "one minute", file: "post-field-notes.html", style: "field notes", image: ".github/assets/digest-apart.webp",
    blurb: "A card at the top of the digest, a replay of the week, and one email a week per reader. Its first figure is the shipped card, measured, drawn at an angle and taken apart." },
];
const REPO = "https://github.com/buildinternet/buildnotes";
const RAW = "https://raw.githubusercontent.com/buildinternet/buildnotes/main";
const POST = /^examples\/([^/]+)\/index\.html$/;

// The shell's own styles, prefixed so they can't collide with the post's. Colours are the site's light
// palette, fixed: the shell forces the light theme on the post too (data-theme="light" on <html>).
const SHELL_CSS = `
.site-bar { font-family: "Archivo", "Helvetica Neue", Arial, sans-serif; font-size: 0.875rem; line-height: 1.5; color: #64645f; -webkit-font-smoothing: antialiased; }
.site-bar a { color: #64645f; text-decoration: none; }
.site-bar a:hover { color: #1f1f1d; }
.site-bar a.site-name { color: #1f1f1d; font-weight: 600; }
.site-bar a.site-accent { color: #3358d4; }
.site-bar a.site-accent:hover { text-decoration: underline; }
.site-bar .site-label { font-family: "Martian Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.6875rem; font-stretch: 87.5%; letter-spacing: 0.02em; }
/* body already pads the sides and the top (3rem); the bars take the post's column width (--col, from its :root). */
.site-top { display: flex; align-items: baseline; gap: 6px 20px; max-width: var(--col, 42rem); margin: -1rem auto 3rem; }
.site-top .site-label { margin-left: auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.site-top nav { display: flex; flex-wrap: wrap; gap: 4px 20px; }
/* On a phone: the name and the label on one line (the label gives way), the links under them. */
@media (max-width: 40rem) { .site-top { display: grid; grid-template-columns: auto minmax(0, 1fr); } .site-top .site-label { justify-self: end; max-width: 100%; } .site-top nav { grid-column: 1 / -1; } }
.site-end { max-width: var(--col, 42rem); margin: 4rem auto 0; display: grid; gap: 20px; }
.site-end .site-rule { border-top: 1px solid #e3e3dd; }
.site-end h2 { font: 600 1.0625rem/1.3 "Source Serif 4", Georgia, serif; color: #1f1f1d; margin: 0; }
.site-end p { margin: 0; max-width: 38rem; }
.site-end video { width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 4px; border: 1px solid #e3e3dd; display: block; }
.site-end .site-links { display: flex; flex-wrap: wrap; gap: 4px 20px; }
.site-end .site-others { display: grid; gap: 0; border-top: 1px solid #e3e3dd; }
.site-end .site-others a { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 16px; padding: 12px 0; border-bottom: 1px solid #e3e3dd; }
.site-end .site-others a b { color: #1f1f1d; font-weight: 600; }
`;

// Wrap one example's committed post.html in a full document and the site shell. `url` is where the site
// is served (--url), for the canonical link and an image inside the site; without it the image is on GitHub.
// The home page's footer CSS (the block starting "/* Footer:" in src/index.html), scoped under .site-footer
// with the light palette inlined, so the example pages' footer matches the home page's without sharing
// the post's variables.
function footerCss() {
  const src = readFileSync(join(here, "src/index.html"), "utf8");
  const a = src.indexOf("/* Footer:");
  const b = a < 0 ? -1 : src.indexOf("\n\n", a);
  if (a < 0 || b < 0) throw new Error('src/index.html: no "/* Footer:" block');
  const vars = { "--rule": "#e3e3dd", "--ink": "#1f1f1d", "--muted": "#64645f", "--font-body": '"Source Serif 4", Georgia, serif', "--font-mono": '"Martian Mono", ui-monospace, SFMono-Regular, Menlo, monospace' };
  return src.slice(a, b)
    .replace(/var\((--[\w-]+)\)/g, (all, v) => { if (!(v in vars)) throw new Error(`footer CSS uses ${v}, not in the shell's palette`); return vars[v]; })
    .replace(/^(\s*)footer\b/gm, "$1.site-footer footer");
}

export function wrapPost(slug, post, url) {
  const i = EXAMPLES.findIndex((e) => e.slug === slug);
  if (i < 0) throw new Error(`examples/${slug} is not in EXAMPLES (site/build.mjs)`);
  const ex = EXAMPLES[i];
  const others = EXAMPLES.filter((e) => e !== ex);
  // The post starts with its <title> and font links, then its <style>; those first lines belong in <head>.
  const at = post.indexOf("<style>");
  if (at < 0) throw new Error(`examples/${slug}/post.html: no <style>`);
  const head = post.slice(0, at).trim();
  const body = post.slice(at);
  const title = head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ex.name;
  const share = shareTags({
    url: url && new URL(`examples/${ex.slug}/`, url).href,
    type: "article",
    title: `${ex.product}: ${ex.name}`,
    description: ex.blurb,
    image: absolute(url, locate(ex.image).to, ex.image),
    imageAlt: `A figure from the ${ex.product} post, ${ex.name.toLowerCase()}.`,
  });
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} · buildnotes example</title>`)}
<meta name="description" content="${esc(ex.blurb)}">
${share}
<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<style>${SHELL_CSS}
.site-footer { font-family: "Archivo", "Helvetica Neue", Arial, sans-serif; max-width: var(--col, 42rem); margin: 3rem auto 0; -webkit-font-smoothing: antialiased; }
.site-footer footer ul { margin: 0; padding: 0; }
.site-footer footer h4, .site-footer footer p { margin: 0; }
${footerCss()}</style>
</head>
<body>
<header class="site-bar site-top">
  <a class="site-name" href="../../">buildnotes</a>
  <span class="site-label">Example ${i + 1} of ${EXAMPLES.length} · ${esc(ex.product)}</span>
  <nav aria-label="Site"><a href="#site-video">Video</a><a href="../">All examples</a><a href="${REPO}">GitHub</a></nav>
</header>
${body}
<section class="site-bar site-end" id="site-video" aria-label="About this example">
  <div class="site-rule"></div>
  <p class="site-label">This post is a buildnotes example</p>
  <h2>The same story in ${esc(ex.cut)}</h2>
  <p>buildnotes wrote this post from the pull requests behind one ${esc(ex.product)} feature, then cut the video from the post: every word, number and screenshot in it comes from the page above.</p>
  <video src="motion.mp4" controls preload="metadata" playsinline aria-label="The ${esc(ex.cut)} video cut of this post."></video>
  <div class="site-links"><a class="site-accent" href="motion.mp4" download>Download the video</a>${ex.deck ? `<a class="site-accent" href="deck.html">Click through it as slides</a><a class="site-accent" href="deck.pdf" download>Download the slides as a PDF</a>` : ""}<a class="site-accent" href="${REPO}/blob/main/examples/${ex.slug}/plan.md">See the plan behind it</a><a class="site-accent" href="${REPO}/tree/main/examples/${ex.slug}">The example on GitHub</a></div>
  <div class="site-others">
${others.map((o) => `    <a href="../${o.slug}/"><b>${esc(o.name)}</b><span>${esc(o.product)} · post and ${esc(o.cut)} video</span></a>`).join("\n")}
  </div>
</section>
<div class="site-footer">
${footer("../../")}
</div>
</body>
</html>
`;
}

// What link previews show. og:image must be an absolute URL, and the site has no home yet: with --url it
// points into the built site, without it at the committed image on GitHub (live once merged to main).
export const SHARE = {
  title: "buildnotes: turn pull requests into posts and videos worth sharing",
  description: "A skill for coding agents. It reads a feature's issues, PRs and reviews, finds the few decisions that shaped it, and writes them up as a post, a short video or a deep dive.",
  image: "assets/og.png",
  imageAlt: "buildnotes: Turn pull requests into posts and videos worth sharing. How it was built, and why. Beside it, an isometric drawing of a weekly digest card with numbered parts.",
  fallback: `${RAW}/site/assets/og.png`,
};

const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// A published file's absolute URL: inside the built site with --url, else the committed file on GitHub.
const absolute = (url, published, committed) => (url ? new URL(published, url).href : `${RAW}/${committed}`);

// The link-preview tags for one page. `url` is the page's own address (with --url), `image` absolute.
function shareTags({ url, type = "website", title, description, image, imageType, width, height, imageAlt }) {
  const tags = [
    url && `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="buildnotes">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    url && `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    imageType && `<meta property="og:image:type" content="${imageType}">`,
    width && `<meta property="og:image:width" content="${width}">`,
    height && `<meta property="og:image:height" content="${height}">`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="twitter:image:alt" content="${esc(imageAlt)}">`,
  ];
  return tags.filter(Boolean).join("\n");
}

// Fill a page's markers: template CSS and script, iso drawings, live figures, share tags.
export function fill(html, { url, warnings = [] } = {}) {
  const { css, js } = templateParts();
  html = html.replace("/* template: keyed-anatomy */", () => `/* From skills/buildnotes/assets/template.html, unchanged */\n${css}`);
  html = html.replace("// template: keyed\n", () => js);
  html = html.replace("<!-- share -->", () => shareTags({
    ...SHARE, url, image: absolute(url, SHARE.image, `site/${SHARE.image}`), imageType: "image/png", width: 1200, height: 630,
  }));
  html = html.replace("<!-- description -->", () => `<meta name="description" content="${esc(SHARE.description)}">`);
  html = html.replace("<!-- footer -->", () => footer());
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

// The footer, shared by the home and examples pages: `up` is the path back to the site root ("" or "../").
export function footer(up = "") {
  const docs = [["Install", "docs/install.md"], ["Scripts and references", "docs/scripts.md"], ["Visual components", "docs/components.md"], ["Developing", "docs/developing.md"], ["SKILL.md", "skills/buildnotes/SKILL.md"]];
  return `  <footer>
    <div class="cols">
      <div class="brand"><b>buildnotes</b><p>Turn pull requests into posts and videos worth sharing. A skill for coding agents, MIT licensed.</p></div>
      <div><h4>Examples</h4><ul>
${EXAMPLES.map((ex) => `        <li><a href="${up}examples/${ex.slug}/">${esc(ex.name)}</a></li>`).join("\n")}
        <li><a href="${up}examples/">All examples</a></li>
      </ul></div>
      <div><h4>Docs</h4><ul>
${docs.map(([name, path]) => `        <li><a href="${REPO}/blob/main/${path}">${esc(name)}</a></li>`).join("\n")}
      </ul></div>
      <div><h4>Project</h4><ul>
        <li><a href="${REPO}">GitHub</a></li>
        <li><a href="${REPO}/blob/main/CHANGELOG.md">Changelog</a></li>
        <li><a href="${REPO}/blob/main/LICENSE">License</a></li>
        <li><a href="https://releases.sh">Release Notes Index</a></li>
        <li><a href="https://uploads.sh">uploads.sh</a></li>
      </ul></div>
    </div>
    <div class="by">
      <span>Maintained by <a href="https://zachdunn.com">Zach Dunn</a> / <a href="https://buildinternet.com">Build Internet</a>.</span>
      <span>Also from Build Internet: <a href="https://releases.sh">Release Notes Index →</a> <a href="https://uploads.sh">uploads.sh →</a></span>
    </div>
  </footer>`;
}

// The examples page, examples/index.html: site/src/examples.html with the home page's stylesheet and one
// card per example. It lives one folder down, so the home page's local refs get a ../ in front.
function examplesPage(homeHtml, url) {
  let page = readFileSync(join(here, "src/examples.html"), "utf8");
  const css = homeHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if (!css) throw new Error("src/index.html: no <style> to share with the examples page");
  if (page.split("/* site: css */").length !== 2) throw new Error("src/examples.html needs exactly one /* site: css */");
  page = page.replace("/* site: css */", () => css);
  page = page.replace("<!-- examples -->", () => EXAMPLES.map((ex, i) => `      <div>
        <a href="${ex.slug}/"><img src="../${ex.image}" alt="" loading="lazy"></a>
        <div>
          <p class="label">Example ${i + 1} of ${EXAMPLES.length} · ${esc(ex.product)}, ${esc(ex.about)}</p>
          <h2><a href="${ex.slug}/">${esc(ex.name)}</a></h2>
          <p>${esc(ex.blurb)}</p>
          <p class="links"><a href="${ex.slug}/">Read the post</a><a href="${ex.slug}/motion.mp4">Watch the video, ${esc(ex.cut)}</a>${ex.deck ? `<a href="${ex.slug}/deck.html">Click through the slides</a>` : ""}<a href="${REPO}/blob/main/examples/${ex.slug}/plan.md">See the plan behind it</a></p>
        </div>
      </div>`).join("\n"));
  page = page.replace("<!-- footer -->", () => footer("../"));
  page = page.replace("<!-- canonical -->", () => (url ? `<link rel="canonical" href="${esc(url)}examples/">` : ""));
  return page;
}

// url: where site/dist will be served, e.g. https://example.com/buildnotes/ (a trailing slash is added).
export function build({ out = join(here, "dist"), url } = {}) {
  if (url) {
    if (!/^https?:\/\//.test(url)) throw new Error(`--url must start with http:// or https:// (got "${url}")`);
    if (!url.endsWith("/")) url += "/";
  }
  const warnings = [];
  const src = readFileSync(join(here, "src/index.html"), "utf8");
  for (const m of ["/* template: keyed-anatomy */", "// template: keyed\n", "<!-- share -->", "<!-- description -->", "<!-- footer -->"]) {
    if (src.split(m).length !== 2) throw new Error(`src/index.html needs exactly one ${m.trim()}`);
  }
  let html = fill(src, { url, warnings });

  const files = new Map([[SHARE.image, join(here, SHARE.image)]]);
  // Collect a page's local refs into `files` and rewrite them to their published paths. `base` is the
  // page's own folder in the site ("" for the home page, "examples/" for the examples page) and `up` the
  // way back to the root from there. Links to an example's folder (examples/<slug>/) are served from
  // EXAMPLES below, not copied; so are the site root and anchors there.
  const collect = (page, { base = "", up = "" } = {}) => page.replace(LOCAL, (all, attr, ref) => {
    if (/^(\.\.\/|\.\/)+(#.*)?$/.test(ref)) return all;
    const resolved = ref.startsWith("../") ? ref.slice(3) : base + ref;
    if (resolved === "examples/") return all; // the examples page, written below
    const folder = resolved.match(/^examples\/([^/]+)\/$/);
    if (folder) {
      if (!EXAMPLES.some((e) => e.slug === folder[1])) throw new Error(`${attr}="${ref}": not in EXAMPLES`);
      return all;
    }
    const { from, to } = locate(resolved);
    if (!existsSync(from)) throw new Error(`${attr}="${ref}": no such file (${from})`);
    files.set(to, from);
    return `${attr}="${to.startsWith(base) ? to.slice(base.length) : up + to}"`;
  });
  html = collect(html);
  const examples = collect(examplesPage(html, url), { base: "examples/", up: "../" });

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), html);
  // Every example is served as a folder, linked from the page or not, with its video next to its post.
  for (const ex of EXAMPLES) {
    files.set(`examples/${ex.slug}/index.html`, join(root, "examples", ex.slug, ex.file));
    files.set(`examples/${ex.slug}/motion.mp4`, join(root, "examples", ex.slug, "motion.mp4"));
    if (ex.deck) for (const f of ["deck.html", "deck.pdf"]) files.set(`examples/${ex.slug}/${f}`, join(root, "examples", ex.slug, f));
    const { from, to } = locate(ex.image); // its link-preview image, whether or not a page shows it
    files.set(to, from);
  }
  for (const [to, from] of files) {
    if (!existsSync(from)) throw new Error(`missing ${from}${to === SHARE.image ? " (make it with node site/card.mjs)" : ""}`);
    mkdirSync(dirname(join(out, to)), { recursive: true });
    const post = to.match(POST);
    if (post) writeFileSync(join(out, to), wrapPost(post[1], readFileSync(from, "utf8"), url));
    // A deck, like a post, is written for a viewer that wraps it; a doctype keeps it out of quirks mode.
    else if (to.endsWith("/deck.html")) writeFileSync(join(out, to), `<!doctype html>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${readFileSync(from, "utf8")}`);
    else copyFileSync(from, join(out, to));
  }
  writeFileSync(join(out, "examples/index.html"), examples);
  files.set("examples/index.html", null);
  return { html, examples, files: [...files.keys()], warnings, out };
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
