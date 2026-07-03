import fs from "node:fs/promises";
import path from "node:path";

const STATE_FILE = ".devlog-state.json";

export async function loadState({ vaultPath, devlogDir }) {
  const filePath = getStatePath({ vaultPath, devlogDir });

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return {
      processedCommits: Array.isArray(parsed.processedCommits) ? parsed.processedCommits : []
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { processedCommits: [] };
    }

    throw error;
  }
}

export async function saveState({ vaultPath, devlogDir, state }) {
  const directory = path.join(vaultPath, devlogDir);
  const filePath = getStatePath({ vaultPath, devlogDir });
  const data = {
    processedCommits: [...new Set(state.processedCommits)].sort()
  };

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getStatePath({ vaultPath, devlogDir }) {
  return path.join(vaultPath, devlogDir, STATE_FILE);
}
