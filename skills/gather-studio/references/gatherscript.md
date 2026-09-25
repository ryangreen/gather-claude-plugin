# GatherScript syntax

Enough to write correct script without guessing. For anything not here, use
a `searchDocs` query — an exact keyword, or the question in plain words — `listDocPages` → `getDocToc` → `getDocSection` (reference), or
`searchKnowledgeByTag` (working recipes).

## Section anatomy

A script is Markdown-ish sections. Every section is `# Type: Name`, followed by
`key: value` property lines until the next header.

```gatherscript
# Entity: Player
shape: box
color: #4ade80
position: 400, 300
size: 32
speed: 200
comment: The character the player drives around
```

Section types: `Entity`, `Collection`, `Observer`, `Template`, `Input`,
`Config`, `UI`, `Data`.

- Property keys are case-insensitive; values keep their case.
- Values are numbers, strings, or comma-separated lists (`frames: 4, 5, 6, 7`).
- Inline constraints use braces: `x: 100 {min: 0, max: 800}`.
- Comments are `//` or `/* ... */`. `#` is never a comment — it only starts a
  section header, and `size: 36  # note` puts the note into the value.
- `comment:` is free text and is the cheapest thing you can do for the creator.
- `tags:` groups the section for the Script Outline — see below.

## System tags — organize a one-script game

A whole game usually lives in one script, so `tags:` on a section is how a
creator later filters the Script Outline down to the parts that belong together.
Tag every section you write.

**Tag by area of responsibility — the game system a section serves, not its type
or a low-level mechanic.** The outline already groups by type, so `tags: observer`
is noise. Ask: "if this part of the game broke, which sections would I open
together?" Every section in that answer shares one tag. A `combat` filter should
surface the combat entity, the collections its observers watch, those observers,
the projectile template, and the combat HUD — the whole slice, at once.

```gatherscript
# Entity: Player
shape: box
tags: player

# Collection: Bullets
where: kind is bullet
tags: combat

# Observer: FireGun
watches: Players
tags: combat, input        // bridges two systems — a second tag is fine
```

Rules that keep the filter useful:

- **Every section gets at least one system tag.** An untagged section is
  invisible to every filter — it is the noise.
- **Prefer one primary owner per section.** Add a second tag only when a section
  genuinely bridges two systems.
- **Reuse a tag before inventing one.** Synonyms (`foe` vs `enemy` vs `enemies`)
  split one system across two filters. Pick one word per system and stay
  consistent within the script.
- **Keep the set small** — a handful of lowercase nouns matching how a player
  would name the game's parts (`player`, `enemies`, `combat`, `scoring`,
  `spawning`, `world`, `hud`, `input`, `audio`), drawing from the game's own
  domain first (`asteroids`, `paddle`, `bricks`). If every section has a unique
  tag, nothing groups.
- **Tag the Template, not each spawn.** Spawned instances inherit their
  template's tags automatically.

Case-insensitive, comma-separated. `tags:` doubles as normal entity tag data
(so `where: tags includes player` still filters at runtime).

## Data — state that doesn't render

`# Data: Name` holds values instead of drawing. Every property lands in `custom`
(even `x` / `color`); no `renderable`, so it never appears on the canvas. Still a
real entity — filter it, name it, iterate it. Use it instead of a propless
`# Entity:` whenever you mean "hold data."

```gatherscript
# Data: Backpack
potions: 22
## Tools              // ## children hang off the parent
swords: 1

# Data: Country       // repeat a name → a group
name: USA
pop: 331
# Data: Country
name: Canada
pop: 39
```

- **Path access** (read AND write): `Backpack.potions`, `Backpack.Tools.swords`
  (implicit child hop), `Country.first.pop` / `Country.1.pop` (group, 0-based),
  `entity.parent.pop`. Missing child / bad index → `0`.
- **Iterate**: `for: c is Country` (or `for: c in Country`) loops a collection or a named group; each `c`
  is that entity (`c.pop`), so you can process or spawn per row. The variable WRITES too —
  `c.pop += 1` updates that entity and the rest of the iteration sees it. A variable bound
  to a number (`for: i is 1 to 5`) diagnoses on `i.prop = …` instead of writing anywhere.
