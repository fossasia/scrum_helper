class BitbucketHelper {
	constructor() {
		this.baseUrl = 'https://api.bitbucket.org/2.0';
		this.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000,
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
				bitbucketCache: {
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
			const items = await browser.storage.local.get(['bitbucketCache']);
			if (items.bitbucketCache) {
				this.cache.data = items.bitbucketCache.data;
				this.cache.cacheKey = items.bitbucketCache.cacheKey;
				this.cache.timestamp = items.bitbucketCache.timestamp;
			}
		} catch (error) {
			console.error('Error loading from storage:', error);
		}
	}

	buildHeaders(token) {
		const headers = {};
		if (token) {
			headers['Authorization'] = `Basic ${btoa(token)}`;
		}
		return headers;
	}

	async fetchAllPages(url, headers) {
		const results = [];
		let nextUrl = url;
		while (nextUrl) {
			const res = await fetch(nextUrl, { headers });
			if (!res.ok) {
				throw new Error(`Bitbucket API error: ${res.status} ${res.statusText}`);
			}
			const data = await res.json();
			results.push(...(data.values || []));
			nextUrl = data.next || null;
			if (nextUrl) {
				await new Promise((r) => setTimeout(r, 100));
			}
		}
		return results;
	}

	async fetchBitbucketData(username, startDate, endDate, token = null) {
		const tokenMarker = token ? 'auth' : 'noauth';
		const cacheKey = `${username}-${startDate}-${endDate}-${tokenMarker}`;

		if (!this.cache.data && !this.cache.fetching) {
			await this.loadFromStorage();
		}

		const currentTTL = await this.getCacheTTL();
		this.cache.ttl = currentTTL;

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

		const headers = this.buildHeaders(token);

		try {
			await new Promise((r) => setTimeout(r, 500));

			const userRes = await fetch(`${this.baseUrl}/users/${username}`, { headers });
			if (!userRes.ok) {
				if (userRes.status === 404) {
					throw new Error(
						chrome?.i18n.getMessage('bitbucketUserNotFoundError', [username]) ||
							`Bitbucket user '${username}' not found`,
					);
				}
				throw new Error(
					chrome?.i18n.getMessage('bitbucketUserFetchError', [userRes.status, userRes.statusText]) ||
						`Error fetching Bitbucket user: ${userRes.status} ${userRes.statusText}`,
				);
			}
			const user = await userRes.json();

			const reposUrl = `${this.baseUrl}/repositories?role=member&pagelen=50`;
			let repos = [];
			try {
				repos = await this.fetchAllPages(reposUrl, headers);
			} catch (e) {
				console.error('Bitbucket: error fetching repos:', e);
			}

			const afterDate = `${startDate}T00:00:00+00:00`;
			const beforeDate = `${endDate}T23:59:59+00:00`;

			let allPullRequests = [];
			let allIssues = [];

			for (const repo of repos) {
				const workspace = repo.workspace?.slug || repo.full_name.split('/')[0];
				const repoSlug = repo.slug;

				try {
					const prsUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests?q=author.username="${username}" AND created_on>="${afterDate}" AND created_on<="${beforeDate}"&pagelen=50`;
					const prs = await this.fetchAllPages(prsUrl, headers);
					for (const pr of prs) {
						pr._repoName = repo.name;
						pr._repoFullName = repo.full_name;
					}
					allPullRequests = allPullRequests.concat(prs);
				} catch (e) {
					console.error(`Bitbucket: error fetching PRs for ${repo.full_name}:`, e);
				}

				try {
					const issuesUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/issues?q=reporter.username="${username}" AND created_on>="${afterDate}" AND created_on<="${beforeDate}"&pagelen=50`;
					const issues = await this.fetchAllPages(issuesUrl, headers);
					for (const issue of issues) {
						issue._repoName = repo.name;
						issue._repoFullName = repo.full_name;
					}
					allIssues = allIssues.concat(issues);
				} catch (e) {
					console.error(`Bitbucket: error fetching issues for ${repo.full_name}:`, e);
				}

				await new Promise((r) => setTimeout(r, 100));
			}

			const bitbucketData = {
				user: user,
				repos: repos,
				pullRequests: allPullRequests,
				issues: allIssues,
			};

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
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = BitbucketHelper;
} else {
	window.BitbucketHelper = BitbucketHelper;
}
