# Working in a Gather project

## Orient first

`getOpenProject` tells you whether the user has an IDE tab connected and which
script is open. This changes where your edits go:

| State | Behavior |
|---|---|
| Tab open on script X | Edits to X land in the **live editor** — the user watches them appear |
| Tab open, you edit script Y | Y is edited in the database; the user sees nothing until they open it |
| No tab open | Everything is database-only, and generation tools refuse to run |

Never guess which script "my game" means. Resolve it.

Then, on a script that already exists, read its memory:

| Need | Tool |
|---|---|
| What is this project trying to be? What's already decided? | `getScriptPlan` |
| Just the per-change history, in more depth | `listScriptCheckpoints` |

`getScriptPlan` returns both halves at once, because they answer different
questions and you usually want both:

- **The plan** — standing intent. "Wave defense, phase 2 is boss waves, gravity
  is deliberately absent." Current, mutable, short.
- **The trail** — per-change reasons. "Switched aim to `AIM(mouse)`; `DISTANCE`
  fought the collision observer." Historical, immutable, accumulating.

This is the memory you do not otherwise have: you keep nothing from previous
conversations, and the script text alone cannot tell you that gravity is
*deliberately* absent, or that a physics approach was tried and abandoned. Read
it before proposing anything that sounds like starting over.

Notes are **advisory**. Each carries the script version it was written at, and a
note far behind the current version is flagged. The script is always the source
of truth — but a note is the only place a *reason* lives, and reasons don't
survive in code.

## Research before writing

GatherScript is not in your training data, and inventing plausible syntax wastes
the user's time on validation round-trips.

| Need | Tool |
|---|---|
| A working pattern (movement, physics, spawning, combat, platformer…) | `searchKnowledgeByTag`, then `getKnowledgeById` |
| Language reference | `searchDocs`, `getDocPage` |
| One keyword, property, macro, or operator | exact `searchDocs` query |
| What art exists (with `source`: ai-generated / imported / original) | `listUserSprites` |
| What's been generated before (image/video history) | `listGenerations` |
| Rescue a stranded generation into the library (free, no re-spend) | `importGeneration` |

Knowledge-base entries are expert-annotated recipes that actually run. Prefer
them over your own reconstruction.

## Edit surgically

`getScript` returns a `ref` for every section. Address them by ref:

| Ref | Means |
|---|---|
| `observer:Move` | the observer named Move |
| `entity:Bird` | the entity named Bird |
| `input` | the nameless `# Input` section |
| `entity:Ball#2` | the 2nd of several entities named Ball (1-based, document order) |

Kind and name match case-insensitively. Then:

- `insertSection` — add a new section. Place it with `after:` or `before:` (a
  ref), or omit both to append at the end. Returns the new section's ref
- `updateSection` — **full property replacement.** Send every property you want
  to survive, not just the changed ones
- `deleteSection` — remove one

**You do not need to re-read the script after a write.** That was only ever
required because the old numeric ids shifted underneath you. A ref keeps
pointing at the same section across your inserts and deletes *and* the user
typing in their IDE. `entity:Ball#2` moves only if another entity named `Ball`
is added or removed.

If a ref stops resolving — the section was deleted or renamed — you get an
error naming the closest match. It never silently lands on a different section,
and an ambiguous ref (`entity:Ball` with three of them) is refused with the
numbered alternatives rather than guessed.

Sections vendored from an `# Import:` are read-only: you can read them, but
writes are refused and point at the owning import.

Mutations are auto-validated and rejected if they'd break the script, so a
rejection is information: read the message rather than retrying blindly.

## Validate, then simulate

After every batch of edits:

1. `validateScript` — structural + semantic errors.
2. `debugStep` — run N ticks headlessly, get a world snapshot back.

Step 1 proves it parses. Only step 2 proves it *works*. "It validated" is not a
report that the feature functions; say what the snapshot showed.

## Debug live when you can

If the user's tab is running or paused in debug mode, these read **real** game
state and beat any amount of reasoning from source:

| Tool | Answers |
|---|---|
| `getLiveSnapshot` | What is the world actually like right now? |
| `getObserverActivity` | Did my observer even fire? |
| `getEntityChanges` | What changed on this entity, and when? |
| `getFrameTimeline` | What happened across the last N frames? |
| `getRuntimeLog` | What did the runtime complain about? |
| `replayWithInput` | What happens if the player presses this? |

When a user says "my player won't jump", the answer is usually one
`getObserverActivity` call away: either the observer never ran (collection
filter), or it ran and wrote nothing (condition never true).

## Record it, before you lose it

Everything you currently know about this project — what you ruled out, why the
obvious approach failed, what the user said they wanted next — disappears when
the conversation ends. Two tools decide what doesn't, and **picking the wrong one
is the common mistake**:

