#!/usr/bin/env node
// brand.mjs — a project's brand (colours, fonts, a logo), set once and followed by the post, the motion cut and the deck.
//
// Usage:
//   node brand.mjs <post.html>                 write the brand into the post, in place (the repo's brand.json)
//   node brand.mjs <post.html> --brand <file>  another brand file
//   node brand.mjs <post.html> --none          take a brand back out of the post
//   node brand.mjs --check [brand.json]        check a brand file: keys, colours, contrast, fonts, logo
//
// The brand lives next to house-style.md, at ~/.buildnotes/<repo>/brand.json (workdir.mjs prints the path),
// so every run in the repo finds it: the work dir's parent. Its shape:
//
//   {
//     "name": "Acme",
//     "colors": {
//       "light": { "accent": "#1a7f4b", "mark": "#c2410c" },
//       "dark":  { "accent": "#5fd39a" }
//     },
//     "fonts": { "display": "Space Grotesk", "body": "Source Serif 4", "mono": "JetBrains Mono",
//                "stylesheet": "https://fonts.googleapis.com/css2?family=..." },
//     "logo": { "light": "logo.svg", "dark": "logo-dark.svg" }
//   }
//
// Every part is optional. Colours are hex, by role (the template's tokens without the dashes): paper, ink,
// muted, rule, wash, card, accent, accent-wash, mark, landmark, dim, and for the motion cut's title and end
// cards hero, hero-ink, hero-muted. A role left out is derived where it follows from another (a rule from the
// paper and ink, a wash from the accent, the dark accent lightened from the light one until it reads, the
// hero from the accent) and otherwise keeps the template's value. A font is a family name, which gets the
// template's fallbacks, or a full stack. The logo is an SVG, PNG, WebP or JPEG path relative to the brand
// file: one path, or "light", "dark" and "hero" (the logo on the hero colour; default the dark one).
//
// The brand is written as a <style id="brand"> block (and a <link id="brand-fonts">) after the page's own
// styles, so the templates stay as they are and a page without a brand is unchanged. In a post it restyles
// Plain; field notes keeps its own colours and type and shows only the logo. motion.mjs and deck.mjs read the
// same file, and motion.json may carry "brand": overrides merged over it, a path to another file, or false.
// Errors stop; contrast below 4.5:1 for text on its ground is a warning. Warnings go to stderr.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dataUri, imageSize, svgSize } from "./image.mjs";

const BRAND_FILE = "brand.json";
const ROLES = ["paper", "ink", "muted", "rule", "wash", "card", "accent", "accent-wash", "mark", "landmark", "dim", "hero", "hero-ink", "hero-muted"];
const KEYS = { top: ["name", "colors", "fonts", "logo"], colors: ["light", "dark"], fonts: ["display", "body", "mono", "stylesheet"], logo: ["light", "dark", "hero"] };
const LOGO_TYPES = { ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const FALLBACK = {
  display: `"Helvetica Neue", Arial, sans-serif`,
  body: `Georgia, "Times New Roman", serif`,
  mono: `ui-monospace, SFMono-Regular, Menlo, monospace`,
};
// The templates' Plain values that a derived colour starts from.
const BASE = {
  light: { paper: "#ffffff", ink: "#161616", muted: "#616161", accent: "#3358d4", mark: "#df004e", hero: "#3358d4", "hero-ink": "#ffffff" },
  dark: { paper: "#131415", ink: "#ececea", muted: "#9c9c99", accent: "#8aa6f5", mark: "#ff3264", hero: "#1f3170", "hero-ink": "#f1f3fb" },
};
// What each page takes from a brand: its roles (the motion cut has no landmark or card, the post no hero),
// and the rules that place the logo, given the CSS that draws it at a height and the hero's logo variable.
const SURFACES = {
  post: {
    roles: ROLES.filter((r) => !r.startsWith("hero")),
    // Above the title in the masthead.
    logo: (mark) => [`.mast::before { ${mark("1.75rem")} display: block; }`],
  },
  motion: {
    roles: ROLES.filter((r) => !["card", "landmark"].includes(r)),
    // In the top corner of every scene, before the product's name, and over the page's title.
    logo: (mark, hero) => [
      `.meta { align-items: center; }`,
      `.meta > span:first-child { display: inline-flex; align-items: center; gap: 22px; }`,
      `.meta > span:first-child::before { ${mark("44px")} }`,
      `.hero .meta > span:first-child::before { background-image: ${hero}; }`,
      `.top::before { ${mark("1.5rem")} display: block; margin-bottom: 0.25rem; }`,
    ],
  },
};

// ---------- colour ----------
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const hex6 = (s) => { const h = s.toLowerCase(); return h.length === 4 ? "#" + [...h.slice(1)].map((c) => c + c).join("") : h; };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(hex6(h).slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
// a at weight w over b, in sRGB.
const mix = (a, b, w) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v * w + y[i] * (1 - w))); };
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Lighten (dark ground) or darken (light ground) a colour until it reads at 4.5:1 on the ground.
const readable = (c, ground) => {
  const toward = lum(ground) < 0.2 ? "#ffffff" : "#000000";
  for (let w = 0; w <= 1; w += 0.05) { const x = mix(toward, c, w); if (contrast(x, ground) >= 4.5) return x; }
  return toward;
};

