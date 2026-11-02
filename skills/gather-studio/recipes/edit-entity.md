---
id: edit-entity
effort: small
when: Change something that already exists (a value, a colour, a size, a speed, a position, a name) without adding new behaviour.
surfaces: [ide, builder, mcp]
opens: []
tools: [searchSections, getSection, applyScriptOps, validateScript, debugStep]
roundBudget: 4
keywords: [faster, slower, quicker, bigger, smaller, larger, taller, shorter, wider, narrower, heavier, lighter, brighter, darker, louder, quieter, higher, lower, sluggish, too fast, too slow, too big, too small, too high, too low, tweak, adjust, rename, recolor, recolour, resize, increase, decrease, reduce, change the colour, change the color, change the size, change the speed]
---

# Edit an entity

A small change to something that already exists. Go straight to it.

1. Find the section: `searchSections` by name, or the ref you already hold (`entity:Bat`). Read it with `getSection`.
2. Write it with one `applyScriptOps` update. An update replaces every property, so send the whole section with your change in it.
3. `validateScript`. For a change the player would feel (speed, size, timing), `debugStep` a few ticks and check the value moved.

Skip the docs and the knowledge base when the property is already in the section: you are changing a value, not learning syntax. Research the moment that stops being true, such as a property this script does not use yet or a validation error you cannot read. Then `searchDocs` with the exact name.

Say what changed in one line, with the old value and the new one.
