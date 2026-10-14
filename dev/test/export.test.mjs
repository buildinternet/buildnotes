// export.mjs end to end on the template. Skipped when there is no Chrome (or no ffmpeg, for the GIF).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromePath } from "../../scripts/chrome.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const run = (...args) => execFileSync("node", [join(root, "scripts/export.mjs"), join(root, "assets/template.html"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const noChrome = !chromePath() && "no Chrome";
const out = mkdtempSync(join(tmpdir(), "export-"));

test("--list numbers the visual figures", { skip: noChrome }, () => {
  const list = run("--list");
  assert.match(list, /^ 1 {2}options/m);
  assert.match(list, /^ 3 {2}flow {5}Fig\. 1\./m);
  assert.doesNotMatch(list, /code|term/);
});

test("--png writes the figure, and --width 390 the phone layout", { skip: noChrome }, () => {
  run("--figure", "3", "--png", "--scale", "1", "--out", join(out, "wide.png"));
  run("--figure", "3", "--png", "--scale", "1", "--width", "390", "--out", join(out, "phone.png"));
  const size = (f) => { const b = readFileSync(join(out, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const [ww, wh] = size("wide.png"), [pw, ph] = size("phone.png");
  assert.ok(ww > 700 && ww > wh, `wide ${ww}×${wh}`);
  assert.ok(pw < 400 && ph > pw, `phone ${pw}×${ph} is the stacked drawing`);
});

test("--svg is standalone, with styles inlined and the motion kept", { skip: noChrome }, () => {
  run("--figure", "3", "--svg", "--out", join(out, "flow.svg"));
  const svg = readFileSync(join(out, "flow.svg"), "utf8");
  assert.match(svg, /^<\?xml[^]*<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<rect[^>]*class="box hot"[^>]*style="fill:rgb\(/);
  assert.match(svg, /<animateMotion/);
  assert.doesNotMatch(svg, /var\(--/);
});

test("--gif loops the figure's own animation", { skip: noChrome || (spawnSync("ffmpeg", ["-version"]).status !== 0 && "no ffmpeg") }, () => {
  run("--figure", "2", "--gif", "--fps", "5", "--out", join(out, "steps.gif"));
  const gif = readFileSync(join(out, "steps.gif"));
  assert.equal(gif.subarray(0, 6).toString(), "GIF89a");
  assert.ok(statSync(join(out, "steps.gif")).size > 1000);
});

test("a still figure says so instead of making a video", { skip: noChrome }, () => {
  assert.throws(() => run("--figure", "5", "--gif"), /nothing in this figure moves/);
});

// Canvas and WebGL on the virtual clock (dev/test/fixtures/canvas.html: both loop every 2 s).
const fixture = join(root, "dev/test/fixtures/canvas.html");
const shoot = (n, at, ...more) => {
  const f = join(out, `c${n}-${at}-${more.length}.png`);
  execFileSync("node", [join(root, "scripts/export.mjs"), fixture, "--figure", String(n), "--png", "--scale", "1", "--at", String(at), "--out", f, ...more], { stdio: "ignore" });
  return readFileSync(f);
};

for (const [n, kind] of [[1, "2D canvas"], [2, "WebGL"]]) {
  test(`${kind}: frames are exact, and the loop closes`, { skip: noChrome }, () => {
    assert.ok(shoot(n, 0).equals(shoot(n, 2)), "t=0 and t=2 s are the same frame");
    assert.ok(!shoot(n, 0).equals(shoot(n, 0.5)), "t=0.5 s differs");
  });
}

test("a canvas with no declared loop asks for one", { skip: noChrome }, () => {
  assert.throws(() => execFileSync("node", [join(root, "scripts/export.mjs"), fixture, "--figure", "3", "--gif"], { stdio: "pipe" }), /data-loop/);
});

test("--click starts the figure, and a clamped game loop still reaches its end state", { skip: noChrome }, () => {
  const before = shoot(4, 3);
  const after = shoot(4, 3, "--click", "#go");
  const later = shoot(4, 5, "--click", "#go");
  assert.ok(!before.equals(after), "clicking changes the frame");
  assert.ok(after.equals(later), "the square has finished growing by 3 s, despite the 50 ms clamp");
});

test("a shader component loops exactly on u_phase", { skip: noChrome }, () => {
  const page = join(out, "shaders.html");
  execFileSync("node", [join(root, "dev/gallery.mjs"), "--only", "shader", "--out", page], { stdio: "ignore" });
  const at = (s) => {
    const f = join(out, `jitter-${s}.png`);
    execFileSync("node", [join(root, "scripts/export.mjs"), page, "--select", "#shader-jitter .shader", "--png", "--scale", "1", "--at", String(s), "--out", f], { stdio: "ignore" });
    return readFileSync(f);
  };
  assert.ok(at(2).equals(at(7)), "one loop (5 s) apart is the same frame");
  assert.ok(!at(2).equals(at(3)), "the retries move");
});

test("render.mjs fails clipped code at desktop width and cut-off SVG labels, notes scrolling code on a phone, and saves four screenshots", { skip: noChrome }, () => {
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  const tpl = readFileSync(join(root, "assets/template.html"), "utf8");
  const css = tpl.slice(tpl.indexOf("<style>"), tpl.indexOf("</style>") + 8);
  const long = "x".repeat(200);
  writeFileSync(join(dir, "post.html"), `<!doctype html><meta name="viewport" content="width=device-width">${css}<article class="post"><figure class="code"><figcaption><span>a.js</span></figcaption><pre><code>const s = "${long}";</code></pre></figure><figure class="diagram"><svg viewBox="0 0 200 100"><text x="-30" y="50">Corner label</text></svg></figure></article>`);
  const r = spawnSync("node", [join(root, "scripts/render.mjs"), join(dir, "post.html")], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /1280 light: ✗ code clipped by \d+ px: a\.js/);
  assert.match(r.stdout, /1280 light: .*✗ label cut off by \d+ px at the drawing's edge: "Corner label"/);
  assert.match(r.stdout, /390 light: ✗ label cut off by \d+ px at the drawing's edge: "Corner label" \(code scrolls in its card by \d+ px: a\.js\)/);
  for (const s of ["1280-light", "1280-dark", "390-light", "390-dark"]) assert.ok(statSync(join(dir, "render", `post-${s}.png`)).size > 0);
});

test("a command line gets a copy button and coloured words, and copies the command as typed", { skip: noChrome }, async () => {
  const { openPage } = await import("../../scripts/chrome.mjs");
  const page = await openPage(pathToFileURL(join(root, "assets/template.html")).href, { width: 800, height: 600, scale: 1 });
  try {
    const r = JSON.parse(await page.evaluate(`(() => {
      const cmd = document.querySelector(".cmd");
      let copied = null;
      navigator.clipboard.writeText = (t) => { copied = t; return Promise.resolve(); };
      cmd.querySelector(".copy").click();
      const spans = [...cmd.querySelectorAll("code span")].map((s) => s.className + ":" + s.textContent);
      return JSON.stringify({ spans, copied, buttons: cmd.querySelectorAll(".copy").length });
    })()`));
    assert.deepEqual(r.spans, ["c-cmd:node", "c-flag:--out", "c-flag:--search", 'c-str:"rate limit"']);
    assert.equal(r.copied, 'node scripts/gather.mjs --out evidence --search "rate limit"');
    assert.equal(r.buttons, 1);
  } finally {
    await page.close();
  }
});
