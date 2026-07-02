export async function summarizeWorklog({ apiKey, model, dateLabel, commits }) {
  if (commits.length === 0) {
    return `# ${dateLabel}\n\n오늘 GitHub 커밋 기록이 없습니다.\n`;
  }

  const commitText = commits
    .map((commit) => {
      return [
        `Repository: ${commit.repo}`,
        `Commit: ${commit.sha}`,
        `Time: ${commit.committedAt}`,
        `Message: ${commit.message}`,
        `URL: ${commit.url}`
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You write concise Korean developer worklogs for Obsidian. Focus on what was built, fixed, or prepared. Avoid hype."
        },
        {
          role: "user",
          content: `Write an Obsidian Markdown devlog for ${dateLabel} from these GitHub commits:\n\n${commitText}`
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = data.output_text || extractOutputText(data);

  return text.trim().startsWith("#") ? `${text.trim()}\n` : `# ${dateLabel}\n\n${text.trim()}\n`;
}

function extractOutputText(data) {
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("\n");
}
