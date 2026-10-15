# Example: walkthrough videos

A build story about walkthrough videos in [Sunny](https://app.sunnysdk.com), a furniture and space planner: one export turns a room, a floor or a whole project into a looping 1080p tour, with a small plan in the corner showing where the camera stands. The repo behind it is private, so the post links nothing internal and quotes no code. Everything in it is about the product as its users meet it.

It is the field notes style, and the most visual example here: a camera path drawn over the room's plan, a keyed video frame, and two before/after strips.

- `post.html`: the finished page, self-contained (images embedded). Open it in a browser.
- `motion.json`, `motion.html` and `motion.mp4`: the motion cut, the post as a reel of seven scenes that plays itself in 52 seconds. Its third scene plays the product's own room export, from the pull request that built it, with a `clip` scene. `motion.mp4` is the export at 1280×720. `node scripts/motion.mjs examples/sunny-walkthrough-videos/motion.json` rebuilds the page (the clip needs `ffmpeg`); add `--mp4` for the video.
- `viz/`: the specs behind the rendered figures (the keyed frame, the wall and lamp strips), the hand-drawn camera path (`camera-path.svg`, drawn from poses the product's own shot planner computed), and the images and footage they use.
- `plan.md`: the story plan the agent wrote before drafting: angles, brief, beats, cuts and the answers the author gave.
- `notes.md`: the skill friction the run hit, and its lint summary.

Made on 2026-10-14 from the pull requests that built the feature. Its friction log drove the fixes in buildinternet/buildnotes#9.
