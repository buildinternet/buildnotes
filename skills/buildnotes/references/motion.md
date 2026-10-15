# Motion cut

A motion cut is the post as a short reel: five to nine scenes that play themselves in under a minute, for people who would watch a video or flip through a deck but won't read 1,500 words. It isn't the post read aloud. It keeps the headline, the problem, one moment per idea and how to try it, and leaves the rest to the post.

`scripts/motion.mjs` turns a scene script (`motion.json`) into one self-contained page and, on request, an MP4. Every frame is computed from the clock, so the page's scrubber is exact and `export.mjs` steps the same page into a video frame by frame.

## When to make one

Make one when the author asks for a video, a reel, a motion version, something for social or a "quick version" of the post. Otherwise offer it in one line in the hand-off when the post has two or more visuals that move or compare (a keyed screenshot, a before/after, bars, a flow). A note or a post with no visuals doesn't get one.

Make it **after the post is checked**. The cut is drawn from `plan.md` and the finished page, not from the dossier, so it can't say anything the post doesn't.

## Choosing the scenes

The shape is fixed: a title, the problem, one scene for each idea that passes the reader test, and how to try it.

1. **Title.** The post's title, unchanged.
2. **The problem.** One or two lines from the opening: what was wrong for the reader before.
3. **The ideas.** One scene for each chapter whose takeaway can be shown, not just said. Most posts have three or four. A chapter whose point needs a paragraph of reasons (a database default, a migration) is cut. So is anything about process.
4. **Try it.** Where to go and what to press, using the product's own labels.

Each scene has one idea and one line. Write the headline as the takeaway, not the topic: "Counting impact rewards big ones," not "Impact scoring". Keep it to about ten words; `motion.mjs` warns past twelve. Use the post's own words where they work.

Every number, label and screenshot comes from the post. The rules that apply to the post apply here: no PR numbers or review credits, no unsourced numbers, nothing the safety pass would flag.

Pick the kind from the visual the chapter already has:

| The post has | Scene kind | What moves |
|---|---|---|
| A GIF or video of the feature itself, from a PR or your own capture | `clip` | The footage plays inside the frame, stepped with the reel's clock |
| A keyed screenshot or an `anatomy` figure | `shot` | A ring travels from part to part, each with a short label |
| Two frames of one screen (a `strip`, a before/after) | `swap` | The second frame wipes across the first |
| A `bars` or `delta` chart | `bars` | Bars grow in turn; an optional limit line |
| A `flow` or `steps` | `flow` | Dots travel the route; one can be stopped at a node |
| Two ways of sizing the same things (count against weight, before against after) | `morph` | The same tiles resize in place from one measure to the other |
| A short list of what shipped | `list` | Items rise in turn, each with an icon |
| The opening problem | `statement` | Lines arrive one by one; the earlier one fades back |

A `morph` is the strongest moment a cut can have: the reader watches the wrong answer turn into the right one. Use it when the post's argument is "measured this way, it looks like X; measured the right way, it's Y."

When the feature makes something that moves (a video, an animation, a walkthrough), show the real thing with a `clip`. PRs for visual features often carry a GIF or a screen recording; trim it with `from` and `to`, speed it up with `speed` if it runs long, and label it honestly (`"say": "A real room export, at 1.5× speed"`).

## The script

`<work-dir>/motion.json`. Image paths are relative to it, so the post's own `viz/img/` files work as they are.

```json
{
  "title": "Making the weekly digest worth opening",
  "dek": "The build story in under a minute.",
  "product": "Release Notes Index",
  "post": "https://…",
  "scenes": [
    { "kind": "title", "kicker": "How we built it", "headline": "Making the weekly digest worth opening" },
    { "kind": "statement", "lines": ["The digest was our most readable page.", "But you only saw it if you *went looking*."] },
    …
    { "kind": "end", "kicker": "Try it", "headline": "Open any collection's latest digest.", "pills": [{ "text": "Replay the week", "solid": true }] }
  ]
}
```

`title` is required. `dek` sits under the title on the page, `product` in the top corner of every scene, and `post` (a confirmed public URL, optional) adds a "Read the full post" link. Text is plain; `*words*` are underlined for emphasis.

`output` (optional) sets the exports' defaults once, so a rebuild needs no flags: `name` (the `<story>` part of every file name), `theme` (`light` or `dark`), `size` (the width in pixels) and `fps`. Set `name` when the author names the files, or when the work dir's name wouldn't tell a reader which story a file is from. A flag still wins.

```json
"output": { "name": "q4-walkthrough-recap", "theme": "dark", "size": 1280 }
```

Every scene takes `kind`, an optional `label` (top right, usually the chapter: `"02 · What counts as impact"`), and an optional `dur` in seconds. Leave `dur` out: `motion.mjs` sets each scene's length from its motion and from how long its words take to read (a line at about 3.5 words a second, the rest skimmed at about 5). Most scenes take kicker, headline and sub as below.

