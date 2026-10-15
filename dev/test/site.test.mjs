// Checks for the website build (site/build.mjs). Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../../site/build.mjs";
import { drawing, NAMES } from "../../site/iso.mjs";

test("the site builds: markers filled, files copied, every command copyable", () => {
  const out = mkdtempSync(join(tmpdir(), "buildnotes-site-"));
  try {
    const { html, files } = build({ out });
    assert.doesNotMatch(html, /<!-- (figure|iso) |\/\* template: |\/\/ template: /);
    // the two live figures, with the template's CSS and script to drive them
    assert.match(html, /class="keyed anatomy anatomy-screenshot"/);
    assert.match(html, /class="keyed anatomy anatomy-iso"/);
    assert.match(html, /\.anatomy-iso:has\(\.apart:checked\)/);
    assert.match(html, /for \(const fig of document\.querySelectorAll\("\.keyed"\)\)/);
    assert.doesNotMatch(html, /zoom-open/, "the expand script stays out; the site has no CSS for it");
    // every example command sits in a row with a copy button
    const rows = html.match(/<div class="cmd[^"]*"><code data-copy>/g) ?? [];
    assert.equal(rows.length, (html.match(/<button class="copy"/g) ?? []).length);
    assert.ok(rows.length >= 8);
    assert.match(html, /<code data-copy>npx skills add buildinternet\/buildnotes<\/code>/);
    // local references point at copied files, and .github/assets is published as assets/
    for (const f of files) assert.ok(existsSync(join(out, f)), f);
    assert.ok(files.includes("examples/walkthrough-videos/post.html"));
    assert.ok(files.includes("assets/digest-keyed.webp"));
    assert.doesNotMatch(html, /\.github\//);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("iso drawings: every name draws; only the pipeline is announced", () => {
  for (const name of NAMES) {
    const svg = drawing(name);
    assert.match(svg, /^<svg class="iso" viewBox="[-\d. ]+"/);
    assert.match(svg, name === "pipeline" ? /role="img" aria-label="/ : /aria-hidden="true"/);
    assert.doesNotMatch(svg, /NaN/);
  }
  assert.match(drawing("pipeline"), /<circle class="dot" cx="0" cy="0"/);
  assert.throws(() => drawing("nope"), /unknown drawing "nope"/);
});
