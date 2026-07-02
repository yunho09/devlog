# DevLog

DevLog turns your GitHub commits into daily development notes for Obsidian.

## Goal

- Collect commits from your GitHub account.
- Summarize what you worked on with AI.
- Write a Markdown daily note into your Obsidian vault.

## Setup

```bash
cp .env.example .env
```

Edit `.env`:

```bash
GITHUB_TOKEN=...
GITHUB_USERNAME=...
OBSIDIAN_VAULT=/path/to/your/obsidian/vault
OBSIDIAN_DEVLOG_DIR=DevLog
OPENAI_API_KEY=...
```

## Usage

```bash
npm run today
```

Or link the CLI locally:

```bash
npm link
devlog today
```

## GitHub remote setup

After creating a GitHub repository, connect it with:

```bash
npm run setup:git -- https://github.com/USER/REPO.git
```

This initializes Git if needed, sets the branch to `main`, and adds or updates the `origin` remote.
