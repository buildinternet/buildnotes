# Example: weekly collection digests

A build story about the weekly collection digests on [Release Notes Index](https://releases.sh) (public repo `buildinternet/releases`): the week-at-a-glance card, the week replay, digest emails, and digests on by default.

- `post.html`: the finished page, self-contained (images embedded). Open it in a browser.
- `post-field-notes.html`: the same page in the field notes style, with the card drawn at an angle instead of keyed over the capture.
- `motion.json`, `motion.html` and `motion.mp4`: the motion cut, the post as a one-minute reel that plays itself. `motion.mp4` is the export at 1280×720. `node scripts/motion.mjs examples/releases-weekly-digests/motion.json` rebuilds the page; add `--mp4` for the video, or `--gif --scene 5 --size 720` for one scene as a clip.
- `deck.html` and `deck.pdf`: the same nine scenes as slides you click through, and the PDF with each slide at rest. `node scripts/deck.mjs examples/releases-weekly-digests/motion.json --out examples/releases-weekly-digests/deck.pdf` rebuilds both.
- `viz/`: the specs behind the rendered figures (the card's parts, measured on the capture, and the patch-pool bars) and the captures they use, including the two replay frames the motion cut wipes between.
- `plan.md`: the story plan the agent wrote before drafting.
- `notes.md`: the agent's open questions, the skill friction it hit, and its lint summary.

Made on 2026-10-12, before the brief step existed, then revised once for plain language and scannability, and again on 2026-10-14 for the page styles and components (the keyed card, a finding, a margin note). Later skill changes (the brief, angles, fewer questions) would frame it differently: a fresh run led with the digest email as the headline.
