// lint.mjs on the template with faults planted in its rendered components.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const lint = (file, ...args) => {
  try { return execFileSync("node", [join(root, "scripts/lint.mjs"), file, ...args], { encoding: "utf8" }); } catch (err) { return err.stdout; }
};

test("component checks fire on planted faults, and only then", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-"));
  cpSync(join(root, "assets/specs"), join(dir, "specs"), { recursive: true });
  const clean = readFileSync(join(root, "assets/template.html"), "utf8");
  writeFileSync(join(dir, "clean.html"), clean);
  const ok = lint(join(dir, "clean.html"), "--offline");
  assert.doesNotMatch(ok, /needs both drawings|aren't to scale|without data-label|names a commit or PR|changed since/);
  assert.match(ok, /still point at the template's example specs/);

  writeFileSync(join(dir, "bad.html"), clean
    .replace('<svg class="v"', '<svg class="x"')
    .replace('style="--v:0.148"', 'style="--v:0.5"')
    .replace('data-label="Why"', "")
    .replace('<span class="tag">Before · first run</span>', '<span class="tag">Before · PR #120</span>'));
  writeFileSync(join(dir, "specs/bars-budget.json"), readFileSync(join(dir, "specs/bars-budget.json"), "utf8") + "\n");
  const bad = lint(join(dir, "bad.html"), "--offline");
  for (const re of [/needs both drawings/, /aren't to scale/, /1 cells without data-label/, /"Before · PR #120" names a commit or PR/, /bars-budget\.json: spec changed since the last render/]) assert.match(bad, re);
});

test("a link that doesn't open is a hard failure", async () => {
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => { res.statusCode = req.url === "/ok" ? 200 : 404; res.end(); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const dir = mkdtempSync(join(tmpdir(), "lint-links-"));
  const page = (href) => `<article class="post"><section class="ch" id="c1"><h2>One</h2><p>Read <a href="${base}${href}">this</a>.</p></section></article>`;
  writeFileSync(join(dir, "ok.html"), page("/ok"));
  writeFileSync(join(dir, "bad.html"), page("/collections/guessed"));
  const run = (f) => new Promise((done) => execFile("node", [join(root, "scripts/lint.mjs"), join(dir, f)], { encoding: "utf8" }, (err, stdout) => done({ code: err?.code ?? 0, out: stdout })));
  const [ok, bad] = await Promise.all([run("ok.html"), run("bad.html")]);
  server.close();
  assert.match(ok.out, /Links: all 1 open/);
  assert.match(bad.out, /✗ link doesn't open \(404\): .*\/collections\/guessed/);
  assert.equal(bad.code, 1);
});
