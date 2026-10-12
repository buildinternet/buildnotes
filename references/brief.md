# The story brief

Decide *which* story before deciding how to tell it. The record says what the team worked on; it doesn't say what the post is about. The two are often different: the hardest engineering problem is usually a supporting beat, not the headline.

Write the brief from the evidence first, then confirm it with the author. It sits at the top of `plan.md` and every later step answers to it.

## Zoom out first: find the angle

PRs and issues are a sliver of the story. They record what engineers needed to say to each other, not why a user should care. Before you fill in the brief, step back and look at the work the way a product marketer would: what does this change mean for the people who use it, and why is it worth their attention?

Look beyond the record:
- **The product as users meet it.** Its site, docs, README, pricing or plans page, and the live product (public pages only; never sign in).
- **What came before.** The changelog, earlier posts and docs for this area. What did users already have, and what did they complain about?
- **The category.** How do other tools handle the same job? A familiar pattern ("the way docs platforms push to a search index") makes a feature click. Only use comparisons you can check, and don't knock other products unless the author wants that.

Then run the work through a few lenses. Write a line for each one that applies:
- **The job.** What is the user trying to get done, and what did this take out of their way?
- **Who wins.** Which user, and what changes in their week? Who benefits second-hand (their readers, their team)?
- **Newly possible.** Is something now possible that wasn't before, or is an existing thing faster or easier? The first is the stronger headline.
- **Who holds the pen.** Did control, trust or ownership shift? ("Your changelog says what you wrote, not our reading of your page.")
- **The surprise.** Something that runs against expectations ("once you push, we stop checking").
- **Direction.** What this says about where the product is going (from roadmap issues, follow-ups, what's next).

From those, draft **two or three candidate angles**. Each gets a hook (one sentence someone might repeat to a colleague), who it speaks to, and what it rests on, split into evidence and inference. Recommend one. The author picks in the headline question, with the angles as the options.

**Inference is the job; invention is not.** You may infer implications, context and angles the record never states. You may not present inference as fact about the team: motives, quotes, events, decisions or numbers. Write an implication as what the reader gets ("your release note is in the index minutes after you merge"), not as what the team intended. Anything about intent goes to the author as a question.

## The six fields

**1. Headline.** What can people do now that they couldn't before, in their words. This is the centerpiece the whole post serves.

Default to the capability the user sees, not the mechanism that makes it work. The mechanism leads only when the flavor is a deep dive, the author asks for it, or the mechanism *is* what users touch (an API shape, a CLI command, a file format).

| Mechanism as headline (wrong by default) | Capability as headline |
|---|---|
| Per-branch containers from a pooled scheduler, torn down on merge | Every pull request gets a live preview link your reviewers can click |
| A token bucket per API key, refilled every second | Traffic spikes slow your API calls down instead of failing them |

Warning signs the headline is at the wrong altitude:
- It names an internal object: a token, table, queue, workflow, cron, middleware.
- It describes how, not what for.
- You picked it because it took the most PRs or review threads. Effort is not importance.

**2. Starting point.** What was true before, from the user's side: how people did this, what was slow, missing or fragile. If the feature extends something that already existed, the starting point is that existing thing, not zero.

**3. Endpoint.** What's true now, from the user's side. The post's thesis is the line from starting point to endpoint: "Reviewing a change used to mean pulling the branch and running it yourself; now every pull request gets a live link."

**4. Prior context.** Is this new, or an iteration on something that has been in the product for months or years? List the earlier releases in this area and what has already been announced or explained (changelog entries, docs pages, earlier posts). Covered ground gets one sentence and a link, not a chapter. Sources: the dossier's **Prior work** section (earlier changes to the files this feature modified, plus the changelog files to read), the project's docs and blog, and an explicit search when that list is thin: rerun the gatherer with `--prior "<area terms>"` to list earlier merged PRs in the area. Write each prior-context item with where you found it ("GitHub sources, polled, since spring: CHANGELOG 0.40"), so the author can check it.

**5. Audience.** Technical (developers who will integrate or extend it) or not (users and customers following the product). This sets the flavor and how far down into mechanics the post goes. A non-technical audience gets the mechanism in a sentence, if at all.

**6. Supporting cast and out of frame.** The two to four ideas that serve the headline (each becomes a beat), and the true, interesting things that are not this story. Mechanics live in the supporting cast: a sentence or a short chapter each, framed by what they mean for the user ("each preview gets its own copy of the database, so testing a migration can't break anyone else's"). Out of frame is where the rest goes, and the author may want some of it for a separate post.

## Asking the author

Ask once, in a single message, after gathering and before planning. Up to five questions. Put your proposed answer in each, so the author can confirm with a word and only writes when you're wrong. Use the `AskUserQuestion` tool when it's available: your proposal as the first option, one or two real alternatives after it.

Always confirm:
- **Headline.** Offer your candidate angles as the options, recommended one first: "*Every pull request gets a live preview link*" / "*Review without checking out a branch*" / "*Staging for every change, not one shared box*".
- **Audience.** "Developers who'd configure this for their team, or everyone who reviews changes?"

Ask about these only when the evidence is thin or ambiguous:
- **Starting point and prior context.** "This builds on the staging environments from last spring. Has that been written up already?"
- **Out of frame.** "I'm planning to leave out the machine-pool autoscaling work. Should it get a chapter?"
- **Motive.** What the record can't say: why now, why this approach over the obvious one, what surprised you, what you'd do differently.

Don't ask what you can find: names, dates, numbers, what shipped.

**Using the answers.** Write the author's answers in the team's voice, as part of the story. Don't quote them back ("As we put it, the goal was…"). Quote the author only when they give you a line meant to be quoted.

If the author says to go ahead without questions, or can't be asked, use your proposals, mark each one *assumed* in `plan.md`, and list them with the draft so the author can correct the frame before the prose.

## Notes for the author

While framing you'll find things the author should know that aren't questions: a docs page that says a shipped feature is "coming soon", an issue still open for merged work. Put them under **Notes for the author** in `plan.md` (see *When sources disagree* in [evidence.md](evidence.md)) and include them with the questions; don't spend a question on them.

## In plan.md

```markdown
## Angles
1. Every pull request gets a live preview link. (recommended) For: reviewers and PMs. Evidence: link posted on PR open. Inference: reviews get faster.
2. Review without checking out a branch. For: reviewers. Evidence: same. Inference: non-engineers can review.
3. Staging for every change. For: platform teams. Evidence: per-preview database. Inference: replaces the shared staging queue.

## Brief
- Headline: Every pull request gets a live preview link. (confirmed)
- Start → end: reviewers pulled the branch and ran it locally → they click a link in the PR.
- Prior context: shared staging environments exist since spring and are in the docs; one sentence + link.
- Audience: developers and reviewers on teams that use the product. (assumed)
- Supporting cast: links that appear on their own; a database copy per preview; cleaning up when the PR closes.
- Out of frame: scheduler internals, machine-pool autoscaling, the billing change.
```
