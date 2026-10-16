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
// footer with the example's video, its plan, and the other examples. The video's chapters come from the
// motion.vtt beside it: the player has its own controls, with a segment per chapter on its scrubber, and
// lists them under it. examples/index.html lists them all, built from site/src/examples.html with the home
// page's stylesheet. Nothing to install; Node 22 or later.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { renderKind } from "../skills/buildnotes/scripts/viz.mjs";
import { takeWarnings } from "../skills/buildnotes/scripts/viz/util.mjs";
import { drawing } from "./iso.mjs";
import { FALLBACKS, familyNames } from "./fonts.mjs";

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

// The committed examples, in the order the shell's footer walks them. `product` is who the post is about
// and leads wherever an example is listed; `blurb` names the feature and says what it does, in one line.
// `file` is the committed page to serve as the example's index.html; `image` its card on the examples page.
// `deck`: the example also has deck.html and deck.pdf, the cut as slides, served next to its video.
export const EXAMPLES = [
  { slug: "sunny-walkthrough-videos", name: "Walkthrough videos", product: "Sunny", deck: true, file: "post.html", image: ".github/assets/walkthrough-keyed.webp",
    blurb: "Walkthrough videos: one export turns a room, a floor or a project into a looping tour." },
  { slug: "uploads-before-after", name: "Before and after, side by side", product: "Uploads", deck: true, file: "post.html", image: ".github/assets/before-after-compare.webp",
    blurb: "Before and after screenshots: tag two, and the pull request comment shows them side by side." },
  { slug: "releases-weekly-digests", name: "Weekly digests", product: "Release Notes Index", deck: true, file: "post-field-notes.html", image: ".github/assets/digest-card-hero.webp",
    blurb: "Weekly digests: a card, a replay of the week, and one email a week per reader." },
];
const REPO = "https://github.com/buildinternet/buildnotes";
const RAW = "https://raw.githubusercontent.com/buildinternet/buildnotes/main";
// An example's link-preview card, site/assets/og-<slug>.png, rendered by site/card.mjs.
export const exampleCard = (ex) => `assets/og-${ex.slug}.png`;

