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
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(['bitbucketToken', 'bitbucketEmail'], (items) => {
          if (chrome.runtime.lastError) {
            console.error('Error loading Bitbucket credentials:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            this.authToken = items.bitbucketToken || null;
            this.authEmail = items.bitbucketEmail || null;
            resolve();
          }
        });
      } catch (error) {
        console.error('Error in loadAuthCredentials:', error);
        reject(error);
      }
    });
  }

   validateDateFormat(dateString) {
    // Validate YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    }
    
    // Validate date is actually valid
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateString}`);
    }
    return true;
  }


   async fetchBitbucketData(startDate, endDate, workspaces, repositories) {
    // Validate required parameters
    if (!workspaces || !Array.isArray(workspaces) || workspaces.length === 0) {
      throw new Error('Workspaces parameter is required and must be a non-empty array');
    }
    
    if (!repositories || !Array.isArray(repositories) || repositories.length === 0) {
      throw new Error('Repositories parameter is required and must be a non-empty array');
    }

    // Validate date formats
    try {
      this.validateDateFormat(startDate);
      this.validateDateFormat(endDate);
    } catch (error) {
      console.error('Date validation failed:', error);
      throw error;
    }

    const workspaceKey = workspaces.join(',');
    const repoKey = repositories.join(',');
    const cacheKey = `${startDate}-${endDate}-${workspaceKey}-${repoKey}`;

    if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
      console.log('Bitbucket fetch already in progress or data already fetched. Skipping fetch.');
      return this.cache.data;
    }

    console.log('Fetching Bitbucket data:', {
      startDate: startDate,
      endDate: endDate,
      workspaces: workspaces,
      repositories: repositories
    });

    // Load auth credentials
    await this.loadAuthCredentials();
    
    if (!this.authToken || !this.authEmail) {
      throw new Error('Bitbucket API token and email not found. Please configure authentication in settings.');
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

      // Use Basic Authentication with email and API token
      const credentials = btoa(`${this.authEmail}:${this.authToken}`);
      const headers = {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      };

      // Get authenticated user info
      const userUrl = `${this.baseUrl}/user`;
      const userRes = await fetch(userUrl, { headers });
      if (!userRes.ok) {
        throw new Error(`Error fetching Bitbucket user: ${userRes.status} ${userRes.statusText}`);
      }
      const user = await userRes.json();
      const userUuid = user.uuid;

      console.log(`Fetched Bitbucket user: ${user.username} (${userUuid})`);

      // Fetch only the specified repositories
      // repositories parameter format: ['workspace1/repo1', 'workspace1/repo2', 'workspace2/repo3']
      let allRepositories = [];
      
      for (const repoPath of repositories) {
        const [workspaceSlug, repoSlug] = repoPath.split('/');
        
        if (!workspaceSlug || !repoSlug) {
          console.warn(`Invalid repository format: ${repoPath}. Expected format: workspace/repo-slug`);
          continue;
        }
        
        try {
          const repoUrl = `${this.baseUrl}/repositories/${workspaceSlug}/${repoSlug}`;
          const repoRes = await fetch(repoUrl, { headers });
          
          if (repoRes.ok) {
            const repo = await repoRes.json();
            allRepositories.push(repo);
          } else {
            console.warn(`Repository '${repoPath}' not found or no access: ${repoRes.status}`);
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error fetching repository ${repoPath}:`, error);
        }
      }

      console.log(`Fetched ${allRepositories.length} repositories`);

      // Fetch pull requests from each repository
      let allPullRequests = [];
      for (const repo of allRepositories) {
        try {
          // Use BBQL to filter by author and date
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

      // Fetch issues from each repository
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
        workspaces: targetWorkspaces,
        repositories: allRepositories,
        pullRequests: allPullRequests,
        issues: allIssues,
        comments: []
      };

      // Cache the data
      this.cache.data = bitbucketData;
      this.cache.timestamp = Date.now();

      await this.saveToStorage(bitbucketData);

      this.cache.queue.forEach(({ resolve }) => resolve(bitbucketData));
      this.cache.queue = [];

      return bitbucketData;

    } catch (err) {
      console.error('Bitbucket Fetch Failed:', err);
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



processBitBucketData(data){
    const processed = {
        mergeRequests: data.mergeRequests || [],
        issues: data.issues || [],
        comments: data.comments || [],
        user: data.user
    };


    return processed;
}
  


}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BitbucketHelper;
} else {
  window.BitbucketHelper = BitbucketHelper;
}