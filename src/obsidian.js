import fs from "node:fs/promises";
import path from "node:path";

export async function writeDailyNote({ vaultPath, devlogDir, dateLabel, markdown }) {
  const directory = path.join(vaultPath, devlogDir);
  const filePath = path.join(directory, `${dateLabel}.md`);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, markdown, "utf8");

  return filePath;
}
