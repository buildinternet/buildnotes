// gather.mjs parsing and assembly from recorded gh and git fixtures. No network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gather } from "../../scripts/gather.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const script = join(root, "scripts/gather.mjs");
const ghFx = JSON.parse(readFileSync(new URL("./fixtures/gather/gh.json", import.meta.url), "utf8"));
const gitFx = JSON.parse(readFileSync(new URL("./fixtures/gather/git.json", import.meta.url), "utf8"));

let tail = Promise.resolve();
const serial = (fn) => {
  const run = tail.then(fn);
  tail = run.then(() => {}, () => {});
  return run;
};

function gitCommand(args) {
  if (args[0] === "ls-files") return gitFx.lsFiles;
  if (args[0] === "ls-tree") return gitFx.lsTree;
  if (args[0] === "log" && args.includes("--numstat")) return gitFx.commits;
  if (args[0] === "log" && args.includes("--format=") && args.includes("2000")) return gitFx.renames;
  if (args[0] === "log" && args[1] === "-1") {
    const path = args.at(-1);
    if (!(path in gitFx.last)) throw new Error(`no last-changed fixture for ${path}`);
    return gitFx.last[path];
  }
  if (args[0] === "rev-list" && args[1] === "-1") return gitFx.rev;
  if (args[0] === "cat-file") {
    const spec = args[2];
    if (gitFx.catExists.includes(spec)) return "";
    if (gitFx.catMissing.includes(spec)) {
      const err = new Error(`missing ${spec}`);
      err.status = 1;
      throw err;
    }
    throw new Error(`unexpected cat-file ${spec}`);
  }
  if (args[0] === "rev-list" && args[1] === "--count") {
    const path = args.at(-1);
    if (!(path in gitFx.busy)) throw new Error(`no busy-count fixture for ${path}`);
    return gitFx.busy[path];
  }
  if (args[0] === "log" && args.includes("600")) return gitFx.priorLog;
  throw new Error(`unexpected git ${args.join(" ")}`);
}

