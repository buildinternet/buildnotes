# Story: shapes, altitude and voice

## Shapes that work

Pick one before choosing beats. Every shape is organized by idea; none is a diary.

- **The problem and the answer.** What was hard or missing for users, what we built, how it works, what it changes. The natural shape for a release story.
- **The constraint.** "We needed X, but Y ruled out the obvious approach." Chapters follow the constraint as it shapes each part of the design. Good for infra, security and performance work.
- **The trace.** Follow one request, record or user action from end to end, one chapter per stage. Good for pipelines and multi-part features. Ryan's anatomy post follows one line from the rules to the screen; it sits between a build story and a deep dive (technical, with real code, yet organized entirely by idea).
- **The rules.** The design is a set of decisions, each answering a failure. Chapters are rules, each opening with the failure. Good for tools and frameworks.
- **The wrong first version.** "We built A; it failed in this way; B is what we learned." Only when the lesson is the point and the record shows a real reversal, and even then tell it as an idea ("one shared staging database meant a single bad migration broke every preview"), not as a sequence of events.

## Choosing beats

Lay out candidate beats from the dossier, then keep the ones that pass all three:

1. **A reader takeaway.** After the chapter, the reader understands something about the feature, its design, or a choice they could make in their own work.
2. **There's evidence.** A doc, a thread, a commit, a run. Not just your inference.
3. **The reader would notice.** Ask what a reader would see differently if this part had gone the other way. A release or build story keeps a beat only when the answer is something users see or do (a page, a link, a limit, a step they skip). A beat whose difference shows only in the service's logs, costs or dashboards goes to the cuts, or to a deep dive, where mechanisms are the subject. One sentence of it can stay inside a reader-facing chapter when it explains what users see ("a link never shows where a file is stored").

Order them so each chapter answers the question the last one raised. Put the most interesting idea no later than the third chapter.

A chapter's shape: the situation in a sentence or two → the idea or decision (and the alternative, briefly) → the evidence (a visual, code, a number) → what it means for the reader or what it leaves open.

## Altitude

The reader knows what the product does. They weren't in the room, don't know the codebase, and don't care which day something merged. Write at the level where a decision makes sense to them.

| Too low (process, play-by-play) | At altitude |
|---|---|
| At 14:56 UTC on 24 September the decision went the other way. The scheduler half merged at 15:33, and the issue was marked done at 15:43. | Previews first shared one staging database. A single bad migration broke everyone's preview, so each preview now gets its own copy. |
| An adversarial review found that the limiter keyed on the `X-Forwarded-For` header, so a client could reset its own limit by changing the header. | Limits follow your API key, not the address a request claims to come from. Changing a header doesn't reset them. |
| Between 17 September and 3 October we merged 14 pull requests adding +9,998 lines across 161 files. | It took about two weeks, most of it spent on one question: what should a customer pay when they downgrade halfway through the month? |
| The handler re-checks `canView()` and `assertAlbumMember()` on every request with no cache. | Every time someone opens a shared album, we check they are still a member. Remove someone, and the link stops working for them on their next visit. |

The left column isn't wrong, and a deep dive may keep one such detail when the mechanism is the point. The right column is the default.

### Iterations are welcome; timestamps aren't

Showing how something got better is part of the story. "Round one", "a later pass", "as it ships" are good labels for a progression: a layout across three iterations, a diagram before and after a fix, an error message as it was rewritten. They tell the reader the work converged, and they cost nothing.

What stays out is the clock and the commit log: "at 10:03 we started with this, then removed it in a later commit". The reader cares *what changed and why*, not when or in which commit.

| Too low | At altitude |
|---|---|
| At 10:03 we shipped the first editor layout; it was removed in a later commit after review. | The first editor put every tool in one long sidebar. By round two the tools were grouped, and the version that ships hides the rare ones behind a More button. |
| Fig. 3. Commit `a1b2c3d`, 24 Sep 14:56 UTC. | Fig. 3. Round one. |

Round labels belong mostly in captions and short connecting sentences. A date may sit in a caption when the gap in time is itself the point ("4 October, round one" / "6 October, as it ships"); otherwise leave it off.

