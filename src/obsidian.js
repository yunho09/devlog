import fs from "node:fs/promises";
import path from "node:path";

export async function writePullRequestNote({ vaultPath, devlogDir, dateLabel, pullRequest, markdown }) {
  const projectName = getProjectName(pullRequest.repo);
  const directory = path.join(vaultPath, devlogDir, projectName);
  const filePath = path.join(directory, `${dateLabel}-pr-${pullRequest.number}.md`);

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
