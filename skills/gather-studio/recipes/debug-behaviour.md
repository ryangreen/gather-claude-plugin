---
id: debug-behaviour
effort: medium
when: Something in the game does not work as expected, for example it will not move, spawn, collide, score or respond to input, or it breaks.
surfaces: [ide, builder, mcp]
opens: []
tools: [debugStep, replayWithInput, searchSections, getSection, applyScriptOps, validateScript]
roundBudget: 8
keywords: [bug, buggy, broken, doesn't, does not, don't, isn't, is not, won't, will not, not working, stopped working, stuck, wrong, glitch, glitchy, fix, nan, nothing happens, disappear, disappears, falls through, error, crash, crashes, freezes]
---

# Debug a behaviour

Read the evidence before you edit.

1. Run it. `debugStep` enough ticks to reach the moment that goes wrong, and read the snapshot: is the entity there, in the collection, holding the value you expect?
2. The runtime tools read real state: `getObserverActivity` (did an observer run, what did it write), `getEntityChanges` (one entity over time), and `replayWithInput`, whose `expect` list names the first tick that went wrong and why. `renderRunFrames` draws that run. In the IDE they are the `runtime` tool group.
3. Read the section that owns the behaviour with `getSection`. That is usually the observer, not the entity.
4. Fix it with one `applyScriptOps`, then `validateScript` and `debugStep` the same ticks again. The fix is done when the snapshot shows it, not when validation passes.

The skill's "When the game misbehaves" section maps common symptoms to the check that answers them.
