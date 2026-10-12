// code.mjs — a code excerpt read from git, so it is the shipped code by construction.
//
// Spec:
//   { "file": "src/limits/bucket.ts",   (path in the repo; it is also the caption)
//     "lines": "12-40",                  (1-based, inclusive; default the whole file)
//     "cut": "18-31",                    (optional; ranges inside "lines" shown as one "…" line each)
//     "rev": "a1b2c3d",                  (optional; default HEAD)
//     "repo": "../../code/app",          (optional; relative to the spec file; default the current directory)
//     "lang": "ts" }                     (optional; default from the file extension)
// The fragment is a whole <figure class="code"> with the file path as its caption: don't wrap it.
// Common indentation is removed. More than 15 shown lines gets a warning.

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { esc, ranges, warn } from "./util.mjs";

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

export function read(spec, base = process.cwd()) {
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
  const want = spec.lines ? ranges(spec.lines) : all.map((_, k) => k + 1);
  if (want.at(-1) > all.length) throw new Error(`code: ${spec.file} has ${all.length} lines; asked for ${spec.lines}`);
  const cut = new Set(spec.cut ? ranges(spec.cut) : []);
  const shown = want.filter((n) => !cut.has(n));
  const indent = Math.min(...shown.map((n) => all[n - 1]).filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  const chunks = [];
  for (const n of want) {
    const kind = cut.has(n) ? "cut" : "show";
    if (chunks.at(-1)?.kind !== kind) chunks.push({ kind, lines: [] });
    chunks.at(-1).lines.push(all[n - 1].slice(Number.isFinite(indent) ? indent : 0));
  }
  const lang = spec.lang ?? spec.file.split(".").pop();
  const html = chunks.map((c) => {
    if (c.kind === "show") return highlight(c.lines.join("\n"), lang);
    const pad = c.lines.find((l) => l.trim())?.match(/^\s*/)[0] ?? "";
    return `${pad}<span class="cut">…</span>`;
  }).join("\n");
  return { html, shown: shown.length };
}

export function render(spec, { id = "code", base } = {}) {
  // spec.source exists for tests only; posts read from git so the excerpt is the shipped code.
  const { html, shown } = excerpt(spec, spec.source ?? read(spec, base));
  if (shown > 15) warn(`code "${id}": ${shown} lines shown; keep it to about 15 (cut the middle with "cut")`);
  return `<figure class="code">
  <figcaption><span>${esc(spec.file)}</span></figcaption>
<pre><code>${html}</code></pre>
</figure>`;
}
