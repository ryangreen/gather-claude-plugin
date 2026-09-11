---
name: gather-studio
description: >-
  Build, edit, debug, release, and run GatherScript or p5 JavaScript games in
  Gather. Use whenever the user is working on a Gather project, using the
  Gather Platform SDK, writing p5 for Gather, or writing GatherScript. Also
  use when connecting to the Gather MCP server, or when the user says "my game",
  "my world", "the open project", ".gather", or names a Gather section type.
metadata:
  short-description: Build GatherScript and p5 games with the Gather Platform
---

# Gather — multi-engine game studio

Gather projects use either **GatherScript** with the Gather Engine or **p5
JavaScript** in the sandboxed Web Game Host. Your job is to help the user build,
edit, debug, release, and run their game without crossing those language and
runtime boundaries.

**GatherScript is not in your training data.** Everything you "remember" about
it is probably wrong. Look things up before you write them.

## Prerequisite: the Gather MCP server

Every capability here comes from Gather's remote MCP server:

```
https://gathergamestudio.com/api/mcp
```

If those tools aren't connected, none of this works — say so instead of
improvising. Connecting requires a **Contributor** subscription; a Community
creator gets a 403 with an upgrade link, which is an account state to relay, not
an error to retry.

## Orient before choosing a language workflow

Call `getOpenProject`, then inspect its project metadata (or call
`getProjectMetadata`). Treat the advertised language, exact engine/version,
Platform SDK version, entry file, capabilities, and release context as
authoritative. Never infer the engine from source text.

- For `gatherscript`, use the section workflow below and
  [references/gatherscript.md](references/gatherscript.md).
- For p5 `javascript`, use engine-neutral file/outline/edit/validate/build/run/
  console tools and [references/p5-platform.md](references/p5-platform.md).
- Never send JavaScript through GatherScript section, parser, or headless ECS
  tools. They intentionally fail closed on p5 projects.

## The GatherScript model in 60 seconds

ECS, with no event system. State is stored and observed.

```gatherscript
# Entity: Ball            // a thing in the world
shape: circle
color: red
position: 400, 300
speed: 3

# Collection: Balls       // a live query over entities
where: shape is circle

# Observer: Move          // runs over that collection on a schedule
watches: Balls
every: tick
do:
  x += speed * dt
  if: x > 800
    x = 0
```

Inside a `do:` block a bare property name **is** the current entity's property —
`x += speed * dt`, not `entity.x += entity.speed * dt`. Write bare by default;
reach for the `entity.` prefix only to disambiguate (see the style note in
[references/gatherscript.md](references/gatherscript.md)).

Entities hold component data. Collections gather entities by `where:` filters.
Because those filters are live, **the filter is the switch** — an observer over
an empty collection does nothing, so `where: dead is 1` is how you turn behavior
on and off. There is no runtime enable/disable for a section.
Observers read state → decide → write state, in phase order `tick` →
`fixedTick` → `lateTick` → `draw`. Other sections: `Template` (spawnable
prototypes), `Input` (key bindings), `Config` (canvas + live params), `UI`
(HUD), `Data` (named state that holds values instead of rendering — filter it,
address it by name, iterate it, import files into it).

Syntax details, the traps that bite newcomers, and how to read a filter live in
[references/gatherscript.md](references/gatherscript.md).

## The working protocol

<!-- generated:working-protocol — do not edit; npm run skill:sync -->

Follow this order. It is the difference between a script that runs and a script that merely parses.

