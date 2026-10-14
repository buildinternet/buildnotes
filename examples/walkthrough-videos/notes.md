# Notes — walkthrough videos build story (skill test run, 2026-10-14)

## 1. Open questions for the author

None left. The author confirmed that export is live for every user (project tours for the project's owner, per the code) and that the videos go to customers, dealers and teammates. Server rendering conditions were dropped as roadmap.

## 2. Notes for the author

- The issue for project tours and server rendering is still open, though floors and projects shipped (server rendering remains).

## 3. Skill friction

- gather.mjs: #2911 (a PR) was also pulled in as an "issue" via another PR's "part of #2911", so the dossier prints its body twice and `--download` saved the same 4.2 MB GIF twice (2911-1.gif = 2911-3.gif). Same for #2937.
- dossier.md cuts long bodies with "…[N more chars in dossier.json]" but gives no command to read the full text; I wrote a node one-liner over dossier.json. The cut often lands mid-section (e.g. #2917's step 5, #2911's storage list), which are exactly the parts a beat needs.
- "Story candidates" led with a mediabunny date-tag detail as "decision?"; none of the real turns (burn the minimap in, sink walls, fade the lamp, browser vs server) surfaced, though each is a bolded "decision" sentence in an issue or PR body.
- workdir.mjs printed only the path; SKILL.md says it prints house-style.md's path when it exists, but gives no hint where to create one when it doesn't (I inferred ~/.build-stories/sunny/house-style.md).
- visuals.md's "Picking the kind" table has no row for a path or position over a floor plan (a camera route, a moving viewpoint); for a spatial subject that's the central figure, and it's unclear whether `anatomy` (rectangular parts on a capture) or hand-drawn SVG is meant. Leaning hand SVG.
- `--download` saves webp; the image viewer here doesn't open webp directly, so "read every image" took a sips conversion pass. A png/jpg copy or a contact sheet would save a step.
- Nearby work flagged #2979 (★3, same feature, later day) and #3091 only by title; they change facts the post states (fade now covers doors/windows; walls are cut not squashed). Easy to miss without opening each.
- No component draws a path or position over a plan (a camera route, a moving viewpoint). I hand-wrote the SVG and had to write my own pose sampler (esbuild bundle of the repo's planner) to make it faithful; visuals.md gives no recipe for "compute the figure from the product's own code".
- `.diagram svg { min-width: 30rem }` in the template contradicts visuals.md's advice to draw hand SVG ~320 units wide for phones: a 320-wide drawing is forced to 480 px and scrolls sideways inside the stage. I overrode it inline (`min-width:0`).
- lint's moving-dot rule ("draw the dot before the boxes") assumes flow boxes; for a route over a floor plan the dot has to travel over the room, so following it meant drawing the room unfilled. The rule's wording ("crosses their labels") didn't fit the case.
- The anatomy `screenshot` view needs a `part` with a box for every key even when the key only needs an `at`; for a whole-frame key I had to invent a full-frame part.
- No guidance on hotspot placement when several parts sit inside one small corner (the mini-map card): keys 2–4 crowd the top-right; had to push hotspots to the image edge.
- render.mjs reported "ok" on all four renders while SVG labels were clipped at the left edge on the phone and overlapping the route; only looking at the screenshots caught it (as the docs say, but the "ok" invites skipping that look).

## 4. Lint summary

```text
Process detail (build budget): clock times 0/0 · dates 0/3 · references in prose 0/0 · process-talk sentences 0/4
Product name "Sunny": 1 in the prose, none in the title or headings.
Plain English: 12.5 words/sentence (aim ≤15) · passive 11% (aim ≤10%) · 0 over 25 words
Scan aids: 18 bold (5 in paragraphs, the rest list lead-ins) · 4 lists
Components: 3 rendered from specs (tick their numbers in the specs): anatomy viz/frame-anatomy.json · strip viz/wall-strip.json · strip viz/lamp-strip.json
Safety scan: no hits.
Links: all 1 open.
Images: 7. The scan cannot see inside them; open each one and look for names, emails, tokens and internal URLs.
Total prose: 1191 words (build: up to 2500, no minimum). Captions, code, terminals, diagrams and end matter are not counted.
```