| Kind | Fields |
|---|---|
| `title` | `kicker`, `headline`; `ticks`: a few short labels along the bottom that a playhead crosses (the days of a week, the steps of a run) |
| `statement` | `lines`: one to three |
| `list` | `headline`; `items`: two to four `{ "title", "text", "icon" }`, icon one of `grid`, `play`, `mail`, `check`, `clock`, `code`, `bolt`, or `"img": "path"` |
| `shot` | `kicker`, `headline`, `sub`; `src`, optional `srcDark`; `regions`: up to three `{ "box": [x, y, width, height], "say" }` in the image's pixels. The `anatomy` spec's part boxes are in the same units |
| `clip` | `kicker`, `headline`, `sub`; `src`: a GIF, MP4, WebM or MOV; `to`, the second it ends (required), optional `from` (default 0) and `speed` (up to 4); `say`. The clip plays once and holds its last frame; keep it under 15 seconds of play |
| `swap` | `kicker`, `headline`, `sub`; `from` and `to`, each `{ "src", "say" }` |
| `bars` | `kicker`, `headline`, `sub`; `rows`: two to seven `{ "label", "value", "lit" }` (`lit` marks the one that matters); optional `max`, `unit` (`" s"`, `"%"`), `decimals` (default: as many as each value has), and `cap`: `{ "value", "label" }` |
| `flow` | `kicker`, `headline`; `nodes`: two to five `{ "text", "small", "lit" }`; `runs`: up to three `{ "to", "stop", "say" }`. A run travels from the first node to node `to` (default the last). With `stop` it halts in front of that node and turns red |
| `morph` | `kicker`; `before` and `after`, each `{ "headline", "tag" }`; `tiles`: two to eight `{ "name", "note", "before", "after", "parts", "say" }`, sized by `before` and then by `after`; optional `key`: `[{ "label", "color" }]` naming the `parts` in order (`green`, `blue`, `red`, `yellow`, `gray`, `accent`, `dim`); optional `columns`: tile indexes per column, like `[[0], [1], [2, 3]]` |
| `end` | `kicker`, `headline`; `pills`: the product's own button labels, strings or `{ "text", "solid" }`; `foot` |

On `clip` and `swap`, `"sayAt": "top"` moves the label to the top-left corner, for footage with its own caption at the bottom.

`examples/releases-weekly-digests/motion.json` uses most kinds; `examples/sunny-walkthrough-videos/motion.json` adds a `clip`.

## Build, check and export

```bash
node <skill-dir>/scripts/motion.mjs <work-dir>/motion.json --check   # errors and warnings, and each scene's length
node <skill-dir>/scripts/motion.mjs <work-dir>/motion.json           # → <work-dir>/motion.html
node <skill-dir>/scripts/motion.mjs <work-dir>/motion.json --mp4 --poster
node <skill-dir>/scripts/motion.mjs <work-dir>/motion.json --gif --scene 5 --size 720   # one scene as a short clip
```

`--check` fails on a missing field, an image it can't find or read, a region off its image, or a `morph` whose columns don't list every tile once. It warns about long headlines, a scene count outside five to nine, a cut over 75 seconds, a PR or commit named in the text, and a `dur` too short for its motion or its words. Fix every error. Treat a length warning as a reason to cut a scene, not to speed the rest up.

Building writes `motion.html` with the images embedded (a `clip`'s footage becomes one sheet of frames, which needs `ffmpeg`), then opens it in headless Chrome to check that every scene's text fits the frame. A headline shrinks to fit before it is reported; a reported scene needs fewer words.

`--mp4` (or `--webm`, or `--gif` at half size) writes `<work-dir>/export/<story>-motion.mp4` at 1920×1080 and 30 fps. `<story>` is the work dir's name without its date (`walkthrough-videos`), or the cut's title when the dir has a generic name; `--name <slug>` sets it, so exports dragged out of the folder still say which story they belong to. `--poster` writes a still from the end of the title scene, for a thumbnail; `--at <seconds>` picks another moment. The video opens on that same frame, held for one frame, because GitHub and most players show the first frame before play and ignore a poster; the MP4 also carries it as cover art for Finder and QuickTime. `--theme dark` exports the dark theme. Export needs Chrome and `ffmpeg` and takes a couple of minutes for a one-minute cut.

`--scene <n>` exports one scene alone, counted from 1, as `export/<story>-motion-scene-<n>.<ext>`. It stops just before the scene fades out, so a GIF loops on the scene. A clip is the right size for a README, a reply in a thread or a changelog entry; the `morph` and `flow` scenes make the best ones. `--size <px>` sets the width (default 1920, or 960 for a GIF): `--gif --scene 5 --size 720` gives a clip of a few hundred kilobytes. With `--poster`, `--scene` gives that scene's last frame.

Look at the result before handing it over: open `motion.html`, play it once, and scrub to the end of each scene. Check that every ring and label sits on the part it names.

## Hand-off

Publish `motion.html` as its own private Artifact, titled like the post, next to the post's link. Give the author the MP4's path (or send the file, when the host can), and a GIF of the strongest scene if they plan to post it somewhere a video won't play inline. The cut is one line in the hand-off, not another round of questions.

## Limits

- One look: the Plain style, light and dark. The page doesn't follow the post's field-notes style or a brand yet.
- 16:9 only. A vertical cut for phones was tried as a prototype and left out. For slides, the same script builds a deck ([deck.md](deck.md)).
- No sound and no captions track. The words are on screen, so the video works muted.
