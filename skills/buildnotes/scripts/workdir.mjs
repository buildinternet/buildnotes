#!/usr/bin/env node
// workdir.mjs: make a work dir for a build story, outside any repo so it survives worktrees.
//
// Usage: node workdir.mjs <slug>   → makes and prints e.g. ~/.buildnotes/<repo>/2026-10-12-preview-links
// A slug that already starts with a date is used as is.
//
// The root is $BUILDNOTES_DIR, or ~/.buildnotes by default. Runs are grouped by repo name
// (the main checkout's folder name, so every worktree of a repo shares one folder). The repo folder
// may hold house-style.md (the product's name, terms to use or avoid), settled by the author once and
// read on every run; its path is printed to stderr when it exists.
//
// Before the rename to buildnotes the root was $BUILD_STORY_DIR or ~/.build-stories. Both still work:
// the old variable is read when the new one is unset, and the old folder is kept (with a note on how
// to move it) while ~/.buildnotes doesn't exist, so house-style.md files aren't left behind.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const slug = process.argv[2];
if (!slug || slug.startsWith("-")) { console.error("usage: workdir.mjs <slug>   (makes and prints ~/.buildnotes/<repo>/<date>-<slug>)"); process.exit(slug === "--help" || slug === "-h" ? 0 : 2); }
const name = /^\d{4}-\d{2}-\d{2}-/.test(slug) ? slug : `${new Date().toISOString().slice(0, 10)}-${slug}`;
let root = process.env.BUILDNOTES_DIR || process.env.BUILD_STORY_DIR;
if (!root) {
  root = join(homedir(), ".buildnotes");
  const legacy = join(homedir(), ".build-stories");
  if (!existsSync(root) && existsSync(legacy)) {
    console.error(`work dirs: using the old ${legacy}; to move it, run: mv ${legacy} ${root}`);
    root = legacy;
  }
}
let repo = "no-repo";
try {
  repo = basename(dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()));
} catch { /* not in a repo */ }
const dir = join(root, repo, name);
mkdirSync(dir, { recursive: true });
const style = join(root, repo, "house-style.md");
console.error(existsSync(style) ? `house style: ${style} (read it before writing)` : `house style: none yet; when the author settles a name or term, start ${style}`);
console.log(dir);
