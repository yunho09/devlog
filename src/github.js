export async function fetchPullRequests({ token, username, since, until, mergedOnly = false }) {
  const query = [
    "type:pr",
    `author:${username}`,
    `updated:${since.slice(0, 10)}..${until.slice(0, 10)}`,
    ...(mergedOnly ? ["is:merged"] : [])
  ].join(" ");

  const url = new URL("https://api.github.com/search/issues");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "100");

  const data = await githubRequest(url, token);

  return Promise.all(data.items.map((item) => fetchPullRequestDetails({ token, item })));
}

async function fetchPullRequestDetails({ token, item }) {
  const repo = item.repository_url.split("/repos/").pop();
  const [details, commits, files] = await Promise.all([
    githubRequest(item.pull_request.url, token),
    githubRequest(`${item.pull_request.url}/commits?per_page=100`, token),
    githubRequest(`${item.pull_request.url}/files?per_page=100`, token)
  ]);

  return {
    id: `${repo}#${details.number}`,
    repo,
    number: details.number,
    title: details.title,
    body: details.body || "",
    state: details.state,
    draft: Boolean(details.draft),
    url: details.html_url,
    createdAt: details.created_at,
    updatedAt: details.updated_at,
    closedAt: details.closed_at,
    mergedAt: details.merged_at,
    baseRef: details.base?.ref || "",
    headRef: details.head?.ref || "",
    additions: details.additions || 0,
    deletions: details.deletions || 0,
    changedFiles: details.changed_files || files.length,
    commits: commits.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      url: commit.html_url,
      committedAt: commit.commit.committer.date
    })),
    files: files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    }))
  };
}

async function githubRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "devlog"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API failed: ${response.status} ${body}`);
  }

  return response.json();
}