// Every role's value in each mode: what the brand gives, then what follows from it. Roles the brand
// neither gives nor implies are left out, so the page keeps the template's value.
export function resolveColors(colors = {}) {
  const out = {};
  for (const mode of ["light", "dark"]) {
    const given = Object.fromEntries(Object.entries(colors[mode] || {}).map(([k, v]) => [k, hex6(v)]));
    const light = out.light;
    const c = { ...given };
    // A dark accent or mark not given follows the light one, made to read on the dark paper.
    const paper = c.paper ?? BASE[mode].paper, ink = c.ink ?? BASE[mode].ink;
    if (mode === "dark") for (const k of ["accent", "mark"]) if (!c[k] && light[k]) c[k] = readable(light[k], paper);
    if (given.paper || given.ink) {
      c.muted ??= mix(ink, paper, 0.66); c.rule ??= mix(ink, paper, 0.11); c.wash ??= mix(ink, paper, 0.05);
      c.card ??= mix(ink, paper, 0.03); c.dim ??= mix(ink, paper, 0.32);
    }
    const accent = c.accent ?? BASE[mode].accent;
    if (c.accent || given.paper) c["accent-wash"] ??= mix(accent, paper, mode === "light" ? 0.12 : 0.2);
    // The title and end cards: the accent in light, a deep accent in dark, unless the brand names a hero.
    if (!c.hero && mode === "light") c.hero = c.accent;
    if (!c.hero && mode === "dark" && light.hero) c.hero = mix(light.hero, paper, 0.5);
    if (!c.hero) delete c.hero;
    if (c.hero) {
      c["hero-ink"] ??= contrast("#ffffff", c.hero) >= contrast(BASE.light.ink, c.hero) ? "#ffffff" : BASE.light.ink;
      c["hero-muted"] ??= mix(c["hero-ink"], c.hero, 0.74);
    }
    out[mode] = c;
  }
  return out;
}

// Text against its ground, below 4.5:1 (3:1 for the hero's quieter text, which is set large).
function contrastWarnings(resolved) {
  const warnings = [];
  for (const mode of ["light", "dark"]) {
    const v = (k) => resolved[mode][k] ?? BASE[mode][k];
    const pairs = [["ink", "paper"], ["muted", "paper"], ["accent", "paper"], ["mark", "paper"]];
    if (resolved[mode].hero) pairs.push(["hero-ink", "hero"], ["hero-muted", "hero", 3]);
    for (const [fg, bg, min = 4.5] of pairs) {
      if (!(fg in resolved[mode] || bg in resolved[mode])) continue;
      const r = contrast(v(fg), v(bg));
      if (r < min) warnings.push(`${mode} ${fg} ${v(fg)} on ${bg} ${v(bg)} is ${r.toFixed(2)}:1; text needs ${min}:1`);
    }
  }
  return warnings;
}

// ---------- the file ----------
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
const REMOTE = /^(https?:|data:)/;
// A logo given as one path is the light one.
const logoVariants = (logo) => (typeof logo === "string" ? { light: logo } : logo);

