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
  }).then((items) => filterCommits(items, config));

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
  }).then((items) => filterCommits(items, config));

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

function filterCommits(commits, config) {
  return commits.filter((commit) => {
    const repo = commit.repo.toLowerCase();
    const repoName = repo.split("/").pop();

    if (config.includedRepos.length > 0) {
      return config.includedRepos.includes(repo) || config.includedRepos.includes(repoName);
    }

    return !config.excludedRepos.includes(repo) && !config.excludedRepos.includes(repoName);
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
  DEVLOG_INCLUDED_REPOS optional comma-separated repo names
  DEVLOG_EXCLUDED_REPOS optional comma-separated repo names
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
