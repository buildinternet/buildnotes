# Modules

A module is a standard, self-contained extra that some readers want and most don't: the PR-by-PR build log, the process stats, the review notes. Modules are **off by default** in every flavor. Include one when the author asks for it, or offer one in a single line when the evidence makes it unusually good ("this feature had a sharp review that changed the design; want a review-notes box?").

Modules keep this kind of detail out of the story. The chapters stay at the reader's level, and anyone who wants the ledger can opt in to a clean, standard block for it. Don't turn ordinary content into modules: chapters, diagrams and code belong to the story and are written fresh each time.

## Placement and rules

- Each module is one `<aside class="module" data-module="name">` placed **after the last chapter and before the footer**. Several modules sit together as an appendix, in the order below.
- `lint.mjs` leaves modules out of the prose word count and the process-detail budget. They still count for safety, and with `--private` their links still fail.
- Generated modules come from `dossier.json`, so their numbers are already sourced. Edit the one-line intro and the `<!-- -->` prompts; don't hand-edit the counts.
- In a private repo, generated modules print PR titles without links. The titles may still describe internal work, so read every row against the safety rule before keeping a build log.

## The menu

| Module | What it shows | How | Fits |
|---|---|---|---|
| `build-log` | Merged changes in order: date, title, size, areas touched | `module.mjs build-log <dossier.json> [--limit 20] [--links none]` | Deep dives; readers who follow the repo |
| `numbers` | Process stats: span, changes merged, lines, files, human review threads | `module.mjs numbers <dossier.json>` | Any flavor, on request |
| `timeline` | Activity by day (never by minute), one line each | `module.mjs timeline <dossier.json>`, then write a few words per day | When the pace is interesting |
| `review-notes` | What review or testing caught, and what changed | By hand, using the template's "heard → changed" list inside the aside | Deep dives; posts about quality or security |
| `how-made` | How the work was done: tools, coding agents, automated reviewers, and what each did | By hand, a short paragraph or list; use the gatherer's agent signals | When the author wants to disclose or discuss process |
| `sources` | The issues, PRs and docs the post drew on | By hand, a linked list. Public repos only | Deep dives; posts that will be cited |

Run the generators as `node <skill-dir>/scripts/module.mjs <name> <work-dir>/evidence/dossier.json` and paste the fragment in.

Two items look like modules but are part of the story, so they aren't on this menu. **Further reading** (docs and product links) belongs in the footer of any flavor. **Try it** (how to start using the feature) belongs in the last chapter of a release story.

## Adding a module to the menu

Add a module only when it is (1) asked for more than once, (2) the same shape every time, and (3) detail that would pull a chapter off altitude. A generated module needs a renderer in `module.mjs` that reads only `dossier.json`; a hand-written module needs a row here saying what goes in it.
