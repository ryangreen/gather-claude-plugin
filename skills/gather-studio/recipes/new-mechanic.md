---
id: new-mechanic
effort: large
when: Add behaviour the game does not have yet, such as a new ability, rule, enemy, spawner, system, level or way to win or lose.
surfaces: [ide, builder, mcp]
opens: [packages]
tools: [searchKnowledgeByTag, getKnowledgeById, searchDocs, getDocSection, checkGatherScriptExample, applyScriptOps, validateScript, debugStep]
roundBudget: 16
keywords: [add, adding, new, mechanic, ability, feature, system, double jump, wall jump, dash, powerup, power up, inventory, spawner, emitter, respawn, game over, win condition, let the player, should be able to, can now, make it so, when the player]
---

# Add a mechanic

New behaviour needs research, and research is cheap next to a rewrite.

1. **Compose first.** For a whole system (a controller, enemy AI, an inventory) search `listPublishedPackages` and `browseModdableGames` (or MCP's `searchReusable`), then `previewPackageRelease` the best match. One clear winner: import it. Several: show the creator two or three and let them choose, or with nobody to ask, take the best fit and say why. Skip this for a small mechanic.
2. **Find the technique.** One `searchKnowledgeByTag`; if it finds nothing, stop there. `searchDocs` for each property, macro and command you mean to use, and `getDocSection` to read what it finds.
3. **Build in one write.** The collection, the observer that watches it and the entities it needs go in one `applyScriptOps` list.
4. `validateScript`, then `debugStep` long enough to see the behaviour happen, and read the snapshot.
5. Cite any knowledge entry you adapted.
