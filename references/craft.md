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

## 3. Titles and headings

The title names the capability in the reader's words. The dek (the line under it) says why it matters or how it works, in one sentence.

- **No product or company name in the title or a chapter heading.** The page, the site and the byline already say whose it is.
- **The feed test.** Put the title in a list of twenty titles from other teams. If it only stands out because it names you, rewrite it. If it would read just as well with your name deleted, delete it.
- **Concrete over clever.** A reader skimming headings should learn the post's argument from them alone. "One call per release" passes; "A smarter approach" doesn't.
- **Short.** About eight words for the title, fewer for headings. Cut the subtitle-after-a-colon formula unless both halves earn their place.

From real drafts:

| Draft | Verdict |
|---|---|
| Tell Releases what you care about | Sent back: the product is the second word. Try "Write a sentence, get the releases that match it". |
| Fast pages that still update when a release lands | Kept: the gain and the catch (fast, yet current), no name in it. |
| Digests, collections and changelogs now load fast | Kept: the reader's own pages, named plainly. |

## 4. Naming the product

- **Once, where a newcomer needs it.** The dek or the first paragraph, so someone arriving from a link knows what this is. On the product's own blog or changelog, where the site already says it, you may not need it at all.
- **Then pronouns and the feature's name.** "It", "we", "interest alerts". Don't repeat the product name to keep the reader oriented; the page does that.
- **"We" for decisions, not applause.** "We chose the smaller pool" carries a decision. "We're excited to announce" carries nothing.
- **Other products by name when they matter.** A framework, a competitor or a dependency is named where the reader needs it (Next.js in a caching post). That is information, not self-promotion.

`lint.mjs --product "Name"` flags the name in the title, dek and headings, and counts it in the prose.

## 5. The hand-off

The author reads the draft first and the list second, so keep the list short enough to act on in one sitting.

- **At most three open questions**, the ones whose answer would change a claim the post makes or wants to make. Order them by impact. Each fits on one line and says what the post does without an answer ("Why only followed releases? The post gives the effect, not the motive.").
- **A gap that wouldn't change the post isn't a question.** Leave the claim out (it is already in Cuts) and move on.
- **At most two notes for the author**, and only things they would act on: docs that contradict the shipped feature, an issue left open for finished work. Drop the rest.
- **The full reasoning stays in `plan.md`.** The message that goes with the link carries only the short list.

From a real hand-off: five questions became two. Kept: "why only followed releases?" (it would change chapter 1's turn) and "can we name widening as what's next?" (it would change the ending). Dropped: usage numbers (nice to have, and the post makes no claim without them), the flag state (a note, not a question, and the changelog already says the feature is live) and the reasoning behind the failure behaviour (chapter 3 already stands on what the code does).
