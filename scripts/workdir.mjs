#!/usr/bin/env node
// workdir.mjs: pick (and create) a work dir for a build story that survives git worktrees.
//
// Usage: node workdir.mjs <slug>        → prints the path, e.g. <main checkout>/.context/build-stories/2026-10-12-weekly-digests
//
// Worktrees come and go, so the work dir lives in the repo's MAIN checkout (found through git's
// common dir), under .context/build-stories/, when git ignores that path there. Otherwise it
// falls back to ~/.build-stories/<repo>/, so a run never lands in files git would commit.

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const slug = process.argv[2];
if (!slug) { console.error("usage: workdir.mjs <slug>"); process.exit(2); }
const name = /^\d{4}-\d{2}-\d{2}-/.test(slug) ? slug : `${new Date().toISOString().slice(0, 10)}-${slug}`;
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

let dir;
try {
  const main = dirname(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
  let ignored = false;
  try { git("-C", main, "check-ignore", "-q", ".context/build-stories/x"); ignored = true; } catch { /* not ignored */ }
  dir = ignored ? join(main, ".context", "build-stories", name) : join(homedir(), ".build-stories", basename(main), name);
} catch {
  dir = join(homedir(), ".build-stories", "no-repo", name);
}
mkdirSync(dir, { recursive: true });
console.log(dir);
