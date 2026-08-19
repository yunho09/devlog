# DevLog

DevLog turns your GitHub pull requests into project-organized development notes for Obsidian.

## Goal

- Collect pull requests from your GitHub account.
- Summarize each pull request with AI.
- Write one Markdown note per pull request into your Obsidian folder.
- Organize notes into folders by project.

## Setup

```bash
cp .env.example .env
```

Edit `.env`:

```bash
GITHUB_TOKEN=...
GITHUB_USERNAME=...
OBSIDIAN_VAULT=/path/to/your/project/repo
OBSIDIAN_DEVLOG_DIR=devlog
DEVLOG_SYNC_DAYS=7
DEVLOG_INCLUDED_REPOS=
DEVLOG_EXCLUDED_REPOS=til
GEMINI_API_KEY=...
```

`GEMINI_API_KEY` is optional but recommended for free AI summaries through
Google AI Studio. If both `GEMINI_API_KEY` and `OPENAI_API_KEY` are empty, DevLog
writes a basic note from the PR title, body, commits, and changed files without calling an AI API.

## Usage

```bash
npm run today
```

To write only new pull requests from the recent sync window:

```bash
npm run sync
```

`sync` stores processed pull request ids in `OBSIDIAN_VAULT/devlog/.devlog-state.json`, so repeated runs skip PRs that already have notes.

## Automatic Sync

This repo includes a user systemd timer that runs `npm run sync` every 3 hours and then
commits and pushes any new notes with `scripts/publish.sh`, so the notes in your Obsidian
folder stay mirrored on GitHub without manual git work:

```bash
systemctl --user status devlog-sync.timer
systemctl --user list-timers devlog-sync.timer
```

To stop automatic sync:

```bash
systemctl --user disable --now devlog-sync.timer
```

To run the same sync-then-publish step by hand:

```bash
npm run sync:push
```

`publish.sh` only stages `OBSIDIAN_DEVLOG_DIR`, so unrelated working tree changes are left
alone. It needs a push-capable remote; with an SSH remote the key must have no passphrase
so the timer can push unattended.

This writes notes like:

```text
project-repo/
  devlog/
    project-name/
      2026-07-02-pr-12.md
```

Each note uses this structure:

```md
# 2026-07-02

## 요약

## 변경 내용

## 의도

## 포함된 커밋

## 변경 파일

## 생각 정리
- PR 내용과 변경 파일에 맞춘 질문 2개
- 작업하면서 느낀 점이나 배운 점을 묻는 질문 1개

## PR
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
