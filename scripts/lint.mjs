#!/usr/bin/env node
// lint.mjs — the mechanical half of the Check step for a build-story page.
//
// Usage: node lint.mjs post.html [--flavor note|release|build|deep] [--avoid "a,b"] [--product "Name"] [--private] [--ste] [--offline]
//
// Prints, per chapter: prose word count (code, terminals, SVG, captions, modules and end matter
// excluded), banned phrasing and avoided house terms, mannered constructions, process detail
// (clock times, dates, issue/PR references, review/merge talk, tool names), writerly words, a
// count with no list after it, bold and inline-code counts, the opening of each paragraph, and
// every sentence that carries a number (the fact ledger).
// Then, for the page: process detail against the flavor's budget, plain-English metrics
// (sentence length, passive voice), scan aids, masthead stats to justify, code captions with side
// notes, terminal blocks that run long or stack commands, animated SVG dots that drift or sit
// off-origin, rendered components (viz markers that are empty or stale, flows missing a drawing,
// bars not to scale, table cells without labels, strips with too many frames or commit labels),
// chapters with more than one visual, leftover template text, a safety scan (data: URIs stripped),
// and the total length. Text inside viz markers is left out of the word counts and the fact ledger;
// its numbers come from the specs, which are listed for the fact pass.
// --ste: full Simplified Technical English limits (20-word sentences) instead of STE-lite (25).
// --product "Full Name,Short": warns when the product name (or its shorthand) is in the title or a chapter
// heading or opens a sentence, and counts it in the prose (references/craft.md). Case-sensitive.
// --private: any link to GitHub issues, pull requests or commits is a hard failure.
// Every http(s) link is opened; one that doesn't answer 2xx/3xx is a hard failure (--offline skips this).
// Exit 1 on a hard failure (banned word, avoided term, leftover template text, private link,
// moving dot with non-zero cx/cy, a viz marker still pointing at the template's example specs, a
// link that doesn't open).

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { build as vizBuild } from "./viz.mjs";
import { NAMES_COMMIT, numberIn } from "./viz/util.mjs";

