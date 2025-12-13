// BitBucket API Helper for Scrum Helper Extension


class BitBucketHelper{
   constructor() {
    this.baseUrl = 'https://api.bitbucket.org/2.0';
    this.authToken = null;  // API token for authentication
    this.authEmail = null;  // User's Atlassian email
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
    chrome.storage.local.get(['bitbucketCache'], (items) => {  // Look for 'bitbucketCache'
      if (items.bitbucketCache) {
        this.cache.data = items.bitbucketCache.data;
        this.cache.cacheKey = items.bitbucketCache.cacheKey;
        this.cache.timestamp = items.bitbucketCache.timestamp;
        console.log('Restored Bitbucket cache from storage');
      }
      resolve();
    });
  });
 }

 async loadAuthCredentials() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bitbucketToken', 'bitbucketEmail'], (items) => {
        this.authToken = items.bitbucketToken || null;
        this.authEmail = items.bitbucketEmail || null;
        resolve();
      });
    });
  }

   async fetchBitbucketData(username, startDate, endDate) {
    const cacheKey = `${username}-${startDate}-${endDate}`;

    if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
      console.log('Bitbucket fetch already in progress or data already fetched. Skipping fetch.');
      return this.cache.data;
    }

    console.log('Fetching Bitbucket data:', {
      username: username,
      startDate: startDate,
      endDate: endDate,
    });

    // Load auth credentials
    await this.loadAuthCredentials();
    
    if (!this.authToken) {
      throw new Error('Bitbucket API token not found. Please configure authentication in settings.');
    }

    // Check if we need to load from storage
    if (!this.cache.data && !this.cache.fetching) {
      await this.loadFromStorage();
    }

    const currentTTL = await this.getCacheTTL();
    this.cache.ttl = currentTTL;
    console.log(`Bitbucket caching for ${currentTTL / (60 * 1000)} minutes`);

    const now = Date.now();
    const isCacheFresh = (now - this.cache.timestamp) < this.cache.ttl;
    const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

    if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
      console.log('Using cached Bitbucket data - cache is fresh and key matches');
      return this.cache.data;
    }

    if (!isCacheKeyMatch) {
      console.log('Bitbucket cache key mismatch - fetching new data');
      this.cache.data = null;
    } else if (!isCacheFresh) {
      console.log('Bitbucket cache is stale - fetching new data');
    }

    if (this.cache.fetching) {
      console.log('Bitbucket fetch in progress, queuing requests');
      return new Promise((resolve, reject) => {
        this.cache.queue.push({ resolve, reject });
      });
    }

    this.cache.fetching = true;
    this.cache.cacheKey = cacheKey;

    try {
      // Throttling 500ms to avoid burst
      await new Promise(res => setTimeout(res, 500));

      const headers = {
        'Authorization': `Bearer ${this.authToken}`,
        'Accept': 'application/json'
      };

      // Step 1: Get authenticated user info
      const userUrl = `${this.baseUrl}/user`;
      const userRes = await fetch(userUrl, { headers });
      if (!userRes.ok) {
        throw new Error(`Error fetching Bitbucket user: ${userRes.status} ${userRes.statusText}`);
      }
      const user = await userRes.json();
      const userUuid = user.uuid;

      console.log(`Fetched Bitbucket user: ${user.username} (${userUuid})`);

      // Step 2: Get all workspaces the user has access to
      const workspacesUrl = `${this.baseUrl}/workspaces?pagelen=100`;
      const workspacesRes = await fetch(workspacesUrl, { headers });
      if (!workspacesRes.ok) {
        throw new Error(`Error fetching Bitbucket workspaces: ${workspacesRes.status} ${workspacesRes.statusText}`);
      }
      const workspacesData = await workspacesRes.json();
      const workspaces = workspacesData.values || [];

      console.log(`Found ${workspaces.length} workspaces`);

      // Step 3: Get all repositories from all workspaces
      let allRepositories = [];
      for (const workspace of workspaces) {
        try {
          let reposUrl = `${this.baseUrl}/repositories/${workspace.slug}?pagelen=100`;
          
          // Handle pagination for repositories
          while (reposUrl) {
            const reposRes = await fetch(reposUrl, { headers });
            if (reposRes.ok) {
              const reposData = await reposRes.json();
              allRepositories = allRepositories.concat(reposData.values || []);
              reposUrl = reposData.next || null;
            } else {
              console.warn(`Failed to fetch repos for workspace ${workspace.slug}`);
              break;
            }
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error fetching repos for workspace ${workspace.slug}:`, error);
        }
      }

      console.log(`Found ${allRepositories.length} total repositories`);

      // Step 4: Fetch pull requests from each repository
      let allPullRequests = [];
      for (const repo of allRepositories) {
        try {
          // Use BBQL (Bitbucket Query Language) to filter by author and date
          // Filter: author.uuid matches user AND created_on is in date range
          const startDateISO = `${startDate}T00:00:00Z`;
          const endDateISO = `${endDate}T23:59:59Z`;
          
          const query = `author.uuid="${userUuid}" AND created_on>=${startDateISO} AND created_on<=${endDateISO}`;
          let prsUrl = `${this.baseUrl}/repositories/${repo.workspace.slug}/${repo.slug}/pullrequests?q=${encodeURIComponent(query)}&pagelen=100`;

          // Handle pagination for pull requests
          while (prsUrl) {
            const prsRes = await fetch(prsUrl, { headers });
            if (prsRes.ok) {
              const prsData = await prsRes.json();
              allPullRequests = allPullRequests.concat(prsData.values || []);
              prsUrl = prsData.next || null;
            } else {
              // Silently skip if PR endpoint fails (might not have permissions)
              break;
            }
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error fetching PRs for repo ${repo.slug}:`, error);
        }
      }

      console.log(`Found ${allPullRequests.length} pull requests`);

      // Step 5: Fetch issues from each repository (if issues are enabled)
      let allIssues = [];
      for (const repo of allRepositories) {
        try {
          if (repo.has_issues) {
            // Use BBQL to filter by reporter and date
            const startDateISO = `${startDate}T00:00:00Z`;
            const endDateISO = `${endDate}T23:59:59Z`;
            
            const query = `reporter.uuid="${userUuid}" AND created_on>=${startDateISO} AND created_on<=${endDateISO}`;
            let issuesUrl = `${this.baseUrl}/repositories/${repo.workspace.slug}/${repo.slug}/issues?q=${encodeURIComponent(query)}&pagelen=100`;

            // Handle pagination for issues
            while (issuesUrl) {
              const issuesRes = await fetch(issuesUrl, { headers });
              if (issuesRes.ok) {
                const issuesData = await issuesRes.json();
                allIssues = allIssues.concat(issuesData.values || []);
                issuesUrl = issuesData.next || null;
              } else {
                break;
              }
              // Add delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } catch (error) {
          console.error(`Error fetching issues for repo ${repo.slug}:`, error);
        }
      }

      console.log(`Found ${allIssues.length} issues`);

      const bitbucketData = {
        user: user,
        workspaces: workspaces,
        repositories: allRepositories,
        pullRequests: allPullRequests,
        issues: allIssues,
        comments: [] // Empty array since we're not fetching comments
      };

      // Cache the data
      this.cache.data = bitbucketData;
      this.cache.timestamp = Date.now();

      await this.saveToStorage(bitbucketData);

      // Resolve queued calls
      this.cache.queue.forEach(({ resolve }) => resolve(bitbucketData));
      this.cache.queue = [];

      return bitbucketData;

    } catch (err) {
      console.error('Bitbucket Fetch Failed:', err);
      // Reject queued calls on error
      this.cache.queue.forEach(({ reject }) => reject(err));
      this.cache.queue = [];
      throw err;
    } finally {
      this.cache.fetching = false;
    }
  }

  


}