async function gitlabApiRequest(url, headers = {}) {
  const response = await fetch(url, { headers });

  const remaining = response.headers.get("RateLimit-Remaining");
  const resetHeader = response.headers.get("RateLimit-Reset");

  if (response.status === 429) {
    // ratelimit-reset is a Unix timestamp in seconds
    const resetMs = resetHeader ? Number(resetHeader) * 1000 : 0;
    const waitSeconds = resetMs
      ? Math.max(1, Math.ceil((resetMs - Date.now()) / 1000))
      : 60;

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
