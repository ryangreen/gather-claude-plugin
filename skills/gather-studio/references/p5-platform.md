# p5 and Gather Platform workflow

## Orient and choose an exact contract

Call `getOpenProject` and `getProjectMetadata` before editing. A p5 project must
advertise `language: javascript`, `engine.id: p5`, an exact engine version,
`main.js`, the exact Platform SDK version, declared capabilities, and its draft
or release context. Never infer the engine from source text. Do not substitute
`latest` or upgrade a project implicitly.

Gather currently supports p5 1.11.13 and 2.3.2 with Gather Platform SDK 1.0.0.
Use `getProjectMetadata` rather than relying on this reference when choosing the
active project's versions; catalog support can change after this skill ships.

## Author safely

Use p5 instance mode and only the virtual imports `p5`, `@gather/platform`, and
optional `@gather/p5`. Relative modules, CDNs, arbitrary npm packages, dynamic
imports, `eval`, and global p5 callbacks are outside the supported sandbox.

1. `readProjectFile` reads the live `main.js` buffer when Studio is connected.
2. `getProjectOutline` returns JavaScript functions, classes, and variables.
3. `editProjectText` replaces one exact unique span; stale or ambiguous anchors
   are rejected. Read again instead of widening an uncertain edit.
4. `validateProject`, then `buildProject`. A clean parser result is not proof
   that the restricted bundle resolves or that capabilities are declared.
5. `runProject` starts the connected Studio preview only after a safe build.
6. `getProjectConsole` reads bounded console events and source-mapped build or
   runtime diagnostics. Fix the reported `main.js` location.

GatherScript section tools and `debugStep` are not p5 tools. Never attempt to
represent p5 objects as Gather ECS entities. For multiplayer, project plain
Platform entity records into engine-owned p5 objects.

## Platform SDK

Import `{ gather }` from `@gather/platform` and `await gather.ready()` before
calls. Capabilities are least-privilege declarations checked again by the host:
`context`, `players`, `assets`, `storage`, `share`, `multiplayer`, `worldmaps`,
`namespaces`, and `purchases`. If the console reports a capability denial,
declare only the capability the game actually needs or remove the call.

The host owns player/game/release identity, credentials, authorization,
worldmap destinations, economic confirmation, audit, and receipts. Game code
must not invent or receive those authority identifiers.

## Preview, release, and public play

Preview the saved revision in Studio and inspect diagnostics, warnings, and
bundle measurements. Then use Release Management:

1. Review the exact source revision, engine, SDK, capabilities, assets, and
   dependency locks.
2. Review Credits & Contributions. Structural sources, libraries, assets,
   dependencies, tools, and remix ancestry cannot be removed. Correct roles,
   reconcile identities, and add missing offline contributors.
3. Confirm the credit snapshot. Any later source or provenance change
   invalidates it and requires review again.
4. Finalize only after the server rebuild succeeds and immutable artifacts and
   the contribution graph are present.

Do not use the legacy `publishGame` shortcut as proof that a p5 release was
minted. A successful p5 release comes from Release Management and locks its
bundle, source map, source snapshot, engine artifact, Platform SDK,
capabilities, assets, and confirmed contribution graph.

The stable `/play/<id>` URL serves the selected release. `?v=<release-id>` must
boot that historical release's exact engine/SDK/dependency locks and Credits &
Sources graph, never today's mutable project state.

## Attribution and accepted edits

MCP edits are private audit evidence, not automatic public credit. Accepted
edits record the initiating user, OAuth client, tool, citations, exact
engine/SDK sources, and resulting revision. Release review turns the immutable
contribution graph into accurate public credits; never infer credit or royalty
weight from line count, tool calls, or connection time.
