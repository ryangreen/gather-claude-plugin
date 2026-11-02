# Generating images and video

`generateImage` and `generateVideo` are the **only** tools that can cost the
user money. They spend GatherScript Pennies, which are real currency the user
bought or earned.

## Seeing what's already been generated

`getGenerationResult` polls a **single** request you already hold the
`requestId` for — it cannot browse history. To answer "which images/videos have
we generated?", call **`listGenerations`**. It returns the account's past
AtlasCloud jobs newest-first — the same history as the IDE's **File ▸ Generated
Images** queue — each with its op (image/video), model, status, prompt, cost,
`outputUrl`, and the sprite-library name it was imported under (`spriteName`, if
any). Pass `type: "image"` / `type: "video"` to narrow, and `limit` to page.

Related: `listUserSprites` now returns a `source` on every sprite —
`ai-generated`, `ai-remixed`, `imported`, or `original` — so you can tell which
library sprites came from AI without guessing from their names. And if the user
just wants to look rather than have you read the list, `navigateTo` opens the
Generated Images queue in their IDE.

## Frame size — say what size the game draws it

Image models return large images (often 1024×1024) whatever the prompt asks
for. Pass the size each frame should be saved at, and the result is brought to
it on import:

- `generateImage({ …, spriteName, frameWidth: 64, frameHeight: 64 })` — a
  1024×1024 result saves as a 64×64 sprite. For a sheet, it is the size of
  **one frame**, with `spriteCols`/`spriteRows` as usual.
- `resample: "pixel-art"` (the default) keeps each block's most common colour
  with hard edges, which is right for pixel art — including generated pixel
  art, whose "pixels" are soft blobs a plain shrink would break up.
  `resample: "smooth"` averages, for painted or rendered art.
- Art keeps its shape: a frame that is not the target's shape is scaled to fit
  and padded with transparency, never stretched.
- A paint-over (`fromSprite`) keeps the source sprite's frame size unless you
  give one.

Leave the size out and frames keep whatever size the model returned.

## Rescuing a stranded generation — `importGeneration`

A finished image with `spriteName: null` in `listGenerations` was generated
without an import name. It sits in the Generated Images queue and **no script can
reference it** — but it is already paid for. Do **not** re-generate it to get a
usable sprite (that spends pennies again and leaves a duplicate). Call
`importGeneration` instead:

1. `importGeneration({ generationId, spriteName: "Duck" })` — imports the
   EXISTING image into the sprite library for **free**. Works with the IDE open
   (runs through the editor: thumbnail, full processing) or closed (imported
   server-side). If the generation already carried a name you can omit
   `spriteName`. It uses the frame size asked for at generation time; `width`,
   `height` and `mode` choose another.
2. `listUserSprites` — confirm the final name (a taken name becomes `Duck-2`).
3. `applyScriptOps` — an insert or update op carrying `sprite: <that name>`.

Only images can be imported this way. A rare server-side format it can't read
returns a "open the IDE" message — do that and retry, and the editor path
handles any format.

## Art made outside Gather — upload it, don't paste it

An image you made with your own tool (an image model on your side, a script that
draws one) or a file the creator gave you can become a sprite without spending
anything and without passing through the conversation:

1. `requestSpriteUpload({ count })` — one upload URL per file.
2. For each file: `curl -sf -X PUT -H "Content-Type: image/png" --data-binary
   @<file> "<uploadUrl>"`. Always send that content type; PNG, JPEG and WebP
   files all work. A URL lasts two hours and takes one file.
3. `importSprite({ name, images: [{ uploadId }, …] })` — one new sprite:
   - **One file** is a sheet: give `cols` and `rows` (and `frames` if the last
     row is short). Left out, it is a single frame.
   - **Several files** are one frame each, in the order listed. They must be one
     size, or give `width` and `height` to fit them all to one.
   - `width`/`height` also bring large art down to sprite size; `mode: "smooth"`
     suits painted art, the default `"pixel-art"` suits pixel art.
4. Wire `sprite: <savedAs>` into the script. A taken name gets a suffix; nothing
   is ever overwritten.

To put uploaded images into **frames of a sprite draft** instead — to keep
drawing on them, or to fill an animation you already started — pass the same
uploads to `setSpriteFrames({ draftId, revision, images: [{ uploadId }, …],
startFrame })`. Each image becomes one frame, from `startFrame` on (default 0,
appending past the end), brought to the draft's frame size with `mode` as
above. A draft holds pixel art, so each pixel ends up drawn or clear and busy art is
reduced to 64 colours; `notes` says what was done.

`imageBase64` in place of `uploadId` exists for clients that cannot run `curl`.
Every byte costs tokens, so it is the last resort, never the default.

## They never charge on their own

The creator approves every spend on a Gather page, the same way they approve a
publish. The Gather site does not need to be open:

1. Call `generateImage` (or `generateVideo`). Nothing is charged. The result
   carries an **Approve on Gather** link and an `approval.actionId`. Some clients
   also pop the page open, and an open Gather tab shows the same question as a
   card. If the creator answers within a few seconds, this call goes straight on
   to step 3.
2. Show them the link and say what it costs. Wait for them to tell you they
   answered.
3. Call again with the **same arguments** and `confirm: <actionId>`. Gather
   generates it and returns a `requestId`. If you change the prompt, model or
   any option, that is a different spend and needs its own approval.
4. Poll `getGenerationResult` every few seconds. Each poll moves it forward,
   and when it finishes the image is saved to the sprite library (or the clip
   to the video library) under the name you asked for.

Do not badger. A generation commonly takes a while, and video can take several
minutes. The creator can watch it in Generated Images, so there is no need to
narrate the wait at them.

| Result | Meaning | What you do |
|---|---|---|
| `awaiting_approval` | They have not answered yet | Wait for them, then confirm |
| `running` | Approved and generating | Keep polling |
| `succeeded` | Paid, generated and saved | Finish the loop (below), using the `spriteName` it reports |
| `declined` | The user said no | Do **not** re-request the same thing. Ask what to change |
| `expired` | Nobody answered in time | Ask before requesting again |
| `failed` | Generation failed | The pennies are refunded. Say so |

## Rules

- **Quote before you ask.** `listImageModels` / `listVideoModels` return exact
  prices in pennies. Video costs far more than images. Put the price in the same
  sentence as the suggestion — never propose a spend the user has to go look up.
- **Only the creator can approve.** Never pass `confirm` before they say they
  answered, and never tell them it is done until `getGenerationResult` says so.
- **Reuse before you buy.** `listUserSprites` first. Existing art is free.
- **One request, one approval, one result.** Never chain generations
  speculatively or queue several to "save time".

## Finish the loop: generation → sprite → script

A generated image is useless to a script until it is a **named sprite**. Always
pass `spriteName`, and always carry it through to a working entity:

1. `generateImage({ prompt, spriteName: "Duck" })` → approval link; once they
   approve, the same call with `confirm` → `requestId`
2. Poll `getGenerationResult` until `succeeded`
3. Use the `spriteName` it reports — the **final** name. A taken name becomes
   `Duck-2`, because Gather refuses to destroy existing art
4. `applyScriptOps` — an insert or update op using `sprite: <that exact name>`
5. `validateScript`, then `debugStep` to confirm it renders

Do not stop at step 2 and ask the user to import it by hand.

If you forgot `spriteName`, the image is stranded in the Generated Images queue.
Say that plainly and rescue it with `importGeneration` (above), which is free —
don't regenerate it, and don't pretend it landed.
