// Checks for workdir.mjs. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "../../scripts/workdir.mjs");
const exec = (env, ...args) => {
  const base = { ...process.env };
  delete base.BUILDNOTES_DIR;
  delete base.BUILD_STORY_DIR;
  return spawnSync("node", [script, ...args], { encoding: "utf8", cwd: tmpdir(), env: { ...base, ...env } });
};
const run = (root, ...args) => exec({ BUILDNOTES_DIR: root }, ...args);

test("a slug makes a dated folder; a flag prints usage and makes nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "workdir-"));
  const help = run(root, "--help");
  assert.equal(help.status, 0);
  assert.match(help.stderr, /usage: workdir\.mjs <slug>/);
  assert.deepEqual(readdirSync(root), []);
  const made = run(root, "preview-links");
  assert.equal(made.status, 0);
  assert.match(made.stdout.trim(), /\/\d{4}-\d{2}-\d{2}-preview-links$/);
  assert.ok(existsSync(made.stdout.trim()));
});

test("BUILD_STORY_DIR is read when BUILDNOTES_DIR is unset, and loses to it when both are set", () => {
  const legacy = mkdtempSync(join(tmpdir(), "workdir-old-"));
  const fresh = mkdtempSync(join(tmpdir(), "workdir-new-"));
  assert.ok(exec({ BUILD_STORY_DIR: legacy }, "a").stdout.startsWith(legacy));
  assert.ok(exec({ BUILD_STORY_DIR: legacy, BUILDNOTES_DIR: fresh }, "b").stdout.startsWith(fresh));
});

test("the default is ~/.buildnotes, but an existing ~/.build-stories is kept with a note until it moves", () => {
  const home = mkdtempSync(join(tmpdir(), "workdir-home-"));
  mkdirSync(join(home, ".build-stories"));
  const old = exec({ HOME: home }, "a");
  assert.ok(old.stdout.startsWith(join(home, ".build-stories")));
  assert.match(old.stderr, /mv .*\.build-stories .*\.buildnotes/);
  mkdirSync(join(home, ".buildnotes"));
  const moved = exec({ HOME: home }, "b");
  assert.ok(moved.stdout.startsWith(join(home, ".buildnotes")));
  assert.doesNotMatch(moved.stderr, /build-stories/);
  const empty = mkdtempSync(join(tmpdir(), "workdir-home-"));
  assert.ok(exec({ HOME: empty }, "c").stdout.startsWith(join(empty, ".buildnotes")));
});
