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

`site/` builds the project's one-page website into `site/dist/` (git-ignored), a folder of static files any host can serve. It lives at [buildnotes.releases.sh](https://buildnotes.releases.sh).

```bash
node site/build.mjs                  # or: npm run site
node site/build.mjs --url https://buildnotes.releases.sh   # canonical link, og:url, og:image there
node site/card.mjs                   # re-render the link-preview images in site/assets (needs Chrome)
open site/dist/index.html
npm run site:dev                     # build, then serve it as the Worker does at http://localhost:8787
# or, in Claude Code desktop, the "site" entry in .claude/launch.json does the same (autoPort: it moves if 8787 is taken)
npm run deploy                       # build, then deploy (wrangler login, Build Internet account)
```

Hosting: [`wrangler.jsonc`](../wrangler.jsonc) is a Cloudflare Worker that serves `site/dist` as static assets on the `buildnotes.releases.sh` custom domain. Its only script, [`site/worker.mjs`](../site/worker.mjs), runs first for the example videos alone (`run_worker_first`) to answer HTTP Range requests, which the asset layer ignores; without it a browser cannot scrub a video. The `releases.sh` zone is on the same Cloudflare account, so the domain needs no DNS records by hand. `.html` URLs redirect to the extensionless path (`post.html` → `post`), and relative links still resolve.

Workers Builds deploys it on every push to `main`. The `buildnotes-site` Worker is connected to this repo in the Cloudflare dashboard (Workers & Pages → buildnotes-site → Settings → Build) with:

- Build command: `node site/build.mjs --url https://buildnotes.releases.sh`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Build variable `NODE_VERSION`: `22`
- Builds for non-production branches: off (preview URLs are off in `wrangler.jsonc`)
- Build watch paths: `site/*`, `examples/*`, `skills/buildnotes/assets/*`, `skills/buildnotes/scripts/viz*`, `.github/assets/*`, `wrangler.jsonc`

The example pages share the home page's footer: `wrapPost` copies the footer CSS block from `src/index.html` with the light palette inlined, scoped under `.site-footer`.

`site/src/index.html` is the page. The build fills in its markers:

- `<!-- figure anatomy examples/…/spec.json -->` renders a live figure from an example's spec with the skill's own `viz.mjs`.
- `<!-- iso post -->` draws one of the site's pictures with [`site/iso.mjs`](../site/iso.mjs), in the anatomy component's style.
- `/* template: keyed-anatomy */` and `// template: keyed` copy the keyed-figure and anatomy CSS and script from [`template.html`](../skills/buildnotes/assets/template.html), so the live figures behave as they do in a post.

Then it copies every local file the page points at: `site/assets/` from there, `.github/assets/` as `assets/`, and everything else from the repo root. Every example in `EXAMPLES` is served whether the page links it or not, as a folder: `examples/<slug>/` (its `index.html` is the post named by `file`, so the digests example is the field-notes page) with `motion.mp4` beside it, and `examples/` lists them all, built from `site/src/examples.html` with the home page's stylesheet. A post is not copied as is: the committed posts are written for the Artifact viewer, which wraps them in a document, so `wrapPost` adds the doctype, charset and viewport, forces the light theme, and puts a site shell around the post: a bar naming the example with a way back, and a footer with the video, the plan and the other examples. `dev/test/site.test.mjs` builds it into a temp folder.

Link previews: the page's description, Open Graph and Twitter tags come from `SHARE` in `build.mjs`. `og:image` must be an absolute URL, so without `--url` it points at `site/assets/og.png` on GitHub's `main` branch. That image is `site/src/card.html` rendered by `site/card.mjs`, which also renders one `site/assets/og-<slug>.png` per example from `site/src/card-example.html` (the product, the post's headline and the example's `image`): render them again and commit them when a headline or a picture changes. The favicon is `site/assets/favicon.svg`. Each example page gets its own tags from its `EXAMPLES` entry (an article titled by product and name, the blurb as description, its card as the picture), with a canonical link and `og:url` when built with `--url`.

`site/assets/sunny-post-full.webp` is the whole sunny-walkthrough-videos post, rendered by headless Chrome at 1100 px wide in light mode and trimmed to its column. Re-make it if that post changes.

### Promo video

`site/promo/` makes the 40-second promo for social posts: you point the agent at one Sunny feature, it does the rest (the site's "how it works" drawing), and out come the post and the video; then what buildnotes makes, and the install command. It is drawn in the skill's own output styles: it opens and closes on the motion cut's blue title card, and in between it is the field-notes page, marked up in red pen.

```bash
node site/promo/build.mjs            # site/promo/dist/promo.html (git-ignored); open it to watch, ?t=12 holds one moment
node site/promo/build.mjs --mp4      # also site/assets/promo.mp4, 1920 × 1080 at 30 fps (Chrome and ffmpeg; a few minutes)
node site/promo/build.mjs --poster   # also site/assets/promo.png, the closing card
```

[`site/promo/promo.html`](../site/promo/promo.html) is the page. Every frame is computed from the clock, so the skill's own `export.mjs` steps it into the MP4. Its drawings are `site/iso.mjs`, inlined; its figures are the walkthrough-videos example's own (the camera path and the keyed frame); and the video scene plays highlights of `examples/sunny-walkthrough-videos/motion.mp4`, cut into frames with `ffmpeg` (`CLIPS` and `THUMBS` in `build.mjs`). Every number on screen comes from that example: its plan, its lint summary and its cut. When the headline or the install command changes on the site, change it here too, then export again and commit the MP4.
