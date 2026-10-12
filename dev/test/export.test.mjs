// export.mjs end to end on the template. Skipped when there is no Chrome (or no ffmpeg, for the GIF).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