const POST = /^examples\/([^/]+)\/index\.html$/;
const DECK = /^examples\/[^/]+\/deck\.html$/;

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
/* body already pads the sides and the top (3rem); the top bar takes the home page's 60rem, the video section the post's column (--col, from its :root). */
.site-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 6px 20px; max-width: 60rem; margin: -1rem auto 3rem; }
.site-top nav { display: flex; flex-wrap: wrap; gap: 4px 20px; }
/* The video, in a box under the post's headline. */
.site-watch { display: grid; gap: 0; border: 1px solid #e3e3dd; border-radius: 6px; background: #f5f5f1; padding: 6px; }
.site-watch video { width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 3px; display: block; }
/* The player: the video with its own controls (the page's script swaps out the browser's), whose scrubber is
   one segment per chapter, and the chapters as a list under it. */
.site-player { position: relative; border-radius: 3px; overflow: hidden; background: #000; }
.site-player video { border-radius: 0; }
.site-player:fullscreen { display: flex; align-items: center; border-radius: 0; }
.site-player:fullscreen video { height: 100%; aspect-ratio: auto; object-fit: contain; }
.site-controls { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 10px; padding: 32px 12px 8px; background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.62)); color: #fff; transition: opacity 200ms ease; }
.site-controls[hidden] { display: none; }
.site-player.sp-idle .site-controls { opacity: 0; }
.site-player.sp-idle { cursor: none; }
.site-controls button { all: unset; flex: none; width: 30px; height: 30px; display: grid; place-items: center; cursor: pointer; border-radius: 3px; }
.site-controls button:focus-visible, .site-scrub:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.site-controls svg { width: 20px; height: 20px; fill: currentColor; }
.site-player[data-paused] .sp-i-pause, .site-player:not([data-paused]) .sp-i-play,
.site-player[data-muted] .sp-i-sound, .site-player:not([data-muted]) .sp-i-muted,
.site-player[data-full] .sp-i-full, .site-player:not([data-full]) .sp-i-exit { display: none; }
.site-scrub { flex: 1; min-width: 0; position: relative; display: flex; gap: 3px; align-items: center; height: 22px; cursor: pointer; touch-action: none; border-radius: 3px; }
.sp-seg { flex: 1 1 0; min-width: 3px; height: 4px; border-radius: 2px; background: linear-gradient(#fff, #fff) no-repeat 0 0 / var(--played, 0%) 100%, rgba(255, 255, 255, 0.32); transition: height 120ms ease; }
.site-scrub:hover .sp-seg, .site-scrub.sp-drag .sp-seg { height: 6px; }
.site-scrub .sp-seg.sp-hover { height: 8px; }
.sp-tip { position: absolute; bottom: 26px; left: 0; max-width: 18rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 4px 8px; border-radius: 3px; background: rgba(24, 24, 22, 0.92); color: #fff; font-size: 0.75rem; line-height: 1.3; pointer-events: none; }
.sp-tip[hidden] { display: none; }
.site-player .sp-tip b { font-family: "Martian Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 400; font-size: 0.6875rem; margin-right: 8px; color: #fff; }
.sp-time { flex: none; font-family: "Martian Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.6875rem; font-stretch: 87.5%; font-variant-numeric: tabular-nums; white-space: nowrap; }
@media (max-width: 30rem) { .sp-time { display: none; } }
.site-chapters ol { list-style: none; margin: 0; padding: 10px 6px 2px; columns: 2 15rem; column-gap: 16px; }
.site-chapters li { break-inside: avoid; }
.site-chapters button { all: unset; box-sizing: border-box; display: flex; gap: 10px; align-items: baseline; width: 100%; padding: 3px 0; cursor: pointer; color: #64645f; line-height: 1.35; }
.site-chapters button:hover { color: #1f1f1d; }
.site-chapters button:focus-visible { outline: 2px solid #3358d4; outline-offset: 2px; border-radius: 2px; }
.site-chapters button[aria-current] { color: #1f1f1d; font-weight: 600; }
.site-chapters .site-label { flex: none; min-width: 2.6em; font-weight: 400; font-variant-numeric: tabular-nums; }
.site-watch .site-watch-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 16px; padding: 10px 6px 4px; }
.site-watch b { color: #1f1f1d; font-weight: 600; }
.site-watch .site-links { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.site-watch .site-links a { text-decoration: underline; text-decoration-color: #d3d3cc; text-underline-offset: 0.2em; }
/* The rail: the examples, then this post's chapters. Only where it fits beside the post's widest figures (--wide). */
.site-rail { display: none; }
@media (min-width: 1320px) {
  .site-rail { display: grid; gap: 28px; align-content: start; position: fixed; top: 7rem; left: calc(50vw - 40rem); width: 11rem; max-height: calc(100vh - 9rem); overflow-y: auto; }
  .site-rail ol { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 7px; }
  .site-rail a { display: block; line-height: 1.35; }
  .site-rail a[aria-current] { color: #1f1f1d; font-weight: 600; }
  .site-rail .site-label { display: block; }
}
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

// The video's chapters, from the motion.vtt beside it (motion.mjs writes one with each export): [{ start, end, title }].
export function videoChapters(slug) {
  const file = join(root, "examples", slug, "motion.vtt");
  if (!existsSync(file)) return [];
  const secs = (t) => t.split(":").reduce((a, x) => a * 60 + Number(x), 0);
  return [...readFileSync(file, "utf8").matchAll(/^([\d:.]+) --> ([\d:.]+)\n(.+)$/gm)].map(([, a, b, title]) => ({ start: secs(a), end: secs(b), title }));
}

const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const ICON = (cls, d) => `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
const SPEAKER = `<path d="M3 7.5h3l4.5-3.5v12L6 12.5H3z"/>`;
const ICONS = {
  play: ICON("sp-i-play", `<path d="M6 4.2v11.6L15.5 10z"/>`),
  pause: ICON("sp-i-pause", `<path d="M5.5 4h3v12h-3zM11.5 4h3v12h-3z"/>`),
  sound: ICON("sp-i-sound", `${SPEAKER}<path d="M13.2 7.2a4 4 0 0 1 0 5.6M15.4 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`),
  muted: ICON("sp-i-muted", `${SPEAKER}<path d="M13.5 8l4 4M17.5 8l-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`),
  full: ICON("sp-i-full", `<path d="M3.5 8V3.5H8M12 3.5h4.5V8M16.5 12v4.5H12M8 16.5H3.5V12" fill="none" stroke="currentColor" stroke-width="1.8"/>`),
  exit: ICON("sp-i-exit", `<path d="M8 3.5V8H3.5M16.5 8H12V3.5M12 16.5V12h4.5M3.5 12H8v4.5" fill="none" stroke="currentColor" stroke-width="1.8"/>`),
};

// The video and its controls. With chapters (the motion.vtt beside it), the page's script replaces the
// browser's controls with its own, whose scrubber has one segment per chapter, filled as the video plays;
// the chapters are also listed under it. Without the script, the browser's controls stay. The cue text is
// already escaped for HTML (WebVTT escapes the same way).
function player(marks) {
  const video = (track) => `<video src="motion.mp4" autoplay muted loop playsinline controls preload="metadata" aria-label="The video cut of this post.">${track}</video>`;
  if (!marks.length) return video("");
  const total = marks.at(-1).end;
  return `<div class="site-player" data-paused data-muted>
      ${video(`<track kind="chapters" src="motion.vtt" srclang="en" label="Chapters" default>`)}
      <div class="site-controls" hidden>
        <button type="button" class="sp-play" aria-label="Play">${ICONS.play}${ICONS.pause}</button>
        <div class="site-scrub" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0" aria-valuetext="0:00">${marks.map((c) => `<span class="sp-seg" data-at="${c.start}" data-title="${c.title}" style="flex-grow: ${(c.end - c.start).toFixed(2)}"></span>`).join("")}<span class="sp-tip" hidden></span></div>
        <span class="sp-time"><span class="sp-now">0:00</span> / ${clock(total)}</span>
        <button type="button" class="sp-mute" aria-label="Unmute">${ICONS.sound}${ICONS.muted}</button>
        <button type="button" class="sp-full" aria-label="Full screen">${ICONS.full}${ICONS.exit}</button>
      </div>
    </div>
    <nav class="site-chapters" aria-label="Chapters">
      <ol>${marks.map((c) => `<li><button type="button" data-at="${c.start}"><span class="site-label">${clock(c.start)}</span>${c.title}</button></li>`).join("")}</ol>
    </nav>`;
}

export function wrapPost(slug, post, url) {
  const i = EXAMPLES.findIndex((e) => e.slug === slug);
  if (i < 0) throw new Error(`examples/${slug} is not in EXAMPLES (site/build.mjs)`);
  const ex = EXAMPLES[i];
  // The post starts with its <title> and font links, then its <style>; those first lines belong in <head>.
  const at = post.indexOf("<style>");
  if (at < 0) throw new Error(`examples/${slug}/post.html: no <style>`);
  const head = post.slice(0, at).trim();
  let body = post.slice(at);
  // The video goes in a box right under the post's headline.
  const mast = body.indexOf("</header>");
  if (mast < 0) throw new Error(`examples/${slug}: no </header> to put the video under`);
  const marks = videoChapters(slug);
  const watch = `
  <aside class="site-bar site-watch" id="site-video" aria-label="The video">
    ${player(marks)}
    <div class="site-watch-bar"><b>The same story as a video</b><span class="site-links"><a href="motion.mp4" download>Download</a>${ex.deck ? `<a href="deck.html">Slides</a>` : ""}<a href="${REPO}/blob/main/examples/${ex.slug}/plan.md">The plan behind it</a></span></div>
  </aside>`;
  body = body.slice(0, mast + 9) + watch + body.slice(mast + 9);
  // The rail lists the examples, then this post's chapters (<section class="ch" id="…"> with an <h2>).
  const chapters = [...body.matchAll(/<section class="ch" id="([^"]+)">\s*<h2>(?:<span class="n">[^<]*<\/span>)?([^<]+)<\/h2>/g)].map(([, id, name]) => [id, name.trim()]);
  const rail = `<nav class="site-bar site-rail" aria-label="Examples and chapters">
  <div><span class="site-label">Examples</span><ol>
${EXAMPLES.map((o) => `    <li><a href="../${o.slug}/"${o === ex ? ' aria-current="page"' : ""}>${esc(o.product)}</a></li>`).join("\n")}
  </ol></div>
  <div><span class="site-label">In this post</span><ol>
    <li><a href="#site-video">The video</a></li>
${chapters.map(([id, name]) => `    <li><a href="#${id}">${name}</a></li>`).join("\n")}
  </ol></div>
</nav>`;
  const title = head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ex.name;
  const share = shareTags({
    url: url && new URL(`examples/${ex.slug}/`, url).href,
    type: "article",
    title: `${ex.product}: ${ex.name}`,
    description: ex.blurb,
    image: absolute(url, exampleCard(ex), `site/${exampleCard(ex)}`), imageType: "image/png", width: 1200, height: 630,
    imageAlt: `A buildnotes example: ${ex.product}, ${ex.name.toLowerCase()}. Beside it, a figure from the post.`,
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
.site-footer { font-family: "Archivo", "Helvetica Neue", Arial, sans-serif; max-width: 60rem; margin: 4rem auto 0; -webkit-font-smoothing: antialiased; }
.site-footer footer ul { margin: 0; padding: 0; }
.site-footer footer h4, .site-footer footer p { margin: 0; }
${footerCss()}</style>
</head>
<body>
<header class="site-bar site-top">
  <a class="site-name" href="../../">buildnotes</a>
  <nav aria-label="Site"><a href="../">Examples</a><a href="../../#how">How it works</a><a href="../../#makes">Outputs</a><a href="../../#install">Install</a><a href="${REPO}">GitHub</a></nav>
</header>
${rail}
${body}
<div class="site-footer">
${footer("../../")}
</div>
<script>
// The rail marks the chapter on screen; readers who ask for less motion get the video paused, with its controls.
(() => {
  const links = [...document.querySelectorAll('.site-rail a[href^="#"]')];
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) seen.set(e.target.id, e.isIntersecting);
    const on = links.find((a) => seen.get(a.hash.slice(1)));
    for (const a of links) a === on ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current");
  }, { rootMargin: "0px 0px -60% 0px" });
  for (const a of links) { const t = document.getElementById(a.hash.slice(1)); if (t) io.observe(t); }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.querySelector(".site-watch video")?.pause();
})();
// The player's own controls: a scrubber with a segment per chapter (click, drag, or the arrow keys; Page Up and
// Page Down move a chapter), play, mute and full screen. They fade while the video plays and the pointer rests.
(() => {
  const box = document.querySelector(".site-player");
  if (!box) return;
  const video = box.querySelector("video");
  const bar = box.querySelector(".site-controls");
  const scrub = bar.querySelector(".site-scrub");
  const tip = scrub.querySelector(".sp-tip");
  const now = bar.querySelector(".sp-now");
  const [play, mute, full] = [".sp-play", ".sp-mute", ".sp-full"].map((s) => bar.querySelector(s));
  const segs = [...scrub.querySelectorAll(".sp-seg")];
  const items = [...document.querySelectorAll(".site-chapters button[data-at]")];
  const starts = segs.map((s) => Number(s.dataset.at));
  const titles = segs.map((s) => s.dataset.title);
  const total = () => video.duration || Number(scrub.getAttribute("aria-valuemax"));
  const end = (i) => starts[i + 1] ?? total();
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const clock = (t) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
  const chapterAt = (t) => Math.max(0, starts.findLastIndex((a) => a <= t + 0.05));
  video.controls = false;
  bar.hidden = false;

  let current = -1;
  const draw = () => {
    const t = video.currentTime;
    segs.forEach((s, i) => s.style.setProperty("--played", clamp(((t - starts[i]) / (end(i) - starts[i])) * 100, 0, 100) + "%"));
    now.textContent = clock(t);
    const on = chapterAt(t);
    scrub.setAttribute("aria-valuenow", t.toFixed(1));
    scrub.setAttribute("aria-valuetext", clock(t) + ", " + titles[on]);
    if (on !== current) { items[current]?.removeAttribute("aria-current"); items[on]?.setAttribute("aria-current", "true"); current = on; }
  };
  const state = () => {
    box.toggleAttribute("data-paused", video.paused);
    box.toggleAttribute("data-muted", video.muted);
    play.setAttribute("aria-label", video.paused ? "Play" : "Pause");
    mute.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
  };
  let raf = 0;
  const tick = () => { draw(); raf = video.paused ? 0 : requestAnimationFrame(tick); };
  video.addEventListener("play", () => { state(); wake(); if (!raf) raf = requestAnimationFrame(tick); });
  video.addEventListener("pause", () => { state(); wake(); });
  video.addEventListener("volumechange", state);
  for (const e of ["seeked", "timeupdate", "loadedmetadata"]) video.addEventListener(e, draw);
  const toggle = () => (video.paused ? video.play().catch(() => {}) : video.pause());
  const seekTo = (t) => { video.currentTime = clamp(t, 0, total() - 0.05); draw(); };

  // A pointer's place on the scrubber, as a time: the segment under it (or the nearest), and how far into it.
  const timeAt = (x) => {
    let i = 0, best = Infinity, frac = 0;
    segs.forEach((s, j) => {
      const r = s.getBoundingClientRect();
      const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (d < best) { best = d; i = j; frac = clamp((x - r.left) / r.width, 0, 1); }
    });
    return { i, t: starts[i] + frac * (end(i) - starts[i]) };
  };
  const showTip = (x) => {
    const { i, t } = timeAt(x);
    tip.replaceChildren(Object.assign(document.createElement("b"), { textContent: clock(t) }), titles[i]);
    tip.hidden = false;
    const r = scrub.getBoundingClientRect();
    tip.style.left = clamp(x - r.left - tip.offsetWidth / 2, 0, r.width - tip.offsetWidth) + "px";
    segs.forEach((s, j) => s.classList.toggle("sp-hover", j === i));
  };
  const hideTip = () => { tip.hidden = true; segs.forEach((s) => s.classList.remove("sp-hover")); };
  let dragging = false;
  let resume = false;
  scrub.addEventListener("pointerdown", (e) => {
    if (e.button) return;
    dragging = true;
    resume = !video.paused;
    scrub.setPointerCapture(e.pointerId);
    scrub.classList.add("sp-drag");
    video.pause();
    seekTo(timeAt(e.clientX).t);
    showTip(e.clientX);
  });
  scrub.addEventListener("pointermove", (e) => {
    if (dragging) seekTo(timeAt(e.clientX).t);
    if (dragging || e.pointerType === "mouse") showTip(e.clientX);
  });
  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    scrub.classList.remove("sp-drag");
    if (resume) video.play().catch(() => {});
    if (e.pointerType !== "mouse") hideTip();
  };
  scrub.addEventListener("pointerup", stop);
  scrub.addEventListener("pointercancel", stop);
  scrub.addEventListener("pointerleave", () => { if (!dragging) hideTip(); });
  scrub.addEventListener("keydown", (e) => {
    const t = video.currentTime;
    const i = chapterAt(t);
    const to = {
      ArrowLeft: t - 5, ArrowDown: t - 5, ArrowRight: t + 5, ArrowUp: t + 5,
      PageDown: t - starts[i] > 1 ? starts[i] : starts[Math.max(0, i - 1)],
      PageUp: starts[Math.min(starts.length - 1, i + 1)],
      Home: 0, End: starts.at(-1),
    }[e.key];
    if (to !== undefined) { e.preventDefault(); seekTo(to); }
    else if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
  });

  play.addEventListener("click", toggle);
  mute.addEventListener("click", () => { video.muted = !video.muted; });
  const fullscreen = () => document.fullscreenElement || document.webkitFullscreenElement;
  full.addEventListener("click", () => {
    if (fullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (box.requestFullscreen) box.requestFullscreen().catch(() => video.webkitEnterFullscreen?.());
    else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
    else video.webkitEnterFullscreen?.();
  });
  const onFull = () => { box.toggleAttribute("data-full", !!fullscreen()); full.setAttribute("aria-label", fullscreen() ? "Exit full screen" : "Full screen"); };
  document.addEventListener("fullscreenchange", onFull);
  document.addEventListener("webkitfullscreenchange", onFull);

  // The controls fade after a moment of play with the pointer still, and come back on any move, tap or key.
  // A tap on a faded video brings the controls back rather than pausing it.
  let idle = 0;
  let wasIdle = false;
  function wake() {
    box.classList.remove("sp-idle");
    clearTimeout(idle);
    idle = setTimeout(() => { if (!video.paused && !dragging && !bar.contains(document.activeElement)) box.classList.add("sp-idle"); }, 2500);
  }
  box.addEventListener("pointerdown", () => { wasIdle = box.classList.contains("sp-idle"); wake(); }, true);
  box.addEventListener("pointermove", wake);
  box.addEventListener("focusin", wake);
  box.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !video.paused && !dragging) box.classList.add("sp-idle"); });
  video.addEventListener("click", (e) => { if (e.pointerType !== "mouse" && wasIdle) return; toggle(); });
  video.addEventListener("dblclick", () => full.click());
  box.addEventListener("keydown", (e) => {
    if (e.target.closest("button, .site-scrub")) return;
    if (e.key === "k" || e.key === " ") { e.preventDefault(); toggle(); }
  });

  for (const b of items) b.addEventListener("click", () => { seekTo(Number(b.dataset.at)); if (video.paused) video.play().catch(() => {}); });
  state();
  draw();
  wake();
})();
</script>
</body>
</html>
`;
}

// What link previews show. og:image must be an absolute URL, and the site has no home yet: with --url it
// points into the built site, without it at the committed image on GitHub (live once merged to main).
export const SHARE = {
  title: "buildnotes: turn pull requests into posts and videos worth sharing",
  description: "A skill for coding agents. It reads a feature's issues, PRs and reviews, finds the few decisions that shaped it, and writes them up as a post, a video or slides.",
  image: "assets/og.png",
  imageAlt: "buildnotes: Turn pull requests into posts and videos worth sharing. How it was built, and why. Beside it, an isometric drawing of a weekly digest card with numbered parts.",
  fallback: `${RAW}/site/assets/og.png`,
};

const EXAMPLES_DESCRIPTION = "Three real features, each made into a post, a video and slides: walkthrough videos in Sunny, before and after screenshots in Uploads, and weekly digests in Release Notes Index.";

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

// Every built page uses the site's own fonts (site/assets/fonts.css, written by site/fonts.mjs). The
// example posts and decks link Google Fonts, as the Artifact viewer they're written for requires; here
// that link becomes fonts.css, `up` being the way back to the site root. Every font stack then gets each
// family's "<family> Fallback" face right after it: a local font sized to take the same space, so text
// that paints before its web font has loaded doesn't move when the web font swaps in.
const GOOGLE_PRECONNECT = /<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>\n?/g;
const GOOGLE_CSS = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?([^"]+)">/g;
export function siteFonts(page, up, what) {
  page = page.replace(GOOGLE_PRECONNECT, "").replace(GOOGLE_CSS, (all, query) => {
    for (const [, f] of query.matchAll(/family=([^:&]+)/g)) {
      const family = decodeURIComponent(f).replace(/\+/g, " ");
      if (!familyNames.includes(family)) throw new Error(`${what}: uses ${family}, which site/fonts.mjs doesn't serve (add it to FAMILIES and run node site/fonts.mjs)`);
    }
    return `<link rel="stylesheet" href="${up}assets/fonts.css">`;
  });
  if (/fonts\.(googleapis|gstatic)\.com/.test(page)) throw new Error(`${what}: links Google Fonts in a way site/build.mjs doesn't replace`);
  // Only in CSS: <style> blocks and style attributes. A script can hold a family name too, and a comma
  // after it there is not a font stack.
  const stacks = (css) => Object.keys(FALLBACKS).reduce((t, family) =>
    t.replace(new RegExp(`(["'])${family}\\1(?=\\s*,)(?!\\s*,\\s*["']${family} Fallback)`, "g"), `"${family}", "${family} Fallback"`), css);
  return page
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (all, open, css, close) => open + stacks(css) + close)
    .replace(/\bstyle="([^"]*)"/g, (all, css) => `style="${stacks(css.replace(/&quot;/g, '"')).replace(/"/g, "&quot;")}"`);
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
      <div class="brand"><b>buildnotes</b><p>Turn pull requests into posts and videos worth sharing. A skill for coding agents.</p></div>
      <div><h4>Examples</h4><ul>
${EXAMPLES.map((ex) => `        <li><a href="${up}examples/${ex.slug}/">${esc(ex.product)}</a></li>`).join("\n")}
        <li><a href="${up}examples/">All examples</a></li>
      </ul></div>
      <div><h4>Docs</h4><ul>
${docs.map(([name, path]) => `        <li><a href="${REPO}/blob/main/${path}">${esc(name)}</a></li>`).join("\n")}
      </ul></div>
      <div><h4>Project</h4><ul>
        <li><a href="${REPO}">GitHub</a></li>
        <li><a href="${REPO}/blob/main/CHANGELOG.md">Changelog</a></li>
        <li><a href="${REPO}/blob/main/LICENSE">License</a></li>
      </ul><h4>Also by Build Internet</h4><ul>
        <li><a href="https://releases.sh">Release Notes Index</a></li>
        <li><a href="https://uploads.sh">Uploads</a></li>
      </ul></div>
    </div>
    <div class="by">
      <span>By <a href="https://zachdunn.com">Zach Dunn</a> / <a href="https://buildinternet.com">Build Internet</a></span>
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
  page = page.replace("<!-- examples -->", () => EXAMPLES.map((ex) => `      <div>
        <a href="${ex.slug}/"><img src="../${ex.image}" alt="" loading="lazy"></a>
        <div>
          <h2><a href="${ex.slug}/">${esc(ex.product)}</a></h2>
          <p>${esc(ex.blurb)}</p>
          <p class="formats"><a href="${ex.slug}/">Post</a><a href="${ex.slug}/#site-video">Video</a>${ex.deck ? `<a href="${ex.slug}/deck.html">Slides</a>` : ""}</p>
        </div>
      </div>`).join("\n"));
  page = page.replace("<!-- footer -->", () => footer("../"));
  page = page.replace("<!-- share -->", () => shareTags({
    ...SHARE, title: "Examples · buildnotes", description: EXAMPLES_DESCRIPTION, url: url && new URL("examples/", url).href,
    image: absolute(url, SHARE.image, `site/${SHARE.image}`), imageType: "image/png", width: 1200, height: 630,
  }));
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
    const folder = resolved.match(/^examples\/([^/]+)\/(#.*)?$/);
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
  writeFileSync(join(out, "index.html"), siteFonts(html, "", "src/index.html"));
  // Every example is served as a folder, linked from the page or not, with its video next to its post.
  for (const ex of EXAMPLES) {
    files.set(`examples/${ex.slug}/index.html`, join(root, "examples", ex.slug, ex.file));
    files.set(`examples/${ex.slug}/motion.mp4`, join(root, "examples", ex.slug, "motion.mp4"));
    if (videoChapters(ex.slug).length) files.set(`examples/${ex.slug}/motion.vtt`, join(root, "examples", ex.slug, "motion.vtt"));
    if (ex.deck) for (const f of ["deck.html", "deck.pdf"]) files.set(`examples/${ex.slug}/${f}`, join(root, "examples", ex.slug, f));
    files.set(exampleCard(ex), join(here, exampleCard(ex))); // its link-preview card
  }
  // The font files: fonts.css names them, and the pages preload a few.
  for (const f of readdirSync(join(here, "assets/fonts"))) files.set(`assets/fonts/${f}`, join(here, "assets/fonts", f));
  for (const [, f] of readFileSync(join(here, "assets/fonts.css"), "utf8").matchAll(/url\(([^)]+)\)/g)) {
    if (!existsSync(join(here, "assets", f))) throw new Error(`assets/fonts.css names ${f}, which isn't there (run node site/fonts.mjs)`);
  }
  for (const [to, from] of files) {
    if (!existsSync(from)) throw new Error(`missing ${from}${/^assets\/og[-.]/.test(to) ? " (make it with node site/card.mjs)" : ""}`);
    mkdirSync(dirname(join(out, to)), { recursive: true });
    const post = to.match(POST);
    if (post) writeFileSync(join(out, to), siteFonts(wrapPost(post[1], readFileSync(from, "utf8"), url), "../../", to));
    else if (DECK.test(to)) writeFileSync(join(out, to), siteFonts(readFileSync(from, "utf8"), "../../", to));
    else copyFileSync(from, join(out, to));
  }
  writeFileSync(join(out, "examples/index.html"), siteFonts(examples, "../", "src/examples.html"));
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
