#!/usr/bin/env bash
# Commit and push devlog notes written by `npm run sync`.
set -euo pipefail

cd "$(dirname "$0")/.."

devlog_dir="devlog"
if [ -f .env ]; then
  from_env="$(sed -n 's/^OBSIDIAN_DEVLOG_DIR=//p' .env | tail -1)"
  [ -n "$from_env" ] && devlog_dir="$from_env"
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

git add -A -- "$devlog_dir"

if git diff --cached --quiet -- "$devlog_dir"; then
  echo "No new devlog notes to commit."
else
  git commit -m "Add PR devlog notes ($(date +%Y-%m-%d))" -- "$devlog_dir"
fi

# A previous run may have committed but failed to push, so push whenever the
# branch is ahead of its remote, not only when this run made a commit.
git fetch --quiet origin "$branch"
if [ "$(git rev-list --count "origin/$branch..$branch")" -eq 0 ]; then
  echo "Nothing to push."
  exit 0
fi

if ! git push origin "$branch"; then
  echo "Push rejected, rebasing on origin/$branch and retrying."
  git pull --rebase --autostash origin "$branch"
  git push origin "$branch"
fi
