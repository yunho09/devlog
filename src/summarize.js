export async function summarizeCommit({
  geminiApiKey,
  geminiModel,
  openaiApiKey,
  openaiModel,
  dateLabel,
  commit
}) {
  const projectName = commit.repo.split("/").pop() || commit.repo;
  const shortSha = commit.sha.slice(0, 7);
  const prompt = buildPrompt({ dateLabel, commit, projectName, shortSha });

  if (geminiApiKey) {
    try {
      return await summarizeWithGemini({
        apiKey: geminiApiKey,
        model: geminiModel,
        prompt,
        dateLabel
      });
    } catch (error) {
      console.warn(`${error.message} Falling back to non-AI note.`);
    }
  }

  if (openaiApiKey) {
    try {
      return await summarizeWithOpenAI({
        apiKey: openaiApiKey,
        model: openaiModel,
        prompt,
        dateLabel
      });
    } catch (error) {
      console.warn(`${error.message} Falling back to non-AI note.`);
    }
  }

  return buildBasicCommitNote({ dateLabel, commit, projectName, shortSha, reason: "AI API를 사용할 수 없어" });
}

async function summarizeWithGemini({ apiKey, model, prompt, dateLabel }) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model,
      system_instruction:
        "You write concise Korean developer worklogs for Obsidian. Write one note for one Git commit. Focus on what changed, why it matters, and what can be inferred from the commit message. Avoid hype. Do not invent details that are not supported by the commit data.",
      input: prompt
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = data.output_text || extractGeminiOutputText(data);

  return normalizeMarkdown(text, dateLabel);
}

async function summarizeWithOpenAI({ apiKey, model, prompt, dateLabel }) {
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
            "You write concise Korean developer worklogs for Obsidian. Write one note for one Git commit. Focus on what changed, why it matters, and what can be inferred from the commit message. Avoid hype. Do not invent details that are not supported by the commit data."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = data.output_text || extractOpenAIOutputText(data);

  return normalizeMarkdown(text, dateLabel);
}

function buildPrompt({ dateLabel, commit, projectName, shortSha }) {
  const commitText = [
    `Repository: ${commit.repo}`,
    `Commit: ${commit.sha}`,
    `Time: ${commit.committedAt}`,
    `Message: ${commit.message}`,
    `URL: ${commit.url}`
  ].join("\n");

  return `Write an Obsidian Markdown devlog for ${dateLabel} from this GitHub commit.

Use exactly this structure:
# ${dateLabel}

## 요약
Write 2-4 concise Korean sentences summarizing this single commit.

## 변경 내용
- List the concrete changes in Korean.
- Mention added, changed, removed, or fixed behavior when it can be inferred.

## 의도
Explain why this change was likely made in Korean.
If the commit data is not enough, explicitly say "커밋 메시지 기준으로는 ..." and keep the inference conservative.

## 커밋
- 프로젝트: ${projectName}
- 저장소: ${commit.repo}
- 해시: ${shortSha}
- 시간: ${commit.committedAt}
- 링크: ${commit.url}

Commit details:
${commitText}`;
}

function buildBasicCommitNote({ dateLabel, commit, projectName, shortSha, reason }) {
  const subject = commit.message.split(/\r?\n/).find(Boolean) || "커밋 메시지 없음";

  return `# ${dateLabel}

## 요약
${projectName} 프로젝트에서 "${subject}" 작업이 기록되었습니다. ${reason} 커밋 메시지 기준의 기본 노트로 생성했습니다.

## 변경 내용
- 커밋 메시지: ${subject}

## 의도
커밋 메시지 기준으로는 해당 변경이 프로젝트 작업 내역을 기록하기 위해 추가되었습니다.

## 커밋
- 프로젝트: ${projectName}
- 저장소: ${commit.repo}
- 해시: ${shortSha}
- 시간: ${commit.committedAt}
- 링크: ${commit.url}
`;
}

function normalizeMarkdown(text, dateLabel) {
  return text.trim().startsWith("#") ? `${text.trim()}\n` : `# ${dateLabel}\n\n${text.trim()}\n`;
}

function extractGeminiOutputText(data) {
  return (data.steps || [])
    .flatMap((step) => step.content || step.output || [])
    .filter((content) => content.type === "text" || content.type === "output_text")
    .map((content) => content.text || "")
    .join("\n");
}

function extractOpenAIOutputText(data) {
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text)
    .join("\n");
}
