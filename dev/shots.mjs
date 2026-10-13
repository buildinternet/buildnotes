#!/usr/bin/env node
// shots.mjs — screenshot every figure in the component gallery at 1280×800 and 390×844, light and
// dark, with headless Chrome (scripts/chrome.mjs); check that nothing scrolls the page sideways; then
// build a contact sheet. The four modes run in parallel, one Chrome each.
//
// Usage: node dev/shots.mjs [--only flow] [--time 1]
// Writes runs/components/shots/<id>-<width>-<theme>.png and runs/components/sheet.png.
// --time: the moment (seconds) SVG motion is frozen at, so a dot shows mid-trip (default 1).
// Needs Chrome (set CHROME_PATH if it isn't found).

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openPage } from "../scripts/chrome.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const dir = join(root, "runs/components");
const shots = join(dir, "shots");
mkdirSync(shots, { recursive: true });

execFileSync("node", [join(root, "dev/gallery.mjs"), ...(opt("only") ? ["--only", opt("only")] : [])], { stdio: "inherit" });
const page = pathToFileURL(join(dir, "gallery.html")).href;
const ids = [...readFileSync(join(dir, "gallery.html"), "utf8").matchAll(/<div class="ex" id="([^"]+)"/g)].map((m) => m[1]);
const time = Number(opt("time") ?? 1);
const modes = [[1280, 800, "light"], [1280, 800, "dark"], [390, 844, "light"], [390, 844, "dark"]];

async function shoot([w, h, theme]) {
  const p = await openPage(page, { width: w, height: h, scale: 2, theme });
  try {
    await new Promise((done) => setTimeout(done, 800));
    await p.evaluate(`document.querySelectorAll("svg").forEach((s) => { s.pauseAnimations?.(); s.setCurrentTime?.(${time}); }); document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 600; }); true`);
    const [scrollW, innerW] = await p.evaluate("[document.documentElement.scrollWidth, innerWidth]");
    const ok = scrollW <= innerW;
    const rows = [];
    for (const id of ids) {
      const box = await p.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(`#${id} figure`)}).getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
      const file = join(shots, `${id}-${w}-${theme}.png`);
      writeFileSync(file, await p.screenshot(box));
      rows.push({ id, w, theme, file });
    }
    return { line: `${w}×${h} ${theme}: scrollWidth ${scrollW} / innerWidth ${innerW} ${ok ? "ok" : "✗ sideways scroll"}`, ok, rows };
  } finally {
    await p.close();
  }
}

const results = await Promise.all(modes.map(shoot));
for (const r of results) console.log(r.line);
const bad = results.filter((r) => !r.ok).length;
const rows = results.flatMap((r) => r.rows);

// Contact sheet: one row per figure, the four modes side by side.
const cell = (r) => `<figure class="${r.theme}"><img src="${pathToFileURL(r.file).href}"><figcaption>${r.w} · ${r.theme}</figcaption></figure>`;
writeFileSync(join(dir, "sheet.html"), `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:16px;font:12px ui-monospace,monospace;background:#888}
section{display:grid;grid-template-columns:3fr 3fr 1.3fr 1.3fr;gap:12px;align-items:start;margin-bottom:24px}
h2{grid-column:1/-1;margin:0;font-size:14px;color:#fff}
figure{margin:0}img{width:100%;display:block;border:1px solid #555}figcaption{color:#eee;margin-top:4px}
</style>${ids.map((id) => `<section><h2>${id}</h2>${rows.filter((r) => r.id === id).map(cell).join("")}</section>`).join("")}`);
const sheet = await openPage(pathToFileURL(join(dir, "sheet.html")).href, { width: 1600, height: 900, scale: 1 });
try {
  await sheet.evaluate("Promise.all([...document.images].map((i) => i.decode().catch(() => {}))).then(() => true)");
  const height = await sheet.evaluate("document.documentElement.scrollHeight");
  writeFileSync(join(dir, "sheet.png"), await sheet.screenshot({ x: 0, y: 0, width: 1600, height }));
} finally {
  await sheet.close();
}
console.log(`${rows.length} shots in ${shots}; contact sheet ${join(dir, "sheet.png")}`);
process.exit(bad ? 1 : 0);
