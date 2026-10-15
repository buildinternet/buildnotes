// code.mjs — a code excerpt read from git, so it is the shipped code by construction.
//
// Spec:
//   { "file": "src/limits/bucket.ts",   (path in the repo; it is also the caption)
//     "lines": "12-40",                  (1-based, inclusive; default the whole file)
//     or "start": "function dynamicOgImageRoutes(",  (text on the first line to show, found at rev; with no
//        "end", the excerpt runs until its brackets close. Line numbers move between commits; text doesn't.)
//     "end": "return found;",            (optional with start: text on the last line to show)
//     "cut": "18-31",                    (optional; ranges inside "lines" shown as one "…" line each; with
//                                         start, count from the excerpt's first line, which is 1)
//     "rev": "a1b2c3d",                  (optional; default HEAD)
//     "repo": "../../code/app",          (optional; relative to the spec file; default the current directory)
//     "lang": "ts",                      (optional; default from the file extension)
//     "wrap": true }                     (optional; wrap long lines instead of scrolling, for prose-like
//                                         strings such as a prompt; render.mjs fails a clipped line at desktop)
// The fragment is a whole <figure class="code"> with the file path as its caption: don't wrap it.
// Common indentation is removed. More than 15 shown lines gets a warning, and so do brackets that
// close something the excerpt never opened (usually line numbers read at another commit).

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { esc, ranges, warn, copyButton } from "./util.mjs";

const C_LIKE = { line: "//", block: true };
const LANGS = {
  js: { ...C_LIKE, kw: "async await break case catch class const continue default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield null undefined true false" },
  ts: { ...C_LIKE, kw: "async await break case catch class const continue default delete do else enum export extends finally for from function if implements import in instanceof interface let new of private protected public readonly return static super switch this throw try type typeof var void while yield null undefined true false as keyof" },
  py: { line: "#", kw: "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield None True False self" },
  go: { ...C_LIKE, kw: "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false" },
  rs: { ...C_LIKE, kw: "as async await break const continue crate else enum extern fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait type unsafe use where while true false Some None Ok Err" },
  sh: { line: "#", kw: "if then else elif fi for in do done while until case esac function return local export set" },
  sql: { line: "--", block: true, kw: "select from where join left right inner outer on group by order having limit offset insert into values update set delete create table index alter add drop primary key references not null default unique and or as with returning", ci: true },
  rb: { line: "#", kw: "begin class def do else elsif end ensure if module next nil return self super then unless until when while yield true false" },
  java: { ...C_LIKE, kw: "abstract boolean break case catch class const continue default do else enum extends final finally for if implements import instanceof interface new package private protected public return static super switch this throw throws try void while null true false" },
  swift: { ...C_LIKE, kw: "as break case catch class continue default defer do else enum extension fileprivate for func guard if import in init let nil private protocol public return self static struct switch throw throws try var where while true false" },
};
const EXT = { mjs: "js", cjs: "js", jsx: "js", tsx: "ts", mts: "ts", bash: "sh", zsh: "sh", kt: "java", c: "java", h: "java", cpp: "java", cs: "java" };

