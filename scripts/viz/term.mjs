// term.mjs — a terminal block: one command you ran for the post, and the output lines that make the point.
//
// Spec:
//   { "cmd": "node scripts/gather.mjs --issue 412 --out evidence",
//     "out": ["dossier: 6 issues · 9 PRs → evidence/dossier.md"],   (an array of lines, or one string)
//     "keep": "1-3,8",     (optional; 1-based output lines to show; each gap becomes a "…" line)
//     "dim": true,         (optional; set the output in the quieter colour)
//     "wrap": true }       (optional; default: on when an output line is long prose, off for tables and JSON)
// One command only, by design. The fragment is a whole <figure class="code term"> with the bare
// "Terminal" caption: don't wrap it.

import { esc, ranges, warn, copyButton } from "./util.mjs";

function lines(spec, id = "term") {
  let out = Array.isArray(spec.out) ? spec.out : String(spec.out ?? "").replace(/\n$/, "").split("\n");
  if (spec.out === undefined || spec.out === "") out = [];
  if (spec.keep) {
    const keep = ranges(spec.keep);
    const picked = [];
    let prev = 0;
    for (const n of keep) {
      if (n > out.length) throw new Error(`term: keep asks for line ${n}; the output has ${out.length}`);
      if (n !== prev + 1 && picked.length) picked.push(null);
      picked.push(out[n - 1]);
      prev = n;
    }
    if (prev < out.length) picked.push(null);
    out = picked;
  }
  const shown = out.filter((l) => l !== null);
  if (shown.length > 12) warn(`term "${id}": ${shown.length} output lines; show the few that make the point (use "keep")`);
  return out;
}

export function body(spec, id = "term") {
  const out = lines(spec, id);
  const rows = [];
  if (spec.cmd) {
    if (/\n/.test(spec.cmd) || /(;|&&)\s*\S/.test(spec.cmd)) warn(`term "${id}": more than one command; one block per command`);
    if (spec.cmd.length > 72) warn(`term "${id}": long command (${spec.cmd.length} chars); drop flags the reader doesn't need`);
    if (/\|\s*(head|tail|grep|jq|sed)\b/.test(spec.cmd)) warn(`term "${id}": the command pipes through a filter; show the plain command and trim the output with "keep"`);
    rows.push(`<span class="prompt">$ </span>${esc(spec.cmd)}`);
  }
  for (const l of out) rows.push(l === null ? `<span class="dim">…</span>` : spec.dim ? `<span class="dim">${esc(l)}</span>` : esc(l));
  const prose = out.some((l) => l && l.length > 72 && /[a-z]{3,} [a-z]{3,} [a-z]{3,}/i.test(l) && !/^\s|[|{}[\]]/.test(l));
  return { html: rows.join("\n"), wrap: spec.wrap ?? prose };
}

export function render(spec, { id = "term" } = {}) {
  if (!spec.cmd) throw new Error("term: the spec needs the command (cmd)");
  const { html, wrap } = body(spec, id);
  return `<figure class="code term${wrap ? " wrap" : ""}">
  <figcaption><span>Terminal</span>${copyButton("Copy command")}</figcaption>
<pre><code>${html}</code></pre>
</figure>`;
}
