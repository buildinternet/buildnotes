#!/usr/bin/env node
// viz.mjs — render a post's visual components from small data specs into static HTML/SVG.
//
// Usage:
//   node viz.mjs <kind> <spec.json> [--id name]   print one fragment (paste it into the post)
//   node viz.mjs build <post.html> [--check]      render every viz marker in the post, in place
//   node viz.mjs kinds                            list the kinds
//
// Kinds: flow, steps, bars, delta, line, options, matrix (Markdown tables), code, term, strip, shader.
// A marker names the kind and the spec, relative to the post:
//   <!-- viz flow viz/pipeline.json -->
//   <!-- /viz -->
// build writes the fragment between the two comments and stamps the spec's hash in the opening one
// (<!-- viz flow viz/pipeline.json #3fa2c1 -->). Running it again is safe. --check renders nothing
// and exits 1 if a marker is empty or its spec changed since the last render.
// The fragment is the component only: wrap it in your own <figure> and write the <figcaption>.
// code and term are the exception: they render whole figures with their captions.
// Warnings (sizes, long labels) go to stderr. Specs and kinds: references/visuals.md#components.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { hash, takeWarnings } from "./viz/util.mjs";
import * as flow from "./viz/flow.mjs";
import * as bars from "./viz/bars.mjs";
import * as delta from "./viz/delta.mjs";
import * as line from "./viz/line.mjs";
import * as options from "./viz/options.mjs";
import * as matrix from "./viz/matrix.mjs";
import * as code from "./viz/code.mjs";
import * as term from "./viz/term.mjs";
import * as strip from "./viz/strip.mjs";
import * as steps from "./viz/steps.mjs";
import * as shader from "./viz/shader.mjs";

export const KINDS = { flow, bars, delta, line, options, matrix, code, term, strip, steps, shader };
export const MARKER = /<!-- viz (\w+) (\S+?)(?: #([0-9a-f]{6}))? -->([\s\S]*?)<!-- \/viz -->/g;

const parseSpec = (mod, text) => (mod.parse ? mod.parse(text) : JSON.parse(text));
const nameOf = (path) => path.replace(/^.*\//, "").replace(/\.\w+$/, "");

export function renderKind(kind, specText, opts = {}) {
  const mod = KINDS[kind];
  if (!mod) throw new Error(`unknown kind "${kind}" (kinds: ${Object.keys(KINDS).join(", ")})`);
  return mod.render(parseSpec(mod, specText), opts);
}

export function build(html, base, { check = false } = {}) {
  const problems = [];
  let n = 0;
  const out = html.replace(MARKER, (all, kind, path, stamp, body) => {
    n++;
    let text;
    try { text = readFileSync(resolve(base, path), "utf8"); } catch { problems.push(`${kind} ${path}: spec not found`); return all; }
    const specBase = dirname(resolve(base, path));
    let h = hash(text);
    try {
      const mod = KINDS[kind];
      const deps = mod?.deps?.(parseSpec(mod, text), specBase) ?? [];
      if (deps.length) h = hash(text + deps.map((d) => readFileSync(d, "utf8")).join("\n"));
    } catch {}
    if (check) {
      if (!body.trim()) problems.push(`${kind} ${path}: not rendered yet`);
      else if (stamp !== h) problems.push(`${kind} ${path}: spec changed since the last render`);
      return all;
    }
    try {
      const frag = renderKind(kind, text, { id: nameOf(path), base: specBase });
      for (const w of takeWarnings()) problems.push(`${kind} ${path}: ${w}`);
      return `<!-- viz ${kind} ${path} #${h} -->\n${frag}\n<!-- /viz -->`;
    } catch (err) {
      problems.push(`${kind} ${path}: ${err.message}`);
      return all;
    }
  });
  return { html: out, count: n, problems };
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("/viz.mjs");
if (isMain) {
  const argv = process.argv.slice(2);
  const [cmd, file] = argv;
  const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.error("usage: viz.mjs <kind> <spec.json> [--id name] | viz.mjs build <post.html> [--check] | viz.mjs kinds");
    process.exit(cmd ? 0 : 2);
  }
  if (cmd === "kinds") { console.log(Object.keys(KINDS).join("\n")); process.exit(0); }
  if (!file) { console.error(`viz.mjs ${cmd}: missing file`); process.exit(2); }
  try {
    if (cmd === "build") {
      const check = argv.includes("--check");
      const { html, count, problems } = build(readFileSync(file, "utf8"), dirname(resolve(file)), { check });
      if (!check) writeFileSync(file, html);
      for (const p of problems) console.error(`! ${p}`);
      console.error(`${check ? "checked" : "rendered"} ${count} marker${count === 1 ? "" : "s"} in ${file}`);
      process.exit(check && problems.length ? 1 : 0);
    }
    const id = opt("id") ?? nameOf(file);
    console.log(renderKind(cmd, readFileSync(file, "utf8"), { id, base: dirname(resolve(file)) }));
    for (const w of takeWarnings()) console.error(`! ${w}`);
  } catch (err) {
    console.error(`viz.mjs: ${err.message}`);
    process.exit(1);
  }
}