- **Filter data**: `where: parent is Backpack` (children of a parent);
  `where: pop gt config.limit` compares to a LIVE config value (never cached).
- **Import a file**: `# Data: Country` + `source: countries.csv` → a `Country`
  group (CSV / JSON array / MD table → rows; JSON object / shorthand → children);
  `format:` pins it; inline props are per-row defaults.

## Config is a live store

`# Config` params are read and written at runtime, not frozen. In `do:` / `if:`
expressions `config.name` re-reads the current value each tick and
`config.name = …` writes it (persists, seen by later reads); `$name` is an alias
for `config.name` there. In a component initializer (`position: $startX`) the
value is read ONCE at spawn — a later config write won't move the entity.

## Cameras — what part of the world is on screen

`# Camera: Name` is an entity that controls what's drawn and where. No camera
at all ⇒ the whole canvas, centred, exactly like every script before cameras
existed — only add one for zoom, split-screen, a minimap, or a cut.

```gatherscript
# Camera: P1
position: 20, 30     // CENTRE of what's visible, in world units
size: 40              // visible width in world units — height derives from
viewport: 0, 0, 400, 600   // the viewport's aspect, so the picture never stretches
```

- `position` = centre in world/coordinate units (same as any entity's `x`/`y`).
- `size`/`width`/`height` = the visible RECTANGLE, in world units — never
  pixels. Width-only derives height from the viewport's aspect ratio.
- `viewport: x, y, w, h` = where it draws on the CANVAS, in design pixels
  (the `canvas: 800, 600` space); omitted = the whole canvas.
- `viewport: auto` tiles every VISIBLE `auto` camera evenly by count (1 full,
  2 halves, 3–4 quadrants, more a grid) — put it on a `# Template:` to spawn
  one camera per joining player instead of hand-authoring N cameras.
- `z` orders overlapping viewports (a minimap over the main view).
- No `active:` — cutting between cameras is toggling `visible:`, same as any
  entity. `view:` restricts a camera to one view (`view: stream`).
- A camera is a plain entity, so a follow cam is just an observer copying a
  target's `x`/`y` onto it every tick — there is no camera-specific command.
- The pointer is camera-relative: `mouse.x`/`mouse.y` and `HOVERING()` /
  `DISTANCE(mouse)` resolve through whichever camera's viewport the pointer is
  inside. UI stays screen-space, on top of every camera.

## Input — named bindings, and the raw devices

`# Input` gives an action a game-friendly name. There is no `type:` line — the
**suffix decides** what the binding is:

```gatherscript
# Input
jump: Space                                  // no suffix → button
thrust.neg: s                                // .neg / .pos → 1D axis
thrust.pos: w
move.xneg: ArrowLeft, a                      // .xneg/.xpos/.yneg/.ypos → 2D axis
move.xpos: ArrowRight, d
move.yneg: ArrowUp, w
move.ypos: ArrowDown, s
```

Read them by bare name inside a `do:` block or an `if:`:

| Binding | Reads as |
|---|---|
| button | `jump` / `jump.down` (held), `jump.pressed` (this frame only), `jump.released`, `jump.up` (NOT held) |
| 1D axis | `thrust` — `-1`…`1`; `thrust.neg` / `thrust.pos` are the raw halves |
| 2D axis | `move.x` and `move.y` — each `-1`…`1`; bare `move` is 1 while any direction is held |

```gatherscript
do:
  x += move.x * speed * dt
  if: jump.pressed
    vy = -300
```

A binding that names no `gamepad.*` source of its own is **given one at compile
time** — the first direction binding gets the left stick, actions get south,
east, west, north in declaration order — so a keyboard script also answers a
controller and a phone's on-screen pad. Anything you name yourself wins.

**Local multiplayer:** name the sections (`# Input: Arrows`, `# Input: WASD`),
put `controls: Arrows` on the entity, and read `entity.controls.move.x`. One
observer then drives any number of players with no branching.

**Raw devices** — for a rule that needs one exact input rather than a remappable
action: `key.<name>.down` / `.pressed` / `.released` (`key.space`, `key.a`,
`key.arrowleft`, `key.any`), `mouse.x` / `mouse.y` in game coordinates plus
`mouse.down` / `.pressed` / `.released` and `mouse.left` / `.right`, and
`gamepad.south` / `.lstick.x` / `.dpad.left` and friends. Every one of these is
`1` or `0`, so `x += key.d.down * 10` is a whole movement rule.

## Collections

A live query, re-evaluated as component data changes.

```gatherscript
# Collection: Enemies
where: kind is enemy and health > 0
```

`where:` clauses compose with `and` / `or`. Operators are documented — check
with an exact `searchDocs` query rather than assuming an operator exists.

### The filter is the switch

Because a collection is re-evaluated live, the idiomatic way to turn a behavior
on and off is to put the condition in `where:` — an observer over an empty
collection simply does nothing that tick.

```gatherscript
# Collection: DeadBirds
where: entity is Bird and dead is 1

# Observer: RestartGame     // only runs while the bird is actually dead
watches: DeadBirds
every: tick
do:
  if: key.space.pressed
    reset: entity
```

Prefer this over a `stopif:` / `if:` guard at the top of a `do:` block when the
condition describes *which entities the observer is about* rather than a
mid-block early-out. It reads like the design doc, and the runtime does the
filtering for you.

There is **no runtime enable/disable for an observer.** `enabled:` is a
section-level property read at transpile time — a disabled observer is never
registered at all — so `MyObserver.enabled = false` inside a `do:` block does
nothing. Gate on state instead: a `where:` filter, a `stopif:` guard, or an
`if:` wrapper. To re-arm a one-shot (`every: once`) observer or reset the
`once:` / `wait:` / `animate:` state inside a `do:` block, use
`reset: <ObserverName>`.

## Observers

```gatherscript
# Observer: Chase
watches: Enemies
every: tick
do:
  x += DIRECTION(Player).x * speed * dt
  if: DISTANCE(Player) < 20
    health -= 1
```

- `watches:` names a Collection. `every:` is `tick`, `fixedTick`, `lateTick`, or
  `draw`.
- The body runs **once per entity** in the collection; `entity` is the current one.
- `dt` is delta time in seconds. Multiply anything per-second by it.

### Commands in `do:` blocks

Assignment uses operators — `=`, `+=`, `-=`, `*=`, `/=`:

```gatherscript
x = 5
score += 10
```

There is no `set x to 5`. Writing English where an operator belongs is the
single most common way to produce a script that parses and does nothing.

#### Style: bare properties, not `entity.` everywhere

Inside a `do:` block, a bare property name resolves to the current entity's
property — on **both** sides of an assignment, in `if:` conditions, in macro
arguments, and in `spawn:` overrides. Prefer the bare form; it is what makes a
script read like the design doc it is meant to be.

```gatherscript
do:
  gapCenter = RANDOM(gapMin to gapMax)
  topHeight = gapCenter - gapSize / 2
  if: topHeight > 0 and dead == 0
    spawn: Pipe
      x: spawnX
      height: topHeight
```

Keep the explicit `entity.` prefix only where it earns its place:

- **Disambiguation** — the name also exists as an input binding, a global, or a
  section name (`entity.speed` next to a `speed` binding).
- **Nested and virtual paths** — `entity.position.x`, `entity.controls.jump.pressed`,
  `entity.children.first.color`.
- **Contrast with another entity** — a line that already reads `target.health`
  or `Players.first.score` is clearer written as `entity.health -= 1`.
- **`reset:` targets** — `reset: entity`, `reset: entity.vy`.

This is style, not correctness: `entity.x` always works. Uniform `entity.`
prefixing just makes the arithmetic harder for a human to scan, which is the
whole point of the language.

Conditions are `if:` lines with **indented** bodies, composed with `and` / `or`,
optionally followed by `else:`:

```gatherscript
if: y > 500 and alive
  y = 0
  vy = 0
else:
  vy += 9.8 * dt
```

A clause with no comparison in it — `alive` above — is true when its value is
not zero, so `if: move` asks "is the stick off centre" and `if: not move` asks
the opposite. Against a **number**, `is` and `==` are the same test and both
read whatever the name means, input bindings included: `move is not 0` and
`move != 0` are one question. (Against a **word** they still differ — `state is
aim` compares the word, `hits == PI` resolves the constant.)

Other commands (`spawn:`, `push:`, `move:`, `accelerate:`, `show:`, `hide:` …)
exist with their own nesting rules. Look them up before use.

## Macros

UPPERCASE calls, usable inside expressions:

```gatherscript
x += RANDOM(-1, 1)
if: DISTANCE(Enemies) < 50
if: CLICKED()
```

Common ones: `RANDOM`, `COUNT`, `DISTANCE`, `DIRECTION`, `AIM`, `CLAMP`,
`OVERLAP`, `TOUCHING`, `PUSHOUT`, `SPEED`, `CLICKED`, `HOVERING`, `GRABBING`,
`DRAGGING`, `HELD`, `NEXTFRAME`, `CYCLE`.
Argument shapes vary — search the exact one you want with `searchDocs`.

`CLAMP(value, min, max)` switches on what it is handed: a number is bounded
directly, and a list with numeric bounds keeps its direction and bounds its
length — `entity.velocity = CLAMP(entity.velocity, 3, 10)` is a speed cap.

A **generator** macro can also be a property's value on an `# Entity:` or
`# Template:`, where it resolves once per instance — the template's spawn count,
the entity's index among entities sharing its name, or a player id on an
`avatar: true` entity:

```gatherscript
# Template: Asteroid
shape: circle
size: RANDOM(14 to 44)
color: RANDOM(grey, brown, white)
lane: STEPCYCLE(100, 200, 4)
```

`RANDOM`, `CYCLE`, `PINGPONG`, `STEP`, `STEPEVERY`, `STEPCYCLE` and `PERLIN`
work there; `DEAL` does not. Prefer this over an init observer when each
instance just needs its own value.

### Collision — `OVERLAP` and the `target` binding

`OVERLAP(Coll)` is 1 while the current entity overlaps any entity in `Coll`. It
auto-detects the shape: circle if the entity has `radius`, AABB from
`size` / `width` / `height` otherwise. Explicit forms override that —
`OVERLAP(Coll, r)` (circle), `OVERLAP(Coll, w, h)` (box), `OVERLAP(mouse)` and
`OVERLAP(x, y)` (is a point inside me), `OVERLAP(SCREEN)` with its sugar
`ONSCREEN()` / `OFFSCREEN()` for culling things that flew off the canvas.

`TOUCHING(Coll)` answers the same question from the collision ledger that
`collide:` / `ground:` / `wall:` write, so it does not care what order commands
ran in this tick. `PUSHOUT(Coll)` returns the `[x, y]` that resolves the overlap.

Both bind **`target`** to the nearest matching entity — readable in the
condition, the body, and in command arguments:

```gatherscript
do:
  if: OVERLAP(Asteroids)
    for: i is 1 to 2
      spawn: Asteroid
        x: target.x                  // inherit what you hit
        y: target.y
        width: target.width / 2.0
    despawn: target
    despawn: entity
```

Put `OVERLAP(...)` first when you `and` it with a test on the thing you hit —
`and` runs left to right, so `if: OVERLAP(Pots) and target.frame is 1` works and
the reverse order does not. Reading `target` with no overlap bound is a no-op
plus a runtime diagnostic.

### Math functions — trig, rounding, constants

Uppercase like macros, usable anywhere an expression is: `SIN`, `COS`, `TAN`,
`ASIN`, `ACOS`, `ATAN`, `ATAN2(y, x)`, `RADIANS`, `DEGREES`, `ABS`, `SQRT`,
`POW`, `MIN`, `MAX`, `CEIL`, `FLOOR`, `ROUND`, `LOG`, `EXP`, `SIGN`. Constants:
`PI`, `TWO_PI`, `HALF_PI`. Operators are `+ - * / %` (or `mod`) and `^`.

**Rotation and `AIM()` are in degrees; trig is in radians.** Convert at that
boundary or the ship points the wrong way:

```gatherscript
# Input
steer.neg: a                 // 1D axis, -1 … 1
steer.pos: d
thrust: w                    // button

# Observer: FlyShip
watches: Ships
every: tick
do:
  rotation += steer * 180 * dt                         // steering, in degrees
  if: thrust
    vx += COS(RADIANS(rotation)) * accel * dt          // accelerate along the nose
    vy += SIN(RADIANS(rotation)) * accel * dt
  heading = DEGREES(ATAN2(vy, vx))                     // and back again
```

For the common cases you rarely need the trig at all: `push: AIM(entity.rotation) at 300`
fires along a heading, `entity.rotation = AIM(mouse)` turns to face the pointer,
and `DIRECTION(Coll)` already hands back a normalized `[x, y]`.

## Traps

- **Undeclared numeric properties default to 0.** No NaN, but also no error, so
  a typo'd property name silently reads 0 forever. Spell-check your reads.
- **An `applyScriptOps` update op replaces ALL properties.** Send the complete
  set, not a diff, or you will delete the ones you left out.
- **Sprites must exist.** `sprite: Duck` only works if `listUserSprites` shows a
  sprite named exactly `Duck`. Names are upsert keys — a colliding import
  becomes `Duck-2`.
- **Indentation is structural** inside `do:` blocks. An unindented line after
  `if:` is not in the branch.
- **Case matters in names.** `watches: Enemies` must match the collection's
  declared name.
- **`enabled:` is not runtime state.** It is read at transpile time, so
  `MyObserver.enabled = false` in a `do:` block is a no-op. Gate behavior with a
  collection `where:` filter (preferred), a `stopif:`, or an `if:`.
- **Disabling an observer does not stop a moving entity.** The engine owns
  velocity integration: any entity with `vx`/`vy` has its `x`/`y` advanced every
  tick by the runtime, not by your observer. So gating the observer that *applies*
  velocity (`stopif:`, an `if:` guard, `every:` change) leaves the entity coasting
  forever at its last speed. To freeze something you must zero the velocity —
  `vx = 0` and `vy = 0` — or `reset: entity.vy` / `reset: entity` to clear the
  whole physics state. Gate the observer *and* zero the velocity; the gate alone
  is the trap. `validateScript` warns when a `stopif:`-gated observer drives
  velocity and nothing in the script clears it.
- **`RANDOM(a, b)` is a pick-list, never a range.** Comma always chooses from the
  values you listed, at every arity: `RANDOM(1, 6)` gives 1 or 6, and
  `RANDOM("red", "blue")` gives one of those words. For a random number *between*
  two values use the `to` form — `RANDOM(1 to 6)`, `RANDOM(gapMin to gapMax)` —
  which is also the only form that evaluates property refs: the comma form picks
  the literal string `"gapMin"` (→ 0), silently producing garbage.
  `validateScript` warns on both the property-ref comma form and the two-literal
  comma pair (which used to mean a range).
- **Build display text with `$` interpolation.** It is the house style:
  `entity.text = "Score: $Game.score   Lives: $Game.lives"`. The string reads as
  the sentence the player sees, and the spacing is visible instead of assembled
  from arguments. A `$` takes a property, a dotted path (`$Players.first.name`,
  `$Player.0.score`), a **macro call** (`"Stars left: $COUNT(Stars)"`), or any
  expression in braces (`"${entity.hp / entity.maxHp * 100}%"`). `TEXT()` and `+`
  still work and are equivalent — reach for them only when the creator's script
  already uses them.
- **`COUNT(Coll)` includes the current entity** when it is a member of that
  collection. `if: COUNT(Enemies) == 0` is therefore a valid win condition even
  from an observer watching `Enemies`; `COUNT(Coll) - 1` is "how many others".

## Verifying

`validateScript` catches structural and semantic errors. `debugStep` runs the
world for N ticks headlessly and hands back a snapshot of real entity state —
that is how you prove behavior. If entities aren't where you expected, read the
snapshot before editing again.
