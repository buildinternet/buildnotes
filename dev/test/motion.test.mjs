// Checks for the motion cut: the script checks, scene lengths, the built page, and a headless pass over the
// example's scenes. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { check, build, clipSprite, exportPlan, imageSize, readingTime } from "../../scripts/motion.mjs";
import { spawnSync } from "node:child_process";
import { chromePath, openPage } from "../../scripts/chrome.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const base = join(root, "examples/weekly-digests");
const example = JSON.parse(readFileSync(join(base, "motion.json"), "utf8"));
const noChrome = !chromePath() && "no Chrome";
const noFfmpeg = spawnSync("ffmpeg", ["-version"]).status !== 0 && "no ffmpeg";
const sunnyBase = join(root, "examples/walkthrough-videos");
const sunny = JSON.parse(readFileSync(join(sunnyBase, "motion.json"), "utf8"));
const scene = (kind) => structuredClone(example.scenes.find((s) => s.kind === kind));
const one = (...scenes) => check({ title: "T", scenes }, base);

test("the example passes, and every scene gets a length that adds up to under 75 seconds", () => {
  const { cut, errors, images } = check(example, base);
  assert.deepEqual(errors, []);
  assert.ok(cut.scenes.every((s) => s.dur > 0));
  assert.ok(cut.total > 40 && cut.total < 75, `${cut.total} s`);
  assert.deepEqual(cut.scenes.find((s) => s.kind === "shot").size, [1424, 1494]);
  assert.equal(Object.keys(images).length, 4);
  assert.equal(example.scenes[0].dur, undefined, "check doesn't change the script it was given");
});

test("errors: an unknown kind, a missing image, a region off its image, columns that skip a tile, a run to nowhere", () => {
  const shot = scene("shot"), morph = scene("morph"), flow = scene("flow");
  shot.regions[0].box = [1000, 0, 600, 100];
  morph.columns = [[0], [1, 2]];
  flow.runs = [{ to: 9 }];
  const { errors } = one({ kind: "wipe" }, { ...scene("swap"), to: { src: "viz/img/nope.webp" } }, shot, morph, flow);
  assert.match(errors.join("\n"), /scene 1: unknown kind "wipe"/);
  assert.match(errors.join("\n"), /scene 2: swap to: no file at viz\/img\/nope\.webp/);
  assert.match(errors.join("\n"), /scene 3: region 1 runs off the 1424×1494 image/);
  assert.match(errors.join("\n"), /scene 4: "columns" must list each tile index once/);
  assert.match(errors.join("\n"), /scene 5: run 1: "to" is a node index/);
});

test("warnings: a long headline, a PR number, a dur shorter than the motion, a cut that runs long", () => {
  const long = { kind: "statement", lines: ["This line goes on and on for a great many more words than anyone will read in a glance"] };
  const pr = { kind: "end", headline: "Shipped in #2473" };
  const short = { ...scene("morph"), dur: 3 };
  const { warnings } = one(long, pr, short, ...Array(9).fill(scene("flow")));
  const all = warnings.join("\n");
  assert.match(all, /scene 1: .* is 19 words/);
  assert.match(all, /scene 2: names a PR/);
  assert.match(all, /scene 3: dur 3 s cuts off the motion/);
  assert.match(all, /aim for under a minute/);
  assert.match(all, /the first scene is usually a "title"/);
});

test("reading time grows with the words, and a headline counts for more than a sub", () => {
  const a = readingTime({ headline: "One two three four" });
  const b = readingTime({ headline: "One two three four", sub: "five six seven eight" });
  const c = readingTime({ headline: "One two three four five six seven eight" });
  assert.ok(a < b && b < c, `${a} ${b} ${c}`);
});

test("image sizes come from the file header: WebP and PNG", () => {
  assert.deepEqual(imageSize(readFileSync(join(base, "viz/img/replay-tue.webp"))), [2100, 1290]);
  const png = Buffer.alloc(24);
  png.writeUInt32BE(0x89504e47, 0);
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(360, 20);
  assert.deepEqual(imageSize(png), [640, 360]);
});