// Check a brand and resolve it: logo paths against `base`, colours to every role they imply.
// Returns { brand, errors, warnings }; brand is null when there are errors.
export function checkBrand(input, base) {
  const errors = [], warnings = [];
  const unknown = (obj, keys, where) => { for (const k of Object.keys(obj)) if (!keys.includes(k)) errors.push(`${where}"${k}" is unknown (keys: ${keys.join(", ")})`); };
  if (!isObj(input)) return { brand: null, errors: ["a brand is an object: { \"name\", \"colors\", \"fonts\", \"logo\" }"], warnings };
  unknown(input, KEYS.top, "");
  const brand = { name: input.name };
  if (input.name != null && typeof input.name !== "string") errors.push(`"name" is a string`);

  if (input.colors != null) {
    if (!isObj(input.colors)) errors.push(`"colors" is { "light": {…}, "dark": {…} }`);
    else {
      unknown(input.colors, KEYS.colors, "colors.");
      for (const mode of KEYS.colors) {
        const m = input.colors[mode];
        if (m == null) continue;
        if (!isObj(m)) { errors.push(`colors.${mode} is an object of roles`); continue; }
        unknown(m, ROLES, `colors.${mode}.`);
        for (const [k, v] of Object.entries(m)) if (ROLES.includes(k) && !(typeof v === "string" && HEX.test(v))) errors.push(`colors.${mode}.${k}: "${v}" isn't a hex colour like #1a7f4b`);
      }
      if (input.colors.light && !input.colors.dark) warnings.push(`no colors.dark: the dark theme's accent and mark follow the light ones, lightened to read`);
    }
  }

  if (input.fonts != null) {
    if (!isObj(input.fonts)) errors.push(`"fonts" is { "display", "body", "mono", "stylesheet" }`);
    else {
      unknown(input.fonts, KEYS.fonts, "fonts.");
      for (const k of ["display", "body", "mono"]) if (input.fonts[k] != null && !(typeof input.fonts[k] === "string" && input.fonts[k].trim() && !/[;{}<>]/.test(input.fonts[k]))) errors.push(`fonts.${k} is a family name or a font stack`);
      const s = input.fonts.stylesheet;
      if (s != null) {
        if (!(typeof s === "string" && /^https:\/\/[^\s"<>]+$/.test(s))) errors.push(`fonts.stylesheet is an https URL`);
        else if (!s.startsWith("https://fonts.googleapis.com/")) warnings.push(`fonts.stylesheet isn't Google Fonts; an Artifact page loads stylesheets from Google Fonts only`);
      } else if (["display", "body", "mono"].some((k) => input.fonts[k])) warnings.push(`no fonts.stylesheet: the fonts show only where a reader has them installed`);
    }
    brand.fonts = input.fonts;
  }

  if (input.logo != null) {
    const logo = logoVariants(input.logo);
    if (!isObj(logo)) errors.push(`"logo" is a path or { "light", "dark", "hero" }`);
    else {
      unknown(logo, KEYS.logo, "logo.");
      if (logo.light == null) errors.push(`logo needs a "light" path, the logo on the light paper`);
      brand.logo = {};
      for (const k of KEYS.logo) {
        const p = logo[k];
        if (p == null) continue;
        if (typeof p !== "string" || REMOTE.test(p)) { errors.push(`logo.${k}: a local file path`); continue; }
        const file = resolve(base, p);
        const type = LOGO_TYPES[extname(file).toLowerCase()];
        if (!type) { errors.push(`logo.${k}: ${p} isn't an SVG, PNG, WebP or JPEG`); continue; }
        if (!existsSync(file)) { errors.push(`logo.${k}: no file at ${p}`); continue; }
        const buf = readFileSync(file);
        const size = type === "image/svg+xml" ? svgSize(buf.toString("utf8")) : imageSize(buf);
        if (!size) { errors.push(`logo.${k}: can't read the size of ${p}${type === "image/svg+xml" ? " (give the svg a viewBox)" : ""}`); continue; }
        brand.logo[k] = { uri: dataUri(buf, type), ratio: size[0] / size[1] };
      }
      if (Object.values(brand.logo).some((l) => l.ratio > 8)) warnings.push(`the logo is more than 8 times as wide as it is tall; it shows small at a fixed height`);
    }
  }
  if (errors.length) return { brand: null, errors, warnings };
  brand.colors = resolveColors(input.colors);
  warnings.push(...contrastWarnings(brand.colors));
  return { brand, errors, warnings };
}

// The repo's brand file for a work dir: ~/.buildnotes/<repo>/brand.json, the dir's parent. Null when there is none.
function findBrand(dir) {
  const file = join(dirname(resolve(dir)), BRAND_FILE);
  return existsSync(file) ? file : null;
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// Overrides over a brand: colours per role, fonts per key, the logo whole. Logo paths in either are made absolute.
function absLogo(logo, base) {
  logo = logoVariants(logo);
  return isObj(logo) ? Object.fromEntries(Object.entries(logo).map(([k, v]) => [k, typeof v === "string" && !REMOTE.test(v) ? resolve(base, v) : v])) : logo;
}
function mergeBrand(a = {}, b = {}) {
  const out = { ...a, ...b };
  if (isObj(a.colors) || isObj(b.colors)) {
    out.colors = { ...a.colors, ...b.colors };
    for (const m of KEYS.colors) if (isObj(a.colors?.[m]) && isObj(b.colors?.[m])) out.colors[m] = { ...a.colors[m], ...b.colors[m] };
  }
  if (isObj(a.fonts) && isObj(b.fonts)) out.fonts = { ...a.fonts, ...b.fonts };
  return out;
}

// The brand for a page in `dir`: the repo's file (or `file`, or none when it is false), then a script's "brand"
// over it. `spec` is the script's "brand": an object of overrides, a path to another brand file, or false for
// none. Relative paths in it resolve against `dir`. Returns { brand, file, errors, warnings }, brand null when there is none.
export function loadBrand({ dir, file, spec } = {}) {
  const none = { brand: null, file: null, errors: [], warnings: [] };
  if (spec === false || file === false) return none;
  if (spec != null && typeof spec !== "string" && !isObj(spec)) return { ...none, errors: [`"brand" is an object of overrides, a path to a brand file, or false`] };
  if (typeof spec === "string") file = resolve(dir, spec);
  file ??= dir ? findBrand(dir) : null;
  let input = {};
  if (file) {
    if (!existsSync(file)) return { ...none, errors: [`brand: no file at ${file}`] };
    try { input = readJson(file); } catch (e) { return { ...none, errors: [`brand: can't read ${file}: ${e.message}`] }; }
    if (isObj(input)) input = { ...input, logo: absLogo(input.logo, dirname(file)) };
  }
  if (isObj(spec)) input = mergeBrand(input, { ...spec, ...(spec.logo != null ? { logo: absLogo(spec.logo, dir) } : {}) });
  if (!file && !isObj(spec)) return none;
  const r = checkBrand(input, dir);
  return { ...r, file, errors: r.errors.map((e) => `brand: ${e}`), warnings: r.warnings.map((w) => `brand: ${w}`) };
}

// ---------- the page ----------
const stack = (v, role) => (v.includes(",") ? v : `"${v.replace(/"/g, "")}", ${FALLBACK[role]}`);
const decls = (o) => Object.entries(o).map(([k, v]) => `--${k}: ${v};`).join(" ");
// The template's two dark blocks: the system setting, and the page's own toggle.
const darkBlocks = (d) => [`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${d} } }`, `:root[data-theme="dark"] { ${d} }`];

// The brand's CSS for a page: the tokens in the same light and dark blocks the template uses, the fonts, and
// the logo, drawn by CSS so the template's markup stays as it is. `target` is "post" or "motion".
function brandCss(brand, target) {
  const { roles, logo: placeLogo } = SURFACES[target];
  const pick = (mode) => Object.fromEntries(Object.entries(brand.colors?.[mode] || {}).filter(([k]) => roles.includes(k)));
  const light = pick("light"), dark = pick("dark");
  for (const k of ["display", "body", "mono"]) if (brand.fonts?.[k]) light[`font-${k}`] = stack(brand.fonts[k], k);
  const logo = brand.logo;
  const rules = [];
  if (logo?.light) {
    // Each variant is embedded once; the themes and the hero point at it.
    for (const [k, l] of Object.entries(logo)) light[`brand-logo-${k}`] = `url("${l.uri}")`;
    light["brand-logo"] = "var(--brand-logo-light)";
    if (logo.dark) dark["brand-logo"] = "var(--brand-logo-dark)";
    const ratio = Math.max(...Object.values(logo).map((l) => l.ratio)).toFixed(3);
    const mark = (h) => `content: ""; flex: none; width: calc(${h} * ${ratio}); height: ${h}; background: var(--brand-logo) left center / contain no-repeat;`;
    rules.push(...placeLogo(mark, `var(--brand-logo-${logo.hero ? "hero" : logo.dark ? "dark" : "light"})`));
  }
  const blocks = [`:root { ${decls(light)} }`];
  if (Object.keys(dark).length) blocks.push(...darkBlocks(decls(dark)));
  return [...blocks, ...rules].join("\n");
}

const BLOCKS = /\n?<link id="brand-fonts"[^>]*>|\n?<style id="brand">[\s\S]*?<\/style>/g;

// The page with the brand written in after its first <style> block (or, with brand null, taken out).
export function applyBrand(html, brand, target) {
  const clean = html.replace(BLOCKS, "");
  if (!brand) return clean;
  const end = clean.indexOf("</style>");
  if (end < 0) throw new Error("the page has no <style> block to follow");
  const at = end + "</style>".length;
  const link = brand.fonts?.stylesheet ? `\n<link id="brand-fonts" rel="stylesheet" href="${brand.fonts.stylesheet.replace(/"/g, "%22")}">` : "";
  const block = `${link}\n<style id="brand">\n/* ${(brand.name || "Brand").replace(/\*\//g, "")}: written by scripts/brand.mjs from brand.json; edit that file, not this block. */\n${brandCss(brand, target)}\n</style>`;
  return clean.slice(0, at) + block + clean.slice(at);
}

// The --brand <file> and --no-brand flags: a file, false for none, or undefined for the repo's brand.json.
export function brandFlag(argv) {
  if (argv.includes("--no-brand")) return false;
  const i = argv.indexOf("--brand");
  return i >= 0 && argv[i + 1] ? resolve(argv[i + 1]) : undefined;
}

// The end of a "wrote …" line: which brand a page carries, if any.
export const brandNote = (brand) => (brand ? `, ${brand.name || "the"} brand` : "");

// A post's style is field notes when its article says so.
const fieldNotes = (html) => /<article\b[^>]*\bdata-style="field-notes"/.test(html);

// Write the repo's brand into a post. Returns { html, applied, errors, warnings }.
export function brandPost(html, postFile, { file, none = false } = {}) {
  if (none) return { html: applyBrand(html, null), applied: false, errors: [], warnings: [] };
  const r = loadBrand({ dir: dirname(resolve(postFile)), file });
  if (r.errors.length || !r.brand) return { html, applied: false, ...r };
  if (fieldNotes(html)) r.warnings.push("brand: the post is in field notes, which keeps its own colours and type; only the logo shows. Use Plain for a branded post");
  return { html: applyBrand(html, r.brand, "post"), applied: true, ...r };
}

function main(argv) {
  const file = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--brand");
  if (argv.includes("--help") || (!file && !argv.includes("--check"))) {
    console.error("usage: brand.mjs <post.html> [--brand brand.json | --none]   |   brand.mjs --check [brand.json]");
    return argv.includes("--help") ? 0 : 2;
  }
  if (argv.includes("--check")) {
    const target = file ?? (existsSync(BRAND_FILE) ? BRAND_FILE : null);
    if (!target) { console.error("no brand.json here; pass its path"); return 2; }
    const r = loadBrand({ file: resolve(target), dir: dirname(resolve(target)) });
    for (const w of r.warnings) console.error(`warning: ${w}`);
    for (const e of r.errors) console.error(`error: ${e}`);
    if (r.errors.length) return 1;
    const c = r.brand.colors;
    console.log(`ok: ${target} (${Object.keys(c.light).length} light and ${Object.keys(c.dark).length} dark colours${r.brand.fonts ? ", fonts" : ""}${r.brand.logo ? ", a logo" : ""})`);
    return 0;
  }
  const html = readFileSync(file, "utf8");
  const r = brandPost(html, file, { file: brandFlag(argv), none: argv.includes("--none") });
  for (const w of r.warnings) console.error(`warning: ${w}`);
  for (const e of r.errors) console.error(`error: ${e}`);
  if (r.errors.length) return 1;
  if (r.html !== html) writeFileSync(file, r.html);
  console.log(argv.includes("--none") ? `took the brand out of ${file}` : r.applied ? `branded ${file} from ${r.file}` : `no brand.json for ${file} (looked in ${dirname(dirname(resolve(file)))}); nothing to do`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
