# The story brief

Decide *which* story before deciding how to tell it. The record says what the team worked on; it doesn't say what the post is about. The two are often different: the hardest engineering problem is usually a supporting beat, not the headline.

Write the brief from the evidence first, then confirm it with the author. It sits at the top of `plan.md` and every later step answers to it.

## The six fields

**1. Headline.** What can people do now that they couldn't before, in their words. This is the centerpiece the whole post serves.

Default to the capability the user sees, not the mechanism that makes it work. The mechanism leads only when the flavor is a deep dive, the author asks for it, or the mechanism *is* what users touch (an API shape, a CLI command, a file format).

| Mechanism as headline (wrong by default) | Capability as headline |
|---|---|
| Publish tokens scoped to a single source, minted from a verified domain claim | Push your release notes into Release Notes Index straight from GitHub, with no polling |
| An idempotent claim query guarantees each digest email sends once | Get each collection's weekly digest in your inbox on Monday |

Warning signs the headline is at the wrong altitude:
- It names an internal object: a token, table, queue, workflow, cron, middleware.
- It describes how, not what for.
- You picked it because it took the most PRs or review threads. Effort is not importance.

**2. Starting point.** What was true before, from the user's side: how people did this, what was slow, missing or fragile. If the feature extends something that already existed, the starting point is that existing thing, not zero.

**3. Endpoint.** What's true now, from the user's side. The post's thesis is the line from starting point to endpoint: "You used to wait for us to check your changelog; now your CI pushes it the moment you merge."

**4. Prior context.** Is this new, or an iteration on something that has been in the product for months or years? List the earlier releases in this area and what has already been announced or explained (changelog entries, docs pages, earlier posts). Covered ground gets one sentence and a link, not a chapter. Sources: the dossier's **Prior work** section, the project's CHANGELOG or release notes, its docs, its blog, and `git log --before=<start> -- <hot files>`.

**5. Audience.** Technical (developers who will integrate or extend it) or not (users and customers following the product). This sets the flavor and how far down into mechanics the post goes. A non-technical audience gets the mechanism in a sentence, if at all.

**6. Supporting cast and out of frame.** The two to four ideas that serve the headline (each becomes a beat), and the true, interesting things that are not this story. Mechanics live in the supporting cast: a sentence or a short chapter each, framed by what they mean for the user ("a token can only write to its own source, so a leaked one can't touch anything else"). Out of frame is where the rest goes, and the author may want some of it for a separate post.

## Asking the author

Ask once, in a single message, after gathering and before planning. Up to five questions. Put your proposed answer in each, so the author can confirm with a word and only writes when you're wrong. Use the `AskUserQuestion` tool when it's available: your proposal as the first option, one or two real alternatives after it.

Always confirm:
- **Headline.** "I'd lead with: *push release notes straight from GitHub*. Or is the centerpiece something else?"
- **Audience.** "Developers who'd set this up in CI, or people who follow the product generally?"

Ask about these only when the evidence is thin or ambiguous:
- **Starting point and prior context.** "This builds on the GitHub source type from last spring. Has that been written up already?"
- **Out of frame.** "I'm planning to leave out the token-revocation work. Should it get a chapter?"
- **Motive.** What the record can't say: why now, why this approach over the obvious one, what surprised you, what you'd do differently.

Don't ask what you can find: names, dates, numbers, what shipped.

If the author says to go ahead without questions, or can't be asked, use your proposals, mark each one *assumed* in `plan.md`, and list them with the draft so the author can correct the frame before the prose.

## In plan.md

```markdown
## Brief
- Headline: Push your release notes into Release Notes Index straight from GitHub. (confirmed)
- Start → end: we checked your changelog on a schedule, hours late → your CI pushes it on merge.
- Prior context: GitHub sources (polled) exist since spring; covered in docs, not a post. One sentence + link.
- Audience: developers who maintain a changelog in a repo. (assumed)
- Supporting cast: the one-step Action setup; what a CI token may do (one source, nothing else); what happens when pushes stop.
- Out of frame: device-approval flow internals, CORS hardening, the D1 batching limit.
```
