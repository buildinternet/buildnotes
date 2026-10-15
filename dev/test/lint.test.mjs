// lint.mjs on the template with faults planted in its rendered components.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const skill = join(root, "skills/buildnotes");
const lint = (file, ...args) => {
  try { return execFileSync("node", [join(skill, "scripts/lint.mjs"), file, ...args], { encoding: "utf8" }); } catch (err) { return err.stdout; }
};

test("component checks fire on planted faults, and only then", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-"));
  cpSync(join(skill, "assets/specs"), join(dir, "specs"), { recursive: true });
  const clean = readFileSync(join(skill, "assets/template.html"), "utf8");
  writeFileSync(join(dir, "clean.html"), clean);
  const ok = lint(join(dir, "clean.html"), "--offline");
  assert.doesNotMatch(ok, /needs both drawings|aren't to scale|without data-label|names a commit or PR|changed since|keyed "|findings;|margin note of|one-line command/);
  assert.match(ok, /still point at the template's example specs/);

  writeFileSync(join(dir, "bad.html"), clean
    .replace('<svg class="v"', '<svg class="x"')
    .replace('style="--v:0.148"', 'style="--v:0.5"')
    .replace('data-label="Why"', "")
    .replace('<span class="tag">Before · first run</span>', '<span class="tag">Before · PR #120</span>')
    .replace(/<li data-k="3">[\s\S]*?<\/li>/, "")
    .replace('style="--x:86%; --y:40%"', 'style="--x:86%"')
    .replace('<aside class="finding"', '<aside class="finding" aria-label="Finding"><p>x</p></aside>\n    <aside class="finding"')
    .replace("doesn't serve the headline.</span>", `doesn't serve the headline, ${"and more words ".repeat(10)}.</span>`)
    .replace('<div class="cmd"><code>node scripts/gather.mjs', '<pre><code>node scripts/gather.mjs').replace('"rate limit"</code></div>', '"rate limit"</code></pre>'));
  writeFileSync(join(dir, "specs/bars-budget.json"), readFileSync(join(dir, "specs/bars-budget.json"), "utf8") + "\n");
  const bad = lint(join(dir, "bad.html"), "--offline");
  for (const re of [/needs both drawings/, /aren't to scale/, /1 cells without data-label/, /"Before · PR #120" names a commit or PR/, /bars-budget\.json: spec changed since the last render/,
    /hotspot 3 has no legend entry/, /hotspot 2 needs --x and --y/, /c1: 2 findings/, /margin note of \d+ words/, /one-line command in a bare <pre> \("node scripts\/gather\.mjs/]) assert.match(bad, re);
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
  const run = (f) => new Promise((done) => execFile("node", [join(skill, "scripts/lint.mjs"), join(dir, f)], { encoding: "utf8" }, (err, stdout) => done({ code: err?.code ?? 0, out: stdout })));
  const [ok, bad] = await Promise.all([run("ok.html"), run("bad.html")]);
  server.close();
  assert.match(ok.out, /Links: all 1 open/);
  assert.match(bad.out, /✗ link doesn't open \(404\): .*\/collections\/guessed/);
  assert.equal(bad.code, 1);
});

test("--product flags self-naming in the title and headings", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-product-"));
  const page = (h1, h2) => `<article class="post"><header class="mast"><h1>${h1}</h1><p class="dek">Acme now writes to you when a release matches.</p></header><section class="ch" id="c1"><h2><span class="n">01</span>${h2}</h2><p>Acme reads each release. It sends one alert.</p></section></article>`;
  writeFileSync(join(dir, "self.html"), page("Tell Acme what you care about", "How Acme matches"));
  writeFileSync(join(dir, "clean.html"), page("Write a sentence, get the releases that match it", "One call per release"));
  const self = lint(join(dir, "self.html"), "--product", "Acme", "--offline");
  assert.match(self, /! "Acme" in the title or a heading: "Tell Acme what you care about" · "How Acme matches"/);
  const clean = lint(join(dir, "clean.html"), "--product", "Acme", "--offline");
  assert.match(clean, /Product name "Acme": 2 in the prose, none in the title or headings\./);
  assert.doesNotMatch(clean, /in the title or a heading:/);
});

test("headings, grading phrases, item-by-item narration and the product as subject", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-craft-"));
  const page = `<article class="post"><header class="mast"><h1>Write a sentence, get the matches</h1></header>
<section class="ch" id="c1"><h2><span class="n">01</span>Overview</h2><p>Acme now scores each release. The same PR also adds a threshold.</p></section>
<section class="ch" id="c2"><h2><span class="n">02</span>The <code>matchAlerts()</code> loop</h2><p>We are doubling down on alerts. Stay tuned.</p></section></article>`;
  writeFileSync(join(dir, "p.html"), page);
  const out = lint(join(dir, "p.html"), "--product", "Acme", "--offline");
  assert.match(out, /heading names the slot, not the claim: "Overview"/);
  assert.match(out, /heading carries a code name or version: "The matchAlerts\(\) loop"/);
  assert.match(out, /narrates the record item by item: The same PR also adds/);
  assert.match(out, /✗ banned: doubling down, stay tuned/);
  assert.match(out, /"Acme" as the subject of a sentence \(1\)/);
  assert.doesNotMatch(lint(join(dir, "p.html"), "--flavor", "deep", "--offline"), /code name or version/);
});

test("a flow wider than the column needs a wide figure", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-wide-"));
  const flow = (fold) => `<div class="flow" data-fold="${fold}"><svg class="h"></svg><svg class="v"></svg></div>`;
  writeFileSync(join(dir, "p.html"), `<article class="post"><section class="ch" id="c1"><h2>One</h2><p>Text.</p><figure>${flow(46)}</figure><figure class="wide">${flow(52)}</figure><figure>${flow(38)}</figure></section></article>`);
  const out = lint(join(dir, "p.html"), "--offline");
  assert.equal(out.match(/a flow needs a wide figure/g)?.length, 1);
  assert.match(out, /data-fold 46/);
});

test("pull request as product vocabulary isn't process talk; the record still is", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-pr-"));
  const page = `<article class="post"><header class="mast"><h1>One page per pull request</h1></header>
<section class="ch" id="c1"><h2><span class="n">01</span>A page that fills itself</h2><p>Every pull request gets a live link. Asking for the same pull request again returns the same link. We already had a way to share a set of files: galleries, which you build by hand and put in order. The fix: a cache.</p></section>
<section class="ch" id="c2"><h2><span class="n">02</span>Paging</h2><p>The second pull request added paging. That landed in #412. The pull request was approved the same day.</p></section></article>`;
  writeFileSync(join(dir, "p.html"), page);
  const out = lint(join(dir, "p.html"), "--offline");
  assert.doesNotMatch(out, /process talk: Every pull request/);
  assert.doesNotMatch(out, /process talk: Asking for the same pull request/);
  assert.match(out, /process talk: The second pull request added paging/);
  assert.match(out, /process talk: That landed in #412/);
  assert.match(out, /process talk: The pull request was approved/);
  assert.match(out, /colon reveal\?: The fix: a cache/);
  assert.doesNotMatch(out, /colon reveal\?: We already had a way/);
});

test("a margin note mid-paragraph or mid-item is flagged; one at the end is not", () => {
  const dir = mkdtempSync(join(tmpdir(), "lint-"));
  const note = (s) => `<span class="sidenote" role="note">${s}</span>`;
  writeFileSync(join(dir, "p.html"), `<article class="post"><section class="ch" id="c1"><h2>A</h2>
    <p>One.${note("Mid.")} Two.</p><ul><li>Item.${note("Mid item.")} More.</li><li>Fine.${note("End.")}</li></ul><p>Ok.${note("End too.")}</p></section></article>`);
  const out = lint(join(dir, "p.html"), "--offline");
  assert.match(out, /margin note mid-paragraph \(before "Two\."\)/);
  assert.match(out, /margin note mid-paragraph \(before "More\."\)/);
  assert.equal((out.match(/mid-paragraph/g) ?? []).length, 2);
});
