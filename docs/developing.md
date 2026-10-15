# Developing

```bash
node --test dev/test/*.test.mjs                    # renderer, lint and export tests
node dev/shots.mjs                                 # every component at 1280 and 390 px, light and dark → runs/components/
node dev/gallery.mjs --publish                     # rebuild assets/components.html after changing a renderer or spec
node scripts/viz.mjs build assets/template.html    # re-render the template's examples
```

Like the render pass and figure export, `dev/shots.mjs` drives headless Chrome through [`scripts/chrome.mjs`](../scripts/chrome.mjs), with no packages. It runs the four modes in parallel.

The images in the README were made with [`scripts/export.mjs`](../scripts/export.mjs) and live in [`.github/assets/`](../.github/assets).

## Run history

`runs/` keeps a local, git-ignored history of test runs: each run's self-contained page, its plan, notes, author message, lint output and dossier, plus a `meta.json` with the skill commit and artifact link. Runs can hold private-repo content, which is why they stay out of git.

```bash
node dev/save-run.mjs <work-dir> --note "what this run tested" --artifact <url>
open runs/index.html
```

## Committed examples

To keep a public run as a committed example, check it, then copy its page, plan and notes into `examples/<name>/` by hand.
