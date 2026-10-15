#!/usr/bin/env node
// module.mjs — render an opt-in module from the dossier as an HTML fragment for post.html.
//
// Usage: node module.mjs <build-log|numbers|timeline> <evidence/dossier.json> [--links auto|none] [--limit 20]
//
// Modules are off by default; include one only when the author asks for it (see references/modules.md).
// Each fragment is an <aside class="module" data-module="…">, placed after the last chapter and before
// the footer. lint.mjs leaves modules out of the prose count and the process-detail budget.
// Links to PRs appear only when the repo is public and --links isn't "none".

import { readFileSync } from "node:fs";

const [name, file] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
const opt = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
if (!name || !file) {
  console.error("usage: module.mjs <build-log|numbers|timeline> <dossier.json> [--links auto|none] [--limit 20]");
  process.exit(2);
}
const d = JSON.parse(readFileSync(file, "utf8"));
const links = opt("links", "auto") !== "none" && d.visibility === "public";
const limit = Number(opt("limit", 20));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => { const t = new Date(iso); return `${t.getUTCDate()} ${MON[t.getUTCMonth()]}`; };
// "feat(actions): publish x" → "Publish x"
const title = (t) => { const s = String(t ?? "").replace(/^\w+(\([^)]*\))?!?:\s*/, ""); return s.charAt(0).toUpperCase() + s.slice(1); };
const n = (x) => Number(x ?? 0).toLocaleString("en-US");
const merged = (d.prs ?? []).filter((p) => p.mergedAt).sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));
const prUrl = (p) => p.url ?? `https://github.com/${p.repo ?? d.repo}/pull/${p.number}`;
const area = (p) => {
  const m = new Map();
  for (const f of p.files ?? []) {
    if (/(^|\/)(test|tests|__tests__|fixtures|snapshots)\//.test(f.path) || /\.(lock|snap)$|lock\.json$/.test(f.path)) continue;
    const k = f.path.split("/").slice(0, 2).join("/");
    m.set(k, (m.get(k) ?? 0) + f.additions + f.deletions);
  }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
};

const out = {
  "build-log": () => {
    const rows = merged.slice(0, limit);
    const more = merged.length - rows.length;
    return `<aside class="module" data-module="build-log" aria-labelledby="m-build-log">
  <h2 id="m-build-log">Build log</h2>
  <p>The changes behind this post, in the order they merged. <!-- one sentence of context, or delete --></p>
  <div class="ledger">
    <table>
      <thead><tr><th>Merged</th><th>Change</th><th>Size</th><th>Where</th></tr></thead>
      <tbody>
${rows.map((p) => `        <tr><td>${day(p.mergedAt)}</td><td>${links ? `<a href="${esc(prUrl(p))}">${esc(title(p.title))}</a>` : esc(title(p.title))}</td><td class="num">+${n(p.additions)} −${n(p.deletions)}</td><td><code>${area(p).map(esc).join("</code> <code>")}</code></td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>${more > 0 ? `\n  <p class="note">${more} smaller changes not shown.</p>` : ""}
</aside>`;
  },

  numbers: () => {
    const s = d.summary ?? {};
    const human = s.reviewThreadsHuman ?? 0;
    const items = [
      ["Span", `${s.days} days`],
      ["Changes merged", n(merged.length)],
      ["Lines", `+${n(s.additions)} −${n(s.deletions)}`],
      ["Files", n(s.filesTouched)],
      human > 0 && ["Review threads", n(human)],
    ].filter(Boolean);
    return `<aside class="module" data-module="numbers" aria-labelledby="m-numbers">
  <h2 id="m-numbers">By the numbers</h2>
  <dl class="stats">
${items.map(([k, v]) => `    <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
  </dl>
  <p class="note">Counted from the repository on ${day(d.generatedAt)}${s.first ? `, ${day(s.first)} to ${day(s.last)}` : ""}. Bot review threads are not counted.</p>
</aside>`;
  },

  timeline: () => {
    const byDay = new Map();
    const add = (iso, key) => { const k = iso.slice(0, 10); const e = byDay.get(k) ?? { merged: [], opened: 0 }; key === "merged" ? e.merged.push(key) : e.opened++; byDay.set(k, e); };
    for (const p of merged) add(p.mergedAt, "merged");
    for (const i of d.issues ?? []) add(i.createdAt, "opened");
    const days = [...byDay].sort(([a], [b]) => a.localeCompare(b));
    return `<aside class="module" data-module="timeline" aria-labelledby="m-timeline">
  <h2 id="m-timeline">Timeline</h2>
  <ol class="timeline">
${days.map(([k, e]) => `    <li${e.merged.length ? ' class="merged"' : ""}><time datetime="${k}">${day(k)}</time><span class="ev">${[e.merged.length && `${e.merged.length} ${e.merged.length === 1 ? "change" : "changes"} merged`, e.opened && `${e.opened} ${e.opened === 1 ? "issue" : "issues"} opened`].filter(Boolean).join(", ")} <!-- add what happened, in a few words --></span></li>`).join("\n")}
  </ol>
</aside>`;
  },
}[name];

if (!out) {
  console.error(`unknown module "${name}". Generated modules: build-log, numbers, timeline. Others are written by hand; see references/modules.md.`);
  process.exit(2);
}
process.stdout.write(out() + "\n");
