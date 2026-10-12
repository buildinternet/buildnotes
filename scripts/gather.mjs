#!/usr/bin/env node
// gather.mjs — build an evidence dossier for a feature from git + GitHub.
//
// Needs only `git` and an authenticated `gh`. No npm dependencies.
//
// Usage:
//   node gather.mjs --out <dir> [selectors…] [options]
//
// Selectors (combine freely; everything found is merged and de-duplicated):
//   --issue 2290,2291      issues: body, comments, sub-issues, and PRs that reference them
//   --pr 2378,2379         pull requests: body, branch commits, files, review threads
//   --search "publish token"  merged PRs whose title/body match (gh search syntax)
//   --range v1.2.0..v1.3.0    commits in a git range
//   --path apps/api/src/auth  limit --range/--since commits to a path
//   --since 2026-09-01        commits since a date (with --path or --grep)
//   --grep "publish"          commits whose message matches
//
// Options:
//   --repo owner/name   default: the current checkout's GitHub repo
//   --also-repo a/b,c/d with --search: run the same merged-PR search in these repos too
//   --tz America/New_York  add a local-time column to the timeline (UTC stays the base)
//   --download          download images found in PR/issue bodies into <out>/assets/
//   --body-chars 2500   cap each PR/issue body in the markdown dossier
//   --keep-bot-prs      keep release-automation PRs (dropped by default)
//   --prior "tag filter"  merged PRs from before the feature that match this phrase (prior context);
//                       several plain words search as one phrase, search syntax passes through
//   --window 2          days around the feature's span to list other merged PRs as "Nearby work" (0 = off)
//
// Writes <out>/dossier.json (everything, full cleaned text) and <out>/dossier.md (a skimmable digest).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) { process.stdout.write(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.replace(/^\/\/ ?/, "")).join("\n") + "\n"); process.exit(0); }
if (!args.out) die("missing --out <dir> (see --help)");
const BODY_CHARS = Number(args["body-chars"] ?? 2500);
const repo = args.repo ?? sh("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]).trim();
const TZ = typeof args.tz === "string" ? args.tz : null;
if (TZ) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: TZ }); } catch { die(`unknown time zone ${TZ}`); }
}

// Bots whose top-level comments are boilerplate. Their inline review comments are kept,
// because automated reviewers sometimes raise the point that changed the design.
const NOISE_BOTS = /^(changeset-bot|vercel|github-actions|codecov|netlify|dependabot|renovate|sonarcloud|cloudflare-workers-and-pages|uploads-sh|[\w-]*screenshots?[\w-]*|percy|chromatic-com|argos-ci)(\[bot\])?$/i;
const SUMMARY_BOTS = /^(coderabbitai|copilot-pull-request-reviewer|sourcery-ai|greptile-apps)(\[bot\])?$/i;
// gh reports app actors without the "[bot]" suffix, so name the common ones too.
const OTHER_BOTS = /^(cursor|cursoragent|chatgpt-codex-connector|codex|copilot|copilot-swe-agent|devin-ai-integration|claude|graphite-app|linear)$/i;
const BADGE_HOSTS = /shields\.io|badge|coderabbit\.ai|vercel\.com\/button|codecov\.io|avatars\.githubusercontent|open-in-|deploy-button/i;
// Release-automation PRs (version bumps) carry no story.
const isBotPr = (p) => /^app\/|\[bot\]$/.test(p.author?.login ?? "") || /^chore(\(release\))?: (version packages|release)/i.test(p.title);

