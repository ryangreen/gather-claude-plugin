# Gather for Claude Code

Connects [Gather](https://gathergamestudio.com) to Claude Code and teaches it GatherScript.

```
/plugin marketplace add gathergamestudio.com/marketplace.json
/plugin install gather
```

Installing the plugin adds the Gather MCP server and the skills below. Run
`/mcp` afterwards to sign in — bring-your-own-AI requires a Gather Contributor
subscription.

## What's inside

- **MCP server** `https://gathergamestudio.com/api/mcp` — read and edit your scripts, search the
  docs and knowledge base, step the debugger, generate art (with your approval).
- **Skills** — `gather-studio`

## Don't edit this repo by hand

It is generated from the `skills/` directory in the Gather app repo by
`npm run plugin:build`. Edits here are overwritten on the next release.

A daily GitHub Action compares these files against the live skill Gather serves
at `https://gathergamestudio.com/.well-known/skills/`. If it fails, this plugin has fallen
behind the app and needs rebuilding and pushing.

Version 1.2.0
