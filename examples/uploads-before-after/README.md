# Example: before and after, side by side

A build story about before/after comparison on [uploads.sh](https://uploads.sh), which hosts screenshots and recordings for pull requests (public repo `buildinternet/uploads`). Tag two screenshots before and after and the pull request comment shows them in one row; open either one and a divider slides across both.

It is the Plain style, and its figures come from the product in use rather than from the pull requests alone. The PRs' own screenshots used placeholder images, so the run found real pairs with `uploads find state=before` and captured a real comment on GitHub and the live file page in Compare mode.

- `post.html`: the finished page, self-contained (images embedded). Open it in a browser.
- `motion.json`, `motion.html` and `motion.mp4`: the motion cut, seven scenes in 47 seconds. Its fifth scene plays a recording of the live file page with the divider sweeping across a pair (`viz/img/compare-sweep.mp4`). `motion.mp4` is the export at 1280×720.
- `deck.html` and `deck.pdf`: the same seven scenes as slides you click through, and the PDF with each slide at rest. `node scripts/deck.mjs examples/uploads-before-after/motion.json --out examples/uploads-before-after/deck.pdf` rebuilds both.
- `assets/`: the two live captures (a pull request comment with a pair, and Compare on that pair's file page).
- `viz/`: the specs behind the two strips (the file page's first version against how it ships, and the screenshot names before and after the overwrite fix), the images they use, and the Compare recording.
- `plan.md`: the story plan: angles, brief, beats, cuts and the status check against `main`.
- `notes.md`: the skill friction the run hit, and its lint summary.

Made on 2026-10-14 from the issues and pull requests that built the feature.