const argv = process.argv.slice(2);
const file = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!file) {
  console.error('usage: lint.mjs <post.html> [--flavor note|release|build|deep] [--avoid "a,b"] [--product "Name"] [--private] [--ste] [--offline]');
  process.exit(2);
}
const opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const avoid = (opt("avoid") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ALIAS = { note: "note", post: "build", deep: "deep", release: "release", build: "build" };
const flavor = ALIAS[opt("flavor") ?? opt("size") ?? "build"] ?? "build";
const isPrivate = argv.includes("--private");
const MAX_SENT = argv.includes("--ste") ? 20 : 25;
const PASSIVE = /\b(is|are|was|were|be|been|being|gets|got)\s+(\w+ly\s+)?(\w+ed|built|done|made|kept|held|sent|set|shown|seen|known|given|taken|written|found|left|run|read|told|put|cut|bound|chosen|drawn|met|paid|stored|thrown)\b/i;
const plain = { sents: 0, words: 0, passive: 0, long: [] };
const scan = [];
const RANGE = { note: [0, 400], release: [0, 1200], build: [0, 2500], deep: [0, Infinity] }[flavor];
// Process-detail budget for the whole post's prose: refs = issue/PR/commit references,
// talk = sentences about reviews, merges, PRs, commits and the tools that made them.
const BUDGET = { note: { refs: 0, talk: 0, dates: 0 }, release: { refs: 0, talk: 1, dates: 1 }, build: { refs: 0, talk: 4, dates: 3 }, deep: { refs: 8, talk: 10, dates: 6 } }[flavor];
const CLOCK = /\b([01]?\d|2[0-3]):[0-5]\d\b(\s?(UTC|GMT|ET|EST|EDT|PT|PST|PDT|CET|am|pm))?/g;
const DATE = /\b(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?|\d{4}-\d{2}-\d{2})\b/g;
const REF = /(^|[\s(])#\d{2,}\b|\b[\w.-]+\/[\w.-]+#\d+\b|\b[0-9a-f]{7,12}\b(?=\s|$)/g;
const TALK = /\b(pull requests?|PRs?|merged|merge|commits?|reviewers?|reviewed|code review|adversarial|CodeRabbit|ticket|issue tracker|the issue)\b/i;
// Tool names are also product names (a changelog index is full of them). They count as process
// talk only when the sentence says the tool did the work.
const TOOL_TALK = /\b(Codex|Copilot|Cursor|Claude( Code)?|Devin|an? (coding )?agent)\b[^.]{0,60}\b(wrote|generated|built|implemented|reviewed|caught|flagged|found|suggested|drafted|fixed)\b/i;
const totals = { clock: 0, dates: 0, refs: 0, talk: 0 };

const raw = readFileSync(file, "utf8");
const html = raw.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "data:…");

const BANNED = [
  "comprehensive", "robust", "seamless", "seamlessly", "powerful", "blazing", "world-class", "game-changing",
  "cutting-edge", "leverage", "leverages", "leveraging", "supercharge", "elevate", "delve", "journey",
  "deep dive", "unlock", "unlocks", "it's worth noting", "worth noting", "let's take a look", "in this post",
  "as mentioned above", "here's the thing", "it turns out", "enter:", "game changer", "best-in-class",
  // Grading the work instead of stating it, filler for what changed, and sign-offs.
  "doubling down", "double down", "leap forward", "transformative", "next-generation", "continues to evolve",
  "substantial improvements", "exciting new", "utilize", "utilizes", "utilizing", "facilitate", "facilitates",
  "various improvements", "stability improvements", "quality improvements", "bug fixes and improvements",
  "stay tuned", "more to come", "can't wait", "excited to", "thrilled to",
];
// Headings that name a section's slot instead of its claim.
const GENERIC_HEAD = /^(overview|background|introduction|intro|conclusion|summary|wrapping up|final thoughts|results|details|the problem|the solution)$/i;
// Code names and versions in a heading: backticks or <code>, call parens, camelCase, snake_case, v1.2.
const IDENT_HEAD = /<code\b|`|\w\(\)|\b[a-z]+[A-Z]\w*\b|\b[a-z]+_[a-z_]+\b|\bv?\d+\.\d+(\.\d+)?\b/;
// The record narrated item by item: "The same PR also…", "A later release fixed…".
const BY_ITEM = /^(the same|a later|an earlier|that|the next|the following|a follow-up|a second) (pr|pull request|release|commit|patch|version)\b/i;
const LEFTOVER = ["Author Name", "OWNER/REPO", "Turning a pile of PRs", "Build Story Template", "Umbrella issue title", "PR title —", "{{", "A cut is anything true", "most of the writing.", "A keyed figure, on a sample card"];
const SAFETY = [
  [/\b(sk-[A-Za-z0-9]{8,}|ghp_[A-Za-z0-9]{10,}|gho_[A-Za-z0-9]{10,}|xox[bp]-[A-Za-z0-9-]{8,}|AKIA[A-Z0-9]{12,})/g, "token-shaped string"],
  [/\b[a-z]{2,6}_[A-Za-z0-9]{16,}\b/g, "long prefixed id (real object id or token?)"],
  [/Bearer\s+[A-Za-z0-9._-]{12,}/g, "bearer credential"],
  [/(\/Users\/|\/home\/)[A-Za-z0-9._-]+/g, "home-directory path"],
  [/[A-Za-z0-9._%+-]+@(?!example\.)[A-Za-z0-9.-]+\.[a-z]{2,}/g, "email address"],
  [/\b(localhost|127\.0\.0\.1|\.internal\b|\.local\b|\.corp\b)/g, "internal host"],
];

const strip = (s) => s
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<(style|script|svg|pre)\b[\s\S]*?<\/\1>/gi, " ");
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&[#a-z0-9]+;/gi, "'").replace(/\s+/g, " ").trim();
const words = (s) => (s.match(/[A-Za-z0-9][A-Za-z0-9'’.,-]*/g) ?? []).length;
// A sentence ends at . ! or ?, plus any closing quotes or brackets after it ("done.” Next").
const sentences = (s) => s.split(/(?<=[.!?][”’"')\]]*)\s+(?=[A-Z0-9#“‘"(])/).map((x) => x.trim()).filter(Boolean);

// Opt-in modules (aside.module) are appendix material: excluded from word counts and the process budget.
const modules = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<aside class="module"[^>]*data-module="([^"]+)"/g)].map((m) => m[1]);
const VIZ_REGION = /<!-- viz \w+ \S+?(?: #[0-9a-f]{6})? -->[\s\S]*?<!-- \/viz -->/g;
const body = strip(html.replace(VIZ_REGION, " ")).replace(/<aside class="module"[\s\S]*?<\/aside>/g, " ");
const parts = [];
const lede = body.split(/<section class="ch"/)[0];
parts.push({ id: "opening", html: lede.replace(/<nav[\s\S]*?<\/nav>/i, "") });
for (const m of body.matchAll(/<section class="ch"[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)) parts.push({ id: m[1], html: m[2] });

let hard = 0;
let total = 0;
const out = [];
const say = (s = "") => out.push(s);

for (const p of parts) {
  const title = text(p.html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/)?.[1] ?? p.id);
  const blocks = [...p.html.matchAll(/<(p|li|blockquote|figcaption|dd)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => ({ tag: m[1], t: text(m[2]) }));
  const prose = blocks.filter((b) => b.tag !== "figcaption" && b.tag !== "dd");
  const n = prose.reduce((a, b) => a + words(b.t), 0);
  total += n;
  say(`── ${p.id} · ${title} · ${n} words`);
  const headHtml = p.html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/)?.[1]?.replace(/<span class="n">[^<]*<\/span>/, "") ?? "";
  if (p.id !== "opening" && GENERIC_HEAD.test(text(headHtml))) say(`  ! heading names the slot, not the claim: "${text(headHtml)}"; say what the chapter shows (craft.md)`);
  if (p.id !== "opening" && flavor !== "deep" && IDENT_HEAD.test(headHtml)) say(`  ! heading carries a code name or version: "${text(headHtml)}"; say what it does (a deep dive may name it)`);
  // Visuals: figures that aren't code or terminal blocks (those are evidence). Viz markers count too.
  const vis = [...p.html.matchAll(/<figure\b([^>]*)>/g)].filter((m) => !/class="[^"]*\bcode\b/.test(m[1])).length;
  if (p.id !== "opening" && vis > 1) say(`  ! ${vis} visuals in one chapter; keep the one that explains the most`);
  const all = blocks.map((b) => b.t).join(" ");
  const lower = ` ${all.toLowerCase()} `;

  const banned = BANNED.filter((w) => new RegExp(`[^a-z]${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z]`).test(lower));
  const avoided = avoid.filter((w) => lower.includes(w.toLowerCase()));
  if (banned.length) { hard++; say(`  ✗ banned: ${banned.join(", ")}`); }
  if (avoided.length) { hard++; say(`  ✗ house terms to avoid: ${avoided.join(", ")} (paraphrase; never edit inside a quotation)`); }

  const dashes = (all.match(/—/g) ?? []).length;
  if (dashes > 1) say(`  ! ${dashes} em-dashes (aim for ≤1 per chapter)`);
  const allSentences = blocks.flatMap((b) => sentences(b.t));
  for (const s of allSentences) {
    if (/\bnot\s+(just\s+|only\s+)?[^.;]{1,60}?,?\s+but\b/i.test(s)) say(`  ! "not X, but Y": ${s.slice(0, 140)}`);
    if (/^[^:“"]{3,60}:\s+[A-Za-z]/.test(s) && !/^(Fig|Note|Run|Source|In|Out)\b/.test(s)) say(`  ! colon reveal?: ${s.slice(0, 140)}`);
  }
  for (const s of allSentences) if (BY_ITEM.test(s)) say(`  ! narrates the record item by item: ${s.slice(0, 140)}`);
  const first = prose.find((b) => b.tag === "p");
  if (first && /\?$/.test(sentences(first.t)[0] ?? "")) say(`  ! opens with a question: ${first.t.slice(0, 140)}`);

  const proseText = prose.map((b) => b.t).join(" ");
  const clock = proseText.match(CLOCK) ?? [];
  const dates = proseText.match(DATE) ?? [];
  const refs = (proseText.match(REF) ?? []).map((r) => r.trim());
  const talk = prose.flatMap((b) => sentences(b.t)).filter((x) => TALK.test(x) || TOOL_TALK.test(x));
  totals.clock += clock.length; totals.dates += dates.length; totals.refs += refs.length; totals.talk += talk.length;
  for (const c of blocks.filter((b) => b.tag === "figcaption").map((b) => b.t)) {
    if (CLOCK.test(c) || /\b[0-9a-f]{7,12}\b|\bcommit\b/i.test(c)) say(`  ! caption names a time or commit; label the iteration instead ("Round one", "As it ships"): ${c.slice(0, 100)}`);
    CLOCK.lastIndex = 0;
  }
  if (clock.length) say(`  ! clock times (cut unless the timing is the point): ${clock.join(", ")}`);
  if (dates.length) say(`  · dates: ${dates.join(", ")}`);
  if (refs.length) say(`  · references in prose: ${refs.join(", ")}`);
  for (const t of talk) say(`  · process talk: ${t.slice(0, 140)}`);

  for (const s of prose.flatMap((b) => sentences(b.t))) {
    const w = words(s);
    plain.sents++; plain.words += w;
    if (PASSIVE.test(s)) plain.passive++;
    if (w > MAX_SENT) plain.long.push(`${p.id} (${w}w): ${s.slice(0, 120)}`);
  }

  // Writerly words and skill vocabulary that leak into posts; say the plain thing.
  const writerly = [...new Set((proseText.match(/\b(prose|narrative|this (post|piece|article) (covers|explains|walks)|the reader|altitude|dossier)\b/gi) ?? []).map((w) => w.toLowerCase()))];
  if (writerly.length) say(`  ! writerly words: ${writerly.join(", ")} (say what an engineer would say out loud)`);
  // A sentence announcing a count ("three things") should be followed by a list.
  for (const m of p.html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>\s*(<\w+)?/g)) {
    const c = text(m[1]).match(/\b(two|three|four|five|six|2|3|4|5|6) (things|changes|parts|pieces|features|ideas|decisions|steps|rules|checks|ways)\b/i);
    if (c && !/^<(ul|ol)$/i.test(m[2] ?? "")) say(`  ! "${c[0]}" with no list after it; make the items a bulleted list`);
  }
  const inPara = [...p.html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].reduce((n, m) => n + (m[1].match(/<(strong|b)\b/g) ?? []).length, 0);
  if (inPara > 2) say(`  ! ${inPara} bold phrases in paragraphs; keep about one per chapter (list lead-ins don't count)`);
  // Identifiers in running text (inline <code> in paragraphs and list items, not code blocks).
  const idents = [...p.html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].reduce((n, m) => n + (m[2].match(/<code\b/g) ?? []).length, 0);
  const identMax = flavor === "deep" ? 12 : flavor === "build" ? 4 : 2;
  if (idents > identMax && !/try it|get started|how to use/i.test(title)) say(`  ! ${idents} code identifiers in the prose (aim ≤${identMax}); say what each thing does, save names for the try-it section and code blocks`);
  scan.push({ id: p.id, bold: (p.html.match(/<(strong|b)\b/g) ?? []).length, inPara, lists: (p.html.match(/<(ul|ol)\b(?![^>]*class="(timeline|steps)")/g) ?? []).length });

  const openers = prose.filter((b) => b.tag === "p").map((b) => sentences(b.t)[0]).filter(Boolean);
  if (openers.length) {
    say("  openings (each should carry a decision or a reason, not just an event):");
    for (const o of openers) say(`    · ${o.slice(0, 120)}`);
  }
  // Figure numbers and the byline's month and year aren't claims.
  const claimText = (s) => s.replace(/^Fig\.?\s*\d+\.?\s*/i, "").replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{4}\b/g, "").replace(/^\d+\.?$/, "");
  const ledger = allSentences.filter((s) => /\d/.test(claimText(s)));
  if (ledger.length) {
    say("  numbers to source:");
    for (const s of ledger) say(`    □ ${s.slice(0, 160)}`);
  }
  say();
}

