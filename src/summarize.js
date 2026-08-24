export async function summarizePullRequest({
  geminiApiKey,
  geminiModel,
  openaiApiKey,
  openaiModel,
  dateLabel,
  pullRequest
}) {
  const projectName = pullRequest.repo.split("/").pop() || pullRequest.repo;
  const prompt = buildPrompt({ dateLabel, pullRequest, projectName });

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

  return buildBasicPullRequestNote({
    dateLabel,
    pullRequest,
    projectName,
    reason: "AI API를 사용할 수 없어"
  });
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
        "You write concise Korean developer worklogs for Obsidian. Write one note for one GitHub pull request. Focus on what changed, why it matters, troubleshooting the developer went through, the commits included in the PR, and notable files. Avoid hype. Do not invent details that are not supported by the PR data.",
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
            "You write concise Korean developer worklogs for Obsidian. Write one note for one GitHub pull request. Focus on what changed, why it matters, troubleshooting the developer went through, the commits included in the PR, and notable files. Avoid hype. Do not invent details that are not supported by the PR data."
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

function buildPrompt({ dateLabel, pullRequest, projectName }) {
  const commitsText = pullRequest.commits
    .map((commit) => {
      return [
        `- ${commit.sha.slice(0, 7)} ${commit.message.split(/\r?\n/)[0]}`,
        `  Time: ${commit.committedAt}`,
        `  URL: ${commit.url}`
      ].join("\n");
    })
    .join("\n");

  const filesText = pullRequest.files
    .map((file) => `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`)
    .join("\n");

  return `Write an Obsidian Markdown devlog for ${dateLabel} from this GitHub pull request.

Use exactly this structure:
# ${dateLabel}

## 요약
Write 2-4 concise Korean sentences summarizing this PR.

## 변경 내용
- List the concrete changes in Korean based on the PR title, body, commits, and changed files.
- Mention added, changed, removed, or fixed behavior when it can be inferred.

## 의도
Explain why this change was likely made in Korean.
If the PR data is not enough, explicitly say "PR 정보 기준으로는 ..." and keep the inference conservative.

## 포함된 커밋
- List each commit with short SHA and message in Korean or preserve the original message when clearer.

## 변경 파일
- Summarize the important changed files and what they likely affected.

## 트러블 슈팅
- Describe problems the developer likely hit and how they were resolved, in Korean, as "문제 → 해결" bullet points.
- Use evidence from the PR body and commits: fix/hotfix/revert commits, bug-related wording, repeated changes to the same file.
- If the PR data shows no sign of troubleshooting, write exactly one line: "- PR 정보 기준으로는 기록된 트러블 슈팅이 없습니다." Do not invent problems.

## 생각 정리
- Ask exactly 3 reflection questions in Korean.
- Make the first 2 questions specific to what this PR changed, using the PR title, commits, and changed files.
- Make the last question ask about what the developer felt or learned while doing this PR.

## PR
- 프로젝트: ${projectName}
- 저장소: ${pullRequest.repo}
- 번호: #${pullRequest.number}
- 상태: ${pullRequest.mergedAt ? "merged" : pullRequest.state}
- 브랜치: ${pullRequest.headRef} -> ${pullRequest.baseRef}
- 변경량: +${pullRequest.additions}/-${pullRequest.deletions}, 파일 ${pullRequest.changedFiles}개
- 시간: ${pullRequest.mergedAt || pullRequest.closedAt || pullRequest.updatedAt}
- 링크: ${pullRequest.url}

PR details:
Repository: ${pullRequest.repo}
PR: #${pullRequest.number} ${pullRequest.title}
State: ${pullRequest.state}
Draft: ${pullRequest.draft}
Created: ${pullRequest.createdAt}
Updated: ${pullRequest.updatedAt}
Closed: ${pullRequest.closedAt || ""}
Merged: ${pullRequest.mergedAt || ""}
Base: ${pullRequest.baseRef}
Head: ${pullRequest.headRef}
Body:
${pullRequest.body || "(no body)"}

Commits:
${commitsText || "(no commits)"}

Changed files:
${filesText || "(no files)"}`;
}

function buildBasicPullRequestNote({ dateLabel, pullRequest, projectName, reason }) {
  const commits = pullRequest.commits
    .map((commit) => `- ${commit.sha.slice(0, 7)} ${commit.message.split(/\r?\n/)[0]}`)
    .join("\n");
  const files = pullRequest.files
    .map((file) => `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`)
    .join("\n");
  const primaryFile = pullRequest.files[0]?.filename || "변경된 파일";
  const troubleshootingCommits = pullRequest.commits
    .map((commit) => commit.message.split(/\r?\n/)[0])
    .filter((message) => /\b(fix|hotfix|revert|bug)\b|버그|오류|에러|수정|해결/i.test(message))
    .map((message) => `- ${message}`)
    .join("\n");

  return `# ${dateLabel}

## 요약
${projectName} 프로젝트에서 PR #${pullRequest.number} "${pullRequest.title}" 작업이 기록되었습니다. ${reason} PR 정보 기준의 기본 노트로 생성했습니다.

## 변경 내용
- PR 제목: ${pullRequest.title}
- PR 본문: ${pullRequest.body || "본문 없음"}
- 변경 파일: ${pullRequest.changedFiles}개 (+${pullRequest.additions}/-${pullRequest.deletions})

## 의도
PR 정보 기준으로는 해당 변경이 프로젝트 작업 내역을 기록하기 위해 추가되었습니다.

## 포함된 커밋
${commits || "- 커밋 정보 없음"}

## 변경 파일
${files || "- 변경 파일 정보 없음"}

## 트러블 슈팅
${troubleshootingCommits || "- PR 정보 기준으로는 기록된 트러블 슈팅이 없습니다."}

## 생각 정리
- "${pullRequest.title}" 작업에서 가장 신경 써서 확인해야 했던 부분은 무엇이었나?
- ${primaryFile} 변경이 전체 흐름에 어떤 영향을 준다고 봤나?
- 이 PR을 진행하면서 느낀 점이나 배운 점은 무엇이었나?

## PR
- 프로젝트: ${projectName}
- 저장소: ${pullRequest.repo}
- 번호: #${pullRequest.number}
- 상태: ${pullRequest.mergedAt ? "merged" : pullRequest.state}
- 브랜치: ${pullRequest.headRef} -> ${pullRequest.baseRef}
- 시간: ${pullRequest.mergedAt || pullRequest.closedAt || pullRequest.updatedAt}
- 링크: ${pullRequest.url}
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
