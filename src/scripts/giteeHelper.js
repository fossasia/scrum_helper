// Gitee API Helper for Scrum Helper Extension
class GiteeHelper {
  constructor() {
    this.baseUrl = 'https://gitee.com/api/v5';
    this.cache = {
      data: null,
      cacheKey: null,
      timestamp: 0,
      ttl: 10 * 60 * 1000, // 10 minutes
      fetching: false,
      queue: []
    };
  }

  async getCacheTTL() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['cacheInput'], (items) => {
        const ttl = items.cacheInput ? parseInt(items.cacheInput) * 60 * 1000 : 10 * 60 * 1000;
        resolve(ttl);
      });
    });
  }

  async saveToStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        giteeCache: {
          data: data,
          cacheKey: this.cache.cacheKey,
          timestamp: this.cache.timestamp
        }
      }, resolve);
    });
  }

  async loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['giteeCache'], (items) => {
        if (items.giteeCache) {
          this.cache.data = items.giteeCache.data;
          this.cache.cacheKey = items.giteeCache.cacheKey;
          this.cache.timestamp = items.giteeCache.timestamp;
          console.log('Restored Gitee cache from storage');
        }
        resolve();
      });
    });
  }

  async fetchGiteeData(username, startDate, endDate, token = null) {
    const cacheKey = `${username}-${startDate}-${endDate}`;
    const headers = token ? { Authorization: `token ${token}` } : {};

    if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
      console.log('Gitee fetch already in progress or data already fetched. Skipping fetch.');
      return this.cache.data;
    }

    console.log('Fetching Gitee data:', { username, startDate, endDate });

    if (!this.cache.data && !this.cache.fetching) {
      await this.loadFromStorage();
    }

    const currentTTL = await this.getCacheTTL();
    this.cache.ttl = currentTTL;
    console.log(`Gitee caching for ${currentTTL / (60 * 1000)} minutes`);

    const now = Date.now();
    const isCacheFresh = (now - this.cache.timestamp) < this.cache.ttl;
    const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

    if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
      console.log('Using cached Gitee data - cache is fresh and key matches');
      return this.cache.data;
    }

    if (this.cache.fetching) {
      console.log('Gitee fetch in progress, queuing requests');
      return new Promise((resolve, reject) => {
        this.cache.queue.push({ resolve, reject });
      });
    }

    this.cache.fetching = true;
    this.cache.cacheKey = cacheKey;

    try {
      // 🔹 Get user info
      const userUrl = `${this.baseUrl}/users/${username}`;
      const userRes = await fetch(userUrl, { headers });
      if (!userRes.ok) throw new Error(`Error fetching Gitee user: ${userRes.statusText}`);
      const user = await userRes.json();

      // 🔹 Get user repositories
      const repoUrl = `${this.baseUrl}/users/${username}/repos?sort=updated&direction=desc&per_page=100`;
      const repoRes = await fetch(repoUrl, { headers });
      if (!repoRes.ok) throw new Error(`Error fetching Gitee repositories: ${repoRes.statusText}`);
      const repositories = await repoRes.json();

      // 🔹 Fetch issues created by the user
      const issuesUrl = `${this.baseUrl}/search/issues?q=author:${username}&created_at>${startDate}&created_at<${endDate}&per_page=100`;
      const issuesRes = await fetch(issuesUrl, { headers });
      const issues = issuesRes.ok ? await issuesRes.json() : [];

      // 🔹 Fetch pull requests created by the user
      let allPRs = [];
      for (const repo of repositories) {
        const prUrl = `${this.baseUrl}/repos/${username}/${repo.name}/pulls?state=all&sort=created&direction=desc`;
        try {
          const prRes = await fetch(prUrl, { headers });
          if (prRes.ok) {
            const prs = await prRes.json();
            const filtered = prs.filter(pr => {
              const createdAt = new Date(pr.created_at);
              return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
            });
            allPRs = allPRs.concat(filtered);
          }
        } catch (err) {
          console.warn(`Error fetching PRs for repo ${repo.name}:`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const giteeData = {
        user: user,
        projects: repositories,
        mergeRequests: allPRs,
        issues: issues,
        comments: []
      };

      this.cache.data = giteeData;
      this.cache.timestamp = Date.now();
      await this.saveToStorage(giteeData);

      this.cache.queue.forEach(({ resolve }) => resolve(giteeData));
      this.cache.queue = [];

      return giteeData;

    } catch (err) {
      console.error('Gitee Fetch Failed:', err);
      this.cache.queue.forEach(({ reject }) => reject(err));
      this.cache.queue = [];
      throw err;
    } finally {
      this.cache.fetching = false;
    }
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  processGiteeData(data) {
    const processed = {
      mergeRequests: data.mergeRequests || [],
      issues: data.issues || [],
      comments: data.comments || [],
      user: data.user
    };
    console.log('[GITEE-DEBUG] processGiteeData input:', data);
    console.log('[GITEE-DEBUG] processGiteeData output:', processed);
    console.log('Gitee data processed:', {
      mergeRequests: processed.mergeRequests.length,
      issues: processed.issues.length,
      comments: processed.comments.length,
      user: processed.user?.login
    });
    return processed;
  }
}

// Export for browser or Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GiteeHelper;
} else {
  window.GiteeHelper = GiteeHelper;
}
