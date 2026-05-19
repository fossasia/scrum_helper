// Gitea API Helper for Scrum Helper Extension
const DEFAULT_GITEA_API_BASE_URL = 'https://gitea.com/api/v1';

function normalizeGiteaApiBaseUrl(apiBaseUrl) {
	const value = typeof apiBaseUrl === 'string' && apiBaseUrl.trim() ? apiBaseUrl.trim() : DEFAULT_GITEA_API_BASE_URL;
	let url = value.replace(/\/+$/, '');
	if (!url.includes('/api/v1')) {
		url = `${url}/api/v1`;
	}
	return url;
}

class GiteaHelper {
	constructor(apiBaseUrl = DEFAULT_GITEA_API_BASE_URL) {
		this.baseUrl = normalizeGiteaApiBaseUrl(apiBaseUrl);
		this.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000, // 10 minutes
			fetching: false,
			queue: [],
		};
	}

	async getCacheTTL() {
		try {
			const items = await browser.storage.local.get(['cacheInput']);
			return items.cacheInput ? Number.parseInt(items.cacheInput, 10) * 60 * 1000 : 10 * 60 * 1000;
		} catch (error) {
			console.error('Error getting cache TTL:', error);
			return 10 * 60 * 1000;
		}
	}

	async saveToStorage(data) {
		try {
			await browser.storage.local.set({
				giteaCache: {
					data: data,
					cacheKey: this.cache.cacheKey,
					timestamp: this.cache.timestamp,
				},
			});
		} catch (error) {
			console.error('Error saving to storage:', error);
		}
	}

	async loadFromStorage() {
		try {
			const items = await browser.storage.local.get(['giteaCache']);
			if (items.giteaCache) {
				this.cache.data = items.giteaCache.data;
				this.cache.cacheKey = items.giteaCache.cacheKey;
				this.cache.timestamp = items.giteaCache.timestamp;
			}
		} catch (error) {
			console.error('Error loading from storage:', error);
		}
	}

	async fetchGiteaData(username, startDate, endDate) {
		const cacheKey = `${this.baseUrl}-${username}-${startDate}-${endDate}`;

		if (!this.cache.data && !this.cache.fetching) {
			await this.loadFromStorage();
		}

		this.cache.ttl = await this.getCacheTTL();

		const now = Date.now();
		const isCacheFresh = now - this.cache.timestamp < this.cache.ttl;
		const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

		if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
			return this.cache.data;
		}

		if (!isCacheKeyMatch) {
			this.cache.data = null;
		}

		if (this.cache.fetching) {
			return new Promise((resolve, reject) => {
				this.cache.queue.push({ resolve, reject });
			});
		}

		this.cache.fetching = true;
		this.cache.cacheKey = cacheKey;

		try {
			// Throttle 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			// Verify user exists
			const userRes = await fetch(`${this.baseUrl}/users/${username}`);
			if (!userRes.ok) {
				if (userRes.status === 404) {
					throw new Error(
						(typeof chrome !== 'undefined' && chrome?.i18n?.getMessage('giteaUserNotFoundError', [username])) ||
						`Gitea user '${username}' not found`,
					);
				}
				throw new Error(
					(typeof chrome !== 'undefined' && chrome?.i18n?.getMessage('giteaUserFetchError', [userRes.status, userRes.statusText])) ||
					`Error fetching Gitea user: ${userRes.status} ${userRes.statusText}`,
				);
			}
			const user = await userRes.json();

			// Single API call to get all PRs created by user in date range
			const url = `${this.baseUrl}/repos/issues/search?type=pulls&created_by=${username}&since=${startDate}T00:00:00Z&before=${endDate}T23:59:59Z&limit=50&state=all`;
			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(
					(typeof chrome !== 'undefined' && chrome?.i18n?.getMessage('giteaPRReviewFetchError', [res.status, res.statusText])) ||
					`Error fetching Gitea pull requests: ${res.status} ${res.statusText}`,
				);
			}
			const pullRequests = await res.json();

			const giteaData = {
				user: user,
				pullRequests: pullRequests || [],
				issues: [],
			};

			// Cache the data
			this.cache.data = giteaData;
			this.cache.timestamp = Date.now();
			await this.saveToStorage(giteaData);

			this.cache.queue.forEach(({ resolve }) => resolve(giteaData));
			this.cache.queue = [];

			return giteaData;
		} catch (err) {
			console.error('Gitea Fetch Failed:', err);
			this.cache.queue.forEach(({ reject }) => reject(err));
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	processGiteaData(data) {
		return {
			pullRequests: data.pullRequests || [],
			issues: data.issues || [],
			user: data.user,
		};
	}
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GiteaHelper;
} else {
	window.GiteaHelper = GiteaHelper;
}