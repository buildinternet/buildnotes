// Checks for brand.mjs: the brand file's checks, the colours it derives, and the brand written into a post,
// a motion cut and a deck. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyBrand, brandPost, checkBrand, contrast, loadBrand, resolveColors, svgSize } from "../../skills/buildnotes/scripts/brand.mjs";
import { build, check } from "../../skills/buildnotes/scripts/motion.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scripts = join(root, "skills/buildnotes/scripts");
const example = join(root, "examples/uploads-before-after");
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="40" height="40" fill="#15803d"/></svg>`;
const BRAND = {
  name: "Acme",
  colors: { light: { accent: "#15803d", mark: "#b45309" }, dark: { paper: "#0f1712" } },
  fonts: { display: "Space Grotesk", stylesheet: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" },
  logo: "logo.svg",
};

// ~/.buildnotes/<repo>/ with brand.json and a logo, and a work dir in it holding a copy of the example.
function repo(brand = BRAND) {
  const dir = mkdtempSync(join(tmpdir(), "brand-"));
  writeFileSync(join(dir, "logo.svg"), LOGO);
  if (brand) writeFileSync(join(dir, "brand.json"), JSON.stringify(brand));
  const work = join(dir, "2026-10-15-before-after");
  mkdirSync(work);
  writeFileSync(join(work, "post.html"), readFileSync(join(example, "post.html"), "utf8"));
  return { dir, work };
}

test("errors: unknown keys at every level, a colour that isn't hex, a remote or missing logo, a stylesheet that isn't https", () => {
  const dir = mkdtempSync(join(tmpdir(), "brand-"));
  const { brand, errors } = checkBrand({
    nmae: "x",
    colors: { light: { accent: "green", primary: "#fff" }, sepia: {} },
    fonts: { display: "A", weight: 700, stylesheet: "http://example.com/f.css" },
    logo: { light: "https://example.com/l.svg", dark: "nope.svg", small: "x.svg" },
  }, dir);
  assert.equal(brand, null);
  for (const m of [/"nmae" is unknown/, /colors\.light\.accent: "green" isn't a hex/, /colors\.light\."primary" is unknown/, /colors\."sepia" is unknown/, /fonts\."weight" is unknown/, /fonts\.stylesheet is an https URL/, /logo\.light: a local file/, /logo\.dark: no file at nope\.svg/, /logo\."small" is unknown/]) {
    assert.ok(errors.some((e) => m.test(e)), `${m} in ${errors.join(" | ")}`);
  }
});

test("colours a brand implies: dark accent and mark made to read, hero from the accent, washes and rules from the paper", () => {
  const c = resolveColors({ light: { accent: "#15803d", mark: "#b45309", paper: "#fbfaf6" }, dark: { paper: "#0f1712" } });
  assert.equal(c.light.hero, "#15803d");
  assert.equal(c.light["hero-ink"], "#ffffff");
  assert.ok(contrast(c.dark.accent, "#0f1712") >= 4.5, c.dark.accent);
  assert.ok(contrast(c.dark.mark, "#0f1712") >= 4.5, c.dark.mark);
  assert.ok(c.light.rule && c.light.wash && c.light["accent-wash"] && c.dark.rule);
  assert.ok(contrast(c.dark.hero, "#0f1712") < 3, "the dark hero is a deep accent, not the light one");
  assert.deepEqual(resolveColors({}), { light: {}, dark: {} }, "no colours: nothing changes");
});

test("contrast below 4.5:1 for text is a warning, not an error", () => {
  const { brand, errors, warnings } = checkBrand({ colors: { light: { accent: "#ffd400" }, dark: { accent: "#ffd400" } } }, tmpdir());
  assert.deepEqual(errors, []);
  assert.ok(brand);
  assert.ok(warnings.some((w) => /^light accent #ffd400 on paper #ffffff is 1\.\d+:1/.test(w)), warnings.join(" | "));
  assert.ok(warnings.some((w) => /light hero-ink .* on hero #ffd400/.test(w)) === false, "a yellow hero takes dark ink");
});

test("an SVG's size comes from its viewBox, else its width and height", () => {
  assert.deepEqual(svgSize(LOGO), [120, 40]);
  assert.deepEqual(svgSize(`<svg width="64px" height="16">`), [64, 16]);
  assert.equal(svgSize(`<svg>`), null);
});

test("the post: the brand goes in once after the page's styles, a rerun changes nothing, and --none takes it out", () => {
  const { work } = repo();
  const file = join(work, "post.html");
  const html = readFileSync(file, "utf8");
  const r = brandPost(html, file);
  assert.deepEqual(r.errors, []);
  assert.ok(r.applied);
  assert.equal((r.html.match(/<style id="brand">/g) || []).length, 1);
  assert.ok(r.html.indexOf('<style id="brand">') > r.html.indexOf("</style>"), "after the template's own styles, so it wins");
  assert.match(r.html, /--accent: #15803d;/);
  assert.match(r.html, /--font-display: "Space Grotesk", "Helvetica Neue", Arial, sans-serif;/);
  assert.match(r.html, /<link id="brand-fonts" rel="stylesheet" href="https:\/\/fonts\.googleapis\.com/);
  assert.match(r.html, /\.mast::before \{ content: ""; .* background: var\(--brand-logo\)/);
  assert.match(r.html, /:root\[data-theme="dark"\] \{ --paper: #0f1712;/);
  assert.doesNotMatch(r.html, /--hero/, "the post has no hero");
  assert.equal(brandPost(r.html, file).html, r.html);
  assert.equal(applyBrand(r.html, null), html);
});

test("a post with no brand.json is left as it is, and viz.mjs build brands one that has it", () => {
  const bare = repo(null);
  const file = join(bare.work, "post.html");
  const before = readFileSync(file, "utf8");
  assert.equal(brandPost(before, file).applied, false);
  spawnSync(process.execPath, [join(scripts, "viz.mjs"), "build", file]);
  assert.equal(readFileSync(file, "utf8"), before);
  const branded = repo();
  const out = spawnSync(process.execPath, [join(scripts, "viz.mjs"), "build", join(branded.work, "post.html")], { encoding: "utf8" });
  assert.match(out.stderr, /branded from .*brand\.json/);
  assert.match(readFileSync(join(branded.work, "post.html"), "utf8"), /<style id="brand">/);
});

test("field notes keeps its own look, with a warning that only the logo shows", () => {
  const { work } = repo();
  const file = join(work, "post.html");
  const html = readFileSync(join(root, "examples/releases-weekly-digests/post-field-notes.html"), "utf8");
  assert.ok(brandPost(html, file).warnings.some((w) => /field notes/.test(w)));
});

test("motion.json's brand: overrides merged over the repo's file, a path to another file, or false for none", () => {
  const { dir, work } = repo();
  const over = loadBrand({ dir: work, spec: { colors: { light: { accent: "#7c3aed" } } } });
  assert.deepEqual(over.errors, []);
  assert.equal(over.brand.colors.light.accent, "#7c3aed");
  assert.equal(over.brand.colors.light.mark, "#b45309", "the file's other colours stay");
  assert.ok(over.brand.logo.light.uri.startsWith("data:image/svg+xml;base64,"));
  assert.equal(loadBrand({ dir: work, spec: false }).brand, null);
  writeFileSync(join(dir, "other.json"), JSON.stringify({ colors: { light: { accent: "#0e7490" } } }));
  assert.equal(loadBrand({ dir: work, spec: "../other.json" }).brand.colors.light.accent, "#0e7490");
  assert.match(loadBrand({ dir: work, spec: { colours: {} } }).errors[0], /brand: "colours" is unknown/);
});

test("the motion cut and deck: a brand is written into the page; without one the page is what it was", () => {
  const script = JSON.parse(readFileSync(join(example, "motion.json"), "utf8"));
  const plain = check(script, example);
  assert.equal(plain.brand, null);
  const page = build(plain.cut, plain.images);
  assert.equal(build(plain.cut, plain.images, undefined, plain.brand), page);
  assert.doesNotMatch(page, /id="brand"/);

  const { work } = repo();
  const branded = check({ ...script, brand: { colors: { light: { hero: "#14532d" } } } }, example, { brand: join(dirname(work), "brand.json") });
  assert.deepEqual(branded.errors, []);
  assert.equal(branded.cut.brand, undefined, "the brand isn't carried in the page's script");
  const html = build(branded.cut, branded.images, undefined, branded.brand);
  assert.match(html, /--hero: #14532d;/);
  assert.match(html, /--accent: #15803d;/);
  assert.match(html, /\.meta > span:first-child::before/);
  assert.match(html, /--brand-logo-hero: url\("data:image\/svg\+xml/);
  assert.equal(check(script, example, { deck: true, brand: false }).brand, null);
  const bad = check({ ...script, brand: { colors: { light: { accent: "teal" } } } }, example);
  assert.ok(bad.errors.some((e) => /brand: colors\.light\.accent: "teal" isn't a hex/.test(e)));
});

test("brand.mjs --check reports a good file and fails a bad one; workdir.mjs prints where the brand lives", () => {
  const { dir } = repo();
  const ok = spawnSync(process.execPath, [join(scripts, "brand.mjs"), "--check", join(dir, "brand.json")], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^ok: .*a logo/);
  writeFileSync(join(dir, "bad.json"), JSON.stringify({ colors: { light: { ink: "#12" } } }));
  const bad = spawnSync(process.execPath, [join(scripts, "brand.mjs"), "--check", join(dir, "bad.json")], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /colors\.light\.ink: "#12" isn't a hex/);

  const rootDir = mkdtempSync(join(tmpdir(), "workdir-"));
  const env = { ...process.env, BUILDNOTES_DIR: rootDir };
  const none = spawnSync(process.execPath, [join(scripts, "workdir.mjs"), "a"], { encoding: "utf8", cwd: tmpdir(), env });
  assert.match(none.stderr, /brand: none; .*save them once to .*no-repo\/brand\.json/);
  writeFileSync(join(rootDir, "no-repo", "brand.json"), "{}");
  const some = spawnSync(process.execPath, [join(scripts, "workdir.mjs"), "b"], { encoding: "utf8", cwd: tmpdir(), env });
  assert.match(some.stderr, /brand: .*no-repo\/brand\.json \(the post, motion cut and deck follow it\)/);
});
