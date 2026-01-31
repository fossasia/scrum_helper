// Bitbucket API Helper for Scrum Helper Extension
class BitbucketHelper {
  constructor() {
    this.baseUrl = 'https://api.bitbucket.org/2.0';
    this.authToken = null;
    this.authEmail = null;
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
        const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
        const rawInput = items.cacheInput;

        let ttlMs = DEFAULT_TTL_MS;

        // Validate input to prevent NaN or extreme values
        if (typeof rawInput === 'string' && rawInput.trim() !== '') {
          const ttlMinutes = Number.parseInt(rawInput, 10);

          if (
            Number.isFinite(ttlMinutes) &&
            ttlMinutes >= 1 &&
            ttlMinutes <= 24 * 60
          ) {
            ttlMs = ttlMinutes * 60 * 1000;
          }
        }

        resolve(ttlMs);
      });
    });
  }

  async saveToStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        bitbucketCache: {
          data: data,
          cacheKey: this.cache.cacheKey,
          timestamp: this.cache.timestamp
        }
      }, resolve);
    });
  }

  async loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bitbucketCache'], (items) => {
        if (items.bitbucketCache) {
          this.cache.data = items.bitbucketCache.data;
          this.cache.cacheKey = items.bitbucketCache.cacheKey;
          this.cache.timestamp = items.bitbucketCache.timestamp;
          console.log('[BITBUCKET-HELPER] Cache restored from storage');
        }
        resolve();
      });
    });
  }

  async loadAuthCredentials() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['bitbucketToken', 'bitbucketEmail'], (items) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.authToken = items.bitbucketToken || null;
          this.authEmail = items.bitbucketEmail || null;
          // For Basic Auth with API Tokens, both email and token are required.
          if (!this.authToken || !this.authEmail) {
            reject(new Error('Bitbucket email or token missing'));
            return;
          }
          resolve();
        }
      });
    });
  }

  /**
   * Main entry point to fetch Bitbucket data.
   * Matches signature of GitLabHelper.fetchGitLabData.
   */
  async fetchBitbucketData(username, startDate, endDate) {
    const cacheKey = `${username}-${startDate}-${endDate}`;

    // 1. Check if data is already fetched
    if (this.cache.data && this.cache.cacheKey === cacheKey) {
      console.log('[BITBUCKET-HELPER] Using cached data - cache is fresh and key matches');
      return this.cache.data;
    }

    // 2. Check if a fetch is already in progress
    if (this.cache.fetching) {
      console.log('[BITBUCKET-HELPER] Fetching in progress, queuing request.');
      return new Promise((resolve, reject) => {
        this.cache.queue.push({ resolve, reject });
      });
    }

    console.log('[BITBUCKET-HELPER] Fetching data:', { username, startDate, endDate });

    // 3. Try to restore from storage if not in memory
    if (!this.cache.data && !this.cache.fetching) {
      await this.loadFromStorage();
    }

    // 4. Get Cache TTL
    const currentTTL = await this.getCacheTTL();
    this.cache.ttl = currentTTL;

    const now = Date.now();
    const isCacheFresh = (now - this.cache.timestamp) < this.cache.ttl;
    const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

    // 5. Check if cached data is valid
    if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
      console.log('[BITBUCKET-HELPER] Using valid cached data.');
      return this.cache.data;
    }

    if (!isCacheKeyMatch) {
      console.log('[BITBUCKET-HELPER] Cache key mismatch. Invalidating.');
      this.cache.data = null;
    }

    // 6. Set fetching flag
    this.cache.fetching = true;
    this.cache.cacheKey = cacheKey;

    try {
      // Small delay to avoid burst
      await new Promise(res => setTimeout(res, 500));

      await this.loadAuthCredentials();

      // Setup Basic Auth headers using Email + API Token
      if (!this.authEmail || !this.authToken) {
        throw new Error('Bitbucket credentials not loaded.');
      }

      const credentials = btoa(`${this.authEmail}:${this.authToken}`);
      const headers = {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      };

      // 1. Fetch User Info
      const userUrl = `${this.baseUrl}/user?fields=uuid,username,display_name`;
      const userRes = await fetch(userUrl, { headers });
      
      if (!userRes.ok) {
        if (userRes.status === 403) {
            throw new Error('Bitbucket Auth Failed (403). Ensure your API Token has read:user:bitbucket scope.');
        }
        if (userRes.status === 401) {
            throw new Error('Bitbucket Auth Failed (401). Check your Email and Token.');
        }
        throw new Error(`Error fetching Bitbucket user: ${userRes.status} ${userRes.statusText}`);
      }
      const user = await userRes.json();
      const userUuid = user.uuid;

      // 2. Discover Repositories (Dual Strategy)
      const startDateISO = `${startDate}T00:00:00+00:00`;
      const endDateISO = `${endDate}T23:59:59+00:00`;
      const repoQuery = `updated_on>="${startDateISO}"`;
      
      let allRepos = [];

      // Strategy A: Workspaces (Preferred)
      let workspacesUrl = `${this.baseUrl}/workspaces?role=member&pagelen=50&fields=values.slug,values.name,values.links.html.href`;
      const wsRes = await fetch(workspacesUrl, { headers });
      
      let wsOk = false;

      if (wsRes.ok) {
        wsOk = true;
        const wsData = await wsRes.json();
        const workspaces = wsData.values || [];
        
        console.log(`[BITBUCKET-HELPER] Found ${workspaces.length} workspaces. Scanning for repositories...`);

        for (const ws of workspaces) {
          const workspaceSlug = ws.slug;
          let repoListUrl = `${this.baseUrl}/repositories/${workspaceSlug}?q=${encodeURIComponent(repoQuery)}&pagelen=50&fields=values.slug,values.workspace.slug,values.name,values.links.html.href,values.uuid,values.updated_on&sort=-updated_on`;

          while (repoListUrl) {
            const repoRes = await fetch(repoListUrl, { headers });
            if (repoRes.ok) {
              const repoData = await repoRes.json();
              if (repoData.values) {
                allRepos = allRepos.concat(repoData.values);
              }
              repoListUrl = repoData.next || null;
            } else {
              console.warn(`[BITBUCKET-HELPER] Failed to fetch repos for workspace: ${workspaceSlug}`);
              break;
            }
            await new Promise(r => setTimeout(r, 100));
          }
        }
      }

      // Strategy B: Fallback to User Repos (if Workspaces fail or return empty list)
      // We check if allRepos is empty to ensure we try fallback even if WS request was 200 OK but empty
      if (allRepos.length === 0 && (!wsOk || wsRes.status === 403)) {
        console.log('[BITBUCKET-HELPER] Falling back to /repositories/{username}');
        let userReposUrl = `${this.baseUrl}/repositories/${username}?pagelen=100&sort=-updated_on&fields=values.slug,values.workspace.slug,values.name,values.links.html.href,values.uuid,values.updated_on`;

        while (userReposUrl) {
          const repoRes = await fetch(userReposUrl, { headers });
          if (repoRes.ok) {
            const repoData = await repoRes.json();
            if (repoData.values) {
              allRepos = allRepos.concat(repoData.values);
            }
            userReposUrl = repoData.next || null;
          } else {
            console.warn('[BITBUCKET-HELPER] Failed to fetch user repositories.');
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }

      console.log(`[BITBUCKET-HELPER] Discovered ${allRepos.length} repositories.`);

      // 3. Fetch Pull Requests
      let allPRs = [];
      for (const repo of allRepos) {
        const workspaceSlug = repo.workspace.slug;
        const repoSlug = repo.slug;

        const query = `author.uuid="${userUuid}" AND created_on>="${startDateISO}" AND created_on<="${endDateISO}"`;
        let prsUrl = `${this.baseUrl}/repositories/${workspaceSlug}/${repoSlug}/pullrequests?q=${encodeURIComponent(query)}&pagelen=50&fields=values.id,values.title,values.state,values.created_on,values.updated_on,values.author,values.links.html.href,values.source.repository.full_name`;

        while (prsUrl) {
          const prsRes = await fetch(prsUrl, { headers });
          if (prsRes.ok) {
            const prsData = await prsRes.json();
            if (prsData.values) {
              const prsWithRepo = prsData.values.map(pr => ({
                ...pr,
                repo_full_name: `${workspaceSlug}/${repoSlug}`,
                repo_web_url: repo.links.html.href
              }));
              allPRs = allPRs.concat(prsWithRepo);
            }
            prsUrl = prsData.next || null;
          } else {
            console.warn(`[BITBUCKET-HELPER] Failed to fetch PRs for ${workspaceSlug}/${repoSlug}`);
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // 4. Fetch Issues
      let allIssues = [];
      for (const repo of allRepos) {
        const workspaceSlug = repo.workspace.slug;
        const repoSlug = repo.slug;

        const query = `reporter.uuid="${userUuid}" AND created_on>="${startDateISO}" AND created_on<="${endDateISO}"`;
        let issuesUrl = `${this.baseUrl}/repositories/${workspaceSlug}/${repoSlug}/issues?q=${encodeURIComponent(query)}&pagelen=50&fields=values.id,values.title,values.state,values.created_on,values.updated_on,values.reporter,values.links.html.href,values.content.raw`;

        while (issuesUrl) {
          const issuesRes = await fetch(issuesUrl, { headers });
          if (issuesRes.ok) {
            const issuesData = await issuesRes.json();
            if (issuesData.values) {
              const issuesWithRepo = issuesData.values.map(issue => ({
                ...issue,
                repo_full_name: `${workspaceSlug}/${repoSlug}`,
                repo_web_url: issue.links.html.href
              }));
              allIssues = allIssues.concat(issuesWithRepo);
            }
            issuesUrl = issuesData.next || null;
          } else if (issuesRes.status === 404) {
            // Issue tracker disabled for this repo
            break;
          } else {
            console.warn(`[BITBUCKET-HELPER] Failed to fetch Issues for ${workspaceSlug}/${repoSlug}`);
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }
      }

      const bitbucketData = {
        user: user,
        projects: allRepos,
        mergeRequests: allPRs,
        issues: allIssues,
        comments: [] // Not fetched to save API calls, matching GitLab behavior
      };

      // Update Cache
      this.cache.data = bitbucketData;
      this.cache.timestamp = Date.now();
      await this.saveToStorage(bitbucketData);

      // Resolve Queue
      this.cache.queue.forEach(({ resolve }) => resolve(bitbucketData));
      this.cache.queue = [];

      return bitbucketData;

    } catch (err) {
      console.error('[BITBUCKET-HELPER] Fetch Failed:', err);
      this.cache.queue.forEach(({ reject }) => reject(err));
      this.cache.queue = [];
      throw err;
    } finally {
      this.cache.fetching = false;
    }
  }

  processBitbucketData(data) {
    const processed = {
      mergeRequests: (data.mergeRequests || []).map(mr => ({
        ...mr,
        // Normalize State: OPEN/MERGED/DECLINED -> open/merged/closed
        state: mr.state === 'OPEN' ? 'open' : (mr.state === 'MERGED' ? 'merged' : 'closed'),
        number: mr.id,
        web_url: mr.links?.html?.href || mr.links?.self?.href
      })),
      issues: (data.issues || []).map(issue => ({
        ...issue,
        // Normalize State: new/open -> open, resolved/closed/wontfix -> closed
        state: (issue.state === 'new' || issue.state === 'open') ? 'open' : 'closed',
        number: issue.id,
        web_url: issue.links?.html?.href || issue.links?.self?.href
      })),
      comments: data.comments || [],
      user: data.user
    };
    
    console.log('[BITBUCKET-HELPER] Data Processed:', {
      mergeRequests: processed.mergeRequests.length,
      issues: processed.issues.length,
      user: processed.user?.username
    });
    return processed;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BitbucketHelper;
} else {
  window.BitbucketHelper = BitbucketHelper;
}