# Visual components and motion scenes

Every visual in a post is drawn from a small spec, and every scene in a motion cut from a short script. This page shows each kind. Open [`assets/components.html`](../skills/buildnotes/assets/components.html) in a browser to see every page component next to its spec; the rules for choosing and drawing them are in [`references/visuals.md`](../skills/buildnotes/references/visuals.md) and [`references/motion.md`](../skills/buildnotes/references/motion.md).

The images on this page were exported with the skill's own [`scripts/export.mjs`](../skills/buildnotes/scripts/export.mjs), which turns any figure or scene into a PNG, GIF, video or standalone SVG ([commands](scripts.md)).

## Page components

[`scripts/viz.mjs`](../skills/buildnotes/scripts/viz.mjs) draws every visual from a small spec: JSON for most kinds, Markdown tables for options and matrices, GLSL for shaders. The output is plain HTML, SVG and CSS that inherits the page's theme, works in light and dark, reflows at phone width, and respects reduced motion. Each spec can be edited by hand and re-rendered. The example specs are in [`assets/specs/`](../skills/buildnotes/assets/specs).

<table>
  <tr>
    <td colspan="2"><img src="../.github/assets/flow.gif" alt="A flow diagram: git push to Build over a webhook, then fanning out to a preview link per branch and a build log kept 30 days. Dashes march along the route."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>flow</b>: boxes and routes with branches, labels and marching dashes. On a phone it stacks into a vertical drawing.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="../.github/assets/options-database.webp" alt="A table of three options: one shared database (rejected), database per branch (chosen, highlighted), schema per branch (rejected), each with a one-line reason."></td>
    <td width="50%"><img src="../.github/assets/matrix-previews.webp" alt="A comparison matrix of three options against four criteria, with check marks, crosses and short notes. The chosen column is highlighted."></td>
  </tr>
  <tr>
    <td><sub><b>options</b>: the decision and the alternatives that lost, with a reason for each.</sub></td>
    <td><sub><b>matrix</b>: options against criteria. A mark can carry a short note.</sub></td>
  </tr>
  <tr>
    <td><img src="../.github/assets/delta-build.webp" alt="A before and after figure: 38 s before, 9 s as it ships, 4x faster, median time from push to preview link over 200 builds."></td>
    <td><img src="../.github/assets/line-latency.webp" alt="A line chart of latency over twelve days, dropping from about 420 ms to 166 ms at a point marked 'cache on'."></td>
  </tr>
  <tr>
    <td><sub><b>delta</b>: a before/after number, and what was measured.</sub></td>
    <td><sub><b>line</b>: one or two series with a marked event.</sub></td>
  </tr>
  <tr>
    <td><img src="../.github/assets/strip-rounds.webp" alt="Three screenshots in a row labeled round one, round two and as it ships, showing a design getting simpler."></td>
    <td><img src="../.github/assets/term-gather.webp" alt="A terminal block running node scripts/gather.mjs with its output: a dossier of 6 issues, 9 PRs and 4 images."></td>
  </tr>
  <tr>
    <td><sub><b>strip</b>: rounds of a design, or a filmstrip of states.</sub></td>
    <td><sub><b>term</b> and <b>code</b>: real output and real code, captioned with the file name.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="../.github/assets/shader-banding.webp" alt="Two gradients rendered by a WebGL shader: twelve levels rounded, showing visible bands, and twelve levels dithered, showing a smooth ramp."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>shader</b>: a WebGL fragment shader, for posts where the pixels are the subject, shown on the reader's own screen.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="../.github/assets/digest-card-hero.webp" alt="The 'week at a glance' card drawn straight on in the field notes style: product tiles split into grey columns, the largest in blue, and five release rows, with notes in the margins joined to each part by a hairline."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>anatomy</b>: one parts list, measured on a capture, drawn flat or shown as the capture itself with notes in the margin, or at an angle and taken apart. This one is from <code>examples/releases-weekly-digests</code>.</sub></td>
  </tr>
</table>

Also: **steps** (a numbered pipeline with a moving highlight) and **bars** (a bar chart with one row marked).

## Motion scenes

[`scripts/motion.mjs`](../skills/buildnotes/scripts/motion.mjs) builds the [motion cut](../README.md#motion-cut) from a scene script, `motion.json`. Each scene is one of the kinds below; the clips here are single scenes of the committed examples' cuts, exported with `motion.mjs --scene`.

<table>
  <tr>
    <td width="50%"><img src="../.github/assets/motion-morph.gif" alt="Four product tiles sized by release count, where Claude Code looks biggest, resize in place to tiles sized by impact, where Codex is biggest. The headline changes from 'Counting releases rewards busy weeks' to 'Counting impact rewards big ones'."></td>
    <td width="50%"><img src="../.github/assets/motion-flow.gif" alt="A flow of four boxes: Monday run, Week just closed?, Claim the week, Send. One dot travels to Send and is marked Sent. A second dot stops in front of Claim the week, turns red, and is labeled 'Already claimed. Stops.'"></td>
  </tr>
  <tr>
    <td><sub><b>morph</b>: the same tiles, sized one way and then the right way. The wrong answer turns into the right one in front of the viewer.</sub></td>
    <td><sub><b>flow</b>: dots travel the route; one is stopped at the step that guards it.</sub></td>
  </tr>
  <tr>
    <td><img src="../.github/assets/motion-shot.gif" alt="A screenshot of the week-at-a-glance card. A red ring outlines the product tiles, labeled 'Tile size: how much each product shipped', then moves down to the list, labeled 'The five biggest releases, linked into the digest'."></td>
    <td><img src="../.github/assets/motion-swap.gif" alt="A dark screenshot of the week replay paused on Tuesday. A bright line wipes across it, left to right, revealing the same replay at the end of the week."></td>
  </tr>
  <tr>
    <td><sub><b>shot</b>: a ring moves across a screenshot's parts, naming each.</sub></td>
    <td><sub><b>swap</b>: one frame of a screen wipes over another.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="../.github/assets/motion-clip.webp" alt="A scene from the sunny-walkthrough-videos cut: the headline 'The room decides the shots' beside a real room export from Sunny playing in the frame, orbiting the Reception Lounge and gliding down to eye level."></td>
  </tr>
  <tr>
    <td colspan="2"><sub><b>clip</b>: the feature's own footage, from a GIF or video in the pull request, played inside the frame. This one is from the sunny-walkthrough-videos cut.</sub></td>
  </tr>
</table>

Also: **title**, **statement** (the problem, line by line), **list**, **bars** and **end** (where to go and what to press).
