#!/usr/bin/env node
// hero.mjs — make the home page hero's committed images. Needs Chrome, through the skill's scripts/chrome.mjs;
// the site build itself does not. Run it again when a picture, the layout (site/assets/hero/layout.js) or the
// scene's look changes, and commit what it writes.
//
//   images   each picture on the table, from site/hero/src/, cut to the width it's drawn at, in two sizes:
//            site/assets/hero/d/ for desktop and site/assets/hero/m/ for phones. The GPU holds every image
//            decoded, at 4 bytes a pixel (a third more for mipmaps) whatever the file's format, so pixel
//            count is what costs memory. Width: on the table × the stage's scale × hero.js's 1.25× render
//            cap × 1.3 for perspective and the hover lift; never enlarged.
//   posters  site/assets/hero/poster.jpg and poster-phone.jpg: the Sunny view at rest, baked from the built
//            page, without the paper fades (the page lays those on top), the chip, or the video. They show
//            until the scene is ready, and for good under reduced motion or without WebGL.
//
// Usage: node site/hero.mjs [images] [posters]   (both when neither is named)

import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, createReadStream, statSync, copyFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { openPage } from "../skills/buildnotes/scripts/chrome.mjs";
import { CUTS, drawnWidths } from "./assets/hero/layout.js";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "hero/src"), OUT = join(here, "assets/hero");
const RENDER_CAP = 1.25, HEADROOM = 1.3;

// Re-encode an image in the page: draw it to a canvas `w` px wide (or at its own size) and return a JPEG.
const JPEG = (dataUrl, w) => `(async () => {
  const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode();
  const width = Math.min(${w ?? "img.naturalWidth"}, img.naturalWidth), height = Math.round(img.naturalHeight * width / img.naturalWidth);
  const c = Object.assign(document.createElement("canvas"), { width, height }), g = c.getContext("2d");
  g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, width, height);
  return c.toDataURL("image/jpeg", 0.86).split(",")[1];
})()`;
const dataUrl = (file) => `data:image/${extname(file) === ".png" ? "png" : "jpeg"};base64,${readFileSync(file).toString("base64")}`;

async function images() {
  const page = await openPage("about:blank", { width: 400, height: 300, scale: 1 });
  try {
    for (const [cut, s] of Object.entries(CUTS)) {
      for (const [src, w] of drawnWidths()) {
        const px = Math.round((w * s * RENDER_CAP * HEADROOM) / 2) * 2, to = join(OUT, cut, src);
        mkdirSync(dirname(to), { recursive: true });
        writeFileSync(to, Buffer.from(await page.evaluate(JPEG(dataUrl(join(SRC, src)), px)), "base64"));
      }
    }
  } finally { await page.close(); }
  console.error(`wrote ${drawnWidths().size * Object.keys(CUTS).length} images to ${OUT}/{${Object.keys(CUTS)}}`);
}

// The built site, served locally (the scene fetches its model and images, which a file:// page can't),
// without its videos so the clusters show their stills.
async function serveBuild() {
  for (const p of ["poster.jpg", "poster-phone.jpg"]) {   // the build wants the posters to exist; any picture will do
    if (!existsSync(join(OUT, p))) copyFileSync(join(SRC, "sunny/frame-01.jpg"), join(OUT, p));
  }
  const { build } = await import("./build.mjs");
  const dir = mkdtempSync(join(tmpdir(), "buildnotes-hero-"));
  build({ out: dir });
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".glb": "model/gltf-binary" };
  const server = createServer((req, res) => {
    const path = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
    if (!path.startsWith(dir) || extname(path) === ".mp4" || !existsSync(path) || !statSync(path).isFile()) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    createReadStream(path).pipe(res);
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => { server.close(); rmSync(dir, { recursive: true, force: true }); } };
}

async function posters() {
  const site = await serveBuild();
  try {
    // Desktop: the stage at its widest (1920 × 600); phones: the widest phone layout (640 × 380).
    for (const [width, scale, name] of [[1920, 1.5, "poster.jpg"], [640, 2, "poster-phone.jpg"]]) {
      const page = await openPage(site.url, { width, height: 1000, scale });
      try {
        const rect = await page.evaluate(`(async () => {
          const st = document.createElement("style");
          st.textContent = ".hero-table .stage::after{display:none!important}.hero-table .req,.hero-table .poster,.hero-table .stops{visibility:hidden}";
          document.head.append(st);
          const stage = document.querySelector("[data-hero] .stage");
          stage.scrollIntoView({ block: "center" });
          for (let i = 0; i < 300 && !document.querySelector("[data-hero].ready"); i++) await new Promise((r) => setTimeout(r, 100));
          if (!document.querySelector("[data-hero].ready")) throw new Error("the hero's scene never got ready");
          await new Promise((r) => setTimeout(r, 400));
          const b = stage.getBoundingClientRect();
          return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height };
        })()`);
        const png = await page.screenshot(rect);
        writeFileSync(join(OUT, name), Buffer.from(await page.evaluate(JPEG(`data:image/png;base64,${png.toString("base64")}`)), "base64"));
        if (page.problems.length) console.error(`! ${name}: ${page.problems.join("; ")}`);
        console.error(`wrote ${join(OUT, name)} (${rect.width} × ${rect.height})`);
      } finally { await page.close(); }
    }
  } finally { site.close(); }
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) { console.error("usage: node site/hero.mjs [images] [posters]"); process.exit(0); }
const all = !argv.length;
if (all || argv.includes("images")) await images();
if (all || argv.includes("posters")) await posters();
