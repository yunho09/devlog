#!/usr/bin/env node

import { loadEnv, getConfig } from "./config.js";
import { formatDate, recentRange, todayRange } from "./date.js";
import { fetchPullRequests } from "./github.js";
import { summarizePullRequest } from "./summarize.js";
import { writePullRequestNote } from "./obsidian.js";
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

  const pullRequests = await fetchPullRequests({
    token: config.githubToken,
    username: config.githubUsername,
    since: range.since,
    until: range.until
  }).then((items) => filterPullRequests(items, config));

  if (pullRequests.length === 0) {
    console.log("No pull requests found for today.");
    return;
  }

  for (const pullRequest of pullRequests) {
    const filePath = await writePullRequest(config, pullRequest);
    console.log(`Wrote ${filePath}`);
  }
}

async function runSync(config) {
  const range = recentRange(config.syncDays);
  const state = await loadState({
    vaultPath: config.obsidianVault,
    devlogDir: config.obsidianDevlogDir
  });
  const processed = new Set(state.processedPullRequests);

  const pullRequests = await fetchPullRequests({
    token: config.githubToken,
    username: config.githubUsername,
    since: range.since,
    until: range.until,
    mergedOnly: true
  }).then((items) => filterPullRequests(items, config));

  const newPullRequests = pullRequests.filter(
    (pullRequest) => pullRequest.mergedAt && !processed.has(pullRequest.id)
  );

  if (newPullRequests.length === 0) {
    console.log("No new merged pull requests found.");
    return;
  }

  for (const pullRequest of newPullRequests.reverse()) {
    const filePath = await writePullRequest(config, pullRequest);
    processed.add(pullRequest.id);
    await saveState({
      vaultPath: config.obsidianVault,
      devlogDir: config.obsidianDevlogDir,
      state: {
        processedCommits: state.processedCommits,
        processedPullRequests: [...processed]
      }
    });

    console.log(`Wrote ${filePath}`);
  }
}

async function writePullRequest(config, pullRequest) {
  const dateLabel = formatDate(new Date(pullRequest.mergedAt || pullRequest.closedAt || pullRequest.updatedAt));
  const markdown = await summarizePullRequest({
    geminiApiKey: config.geminiApiKey,
    geminiModel: config.geminiModel,
    openaiApiKey: config.openaiApiKey,
    openaiModel: config.openaiModel,
    dateLabel,
    pullRequest
  });

  return writePullRequestNote({
    vaultPath: config.obsidianVault,
    devlogDir: config.obsidianDevlogDir,
    dateLabel,
    pullRequest,
    markdown
  });
}

function filterPullRequests(pullRequests, config) {
  return pullRequests.filter((pullRequest) => {
    const repo = pullRequest.repo.toLowerCase();
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
