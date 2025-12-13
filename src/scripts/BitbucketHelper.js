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
 

}