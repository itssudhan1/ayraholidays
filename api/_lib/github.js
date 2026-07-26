const GITHUB_API = 'https://api.github.com';

function repoInfo() {
  const repo = process.env.GITHUB_REPO;         // e.g. "itssudhan1/ayraholidays"
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!repo) throw new Error('GITHUB_REPO env var not set');
  return { repo, branch };
}

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN env var not set');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ayra-holidays-admin'
  };
}

// Fetch a file's raw text content plus its blob sha (needed to commit an update).
export async function getFile(path) {
  const { repo, branch } = repoInfo();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`;
  const resp = await fetch(url, { headers: ghHeaders() });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub getFile failed (${resp.status}): ${text}`);
  }
  const data = await resp.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

// Commit new content for a file.
export async function putFile(path, newContent, sha, message) {
  const { repo, branch } = repoInfo();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message || `admin: update ${path}`,
      content: Buffer.from(newContent, 'utf-8').toString('base64'),
      sha,
      branch
    })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub putFile failed (${resp.status}): ${text}`);
  }
  return resp.json();
}
