#!/usr/bin/env node

import { loadEnv, getConfig } from "./config.js";
import { todayRange } from "./date.js";
import { fetchCommits } from "./github.js";
import { summarizeWorklog } from "./summarize.js";
import { writeDailyNote } from "./obsidian.js";

async function main() {
  loadEnv();

  const command = process.argv[2] || "today";

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command !== "today") {
    throw new Error(`Unknown command: ${command}`);
  }

  const config = getConfig();
  const range = todayRange();

  const commits = await fetchCommits({
    token: config.githubToken,
    username: config.githubUsername,
    since: range.since,
    until: range.until
  });

  const markdown = await summarizeWorklog({
    apiKey: config.openaiApiKey,
    model: config.openaiModel,
    dateLabel: range.label,
    commits
  });

  const filePath = await writeDailyNote({
    vaultPath: config.obsidianVault,
    devlogDir: config.obsidianDevlogDir,
    dateLabel: range.label,
    markdown
  });

  console.log(`Wrote ${filePath}`);
}

function printHelp() {
  console.log(`DevLog

Usage:
  devlog today

Environment:
  GITHUB_TOKEN
  GITHUB_USERNAME
  OBSIDIAN_VAULT
  OBSIDIAN_DEVLOG_DIR
  OPENAI_API_KEY
  OPENAI_MODEL
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
