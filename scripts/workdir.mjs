#!/usr/bin/env node
// workdir.mjs: make a work dir for a build story, outside any repo so it survives worktrees.
//
// Usage: node workdir.mjs <slug>   → prints e.g. ~/.build-stories/releases/2026-10-12-weekly-digests
//
// The root is $BUILD_STORY_DIR, or ~/.build-stories by default. Runs are grouped by repo name
// (the main checkout's folder name, so every worktree of a repo shares one folder).

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const slug = process.argv[2];
if (!slug) { console.error("usage: workdir.mjs <slug>"); process.exit(2); }
const name = /^\d{4}-\d{2}-\d{2}-/.test(slug) ? slug : `${new Date().toISOString().slice(0, 10)}-${slug}`;
const root = process.env.BUILD_STORY_DIR || join(homedir(), ".build-stories");
let repo = "no-repo";
try {
  repo = basename(dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()));
} catch { /* not in a repo */ }
const dir = join(root, repo, name);
mkdirSync(dir, { recursive: true });
console.log(dir);
