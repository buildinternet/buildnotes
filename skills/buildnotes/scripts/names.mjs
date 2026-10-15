// names.mjs: file names for exports, so a figure, video or deck says which story it came from.
//
// A work dir is ~/.buildnotes/<repo>/<date>-<slug>, so its slug names the story: exports land as
// export/<slug>-<what>.<ext> (walkthrough-videos-motion.mp4, walkthrough-videos-fig-2.png) and stay
// recognisable once they are dragged into a deck, a thread or a downloads folder. A dir with a generic
// name (a temp dir, "export", "out") falls back to the title, cut to a few words.

import { basename } from "node:path";

const GENERIC = /^(tmp|temp|out|output|export|exports|dist|build|work|src|post|story|untitled|\.)$|^(tmp|motion|export)[-_.]\w{4,}$/i;

// "Making the weekly digest worth opening" → "making-the-weekly-digest-worth"
export function slugify(text, words = 5) {
  return String(text ?? "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "")
    .split(/[^a-z0-9]+/).filter(Boolean).slice(0, words).join("-");
}

// The story's slug, from the work dir's name (its date dropped) or else from the title.
export function storySlug(dir, title) {
  const folder = slugify(basename(dir ?? "").replace(/^\d{4}-\d{2}-\d{2}-/, ""), 8);
  if (folder && !GENERIC.test(folder) && !GENERIC.test(basename(dir ?? ""))) return folder;
  return slugify(title) || "buildnotes";
}

// export/<slug>-<what>.<ext>; `what` is "motion", "motion-scene-5", "fig-2", "deck" and so on.
export function exportName(slug, what, ext) {
  return `${[slug, what].filter(Boolean).join("-")}.${ext}`;
}