Two quick tests for a paragraph, on top of *earn every detail*: is it about the feature or about the team's week (keep the first)? Does it name an internal artifact (a PR, a function, a ticket) where it could name the idea (name the idea)?

## References

Fewer than you think. The prose never depends on a link.

- **Release story:** links to the docs and the product, in "Further reading". No issues, no PRs.
- **Build story:** a short "Further reading" list at the end at most: public docs, the open-source repo, a design doc if it's public. No references inside the text.
- **Deep dive:** a few key PRs or design docs where a curious engineer would want the source, if the repo is public. Name the thing in the prose ("the change that moved the parser into the shared package") and put the link quietly beside it (`<span class="ref">`).
- **Private repo:** nothing internal, in any flavor. Not issues, PRs, commits, internal docs or dashboards. The post must stand on its own.
- **Ahead of launch:** link public docs that will be current when the post goes out, even if they lag today, and note the lag for the author.

## The opening

The first screen names the problem in the reader's terms and says what was built in one sentence. If it names the things that shipped, make them a list; the headings and contents bar show the route, so don't announce it ("This post covers…"). Ryan's opening is a model: one line of thesis under the title, then a short paragraph that sets up the page.

Don't open with the history of the codebase, a definition, a date, or a question.

## The ending

End on what readers can do now (one way to try it, and the docs for the rest) or on what's next. A command they'll paste goes in a command line (`<div class="cmd">`), which has a copy button ([visuals.md](visuals.md#components)). A post is a starting point: don't tour every way to set the feature up unless the author asks for a guide. No summary of what they just read, and no sign-off ("stay tuned", "more to come", "we can't wait"). A colophon line about how the post was made is optional; use one if the author wants it.

## Voice

Write the way a senior engineer explains their work to a peer over coffee: plain, specific, unhurried.

The default is **plain English, STE-lite**: the useful core of ASD-STE100 Simplified Technical English, without its strict dictionary. It makes posts easier to scan and translate. Bend a rule when the sentence reads worse for it; a post should still sound like a person.

- Sentences of 25 words or fewer; aim for about 15 on average. One idea each.
- Active voice: "the server checks the token", not "the token is checked". Passive is fine when the actor doesn't matter.
- One term per thing. Pick "API key" and keep it; don't drift to "token", "credential" and "secret" for the same object.
- Three or more parallel items become a bulleted list, not a run of sentences. "We added three things. A retry… A queue… And an alert…" is a list pretending to be a paragraph.
- No idioms or figures of speech a translator would stumble on ("escape hatch", "under the hood", "by hand").
- Don't over-correct: keep the connective words ("because", "so", "but") that carry reasoning, and don't add signposts ("This section explains…") to make up for short sentences.

Rewriting for style can change meaning. After any style pass, recheck every claim against the evidence; "we considered X" must not become "we tried X". `lint.mjs` reports sentence length and passive voice; `--ste` applies the full 20-word STE limit when the author asks for strict STE.

Beyond the mechanics:

- Name things by what the reader recognizes. Gloss each internal term once, the first time ("a *preview*, a short-lived copy of your app built from one pull request").
- Specific beats general, about the product: "a shared album link works for 30 days, and only for the people you invited" beats "sharing is secure".
- Say what was hard and what is still imperfect. Readers trust a post that admits a limit.
- Quote a design doc or the record only when its words explain a choice better than yours, never as proof of process. Write the author's answers to your questions in the team's voice; quote the author only when they give you a line meant to be quoted ([brief.md](brief.md#asking-the-author-as-little-as-possible)).

### Name ideas, not identifiers

Code names leak into the text easily, because they are what the record is written in. In the story, describe what a thing does for the reader; put the identifier in the try-it section or a code block, where they'll type it. One identifier in a chapter, glossed, is fine; a chapter strung between them has dropped to the wrong altitude. A deep dive may use more, each glossed once. `lint.mjs` counts inline code in each chapter's paragraphs.

| In the weeds | At altitude |
|---|---|
| Once `flush()` returns without a `ConflictError`, `commit()` writes a new `edit_rev` for the photo. | When your edits reach the server without clashing with someone else's, the app saves them as a new version of the photo. |

### Sound like a person, not a writer

Say what an engineer would say out loud. Words from writing about writing don't belong in the post: "prose", "narrative", "piece", "beat", "this post covers", "the reader" (say "you"). Neither does this skill's own vocabulary, which leaks in easily: "altitude", "flavor", "dossier", "chapter" in the running text. Prefer the plain word: "text" or "the write-up" over "prose", "what shipped" over "the record". (These docs talk about "the reader"; the post talks to "you".)

| Writerly | Plain |
|---|---|
| A status update is prose. Prose is good at saying what went wrong, but it is slow to scan. | A status update explains what went wrong, but it's a lot to read when you just want to know if you're affected. |
| This post covers how each one works and the choices that shaped it. | *(cut: the headings already say this)* |

### Make it easy to scan

Most people skim first. Give them handholds:

- **Bold the key idea.** In a chapter that turns on a decision, bold the one sentence (or the opening phrase) that states it, so a skimmer gets the decision without the paragraph. About one per chapter; a page where everything is bold has no emphasis.
- **Bold lead-ins on list items** when each item is a named decision or part: "**Per key, not per address.** Each limit belongs to an API key…".
- **Lists for what you added, chose or ruled out.**
- **Short paragraphs.** Three or four sentences. A paragraph that makes two points becomes two paragraphs.
- **A finding, sometimes.** When a chapter discovers something (a rule that held, a number that surprised), close it with a `finding`: one sentence a reader would repeat to a colleague. "Counting releases rewards busy weeks; counting impact rewards big ones." It isn't a summary of the chapter, and most chapters don't have one. At most one per chapter (lint warns at two).
- **Margin notes for asides.** A definition, a unit, where a number came from: put it in a `<span class="sidenote">` at the end of its paragraph instead of a parenthesis or a footnote. It sits under the paragraph on a phone and in the margin on a wide screen. A note the argument needs belongs in the paragraph; lint warns past 30 words.

`lint.mjs` reports bold and list counts per chapter, flags a sentence that announces a count ("three things") with no list after it, and flags the most common writerly words ("prose", "narrative", "the reader", "altitude", "dossier", "this post covers").

### Banned

These read as generated or as marketing. Rewrite on sight.

- Hype: comprehensive, robust, seamless, powerful, blazing, world-class, game-changing, cutting-edge, leverage, unlock (as a verb for features), supercharge, elevate, delve, journey, "deep dive" in the post.
- Grading instead of stating: doubling down, leap forward, transformative, next-generation, continues to evolve, substantial improvements, exciting new; and utilize, facilitate for use, help. State what shipped; don't grade it.
- Filler for what changed: various improvements, stability improvements, quality improvements, "bug fixes and improvements". Name the change.
- Mannered devices: "not X, but Y" framing, colon-then-reveal sentences, rhetorical questions as section openers, "Here's the thing", "It turns out", "Enter: …", em-dash asides more than once a section.
- Throat-clearing: "In this post we will…", "This post covers…", "It's worth noting", "Let's take a look", "As mentioned above".
- Fake precision: "~40%", "roughly 10x" without a source.
- Emoji as section markers.

## Length

| Flavor | Words (ceiling) | Chapters | Visuals | Code blocks |
|---|---|---|---|---|
| Note (thin subject) | about 400 | none | 0–1 | 0–1 |
| Release story | 1,200 | 2–4 | 1–3 | 0–1 |
| Build story | 2,500 | 4–6 | 3–5 | 0–3 |
| Deep dive | none | 6–12 | one per chapter, at most | as needed |

Words count running text only, not code, terminals, captions, diagrams or end matter (`lint.mjs` counts this way).

The word counts are ceilings and the other columns are guides; none of them is a floor. A post that lands short after cutting the weeds is finished; never pad to reach a number. If the draft runs long, cut beats, not sentences. Three ideas told well beat seven told thinly.