| Tool | For | Shape |
|---|---|---|
| `createScriptCheckpoint` | What changed, and why | Immutable, one per batch of work |
| `addScriptNote` | Standing intent: goals, phases, deliberate omissions, next actions | Mutable, revised in place |
| `updateScriptNote` | Retiring what's finished (`status: "done"`) or fixing wording | — |
| `deleteScriptNote` | Something that should never have been written | — |

The test: *would this still be true after ten more edits?* If yes it's a note. If
it only makes sense next to a specific change, it's a checkpoint message.

Write both for a stranger:

- **Good checkpoint:** "Switched aim from `DISTANCE(mouse)` to `AIM(mouse)` —
  DISTANCE fought the collision observer and jittered at close range."
- **Good note:** "No gravity — on purpose. The floaty feel is the game; two
  playtesters asked for gravity and both changed their minds."
- **Bad, either way:** "Updated the observer."

Rules:

- **Checkpoint after decisions, not edits.** One per meaningful chunk of work,
  not one per `updateSection`.
- **A checkpoint message is required.** Without one it's just a save, and history
  thinning eventually discards it like any autosave.
- **Revise, don't restate.** Changing an earlier decision means `addScriptNote`
  with `supersedesId` — the old note is retired and stays readable as history.
  Two open notes contradicting each other is worse than none.
- **The plan is capped.** Hitting the cap means curate: mark something done or
  replace it. That is the feature, not an obstacle.
- **Write notes the user would recognize.** They see this list in the IDE
  (File → Project Plan) and can edit or delete anything in it. Attribute the
  user's own stated intent to them, not to yourself.
- **It captures the live buffer** when the user has the script open, so what you
  commit is what they're actually looking at.
- **Don't put either in script comments.** Comments stay lean and about the code —
  a reader scanning an observer wants to know what the code does, not what three
  sessions ago concluded about the design.

## Publishing

A working game the user can't send to anyone isn't finished. `publishGame`
returns a `/play/<id>` link — the same link the IDE's Share button produces.

| Tool | Purpose |
|---|---|
| `getPublishedGame` | Is there already a link? What is it listed in? |
| `publishGame` | Publish, or refresh an existing link with the current build |

### The user approves, not you

`publishGame` does not publish on your say-so. It asks the user first, through
your client — no Gather IDE needed — and only publishes if they accept.

- A result with `published: true` and a `url` means it happened. **Anything
  else means it did not**, however confident you were. Never tell the user
  their game is live before you see that URL.
- `decline` is an answer. Don't re-call the tool hoping for a different one —
  ask what they want changed.
- If your client can't show a prompt, the first call comes back with
  `published: false` and a `confirmationToken`. That is your cue to **ask the
  user yourself, in your own message**, and call again with that token only if
  they say yes. The token proves nothing on its own; you asking is the gate.
- The user's listing answer overrides whatever you passed. If they choose
  link-only, the game is link-only.

Rules:

- **Validate and simulate before you publish.** Approval is not review — the
  user is trusting that you already checked it runs.
- **The link is a permalink.** Re-publishing the same script refreshes it
  instead of minting a second URL, so a link the user already sent keeps
  working and starts serving the new build. Re-publish after meaningful edits
  and say "updated your link", not "here's a new link".
- **Listing is opt-in and separate.** By default the game is reachable only by
  its link. `listInBrowse` and `listInArcade` are suggestions shown in the
  approval prompt; the user's choice there wins. Omitting them leaves whatever
  they already chose untouched, so a refresh can never quietly promote or
  demote their game.
- **Check `importWarnings`.** They mean the script pulls in something with no
  pinned release: it works for the creator and ships broken to players. Report
  them rather than burying them.
- **You cannot unpublish.** Taking a game down breaks a URL players may hold,
  so that stays in the IDE. If the user wants it gone, tell them where to go.

## When the bug is Gather's

Not every failure is the creator's. A script that validates and still misbehaves,
a tool that errors on valid input, a documented property the runtime ignores —
those are Gather bugs, and they only get fixed if someone writes them down.

- **`reportIssue` files it** into the same `bug_reports` queue the IDE's report
  dialog feeds, where a human triages it. Say you're filing it; don't file
  silently, and don't file *instead* of trying to work around it.
- **Search before filing.** `listMyIssues` shows what this creator already
  reported, with each report's status and, once fixed, its resolution. If it's
  already there, `commentOnIssue` with the new detail — a narrower repro is worth
  more than a second ticket.
- **Make it reproducible.** Numbered `reproSteps`, the verbatim `error` text, and
  `scriptSlug` to attach the failing script. A triager who cannot reproduce it
  closes it.
- **Set `layer` only if you traced it** (parser / transpiler / runtime /
  renderer). A confident wrong guess sends the fix hunting in the wrong file;
  `unknown` is the honest default.
- **Game-logic bugs are not this.** If the creator's script is wrong, fix the
  script.

## Reporting back

- Say what you changed, in the creator's language, not in tool names.
- If you validated but didn't simulate, say so.
- If something failed, quote the diagnostic rather than paraphrasing it.
- Leave `comment:` fields behind so the script explains itself after you're gone.
