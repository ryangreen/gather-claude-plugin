---
id: ship
effort: medium
when: Get the game in front of players, whether that means publishing, sharing, releasing, re-publishing after changes or making a playtest link.
surfaces: [ide, mcp]
opens: [memory, ship]
tools: [validateScript, debugStep, createScriptCheckpoint, createDraftPlaytestLink, publishGame, addScriptNote]
roundBudget: 5
keywords: [publish, publishing, republish, re-publish, share, sharing, release, ship, launch, go live, put it online, playtest, play link, share link, send it to]
---

# Ship it

A game nobody can play isn't finished, and a broken one is worse. Check this one runs first.

1. `validateScript`, then `debugStep` a few seconds of play. Fix what fails before anything else.
2. Record the release. `createScriptCheckpoint` with what changed and why, and an `addScriptNote` for anything deliberately left undone.
3. For a private look first, `createDraftPlaytestLink` gives the creator a link only they can open.
4. Publish with `publishGame`. The creator approves every publish, on a card in their editor or a Gather page, so don't call the game live until the `/play/` link comes back. If they decline, ask what they want instead of asking again.
5. Publishing again after later edits serves the new build at the same link.
