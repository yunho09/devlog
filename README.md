# DevLog

DevLog turns your GitHub commits into project-organized development notes for Obsidian.

## Goal

- Collect commits from your GitHub account.
- Summarize each commit with AI.
- Write one Markdown note per commit into your Obsidian vault.
- Organize notes into folders by project.

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
DEVLOG_SYNC_DAYS=7
GEMINI_API_KEY=...
```

`GEMINI_API_KEY` is optional but recommended for free AI summaries through
Google AI Studio. If both `GEMINI_API_KEY` and `OPENAI_API_KEY` are empty, DevLog
writes a basic note from the commit message without calling an AI API.

## Usage

```bash
npm run today
```

To write only new commits from the recent sync window:

```bash
npm run sync
```

`sync` stores processed commit hashes in `OBSIDIAN_VAULT/DevLog/.devlog-state.json`, so repeated runs skip commits that already have notes.

## Automatic Sync

This repo includes a user systemd timer that runs `npm run sync` every 30 minutes:

```bash
systemctl --user status devlog-sync.timer
systemctl --user list-timers devlog-sync.timer
```

To stop automatic sync:

```bash
systemctl --user disable --now devlog-sync.timer
```

This writes notes like:

```text
OBSIDIAN_VAULT/
  DevLog/
    project-name/
      2026-07-02-a1b2c3d.md
```

Each note uses this structure:

```md
# 2026-07-02

## 요약

## 변경 내용

## 의도

## 커밋
```

Or link the CLI locally:

```bash
npm link
devlog today
devlog sync
```

## GitHub remote setup

After creating a GitHub repository, connect it with:

```bash
npm run setup:git -- https://github.com/USER/REPO.git
```

This initializes Git if needed, sets the branch to `main`, and adds or updates the `origin` remote.