say(`Process detail (${flavor} budget): clock times ${totals.clock}/0 · dates ${totals.dates}/${BUDGET.dates} · references in prose ${totals.refs}/${BUDGET.refs} · process-talk sentences ${totals.talk}/${BUDGET.talk}`);
const over = [totals.clock > 0 && "clock times", totals.dates > BUDGET.dates && "dates", totals.refs > BUDGET.refs && "references", totals.talk > BUDGET.talk && "process talk"].filter(Boolean);
if (over.length) say(`! over budget: ${over.join(", ")}. Ask of each: would the reader miss it? Organize by idea, not chronology.`);
say();

// Self-naming: the product (full name and shorthand, comma-separated) in the title or a heading, as a
// sentence subject, and how often the prose says it.
const products = (opt("product") ?? "").split(",").map((x) => x.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
if (products.length) {
  const alt = products.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?<![\\w-])(?:${alt})(?![\\w-])`, "g");
  const name = products.map((x) => `"${x}"`).join(" or ");
  const heads = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<(h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map((m) => text(m[2].replace(/<span class="n">[^<]*<\/span>/, ""))).filter((h) => h.match(re));
  const prose = text(body.replace(/<footer[\s\S]*?<\/footer>/g, " ").replace(/<h[12]\b[\s\S]*?<\/h[12]>/g, " "));
  const n = prose.match(re)?.length ?? 0;
  say(`Product name ${name}: ${n} in the prose${heads.length ? "" : ", none in the title or headings"}.`);
  if (heads.length) say(`! ${name} in the title or a heading: ${heads.map((h) => `"${h}"`).join(" · ")}. Write it about what the reader gets (craft.md).`);
  if (n > Math.max(3, words(prose) / 250)) say(`! named often; once where a newcomer needs it, then "it", "we" or the feature's name (craft.md).`);
  const paras = [...body.replace(/<footer[\s\S]*?<\/footer>/g, " ").matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].flatMap((m) => sentences(text(m[2])));
  const subj = paras.filter((x) => new RegExp(`^(?:${alt})(?:'s|’s)?\\s+(?:now\\s+|also\\s+|still\\s+)?[a-z]+`).test(x));
  if (subj.length) say(`! ${name} as the subject of a sentence (${subj.length}); make the reader or the feature the subject: ${subj.slice(0, 3).map((x) => `"${x.slice(0, 70)}"`).join(" · ")}`);
  say();
}

