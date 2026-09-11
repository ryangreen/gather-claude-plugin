#!/usr/bin/env node
/**
 * Is this published plugin stale?
 *
 * The plugin repo is a COPY of the `skills/` directory in the Gather app repo.
 * Gather serves the authoritative version live at /.well-known/skills/, which
 * updates on every app deploy — but the plugin only changes when someone
 * remembers to rebuild and push it. Nothing in either repo can notice the gap,
 * because they are different repos.
 *
 * This script closes that: it fetches what Gather is serving right now and
 * diffs it against the files sitting here. Drift means creators who installed
 * the plugin are running older instructions than creators who didn't.
 *
 * Copied into the plugin repo by `npm run plugin:build` in the app repo.
 * Do not edit it here — edit scripts/plugin-ci/check-skill-drift.mjs there.
 *
 * Usage:
 *   node .github/check-skill-drift.mjs [--base https://gathergamestudio.com]
 *
 * Exit codes:
 *   0  in sync
 *   1  drift found
 *   2  could not check (network, bad response) — deliberately NOT a pass
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const args = process.argv.slice(2);
const baseArg = args.indexOf("--base");
const BASE = (
  baseArg !== -1 ? args[baseArg + 1] : process.env.GATHER_BASE_URL
) ?? "https://gathergamestudio.com";

const dirArg = args.indexOf("--dir");
const ROOT = dirArg !== -1 ? args[dirArg + 1] : process.cwd();
const SKILLS_DIR = join(ROOT, "skills");

/** Compare ignoring line-ending and trailing-whitespace noise only. */
function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/\s+$/, "");
}

function localFiles(skillDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".md")) {
        out.push(relative(skillDir, full).split(sep).join("/"));
      }
    }
  };
  walk(skillDir);
  return out.sort();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

async function main() {
  if (!existsSync(SKILLS_DIR)) {
    console.error(`No skills/ directory at ${SKILLS_DIR}`);
    process.exit(2);
  }

  let index;
  try {
    index = JSON.parse(await fetchText(`${BASE}/.well-known/skills/index.json`));
  } catch (err) {
    // A dead endpoint must never read as "in sync".
    console.error(`Could not reach ${BASE}: ${err.message}`);
    console.error("Cannot verify the plugin against the live skill. Not passing.");
    process.exit(2);
  }

  const published = index.skills ?? [];
  if (published.length === 0) {
    console.error(`${BASE} published no skills. Refusing to call that in sync.`);
    process.exit(2);
  }

  const problems = [];

  for (const skill of published) {
    const dir = join(SKILLS_DIR, skill.name);
    if (!existsSync(dir)) {
      problems.push(`MISSING SKILL  ${skill.name} is published but not in this plugin`);
      continue;
    }

    const here = new Set(localFiles(dir));
    for (const file of skill.files) {
      if (!here.delete(file)) {
        problems.push(`MISSING FILE   ${skill.name}/${file}`);
        continue;
      }
      let live;
      try {
        live = await fetchText(`${BASE}/.well-known/skills/${skill.name}/${file}`);
      } catch (err) {
        console.error(`Could not fetch ${skill.name}/${file}: ${err.message}`);
        process.exit(2);
      }
      const local = readFileSync(join(dir, file), "utf-8");
      if (normalize(local) !== normalize(live)) {
        problems.push(`STALE          ${skill.name}/${file}`);
      }
    }
    for (const extra of here) {
      problems.push(`EXTRA FILE     ${skill.name}/${extra} is not published`);
    }
  }

  for (const name of readdirSync(SKILLS_DIR)) {
    if (!published.some((s) => s.name === name)) {
      problems.push(`EXTRA SKILL    ${name} is in this plugin but not published`);
    }
  }

  if (problems.length === 0) {
    console.log(`In sync with ${BASE} (${published.length} skill(s) checked).`);
    return;
  }

  console.error(`Plugin is out of date with ${BASE}:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    "\nFix from the Gather app repo:\n" +
      "  npm run plugin:build\n" +
      "  # then follow skills/RELEASING.md to push this repo\n",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