// One pass over the text: comments, strings and keywords get a span; the rest is escaped.
export function highlight(text, lang) {
  const L = LANGS[EXT[lang] ?? lang];
  if (!L) return esc(text);
  const alts = [];
  if (L.block) alts.push(String.raw`\/\*[\s\S]*?\*\/`);
  if (L.line) alts.push(`${L.line.replace(/[/#-]/g, "\\$&")}[^\\n]*`);
  const comment = alts.join("|");
  const string = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|` + "`(?:\\\\.|[^`\\\\])*`";
  const kw = `\\b(?:${L.kw.split(" ").join("|")})\\b`;
  const re = new RegExp(`(${comment})|(${string})|(${kw})`, L.ci ? "gi" : "g");
  let out = "", last = 0, m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    const cls = m[1] ? "c" : m[2] ? "s" : "k";
    // A shell "#" inside a word (a URL fragment, $#) isn't a comment.
    if (m[1] && L.line === "#" && m.index > 0 && !/\s/.test(text[m.index - 1])) { out += esc(m[0][0]); re.lastIndex = m.index + 1; last = re.lastIndex; continue; }
    out += `<span class="${cls}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(text.slice(last));
}

function read(spec, base = process.cwd()) {
  if (!spec.file) throw new Error("code: the spec needs a file");
  const repo = resolve(base, spec.repo ?? ".");
  const rev = spec.rev ?? "HEAD";
  try {
    return execFileSync("git", ["-C", repo, "show", `${rev}:${spec.file.replace(/^\.\//, "")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    throw new Error(`code: can't read ${spec.file} at ${rev} in ${repo} (${String(err.stderr ?? err.message).trim().split("\n")[0]})`);
  }
}

// The excerpt as HTML lines: shown lines highlighted, each cut run collapsed to one "…" line.
export function excerpt(spec, source) {
  const all = source.replace(/\n$/, "").split("\n");
  const lang = spec.lang ?? spec.file.split(".").pop();
  let want, first = 1;
  if (spec.start) {
    const a = all.findIndex((l) => l.includes(spec.start));
    if (a < 0) throw new Error(`code: no line in ${spec.file} contains "${spec.start}"`);
    let b = spec.end ? all.findIndex((l, k) => k >= a && l.includes(spec.end)) : blockEnd(all, a, lang);
    if (b < 0) throw new Error(`code: no line in ${spec.file} after "${spec.start}" contains ${spec.end ? `"${spec.end}"` : "the closing bracket"}`);
    want = Array.from({ length: b - a + 1 }, (_, k) => a + 1 + k);
    first = a + 1;
  } else want = spec.lines ? ranges(spec.lines) : all.map((_, k) => k + 1);
  if (want.at(-1) > all.length) throw new Error(`code: ${spec.file} has ${all.length} lines; asked for ${spec.lines}`);
  const cut = new Set(spec.cut ? ranges(spec.cut).map((n) => n + first - 1) : []);
  const shown = want.filter((n) => !cut.has(n));
  const indent = Math.min(...shown.map((n) => all[n - 1]).filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  const chunks = [];
  for (const n of want) {
    const kind = cut.has(n) ? "cut" : "show";
    if (chunks.at(-1)?.kind !== kind) chunks.push({ kind, lines: [] });
    chunks.at(-1).lines.push(all[n - 1].slice(Number.isFinite(indent) ? indent : 0));
  }
  const html = chunks.map((c) => {
    if (c.kind === "show") return highlight(c.lines.join("\n"), lang);
    const pad = c.lines.find((l) => l.trim())?.match(/^\s*/)[0] ?? "";
    return `${pad}<span class="cut">…</span>`;
  }).join("\n");
  const depth = brackets(want.map((n) => all[n - 1]).join("\n"), lang);
  return { html, shown: shown.length, stray: depth.min < 0 };
}

// Code with its comments and strings blanked, so brackets inside them don't count.
function bare(text, lang) {
  const L = LANGS[EXT[lang] ?? lang];
  if (!L) return text;
  const alts = [String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|` + "`(?:\\\\.|[^`\\\\])*`"];
  if (L.block) alts.push(String.raw`\/\*[\s\S]*?\*\/`);
  if (L.line) alts.push(`${L.line.replace(/[/#-]/g, "\\$&")}[^\\n]*`);
  return text.replace(new RegExp(alts.join("|"), "g"), (m) => m.replace(/[^\n]/g, " "));
}
// Running bracket depth: min < 0 means a bracket closes something opened before the excerpt.
function brackets(text, lang) {
  let d = 0, min = 0;
  for (const ch of bare(text, lang)) { if ("({[".includes(ch)) d++; else if (")}]".includes(ch)) min = Math.min(min, --d); }
  return { end: d, min };
}
// The line where the block opened on line a closes (brackets back to zero), or -1.
function blockEnd(all, a, lang) {
  let d = 0, opened = false;
  for (let k = a; k < all.length; k++) {
    for (const ch of bare(all[k], lang)) { if ("({[".includes(ch)) { d++; opened = true; } else if (")}]".includes(ch)) d--; }
    if (opened && d <= 0) return k;
  }
  return -1;
}

export function render(spec, { id = "code", base } = {}) {
  // spec.source exists for tests only; posts read from git so the excerpt is the shipped code.
  const { html, shown, stray } = excerpt(spec, spec.source ?? read(spec, base));
  if (shown > 15) warn(`code "${id}": ${shown} lines shown; keep it to about 15 (cut the middle with "cut")`);
  if (stray) warn(`code "${id}": a bracket closes something the excerpt never opened; check the lines at this rev, or anchor with "start"`);
  return `<figure class="code${spec.wrap ? " wrap" : ""}">
  <figcaption><span>${esc(spec.file)}</span>${copyButton("Copy code")}</figcaption>
<pre><code>${html}</code></pre>
</figure>`;
}