if (isPrivate) {
  const internal = [...new Set(html.match(/https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(issues|pull|commit|blob|tree|actions|discussions)\b[^"'\s<)]*/g) ?? [])];
  if (internal.length) { hard++; say(`✗ private project, internal links: ${internal.slice(0, 10).join(" · ")}${internal.length > 10 ? ` … +${internal.length - 10}` : ""}`); }
}

// Plain English (STE-lite): short sentences, active voice. Report, don't fail.
if (plain.sents) {
  say(`Plain English: ${(plain.words / plain.sents).toFixed(1)} words/sentence (aim ≤15) · passive ${Math.round((100 * plain.passive) / plain.sents)}% (aim ≤10%) · ${plain.long.length} over ${MAX_SENT} words`);
  for (const l of plain.long) say(`  ! split: ${l}`);
  say();
}

// Scan aids: bold key ideas and lists give a skimmer handholds.
const bare = scan.filter((c) => c.id !== "opening" && !c.bold && !c.lists).map((c) => c.id);
say(`Scan aids: ${scan.reduce((a, c) => a + c.bold, 0)} bold (${scan.reduce((a, c) => a + c.inPara, 0)} in paragraphs, the rest list lead-ins) · ${scan.reduce((a, c) => a + c.lists, 0)} lists${bare.length ? ` · ! chapters with neither: ${bare.join(", ")} (bold the decision, or list the parts)` : ""}`);
say();

// Masthead stats: each must make sense to a stranger before they read a word of the post.
const stats = [...(raw.replace(/<!--[\s\S]*?-->/g, "").match(/<dl class="stats">([\s\S]*?)<\/dl>/)?.[1] ?? "").matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)].map((m) => `${text(m[1])} ${text(m[2])}`);
if (stats.length) {
  say("Masthead stats (optional; keep one only if a stranger gets it cold and it's a number they'd care about):");
  for (const s of stats) say(`  ? ${s}`);
  if (flavor === "release") say("  ! release stories usually skip masthead stats");
  say();
}

// Terminal blocks: one command, the few output lines that make the point, a bare caption.
for (const m of raw.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<figure class="code(?! term)[^"]*">\s*<figcaption>([\s\S]*?)<\/figcaption>/g)) {
  if ((m[1].match(/<span>/g) ?? []).length > 1) say(`! code caption "${text(m[1]).slice(0, 80)}": the file name is enough; drop the side note`);
}
let ti = 0;
for (const m of raw.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<figure class="code term[^"]*">([\s\S]*?)<\/figure>/g)) {
  ti++;
  const cap = text(m[1].match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? "");
  const lines = text((m[1].match(/<pre>([\s\S]*?)<\/pre>/)?.[1] ?? "").replace(/\n/g, "\u0001")).split("\u0001").map((l) => l.trim()).filter(Boolean);
  const cmds = lines.filter((l) => l.startsWith("$ "));
  const issues = [];
  if (cmds.length > 1) issues.push(`${cmds.length} commands (one per block; split it or keep the one that matters)`);
  if (lines.length - cmds.length > 12) issues.push(`${lines.length - cmds.length} output lines (show the few that make the point, mark cuts with "…")`);
  for (const c of cmds) {
    if (c.length > 72) issues.push(`long command (${c.length} chars): drop flags the reader doesn't need`);
    if (/\|\s*(head|tail|grep|jq|sed)\b/.test(c)) issues.push("pipes through a filter; show the plain command and trim the output instead");
  }
  if (cap.replace(/^Terminal\s*/, "").length > 30) issues.push(`caption carries run metadata ("${cap.slice(0, 80)}"); keep provenance in plan.md`);
  if (issues.length) say(`! terminal ${ti}: ${issues.join(" · ")}`);
}

if (modules.length) say(`Modules (not counted): ${modules.join(", ")}`);
// Animated dots: animateMotion adds its path to the circle's cx/cy, and the path should ride the drawn wires.
for (const svg of raw.match(/<svg\b[\s\S]*?<\/svg>/g) ?? []) {
  const pts = (d) => (d.match(/-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/g) ?? []).map((p) => p.replace(/\s/g, ""));
  const wire = new Set([...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].flatMap((m) => pts(m[1])));
  const title = svg.match(/<title[^>]*>([^<]*)/)?.[1] ?? "diagram";
  for (const m of svg.matchAll(/<circle\b([^>]*)>\s*<animateMotion\b([^>]*)>/g)) {
    const cx = Number(m[1].match(/\bcx="([^"]+)"/)?.[1] ?? 0), cy = Number(m[1].match(/\bcy="([^"]+)"/)?.[1] ?? 0);
    if (cx || cy) { hard++; say(`✗ "${title}": moving dot has cx/cy ${cx},${cy}; set both to 0 (animateMotion adds its path to them)`); }
    if (svg.indexOf(m[0]) > svg.search(/<rect\b/) && svg.search(/<rect\b/) >= 0) say(`! "${title}": moving dot is drawn after the boxes, so it crosses their labels; move the <circle> above the first <rect>`);
    // A point hidden inside a box is fine: the dot turns while it's covered.
    const rects = [...svg.matchAll(/<rect\b([^>]*)>/g)].map((r) => ["x", "y", "width", "height"].map((k) => Number(r[1].match(new RegExp(`\\b${k}="([^"]+)"`))?.[1] ?? NaN)));
    const inBox = (p) => { const [x, y] = p.split(",").map(Number); return rects.some(([rx, ry, w, h]) => x > rx && x < rx + w && y > ry && y < ry + h); };
    const off = pts(m[2].match(/\bpath="([^"]+)"/)?.[1] ?? "").filter((p) => !wire.has(p) && !inBox(p));
    if (off.length) say(`! "${title}": motion path points not on any drawn wire: ${off.join(" ")} (dot may drift off the lines)`);
  }
}

// Rendered components (viz.mjs). Markers first: empty, stale, or still pointing at the template's specs.
const viz = vizBuild(raw, dirname(resolve(file)), { check: true });
const vizSpecs = [...raw.matchAll(/<!-- viz (\w+) (\S+?)(?: #[0-9a-f]{6})? -->/g)].map((m) => `${m[1]} ${m[2]}`);
if (vizSpecs.length) {
  say(`Components: ${vizSpecs.length} rendered from specs (tick their numbers in the specs): ${vizSpecs.join(" · ")}`);
  for (const p of viz.problems) say(`  ! ${p}${/changed|not rendered/.test(p) ? " (run viz.mjs build)" : ""}`);
}
// A flow wider than the reading column shows its stacked drawing on desktop unless its figure is wide.
for (const m of raw.matchAll(/<figure\b([^>]*)>(?:(?!<\/figure>)[\s\S])*?<div class="flow" data-fold="(46|52)"/g)) {
  if (!/class="[^"]*\bwide\b/.test(m[1])) say(`! a flow needs a wide figure (data-fold ${m[2]}); use <figure class="wide">, or the stacked drawing shows on desktop too`);
}
if (/<!-- viz \w+ specs\//.test(raw)) { hard++; say("✗ viz markers still point at the template's example specs (specs/…); write your own in viz/"); }
const live = raw.replace(/<!--[\s\S]*?-->/g, "");
for (const m of live.matchAll(/<div class="flow"[^>]*>([\s\S]*?)<\/div>/g)) {
  if (!/<svg class="h"/.test(m[1]) || !/<svg class="v"/.test(m[1])) say(`! flow "${m[1].match(/<title[^>]*>([^<]*)/)?.[1] ?? "?"}": needs both drawings (svg.h and svg.v); re-render it`);
}
// Bars to scale: every row's printed value ÷ its --v should give the same full-scale value.
for (const [k, chunk] of live.split(/<div class="bars\b/).slice(1).entries()) {
  const rows = [...chunk.split("</figure>")[0].matchAll(/<div class="row(?! note)[^"]*"[^>]*style="--v:([\d.]+)"[^>]*>[\s\S]*?<b>([^<]*)<\/b>/g)]
    .map((m) => [Number(m[1]), numberIn(m[2])]).filter(([v, n]) => v > 0 && Number.isFinite(n));
  const full = rows.map(([v, n]) => n / v);
  if (full.length > 1 && (Math.max(...full) - Math.min(...full)) / Math.max(...full) > 0.02) say(`! bars ${k + 1}: the bars aren't to scale with their printed values; re-render from the spec or fix --v`);
}
for (const m of live.matchAll(/<div class="(options|matrix) vtable">([\s\S]*?)<\/table>/g)) {
  const bare = (m[2].match(/<td(?![^>]*data-label=)[^>]*>/g) ?? []).length;
  if (bare) say(`! ${m[1]} table: ${bare} cells without data-label; on a phone they lose their column name (re-render it)`);
}
for (const m of live.matchAll(/<div class="strip"[^>]*>([\s\S]*?)<\/div><\/div>/g)) {
  const labels = [...m[1].matchAll(/<div class="frame"><span class="tag[^"]*">([^<]*)</g)].map((x) => x[1]);
  if (labels.length < 2 || labels.length > 4) say(`! strip: ${labels.length} frames; use 2 to 4`);
  for (const l of labels) if (NAMES_COMMIT.test(l)) say(`! strip label "${l}" names a commit or PR; label the iteration ("Round two", "As it ships")`);
}

// Keyed figures: every hotspot has a legend entry and a place, every entry a hotspot, and few enough to read.
for (const m of live.matchAll(/<(?:figure|div) class="[^"]*\bkeyed\b[^"]*"[^>]*>([\s\S]*?<ol class="keys">[\s\S]*?<\/ol>)/g)) {
  const spots = [...m[1].matchAll(/<button\b[^>]*class="hs\b[^"]*"[^>]*>/g)].map((b) => b[0]);
  const ks = spots.map((b) => b.match(/\bdata-k="([^"]+)"/)?.[1]);
  const keys = [...m[1].matchAll(/<li\b[^>]*\bdata-k="([^"]+)"/g)].map((x) => x[1]);
  const name = m[1].match(/\b(?:alt|aria-label)="([^"]{0,40})/)?.[1] ?? "keyed figure";
  const lost = ks.filter((k) => !keys.includes(k)), bare = keys.filter((k) => !ks.includes(k));
  if (lost.length) say(`! keyed "${name}": hotspot ${lost.join(", ")} has no legend entry (data-k)`);
  if (bare.length) say(`! keyed "${name}": legend entry ${bare.join(", ")} has no hotspot`);
  if (new Set(ks).size !== ks.length) say(`! keyed "${name}": two hotspots share a number`);
  for (const b of spots) if (!/--x:\s*[\d.]+%/.test(b) || !/--y:\s*[\d.]+%/.test(b)) say(`! keyed "${name}": hotspot ${b.match(/\bdata-k="([^"]+)"/)?.[1] ?? "?"} needs --x and --y in percent`);
  if (spots.length > 6) say(`! keyed "${name}": ${spots.length} hotspots; past about six the numbers stop helping (split the figure, or key only what the text needs)`);
}
// Findings and margin notes: one finding per chapter at most, and a margin note stays an aside.
for (const p of parts) {
  const n = (p.html.match(/<aside class="finding"/g) ?? []).length;
  if (n > 1) say(`! ${p.id}: ${n} findings; keep the one a reader would repeat`);
}
for (const m of live.matchAll(/<span class="sidenote"[^>]*>([\s\S]*?)<\/span>/g)) {
  const w = words(text(m[1]));
  if (w > 30) say(`! margin note of ${w} words ("${text(m[1]).slice(0, 50)}…"): a note is a short aside; move the rest into the paragraph or cut it`);
}

const leftovers = LEFTOVER.filter((t) => raw.includes(t));
if (leftovers.length) { hard++; say(`✗ leftover template text: ${leftovers.join(" · ")}`); }

const safety = [];
for (const [re, label] of SAFETY) for (const m of html.matchAll(re)) safety.push(`${label}: ${m[0]}`);
const uniqSafety = [...new Set(safety)];
if (uniqSafety.length) {
  say("Safety scan (read each; a hit is not always a leak):");
  for (const s of uniqSafety.slice(0, 40)) say(`  ? ${s}`);
  say();
} else say("Safety scan: no hits.");

// Links: every address in the post must open. A guessed address (a made-up slug) fails here.
if (!argv.includes("--offline")) {
  const links = [...new Set([...html.matchAll(/<a\b[^>]*\bhref="(https?:\/\/[^"#]+)/g)].map((m) => m[1].replace(/&amp;/g, "&")))];
  const status = async (url) => {
    for (const method of ["HEAD", "GET"]) {
      try {
        const r = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "build-story-lint" } });
        if (r.ok || method === "GET") return r.status;
      } catch (err) { if (method === "GET") return err.name === "TimeoutError" ? "timeout" : "no answer"; }
    }
  };
  const results = await Promise.all(links.map(async (url) => [url, await status(url)]));
  const broken = results.filter(([, s]) => !(s >= 200 && s < 400));
  if (broken.length) { hard++; for (const [url, s] of broken) say(`✗ link doesn't open (${s}): ${url}`); }
  else if (links.length) say(`Links: all ${links.length} open.`);
}
const imgs = (raw.replace(/<!--[\s\S]*?-->/g, "").match(/<img\b|<source\b[^>]*\bsrcset=/g) ?? []).length;
if (imgs) say(`Images: ${imgs}. The scan cannot see inside them; open each one and look for names, emails, tokens and internal URLs.`);

const [lo, hi] = RANGE;
say(`Total prose: ${total} words (${flavor}: ${hi === Infinity ? "no limit" : `up to ${hi}`}, no minimum). Captions, code, terminals, diagrams and end matter are not counted.`);
if (total > hi * 1.15) say("! long for this flavor; cut beats, not sentences (there is no minimum)");

console.log(out.join("\n"));
process.exit(hard ? 1 : 0);