// Story-signal vocabularies.
const FEEDBACK_RE = /\b(review(er)?|found|flagged|adversarial|caught|race|CSRF|vulnerab\w*|bug)\b/i;
const DECISION_RE = /\b(decid\w*|decision|instead|rejected|revert|reverted|rethink|changed (our|my) mind|trade-?off|drift|went with|ruled out|back to)\b/i;
// Footers that say an agent wrote (or reviewed) the change. Kept specific: bare "Claude Code" or
// "cursor" show up in ordinary prose of repos that discuss them.
const AGENT_PATTERNS = [
  ["Cursor", /CURSOR_AGENT_PR_BODY|Open in (Web|Cursor)|cursor\.com\/(agents|background-agent)|cursoragent@cursor\.com|Co-authored-by:\s*Cursor|Cursor Agent/i],
  ["Claude Code", /Generated with \[?Claude Code|Addressed by \[?Claude Code|Co-authored-by:\s*Claude|noreply@anthropic\.com|claude\.(ai|com)\/(claude-)?code/i],
  ["Codex", /Generated with \[?Codex|Co-authored-by:\s*Codex|chatgpt-codex-connector|openai\.com\/codex|chatgpt\.com\/codex|Codex Review|\bCodex (did an? |flagged|found|reviewed)/i],
  ["Copilot", /Co-authored-by:\s*Copilot|copilot-swe-agent|Generated with (GitHub )?Copilot|Copilot (coding )?agent/i],
  ["Devin", /devin\.ai|devin-ai-integration|Co-authored-by:\s*Devin|Generated with Devin/i],
];

const visibility = (() => { try { return sh("gh", ["repo", "view", repo, "--json", "visibility", "-q", ".visibility"]).trim().toLowerCase() || "unknown"; } catch { return "unknown"; } })();
const dossier = { repo, visibility, generatedAt: new Date().toISOString(), selectors: args, issues: [], prs: [], commits: [], crossRepo: [] };
const seenPr = new Set();
const seenIssue = new Set();
const { renames, headFiles } = loadRenames();

for (const n of list(args.issue)) await addIssue(n, 0);
for (const n of list(args.pr)) addPr(n);
// Issues a selected PR closes often hold the plan and its decision tables. Pull their bodies,
// without widening the search to every PR that mentions them.
for (const p of [...dossier.prs]) if (p.repo === repo) for (const n of p.closes) await addIssue(n, 1, { follow: false });
if (args.search) {
  const found = ghJson(["pr", "list", "-R", repo, "--state", "merged", "--limit", "50", "--search", args.search, "--json", "number"]);
  for (const { number } of found) addPr(number);
  for (const other of list(args["also-repo"])) {
    const hits = ghJsonSafe(["pr", "list", "-R", other, "--state", "merged", "--limit", "50", "--search", args.search, "--json", "number"]);
    if (!hits) { console.error(`also-repo ${other}: search failed, skipped`); continue; }
    for (const { number } of hits) addPr(number, other);
  }
}
if (args.range || args.since || args.grep || args.path) addCommits();

dossier.prs.sort((a, b) => (a.mergedAt ?? a.createdAt).localeCompare(b.mergedAt ?? b.createdAt));
dossier.summary = summarize();
dossier.timeline = timeline();
dossier.feedbackSignals = feedbackSignals();
dossier.crossRepo = crossRepoRefs();
dossier.storyCandidates = storyCandidates();
dossier.priorWork = priorWork();
dossier.nearbyWork = nearbyWork();

mkdirSync(args.out, { recursive: true });
if (args.download) await downloadImages();
writeFileSync(join(args.out, "dossier.json"), JSON.stringify(dossier, null, 2));
writeFileSync(join(args.out, "dossier.md"), renderMarkdown());
console.error(
  `dossier: ${dossier.issues.length} issues · ${dossier.prs.length} PRs · ${dossier.commits.length} loose commits · ` +
    `${dossier.summary.images} images → ${join(args.out, "dossier.md")}`,
);

// ---------------------------------------------------------------- collectors

async function addIssue(n, depth, { follow = true } = {}) {
  n = Number(n);
  if (seenIssue.has(n)) return;
  seenIssue.add(n);
  const i = ghJson(["issue", "view", String(n), "-R", repo, "--json", "number,title,body,url,state,createdAt,closedAt,author,labels,comments"]);
  const issue = {
    number: i.number,
    title: i.title,
    url: i.url,
    state: i.state,
    createdAt: i.createdAt,
    closedAt: i.closedAt,
    author: i.author?.login,
    labels: i.labels.map((l) => l.name),
    body: clean(i.body),
    images: images(i.body),
    comments: i.comments.filter((c) => !isNoise(c.author?.login)).map((c) => ({ author: c.author?.login, at: c.createdAt, body: clean(c.body) })),
    subIssues: [],
  };
  dossier.issues.push(issue);

  // Sub-issues (GitHub native). One level is enough for a story.
  if (depth === 0) {
    const subs = ghJsonSafe(["api", `repos/${repo}/issues/${n}/sub_issues`, "--paginate"]) ?? [];
    for (const s of subs) {
      issue.subIssues.push(s.number);
      await addIssue(s.number, depth + 1);
    }
  }
  // PRs that mention the issue, plus PRs that close it.
  if (!follow) return;
  const mentioned = ghJsonSafe(["pr", "list", "-R", repo, "--state", "merged", "--limit", "30", "--search", `${n} in:body`, "--json", "number,body"]) ?? [];
  for (const p of mentioned) if (new RegExp(`#${n}\\b`).test(p.body ?? "")) addPr(p.number);
}

function addPr(n, r = repo) {
  n = Number(n);
  const key = `${r}#${n}`;
  if (seenPr.has(key)) return;
  seenPr.add(key);
  const fields =
    "number,title,body,url,state,author,createdAt,mergedAt,closedAt,additions,deletions,changedFiles,files,commits,comments,reviews,labels,closingIssuesReferences,headRefName,mergeCommit";
  let p;
  try {
    p = ghJson(["pr", "view", String(n), "-R", r, "--json", fields]);
  } catch (err) {
    if (r === repo) throw err;
    console.error(`pr ${key}: fetch failed, skipped`);
    return;
  }
  if (isBotPr(p) && !args["keep-bot-prs"]) return;
  const inline = ghJsonSafe(["api", `repos/${r}/pulls/${n}/comments`, "--paginate"]) ?? [];
  const threads = threadsOf(inline);

  // Authorship signals come from the RAW text — the "Open in Cursor" footer is scaffolding that
  // clean() strips, but it is also the evidence of who wrote the change.
  const rawTexts = [
    p.body,
    ...(p.comments ?? []).map((c) => c.body),
    ...(p.reviews ?? []).map((x) => x.body),
    ...(p.commits ?? []).map((c) => c.messageBody),
    ...inline.map((c) => c.body),
  ].filter(Boolean);
  // Agent tools also name their branches (claude/…, codex/…, cursor/…).
  const BRANCH = { "Claude Code": /^claude\//i, Codex: /^codex\//i, Cursor: /^cursor\//i, Copilot: /^copilot\//i, Devin: /^devin\//i };
  const agentSignals = AGENT_PATTERNS.filter(([name, re]) => rawTexts.some((t) => re.test(t)) || re.test(p.author?.login ?? "") || BRANCH[name]?.test(p.headRefName ?? "")).map(([name]) => name);
  const coAuthors = [...new Set((p.commits ?? []).flatMap((c) => coAuthorsOf(c.messageBody)))];
  const commitAuthors = [...new Set((p.commits ?? []).flatMap((c) => (c.authors ?? []).map((a) => a.login || a.name)).filter(Boolean))];

  dossier.prs.push({
    repo: r,
    number: p.number,
    title: p.title,
    url: p.url,
    state: p.state,
    author: p.author?.login,
    branch: p.headRefName,
    createdAt: p.createdAt,
    mergedAt: p.mergedAt,
    mergeCommit: p.mergeCommit?.oid ? { oid: p.mergeCommit.oid, short: p.mergeCommit.oid.slice(0, 8) } : null,
    additions: p.additions,
    deletions: p.deletions,
    changedFiles: p.changedFiles,
    labels: p.labels.map((l) => l.name),
    closes: (p.closingIssuesReferences ?? []).map((i) => i.number),
    coAuthors,
    commitAuthors,
    agentSignals,
    body: clean(p.body),
    images: images(p.body),
    files: (p.files ?? []).map((f) => ({ path: f.path, additions: f.additions, deletions: f.deletions })),
    // Branch commits show the path taken (attempts, reverts, review fixes) even when the PR is squash-merged.
    commits: (p.commits ?? []).map((c) => ({ sha: c.oid.slice(0, 8), at: c.committedDate, headline: c.messageHeadline })),
    conversation: (p.comments ?? [])
      .filter((c) => !isNoise(c.author?.login) && !SUMMARY_BOTS.test(c.author?.login ?? "") && !/^@\w+ (review|resume|pause)\b/.test(c.body.trim()))
      .map((c) => ({ author: c.author?.login, at: c.createdAt, body: clean(c.body) }))
      .filter((c) => substantive(c.body)),
    reviews: (p.reviews ?? [])
      .filter((x) => x.body?.trim() && !isNoise(x.author?.login))
      .map((x) => ({ author: x.author?.login, state: x.state, at: x.submittedAt, body: clean(x.body) }))
      .filter((x) => substantive(x.body)),
    threads,
  });
}

function addCommits() {
  const a = ["log", "--no-merges", "--date=short", "--format=%x1e%h%x1f%ad%x1f%an%x1f%s%x1f%b", "--numstat"];
  if (args.since) a.push(`--since=${args.since}`);
  if (args.grep) a.push(`--grep=${args.grep}`, "-i");
  if (args.range) a.push(args.range);
  if (args.path) a.push("--", ...list(args.path));
  const out = sh("git", a);
  const prSubjects = new Set(dossier.prs.map((p) => p.number));
  for (const rec of out.split("\x1e").slice(1)) {
    const [head, ...rest] = rec.split("\n");
    const [sha, date, author, subject, bodyStart] = head.split("\x1f");
    const pr = Number(subject.match(/\(#(\d+)\)\s*$/)?.[1]);
    if (pr && prSubjects.has(pr)) continue; // already covered by its PR
    const files = rest
      .filter((l) => /^\d+|-\t/.test(l) && l.includes("\t"))
      .map((l) => {
        const [add, del, path] = l.split("\t");
        return { path, additions: Number(add) || 0, deletions: Number(del) || 0 };
      });
    dossier.commits.push({ sha, date, author, subject, pr: pr || null, body: clean(bodyStart ?? "").slice(0, 600), files });
  }
}

// ---------------------------------------------------------------- shaping

function threadsOf(comments) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const roots = comments.filter((c) => !c.in_reply_to_id);
  return roots
    .map((root) => {
      const replies = comments.filter((c) => c.in_reply_to_id === root.id);
      const all = [root, ...replies].filter((c) => byId.has(c.id));
      return {
        path: root.path,
        line: root.line ?? root.original_line,
        url: root.html_url,
        // Full cleaned text: the markdown digest truncates, the JSON does not.
        messages: all.map((c) => ({ author: c.user?.login, bot: c.user?.type === "Bot" || isBotLogin(c.user?.login), at: c.created_at, body: clean(c.body) })),
      };
    })
    .filter((t) => t.messages.some((m) => m.body.length > 0));
}

function summarize() {
  const files = new Map();
  for (const p of dossier.prs) for (const f of p.files) bump(files, fileKey(p.repo, f.path), f.additions + f.deletions);
  for (const c of dossier.commits) for (const f of c.files) bump(files, fileKey(repo, f.path), f.additions + f.deletions);
  const dirs = new Map();
  for (const [path, n] of files) bump(dirs, path.split("/").slice(0, 2).join("/"), n);
  const dates = [
    ...dossier.issues.map((i) => i.createdAt),
    ...dossier.prs.flatMap((p) => [p.createdAt, p.mergedAt]),
    ...dossier.commits.map((c) => c.date),
  ].filter(Boolean).sort();
  const humanAuthors = new Set([...dossier.prs.map((p) => p.author), ...dossier.commits.map((c) => c.author)].filter((a) => a && !isBotLogin(a)));
  const coAuthors = new Map();
  for (const p of dossier.prs) for (const a of p.coAuthors) bump(coAuthors, a, 1);
  const agents = new Map();
  for (const p of dossier.prs) for (const a of p.agentSignals) bump(agents, a, 1);
  const docs = [...files.keys()].filter(
    (f) =>
      /\.(md|mdx)$/i.test(f) &&
      !/CHANGELOG|\.changeset\//i.test(f) &&
      !/(^|\/)(AGENTS|CLAUDE)\.md$/i.test(f) &&
      !/(^|\/)(fixtures|__fixtures__|snapshots|__snapshots__|__tests__|test|tests)\//i.test(f),
  );
  const threads = dossier.prs.flatMap((p) => p.threads);
  const humanThreads = threads.filter((t) => !isBotLogin(t.messages[0]?.author) && !t.messages[0]?.bot);
  const feedbackComments =
    dossier.prs.reduce((n, p) => n + p.conversation.filter((c) => !isBotLogin(c.author)).length, 0) +
    dossier.issues.reduce((n, i) => n + i.comments.filter((c) => !isBotLogin(c.author)).length, 0);
  const first = dates[0]?.slice(0, 10);
  const last = dates.at(-1)?.slice(0, 10);
  const hotFiles = top(files, 15);
  return {
    first,
    last,
    days: first ? Math.round((Date.parse(last) - Date.parse(first)) / 864e5) + 1 : 0, // calendar days (UTC dates), inclusive
    issues: dossier.issues.length,
    prs: dossier.prs.length,
    branchCommits: dossier.prs.reduce((n, p) => n + p.commits.length, 0),
    looseCommits: dossier.commits.length,
    additions: dossier.prs.reduce((n, p) => n + p.additions, 0) + dossier.commits.reduce((n, c) => n + c.files.reduce((m, f) => m + f.additions, 0), 0),
    deletions: dossier.prs.reduce((n, p) => n + p.deletions, 0) + dossier.commits.reduce((n, c) => n + c.files.reduce((m, f) => m + f.deletions, 0), 0),
    filesTouched: files.size,
    // Human = thread started by a person. A human reply under a bot's opening comment still counts as a bot thread.
    reviewThreadsHuman: humanThreads.length,
    reviewThreadsBot: threads.length - humanThreads.length,
    feedbackComments, // human PR conversation comments + human issue comments
    authors: [...humanAuthors],
    coAuthors: [...coAuthors].sort((a, b) => b[1] - a[1]).map(([name]) => name),
    agentSignals: [...agents].sort((a, b) => b[1] - a[1]).map(([name, prs]) => ({ name, prs })),
    images: [...dossier.issues, ...dossier.prs].reduce((n, x) => n + x.images.length, 0),
    hotFiles,
    hotFilesLastChanged: Object.fromEntries(hotFiles.slice(0, 10).map(([f]) => [f, lastChanged(f)])),
    hotAreas: top(dirs, 10),
    docsTouched: docs,
  };
}

// Earlier changes to the feature's hot files, before its first issue or PR: is this new, or an
// iteration on something users already know? Feeds the brief's prior-context field.
function priorWork() {
  const start = [...dossier.issues.map((i) => i.createdAt), ...dossier.prs.map((p) => p.createdAt), ...dossier.commits.map((c) => c.date)].filter(Boolean).sort()[0];
  const before = start?.slice(0, 10) ?? null;
  // Where earlier releases were announced: changelogs and release-notes files in the repo.
  const notes = [...headFiles].filter((f) => /(^|\/)(CHANGELOG|CHANGES|HISTORY|RELEASES|RELEASE[-_]NOTES)\.(md|mdx)$/i.test(f) && !/node_modules|vendor\/|dist\/|\/npm\/|(^|\/)(packages|apps)\/[^/]+\/CHANGELOG/i.test(f)).sort((x, y) => x.split("/").length - y.split("/").length).slice(0, 6);
  const out = { before, files: [], changes: [], prs: [], notes };
  if (!start) return out;

  // Explicit search for earlier work in the area (--prior "terms").
  if (args.prior) {
    const hits = ghJsonSafe(["pr", "list", "-R", repo, "--state", "merged", "--limit", "15", "--search", `${priorQuery(args.prior)} merged:<${before}`, "--json", "number,title,mergedAt"]) ?? [];
    out.prs = hits.filter((h) => !/^chore(\(release\))?: (version packages|release)|^changelog: \d{4}-/i.test(h.title)).map((h) => ({ number: h.number, title: h.title, date: h.mergedAt?.slice(0, 10) }));
  }

  let rev = "";
  try { rev = sh("git", ["rev-list", "-1", `--before=${start}`, "HEAD"]).trim(); } catch { /* no history */ }
  if (!rev) return out;
  // New files have no past; the files the feature *changed* show what it builds on. Paths are
  // current, so map each back through renames to its name at that time. Skip hub files that
  // everything touches (auth, routing): their history is noise, not prior context.
  const oldName = new Map();
  for (const [from, to] of renames) if (!oldName.has(to)) oldName.set(to, from);
  const existed = (f) => { try { sh("git", ["cat-file", "-e", `${rev}:${f}`]); return true; } catch { return false; } };
  const busy = (f) => { try { return sh("git", ["rev-list", "--count", `--since=${daysBefore(start, 120)}`, rev, "--", f]).trim() > 25; } catch { return false; } };
  const m = new Map();
  for (const p of dossier.prs) for (const f of p.files) bump(m, fileKey(p.repo, f.path), f.additions + f.deletions);
  for (const [f] of [...m].sort((x, y) => y[1] - x[1]).slice(0, 60)) {
    if (f.includes(":") || /(^|\/)(CHANGELOG|package)\.(md|json)$|\.lock$|test/.test(f)) continue;
    const then = existed(f) ? f : oldName.has(f) && existed(oldName.get(f)) ? oldName.get(f) : null;
    if (then && !busy(then)) out.files.push(then);
    if (out.files.length >= 10) break;
  }
  if (!out.files.length) return out;

  // Rank earlier commits by how many of those files they touched together.
  let log = "";
  try { log = sh("git", ["log", rev, "-n", "600", "--name-status", "-M", "--format=@@%h%x1f%ad%x1f%s", "--date=short", "--", ...out.files]); } catch { /* ignore */ }
  const set = new Set(out.files);
  const cands = [];
  for (const chunk of log.split("@@").filter(Boolean)) {
    const [head, ...paths] = chunk.split("\n").filter(Boolean);
    const [sha, date, subject] = head.split("\x1f");
    if (/^chore(\(release\))?: (version packages|release)|^Merge (branch|pull request)|^chore\(deps\)/i.test(subject)) continue;
    // name-status lines: "M\tpath" or "R100\told\tnew". A commit that mostly moves files is a
    // reorganization, not prior work.
    const rows = paths.map((l) => l.split("\t"));
    if (rows.filter((r) => /^R/.test(r[0])).length * 2 >= rows.length || /^(move|rename|group|reorgani[sz]e|restructure|relocate)\b/i.test(subject)) continue;
    cands.push({ sha, date, subject, overlap: rows.filter((r) => set.has(r.at(-1)) || set.has(r[1])).length });
  }
  const min = cands.some((c) => c.overlap >= 2) ? 2 : 1;
  const seen = new Set();
  for (const c of cands.filter((c) => c.overlap >= min).sort((a, b) => b.overlap - a.overlap || b.date.localeCompare(a.date))) {
    const key = c.subject.match(/\(#(\d+)\)\s*$/)?.[1] ?? c.sha;
    if (seen.has(key)) continue;
    seen.add(key);
    out.changes.push(c);
    if (out.changes.length >= 12) break;
  }
  return out;
}

// Other merged PRs around the same time, grouped by area. A PR is a breadcrumb, not the story:
// related work landing alongside it often belongs in the same post.
function nearbyWork() {
  const days = Number(args.window ?? 2);
  const times = [...dossier.prs.flatMap((p) => [p.createdAt, p.mergedAt]), ...dossier.issues.map((i) => i.createdAt)].filter(Boolean).sort();
  if (!days || !times.length) return { from: null, to: null, groups: [] };
  const from = daysBefore(times[0], days);
  const to = daysBefore(times.at(-1), -days);
  const have = new Set(dossier.prs.filter((p) => p.repo === repo).map((p) => p.number));
  const hits = ghJsonSafe(["pr", "list", "-R", repo, "--state", "merged", "--limit", "200", "--search", `merged:${from}..${to}`, "--json", "number,title,mergedAt,author,files"]) ?? [];
  // Files the selected work touched: a nearby PR that shares them is likely the same idea.
  const mine = new Set(dossier.prs.filter((p) => p.repo === repo).flatMap((p) => p.files.map((f) => f.path)));
  const groups = new Map();
  for (const h of hits) {
    if (have.has(h.number) || isBotPr(h) || /^changelog: \d{4}-/i.test(h.title)) continue;
    const area = h.title.match(/^\w+\(([^)]+)\)!?:/)?.[1]?.toLowerCase() ?? h.title.match(/^(\w+)!?:/)?.[1]?.toLowerCase() ?? "other";
    if (!groups.has(area)) groups.set(area, []);
    const shared = (h.files ?? []).filter((f) => mine.has(f.path)).length;
    groups.get(area).push({ number: h.number, title: h.title, date: h.mergedAt?.slice(0, 10), shared });
  }
  for (const list of groups.values()) list.sort((a, b) => b.shared - a.shared);
  const score = (prs) => prs.reduce((n, p) => n + p.shared * 3, 0) + prs.length;
  return { from, to, groups: [...groups].sort((a, b) => score(b[1]) - score(a[1])).map(([area, prs]) => ({ area, prs })) };
}

function daysBefore(iso, n) { return new Date(Date.parse(iso) - n * 86400000).toISOString().slice(0, 10); }

function timeline() {
  const ev = [];
  for (const i of dossier.issues) {
    ev.push({ at: i.createdAt, kind: "issue-opened", ref: `#${i.number}`, title: i.title });
    if (i.closedAt) ev.push({ at: i.closedAt, kind: "issue-closed", ref: `#${i.number}`, title: i.title });
  }
  for (const p of dossier.prs) {
    ev.push({ at: p.createdAt, kind: "pr-opened", ref: prRef(p), title: p.title });
    if (p.mergedAt) ev.push({ at: p.mergedAt, kind: "pr-merged", ref: prRef(p), title: p.title, size: `+${p.additions} −${p.deletions}` });
  }
  for (const c of dossier.commits) ev.push({ at: c.date, kind: "commit", ref: c.sha, title: c.subject });
  return ev.sort((a, b) => a.at.localeCompare(b.at));
}

// PR/issue sentences that mention review findings, races, bugs… — pointers to the story's turning points.
function feedbackSignals() {
  const out = [];
  const seen = new Set();
  const add = (ref, where, author, text) => {
    const s = matchSentence(text, FEEDBACK_RE);
    if (!s) return;
    const k = `${ref}|${s}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ ref, where, author, text: oneLine(s, 300) });
  };
  for (const p of dossier.prs) {
    const ref = prRef(p);
    for (const para of p.body.split(/\n\s*\n/)) add(ref, "body", p.author, para);
    for (const c of p.conversation) add(ref, "comment", c.author, c.body);
    for (const r of p.reviews) add(ref, "review", r.author, r.body);
  }
  for (const i of dossier.issues) for (const c of i.comments) add(`#${i.number}`, "comment", c.author, c.body);
  return out;
}

// Mentions of OTHER repos (owner/repo#N or a github.com URL), resolved to title/state/date.
function crossRepoRefs() {
  const top = loadTopLevel();
  const refs = new Map();
  const scan = (from, fromRepo, text) => {
    const found = [];
    for (const m of (text ?? "").matchAll(/https:\/\/github\.com\/([A-Za-z0-9-]+)\/([\w.-]+)\/(?:pull|issues)\/(\d+)/g)) found.push([m[1], m[2], m[3]]);
    // "apps/cli#12" is a path-ish mention, not a repo: skip owners that are top-level directories here.
    for (const m of (text ?? "").matchAll(/(?<![\w/.@-])([A-Za-z0-9][A-Za-z0-9-]*)\/([\w.-]*[\w-])#(\d+)\b/g)) if (!top.has(m[1])) found.push([m[1], m[2], m[3]]);
    for (const [o, r, n] of found) {
      const full = `${o}/${r.replace(/\.git$/, "")}`;
      if (full.toLowerCase() === fromRepo.toLowerCase()) continue;
      const key = `${full}#${n}`;
      const e = refs.get(key) ?? { repo: full, number: Number(n), mentionedBy: [] };
      if (!e.mentionedBy.includes(from)) e.mentionedBy.push(from);
      refs.set(key, e);
    }
  };
  for (const i of dossier.issues) {
    scan(`#${i.number}`, repo, i.body);
    for (const c of i.comments) scan(`#${i.number}`, repo, c.body);
  }
  for (const p of dossier.prs) {
    const ref = prRef(p);
    scan(ref, p.repo, p.body);
    for (const c of [...p.conversation, ...p.reviews]) scan(ref, p.repo, c.body);
    for (const t of p.threads) for (const m of t.messages) scan(ref, p.repo, m.body);
  }
  const out = [];
  for (const e of [...refs.values()].slice(0, 30)) {
    const x = ghJsonSafe(["api", `repos/${e.repo}/issues/${e.number}`]);
    if (!x || Array.isArray(x) || !x.title) { console.error(`cross-repo ${e.repo}#${e.number}: lookup failed, skipped`); continue; }
    const mergedAt = x.pull_request?.merged_at ?? null;
    out.push({
      ...e,
      kind: x.pull_request ? "pr" : "issue",
      title: x.title,
      state: mergedAt ? "merged" : x.state,
      closedAt: x.closed_at ?? null,
      mergedAt,
      url: x.html_url,
    });
  }
  return out;
}

// A handful of lines pointing at likely story beats. Every item cites a ref so a writer can verify it.
function storyCandidates() {
  const out = { decisions: [], bursts: [], followUpClusters: [], reverts: [] };

  // (a) comments that talk about a decision
  const cands = [];
  const add = (ref, author, text) => {
    const s = matchSentence(text, DECISION_RE);
    if (s) cands.push({ ref, author, text: oneLine(s, 220), hits: (s.match(new RegExp(DECISION_RE.source, "gi")) ?? []).length });
  };
  for (const i of dossier.issues) for (const c of i.comments) add(`#${i.number}`, c.author, c.body);
  for (const p of dossier.prs) for (const c of [...p.conversation, ...p.reviews]) add(prRef(p), c.author, c.body);
  cands.sort((a, b) => Number(isBotLogin(a.author)) - Number(isBotLogin(b.author)) || b.hits - a.hits);
  out.decisions = cands.slice(0, 5);

  // (a2) decision sections in issue and PR bodies: plans often carry a "Decisions" table or
  // an "Open questions" list, which says more than any comment.
  const SECTION_RE = /^#{2,4}\s*(.*\b(decid\w*|decisions?|trade-?offs?|alternatives|why not|open questions?|scope|rejected|ruled out)\b.*)$/im;
  out.decisionSections = [];
  for (const [ref, body] of [...dossier.issues.map((i) => [`#${i.number}`, i.body]), ...dossier.prs.map((p) => [prRef(p), p.body])]) {
    for (const m of (body ?? "").matchAll(new RegExp(SECTION_RE.source, "gim"))) {
      const after = body.slice(m.index + m[0].length).split(/\n#{1,4}\s/)[0].trim().split("\n").filter((l) => l.trim() && !/^\|?\s*-{3,}/.test(l));
      out.decisionSections.push({ ref, heading: m[1].trim(), lines: after.length, preview: oneLine(after.slice(0, 3).join(" "), 200) });
    }
  }

  // (b) bursts: days with >=3 merges
  const byDay = new Map();
  for (const p of dossier.prs) if (p.mergedAt) byDay.set(dayOf(p.mergedAt), [...(byDay.get(dayOf(p.mergedAt)) ?? []), prRef(p)]);
  out.bursts = [...byDay].filter(([, refs]) => refs.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([date, refs]) => ({ date, count: refs.length, refs }));

  // (c) follow-up clusters: >=3 issues opened within 10 minutes
  const issues = [...dossier.issues].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (let i = 0; i < issues.length; ) {
    let j = i;
    while (j + 1 < issues.length && Date.parse(issues[j + 1].createdAt) - Date.parse(issues[i].createdAt) <= 10 * 60e3) j++;
    if (j - i + 1 >= 3) {
      out.followUpClusters.push({ at: issues[i].createdAt, refs: issues.slice(i, j + 1).map((x) => `#${x.number}`) });
      i = j + 1;
    } else i++;
  }
  out.followUpClusters = out.followUpClusters.slice(0, 3);

  // (d) reverts: PR titles, branch-commit headlines, loose commits
  const rev = /^revert\b/i;
  for (const p of dossier.prs) {
    if (rev.test(p.title)) out.reverts.push({ ref: prRef(p), title: p.title });
    for (const c of p.commits) if (rev.test(c.headline) && c.headline !== p.title) out.reverts.push({ ref: `${prRef(p)} \`${c.sha}\``, title: c.headline });
  }
  for (const c of dossier.commits) if (rev.test(c.subject)) out.reverts.push({ ref: `\`${c.sha}\``, title: c.subject });
  out.reverts = out.reverts.slice(0, 4);
  return out;
}

// ---------------------------------------------------------------- output

function renderMarkdown() {
  const s = dossier.summary;
  const L = [];
  L.push(`# Dossier — ${repo}`, "");
  L.push(`Generated ${dossier.generatedAt}. Raw data in dossier.json. Every number below is counted from GitHub/git, so it is accurate. Most of this detail is for understanding the work; very little belongs in the post.`, "");
  L.push(
    visibility === "public"
      ? `Repo is **public**: a deep dive may link a few key PRs or docs; build and release stories link docs only.`
      : `Repo is **${visibility}**: the post must not link or cite issues, PRs, commits or internal docs. Run lint.mjs with --private.`,
    "",
  );
  L.push("## At a glance", "");
  L.push(`- Span: ${s.first} → ${s.last} (${s.days} calendar days, inclusive)`);
  L.push(`- ${s.issues} issues · ${s.prs} PRs · ${s.branchCommits} branch commits · ${s.looseCommits} loose commits`);
  L.push(`- +${s.additions} −${s.deletions} lines across ${s.filesTouched} files`);
  L.push(
    `- Feedback: ${s.reviewThreadsHuman} inline review threads started by humans · ${s.reviewThreadsBot} started by bots · ` +
      `${s.feedbackComments} human feedback comments (PR conversation + issue comments). Never quote the bot count as "review threads".`,
  );
  L.push(`- ${s.images} images in bodies`);
  L.push(`- Authors: ${authorsLine(s)}`, "");
  L.push("Hot areas: " + s.hotAreas.map(([d, n]) => `\`${d}\` (${n})`).join(", "), "");
  L.push("Hot files (lines changed; last commit on HEAD touching it):", "");
  for (const [f, n] of s.hotFiles.slice(0, 10)) {
    const lc = s.hotFilesLastChanged[f];
    L.push(`- \`${f}\` (${n}) — ${lc ? `last changed \`${lc.sha}\` ${lc.date} ${esc(oneLine(lc.subject, 90))}` : "not at this path on HEAD (renamed, deleted, or another repo)"}`);
  }
  L.push("");
  if (s.docsTouched.length) L.push("Docs touched (read these — they hold the reasoning): " + s.docsTouched.map((f) => `\`${f}\``).join(", "), "");

  const sc = dossier.storyCandidates;
  L.push("## Story candidates", "", "Leads to verify against the sources below, not conclusions.", "");
  let any = false;
  for (const d of sc.decisions) { L.push(`- decision? ${d.ref} **${d.author}**: “${d.text}”`); any = true; }
  for (const d of sc.decisionSections ?? []) { L.push(`- decision section: ${d.ref} “${esc(d.heading)}” (${d.lines} lines): ${esc(d.preview)}`); any = true; }
  for (const b of sc.bursts) { L.push(`- burst: ${b.date} — ${b.count} merges (${b.refs.slice(0, 8).join(", ")}${b.refs.length > 8 ? ", …" : ""})`); any = true; }
  for (const c of sc.followUpClusters) { L.push(`- follow-up cluster: ${fmtAt(c.at)} — ${c.refs.length} issues opened within 10 min (${c.refs.join(", ")})`); any = true; }
  for (const r of sc.reverts) { L.push(`- revert: ${r.ref} ${esc(r.title)}`); any = true; }
  if (!any) L.push("- none detected");
  L.push("");

  const nw = dossier.nearbyWork;
  if (nw.groups.length) {
    L.push("## Nearby work", "", `Other merged PRs from ${nw.from} to ${nw.to}, grouped by area; ★n marks a PR that shares n files with the selected work (a few shared hub files mean little; many mean the same idea). The selected PRs are a starting point, not the boundary: if something here serves the same idea for users, pull it in (\`--pr\`) and tell the story of the idea.`, "");
    for (const g of nw.groups.slice(0, 12)) L.push(`- **${esc(g.area)}** (${g.prs.length}): ${g.prs.slice(0, 6).map((p) => `${p.shared ? `★${p.shared} ` : ""}#${p.number} ${esc(oneLine(p.title.replace(/^\w+(\([^)]+\))?!?:\s*/, ""), 70))}`).join(" · ")}${g.prs.length > 6 ? " · …" : ""}`);
    L.push("");
  }
  const pw = dossier.priorWork;
  L.push("## Prior work", "", `Leads for the brief's prior context (is this new, or an iteration on something users already know?), from before ${pw.before ?? "the feature"}. Confirm in the changelog, docs and earlier posts what was already announced.`, "");
  if (pw.notes.length) L.push("Where releases were announced (read the entries from before the feature): " + pw.notes.map((f) => `\`${f}\``).join(", "), "");
  if (pw.prs.length) { L.push(`Earlier PRs matching \`--prior ${esc(args.prior)}\`:`, ""); for (const p of pw.prs) L.push(`- ${p.date} #${p.number} ${esc(oneLine(p.title, 110))}`); L.push(""); }
  if (pw.changes.length) { L.push("Earlier changes to files this feature modified (most shared files first; busy hub files skipped):", ""); for (const c of pw.changes) L.push(`- ${c.date} \`${c.sha}\` (${c.overlap} files) ${esc(oneLine(c.subject, 100))}`); L.push(""); }
  if (!pw.notes.length && !pw.prs.length && !pw.changes.length) L.push("- none found. Try `--prior \"<terms>\"`.", "");

  if (dossier.feedbackSignals.length) {
    const fs = dossier.feedbackSignals;
    L.push("## Feedback signals", "", `Sentences mentioning review, bugs, races, flagged problems (${fs.length}${fs.length > 20 ? `, first 20 shown; all in dossier.json` : ""}):`, "");
    for (const f of fs.slice(0, 20)) L.push(`- ${f.ref} (${f.where}, ${f.author ?? "?"}): ${f.text}`);
    L.push("");
  }

  if (dossier.crossRepo.length) {
    L.push("## Referenced elsewhere", "", "Items in other repos that these PRs/issues point to:", "");
    for (const x of dossier.crossRepo) {
      const when = x.mergedAt ? ` ${x.mergedAt.slice(0, 10)}` : x.closedAt ? ` ${x.closedAt.slice(0, 10)}` : "";
      L.push(`- ${x.repo}#${x.number} (${x.kind}, ${x.state}${when}): ${esc(x.title)} — mentioned by ${x.mentionedBy.join(", ")}`);
    }
    L.push("");
  }

  L.push("## Timeline", "", TZ ? `| when (UTC) | when (${TZ}) | what | ref | title |` : "| when (UTC) | what | ref | title |", TZ ? "|---|---|---|---|---|" : "|---|---|---|---|");
  for (const e of dossier.timeline) {
    const utc = e.at.slice(0, 16).replace("T", " ");
    L.push(`| ${utc} |${TZ ? ` ${e.at.includes("T") ? localTime(e.at) : "—"} |` : ""} ${e.kind}${e.size ? ` ${e.size}` : ""} | ${e.ref} | ${esc(e.title)} |`);
  }
  L.push("");

  for (const i of dossier.issues) {
    L.push(`## Issue #${i.number} — ${i.title}`, "", `${i.url} · ${i.state} · opened ${i.createdAt.slice(0, 10)} by ${i.author}`, "");
    if (i.subIssues.length) L.push(`Sub-issues: ${i.subIssues.map((n) => `#${n}`).join(", ")}`, "");
    L.push(trim(i.body), "");
    for (const c of i.comments) L.push(`> **${c.author}** (${c.at.slice(0, 10)}): ${oneLine(c.body, budget(c.author, i.author))}`, "");
    imgs(i.images);
  }

  for (const p of dossier.prs) {
    L.push(`## PR ${p.repo === repo ? "#" : `${p.repo}#`}${p.number} — ${p.title}`, "");
    L.push(
      `${p.url} · ${p.state} · ${p.author} · opened ${p.createdAt.slice(0, 10)}${p.mergedAt ? ` · merged ${p.mergedAt.slice(0, 10)}` : ""}` +
        `${p.mergeCommit ? ` as \`${p.mergeCommit.short}\`` : ""} · +${p.additions} −${p.deletions} in ${p.changedFiles} files` +
        `${p.closes.length ? ` · closes ${p.closes.map((n) => `#${n}`).join(", ")}` : ""}`,
      "",
    );
    L.push("### Description", "", trim(p.body), "");
    if (p.commits.some((c) => c.headline !== p.title)) {
      L.push(`### Branch commits (${p.commits.length})`, "");
      for (const c of p.commits) L.push(`- ${c.at.slice(0, 10)} \`${c.sha}\` ${c.headline}`);
      L.push("");
    }
    const areas = new Map();
    for (const f of p.files) bump(areas, normalize(f.path).split("/").slice(0, 3).join("/"), f.additions + f.deletions);
    L.push("### Where the change landed", "", top(areas, 8).map(([d, n]) => `\`${d}\` ${n}`).join(" · "), "");
    if (p.reviews.length || p.conversation.length || p.threads.length) {
      L.push("### Feedback", "");
      for (const r of p.reviews) L.push(`- review **${r.author}** ${r.state}: ${oneLine(r.body, budget(r.author, p.author))}`);
      for (const c of p.conversation) L.push(`- comment **${c.author}**: ${oneLine(c.body, budget(c.author, p.author))}`);
      for (const t of p.threads) {
        const [first, ...rest] = t.messages;
        L.push(`- \`${t.path}:${t.line ?? "?"}\` **${first.author}**: ${oneLine(first.body, first.author === p.author ? 1200 : 350)}`);
        for (const m of rest) L.push(`  - ↳ **${m.author}**: ${oneLine(m.body, m.author === p.author ? 1200 : 250)}`);
      }
      L.push("");
    }
    imgs(p.images);
  }

  if (dossier.commits.length) {
    L.push("## Loose commits", "");
    for (const c of dossier.commits) L.push(`- ${c.date} \`${c.sha}\` ${c.subject}${c.pr ? ` (#${c.pr})` : ""} — ${c.files.length} files`);
    L.push("");
  }
  return L.join("\n");

  function imgs(list) {
    if (!list.length) return;
    L.push("Images:", ...list.map((u) => `- ${u.local ? `${u.local} ← ` : ""}${u.url}${u.alt ? ` (“${u.alt}”)` : ""}`), "");
  }
}

function authorsLine(s) {
  const parts = [s.authors.join(", ") || "—"];
  if (s.coAuthors.length) parts.push(`co-authors: ${s.coAuthors.slice(0, 8).join(", ")}${s.coAuthors.length > 8 ? ` (+${s.coAuthors.length - 8} more)` : ""}`);
  parts.push(`agent signals: ${s.agentSignals.length ? s.agentSignals.map((a) => `${a.name} (${a.prs} PR${a.prs === 1 ? "" : "s"})`).join(", ") : "none detected"}`);
  return parts.join("; ");
}

async function downloadImages() {
  const dir = join(args.out, "assets");
  mkdirSync(dir, { recursive: true });
  const token = (() => { try { return sh("gh", ["auth", "token"]).trim(); } catch { return null; } })();
  let i = 0;
  for (const owner of [...dossier.issues, ...dossier.prs]) {
    for (const img of owner.images) {
      i++;
      const name = `${owner.number}-${i}${guessExt(img.url)}`;
      try {
        let res = await fetch(img.url, { redirect: "follow" });
        if (!res.ok && token && /github(usercontent)?\.com/.test(img.url)) res = await fetch(img.url, { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = extFromType(res.headers.get("content-type")) ?? extname(name);
        const file = name.replace(/\.[a-z0-9]+$/i, "") + ext;
        writeFileSync(join(dir, file), buf);
        img.local = `assets/${file}`;
      } catch (err) {
        img.error = String(err.message ?? err);
        console.error(`image ${img.url}: ${img.error}`);
      }
    }
  }
}

// ---------------------------------------------------------------- git helpers

// old path → current path, from `git log -M`, so churn on a file that was later moved still counts for it.
function loadRenames() {
  const renames = new Map();
  let headFiles = new Set();
  try {
    headFiles = new Set(sh("git", ["ls-files"]).split("\n").filter(Boolean));
    // Newest commit first: by the time we see an older rename, any later hop is already in the map.
    for (const line of sh("git", ["log", "--name-status", "-M", "--format=", "-n", "2000"]).split("\n")) {
      const m = line.match(/^R\d*\t([^\t]+)\t([^\t]+)$/);
      if (!m) continue;
      const [, from, to] = m;
      if (headFiles.has(from)) continue; // the old name was reused by a different file
      let end = to;
      for (let hops = 0; renames.has(end) && hops < 20; hops++) end = renames.get(end);
      if (end !== from) renames.set(from, end);
    }
  } catch (err) {
    console.error(`rename map skipped: ${String(err.message ?? err).split("\n")[0]}`);
  }
  return { renames, headFiles };
}
function normalize(path) {
  let p = path;
  for (let hops = 0; renames.has(p) && hops < 20; hops++) p = renames.get(p);
  return p;
}
function fileKey(r, path) { return r === repo ? normalize(path) : `${r}:${path}`; }
function loadTopLevel() {
  try { return new Set(sh("git", ["ls-tree", "--name-only", "HEAD"]).split("\n").filter(Boolean)); } catch { return new Set(); }
}
// The most recent commit on HEAD that touched a path — tells a writer whether HEAD still matches the merged version.
function lastChanged(path) {
  if (!headFiles.has(path)) return null;
  try {
    const [sha, date, subject] = sh("git", ["log", "-1", "--format=%h%x1f%ad%x1f%s", "--date=short", "--", path]).trim().split("\x1f");
    return sha ? { sha, date, subject } : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- helpers

function images(md = "") {
  const out = [];
  for (const m of md.matchAll(/!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g)) out.push({ url: m[2], alt: m[1] });
  for (const m of md.matchAll(/<img[^>]*\bsrc="([^"]+)"[^>]*>/gi)) out.push({ url: m[1], alt: m[0].match(/\balt="([^"]*)"/i)?.[1] ?? "" });
  for (const m of md.matchAll(/^\s*(https:\/\/github\.com\/user-attachments\/assets\/\S+)\s*$/gm)) out.push({ url: m[1], alt: "" });
  const seen = new Set();
  return out.filter((x) => !BADGE_HOSTS.test(x.url) && !seen.has(x.url) && seen.add(x.url));
}

// Strip scaffolding that carries no story. Runs BEFORE any truncation.
function clean(s = "") {
  let t = (s ?? "").replace(/<!--[\s\S]*?-->/g, "");
  // "Summary by CodeRabbit" — through the next heading of the same or higher level, or the end.
  t = t.replace(/^#{1,6}[ \t]*Summary by CodeRabbit\b[\s\S]*?(?=^#{1,2}[ \t]|(?![\s\S]))/gim, "");
  // "Open in Web / Open in Cursor" buttons, then any leftover <picture> blocks.
  t = t.replace(/<a\s[^>]*href="https?:\/\/(?:www\.)?cursor\.com[^"]*"[^>]*>[\s\S]*?<\/a>(?:&nbsp;)*/gi, "");
  t = t.replace(/<picture>[\s\S]*?<\/picture>/gi, "");
  // ALL <details> blocks, innermost first so nesting collapses to one marker.
  const inner = /<details\b[^>]*>(?:(?!<details\b)[\s\S])*?<\/details>/gi;
  for (let prev = null; prev !== t; ) { prev = t; t = t.replace(inner, "[details omitted]"); }
  t = t.replace(/(\[details omitted\]\s*){2,}/g, "[details omitted]\n");
  // CodeRabbit chrome: review preamble, "fix with AI" checkbox, severity/category tag lines, agent sign-offs.
  t = t.replace(/^[ \t]*[-*][ \t]+\[[ xX]\][ \t]*🪄[^\n]*$/gm, "");
  t = t.replace(/^\*\*Actionable comments posted: \d+\*\*[ \t]*$/gm, "");
  t = t.replace(/^(?:_[^_\n]+_[ \t]*\|[ \t]*)+_[^_\n]+_[ \t]*$/gm, "");
  t = t.replace(/_🤖 Addressed by \[[^\]]*\]\([^)]*\)[^_\n]*_/g, "");
  // PR-template checklists: runs of 2+ task-list lines. A run that cites #N or a URL is a tracking list
  // (an epic's checklist of child issues), which IS the story, so it stays.
  t = t.replace(/(?:^[ \t]*[-*][ \t]+\[[ xX]\][^\n]*(?:\n|$)){2,}/gm, (run) => (/(^|[^\w&])#\d+\b|github\.com\/[^\s)]+\/(issues|pull)\/\d+/.test(run) ? run : ""));
  return t.replace(/\n{3,}/g, "\n\n").trim();
}
// False once scaffolding stripping has left nothing but markers and rules.
function substantive(body) { return body.replace(/\[details omitted\]|^[ \t]*-{3,}[ \t]*$/gm, "").trim().length > 0; }
function isNoise(login = "") { return NOISE_BOTS.test(login ?? ""); }
function isBotLogin(login = "") {
  const l = login ?? "";
  return /\[bot\]$/i.test(l) || NOISE_BOTS.test(l) || SUMMARY_BOTS.test(l) || OTHER_BOTS.test(l) || l.startsWith("app/");
}
function coAuthorsOf(msg = "") {
  return [...(msg ?? "").matchAll(/^co-authored-by:\s*([^<\n]+?)\s*(?:<[^>\n]*>)?\s*$/gim)].map((m) => m[1]);
}
// First sentence in `text` matching `re`, ignoring code fences, tables, and quoted replies.
function matchSentence(text, re) {
  const plain = (text ?? "").replace(/```[\s\S]*?```/g, " ").split("\n").filter((l) => !/^\s*(\||>)/.test(l)).join("\n");
  for (const sent of plain.split(/(?<=[.!?])\s+|\n+/)) {
    const t = sent.replace(/\s+/g, " ").trim();
    if (t.length >= 15 && re.test(t)) return t;
  }
  return null;
}
function prRef(p) { return p.repo === repo ? `#${p.number}` : `${p.repo}#${p.number}`; }
function budget(author, ownerAuthor) { return author && author === ownerAuthor ? 1200 : 400; }
function dayOf(iso) {
  if (!TZ) return iso.slice(0, 10);
  return localParts(iso).date;
}
function localParts(iso) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
function localTime(iso) { const p = localParts(iso); return `${p.date} ${p.time}`; }
function fmtAt(iso) { return `${iso.slice(0, 16).replace("T", " ")} UTC${TZ ? ` (${localTime(iso)} ${TZ})` : ""}`; }
function trim(s) { return s.length > BODY_CHARS ? `${s.slice(0, BODY_CHARS)}\n\n…[${s.length - BODY_CHARS} more chars in dossier.json]` : s || "_(empty)_"; }
function oneLine(s, n) { const t = s.replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n)}…` : t; }
function esc(s) { return String(s).replace(/\|/g, "\\|"); }
function bump(m, k, n) { m.set(k, (m.get(k) ?? 0) + n); }
function top(m, n) { return [...m].sort((a, b) => b[1] - a[1]).slice(0, n); }
// Several plain words search as one phrase; GitHub otherwise matches each word anywhere in the PR.
// Terms that already use search syntax (quotes, qualifiers, OR/NOT, -exclusions) pass through.
function priorQuery(v) {
  const t = String(v).trim();
  if (!/\s/.test(t) || /["():]|(^|\s)-\S|\b(OR|AND|NOT)\b/.test(t)) return t;
  return `"${t}"`;
}
function list(v) { return v && v !== true ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []; }
function guessExt(u) { const e = extname(new URL(u).pathname).toLowerCase(); return /^\.(png|jpe?g|gif|webp|svg|mp4|webm)$/.test(e) ? e : ".bin"; }
function extFromType(t = "") { return { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg", "video/mp4": ".mp4", "video/webm": ".webm" }[t?.split(";")[0]]; }
function sh(cmd, a) { return execFileSync(cmd, a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); }
function ghJson(a) { return JSON.parse(sh("gh", a)); }
function ghJsonSafe(a) {
  try {
    const out = sh("gh", a).trim();
    if (!out) return null;
    try { return JSON.parse(out); } catch { /* fall through to the --paginate form */ }
    // --paginate concatenates JSON arrays: "][" → ","
    return JSON.parse(out.replace(/\]\s*\[/g, ","));
  } catch { return null; }
}
function die(msg) { console.error(`gather: ${msg}`); process.exit(2); }
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) die(`unexpected argument ${a}`);
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) o[key] = true;
    else { o[key] = next; i++; }
  }
  return o;
}
