// names.mjs: the file names exports get.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportName, exportStem, slugify, storySlug } from "../../skills/buildnotes/scripts/names.mjs";

test("slugify keeps the first few words, lower case, ASCII", () => {
  assert.equal(slugify("Making the weekly digest worth opening"), "making-the-weekly-digest-worth");
  assert.equal(slugify("Making the weekly digest worth opening", 2), "making-the");
  assert.equal(slugify("Café déjà vu: it's R&D!"), "cafe-deja-vu-its-r");
  assert.equal(slugify("Tom & Jerry"), "tom-and-jerry");
  assert.equal(slugify("日本語 — ✨"), "");
  assert.equal(slugify(undefined), "");
});

test("a work dir names the story, minus its date", () => {
  assert.equal(storySlug("/home/z/.buildnotes/sunny/2026-10-14-walkthrough-videos", "Anything"), "walkthrough-videos");
});

test("an examples folder without a date names the story as is", () => {
  assert.equal(storySlug("/repo/examples/releases-weekly-digests", "Weekly digests"), "releases-weekly-digests");
});

test("a generic or temp dir falls back to the title", () => {
  assert.equal(storySlug("/tmp/export-a1b2c3", "Weekly digests, reworked"), "weekly-digests-reworked");
  assert.equal(storySlug(join(tmpdir(), "motion-Zk39Qp"), "Before and after"), "before-and-after");
  assert.equal(storySlug("/proj/out", "Before and after"), "before-and-after");
  assert.equal(storySlug("/proj/2026-10-14-tmp", "Before and after"), "before-and-after");
});

test("nothing to go on gives buildnotes", () => {
  assert.equal(storySlug("/tmp/export", ""), "buildnotes");
  assert.equal(storySlug(undefined, undefined), "buildnotes");
  assert.equal(storySlug("/tmp/tmp", "✨✨"), "buildnotes");
});

test("exportName joins slug, kind and extension", () => {
  assert.equal(exportName("walkthrough-videos", "motion", "mp4"), "walkthrough-videos-motion.mp4");
  assert.equal(exportName("walkthrough-videos", "motion-scene-5", "gif"), "walkthrough-videos-motion-scene-5.gif");
  assert.equal(exportName("story", "fig-2", "png"), "story-fig-2.png");
});

test("an author's name beats the folder, and the title is read only when needed", () => {
  assert.equal(exportStem({ name: "Q4 Launch Recap!", dir: "/x/2026-10-14-walkthrough-videos" }), "q4-launch-recap");
  let read = 0;
  const title = () => { read++; return "Some title"; };
  assert.equal(exportStem({ dir: "/x/2026-10-14-walkthrough-videos", title }), "walkthrough-videos");
  assert.equal(read, 0);
  assert.equal(exportStem({ dir: "/x/out", title }), "some-title");
  assert.equal(read, 1);
});
