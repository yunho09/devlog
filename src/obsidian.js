import fs from "node:fs/promises";
import path from "node:path";

export async function writeCommitNote({ vaultPath, devlogDir, dateLabel, commit, markdown }) {
  const projectName = getProjectName(commit.repo);
  const directory = path.join(vaultPath, devlogDir, projectName);
  const shortSha = commit.sha.slice(0, 7);
  const filePath = path.join(directory, `${dateLabel}-${shortSha}.md`);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, markdown, "utf8");

  return filePath;
}

function getProjectName(repoFullName) {
  const repoName = repoFullName.split("/").pop() || "unknown-project";

  return sanitizePathSegment(repoName);
}

function sanitizePathSegment(value) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\.+$/g, "")
    .replace(/^-+$/g, "unknown-project") || "unknown-project";
}
