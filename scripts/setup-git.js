#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const remoteUrl = process.argv[2];

if (!remoteUrl) {
  console.error("Usage: npm run setup:git -- https://github.com/USER/REPO.git");
  process.exit(1);
}

run("git", ["init"]);
run("git", ["branch", "-M", "main"]);

if (hasRemote("origin")) {
  run("git", ["remote", "set-url", "origin", remoteUrl]);
} else {
  run("git", ["remote", "add", "origin", remoteUrl]);
}

console.log(`Git remote configured: ${remoteUrl}`);

function hasRemote(name) {
  try {
    execFileSync("git", ["remote", "get-url", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}
