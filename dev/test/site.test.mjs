// Checks for the website build (site/build.mjs). Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, SHARE, EXAMPLES, wrapPost, footer, exampleCard } from "../../site/build.mjs";
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
    assert.ok(rows.length >= 6);
    assert.match(html, /<code data-copy>npx skills add buildinternet\/buildnotes<\/code>/);
    // local references point at copied files, and .github/assets is published as assets/
    for (const f of files) assert.ok(existsSync(join(out, f)), f);
    assert.ok(files.includes("assets/digest-apart.webp"));
    assert.doesNotMatch(html, /\.github\//);
    assert.match(html, /<html lang="en" data-theme="light">/);
    // every example is served as a folder with its video, its post wrapped in a document and the site shell
    assert.equal(EXAMPLES.length, 3);
    for (const ex of EXAMPLES) {
      assert.ok(files.includes(`examples/${ex.slug}/index.html`), ex.slug);
      assert.ok(files.includes(`examples/${ex.slug}/motion.mp4`), ex.slug);
      assert.match(html, new RegExp(`href="examples/${ex.slug}/"`), `home links ${ex.slug}`);
      const post = readFileSync(join(out, `examples/${ex.slug}/index.html`), "utf8");
      assert.match(post, /^<!doctype html>\n<html lang="en" data-theme="light">\n<head>\n<meta charset="utf-8">/);
      assert.match(post, /<title>[^<]+ · buildnotes example<\/title>/);
      assert.equal(post.match(/<title>/g).length, 1);
      assert.match(post, /<header class="site-bar site-top">/);
      // the video sits under the headline, and the rail lists the examples and every chapter
      assert.match(post, /<\/header>\s*<aside class="site-bar site-watch" id="site-video"[^>]*>\s*<video src="motion\.mp4"/);
      assert.match(post, new RegExp(`<a href="\\.\\./${ex.slug}/" aria-current="page">`), ex.slug);
      assert.equal((post.match(/<nav class="site-bar site-rail"[\s\S]*?<\/nav>/)?.[0].match(/href="#c\d+"/g) ?? []).length, (post.match(/<section class="ch" id="c\d+">/g) ?? []).length, ex.slug);
      for (const o of EXAMPLES) assert.match(post, new RegExp(`href="\\.\\./\\.\\./examples/${o.slug}/"`), `${ex.slug} links ${o.slug}`);
    }
    // an example with a deck serves it, with a doctype, and links it from its footer and the examples page
    const decks = EXAMPLES.filter((ex) => ex.deck);
    assert.ok(decks.length >= 1);
    for (const ex of decks) {
      assert.ok(files.includes(`examples/${ex.slug}/deck.pdf`), ex.slug);
      const deck = readFileSync(join(out, `examples/${ex.slug}/deck.html`), "utf8");
      assert.match(deck, /^<!doctype html>\n/);
      assert.match(deck, /"deck":true/);
      assert.match(readFileSync(join(out, `examples/${ex.slug}/index.html`), "utf8"), /href="deck\.html"/);
    }
    // the weekly-digests example is the field-notes page, the one with the card taken apart
    const digests = readFileSync(join(out, "examples/releases-weekly-digests/index.html"), "utf8");
    assert.match(digests, /class="keyed anatomy anatomy-iso"/);
    assert.throws(() => wrapPost("nope", "<style></style>"), /not in EXAMPLES/);
    // the examples page: one card per example, the home page's stylesheet, links one folder up
    const list = readFileSync(join(out, "examples/index.html"), "utf8");
    assert.ok(files.includes("examples/index.html"));
    assert.match(list, /<meta charset="utf-8">/);
    assert.doesNotMatch(list, /\/\* site: css \*\/|<!-- examples -->|<!-- footer -->|<!-- canonical -->|<!-- share -->/);
    assert.match(list, /<meta property="og:title" content="Examples · buildnotes">/);
    assert.match(list, /\.show-head \{/, "shares the home page's CSS");
    for (const ex of EXAMPLES) {
      assert.match(list, new RegExp(`<h2><a href="${ex.slug}/">`), ex.slug);
      assert.match(list, new RegExp(`href="${ex.slug}/#site-video"`), ex.slug);
      if (ex.deck) assert.match(list, new RegExp(`href="${ex.slug}/deck\\.html"`), ex.slug);
    }
    assert.match(list, /src="\.\.\/assets\/digest-apart\.webp"/);
    assert.match(list, /href="\.\.\/#install"/);
    // the footer, on both pages: columns and the maintained-by line
    for (const page of [html, list]) {
      assert.match(page, /<footer>\s*<div class="cols">/);
      assert.match(page, /By <a href="https:\/\/zachdunn\.com">Zach Dunn<\/a>/);
      assert.match(page, /href="https:\/\/releases\.sh"/);
      assert.match(page, /href="https:\/\/uploads\.sh"/);
    }
    assert.match(footer("../"), /href="\.\.\/examples\/"/);
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
    assert.match(readFileSync(join(out, "examples/index.html"), "utf8"), /<link rel="canonical" href="https:\/\/example\.com\/buildnotes\/examples\/">/);
    assert.equal(meta(html, "property", "og:url"), "https://example.com/buildnotes/");
    assert.equal(meta(html, "property", "og:image"), "https://example.com/buildnotes/assets/og.png");
    assert.equal(meta(html, "name", "twitter:image"), "https://example.com/buildnotes/assets/og.png");
    // every example page: its own tags from EXAMPLES, the image published under assets/
    const tags = (base) => {
      for (const ex of EXAMPLES) {
        const post = readFileSync(join(out, `examples/${ex.slug}/index.html`), "utf8");
        const image = base ? `${base}${exampleCard(ex)}` : `https://raw.githubusercontent.com/buildinternet/buildnotes/main/site/${exampleCard(ex)}`;
        assert.equal(meta(post, "name", "description"), ex.blurb, ex.slug);
        assert.equal(meta(post, "property", "og:type"), "article", ex.slug);
        assert.equal(meta(post, "property", "og:site_name"), "buildnotes", ex.slug);
        assert.equal(meta(post, "property", "og:title"), `${ex.product}: ${ex.name}`, ex.slug);
        assert.equal(meta(post, "name", "twitter:title"), `${ex.product}: ${ex.name}`, ex.slug);
        assert.equal(meta(post, "property", "og:description"), ex.blurb, ex.slug);
        assert.equal(meta(post, "name", "twitter:description"), ex.blurb, ex.slug);
        assert.equal(meta(post, "property", "og:image"), image, ex.slug);
        assert.equal(meta(post, "name", "twitter:image"), image, ex.slug);
        assert.ok(meta(post, "property", "og:image:alt"), ex.slug);
        assert.equal(meta(post, "name", "twitter:card"), "summary_large_image", ex.slug);
        if (base) {
          assert.match(post, new RegExp(`<link rel="canonical" href="${base}examples/${ex.slug}/">`), ex.slug);
          assert.equal(meta(post, "property", "og:url"), `${base}examples/${ex.slug}/`, ex.slug);
          assert.ok(existsSync(join(out, exampleCard(ex))), ex.slug);
          assert.equal(meta(post, "property", "og:image:width"), "1200", ex.slug);
        } else assert.doesNotMatch(post, /rel="canonical"|og:url/, ex.slug);
      }
    };
    build({ out });
    tags();
    build({ out, url: "https://example.com/buildnotes" });
    tags("https://example.com/buildnotes/");
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

test("the video Worker answers Range requests: 206 with Content-Range, 416 when unsatisfiable, 200 without", async () => {
  const { ranged, head } = await import("../../site/worker.mjs");
  // a HEAD keeps the asset's Content-Length and gains Accept-Ranges; it is never sliced
  const h = head(new Response(null, { status: 200, headers: { "Content-Type": "video/mp4", "Content-Length": "754706" } }));
  assert.equal(h.status, 200);
  assert.equal(h.headers.get("Content-Length"), "754706");
  assert.equal(h.headers.get("Accept-Ranges"), "bytes");
  const buf = new Uint8Array(100).map((_, i) => i).buffer;
  const base = new Headers({ "Content-Type": "video/mp4", "Content-Length": "100", ETag: '"x"' });
  const full = ranged(null, buf, base);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("Accept-Ranges"), "bytes");
  assert.equal(full.headers.get("Content-Length"), "100");
  assert.equal(full.headers.get("ETag"), '"x"', "the asset's headers are kept");
  const part = ranged("bytes=10-19", buf, base);
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("Content-Range"), "bytes 10-19/100");
  assert.equal(part.headers.get("Content-Length"), "10");
  assert.deepEqual([...new Uint8Array(await part.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const open = ranged("bytes=90-", buf, base);
  assert.equal(open.headers.get("Content-Range"), "bytes 90-99/100");
  const past = ranged("bytes=50-500", buf, base);
  assert.equal(past.headers.get("Content-Range"), "bytes 50-99/100", "an end past the file is shortened");
  const suffix = ranged("bytes=-5", buf, base);
  assert.equal(suffix.headers.get("Content-Range"), "bytes 95-99/100");
  for (const bad of ["bytes=100-", "bytes=20-10", "bytes=", "chars=0-1"]) {
    const r = ranged(bad, buf, base);
    assert.equal(r.status, 416, bad);
    assert.equal(r.headers.get("Content-Range"), "bytes */100", bad);
  }
});
