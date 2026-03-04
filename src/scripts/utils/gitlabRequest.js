async function gitlabApiRequest(url, headers = {}) {
  const response = await fetch(url, { headers });

  const remaining = response.headers.get("ratelimit-remaining");
  const retryAfter = response.headers.get("retry-after");
  const resetHeader = response.headers.get("ratelimit-reset");

  if (response.status === 429) {
    const waitSeconds = Number(retryAfter || 60);
    const resetMs = resetHeader
      ? Number(resetHeader) * 1000
      : Date.now() + waitSeconds * 1000;

    console.warn(`GitLab rate limit hit. Retry after ${waitSeconds}s`);
    const error = new Error(
      `GitLab API rate limit exceeded. Retry after ${waitSeconds}s.`,
    );
    error.name = "RateLimitError";
    error.platform = "gitlab";
    error.resetAt = resetMs;
    error.remaining = remaining !== null ? Number(remaining) : 0;
    error.retryAfter = waitSeconds;
    throw error;
  }

  return response;
}
