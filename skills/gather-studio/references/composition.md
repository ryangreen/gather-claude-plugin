# Compose before you build

Gather's whole economy runs on this: a game you build by importing someone
else's library or moddable game makes that creator's work worth more — credit,
plays, ratings. Building the same thing cold instead of finding it first is not
neutral, it is a small loss for everyone who published before you. This is the
protocol for finding what already exists, choosing between candidates, and
modifying what you import without breaking the creator's credit.

## When to search

Search before building any reusable **system** — something with its own state,
rules, or more than a couple of moving parts:

- level builders and world generators
- player controllers and movement/physics rigs
- enemy or AI behavior
- inventory, crafting, dialogue, quest systems
- camera rigs, UI kits, HUD frameworks
- a whole genre kit (platformer, top-down shooter, tower defense, puzzle)

Don't search for a one-line tweak — "make gravity stronger", "change the
player's color" — or when the user explicitly asked you to build something
yourself. Composing is the default for *systems*, not for every property
change.

A whole system is not the only thing worth searching for. A technique or a
small mechanic (a jump-buffer trick, a dialogue-typewriter effect) is more
likely to exist as a **KB recipe or pattern** than a whole package — search
`searchKnowledgeByTag`/`listKnowledgeTags` for those. Trying to understand a
design decision rather than reuse code — "why would a platformer use coyote
time" — is what a KB **article** is for.

## The loop

1. **Search all three surfaces.** `listPublishedPackages` (with `query`,
   sorted by `rating`, `recent`, or `name`) for libraries, and
   `browseModdableGames` (with `query`, sorted by `plays`, `rating`, or
   `recent`) for whole games built to be forked or modded — a player
   controller might exist as a standalone package, or embedded in a moddable
   game worth importing whole. Alongside them, `searchKnowledgeByTag` /
   `listKnowledgeTags` for a recipe, pattern, or article that covers the
   technique instead of the whole system. The KB is community-curated and may
   be sparse — one search tells you; don't keep digging past that, fall back
   to the docs and build from those.
2. **Preview the top candidates.** `previewPackageRelease` (pass a `release`
   id, or `package` + `version`) returns the release's meta and ratings, a
   section outline, what IT imports, the params it exposes for tuning, and a
   capped source excerpt — fetch one `section` in full when the outline isn't
   enough. It also hands back a ready-to-paste `importHeader`, so once you've
   decided you don't retype the pin by hand.
3. **Assess fit** for each candidate:
   - Does it actually cover the need, or just adjacent to it?
   - What does it depend on — more imports, specific config, an avatar shape?
   - What params does it expose? A library with `$moveSpeed`, `$jumpStrength`
     etc. tunes without touching vendored code at all.
   - Quality signal: `ratingAvg` and `ratingCount` together. A 5-star average
     on 2 ratings is not evidence; treat low `ratingCount` as weak and say so
     if it factors into your recommendation.
   - How much would you have to override or disable to make it fit? A
     candidate you'd gut is often worse than building fresh.
4. **Decide** (see below), then import or build.

## Choosing

**One clear winner** — import it. Tell the user what you imported, its
package/release name, and why it won over building from scratch.

**Several good matches** — stop and involve the user. Don't pick for them.
Present 2-3 options as a short comparison: what each does, how well it fits,
`ratingAvg`/`ratingCount`, `playCount` (for moddable games), the author, and
what you'd have to change to use it. Give a clear recommendation and the
reason, then let them choose.

**Nothing fits** — build it locally, following best practices, and say what
you searched so the user knows you looked before writing it yourself.

## KB recipes, patterns, and articles vs. importing

A package or moddable game release is **imported**: it stays vendored,
upgradeable in place by re-pinning, and the author is credited automatically
every time the import is used. A KB recipe, pattern, or article works
differently — there is no import step. Read it with `getKnowledgeById`, then
copy or adapt the technique into code you own, and credit the author yourself
by citing its `citationId` (see "Citing your sources" in SKILL.md). Never
present adapted KB content as if you invented the technique.

