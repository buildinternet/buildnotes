# Developing

```bash
node --test dev/test/*.test.mjs                    # renderer, lint and export tests
node dev/shots.mjs                                 # every component at 1280 and 390 px, light and dark → runs/components/
node dev/gallery.mjs --publish                     # rebuild skills/buildnotes/assets/components.html after changing a renderer or spec
node skills/buildnotes/scripts/viz.mjs build skills/buildnotes/assets/template.html    # re-render the template's examples
```

Like the render pass and figure export, `dev/shots.mjs` drives headless Chrome through [`scripts/chrome.mjs`](../skills/buildnotes/scripts/chrome.mjs), with no packages. It runs the four modes in parallel.

The images in the README were made with [`scripts/export.mjs`](../skills/buildnotes/scripts/export.mjs) and live in [`.github/assets/`](../.github/assets).

## Run history

`runs/` keeps a local, git-ignored history of test runs: each run's self-contained page, its plan, notes, author message, lint output and dossier, plus a `meta.json` with the skill commit and artifact link. Runs can hold private-repo content, which is why they stay out of git.

```bash
node dev/save-run.mjs <work-dir> --note "what this run tested" --artifact <url>
open runs/index.html
```

## Committed examples

To keep a public run as a committed example, check it, then copy its page, plan and notes into `examples/<name>/` by hand.

## Website

`site/` builds the project's one-page website into `site/dist/` (git-ignored), a folder of static files any host can serve.

```bash
node site/build.mjs                  # or: npm run site
node site/build.mjs --url https://example.com/buildnotes/   # once it has a home: canonical link, og:url, og:image there
node site/card.mjs                   # re-render the link-preview image, site/assets/og.png (needs Chrome)
open site/dist/index.html
```

`site/src/index.html` is the page. The build fills in its markers:

- `<!-- figure anatomy examples/…/spec.json -->` renders a live figure from an example's spec with the skill's own `viz.mjs`.
- `<!-- iso post -->` draws one of the site's pictures with [`site/iso.mjs`](../site/iso.mjs), in the anatomy component's style.
- `/* template: keyed-anatomy */` and `// template: keyed` copy the keyed-figure and anatomy CSS and script from [`template.html`](../skills/buildnotes/assets/template.html), so the live figures behave as they do in a post.

Then it copies every local file the page points at: `site/assets/` from there, `.github/assets/` as `assets/`, and everything else (the example posts and videos) from the repo root. `dev/test/site.test.mjs` builds it into a temp folder.

Link previews: the page's description, Open Graph and Twitter tags come from `SHARE` in `build.mjs`. `og:image` must be an absolute URL, so without `--url` it points at `site/assets/og.png` on GitHub's `main` branch. That image is `site/src/card.html` rendered by `site/card.mjs`: render it again and commit it when the headline or the card figure changes. The favicon is `site/assets/favicon.svg`.

`site/assets/sunny-post-full.webp` is the whole walkthrough-videos post, rendered by headless Chrome at 1100 px wide in light mode and trimmed to its column. Re-make it if that post changes.
