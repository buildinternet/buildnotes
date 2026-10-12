# The story brief

Decide *which* story before deciding how to tell it. The record says what the team worked on; it doesn't say what the post is about. The two are often different: the hardest engineering problem is usually a supporting beat, not the headline.

Write the brief from the evidence and your read of the product. It sits at the top of `plan.md`, and every later step answers to it.

## Zoom out first: find the angle

PRs and issues are a sliver of the story. They record what engineers needed to say to each other, not why a user should care. Before you fill in the brief, step back and look at the work the way a product marketer would: what does this change mean for the people who use it, and why is it worth their attention?

Look beyond the record:
- **The product as users meet it.** Its site, docs, README, pricing or plans page, and the live product (public pages only; never sign in).
- **What came before.** The changelog, earlier posts and docs for this area. What did users already have, and what did they complain about?
- **The category.** How do other tools handle the same job? A familiar pattern ("the way hosting platforms give every branch its own URL") makes a feature click. Only use comparisons you can check, and don't knock other products unless the author wants that.

Then run the work through a few lenses. Write a line for each one that applies:
- **The job.** What is the user trying to get done, and what did this take out of their way?
- **Who wins.** Which user, and what changes in their week? Who benefits second-hand (their readers, their team)?
- **Newly possible.** Is something now possible that wasn't before, or is an existing thing faster or easier? The first is the stronger headline.
- **Who holds the pen.** Did control, trust or ownership shift? ("Your rate limits live in your own config, not in a support ticket.")
- **The surprise.** Something that runs against expectations ("previews start faster because we build less of your app, not more").
- **Direction.** What this says about where the product is going (from roadmap issues, follow-ups, what's next).

From those, draft **two or three candidate angles**. Each gets a hook (one sentence someone might repeat to a colleague), who it speaks to, and what it rests on, split into evidence and inference. Recommend one. The angles become the options of a question only when two are too close to call (see below).

**What leads, and what's cut.** When the work holds several changes, rank them for the reader. Lead with the highest:
1. A breaking change, a changed default or something removed. Check the feature PRs for a default that flipped: "added a setting for X" often means "X is now off unless you turn it on", and that is the news.
2. Security and data-loss fixes.
3. A new capability.
4. A fix to something users hit, then polish.

Then apply the reader test: **they use the product; they don't run it.** Would someone who never signs in as an operator or admin notice this change? If not, it's out of frame. "Operator" means the people who run the service. A customer's own admins (the owner of a workspace, an org admin) are users, and features for them are in frame. Out of frame: admin views, internal dashboards, migrations (describe the feature a migration enables, not the migration), refactors, and anything still behind a flag that hasn't shipped. **The exception is a post about the engineering.** In a deep dive, or when the author asks for a technical or engineering post, the internals, the operator tooling and the trade-offs behind them can be the subject; size the detail to that reader instead.

**Inference is the job; invention is not.** You may infer implications, context and angles the record never states. You may not present inference as fact about the team: motives, quotes, events, decisions or numbers. Write an implication as what the reader gets ("a reviewer can click the change a minute after you push"), not as what the team intended. Describe only what the record shows the change does; a reason it was built, or a benefit nobody wrote down, stays out of the post. Anything about intent goes on the open questions.

## The six fields

**1. Headline.** What can people do now that they couldn't before, in their words. This is the centerpiece the whole post serves. It is the capability the user sees, not the mechanism that makes it work, unless the flavor is a deep dive, the author asks, or the mechanism *is* what users touch (an API shape, a CLI command, a file format).

| Mechanism as headline (wrong by default) | Capability as headline |
|---|---|
| Per-branch containers from a pooled scheduler, torn down on merge | Every pull request gets a live preview link your reviewers can click |
| A token bucket per API key, refilled every second | Traffic spikes slow your API calls down instead of failing them |

Warning signs the headline is at the wrong altitude:
- It names an internal object: a token, table, queue, workflow, cron, middleware.
- It describes how, not what for.
- You picked it because it took the most PRs or review threads. Effort is not importance.

**2. Starting point.** What was true before, from the user's side: how people did this, what was slow, missing or fragile. If the feature extends something that already existed, the starting point is that existing thing, not zero.

**3. Endpoint.** What's true now, from the user's side. The thesis in `plan.md` is the line from starting point to endpoint: "Reviewing a change used to mean pulling the branch and running it yourself; now every pull request gets a live link."

**4. Prior context.** Is this new, or an iteration on something that has been in the product for months or years? List the earlier releases in this area and what has already been announced or explained (changelog entries, docs pages, earlier posts). Covered ground gets one sentence and a link, not a chapter. Sources: the dossier's **Prior work** section (earlier changes to the files this feature modified, plus the changelog files to read), the project's docs and blog, and an explicit search when that list is thin: rerun the gatherer with `--prior "<area terms>"` to list earlier merged PRs in the area. Write each prior-context item with where you found it ("shared staging environment, since spring: CHANGELOG 0.40, docs page 'Staging'"), so the author can check it.

**5. Audience.** Technical (developers who will integrate or extend it) or not (users and customers following the product). This sets the flavor and how far down into mechanics the post goes. A non-technical audience gets the mechanism in a sentence, if at all.

**6. Supporting cast and out of frame.** The two to four ideas that serve the headline (each becomes a beat), and the true, interesting things that are not this story. Mechanics live in the supporting cast: a sentence or a short chapter each, framed by what they mean for the user ("each preview gets its own copy of the database, so testing a migration can't break anyone else's"). Out of frame is where the rest goes, and the author may want some of it for a separate post.

## Asking the author: as little as possible

The brief's fields are what *you* need confidence in, not a form for the author. Most you can infer from the evidence and the product. Every question costs the author attention, and a skill that opens with a quiz is one people stop using. Default to deciding and moving on.

**Rate each field** as you draft it: *sure* (the evidence says so), *likely* (a safe inference), or *guess*. Then:

- **Sure or likely: decide.** Mark it *assumed* in `plan.md` if it's an inference. Don't ask.
- **A guess that changes the shape of the post: ask.** In practice that's the headline when two angles are genuinely close, or the audience when it could reasonably go either way. Those decide what the whole post is about; a wrong guess costs a rewrite.
- **The headline is usually not a question.** If one angle is clearly the strongest (it's the thing that's newly possible, or the evidence backs it far better), lead with it and name the runner-up in the frame statement ("say if you'd rather lead with X"). That gives the author the same chance to redirect without a question. Ask only when you would honestly flip a coin.
- **A guess that only changes a sentence: don't ask.** Write around it (leave the claim out, or state only what the evidence shows) and put it on the open questions.
- **Motive** (why now, why this approach) is never worth blocking on. Use it if the author offers it; otherwise describe the problem the work solves, which the evidence does show.

**The budget.** Zero questions is a good outcome. When you do ask, it's one message, rarely more than two questions, each with your recommended answer first so the author can reply with a word. Use the `AskUserQuestion` tool when it's available. Never ask what you can find: names, dates, numbers, what shipped.

**Say the frame, then keep going.** Whether or not you ask anything, tell the author the frame in two or three lines before you plan: the angle you're leading with, the audience, and anything notable you're leaving out. Then carry on. They can redirect you at that point or at the draft; you don't need to wait for a reply unless you asked a question.

> Leading with *every pull request gets a live preview link*, for reviewers and the developers who set it up. Leaving out the scheduler internals. Say if you'd rather lead with the per-preview databases.

**After the draft.** Deliver at most three open questions with the draft, the ones that would change a claim, as a short list of what would make it stronger ("if you can share why this shipped now, the opening gets a better first line"), not as questions blocking the work.

**Using the answers.** Write the author's answers in the team's voice, as part of the story. Don't quote them back ("As we put it, the goal was…"). Quote the author only when they give you a line meant to be quoted.

If the author has said to go ahead without questions, or can't be asked, ask nothing: decide every field, mark inferences *assumed*, and list them with the draft.

**Notes for the author** are not questions: a docs page that says a shipped feature is "coming soon", an issue still open for merged work. List them in `plan.md` (see [evidence.md](evidence.md#when-sources-disagree)) and send them with the draft; don't spend a question on them.

## In plan.md

```markdown
## Angles
1. Every pull request gets a live preview link. (recommended) For: reviewers and PMs. Evidence: link posted on PR open. Inference: reviews get faster.
2. Review without checking out a branch. For: reviewers. Evidence: same. Inference: non-engineers can review.
3. Staging for every change. For: platform teams. Evidence: per-preview database. Inference: replaces the shared staging queue.

## Brief
- Headline: Every pull request gets a live preview link. (sure)
- Start → end: reviewers pulled the branch and ran it locally → they click a link in the PR.
- Prior context: shared staging environments exist since spring and are in the docs; one sentence + link.
- Audience: developers and reviewers on teams that use the product. (assumed)
- Supporting cast: links that appear on their own; a database copy per preview; cleaning up when the PR closes.
- Out of frame: scheduler internals, machine-pool autoscaling, the billing change.
```
