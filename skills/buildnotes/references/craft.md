# Craft

How a post comes to read as written by someone with taste rather than assembled from the record. Every rule here came from a draft that was rejected or approved. The rules in SKILL.md say what a post must not get wrong; this file says what makes it good.

## Contents
1. What "crafted" means
2. Anti-patterns
3. Titles and headings
4. Naming the product
5. The hand-off

## 1. What "crafted" means

1. **The reader is the subject.** The title, the dek and the first screen are about what the reader can now do or now has. Not about us, and not about the product.
2. **One idea, held.** Every chapter serves the headline. A true, interesting thing that serves something else goes out of frame.
3. **Specific beats impressive.** A sentence someone wrote for an alert ("SSO security patches") does more than "powerful, flexible matching".
4. **Quiet confidence.** No hype, no applause for ourselves, no naming ourselves to sound important. The work speaks; we explain it.
5. **Light on the author's time.** The draft arrives finished, with two or three questions that would make it better, not a to-do list.

## 2. Anti-patterns

Each of these was in a draft that got sent back:

- **Naming yourself in the title.** "Tell Releases what you care about." In a feed of release notes where every title names its own company ("Check out Cloudflare billing", "Follow alerts from Cloudflare's latest products"), the name stops carrying meaning by the third one and starts to read as a logo stamped on every line. Write the title about what the reader gets ([section 3](#3-titles-and-headings)).
- **The product as the subject of every sentence.** "Releases reads…", "Releases now sends…", "Releases keeps…". Name it once where a newcomer needs it, then say "it", "we", or the feature's own name ([section 4](#4-naming-the-product)).
- **A calculated number dressed as a measurement.** An agent's arithmetic ("30 candidate alerts take 3 calls instead of 30") drawn as a before/after `delta`, with "(example)" in small print. The component says "we measured this"; the reader believes it. Put worked examples in a sentence, and keep measurement components for numbers someone measured.
- **The question list as the ending.** Five open questions and three notes for the author with every draft. Each was fair; together they hand the author a to-do list. Pick the few that change the post ([section 5](#5-the-hand-off)).
- **The setup tour.** A closing chapter that walked through every way in: a menu on the org page, an agent tool's optional argument, two CLI flags and a trimmed help screen. A post is a starting point. Show one way to try it, link the docs, and stop.
- **A motive stated as fact.** "There's no fallback model because a score from another model wouldn't mean the same thing." Plausible, and nowhere in the record. Say what the change does; a reason or a benefit goes in only when the record states it. Otherwise it's an open question, or it goes.

## 3. Titles and headings

The title says plainly what shipped, in the reader's words: "Release webhooks for workspaces". The dek (the line under it) and the opening are where the angle and the play go: why it matters, the hook a reader would repeat. A clever line in the title makes the reader work out what was released.

- **No product or company name in the title or a chapter heading.** The page, the site and the byline already say whose it is.
- **The feed test.** Put the title in a list of twenty titles from other teams. If it only stands out because it names you, rewrite it. If it would read just as well with your name deleted, delete it.
- **The reader test.** Someone who sees only the title should know what changed. "Various improvements" and a version number fail.
- **The outcome, not a generic verb.** Lead with the specific thing and its new state. "Worktrees no longer drop unpushed commits" beats "Fixes worktree bug dropping unpushed commits". No filler ("a number of", "various").
- **Headings make the argument.** A reader skimming only the headings should learn what shipped and why. "One call per release" passes; "A smarter approach", "Overview" and "Background" don't. A heading says what a thing does, not its code name or version; in a deep dive, or a post the author asked to be about the engineering, a heading may name the mechanism when the mechanism is the subject.
- **Plain words, everyday order.** Write a heading as a phrase a person would say: "Labels sit next to the parts", not "Read the name where the part is". Aim for the reading level of a good product page; if a heading needs a second read, rewrite it.
- **Name the feature, not the example.** A title tied to the one place it showed up ("Jump to any chapter of the example videos") reads narrower than the change. Name what the reader gets wherever they meet it.
- **Short.** About eight words for the title, fewer for headings. Cut the subtitle-after-a-colon formula unless both halves earn their place.

From real drafts:

| Draft | Verdict |
|---|---|
| Tell Releases what you care about | Sent back: the product is the second word, and it's the subject of the reader's sentence. |
| Shared release channels that survive a teammate leaving | Sent back: a good dek, but as a title it makes you work out what shipped. "Release webhooks for workspaces" says it. |
| Fast pages that still update when a release lands | Kept: the gain and the catch (fast, yet current), no name in it. |
| Digests, collections and changelogs now load fast | Kept: the reader's own pages, named plainly. |

## 4. Naming the product

- **Once, where a newcomer needs it.** The dek or the first paragraph, so someone arriving from a link knows what this is. On the product's own blog or changelog, where the site already says it, you may not need it at all.
- **Then pronouns and the feature's name.** "It", "we", "interest alerts". Don't repeat the product name to keep the reader oriented; the page does that.
- **"We" for decisions, not applause.** "We chose the smaller pool" carries a decision. "We're excited to announce" carries nothing.
- **Other products by name when they matter.** A framework, a competitor or a dependency is named where the reader needs it (Next.js in a caching post). That is information, not self-promotion.

`lint.mjs --product "Name"` flags the name in the title and headings, flags sentences that open with it as the subject, and counts it in the prose.

## 5. The hand-off

The author reads the draft first and the list second, so keep the list short enough to act on in one sitting.

- **At most three open questions**, the ones whose answer would change a claim the post makes or wants to make. Order them by impact. Each fits on one line and says what the post does without an answer ("Why only followed releases? The post gives the effect, not the motive.").
- **A gap that wouldn't change the post isn't a question.** Leave the claim out (it is already in Cuts) and move on.
- **At most two notes for the author**, and only things they would act on: docs that contradict the shipped feature, an issue left open for finished work. Drop the rest.
- **The full reasoning stays in `plan.md`.** The message that goes with the link carries only the short list.

Which kinds survive the cut:

| Kind | Keep it? |
|---|---|
| Why the team chose the design a chapter turns on | Yes: the answer changes that chapter's turn. |
| Whether the post may name what's next | Yes: it changes the ending. |
| Usage numbers the post makes no claim about | No: nice to have; the post stands without them. |
| A flag or rollout state the changelog already settles | No: at most a note. |
| The reasoning behind a behaviour the post describes from the code | No: the chapter stands on what the code does. |
