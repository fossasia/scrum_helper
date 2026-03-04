async function githubRequest(url, options = {}) {
  const response = await fetch(url, options);

  const remaining = Number(response.headers.get("x-ratelimit-remaining"));
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  const resetMs = reset * 1000;

  // GitHub returns 403 with remaining=0 when rate-limited
  if (response.status === 403 && remaining === 0) {
    const waitSeconds = Math.ceil((resetMs - Date.now()) / 1000);
    console.warn(`GitHub rate limit hit. Resets in ${waitSeconds}s`);
    const error = new Error(
      `GitHub API rate limit exceeded. Resets in ${waitSeconds > 0 ? waitSeconds : 60}s.`,
    );
    error.name = "RateLimitError";
    error.platform = "github";
    error.resetAt = resetMs;
    error.remaining = 0;
    error.retryAfter = waitSeconds > 0 ? waitSeconds : 60;
    throw error;
  }

  // Also handle explicit 429 Too Many Requests
  if (response.status === 429) {
    // retry-after header is a duration in seconds; x-ratelimit-reset is a Unix timestamp
    const retryAfterHeader = Number(response.headers.get("x-ratelimit-remaining") || response.headers.get("retry-after"));
    const waitSeconds = resetMs
      ? Math.ceil((resetMs - Date.now()) / 1000)
      : retryAfterHeader > 0
        ? retryAfterHeader
        : 60;
    console.warn(`GitHub 429 rate limit hit. Retry after ${waitSeconds}s`);
    const error = new Error(
      `GitHub API rate limit exceeded (429). Retry after ${waitSeconds}s.`,
    );
    error.name = "RateLimitError";
    error.platform = "github";
    error.resetAt = resetMs || Date.now() + waitSeconds * 1000;
    error.remaining = 0;
    error.retryAfter = waitSeconds > 0 ? waitSeconds : 60;
    throw error;
  }

  return response;
}
