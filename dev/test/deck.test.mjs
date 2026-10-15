// Checks for the deck: the motion cut's script as slides. The page is the motion template in deck mode;
// these drive it headless (keys, clicks, the hash) and print its PDF. Run: node --test dev/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { build } from "../../skills/buildnotes/scripts/motion.mjs";
import { checkDeck, outputs } from "../../skills/buildnotes/scripts/deck.mjs";
import { chromePath, openPage } from "../../skills/buildnotes/scripts/chrome.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const script = join(root, "skills/buildnotes/scripts/deck.mjs");
const base = join(root, "examples/releases-weekly-digests");
const example = JSON.parse(readFileSync(join(base, "motion.json"), "utf8"));
const noChrome = !chromePath() && "no Chrome";

// The weekly digests example has no clip, so its deck builds without ffmpeg. Built once; tests only read it.
let built;
function deckPage() {
  if (built) return built;
  const { cut, images } = checkDeck(example, base);
  const page = join(mkdtempSync(join(tmpdir(), "deck-")), "deck.html");
  writeFileSync(page, build(cut, images));
  return (built = { cut, page });
}

test("a deck is the motion script with deck mode on, and without the reel's running-time warning", () => {
  const long = { ...example, scenes: [...example.scenes, ...example.scenes.slice(1, 3)] };
  const { cut, errors, warnings } = checkDeck(long, base);
  assert.deepEqual(errors, []);
  assert.equal(cut.deck, true);
  assert.ok(!warnings.some((w) => /aim for under a minute/.test(w)), warnings.join("\n"));
  assert.equal(example.deck, undefined, "the script it was given is unchanged");
  assert.match(build(cut, {}), /<script type="application\/json" id="cut">\{[^<]*"deck":true/);
});

test("the page sits next to the script and the PDF in export/, named after the story; --out and --name override", () => {
  const file = "/w/2026-10-14-my-story/motion.json", cut = { title: "Some title" };
  assert.deepEqual(outputs(file, cut), { page: "/w/2026-10-14-my-story/deck.html", pdf: "/w/2026-10-14-my-story/export/my-story-deck.pdf", wantPdf: false });
  assert.equal(outputs(file, cut, { name: "Other Name" }).pdf, "/w/2026-10-14-my-story/export/other-name-deck.pdf");
  assert.deepEqual(outputs(file, cut, { out: "/x/slides.html" }), { page: "/x/slides.html", pdf: "/x/export/my-story-deck.pdf", wantPdf: false });
  assert.deepEqual(outputs(file, cut, { out: "/x/talk.pdf" }), { page: "/w/2026-10-14-my-story/deck.html", pdf: "/x/talk.pdf", wantPdf: true });
  assert.equal(outputs("/tmp/motion.json", cut).pdf, "/tmp/export/some-title-deck.pdf", "a generic dir falls back to the title");
  const named = { ...cut, output: { name: "Q4 recap" } };
  assert.equal(outputs(file, named).pdf, "/w/2026-10-14-my-story/export/q4-recap-deck.pdf", "the script's output.name");
  assert.equal(outputs(file, named, { name: "flag" }).pdf, "/w/2026-10-14-my-story/export/flag-deck.pdf", "a flag beats it");
});

test("--check and --help follow motion.mjs; a broken script fails", () => {
  const ok = spawnSync("node", [script, join(base, "motion.json"), "--check"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^ok: 9 slides \(title, /);
  assert.equal(spawnSync("node", [script, "--help"]).status, 0);
  assert.equal(spawnSync("node", [script]).status, 2);
  const dir = mkdtempSync(join(tmpdir(), "deck-"));
  writeFileSync(join(dir, "motion.json"), JSON.stringify({ title: "T", scenes: [{ kind: "wipe" }] }));
  const bad = spawnSync("node", [script, join(dir, "motion.json"), "--check"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /unknown kind "wipe"/);
});

const press = async (tab, key, code, keyCode, modifiers = 0) => {
  for (const type of ["keyDown", "keyUp"]) await tab.send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: keyCode, modifiers });
};
const state = (tab) => tab.evaluate(`({ ...window.__cut.state, hash: location.hash, count: document.getElementById("count").textContent, shown: [...document.querySelectorAll(".scene")].findIndex((e) => !e.hidden) + 1 })`);

test("keys, clicks and the hash move through the slides; forward plays a scene, back shows it at rest", { skip: noChrome }, async () => {
  const { cut, page } = deckPage();
  const n = cut.scenes.length;
  const tab = await openPage(pathToFileURL(page).href + "#3", { width: 1280, height: 900, scale: 1 });
  try {
    await tab.evaluate(`document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 300)))`);
    assert.deepEqual(await tab.evaluate(`window.__cut.problems`), []);
    assert.equal(await tab.evaluate(`window.__cut.slides`), n);
    assert.equal(await tab.evaluate(`document.querySelector("#scrub")`), null, "no scrubber in deck mode");
    let s = await state(tab);
    assert.deepEqual([s.slide, s.count, s.shown, s.hash], [3, `3 / ${n}`, 3, "#3"], "the hash deep-links");
    assert.ok(s.playing && s.t < cut.scenes[2].dur, "a slide reached from the hash plays");

    await press(tab, "ArrowRight", "ArrowRight", 39);
    s = await state(tab);
    assert.deepEqual([s.slide, s.hash, s.shown], [4, "#4", 4]);
    assert.ok(s.playing && s.t < 0.5, `forward starts the scene from the top (t ${s.t})`);
    await press(tab, "PageDown", "PageDown", 34);
    await press(tab, " ", "Space", 32);
    assert.equal((await state(tab)).slide, 6);

    await press(tab, "ArrowLeft", "ArrowLeft", 37);
    s = await state(tab);
    assert.deepEqual([s.slide, s.playing, s.t], [5, false, cut.scenes[4].dur], "back shows the slide at rest");
    assert.equal(await tab.evaluate(`getComputedStyle([...document.querySelectorAll(".scene")][4]).opacity`), "1", "a slide at rest doesn't fade");
    await press(tab, "PageUp", "PageUp", 33);
    assert.equal((await state(tab)).slide, 4);

    await press(tab, "End", "End", 35);
    s = await state(tab);
    assert.deepEqual([s.slide, s.playing, s.hash], [n, false, `#${n}`]);
    await press(tab, "ArrowRight", "ArrowRight", 39);
    assert.equal((await state(tab)).slide, n, "the last slide stays put");
    assert.equal(await tab.evaluate(`document.getElementById("next").disabled`), true);
    await press(tab, "Home", "Home", 36);
    assert.equal((await state(tab)).slide, 1);
    assert.equal(await tab.evaluate(`document.getElementById("prev").disabled`), true);
    await press(tab, "f", "KeyF", 70, 4); // Cmd/Ctrl-F belongs to the browser
    assert.equal(await tab.evaluate(`!!document.fullscreenElement`), false);

    const r = await tab.evaluate(`(({ left, top, width, height }) => ({ left, top, width, height }))(document.getElementById("screen").getBoundingClientRect())`);
    const click = async (x) => { for (const type of ["mousePressed", "mouseReleased"]) await tab.send("Input.dispatchMouseEvent", { type, x, y: r.top + r.height / 2, button: "left", clickCount: 1 }); };
    await click(r.left + r.width * 0.8);
    assert.equal((await state(tab)).slide, 2, "a click on the right goes on");
    await click(r.left + r.width * 0.1);
    assert.equal((await state(tab)).slide, 1, "a click on the left goes back");

    await tab.evaluate(`location.hash = "#7"; new Promise((r) => setTimeout(r, 100))`);
    assert.equal((await state(tab)).slide, 7, "changing the hash moves the deck");

    await press(tab, "f", "KeyF", 70);
    await tab.evaluate(`new Promise((r) => setTimeout(r, 300))`);
    if (await tab.evaluate(`!!document.fullscreenElement`)) {
      const box = await tab.evaluate(`(() => { const s = document.getElementById("stage").getBoundingClientRect(); return [s.width / s.height, s.left >= -1, s.right <= innerWidth + 1, s.bottom <= innerHeight + 1]; })()`);
      assert.ok(Math.abs(box[0] - 16 / 9) < 0.01 && box.slice(1).every(Boolean), `the stage letterboxes in full screen: ${box}`);
    }
    assert.deepEqual(tab.problems, []);
  } finally {
    await tab.close();
  }
});

test("with reduced motion every slide shows at rest", { skip: noChrome }, async () => {
  const { cut, page } = deckPage();
  const tab = await openPage(pathToFileURL(page).href, { width: 1280, height: 900, scale: 1, reduced: true });
  try {
    await tab.evaluate(`document.fonts.ready`);
    let s = await state(tab);
    assert.deepEqual([s.slide, s.playing, s.t], [1, false, cut.scenes[0].dur]);
    await press(tab, "ArrowRight", "ArrowRight", 39);
    s = await state(tab);
    assert.deepEqual([s.slide, s.playing, s.t], [2, false, cut.scenes[1].dur]);
  } finally {
    await tab.close();
  }
});

test("--pdf prints one 16:9 page per slide, named after the story, in either theme", { skip: noChrome }, () => {
  const dir = join(mkdtempSync(join(tmpdir(), "deck-")), "2026-10-14-weekly-digests");
  mkdirSync(dir);
  // The images resolve from the example's folder, so the script is copied with its paths made absolute.
  const scenes = JSON.parse(JSON.stringify(example.scenes), (k, v) => (["src", "img", "srcDark"].includes(k) && typeof v === "string" ? join(base, v) : v));
  const file = join(dir, "motion.json");
  writeFileSync(file, JSON.stringify({ ...example, scenes }));
  const run = spawnSync("node", [script, file, "--pdf", "--no-render"], { encoding: "utf8", timeout: 180000 });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(dir, "deck.html")));
  const pdf = join(dir, "export", "weekly-digests-deck.pdf");
  assert.ok(existsSync(pdf), run.stdout);
  const text = readFileSync(pdf, "latin1");
  assert.equal(text.match(/\/Type\s*\/Page(?!s)/g).length, example.scenes.length, "a page per slide");
  const box = text.match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/);
  assert.ok(box && Math.abs(box[1] / box[2] - 16 / 9) < 0.01, `16:9 pages: ${box?.slice(1)}`);
  const dark = spawnSync("node", [script, file, "--out", join(dir, "dark.pdf"), "--theme", "dark", "--no-render"], { encoding: "utf8", timeout: 180000 });
  assert.equal(dark.status, 0, dark.stderr);
  assert.ok(existsSync(join(dir, "dark.pdf")), "--out with a .pdf sets the PDF");
});
