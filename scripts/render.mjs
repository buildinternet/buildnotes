#!/usr/bin/env node
// render.mjs — the render pass in one command: the page at 1280 and 390 px, light and dark, a
// full-page screenshot of each, and the faults a reader would hit.
//
// Usage: node render.mjs <post.html> [--out <dir>]   (default <post dir>/render)
//
// Fails (exit 1) when the page scrolls sideways, when a code or terminal block clips a line at desktop
// width (set "wrap" on the spec, or cut the line), or when an image doesn't load. On a phone, code
// that scrolls inside its card is normal and only noted. Needs Chrome (set CHROME_PATH if it isn't found).

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openPage } from "./chrome.mjs";

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const file = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!file) { console.error("usage: render.mjs <post.html> [--out dir]"); process.exit(2); }
const out = resolve(opt("out") ?? join(dirname(resolve(file)), "render"));
mkdirSync(out, { recursive: true });

// Runs in the page: what overflows, measured, not eyeballed.
const PROBE = `(() => {
  const label = (el) => (el.closest("figure")?.querySelector("figcaption span, figcaption")?.textContent || el.textContent.split("\\n")[0]).trim().slice(0, 60);
  const clipped = [...document.querySelectorAll("figure.code pre")]
    .filter((pre) => !pre.closest(".wrap, .scroll") && pre.scrollWidth > pre.clientWidth + 1)
    .map((pre) => ({ what: label(pre), over: pre.scrollWidth - pre.clientWidth }));
  const broken = [...document.images].filter((img) => !img.complete || !img.naturalWidth).map((img) => img.getAttribute("src")?.slice(0, 60));
  return { scrollW: document.documentElement.scrollWidth, innerW: innerWidth, height: document.documentElement.scrollHeight, clipped, broken };
})()`;

let bad = 0;
for (const width of [1280, 390]) {
  for (const theme of ["light", "dark"]) {
    const page = await openPage(pathToFileURL(resolve(file)).href, { width, height: width > 600 ? 800 : 844, scale: 1, theme });
    try {
      // Settle motion at a fixed moment so screenshots are comparable between runs.
      await page.evaluate(`document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(1); }); document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 1000; }); true`);
      const r = await page.evaluate(PROBE);
      const shot = join(out, `post-${width}-${theme}.png`);
      writeFileSync(shot, await page.screenshot({ x: 0, y: 0, width, height: r.height }));
      const faults = [];
      if (r.scrollW > r.innerW) faults.push(`scrolls sideways (${r.scrollW} px wide in a ${r.innerW} px window)`);
      const notes = [];
      for (const c of r.clipped) (width > 600 ? faults : notes).push(`code ${width > 600 ? "clipped" : "scrolls in its card"} by ${c.over} px: ${c.what}`);
      for (const b of r.broken) faults.push(`image didn't load: ${b}`);
      bad += faults.length;
      console.log(`${width} ${theme}: ${faults.length ? faults.map((f) => `✗ ${f}`).join("; ") : "ok"}${notes.length ? ` (${notes.join("; ")})` : ""} → ${shot}`);
    } finally {
      await page.close();
    }
  }
}
if (bad) console.log("Fix each ✗, then run again. Then look at the screenshots: this checks fit, not taste.");
process.exit(bad ? 1 : 0);
