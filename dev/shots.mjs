#!/usr/bin/env node
// shots.mjs — screenshot every figure in the component gallery at 1280×800 and 390×844, light and
// dark, with agent-browser; check that nothing scrolls the page sideways; then build a contact sheet.
//
// Usage: node dev/shots.mjs [--only flow] [--time 1]
// Writes runs/components/shots/<id>-<width>-<theme>.png and runs/components/sheet.png.
// --time: the moment (seconds) SVG motion is frozen at, so a dot shows mid-trip (default 1).

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const dir = join(root, "runs/components");
const shots = join(dir, "shots");
mkdirSync(shots, { recursive: true });

execFileSync("node", [join(root, "dev/gallery.mjs"), ...(opt("only") ? ["--only", opt("only")] : [])], { stdio: "inherit" });
const page = `file://${join(dir, "gallery.html")}`;
const ids = [...readFileSync(join(dir, "gallery.html"), "utf8").matchAll(/<div class="ex" id="([^"]+)"/g)].map((m) => m[1]);

const ab = (...args) => execFileSync("agent-browser", ["--session", "viz-shots", ...args], { encoding: "utf8" }).trim();
const modes = [[1280, 800, "light"], [1280, 800, "dark"], [390, 844, "light"], [390, 844, "dark"]];
const rows = [];
let bad = 0;
try {
  for (const [w, h, theme] of modes) {
    ab("set", "viewport", String(w), String(h), "2");
    ab("set", "media", theme);
    ab("open", page);
    ab("wait", "800");
    ab("eval", `document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(${Number(opt("time") ?? 1)}); }); document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 600; }); true`);
    const sw = JSON.parse(ab("eval", "JSON.stringify([document.documentElement.scrollWidth, innerWidth])"));
    const wide = JSON.parse(sw);
    const ok = wide[0] <= wide[1];
    if (!ok) bad++;
    console.log(`${w}×${h} ${theme}: scrollWidth ${wide[0]} / innerWidth ${wide[1]} ${ok ? "ok" : "✗ sideways scroll"}`);
    for (const id of ids) {
      const file = join(shots, `${id}-${w}-${theme}.png`);
      // Show one section at a time at the top of the page: agent-browser's element shots go wrong below the fold.
      ab("eval", `{ const t = document.getElementById(${JSON.stringify(id)}); document.querySelectorAll("section.ch, .mast, .toc, .ex").forEach((s) => { s.style.display = s === t || s.contains(t) ? "" : "none"; }); scrollTo(0, 0); } true`);
      ab("screenshot", `#${id} figure`, file);
      rows.push({ id, w, theme, file });
    }
  }
} finally {
  try { ab("close"); } catch {}
}

// Contact sheet: one row per figure, the four modes side by side.
const cell = (r) => `<figure class="${r.theme}"><img src="${r.file}"><figcaption>${r.w} · ${r.theme}</figcaption></figure>`;
writeFileSync(join(dir, "sheet.html"), `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;font:12px ui-monospace,monospace;background:#888}
section{display:grid;grid-template-columns:3fr 3fr 1.3fr 1.3fr;gap:12px;align-items:start;margin-bottom:24px}
h2{grid-column:1/-1;margin:0;font-size:14px;color:#fff}
figure{margin:0}img{width:100%;display:block;border:1px solid #555}figcaption{color:#eee;margin-top:4px}
</style>${ids.map((id) => `<section><h2>${id}</h2>${rows.filter((r) => r.id === id).map(cell).join("")}</section>`).join("")}`);
const ab2 = (...args) => execFileSync("agent-browser", ["--session", "viz-sheet", ...args], { encoding: "utf8" });
try {
  ab2("set", "viewport", "1600", "900");
  ab2("open", `file://${join(dir, "sheet.html")}`);
  ab2("wait", "500");
  ab2("screenshot", "--full", join(dir, "sheet.png"));
} finally {
  try { ab2("close"); } catch {}
}
console.log(`${rows.length} shots in ${shots}; contact sheet ${join(dir, "sheet.png")}`);
process.exit(bad ? 1 : 0);
