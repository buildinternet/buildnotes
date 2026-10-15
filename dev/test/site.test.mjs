// Checks for the website build (site/build.mjs). Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, SHARE, EXAMPLES, wrapPost } from "../../site/build.mjs";
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
    assert.ok(files.includes("assets/digest-keyed.webp"));
    assert.doesNotMatch(html, /\.github\//);
    assert.match(html, /<html lang="en" data-theme="light">/);
    // every example is served with its video, and its post is wrapped in a document and the site shell
    assert.equal(EXAMPLES.length, 3);
    for (const ex of EXAMPLES) {
      assert.ok(files.includes(`examples/${ex.slug}/post.html`), ex.slug);
      assert.ok(files.includes(`examples/${ex.slug}/motion.mp4`), ex.slug);
      const post = readFileSync(join(out, `examples/${ex.slug}/post.html`), "utf8");
      assert.match(post, /^<!doctype html>\n<html lang="en" data-theme="light">\n<head>\n<meta charset="utf-8">/);
      assert.match(post, /<title>[^<]+ · buildnotes example<\/title>/);
      assert.equal(post.match(/<title>/g).length, 1);
      assert.match(post, /<header class="site-bar site-top">/);
      assert.match(post, /<video src="motion\.mp4" controls/);
      for (const o of EXAMPLES) if (o !== ex) assert.match(post, new RegExp(`href="\\.\\./${o.slug}/post\\.html"`), `${ex.slug} links ${o.slug}`);
      assert.doesNotMatch(post, /href="\.\.\/${ex.slug}\//);
    }
    assert.throws(() => wrapPost("nope", "<style></style>"), /not in EXAMPLES/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("link previews: description, Open Graph and Twitter tags, favicon", () => {
  const out = mkdtempSync(join(tmpdir(), "buildnotes-site-"));
  try {
    const meta = (html, attr, key) => html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
    // without --url: no canonical link, and the image is the committed one on GitHub
    let { html, files } = build({ out });
    assert.equal((html.match(/<title>([^<]*)<\/title>/) ?? [])[1], SHARE.title);
    assert.ok(meta(html, "name", "description")?.length > 50);
    for (const k of ["og:type", "og:site_name", "og:title", "og:description", "og:image", "og:image:alt", "og:image:width", "og:image:height"]) {
      assert.ok(meta(html, "property", k), k);
    }
    for (const k of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) assert.ok(meta(html, "name", k), k);
    assert.equal(meta(html, "name", "twitter:card"), "summary_large_image");
    assert.equal(meta(html, "property", "og:image"), SHARE.fallback);
    assert.doesNotMatch(html, /rel="canonical"|og:url/);
    assert.match(html, /<link rel="icon" href="assets\/favicon\.svg" type="image\/svg\+xml">/);
    assert.ok(files.includes("assets/og.png") && files.includes("assets/favicon.svg"));
    assert.ok(existsSync(join(out, "assets/og.png")));
    // with --url: canonical, og:url, and an absolute image inside the site
    ({ html } = build({ out, url: "https://example.com/buildnotes" }));
    assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/buildnotes\/">/);
    assert.equal(meta(html, "property", "og:url"), "https://example.com/buildnotes/");
    assert.equal(meta(html, "property", "og:image"), "https://example.com/buildnotes/assets/og.png");
    assert.equal(meta(html, "name", "twitter:image"), "https://example.com/buildnotes/assets/og.png");
    assert.throws(() => build({ out, url: "example.com" }), /must start with http/);
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
