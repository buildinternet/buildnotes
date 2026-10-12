# Story: shapes, altitude and voice

## Shapes that work

Pick one before choosing beats. Every shape is organized by idea; none is a diary.

- **The problem and the answer.** What was hard or missing for users, what we built, how it works, what it changes. The natural shape for a release story.
- **The constraint.** "We needed X, but Y ruled out the obvious approach." Chapters follow the constraint as it shapes each part of the design. Good for infra, security and performance work.
- **The trace.** Follow one request, record or user action from end to end, one chapter per stage. Good for pipelines and multi-part features. Ryan's anatomy post follows one line from the rules to the screen.
- **The rules.** The design is a set of decisions, each answering a failure. Chapters are rules, each opening with the failure. Good for tools and frameworks.
- **The wrong first version.** "We built A; it failed in this way; B is what we learned." Only when the lesson is the point and the record shows a real reversal, and even then tell it as an idea ("sharing the login session gave the CLI more power than the user approved"), not as a sequence of events.

## Choosing beats

Lay out candidate beats from the dossier, then keep the ones that pass all three:

1. **A reader takeaway.** After the chapter, the reader understands something about the feature, its design, or a choice they could make in their own work.
2. **There's evidence.** A doc, a thread, a commit, a run. Not just your inference.
3. **It fits the flavor.** A release story keeps beats about what users can do; a deep dive keeps beats about mechanisms.

Order them so each chapter answers the question the last one raised. Put the most interesting idea no later than the third chapter.

A chapter's shape: the situation in a sentence or two → the idea or decision (and the alternative, briefly) → the evidence (a visual, code, a number) → what it means for the reader or what it leaves open.

## Altitude

The reader knows what the product does. They weren't in the room, don't know the codebase, and don't care which day something merged. Write at the level where a decision makes sense to them.

| Too low (process, play-by-play) | At altitude |
|---|---|
| At 14:56 UTC on 24 September the decision went the other way. The API half merged at 15:33, and the issue was marked done at 15:43. | We first let the CLI reuse its login session to mint tokens. That session could do far more than the approval screen said, so we replaced it with a one-time approval for each action. |
| A Codex adversarial review found that the credentialed CORS allow-list reflects any subdomain, so a compromised sibling origin could mint a token. | Minting a token only works from our own site. A request from any other origin, even one of our subdomains, is refused. |
| Between 17 September and 3 October we merged 14 pull requests adding +9,998 lines across 161 files. | It took about two weeks, most of it spent on one question: what should a token in someone else's CI be allowed to do? |
| The handler re-checks `isPublishTokenWrite()` and `assertPublishGrant()` on every request with no cache. | Every publish re-checks that you still own the domain. End your claim, and the token stops working on its next use. |

The left column isn't wrong, and a deep dive may keep one such detail when the mechanism is the point. The right column is the default.

### Iterations are welcome; timestamps aren't

Showing how something got better is part of the story. "Round one", "a later pass", "as it ships" are good labels for a progression: a layout across three iterations, a diagram before and after a fix, an error message as it was rewritten. They tell the reader the work converged, and they cost nothing.

What stays out is the clock and the commit log: "at 10:03 we started with this, then removed it in a later commit". The reader cares *what changed and why*, not when or in which commit.

| Too low | At altitude |
|---|---|
| At 10:03 we shipped the first layout; it was removed in a later commit after review. | The first layout put every chapter on one long page. By the second round it had a contents bar, and the version that shipped added numbered chapters. |
| Fig. 3. Commit `a1b2c3d`, 24 Sep 14:56 UTC. | Fig. 3. Round one. |

Round labels belong mostly in captions and short connecting sentences. A date may sit in a caption when the gap in time is itself the point ("4 October, round one" / "6 October, as it ships"); otherwise leave it off.

Tests for a paragraph:

- Would the reader miss this if it were gone? If not, cut it.
- Is this about the feature, or about the team's week? Keep the first.
- Does it name an internal artifact (a PR, a function, a ticket) where it could name the idea? Name the idea.

## References

Fewer than you think. The prose never depends on a link.

- **Release story:** links to the docs and the product. No issues, no PRs.
- **Build story:** a short "Further reading" list at the end at most: public docs, the open-source repo, a design doc if it's public. No references inside the prose.
- **Deep dive:** a few key PRs or design docs where a curious engineer would want the source, if the repo is public. Name the thing in the prose ("the change that moved the parser into the shared package") and put the link quietly beside it (`<span class="ref">`).
- **Private repo:** nothing internal, in any flavor. Not issues, PRs, commits, internal docs or dashboards. The post must stand on its own.

## The opening

The first screen names the problem in the reader's terms, says what was built in one sentence, and says what the post will cover. Ryan's opening is a model: one line of thesis under the title, then a paragraph that tells you the route the page takes.

Don't open with the history of the codebase, a definition, a date, or a question.

## The ending

End on what readers can do now (try it, read the docs) or on what's next. No summary of what they just read. A colophon line about how the post was made is optional; use one if the author wants it.

## Voice

Write the way a senior engineer explains their work to a peer over coffee: plain, specific, unhurried.

