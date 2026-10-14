# Plan: walkthrough videos (build story, field notes)

Repo private. Link nothing internal. Product: "Sunny". Avoid: a short list of names kept in the house style (not reproduced here), and customer or workspace names ("dev's Workspace" in 2938-19: don't use that image uncropped).
Lint: `--flavor build --product "Sunny" --avoid "…" --private`.

## Angles
1. **Every room, floor and project can be a looping video, and it always shows where you're standing.** (recommended) For: designers and devs who share Sunny layouts. Evidence: room/floor/project export, minimap burned into frames (#2911, #2918, #2929, #2936). Inference: a clip goes where a live 3D link can't (chat, slides, a download).
2. **A camera that films a room by itself.** For: developers. Evidence: shot list planned from the room (pure core module), walls sink, pieces fade. Inference: no camera work for the user. Folded into 1 as chapters 1, 3, 4.
3. **Video rendered in the tab, faster than it plays.** For: web/graphics devs. Evidence: 78.7 s project tour rendered in 10.8 s; fixed 30 fps clock; WebCodecs. Kept as the last chapter.

## Brief
- Headline: Looping walkthrough videos of a room, a floor or a whole project. (sure)
- Start → end: a layout was shared as a live 3D link or still renders, which need the viewer to drive or guess the space → one click records a 1080p loop that tours it, with the plan in the corner showing where the camera stands. (likely)
- Prior context: public share links + 3D viewer for rooms and floors (since Aug–Sep: #1458, #1919); "Picture of view PNG" stills on the share page (2913-5). One sentence.
- Audience: developers and designers who know roughly what Sunny is. (given)
- Supporting cast: the planned shot list; the burned-in plan; clearing the way to eye level (walls, lamp); budgets for floors/projects; browser rendering.
- Out of frame: share-page player & chapters menu, MP4 tags/chapter track/file names, in-canvas record frame UI, view-mode button, pruning, watermark (#2979), AO/MSAA frame matching, WebGPU post chain.

## Thesis
Sharing a layout used to mean a 3D link the viewer had to steer, or a few stills; now one click records a 1080p loop of a room, floor or project that plays anywhere the file goes and always shows, on the plan in the corner, where the camera stands.

## Beats
1. **A camera that plans its own shots.** Shot list computed from the room: title orbit → glide to eye level in the most open corner → look around → rise to the labelled plan → back to the first frame (so it loops). ~16.5 s, ~12 MB per room. Takeaway: no camera work; the room decides the shots. Visual: camera path drawn over the Reception Lounge plan (hand SVG; ideally poses computed from core `walkthroughPoseAt`). Evidence: #2911, walkthrough.ts.
2. **The plan in the corner travels with the file.** Decision: draw the minimap into every frame, not in the share-page player, so it survives downloads, chat previews and embeds. Fixed-length flat wedge, because a cone reaching the far walls swallowed the eye-level shot. Hidden under the title (clean poster) and during the overhead plan. Takeaway: wherever the clip lands, viewers know where they stand. Visual: `anatomy` of one output frame (2932-17 after, Boardroom stop): 3D view, caption chip, minimap card, camera dot, view wedge, room tint. Evidence: #2917, #2918, walkthrough-video.ts drawMinimap.
3. **A lamp in the corner.** The most open corner often holds a floor lamp or plant, which filled the whole look-around. Pieces fade within ~1.1 m of the eye (gone by 0.5 m) or in the first 2 m of the line of sight, never past halfway to the subject; continuous, so nothing pops. Alternative (penalise corners with tall pieces) dropped as unneeded. Takeaway: the eye-level shot shows the room, not the nearest object. Visual: lamp before/after `strip` (2932-17 crops). Evidence: #2930, #2932, walkthrough-fade.ts.
4. **Floors and projects: the same shots, room after room.** Floor tour hops room to room; walls stayed up and the camera flew through them on the way down → nearby walls sink below eye line, stand back up over the last 0.3 m; eye pose 0.5 m in from the corner. Budgets: floor ≤60 s (full ~8 s beats, else aerial-only ~4 s, else drop smallest rooms); project ≤90 s, ≥18 s per floor, rest split by room count; each room/floor a chapter. Takeaway: one button for a whole project, with a length people will watch. Visual: `strip` of descent frames, before (camera inside the wall) / after (2929-16 crops). Evidence: #2929, #2936, floor-tour.ts, project-tour.ts.
5. **Rendered in your browser** (+ try it). Decision: record in the tab already showing the room (WebCodecs H.264), on a fixed 30 fps clock, not a screen recording — a slow machine gives the same smooth clip, only slower. Measured: 44 s floor tour rendered in under 10 s; 78.7 s project tour in 10.8 s. A server renderer stays on the shelf until render time, keeping a tab open, or agents asking for tours over the API makes it worth it; the shot planner already lives in shared code for that. Takeaway: no queue, no render farm. Visual: none (maybe a one-line `delta`-free sentence). Try it: Export video… in the room; Video on a floor or project. Evidence: #2911, #2914 (open), #2929, #2936.

## Cuts
- WebGPU first ~1.2 s black (frames 0–35 of 495; fixed by warming pipelines) — true and verified, but a renderer bug users never saw; at most one clause in ch5.
- AO/MSAA frame matching (RMSE tables), WebGPU post chain, precompile fence (#2920, #2924, #2928).
- Share-page player, sprite thumbnails, chapter VTT, chapters menu (#2913, #2942); per-floor/room videos on project share page (#2940) — maybe one sentence in ch4.
- MP4 metadata, QuickTime chapter-track patch, unique file names (#2937) — good deep-dive material, not this story.
- In-canvas record frame, view-mode button, minimap preview, icon actions (#2919, #2935, #2938).
- Pruning to 10 per room; storage layout; watermarks and door/window fade (#2979); door/window cut instead of squash (#3091).
- Process: all built in ~2 days, agent signals — out by default.

## Open questions
None left. Answered by the author: export is live for every user (project tours owner-only, per code); audience is customers, dealers and teammates. Server-rendering conditions dropped as roadmap.

## Draft decisions (after checkpoint)
- Present tense matches HEAD: walls are cut (not squashed) since #3091; doors/windows fade in room videos since #2979 (occluder tag in studio Walls only).
- Render time kept only as a sidenote qualified "on one development machine" (10.8 s for the 78.7 s tour, #2936).
- WebGPU black frames cut entirely.
- Fig. 1 poses computed by bundling packages/core planWalkthrough/walkthroughPoseAt (scratchpad/poses); furniture rects approximated from the PR's plan frame; planner picks "back-right corner", matching the real export's caption.
- Fig. 3 frames are from the first wall fix (scaled walls); on plain walls this matches today's cut.

## Notes for the author
- Issue for project tours + server rendering is still open though floors and projects shipped (server rendering remains).

## Evidence notes
- Product URLs checked 200 on 2026-10-14: https://app.sunnysdk.com, https://app.sunnysdk.com/docs, https://withsunny.co. No public page mentions walkthrough video.
- Images read: all 19 (2911-1/3 duplicate GIF). All Meridian HQ fixture. 2938-19 shows "dev's Workspace" + prices (demo) — crop or skip. 2913-5 shows demo prices — fine.
- Numbers: 16.5 s / 12 MB room clip (#2911); 60 s / 90 s / 18 s caps (floor-tour.ts, project-tour.ts on HEAD); fade 0.5–1.1 m, 2 m view (walkthrough-fade.ts HEAD); 0.3 m restore, 0.5 m inset (#2929; EYE_INSET_M HEAD); render times (#2929, #2936 PR bodies, author's local runs).