test("a clip scene: footage that ends somewhere, in a format ffmpeg reads; its length follows its speed", () => {
  const clip = structuredClone(sunny.scenes.find((x) => x.kind === "clip"));
  const ok = check({ title: "T", scenes: [clip] }, sunnyBase);
  assert.deepEqual(ok.errors, []);
  assert.ok(ok.cut.scenes[0].dur >= 16.5 / 1.5 + 1.4 - 0.05, `${ok.cut.scenes[0].dur} s`);
  const { errors, warnings } = check({ title: "T", scenes: [
    { ...clip, to: undefined },
    { ...clip, src: "viz/img/lamp-before.png" },
    { ...clip, speed: 1 },
  ] }, sunnyBase);
  assert.match(errors.join("\n"), /scene 1: clip needs "to"/);
  assert.match(errors.join("\n"), /scene 2: clip: viz\/img\/lamp-before\.png isn't a GIF, MP4, WebM or MOV/);
  assert.match(warnings.join("\n"), /scene 3: the clip plays 16\.5 s/);
});

test("a clip's footage becomes one sheet of frames at the footage's own rate", { skip: noFfmpeg }, () => {
  const d = check({ title: "T", scenes: [{ ...sunny.scenes.find((x) => x.kind === "clip"), from: 1, to: 3 }] }, sunnyBase).cut.scenes[0];
  const sp = clipSprite(d);
  assert.equal(sp.fps, 10, "the walkthrough GIF was 10 fps");
  assert.equal(sp.frames, 20);
  assert.deepEqual(sp.size, [480, 270]);
  assert.equal(sp.cols * sp.rows >= sp.frames, true);
  assert.deepEqual(imageSize(readFileSync(sp.sheet)), [sp.cols * 480, sp.rows * 270]);
});

test("a clip is one scene: it starts where the scene starts and stops before its fade", () => {
  const { cut } = check(example, base);
  const whole = exportPlan(cut);
  assert.deepEqual([whole.from, whole.seconds, whole.scale, whole.suffix], [0, cut.total, 1.875, ""]);
  const clip = exportPlan(cut, { scene: 5, size: 720, gif: true });
  const start = cut.scenes.slice(0, 4).reduce((a, d) => a + d.dur, 0);
  assert.equal(clip.from, Math.round(start * 10) / 10);
  assert.equal(clip.seconds, Math.round((cut.scenes[4].dur - 0.35) * 10) / 10);
  assert.equal(clip.scale * 1024, 720, "the 1024 px screen exports 720 px wide");
  assert.equal(clip.suffix, "-scene-5");
  assert.equal(exportPlan(cut, { gif: true }).scale * 1024, 960);
  assert.throws(() => exportPlan(cut, { scene: 10 }), /a scene from 1 to 9/);
  assert.throws(() => exportPlan(cut, { size: 20 }), /a width from 160/);
});

test("the page embeds the images, carries the script safely and drops the authoring notes", () => {
  const { cut, images } = check({ ...example, title: "Ends </script> here & now" }, base);
  const html = build(cut, images);
  assert.ok(html.startsWith("<title>Ends &lt;/script&gt; here &amp; now</title>"), "the title is escaped");
  assert.equal(html.match(/<\/script>/g).length, 3, "the title's </script> doesn't close a block");
  assert.ok(html.includes(`"viz/img/digest-card.webp":"data:image/webp;base64,`), "the images are embedded");
  assert.ok(!html.includes("<!--"), "the authoring notes are dropped");
});

for (const [name, script, dir, needs] of [["weekly-digests", example, base, null], ["walkthrough-videos", sunny, sunnyBase, noFfmpeg]])
test(`every scene of the ${name} cut fits the frame and stays on the stage`, { skip: noChrome || needs || false }, async () => {
  const { cut, images } = check(script, dir);
  for (const d of cut.scenes.filter((x) => x.kind === "clip")) {
    const sp = clipSprite(d);
    images[d.sprite = "clip"] = sp.sheet;
    Object.assign(d, { frames: sp.frames, fps: sp.fps, cols: sp.cols, rows: sp.rows, size: sp.size });
    delete d.file;
  }
  const page = join(mkdtempSync(join(tmpdir(), "motion-")), "motion.html");
  writeFileSync(page, build(cut, images));
  const tab = await openPage(pathToFileURL(page).href, { width: 1280, height: 900, scale: 1 });
  try {
    await tab.evaluate(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300)))`);
    assert.deepEqual(await tab.evaluate(`window.__cut.problems`), []);
    assert.equal(await tab.evaluate(`Number(document.getElementById("stage").dataset.loop)`), cut.total);
    assert.equal(await tab.evaluate(`document.getElementById("screen").getBoundingClientRect().width`), 1024, "motion.mjs exports from a 1024 px screen");
    for (const [i, s] of cut.scenes.entries()) {
      const off = await tab.evaluate(`(() => {
        window.__cut.freeze(${i}, ${s.dur - 0.4});
        const st = document.getElementById("stage").getBoundingClientRect();
        const scene = [...document.querySelectorAll(".scene")].find((e) => !e.hidden);
        return [...scene.querySelectorAll(".k, .hd, .sub, .chip, .say, .pill, .node, .tile, .pic, .bars .v, .tag")]
          .filter((e) => getComputedStyle(e).opacity !== "0" && e.textContent.trim() !== "" || e.matches(".pic, .tile"))
          .map((e) => [e.className, e.getBoundingClientRect()])
          .filter(([, r]) => r.left < st.left - 1 || r.top < st.top - 1 || r.right > st.right + 1 || r.bottom > st.bottom + 1)
          .map(([c]) => c);
      })()`);
      assert.deepEqual(off, [], `scene ${i + 1} (${s.kind}) has parts off the stage`);
    }
    assert.equal(await tab.evaluate(`[...document.images].filter((i) => !i.naturalWidth).length`), 0, "every image loads");
  } finally {
    await tab.close();
  }
});
