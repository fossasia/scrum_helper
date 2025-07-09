// GitLab API Helper for Scrum Helper Extension
class GitLabHelper {
  constructor() {
    this.baseUrl = 'https://gitlab.com/api/v4';
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
        gitlabCache: {
          data: data,
          cacheKey: this.cache.cacheKey,
          timestamp: this.cache.timestamp
        }
      }, resolve);
    });
  }

  async loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['gitlabCache'], (items) => {
        if (items.gitlabCache) {
          this.cache.data = items.gitlabCache.data;
          this.cache.cacheKey = items.gitlabCache.cacheKey;
          this.cache.timestamp = items.gitlabCache.timestamp;
          console.log('Restored GitLab cache from storage');
        }
        resolve();
      });
    });
  }

  async fetchGitLabData(username, startDate, endDate) {
    const cacheKey = `${username}-${startDate}-${endDate}`;

    if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
      console.log('GitLab fetch already in progress or data already fetched. Skipping fetch.');
      return;
    }

    console.log('Fetching GitLab data:', {
      username: username,
      startDate: startDate,
      endDate: endDate,
    });

    // Check if we need to load from storage
    if (!this.cache.data && !this.cache.fetching) {
      await this.loadFromStorage();
    }

    const currentTTL = await this.getCacheTTL();
    this.cache.ttl = currentTTL;
    console.log(`GitLab caching for ${currentTTL / (60 * 1000)} minutes`);

    const now = Date.now();
    const isCacheFresh = (now - this.cache.timestamp) < this.cache.ttl;
    const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

    if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
      console.log('Using cached GitLab data - cache is fresh and key matches');
      return this.cache.data;
    }

    if (!isCacheKeyMatch) {
      console.log('GitLab cache key mismatch - fetching new data');
      this.cache.data = null;
    } else if (!isCacheFresh) {
      console.log('GitLab cache is stale - fetching new data');
    }

    if (this.cache.fetching) {
      console.log('GitLab fetch in progress, queuing requests');
      return new Promise((resolve, reject) => {
        this.cache.queue.push({ resolve, reject });
      });
    }

    this.cache.fetching = true;
    this.cache.cacheKey = cacheKey;

    try {
      // Throttling 500ms to avoid burst
      await new Promise(res => setTimeout(res, 500));

      // Get user info first
      const userUrl = `${this.baseUrl}/users?username=${username}`;
      console.log('[GITLAB-DEBUG] Fetching user:', userUrl);
      const userRes = await fetch(userUrl);
      console.log('[GITLAB-DEBUG] User fetch response:', userRes.status, userRes.statusText);
      if (!userRes.ok) {
        throw new Error(`Error fetching GitLab user: ${userRes.status} ${userRes.statusText}`);
      }
      const users = await userRes.json();
      console.log('[GITLAB-DEBUG] Users fetched:', users);
      if (users.length === 0) {
        throw new Error(`GitLab user '${username}' not found`);
      }
      const userId = users[0].id;
      // Fetch user's projects
      const projectsUrl = `${this.baseUrl}/users/${userId}/projects?per_page=100&order_by=updated_at&sort=desc`;
      console.log('[GITLAB-DEBUG] Fetching projects:', projectsUrl);
      const projectsRes = await fetch(projectsUrl);
      console.log('[GITLAB-DEBUG] Projects fetch response:', projectsRes.status, projectsRes.statusText);
      if (!projectsRes.ok) {
        throw new Error(`Error fetching GitLab projects: ${projectsRes.status} ${projectsRes.statusText}`);
      }
      const projects = await projectsRes.json();
      console.log('[GITLAB-DEBUG] Projects fetched:', projects);
      // Fetch merge requests created by user
      const mergeRequestsUrl = `${this.baseUrl}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
      console.log('[GITLAB-DEBUG] Fetching merge requests:', mergeRequestsUrl);
      const mergeRequestsRes = await fetch(mergeRequestsUrl);
      console.log('[GITLAB-DEBUG] Merge requests fetch response:', mergeRequestsRes.status, mergeRequestsRes.statusText);
      if (!mergeRequestsRes.ok) {
        throw new Error(`Error fetching GitLab merge requests: ${mergeRequestsRes.status} ${mergeRequestsRes.statusText}`);
      }
      const mergeRequests = await mergeRequestsRes.json();
      console.log('[GITLAB-DEBUG] Merge requests fetched:', mergeRequests);
      // Fetch issues created by user
      const issuesUrl = `${this.baseUrl}/issues?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
      console.log('[GITLAB-DEBUG] Fetching issues:', issuesUrl);
      const issuesRes = await fetch(issuesUrl);
      console.log('[GITLAB-DEBUG] Issues fetch response:', issuesRes.status, issuesRes.statusText);
      if (!issuesRes.ok) {
        throw new Error(`Error fetching GitLab issues: ${issuesRes.status} ${issuesRes.statusText}`);
      }
      const issues = await issuesRes.json();
      console.log('[GITLAB-DEBUG] Issues fetched:', issues);
      // Get detailed info for merge requests and issues
      const detailedMergeRequests = await this.getDetailedMergeRequests(mergeRequests);
      console.log('[GITLAB-DEBUG] Detailed merge requests:', detailedMergeRequests);
      const detailedIssues = await this.getDetailedIssues(issues);
      console.log('[GITLAB-DEBUG] Detailed issues:', detailedIssues);
      const gitlabData = {
        user: users[0],
        projects: projects,
        mergeRequests: detailedMergeRequests,
        issues: detailedIssues,
        comments: [] // Empty array since we're not fetching comments
      };
      console.log('[GITLAB-DEBUG] Final gitlabData object:', gitlabData);
      // Cache the data
      this.cache.data = gitlabData;
      this.cache.timestamp = Date.now();

      await this.saveToStorage(gitlabData);

      // Resolve queued calls
      this.cache.queue.forEach(({ resolve }) => resolve(gitlabData));
      this.cache.queue = [];

      return gitlabData;

    } catch (err) {
      console.error('GitLab Fetch Failed:', err);
      // Reject queued calls on error
      this.cache.queue.forEach(({ reject }) => reject(err));
      this.cache.queue = [];
      throw err;
    } finally {
      this.cache.fetching = false;
    }
  }

  async getDetailedMergeRequests(mergeRequests) {
    const detailed = [];
    for (const mr of mergeRequests) {
      try {
        const url = `${this.baseUrl}/projects/${mr.project_id}/merge_requests/${mr.iid}`;
        console.log('[GITLAB-DEBUG] Fetching detailed MR:', url);
        const res = await fetch(url);
        console.log('[GITLAB-DEBUG] Detailed MR fetch response:', res.status, res.statusText);
        if (res.ok) {
          const detailedMr = await res.json();
          console.log('[GITLAB-DEBUG] Detailed MR data:', detailedMr);
          detailed.push(detailedMr);
        }
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[GITLAB-DEBUG] Error fetching detailed MR ${mr.iid}:`, error);
        detailed.push(mr); // Use basic data if detailed fetch fails
      }
    }
    return detailed;
  }

  async getDetailedIssues(issues) {
    const detailed = [];
    for (const issue of issues) {
      try {
        const url = `${this.baseUrl}/projects/${issue.project_id}/issues/${issue.iid}`;
        console.log('[GITLAB-DEBUG] Fetching detailed issue:', url);
        const res = await fetch(url);
        console.log('[GITLAB-DEBUG] Detailed issue fetch response:', res.status, res.statusText);
        if (res.ok) {
          const detailedIssue = await res.json();
          console.log('[GITLAB-DEBUG] Detailed issue data:', detailedIssue);
          detailed.push(detailedIssue);
        }
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[GITLAB-DEBUG] Error fetching detailed issue ${issue.iid}:`, error);
        detailed.push(issue); // Use basic data if detailed fetch fails
      }
    }
    return detailed;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  processGitLabData(data) {
    const processed = {
      mergeRequests: data.mergeRequests || [],
      issues: data.issues || [],
      comments: data.comments || [],
      user: data.user
    };
    console.log('[GITLAB-DEBUG] processGitLabData input:', data);
    console.log('[GITLAB-DEBUG] processGitLabData output:', processed);
    console.log('GitLab data processed:', {
      mergeRequests: processed.mergeRequests.length,
      issues: processed.issues.length,
      comments: processed.comments.length,
      user: processed.user?.username
    });

    return processed;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitLabHelper;
} else {
  window.GitLabHelper = GitLabHelper;
} 