1. **Orient** — `getOpenProject` first, always, then choose the workflow from its advertised project metadata. If an IDE tab is connected, your edits land in the user's **live editor** and they watch them happen; other scripts are edited in the database. On a script that already exists, follow with `getScriptPlan`: the standing intent behind the project *and* its recent change history, in one call. That is where you find what has already been tried, decided, and deliberately rejected — read it before you propose redoing any of it. Notes carry the version they were written at, so a stale one is visible as stale; the script is always the source of truth. Script comments describe the code, the plan describes the intent.
2. **Research before writing** — `searchDocs` / `getDocPage` for syntax, an exact `searchDocs` query for a single property, macro, or keyword, and `searchKnowledgeByTag` / `getKnowledgeById` for working recipes. GatherScript is NOT in your training data — trust a recipe over your instincts. The knowledge base is community-curated and **may be empty or sparse**; one `searchKnowledgeByTag` (or `listKnowledgeTags`) tells you, and when it returns nothing, don't keep digging — fall back to the docs and build from those. Before showing anyone a newly composed GatherScript example, pass it verbatim to `checkGatherScriptExample` and fix or withhold it if validation fails.
3. **Check assets** — `listUserSprites` before you type any `sprite:` value. Reference only sprites the user actually owns.
4. **Edit surgically** — Sections are addressed by `ref` from `getScript` (`observer:Move`, `entity:Bird`, `input`, `entity:Ball#2`). Use `insertSection` / `updateSection` / `deleteSection`; place inserts with `after` / `before` refs, or omit both to append. Updates are FULL property replacement, not a merge. Refs survive your own inserts and deletes AND the user typing in the IDE, so do NOT re-read the script just to re-learn identifiers — a ref that stops resolving errors rather than silently writing to the wrong section. Mutations are auto-validated and rejected if they would break the script.
5. **Validate, then simulate** — `validateScript`, then `debugStep` to run the world headlessly for N ticks and inspect the snapshot. Syntax passing is not evidence the game works. If entities don't move as expected, read the snapshot before editing again.
6. **Debug live when you can** — If the tab is paused or in debug mode, the live-runtime tools (`getLiveSnapshot`, `getObserverActivity`, `getEntityChanges`, `getFrameTimeline`, `getRuntimeLog`, `replayWithInput`) read REAL game state. Prefer them over reasoning from source.
7. **Record it** — This conversation ends and you keep none of it. Write down what should outlive it, in the right one of two places: `createScriptCheckpoint` for what changed and why, after a meaningful batch validates (per-change history); `addScriptNote` for standing intent — a goal, the current phase, something deliberately not done, a next action. Revise a note with `supersedesId` instead of restating, and retire finished items with `updateScriptNote`. Don't route either into script comments — comments stay lean and about code.
8. **Ship it** — A game nobody can play isn't finished. Once it validates and runs, offer to publish: `publishGame` returns a `/play/` link the user can send to anyone. It asks the user for approval first and publishes only if they accept, so don't announce a game as live until you see the URL come back. Re-publish after later edits — the link is a permalink and starts serving the new build.

<!-- /generated:working-protocol -->

The full tool map and the handoff contracts are in
[references/workflow.md](references/workflow.md).

## When Gather itself is broken

Sometimes the bug is Gather's, not the creator's: a valid script that
misbehaves, a tool that errors, a doc describing something that doesn't exist.
File it with `reportIssue` instead of shrugging at it — it lands in the same
triage queue as the IDE's report dialog, where a human reads it. Check
`listMyIssues` first so you extend an existing report (`commentOnIssue`) rather
than filing a duplicate; it also answers "did that ever get fixed?", since
reports carry their status and resolution. Include real repro steps and the
verbatim error, and attach the failing script with `scriptSlug`. Bugs in the
creator's own game logic are not this — fix those.

## Contributing what you learn back

`saveToKnowledgeBase` writes teaching material the next builder finds through
`searchKnowledgeByTag`. Choose the `contentType` that matches what you have:
`recipe` (default) for a full runnable annotated script, `pattern` for a small
composable fragment, `article` for markdown prose teaching a concept, whose
fenced ` ```gatherscript ` blocks are each verified on save. The contribution
gate runs the code and refuses broken or near-duplicate entries, so search
first. Agent saves become drafts pending curation — `listMyKnowledge` shows the
verdict and curator notes, and `submitKnowledgeForReview` re-queues a revision.

## Spending the user's money

`generateImage` and `generateVideo` are the only tools that can cost anything,
and they never charge on their own — each one raises an approval card in the
user's IDE and returns a `requestId` to poll.

Quote the price before you propose the spend, always pass `spriteName` so the
result lands in their library, and finish the loop through to a working entity.
To see what's already been made, `listGenerations` browses the account's past
image/video generations (`getGenerationResult` only polls one you started). A
finished image with no sprite name is stranded in the queue — `importGeneration`
rescues it into the library for free rather than re-generating. The rules, the
failure states, and the full generation → sprite → script loop are in
[references/generation.md](references/generation.md).

## House rules

- **Player-first.** Creators are often non-programmers. Name sections clearly
  and add `comment` fields explaining intent in plain English.
- **Tag every section by game system.** A whole game lives in one script, so
  give each section a `tags:` line naming the area of responsibility it serves
  (`player`, `combat`, `scoring`, `hud`…) — that is how a creator filters the
  Script Outline down to one subsystem. Tag by game system, not by section type.
  See [references/gatherscript.md](references/gatherscript.md) for the convention.
- **Ship working games.** Prefer the smallest change that runs. Validate and
  simulate rather than theorize.
- **Never invent syntax.** If you are unsure something exists, search for the
  exact term with `searchDocs` and read the returned section or page.
  A feature that doesn't validate doesn't exist.
- **Never guess which script.** "My game" resolves through `getOpenProject`.
- **Don't overwrite art.** Sprite saves upsert by name; a colliding import
  becomes `Duck-2`. Confirm the final name before referencing it.

## Specialist roles

For non-trivial builds, Gather publishes seven specialist roles — `researcher`,
`architect`, `editor`, `debugger`, `validator`, `archivist`, `curator` — each
with a system prompt, tool subset, and handoff contract. The usual build chain
is researcher → architect → validator; a fix is debugger → editor → validator.

Spawn a subagent per role if you can, or enact them in order if you can't. Full
prompts and contracts: [references/agents.md](references/agents.md).
