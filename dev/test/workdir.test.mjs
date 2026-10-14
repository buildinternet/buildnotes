// Checks for workdir.mjs. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "../../scripts/workdir.mjs");
const run = (root, ...args) => spawnSync("node", [script, ...args], { encoding: "utf8", cwd: tmpdir(), env: { ...process.env, BUILD_STORY_DIR: root } });

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