The default is **plain English, STE-lite**: the useful core of ASD-STE100 Simplified Technical English, without its strict dictionary. It makes posts easier to scan and translate. Bend a rule when the sentence reads worse for it; a post should still sound like a person.

- Sentences of 25 words or fewer; aim for about 15 on average. One idea each.
- Active voice: "the server checks the token", not "the token is checked". Passive is fine when the actor doesn't matter.
- One term per thing. Pick "publish token" and keep it; don't drift to "credential", "key" and "secret" for the same object.
- Three or more parallel items become a bulleted list, not a run of sentences. "We added three things. A card… A replay… And an email…" is a list pretending to be a paragraph.
- No idioms or figures of speech a translator would stumble on ("escape hatch", "under the hood", "by hand").
- Don't over-correct: keep the connective words ("because", "so", "but") that carry reasoning, and don't add signposts ("This section explains…") to make up for short sentences.

Rewriting for style can change meaning. After any style pass, recheck every claim against the evidence; "we considered X" must not become "we tried X". `lint.mjs` reports sentence length and passive voice; `--ste` applies the full 20-word STE limit when the author asks for strict STE.

Beyond the mechanics:

- Name things by what the reader recognizes. Gloss each internal term once, the first time ("a *push-fed* source, one its owner publishes to directly").
- Specific beats general, about the product: "a token can write to one source and nothing else" beats "tokens are tightly scoped".
- Say what was hard and what is still imperfect. Readers trust a post that admits a limit.
- When the author's own words explain a choice better than yours (an answer to your questions, a line from a design doc), quote them. Quote the record only for its reasoning, never as proof of process.

### Name ideas, not identifiers

Code names leak into prose easily, because they are what the record is written in. In the story, describe what a thing does for the reader; put the identifier in the try-it section or a code block, where they'll type it. One identifier in a chapter, glossed, is fine; a chapter strung between them has dropped to the wrong altitude. `lint.mjs` counts inline code in each chapter's paragraphs.

| In the weeds | At altitude |
|---|---|
| Call `render_view` with `view: "wall"` and a `wallId` after `render_plan` returns no `layoutCheck` problems. | When the plan looks clean, the agent looks straight at each wall to check heights a plan can't show. |

### Sound like a person, not a writer

Say what an engineer would say out loud. Words from writing about writing don't belong in the post: "prose", "narrative", "piece", "beat", "this post covers", "the reader" (say "you"). Neither does this skill's own vocabulary, which leaks in easily: "altitude", "flavor", "dossier", "chapter" in the running text. Prefer the plain word: "text" or "the write-up" over "prose", "what shipped" over "the record".

| Writerly | Plain |
|---|---|
| A digest is prose. Prose is good at saying why a release matters, but it is slow to scan. | A digest explains why each release matters, but it's a lot to read when you just want the highlights. |
| This post covers how each one works and the choices that shaped it. | *(cut: the headings already say this)* |

### Make it easy to scan

Most people skim first. Give them handholds:

- **Bold the key idea.** In a chapter that turns on a decision, bold the one sentence (or the opening phrase) that states it, so a skimmer gets the decision without the paragraph. About one per chapter; a page where everything is bold has no emphasis.
- **Bold lead-ins on list items** when each item is a named decision or part: "**Days, not hours.** Each release belongs to a day…".
- **Lists for what you added, chose or ruled out.** The opening especially: if it names the things that shipped, list them.
- **Short paragraphs.** Three or four sentences. A paragraph that makes two points becomes two paragraphs.

`lint.mjs` reports bold and list counts per chapter, flags a sentence that announces a count ("three things") with no list after it, and flags the writerly words above.

### Banned

These read as generated or as marketing. Rewrite on sight.

- Hype: comprehensive, robust, seamless, powerful, blazing, world-class, game-changing, cutting-edge, leverage, unlock (as a verb for features), supercharge, elevate, delve, journey, "deep dive" in the prose.
- Mannered devices: "not X, but Y" framing, colon-then-reveal sentences, rhetorical questions as section openers, "Here's the thing", "It turns out", "Enter: …", em-dash asides more than once a section.
- Throat-clearing: "In this post we will…", "This post covers…", "It's worth noting", "Let's take a look", "As mentioned above".
- Fake precision: "~40%", "roughly 10x" without a source.
- Emoji as section markers.

## Length

| Flavor | Words | Chapters | Visuals | Code blocks |
|---|---|---|---|---|
| Note (thin subject) | up to ~400, no minimum | none | 0–1 | 0–1 |
| Release story | up to 1,200 | 2–4 | 1–3 | 0–1 |
| Build story | up to 2,500 | 4–6 | 3–5 | 0–3 |
| Deep dive | 3,000+ | 6–12 | one per chapter | as needed |

Words count prose only, not code, terminals, captions, diagrams or end matter (`lint.mjs` counts this way). Code and terminal blocks are evidence, not visuals.

The ranges are guides, not floors. A post that lands short after cutting the weeds is finished; never pad to reach a number. If the draft runs long, cut beats, not sentences. Three ideas told well beat seven told thinly.
