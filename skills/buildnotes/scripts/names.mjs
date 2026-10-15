// names.mjs: file names for exports, so a figure, video or deck says which story it came from.
//
// A work dir is ~/.buildnotes/<repo>/<date>-<slug>, so its slug names the story: exports land as
// export/<slug>-<what>.<ext> (walkthrough-videos-motion.mp4, walkthrough-videos-fig-2.png) and stay
// recognisable once they are dragged into a deck, a thread or a downloads folder. A dir with a generic
// name (a temp dir, "export", "out") falls back to the title, cut to a few words. An author's own name
// (--name, or "output": { "name" } in motion.json) beats both.

import { basename } from "node:path";
import { tmpdir } from "node:os";
import { realpathSync } from "node:fs";

// The date a work dir's name starts with (workdir.mjs makes it).
export const DATED = /^\d{4}-\d{2}-\d{2}-/;
const GENERIC = /^(tmp|temp|out|output|export|exports|dist|build|work|src|post|story|untitled)$/;

// "Making the weekly digest worth opening" → "making-the-weekly-digest-worth"
export function slugify(text, words = 5) {
  return String(text ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "")
    .split(/[^a-z0-9]+/).filter(Boolean).slice(0, words).join("-");
}

// A dir straight under the system temp dir (mkdtemp's) names nothing.
const inTmp = (dir) => {
  const roots = ["/tmp", "/private/tmp", tmpdir()];
  try { roots.push(realpathSync(tmpdir())); } catch {}
  return roots.some((r) => dir.startsWith(r + "/") && !dir.slice(r.length + 1).includes("/"));
};

// The story's slug, from the work dir's name (its date dropped) or else from the title.
export function storySlug(dir, title) {
  const folder = slugify(basename(dir ?? "").replace(DATED, ""), 8);
  if (folder && !GENERIC.test(folder) && !inTmp(dir ?? "")) return folder;
  return slugify(typeof title === "function" ? title() : title) || "buildnotes";
}

// The <story> part of an export's name: the author's name if given, else storySlug. `title` may be a
// function, so a caller only reads it when the folder doesn't name the story.
export function exportStem({ name, dir, title }) {
  return name ? slugify(name, 8) || "buildnotes" : storySlug(dir, title);
}

// export/<slug>-<what>.<ext>; `what` is "motion", "motion-scene-5", "fig-2", "deck" and so on.
export function exportName(slug, what, ext) {
  return `${slug}-${what}.${ext}`;
}
