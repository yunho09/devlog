import fs from "node:fs";
import path from "node:path";

export function loadEnv(projectRoot = process.cwd()) {
  const envPath = path.join(projectRoot, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function getConfig() {
  const required = ["GITHUB_TOKEN", "GITHUB_USERNAME", "OBSIDIAN_VAULT"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    githubToken: process.env.GITHUB_TOKEN,
    githubUsername: process.env.GITHUB_USERNAME,
    obsidianVault: process.env.OBSIDIAN_VAULT,
    obsidianDevlogDir: process.env.OBSIDIAN_DEVLOG_DIR || "devlog",
    includedRepos: parseList(process.env.DEVLOG_INCLUDED_REPOS),
    excludedRepos: parseList(process.env.DEVLOG_EXCLUDED_REPOS),
    geminiApiKey: normalizeOptionalGeminiKey(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    openaiApiKey: normalizeOptionalOpenAIKey(process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    syncDays: parsePositiveInteger(process.env.DEVLOG_SYNC_DAYS, 7)
  };
}

function parseList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeOptionalGeminiKey(value) {
  if (!value || value === "your_gemini_key_here" || value === "...") {
    return "";
  }

  return value;
}

function normalizeOptionalOpenAIKey(value) {
  if (!value || value === "sk-your_key_here" || value === "...") {
    return "";
  }

  return value;
}

function parsePositiveInteger(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
