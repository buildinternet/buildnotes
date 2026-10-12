#!/usr/bin/env node
// save-run.mjs: keep a local history of build-story runs, outside git.
//
// Usage:
//   node dev/save-run.mjs <work-dir> [--name 2026-10-12-weekly-digests] [--artifact <url>] [--note "what this run tested"]
//   node dev/save-run.mjs --index            # rebuild runs/INDEX.md and runs/index.html only
//
// Copies the self-contained page (post.published.html → post.html) and the text a run leaves
// behind (plan, notes, author message, lint, dossier.md) into runs/<name>/, with a meta.json
// recording when, which skill commit, and the artifact link. Skips images, renders, scratch and
// fixtures: the published page already embeds what it shows. runs/ is git-ignored, because runs
// can hold private-repo content; promote a public one to examples/ by hand when it's worth keeping.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runs = join(root, "runs");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };

if (!argv.includes("--index")) {
  const src = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
  if (!src || !existsSync(src)) { console.error("usage: save-run.mjs <work-dir> [--name n] [--artifact url] [--note text]"); process.exit(2); }
  const name = opt("name") ?? basename(resolve(src));
  const out = join(runs, name);
  const KEEP = /^(post\.published\.html|plan\.md|notes\.md|author-message\.md|questions\.md|skill-feedback\.md|ste-brief\.md|lint[\w-]*\.txt|dossier\.md|outside-sources\.md|note\.md)$/;
  const SKIP = /^(assets|render|scratch|fixture|node_modules|runs)$/;
  const copied = [];
  const walk = (dir, depth) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) { if (!SKIP.test(f) && depth < 3) walk(p, depth + 1); continue; }
      if (!KEEP.test(f)) continue;
      const rel = relative(src, p).replace(/post\.published\.html$/, "post.html");
      mkdirSync(dirname(join(out, rel)), { recursive: true });
      cpSync(p, join(out, rel));
      copied.push(rel);
    }
  };
  walk(resolve(src), 0);
  let skillCommit = null;
  try { skillCommit = execFileSync("git", ["-C", root, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { /* not a repo */ }
  const prev = existsSync(join(out, "meta.json")) ? JSON.parse(readFileSync(join(out, "meta.json"), "utf8")) : {};
  const meta = { ...prev, name, saved: new Date().toISOString(), skillCommit, source: resolve(src), files: copied.sort() };
  if (opt("artifact")) meta.artifact = opt("artifact");
  if (opt("note")) meta.note = opt("note");
  writeFileSync(join(out, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.error(`saved ${copied.length} files → runs/${name}`);
}

// Index: a table for reading in an editor, and a page for clicking through in a browser.
mkdirSync(runs, { recursive: true });
const metas = readdirSync(runs).filter((d) => existsSync(join(runs, d, "meta.json"))).map((d) => JSON.parse(readFileSync(join(runs, d, "meta.json"), "utf8"))).sort((a, b) => a.name.localeCompare(b.name));
const pages = (m) => m.files.filter((f) => f.endsWith("post.html"));
const md = ["# Runs", "", "Local history of build-story runs (git-ignored). Rebuild with `node dev/save-run.mjs --index`.", "", "| Run | What it tested | Pages | Skill | Artifact |", "|---|---|---|---|---|",
  ...metas.map((m) => `| ${m.name} | ${m.note ?? ""} | ${pages(m).map((p) => `[${p}](${m.name}/${p})`).join(" · ") || "frame only"} | ${m.skillCommit ?? ""} | ${m.artifact ? `[link](${m.artifact})` : ""} |`)];
writeFileSync(join(runs, "INDEX.md"), md.join("\n") + "\n");
const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html><meta charset="utf-8"><title>Build story runs</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:60rem;margin:2rem auto;padding:0 1rem;color:#222;background:#fafaf8}
@media (prefers-color-scheme:dark){body{color:#ddd;background:#141414}a{color:#8fb2f7}}
table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #8884;vertical-align:top}small{opacity:.7}</style>
<h1>Build story runs</h1><table><tr><th>Run</th><th>What it tested</th><th>Files</th></tr>
${metas.map((m) => `<tr><td>${esc(m.name)}<br><small>skill ${esc(m.skillCommit ?? "?")}${m.artifact ? ` · <a href="${esc(m.artifact)}">artifact</a>` : ""}</small></td><td>${esc(m.note)}</td><td>${m.files.map((f) => `<a href="${esc(m.name)}/${esc(f)}">${esc(f)}</a>`).join("<br>")}</td></tr>`).join("\n")}
</table>`;
writeFileSync(join(runs, "index.html"), html);
console.error(`index: ${metas.length} runs → runs/INDEX.md, runs/index.html`);
