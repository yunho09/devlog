#!/usr/bin/env node

import { loadEnv, getConfig } from "./config.js";
import { formatDate, recentRange, todayRange } from "./date.js";
import { fetchCommits } from "./github.js";
import { summarizeCommit } from "./summarize.js";
import { writeCommitNote } from "./obsidian.js";
import { loadState, saveState } from "./state.js";

async function main() {
  loadEnv();

  const command = process.argv[2] || "today";

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command !== "today" && command !== "sync") {
    throw new Error(`Unknown command: ${command}`);
  }

  const config = getConfig();

  if (command === "today") {
    await runToday(config);
    return;
  }

  await runSync(config);
}

async function runToday(config) {
  const range = todayRange();

  const commits = await fetchCommits({
    token: config.githubToken,
    username: config.githubUsername,
    since: range.since,
    until: range.until
  });

  if (commits.length === 0) {
    console.log("No commits found for today.");
    return;
  }

  for (const commit of commits) {
    const filePath = await writeCommit(config, commit);
    console.log(`Wrote ${filePath}`);
  }
}

async function runSync(config) {
  const range = recentRange(config.syncDays);
  const state = await loadState({
    vaultPath: config.obsidianVault,
    devlogDir: config.obsidianDevlogDir
  });
  const processed = new Set(state.processedCommits);

  const commits = await fetchCommits({
    token: config.githubToken,
    username: config.githubUsername,
    since: range.since,
    until: range.until
  });

  const newCommits = commits.filter((commit) => !processed.has(commit.sha));

  if (newCommits.length === 0) {
    console.log("No new commits found.");
    return;
  }

  for (const commit of newCommits.reverse()) {
    const filePath = await writeCommit(config, commit);
    processed.add(commit.sha);
    await saveState({
      vaultPath: config.obsidianVault,
      devlogDir: config.obsidianDevlogDir,
      state: { processedCommits: [...processed] }
    });

    console.log(`Wrote ${filePath}`);
  }
}

async function writeCommit(config, commit) {
  const dateLabel = formatDate(new Date(commit.committedAt));
  const markdown = await summarizeCommit({
    geminiApiKey: config.geminiApiKey,
    geminiModel: config.geminiModel,
    openaiApiKey: config.openaiApiKey,
    openaiModel: config.openaiModel,
    dateLabel,
    commit
  });

  return writeCommitNote({
    vaultPath: config.obsidianVault,
    devlogDir: config.obsidianDevlogDir,
    dateLabel,
    commit,
    markdown
  });
}

function printHelp() {
  console.log(`DevLog

Usage:
  devlog today
  devlog sync

Environment:
  GITHUB_TOKEN
  GITHUB_USERNAME
  OBSIDIAN_VAULT
  OBSIDIAN_DEVLOG_DIR
  GEMINI_API_KEY optional
  GEMINI_MODEL optional
  OPENAI_API_KEY optional fallback
  OPENAI_MODEL optional fallback
  DEVLOG_SYNC_DAYS
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
