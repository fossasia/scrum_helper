console.log("[background.js] Service worker starting up.");

// A single, centralized cache for the entire extension.
const githubCache = {
  caches: {}, // Store multiple cache entries by key
  fetching: false,
  queue: [],
};

// --- Caching Utilities ---

async function getCacheTTL() {
  const result = await chrome.storage.local.get('cacheInput');
  const ttlMinutes = result.cacheInput || 10;
  return ttlMinutes * 60 * 1000;
}

function getStorageKey() {
  return 'githubCacheMulti';
}

async function saveCache(cacheKey, data) {
  console.log(`[background] Saving cache for key: ${cacheKey}`);
  const cacheEntry = {
    data: data,
    timestamp: Date.now(),
  };
  githubCache.caches[cacheKey] = cacheEntry;

  // Persist to storage using modern async/await
  const storageKey = getStorageKey();
  const result = await chrome.storage.local.get(storageKey);
  const allCaches = result[storageKey] || {};
  allCaches[cacheKey] = cacheEntry;
  await chrome.storage.local.set({ [storageKey]: allCaches });
  console.log(`[background] Cache saved for ${cacheKey}.`);
}

async function loadCacheFromStorage() {
  console.log('[background] Loading caches from storage.');
  const storageKey = getStorageKey();
  const result = await chrome.storage.local.get(storageKey);
  const allCaches = result[storageKey] || {};

  const ttl = await getCacheTTL();
  const now = Date.now();
  const validCaches = {};

  for (const [key, cache] of Object.entries(allCaches)) {
    if ((now - cache.timestamp) < ttl) {
      validCaches[key] = cache;
    }
  }
  githubCache.caches = validCaches;
  console.log(`[background] Loaded ${Object.keys(validCaches).length} valid cache entries.`);
}

// --- GitHub API Fetching ---

async function fetchUserPrCommits(openPrs, username, startingDate, endingDate) {
  const userPrCommitsData = {};
  if (!openPrs || openPrs.length === 0) {
    return userPrCommitsData;
  }

  console.log(`[background] Fetching commits for ${openPrs.length} open PRs.`);
  const batchSize = 5; // Process 5 PRs at a time
  const delay = 1000;  // 1-second delay between batches

  for (let i = 0; i < openPrs.length; i += batchSize) {
    const batch = openPrs.slice(i, i + batchSize);
    await Promise.all(batch.map(async (pr) => {
      try {
        // Construct the commits URL from the PR's API URL
        const commitsUrl = pr.pull_request.url + '/commits';
        const res = await fetch(commitsUrl);
        if (res.status === 403) {
          console.error(`[background] Rate limit hit fetching commits for PR #${pr.number}`);
          return; // Continue without throwing
        }
        if (!res.ok) {
          console.error(`[background] Error fetching commits for PR #${pr.number}: ${res.status}`);
          return;
        }
        const commits = await res.json();
        const userCommits = commits.filter(c => {
          if (!c.author || c.author.login !== username) return false;
          const commitDate = new Date(c.commit.author.date);
          // Parse YYYY-MM-DD as UTC dates to avoid timezone shifts
          const start = new Date(startingDate + 'T00:00:00Z');
          const end = new Date(endingDate + 'T23:59:59Z');
          return commitDate >= start && commitDate <= end;
        });
        if (userCommits.length > 0) {
          userPrCommitsData[pr.number] = { pr, commits: userCommits };
        }
      } catch (err) {
        console.error(`[background] Exception while fetching commits for PR #${pr.number}`, err);
      }
    }));

    if (i + batchSize < openPrs.length) {
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.log(`[background] Found commits for ${Object.keys(userPrCommitsData).length} PRs.`);
  return userPrCommitsData;
}

async function fetchGithubData(username, startingDate, endingDate) {
  const cacheKey = `${username}-${startingDate}-${endingDate}`;

  // If we haven't loaded from storage yet, do it once.
  if (Object.keys(githubCache.caches).length === 0) {
    await loadCacheFromStorage();
  }

  const existingCache = githubCache.caches[cacheKey];
  if (existingCache) {
    console.log(`[background] Returning cached data for key: ${cacheKey}`);
    return existingCache.data;
  }

  if (githubCache.fetching) {
    console.log('[background] Fetch in progress. Queuing request.');
    return new Promise((resolve, reject) => {
      githubCache.queue.push({ username, startingDate, endingDate, resolve, reject });
    });
  }

  console.log(`[background] Fetching new data from GitHub for key: ${cacheKey}`);
  githubCache.fetching = true;

  try {
    let issueUrl = `https://api.github.com/search/issues?q=author%3A${username}+org%3Afossasia+created%3A${startingDate}..${endingDate}&per_page=100`;
    let prUrl = `https://api.github.com/search/issues?q=commenter%3A${username}+org%3Afossasia+updated%3A${startingDate}..${endingDate}&per_page=100`;
    let userUrl = `https://api.github.com/users/${username}`;
    let allOpenPrsUrl = `https://api.github.com/search/issues?q=is%3Apr+is%3Aopen+author%3A${username}+org%3Afossasia&per_page=100`;

    const [issuesRes, prRes, userRes, allOpenPrsRes] = await Promise.all([
      fetch(issueUrl),
      fetch(prUrl),
      fetch(userUrl),
      fetch(allOpenPrsUrl),
    ]);

    if (issuesRes.status === 403 || prRes.status === 403 || userRes.status === 403 || allOpenPrsRes.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again in a few minutes.');
    }
    if (!issuesRes.ok || !prRes.ok || !userRes.ok || !allOpenPrsRes.ok) {
      throw new Error(`Failed to fetch data from GitHub. Status: ${issuesRes.status}, ${prRes.status}, ${userRes.status}, ${allOpenPrsRes.status}`);
    }

    const githubIssuesData = await issuesRes.json();
    const githubPrsReviewData = await prRes.json();
    const githubUserData = await userRes.json();
    const allOpenPrsData = await allOpenPrsRes.json();

    const openPrs = allOpenPrsData.items || [];
    const userPrCommitsData = await fetchUserPrCommits(openPrs, username, startingDate, endingDate);

    const newData = { githubIssuesData, githubPrsReviewData, githubUserData, userPrCommitsData };
    await saveCache(cacheKey, newData);
    return newData;

  } finally {
    githubCache.fetching = false;
    if (githubCache.queue.length > 0) {
      console.log('[background] Processing next item in queue.');
      const next = githubCache.queue.shift();
      fetchGithubData(next.username, next.startingDate, next.endDate)
        .then(next.resolve)
        .catch(next.reject);
    }
  }
}


// --- Message Listener ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[background] Received message:', message.action);
  if (message.action === 'fetchGithubData') {
    const { username, startingDate, endingDate } = message.payload;
    fetchGithubData(username, startingDate, endingDate)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }

  if (message.action === 'clearCache') {
    githubCache.caches = {};
    chrome.storage.local.remove(getStorageKey(), () => {
      console.log('[background] Cache cleared via message.');
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
});
