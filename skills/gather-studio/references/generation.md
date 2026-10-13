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
   `spriteName`.
2. `listUserSprites` — confirm the final name (a taken name becomes `Duck-2`).
3. `applyScriptOps` — an insert or update op carrying `sprite: <that name>`.

Only images can be imported this way. A rare server-side format it can't read
returns a "open the IDE" message — do that and retry, and the editor path
handles any format.

## They never charge on their own

Each call files an approval request and returns a `requestId`. An approval modal
opens in the middle of the user's IDE showing which AI asked, the exact prompt,
the model, and the price. Poll `getGenerationResult` until it leaves
`awaiting_approval`.

Do not badger. Once approved, a generation commonly takes several minutes; the
creator can watch it in their Sprites panel and in Generated Images, so there is
no need to narrate the wait at them.

| Result | Meaning | What you do |
|---|---|---|
| `awaiting_approval` | Card is on screen | Keep polling |
| `succeeded` | Paid and generated | Finish the loop (below) |
| `declined` | The user said no | Do **not** re-request the same thing. Ask what to change |
| `expired` | They never saw it (15 min) | Ask them to keep the IDE open, then retry |
| `failed` | Generation failed | The pennies are refunded. Say so |

## Rules

- **Quote before you ask.** `listImageModels` / `listVideoModels` return exact
  prices in pennies. Video costs far more than images. Put the price in the same
  sentence as the suggestion — never propose a spend the user has to go look up.
- **Requesting requires an open IDE tab.** With none open there is nobody to
  approve; the tool says so. Ask them to open their project.
- **Reuse before you buy.** `listUserSprites` first. Existing art is free.
- **One request, one approval, one result.** Never chain generations
  speculatively or queue several to "save time".

## Finish the loop: generation → sprite → script

A generated image is useless to a script until it is a **named sprite**. Always
pass `spriteName`, and always carry it through to a working entity:

1. `generateImage({ prompt, spriteName: "Duck" })` → `requestId`
2. Poll `getGenerationResult` until `succeeded`
3. `listUserSprites` — confirm the **final** name. A taken name becomes `Duck-2`,
   because sprite saves upsert by name and Gather refuses to destroy existing art
4. `applyScriptOps` — an insert or update op using `sprite: <that exact name>`
5. `validateScript`, then `debugStep` to confirm it renders

Do not stop at step 2 and ask the user to import it by hand.

If you forgot `spriteName`, the image is stranded in the IDE's Generated Images
queue. Say that plainly and offer to regenerate with a name — don't pretend it
landed.