Weigh the three sources by what the user actually needs: a whole system with
its own state and rules → a package or moddable game; a technique or a small,
self-contained mechanic → a KB recipe or pattern; understanding *why* a
design works, not code to reuse → a KB article.

## Importing

- **Exact pins only.** `previewPackageRelease`'s `importHeader` is already
  correct — paste it rather than retyping `release:` or `package:`/`version:`
  by hand, and never guess an id.
- Set `namespace:` when the library's collection/observer names could collide
  with yours.
- Set `kind:` to match what you're importing (`runtime`, `schema`, `content`,
  `sprites`, `ui`, `mechanic`).
- Use `where:` for a partial import — you only need part of a kit, filtering
  by name, tags, or `type` (see `docs/gatherscript.md` for the grammar).
- A moddable game's release is importable only when its creator allowed
  modding — `browseModdableGames` and `previewPackageRelease` only ever
  surface and hand back a `releaseId` for games where that's true, so import
  whatever release pin those tools gave you the same way as a package. Never
  import a game's release id obtained any other way (a link, a guess, an id
  seen elsewhere) — a release outside those tools' results may not permit it.
- After the import lands, check `importWarnings` on the write result. A
  warning means something pulled in has no pinned release — it works now and
  ships broken to players. Report it, don't bury it.

## Modifying vendored code

Vendored sections are read-only **by design**, not by accident — that's what
keeps a pin upgradeable and keeps the original author's credit attached to
their code. You have four ways to change behavior, cheapest first:

**(a) Tune, don't touch.** Most libraries expose `$vars` in their own
`# Config`, or work through ordinary props. Set those, or adjust `z:`,
`priority:`, or `enabled:` — the only properties `update` is allowed to change
on a vendored section — before reaching for anything heavier.

**(b) Add a new local observer.** Vendored code keeps running; you add
behavior alongside it, ordered with `priority:`. This is the right move when
you want to layer a rule on top of an import without disabling anything:

```gatherscript
# Import: Mover Kit
release: release-mover-kit-010

# Collection: Movers
from: Mover Kit
where: color is dodgerblue

# Observer: DriveRight
from: Mover Kit
every: tick
watches: Movers
do:
  entity.x += 120 * dt

# Observer: SlowNearEdge
watches: Movers
every: tick
priority: 1
do:
  if: entity.x > 700
    entity.x -= 40 * dt
```

`SlowNearEdge` is local code you own; `Movers` and `DriveRight` stay vendored
and upgradeable. `priority: 1` runs it after the vendored `DriveRight` (which
defaults to priority 0), so it corrects the position DriveRight just wrote
rather than fighting it.

**(c) Disable + clone + edit the copy.** For a section whose own behavior must
change, not just be supplemented:

```jsonc
applyScriptOps({ script: "my-game", ops: [
  { op: "cloneSection", ref: "observer:DriveRight", name: "DriveRightFast" },
  { op: "update", ref: "observer:DriveRightFast", update: {
      name: "DriveRightFast",
      watches: "Movers",
      every: "tick",
      do: "entity.x += 240 * dt",
  }},
]})
```

`cloneSection` disables the vendored original by default (`disableOriginal:
true`) and returns the copy's `ref` as fresh, fully-owned local code with
`from:` stripped — edit it like any section you wrote. Use a bare
`{op: "setEnabled", ref, enabled: false}` instead when you want to mute a
vendored section without replacing it at all.

**(d) Disable the whole import.** `{op: "setEnabled", ref: "import:Mover Kit",
enabled: false}` turns off every vendored section at once. Reach for this only
when you're replacing the import outright — for anything short of that, (a)
through (c) keep more of the library working for you.

## Credit

Composing isn't just cheaper than rebuilding — it's how the creator whose work
you built on gets paid in the currency Gather tracks: citations, plays,
ratings. `previewPackageRelease` and `browseModdableGames` hand you citable
ids; when you import based on what one of them showed you, that's a real
source, and the usual citation rule applies (see "Citing your sources" in
SKILL.md) — cite the package or game you built on, not the docs that explained
the syntax.
