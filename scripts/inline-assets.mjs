#!/usr/bin/env node
// inline-assets.mjs — embed local images/video referenced by src, poster or srcset as data URIs.
//
// Usage: node inline-assets.mjs post.html [--standalone] > post.published.html
//
// --standalone wraps the page in a full document (doctype, charset, viewport) for hosting
// outside an Artifact. Artifact publishing adds that skeleton itself, so leave it off there.
//
// HTML comments (the template's authoring notes) are dropped from the output; --keep-comments keeps them.
// Remote URLs (http/https/data) are left alone. Paths resolve relative to the HTML file.
// Prints a size report to stderr and exits 1 if a referenced file is missing.

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";

const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
const standalone = process.argv.includes("--standalone");
const keepComments = process.argv.includes("--keep-comments");
if (!file) {
  console.error("usage: inline-assets.mjs <post.html> [--standalone] [--keep-comments]");
  process.exit(2);
}
const base = dirname(resolve(file));
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".avif": "image/avif", ".mp4": "video/mp4", ".webm": "video/webm" };

let missing = 0;
let embedded = 0;
let bytes = 0;
// Split out HTML comments so commented-out examples aren't embedded or reported missing.
const embed = (ref) => {
  if (/^(https?:|data:|#|\/\/)/i.test(ref)) return ref;
  const path = resolve(base, ref);
  const type = TYPES[extname(path).toLowerCase()];
  if (!type) return ref;
  if (!existsSync(path)) {
    console.error(`missing: ${ref}`);
    missing++;
    return ref;
  }
  const buf = readFileSync(path);
  embedded++;
  bytes += buf.length;
  return `data:${type};base64,${buf.toString("base64")}`;
};
// srcset is a comma-separated list of "url [descriptor]"; <picture><source srcset> is how dark pairs ship.
const embedSrcset = (v) => v.split(/,\s+/).map((c) => { const [u, ...d] = c.trim().split(/\s+/); return [embed(u), ...d].join(" "); }).join(", ");
const html = readFileSync(file, "utf8").split(/(<!--[\s\S]*?-->)/).map((part) => part.startsWith("<!--") ? (keepComments ? part : "") : part
  .replace(/\b(src|poster)="([^"]+)"/g, (_, attr, ref) => `${attr}="${embed(ref)}"`)
  .replace(/\bsrcset="([^"]+)"/g, (_, v) => `srcset="${embedSrcset(v)}"`)).join("");

process.stdout.write(
  standalone
    ? `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${html}\n</body>\n</html>\n`
    : html,
);
const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.error(`inlined ${embedded} files (${(bytes / 1048576).toFixed(2)} MB raw) → page ${mb} MB${missing ? ` · ${missing} missing` : ""}`);
if (Number(mb) > 15) console.error("warning: page is over 15 MB; resize images before publishing");
process.exit(missing ? 1 : 0);
