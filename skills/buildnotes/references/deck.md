# Deck

A deck is the motion cut as slides you click through. It uses the same scene script, `motion.json`, with one scene to a slide. When you reach a slide, its scene plays once and holds its last frame. There is no new format to write: a story with a motion cut already has a deck.

`scripts/deck.mjs` turns the script into one self-contained page and, on request, a PDF with one page per slide.

## When to make one

Make one when the author asks for slides, a deck or a PDF, or wants to present the work in a meeting, a demo or a review. The presenter sets the pace, so a deck suits a talk better than the reel does. The PDF is for sending ahead, for a doc, or for anywhere a page won't play.

Write the motion script first ([motion.md](motion.md)) and check it. The same rules apply: one idea and one line to a slide, every word and number from the post. Don't write a second script for the deck. If a slide reads badly, fix the scene, and the reel gets the fix too.

## Build and export

```bash
node <skill-dir>/scripts/deck.mjs <work-dir>/motion.json --check   # the motion script's checks
node <skill-dir>/scripts/deck.mjs <work-dir>/motion.json           # → <work-dir>/deck.html
node <skill-dir>/scripts/deck.mjs <work-dir>/motion.json --pdf     # and <work-dir>/export/<story>-deck.pdf
node <skill-dir>/scripts/deck.mjs <work-dir>/motion.json --pdf --theme dark
```

`--check` runs the motion script's checks, without the warning about the reel's running time. Building writes `deck.html` with the images embedded, then opens it in headless Chrome to check that every slide's text fits. A `clip` needs `ffmpeg`, as in the motion cut.

On the page, → or Space or a click on the right of the slide goes on. ← or a click on the left goes back. Home and End jump to the first and last slide. F toggles full screen. Going back shows a slide already at rest. The address ends in the slide number (`deck.html#3`), so a link can open on any slide. With reduced motion set, every slide shows at rest.

`--pdf` prints each slide at rest to a 16:9 page (1920×1080, 20 × 11.25 in), with vector text. `<story>` is named as for the motion cut's exports: the script's `output.name` or `--name <slug>` sets it, and `output.theme` sets the theme. `--theme dark` prints the dark theme. `--out <file>` sets the page (`.html`) or the PDF (`.pdf`). The PDF needs Chrome.

Look at the result before handing it over: click through every slide forward and back, then open the PDF and check each page.

## Hand-off

Publish `deck.html` as its own private Artifact, titled like the post, next to the post's link and the motion cut. Give the author the PDF's path, or send the file when the host can. The deck is one line in the hand-off.

## Limits

- One slide per scene. There are no speaker notes and no slide-only scenes; a deck says what the reel says.
- A slide at rest is the end of its scene. A `statement`'s earlier line stays faded and a `shot` rests on its last region, as in the reel.
- In the PDF, a `clip` is its last frame and nothing moves.
- One look, as in the motion cut: the Plain style, light and dark, in the repo's brand when it has one. The script's `brand`, `--brand <file>` and `--no-brand` work as there.