function ghCommand(args, { visibility, failVisibility }) {
  if (args[0] === "repo" && args[1] === "view") {
    if (failVisibility) throw new Error("visibility lookup failed");
    return visibility;
  }
  if (args[0] === "issue" && args[1] === "view") {
    const issue = ghFx.issues[args[2]];
    if (!issue) throw new Error(`issue ${args[2]} is not an issue`);
    return JSON.stringify(issue);
  }
  if (args[0] === "api" && args[1].includes("/sub_issues")) {
    const n = args[1].match(/issues\/(\d+)/)[1];
    return ghFx.subIssues[n] ?? "[]";
  }
  if (args[0] === "api" && /\/pulls\/\d+\/comments$/.test(args[1])) {
    const key = args[1].replace(/^repos\//, "").replace(/\/pulls\//, "#").replace(/\/comments$/, "");
    if (!(key in ghFx.comments)) throw new Error(`no comments fixture for ${key}`);
    return JSON.stringify(ghFx.comments[key]);
  }
  if (args[0] === "api") {
    const key = args[1].replace(/^repos\//, "").replace(/\/issues\//, "#");
    if (!ghFx.cross[key]) throw new Error(`no cross-repo fixture for ${key}`);
    return JSON.stringify(ghFx.cross[key]);
  }
  if (args[0] === "pr" && args[1] === "view") {
    const key = `${args[args.indexOf("-R") + 1]}#${args[2]}`;
    if (key === "other/cli#8") throw new Error("fetch failed");
    if (!ghFx.prs[key]) throw new Error(`no PR fixture for ${key}`);
    return JSON.stringify(ghFx.prs[key]);
  }
  if (args[0] === "pr" && args[1] === "list") {
    const repo = args[args.indexOf("-R") + 1];
    const search = args[args.indexOf("--search") + 1];
    if (repo === "missing/repo") throw new Error("search failed");
    if (search.includes("merged:<")) return JSON.stringify(ghFx.prior);
    if (search.startsWith("merged:")) return JSON.stringify(ghFx.nearby);
    const json = args[args.indexOf("--json") + 1];
    const key = `${repo}|${search}|${json}`;
    if (!(key in ghFx.lists)) throw new Error(`no list fixture for ${key}`);
    return JSON.stringify(ghFx.lists[key]);
  }
  throw new Error(`unexpected gh ${args.join(" ")}`);
}

function fixtureCommand({ visibility = ghFx.visibility, failVisibility = false, calls = null } = {}) {
  return (cmd, args) => {
    if (calls) calls.push([cmd, ...args]);
    if (cmd === "git") return gitCommand(args);
    if (cmd === "gh") return ghCommand(args, { visibility, failVisibility });
    throw new Error(`unexpected command ${cmd}`);
  };
}

function searchArgs(calls) {
  return calls.filter((c) => c[0] === "gh" && c[1] === "pr" && c[2] === "list").map((c) => c[c.indexOf("--search") + 1]);
}

test("cli exits before git or gh when the arguments are incomplete", () => {
  const help = spawnSync(process.execPath, [script, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^gather\.mjs — build an evidence dossier/);
  assert.match(help.stdout, /--prior/);
  assert.equal(help.stderr, "");

  const missing = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /gather: missing --out/);

  const tz = spawnSync(process.execPath, [script, "--out", "x", "--repo", "acme/app", "--tz", "Not/AZone"], { encoding: "utf8" });
  assert.equal(tz.status, 2);
  assert.match(tz.stderr, /gather: unknown time zone Not\/AZone/);

  const stray = spawnSync(process.execPath, [script, "--out", "x", "nope"], { encoding: "utf8" });
  assert.equal(stray.status, 2);
  assert.match(stray.stderr, /gather: unexpected argument nope/);
});

test("assembles a dossier from gh and git fixtures", () => serial(async () => {
  const calls = [];
  const errors = [];
  const dir = mkdtempSync(join(tmpdir(), "gather-"));
  const orig = console.error;
  console.error = (...parts) => errors.push(parts.join(" "));
  let dossier;
  try {
    dossier = await gather([
      "--out", dir,
      "--repo", "acme/app",
      "--issue", "412",
      "--pr", "120,121",
      "--since", "2026-09-01",
      "--path", "src/limits",
      "--grep", "limit",
      "--prior", "rate limit",
      "--search", "rate limit",
      "--also-repo", "other/cli,missing/repo",
      "--tz", "America/New_York",
      "--window", "2",
      "--body-chars", "80",
    ], { command: fixtureCommand({ calls }) });
  } finally {
    console.error = orig;
  }

  assert.equal(dossier.repo, "acme/app");
  assert.equal(dossier.visibility, "public");
  assert.match(dossier.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(dossier.selectors.search, "rate limit");
  assert.equal(dossier.selectors.window, "2");
  assert.deepEqual(dossier.issues.map((i) => i.number), [412, 413, 414, 415]);
  assert.deepEqual(dossier.prs.map((p) => `${p.repo}#${p.number}`), ["acme/app#120", "acme/app#130", "acme/app#131", "other/cli#7"]);

  const issue412 = dossier.issues[0];
  assert.deepEqual(issue412.subIssues, [413, 414]);
  assert.deepEqual(issue412.labels, ["feature"]);
  assert.deepEqual(issue412.comments.map((c) => c.author), ["alice"]);
  assert.equal(dossier.issues[1].author, "alice");
  assert.deepEqual(dossier.issues[1].comments.map((c) => c.author), ["cursor"]);
  assert.equal(dossier.issues[1].body, "");

  const pr = dossier.prs[0];
  assert.equal(pr.author, "alice");
  assert.equal(pr.branch, "cursor/rate-limit");
  assert.deepEqual(pr.mergeCommit, { oid: "fedcba9876543210", short: "fedcba98" });
  assert.deepEqual(pr.closes, [415]);
  assert.deepEqual(pr.partOf, [412, 999]);
  assert.deepEqual(pr.coAuthors, ["Copilot", "Dana"]);
  assert.deepEqual(pr.commitAuthors, ["alice", "Dana"]);
  assert.deepEqual(pr.agentSignals, ["Cursor", "Claude Code", "Copilot"]);
  assert.deepEqual(pr.files.map((f) => f.path), ["src/quota/budget.js", "docs/limits.md", "CHANGELOG.md", "src/limits/budget.test.js"]);
  assert.match(pr.body, /The bucket refills once a second\./);
  assert.match(pr.body, /part of #412/);
  assert.match(pr.body, /\[details omitted\]/);
  assert.match(pr.body, /We went with a token bucket/);
  assert.doesNotMatch(pr.body, /bot summary|Generated with Claude Code|Open in Cursor|secret log|update the docs/);
  assert.deepEqual(pr.images, [
    { url: "https://github.com/user-attachments/assets/abc-123", alt: "diagram" },
    { url: "https://example.com/shot.png", alt: "the shot" },
    { url: "https://github.com/user-attachments/assets/bare-one", alt: "" },
  ]);
  assert.deepEqual(pr.conversation.map((c) => c.author), ["carol", "alice"]);
  assert.deepEqual(pr.reviews.map((r) => [r.author, r.state]), [["dana", "COMMENTED"], ["alice", "APPROVED"]]);
  assert.deepEqual(pr.threads.map((t) => ({ path: t.path, line: t.line, authors: t.messages.map((m) => m.author), bots: t.messages.map((m) => m.bot) })), [
    { path: "src/quota/budget.js", line: 42, authors: ["bob", "alice"], bots: [false, false] },
    { path: "src/quota/budget.js", line: 7, authors: ["coderabbitai[bot]"], bots: [true] },
  ]);
  assert.deepEqual(pr.commits.map((c) => c.sha), ["01234567", "abcdef12"]);

  assert.deepEqual(dossier.commits.map((c) => c.sha), ["ab12cd34"]);
  assert.equal(dossier.commits[0].author, "Erin");
  assert.equal(dossier.commits[0].pr, null);
  assert.equal(dossier.commits[0].body, "The limit was too low.");
  assert.deepEqual(dossier.commits[0].files, [
    { path: "src/limits/budget.js", additions: 1, deletions: 2 },
    { path: "bin.dat", additions: 0, deletions: 0 },
  ]);

  const s = dossier.summary;
  assert.equal(s.first, "2026-08-01");
  assert.equal(s.last, "2026-09-12");
  assert.equal(s.days, 43);
  assert.equal(s.issues, 4);
  assert.equal(s.prs, 4);
  assert.equal(s.branchCommits, 2);
  assert.equal(s.looseCommits, 1);
  assert.equal(s.additions, 121);
  assert.equal(s.deletions, 44);
  assert.equal(s.filesTouched, 6);
  assert.equal(s.reviewThreadsHuman, 1);
  assert.equal(s.reviewThreadsBot, 1);
  assert.equal(s.feedbackComments, 3);
  assert.equal(s.images, 3);
  assert.deepEqual(s.authors, ["alice", "bob", "carol", "dave", "Erin"]);
  assert.deepEqual(s.coAuthors, ["Copilot", "Dana"]);
  assert.deepEqual(s.agentSignals, [
    { name: "Cursor", prs: 1 },
    { name: "Claude Code", prs: 1 },
    { name: "Copilot", prs: 1 },
  ]);
  assert.deepEqual(s.hotFiles, [
    ["src/limits/budget.js", 93],
    ["src/limits/budget.test.js", 30],
    ["docs/limits.md", 22],
    ["other/cli:cli/limit.js", 11],
    ["CHANGELOG.md", 6],
    ["bin.dat", 0],
  ]);
  assert.deepEqual(s.hotFilesLastChanged["src/limits/budget.js"], { sha: "a1b2c3d4", date: "2026-09-12", subject: "cap the burst" });
  assert.equal(s.hotFilesLastChanged["bin.dat"], null);
  assert.equal(s.hotFilesLastChanged["other/cli:cli/limit.js"], null);
  assert.deepEqual(s.hotAreas[0], ["src/limits", 123]);
  assert.deepEqual(s.docsTouched, ["docs/limits.md"]);

  assert.deepEqual(dossier.feedbackSignals.map(({ ref, where, author, text }) => ({ ref, where, author, text })), [
    { ref: "#120", where: "body", author: "alice", text: "The reviewer found a race in the refill path." },
    { ref: "#120", where: "comment", author: "carol", text: "I caught a bug when the bucket is empty." },
    { ref: "#120", where: "review", author: "dana", text: "The race is reason enough." },
    { ref: "#412", where: "comment", author: "alice", text: "The reviewer found a race in the refill." },
  ]);

  const story = dossier.storyCandidates;
  assert.equal(story.decisions.length, 1);
  assert.equal(story.decisions[0].author, "dana");
  assert.match(story.decisions[0].text, /fixed window/);
  assert.deepEqual(story.decisionSections.map((d) => d.heading), ["Decisions", "Open questions"]);
  assert.match(story.decisionSections[0].preview, /token bucket/);
  assert.equal(story.decisionSections[0].lines, 1);
  assert.deepEqual(story.bursts, [{ date: "2026-09-10", count: 3, refs: ["#120", "#130", "#131"] }]);
  assert.deepEqual(story.followUpClusters, [{ at: "2026-09-01T15:00:00Z", refs: ["#412", "#413", "#414"] }]);
  assert.deepEqual(story.reverts, [
    { ref: "#120 `abcdef12`", title: "Revert the token bucket" },
    { ref: "`ab12cd34`", title: "Revert the limit bump" },
  ]);

  assert.deepEqual(dossier.crossRepo.map((x) => ({ repo: x.repo, number: x.number, kind: x.kind, state: x.state, mentionedBy: x.mentionedBy })), [
    { repo: "widgets/lib", number: 4, kind: "pr", state: "merged", mentionedBy: ["#412", "#120"] },
    { repo: "elsewhere/docs", number: 9, kind: "issue", state: "open", mentionedBy: ["other/cli#7"] },
  ]);

  assert.equal(dossier.priorWork.before, "2026-08-01");
  assert.deepEqual(dossier.priorWork.notes, ["CHANGELOG.md"]);
  assert.deepEqual(dossier.priorWork.noteDirs, ["site/changelog/"]);
  assert.deepEqual(dossier.priorWork.announced, []);
  assert.ok(!errors.some((e) => /owner\/repo#123/.test(e)), "a placeholder owner/repo#123 is not looked up");
  assert.deepEqual(dossier.priorWork.files, ["src/quota/budget.js", "docs/limits.md"]);
  assert.deepEqual(dossier.priorWork.prs, [{ number: 40, title: "feat(limits): first token bucket", date: "2026-07-15" }]);
  assert.deepEqual(dossier.priorWork.changes, [{
    sha: "eee5555",
    date: "2026-07-20",
    subject: "feat: share the limit across both files",
    overlap: 2,
  }]);

  assert.deepEqual(dossier.nearbyWork, {
    from: "2026-07-30",
    to: "2026-09-13",
    groups: [
      { area: "limits", prs: [{ number: 200, title: "feat(limits): export the bucket", date: "2026-09-10", shared: 2 }] },
      { area: "docs", prs: [{ number: 203, title: "docs: fix a typo", date: "2026-09-09", shared: 0 }] },
      { area: "other", prs: [{ number: 204, title: "Fix the header layout", date: "2026-09-09", shared: 0 }] },
    ],
  });

  const merged = dossier.timeline.find((e) => e.kind === "pr-merged" && e.ref === "#120");
  assert.equal(merged.at, "2026-09-10T15:00:00Z");
  assert.equal(merged.size, "+100 \u221240");
  assert.deepEqual(dossier.timeline.map((e) => e.at), [...dossier.timeline.map((e) => e.at)].sort());

  const md = readFileSync(join(dir, "dossier.md"), "utf8");
  const json = readFileSync(join(dir, "dossier.json"), "utf8");
  assert.equal(json, JSON.stringify(dossier, null, 2));
  assert.match(json, /token bucket/);
  assert.doesNotMatch(json, /secret log/);
  assert.match(md, /# Dossier — acme\/app/);
  assert.match(md, /Repo is \*\*public\*\*/);
  assert.match(md, /when \(America\/New_York\)/);
  assert.match(md, /\| 2026-09-10 15:00 \| 2026-09-10 11:00 \| pr-merged \+100 \u221240 \| #120 \|/);
  assert.match(md, /more chars in dossier\.json/);
  assert.match(md, /Sub-issues: #413, #414/);
  assert.match(md, /decision\? #120 \*\*dana\*\*/);
  assert.match(md, /burst: 2026-09-10 — 3 merges \(#120, #130, #131\)/);
  assert.match(md, /follow-up cluster: 2026-09-01 15:00 UTC \(2026-09-01 11:00 America\/New_York\)/);
  assert.match(md, /★2 #200/);
  assert.match(md, /`CHANGELOG\.md`/);
  assert.match(md, /#40 /);
  assert.match(md, /`eee5555`/);
  assert.match(md, /last changed `a1b2c3d4` 2026-09-12 cap the burst/);
  assert.match(md, /`bin\.dat` \(0\) — not at this path on HEAD/);
  assert.match(md, /Loose commits/);
  assert.match(md, /`ab12cd34`/);
  assert.match(md, /part of #412, #999/);
  assert.doesNotMatch(md, /## Issue #999|## PR #121\b|ef56ab78|#998\b|chore\(release\): version packages/);
  assert.match(errors.join("\n"), /also-repo missing\/repo: search failed, skipped/);
  assert.match(errors.join("\n"), /pr other\/cli#8: fetch failed, skipped/);
  assert.match(errors.join("\n"), /cross-repo nope\/thing#1: lookup failed, skipped/);
  assert.match(errors.join("\n"), /dossier: 4 issues · 4 PRs · 1 loose commits · 3 images/);

  const searches = searchArgs(calls);
  assert.deepEqual(searches.filter((s) => s.includes("merged:<") || s.startsWith("merged:")), [
    '"rate limit" merged:<2026-08-01',
    "merged:2026-07-30..2026-09-13",
  ]);
  assert.ok(calls.some((c) => c[0] === "git" && c.includes("--since=2026-09-01") && c.includes("--grep=limit") && c.includes("-i") && c.includes("--numstat") && c.at(-2) === "--" && c.at(-1) === "src/limits"));
  assert.ok(calls.some((c) => c[0] === "git" && c[1] === "rev-list" && c.includes("--before=2026-08-01T12:00:00Z")));
  assert.ok(calls.some((c) => c[0] === "git" && c[1] === "rev-list" && c[2] === "--count" && c.includes("--since=2026-04-03") && c.includes("src/quota/budget.js")));
  assert.ok(calls.some((c) => c[0] === "git" && c.includes("600") && c.includes("src/quota/budget.js") && c.includes("docs/limits.md")));
  assert.ok(calls.some((c) => c[0] === "gh" && c[1] === "api" && c[2] === "repos/acme/app/issues/412/sub_issues"));
  assert.equal(calls.some((c) => c[0] === "gh" && c.includes("nameWithOwner")), false);
  assert.equal(calls.some((c) => c[0] === "gh" && c[1] === "auth"), false);
  const viewed = calls.filter((c) => c[0] === "gh" && c[1] === "pr" && c[2] === "view").map((c) => `${c[c.indexOf("-R") + 1]}#${c[3]}`);
  assert.deepEqual(viewed, ["acme/app#120", "acme/app#121", "acme/app#130", "acme/app#131", "other/cli#7", "other/cli#8"]);
  const commented = calls.filter((c) => c[0] === "gh" && c[1] === "api" && String(c[2]).endsWith("/comments")).map((c) => c[2]);
  assert.deepEqual(commented, [
    "repos/acme/app/pulls/120/comments",
    "repos/acme/app/pulls/130/comments",
    "repos/acme/app/pulls/131/comments",
    "repos/other/cli/pulls/7/comments",
  ]);
}));

test("a release PR stays when asked, a zero window skips nearby work, and a one-word --prior is not quoted", () => serial(async () => {
  const calls = [];
  const dir = mkdtempSync(join(tmpdir(), "gather-bot-"));
  const dossier = await gather([
    "--out", dir,
    "--repo", "acme/app",
    "--pr", "121",
    "--keep-bot-prs",
    "--window", "0",
    "--prior", "limit",
  ], { command: fixtureCommand({ visibility: "private\n", calls }) });

  assert.equal(dossier.visibility, "private");
  assert.deepEqual(dossier.prs.map((p) => p.number), [121]);
  assert.equal(dossier.prs[0].title, "chore(release): version packages");
  assert.equal(dossier.selectors["keep-bot-prs"], true);
  assert.equal(dossier.selectors.window, "0");
  assert.deepEqual(dossier.nearbyWork, { from: null, to: null, groups: [] });
  assert.equal(dossier.priorWork.before, "2026-09-08");
  assert.deepEqual(searchArgs(calls), ["limit merged:<2026-09-08"]);
  const md = readFileSync(join(dir, "dossier.md"), "utf8");
  assert.match(md, /Repo is \*\*private\*\*: the post must not link/);
  assert.match(md, /_\(empty\)_/);
  assert.match(md, /\| when \(UTC\) \| what \| ref \| title \|/);
}));

test("search syntax in --prior passes through, and a failed visibility lookup is unknown", () => serial(async () => {
  const calls = [];
  const dir = mkdtempSync(join(tmpdir(), "gather-prior-"));
  const dossier = await gather([
    "--out", dir,
    "--repo", "acme/app",
    "--pr", "121",
    "--keep-bot-prs",
    "--window", "0",
    "--prior", "label:bug OR limit",
  ], { command: fixtureCommand({ failVisibility: true, calls }) });

  assert.equal(dossier.visibility, "unknown");
  assert.deepEqual(searchArgs(calls), ["label:bug OR limit merged:<2026-09-08"]);
  const md = readFileSync(join(dir, "dossier.md"), "utf8");
  assert.match(md, /Repo is \*\*unknown\*\*: the post must not link/);
}));
