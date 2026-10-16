// layout.js — what lies on the hero's table, and where. Shared by hero.js (the page) and site/hero.mjs (which
// cuts the images to size and bakes the posters). Units are table px: one cluster per example, laid out like a
// spread, PITCH apart; the camera visits each in turn and wraps from the last back to the first.
//
// A cluster is the example's post as a tall page (greeked: text drawn as bars, as Figma does when zoomed out),
// two of its figures pulled out beside it with a leader to where they sit, its deck fanned out, and its video.
// Sunny's also has a prop: the room from its post, as a 3D model (room.glb, made from site/hero/room.blend).
// Image paths are under site/hero/src/ (sources) and assets/hero/{d,m}/ (cut to size by site/hero.mjs).

export const PITCH = 1380;
export const POST = { x: 340, w: 380, h: 1555 };   // the post crops are 440 × 1800
export const FIG = { x: 780, w: 300 };             // a figure card; the image inside is 14 px narrower
export const VIDEO = { x: 0, y: 40, w: 300 };
export const DECK = { x: 0, y: 330, slide: 248 };
export const ROOM = { x: 0, y: 680, w: 280, h: 230 };

export const CLUSTERS = [
  { name: "Sunny", brief: "How we built room walkthrough videos", video: "sunny.mp4", room: true,
    post: "sunny/post.jpg", still: "sunny/frame-01.jpg", deck: ["sunny/frame-02.jpg", "sunny/frame-05.jpg", "sunny/frame-07.jpg"],
    figs: [{ src: "sunny/boardroom.jpg", w: 640, h: 360, at: 0.72, top: 920, label: "Figure · ch. 2, one frame named part by part" },
           { src: "sunny/lamp-after.jpg", w: 640, h: 360, at: 0.985, top: 1300, label: "Figure · ch. 3, the lamp fades" }] },
  { name: "Release Notes Index", brief: "post weekly digests worth opening", video: "releases.mp4",
    post: "releases/post.jpg", still: "releases/frame-01.jpg", deck: ["releases/frame-03.jpg", "releases/frame-05.jpg", "releases/frame-07.jpg"],
    figs: [{ src: "releases/digest-card.jpg", w: 640, h: 672, at: 0.36, top: 400, label: "Figure · ch. 1, the card" },
           { src: "releases/replay-tue.jpg", w: 640, h: 394, at: 0.975, top: 1180, label: "Figure · ch. 3, the replay" }] },
  { name: "Uploads", brief: "before and after screenshots, side by side", video: "uploads.mp4",
    post: "uploads/post.jpg", still: "uploads/frame-01.jpg", deck: ["uploads/frame-02.jpg", "uploads/frame-03.jpg", "uploads/frame-06.jpg"],
    figs: [{ src: "uploads/comment-pair.jpg", w: 640, h: 620, at: 0.40, top: 470, label: "Figure · ch. 1, the pair in a comment" },
           { src: "uploads/file-page-compare.jpg", w: 640, h: 424, at: 0.72, top: 1000, label: "Figure · ch. 2, the divider" }] },
];

// Each image, at the widest it's drawn on the table, so site/hero.mjs can cut it to size.
export function drawnWidths() {
  const widths = new Map(), want = (src, w) => widths.set(src, Math.max(widths.get(src) || 0, w));
  for (const c of CLUSTERS) {
    want(c.post, POST.w - 2); want(c.still, FIG.w - 14);
    for (const f of c.figs) want(f.src, FIG.w - 14);
    for (const d of c.deck) want(d, DECK.slide - 2);
  }
  return widths;
}

// The two cuts, by the stage's scale (--s in the page's CSS): desktop at 0.64, phones at 0.36.
export const CUTS = { d: 0.64, m: 0.36 };
export const cutFor = (s) => (s >= 0.5 ? "d" : "m");
