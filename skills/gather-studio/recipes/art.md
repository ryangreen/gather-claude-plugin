---
id: art
effort: medium
when: Make or change how something looks, such as a sprite, an animation, its frames, a tileset, an icon or generated art.
surfaces: [ide, mcp, builder]
opens: []
tools: [listUserSprites, setSpriteFrames, drawSprite, readSprite, resizeSprite, generateImage, applyScriptOps, readRoomSprite, createRoomSprite, drawRoomSprite, setRoomSpriteFrames, resizeRoomSprite]
roundBudget: 10
keywords: [sprite, sprites, art, artwork, draw, drawing, redraw, pixel, pixels, pixel art, animation, animate, animated, frames, tileset, tiles, icon, image, picture, graphic, graphics, paint, look like, looks like, generate an image, generate a sprite]
---

# Art

Start at the cheapest tier that answers the request, name it, and offer the next one rather than climbing unasked.

1. **Look first.** `listUserSprites`, or in a room `readRoomSprite`: the best art already exists.
2. **Greybox** when behaviour matters more than looks: a `polygon` or a plain shape, in one `applyScriptOps`.
3. **Draw it**, which is free. `setSpriteFrames`, `drawSprite`, `resizeSprite` `trim: true`, `saveSprite` (only replacing asks). Site closed: `createSpriteDraft`, `saveSpriteDraft`. Room: `*RoomSprite*` tools.
4. **One subject or set per sheet**: states, variations, a prop kit. States are rows; switch `entity.frames`, never `sprite:`. Append to a set in use.
5. **Generate it** only when the finish matters. `generateImage` costs money, so quote the price first; fromSprite paints blocked-out shapes. In a room, the player who asked pays and answers the card.
6. Wire the sprite in under the name the save reports, and set `size:` from the trimmed size.
