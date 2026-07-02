export async function fetchCommits({ token, username, since, until }) {
  const query = [
    `author:${username}`,
    `committer-date:${since.slice(0, 10)}..${until.slice(0, 10)}`
  ].join(" ");

  const url = new URL("https://api.github.com/search/commits");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "committer-date");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "100");

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

  const data = await response.json();

  return data.items.map((item) => ({
    sha: item.sha,
    repo: item.repository.full_name,
    message: item.commit.message,
    url: item.html_url,
    committedAt: item.commit.committer.date
  }));
}
