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

When the user wants a **new** game, or asks you to keep this work out of their
existing projects, call `createScript` with the name they gave (or a short
descriptive one) and build into the slug it returns. Don't ask them to make a
blank project in the IDE for you. If a tab is connected, `navigateTo`
`open-script` with the returned title so they watch it fill in. Don't create a
project to avoid editing the one they pointed you at.

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
| A reusable system someone already published (controller, level builder, inventory, whole genre kit) | `listPublishedPackages` / `browseModdableGames`, then `previewPackageRelease` |
| Language reference | `searchDocs`, `listDocPages` → `getDocToc` → `getDocSection` |
| One keyword, property, macro, or operator | exact `searchDocs` query |
| A question you can't name a keyword for | `searchDocs` with the plain question |
| What art exists (with `source`: ai-generated / imported / original) | `listUserSprites` |
| What's been generated before (image/video history) | `listGenerations` |
| Rescue a stranded generation into the library (free, no re-spend) | `importGeneration` |
| The creator's own other scripts (for a `script:` local-workspace import) | `listScripts` |

Knowledge-base entries are expert-annotated recipes that actually run. Prefer
them over your own reconstruction. Before rebuilding a reusable system from
scratch, search for one first — see [Compose before you
build](../SKILL.md#compose-before-you-build) in SKILL.md and
[composition.md](composition.md) for the full protocol.

## Edit surgically

`getScript` returns a `ref` for every section. Address them by ref:

| Ref | Means |
|---|---|
| `observer:Move` | the observer named Move |
| `entity:Bird` | the entity named Bird |
| `input` | the nameless `# Input` section |
| `entity:Ball#2` | the 2nd of several entities named Ball (1-based, document order) |

Kind and name match case-insensitively. Then:

### `applyScriptOps` — the one section-write tool

Every section write goes through it: an ordered list of ops, applied as a single
atomic mutation.

| Op | Shape |
|---|---|
| insert | `{op: "insert", kind, section, after?, before?}` — place it with `after:` or `before:` (a ref), or omit both to append. Returns the new section's ref |
| update | `{op: "update", ref, update}` — **full property replacement.** Send every property you want to survive, not just the changed ones. On a vendored (`from:`) section, only `z`, `priority`, and `enabled` may change — every other field is refused |
| delete | `{op: "delete", ref}` |
| setEnabled | `{op: "setEnabled", ref, enabled}` — toggle a section, including a vendored one or an entire `# Import:` header |
| cloneSection | `{op: "cloneSection", ref, name?, disableOriginal?}` — copy a vendored section into fresh, fully-owned local code (`from:` stripped), disabling the vendored original by default. Returns the copy's ref. See [composition.md](composition.md) for the disable-clone-edit modding pattern |

```jsonc
applyScriptOps({ script: "asteroids", ops: [
  {op: "insert", kind: "entity",     section: {name: "Ship",  comment: "The player's ship", properties: [...]}},
  {op: "insert", kind: "collection", section: {name: "Ships", comment: "Every ship",        properties: [{key: "where", value: "shape is box"}]}},
  {op: "insert", kind: "observer",   section: {name: "Drift", comment: "Ships drift",       properties: [{key: "watches", value: "Ships"}, ...]}},
]})
```

Ops apply in order against the accumulating script, so a later op may address
what an earlier one created — a collection and the observer watching it belong
in the same list, as above.

It is atomic. If any op fails, the script is left completely unchanged and the
error names the op by position and says why; fix or drop that op and resend the
whole list. Nothing half-applies, so there is never a partial script to
reconstruct. The result is validated once, at the end, which means an
intermediate state is not required to stand on its own.

**A single change is a one-op list.** There is deliberately no per-section write
tool, and that is a cost decision, not a style one: each call is a round, every
round re-sends the whole conversation, and a measured production turn spent
seventeen of its twenty-five rounds inserting one section at a time and ran out
of steps before the script was finished. The creator got half a game. (If you
know `insertSection`, `updateSection` or `deleteSection` from an older tool list,
they are gone — these ops are what they became.)

The Config section is the exception: set it with `upsertScriptConfig`, which
merges rather than replaces.

**You do not need to re-read the script after a write.** That was only ever
required because the old numeric ids shifted underneath you. A ref keeps
pointing at the same section across your inserts and deletes *and* the user
typing in their IDE. `entity:Ball#2` moves only if another entity named `Ball`
is added or removed.

This holds WITHIN one `applyScriptOps` batch too, including its own ops: every
ref in the ops list is resolved once, against the script as it stood before the
batch started, so `entity:LifeIcon#2` still names the 2nd LifeIcon even after
an earlier op in the same call deletes `#1`. Delete `#1`, `#2`, `#3` in that
order (or any order) in one batch and every op still hits the section you
meant. Referencing a ref twice in the same batch — an `update` then a `delete`
— still targets the one section, even if the update renamed it. Referencing a
ref your batch already deleted fails clearly ("already deleted earlier in this
same batch") rather than silently retargeting a different section.

If a ref stops resolving — the section was deleted or renamed — you get an
error naming the closest match. It never silently lands on a different section,
and an ambiguous ref (`entity:Ball` with three of them) is refused with the
numbered alternatives rather than guessed.

Sections vendored from an `# Import:` are read-only: you can read them, but
writes are refused and point at the owning import.

Mutations are auto-validated and rejected if they'd break the script, so a
rejection is information: read the message rather than retrying blindly.

`renameScript` is not one of these. It changes the project's display name, not
its text, so nothing is validated and nothing in the script moves — and it runs
only on the user's explicit yes. See "Naming the project" in SKILL.md.

## Validate, then simulate

After every batch of edits:

1. `validateScript` — structural + semantic errors.
2. `debugStep` — run N ticks headlessly, get a world snapshot back.

Step 1 proves it parses. Only step 2 proves it *works*. "It validated" is not a
report that the feature functions; say what the snapshot showed.

## Debug real state — tab or not

These read **real** game state and beat any amount of reasoning from source,
whether or not the user has the site open:

| Tool | Answers |
|---|---|
| `getLiveSnapshot` | What is the world actually like right now? |
| `getObserverActivity` | Did my observer even fire? |
| `getEntityChanges` | What changed on this entity, and when? |
| `getCollectionEntities` | Who's actually in this collection right now? |
| `getFrameTimeline` | What happened across the last N frames? |
| `getRuntimeLog` | What did the runtime complain about? |

Each takes an optional `runId` and `script`, and picks its source in this
order: a paused/running tab wins if there's no `runId`; a given `runId` rebuilds
that exact server run, tab or not; with neither, the server answers from the
latest run (scoped to `script` if you name one) — with no run yet, it tells you
to call `debugStep` first. Every result carries `source` (`"tab"` for the
user's own live play, `"server"` for a scripted run from tick 0) so you always
know which one you got.

`replayWithInput(script, …)` drives input through a run and hands back a
`runId`: with the tab open on that script it replays the live buffer, unsaved
edits included (`source: "tab"`); with no tab it runs the saved script on the
server instead (`source: "server"`). `renderRunFrames(runId, ticks)` turns a
server run into PNG frames — GatherScript only — so you can actually SEE the
game with the site closed.

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
  not one per `applyScriptOps` call.
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

### "Let me play it" — `playGame`

When the creator wants to play, call `playGame(scriptSlug, hours?)`. It pins
the SAVED script text exactly like a draft playtest (below), and in clients
that show MCP app views — Claude, ChatGPT — the game opens **inside the chat**:
a handheld with an on-screen d-pad and buttons on a phone, keyboard play on a
desktop. Some chat apps won't frame another site; there the view shows a
"Play in browser" button that opens the same game with no sign-in. Every
result also carries a private owner-only `/play/draft/` link — show it when
the result says the client has no inline view (`inlineView`). Save edits
before calling it; later edits need another call. GatherScript only; the link
expires (24h by default).

### Not ready to publish? Use a draft playtest instead

`createDraftPlaytestLink(script, hours?)` is not publishing — no permalink, no
Browse/Arcade listing, no room, no play count. It mints a private,
owner-only `/play/draft/<token>` link pinned to the SAVED script text at that
moment (later edits don't change what the link plays), expiring by default in
72h (1h–30d). To hand the creator a build to play with the site closed, call
`createDraftPlaytestLink`. To also get their verdict, use `requestUserAction`
with kind `playtest` (needs `scriptSlug`) — they play it on the `/act` page,
then approve or send notes back. Delivery is a link always, a popup where the
client supports it, and an IDE card if the site is open — don't claim more
than that.

### The user approves, not you

`publishGame` does not publish on your say-so. The user approves it
themselves, on a Gather page — no Gather IDE needed.

- The first call publishes nothing. It returns `published: false`, an
  `approval.actionId` and a link (also as a `resource_link`). **Show the user
  the link.** Once they tell you they answered, call `publishGame` again with
  the SAME arguments and `confirm` set to that actionId.
- If their client showed a popup, or they have a Gather tab open, and they
  answer within a few seconds, the first call publishes directly.
- A result with `published: true` and a `url` means it happened. **Anything
  else means it did not**, however confident you were. Never tell the user
  their game is live before you see that URL.
- A declined approval is an answer. Don't re-call the tool hoping for a
  different one — ask what they want changed.
- **The approval covers exactly the `listInBrowse`/`listInArcade`,
  `allowModding` and `title` you passed** — approving a quiet link is not
  approving a public one. Ask the user where it should be listed BEFORE the
  first call and pass it there; changing any of them afterwards files a new
  approval.
- One approval covers one publish. The next publish asks again.

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

### Cover and marketing images

A game with no cover looks abandoned in Browse and the Arcade. Two ways to set
one, depending on what the image actually is:

**A real gameplay moment** — `saveScreenshot`, frame-only, never raw bytes or
a URL:

1. `debugStep` or `replayWithInput` to get a `runId`.
2. `renderRunFrames(runId, ticks)` to see a few candidate moments and pick one.
3. `saveScreenshot(runId, tick, kind: "cover" | "marketing")` — re-renders that
   exact tick at full resolution and saves it. GatherScript only.

**Cover art, a generated splash image, or anything else not captured from
play** — `uploadScreenshot(script, kind, generationId | imageBase64)`. Give
exactly one source: `generationId` (a finished `generateImage` result — cheap,
the bytes are fetched server-side) or `imageBase64` (expensive in tokens;
prefer a compressed JPEG over a large PNG). The image is fully decoded and
re-encoded server-side before it's stored, so a corrupt or disguised file is
rejected rather than silently accepted.

Both tools: `"cover"` replaces the game's single cover image; `"marketing"`
adds to its screenshot gallery (capped — the tool's error tells you the limit
if you hit it). On an already-published game the change is live on its
`/play/` page immediately.

`listScreenshots(script)` shows what's saved (cover + gallery, each with an
id and URL); `deleteScreenshot(script, id)` removes one.

## When the bug is Gather's

Not every failure is the creator's. A script that validates and still misbehaves,
a tool that errors on valid input, a documented property the runtime ignores —
those are Gather bugs, and they only get fixed if someone writes them down.

**The tools themselves count.** A tool that errors on input you believe is valid,
a result that contradicts the tool's own description, a capability you needed and
could not find, a reference page that documents something that is not there —
file those exactly as you would a runtime bug. You are the only one who sees that
friction, and a filed report is the whole mechanism by which the toolchain
improves. Name the tool and the arguments you passed.

- **`reportIssue` files it** into the same `bug_reports` queue the IDE's report
  dialog feeds, where a human triages it. Say you're filing it; don't file
  silently, and don't file *instead* of trying to work around it.
- **Write observations, not directives.** Every report is read by a person, and
  then by an engineer with a checkout, before anything changes. A report phrased
  as an instruction to whoever reads it next is rejected on sight. Describe what
  happened; leave the fix to them. Never paste secrets, tokens, or third-party
  personal data into a report.
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
