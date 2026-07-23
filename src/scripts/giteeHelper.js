// Gitee API Helper for Scrum Helper Extension
const DEFAULT_GITEE_API_BASE_URL = 'https://gitee.com/api/v5';

class GiteeHelper {
	constructor() {
		this.baseUrl = DEFAULT_GITEE_API_BASE_URL;
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
			const ttl = items.cacheInput ? Number.parseInt(items.cacheInput, 10) * 60 * 1000 : 10 * 60 * 1000;
			return ttl;
		} catch (error) {
			console.error('Error getting cache TTL:', error);
			return 10 * 60 * 1000;
		}
	}

	async saveToStorage(data) {
		try {
			await browser.storage.local.set({
				giteeCache: {
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
			const items = await browser.storage.local.get(['giteeCache']);
			if (items.giteeCache) {
				this.cache.data = items.giteeCache.data;
				this.cache.cacheKey = items.giteeCache.cacheKey;
				this.cache.timestamp = items.giteeCache.timestamp;
			}
		} catch (error) {
			console.error('Error loading from storage:', error);
		}
	}

	async fetchGiteeData(username, startDate, endDate, token = null, orgName = '') {
		const tokenMarker = token ? 'auth' : 'noauth';
		const orgMarker = orgName ? `org-${orgName}` : 'noorg';
		const cacheKey = `${this.baseUrl}-${username}-${startDate}-${endDate}-${tokenMarker}-${orgMarker}`;

		// Check if we need to load from storage
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

		try {
			// Throttle 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			let repos = [];
			let finalUser = null;

			// Helper to fetch with token query param
			const giteeFetch = async (path, queryParams = {}) => {
				const params = new URLSearchParams(queryParams);
				if (token) {
					params.set('access_token', token);
				}
				const url = `${this.baseUrl}${path}${params.toString() ? '?' + params.toString() : ''}`;
				const res = await fetch(url);
				if (!res.ok) {
					throw new Error(`Gitee API error: ${res.status} ${res.statusText}`);
				}
				return res.json();
			};

			// 1. Fetch user info
			try {
				if (token) {
					finalUser = await giteeFetch('/user');
				} else {
					finalUser = await giteeFetch(`/users/${encodeURIComponent(username)}`);
				}
			} catch (err) {
				console.error('Error fetching Gitee user info:', err);
				if (err.message.includes('404')) {
					throw new Error(`Gitee user '${username}' not found`);
				}
				throw err;
			}

			if (!finalUser) {
				finalUser = { login: username, name: username };
			}

			// 2. Fetch Repositories
			if (orgName) {
				try {
					repos = await giteeFetch(`/orgs/${encodeURIComponent(orgName)}/repos`, {
						per_page: 100,
						sort: 'updated',
						direction: 'desc',
					});
				} catch (err) {
					console.error('Error fetching Gitee org repos:', err);
					if (err.message.includes('404')) {
						throw new Error(`Organization '${orgName}' not found`);
					}
					throw err;
				}
			} else {
				try {
					if (token) {
						repos = await giteeFetch('/user/repos', {
							per_page: 100,
							sort: 'updated',
							direction: 'desc',
						});
					} else {
						repos = await giteeFetch(`/users/${encodeURIComponent(username)}/repos`, {
							per_page: 100,
							sort: 'updated',
							direction: 'desc',
						});
					}
				} catch (err) {
					console.error('Error fetching Gitee user repos:', err);
					throw err;
				}
			}

			// Limit to top 15 updated repos to avoid rate limiting
			const activeRepos = Array.isArray(repos) ? repos.slice(0, 15) : [];

			let allIssues = [];
			let allPulls = [];

			const itemsStorage = await browser.storage.local.get(['onlyIssues', 'onlyPRs']);
			const fetchIssues = itemsStorage.onlyIssues !== false;
			const fetchPRs = itemsStorage.onlyPRs !== false;

			const startDateTime = new Date(startDate + 'T00:00:00Z');
			const endDateTime = new Date(endDate + 'T23:59:59Z');

			for (const repo of activeRepos) {
				const owner = repo.owner?.login || orgName || username;
				const repoName = repo.path || repo.name;

				if (fetchPRs) {
					try {
						const pulls = await giteeFetch(
							`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/pulls`,
							{
								state: 'all',
								per_page: 100,
							},
						);

						if (Array.isArray(pulls)) {
							const filteredPulls = pulls
								.filter((pr) => {
									const prUser = pr.user?.login || '';
									if (prUser.toLowerCase() !== username.toLowerCase()) {
										return false;
									}
									const prDate = new Date(pr.updated_at || pr.created_at);
									return prDate >= startDateTime && prDate <= endDateTime;
								})
								.map((pr) => {
									let prState = pr.state || 'open';
									// Map state
									if (prState === 'merged' || pr.merged_at) {
										prState = 'merged';
									} else if (prState === 'closed') {
										prState = 'closed';
									} else {
										prState = 'open';
									}
									return {
										...pr,
										state: prState,
										project: repo.name,
										repository_url: `${this.baseUrl}/repos/${owner}/${repoName}`,
										pull_request: true,
										number: pr.number,
									};
								});
							allPulls = allPulls.concat(filteredPulls);
						}
						// Add delay
						await new Promise((r) => setTimeout(r, 100));
					} catch (e) {
						console.error(`Error fetching pulls for repo ${repoName}:`, e);
					}
				}

				if (fetchIssues) {
					try {
						const issues = await giteeFetch(
							`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/issues`,
							{
								state: 'all',
								per_page: 100,
							},
						);

						if (Array.isArray(issues)) {
							const filteredIssues = issues
								.filter((issue) => {
									const issueUser = issue.user?.login || '';
									// Also check assignee
									const isAssignee = Array.isArray(issue.assignees)
										? issue.assignees.some((a) => a.login?.toLowerCase() === username.toLowerCase())
										: issue.assignee?.login?.toLowerCase() === username.toLowerCase();

									const isAuthor = issueUser.toLowerCase() === username.toLowerCase();
									if (!isAuthor && !isAssignee) {
										return false;
									}
									const issueDate = new Date(issue.updated_at || issue.created_at);
									return issueDate >= startDateTime && issueDate <= endDateTime;
								})
								.map((issue) => {
									let issueState = issue.state || 'open';
									if (issueState === 'open' || issueState === 'progressing') {
										issueState = 'open';
									} else {
										issueState = 'closed';
									}
									return {
										...issue,
										state: issueState,
										project: repo.name,
										repository_url: `${this.baseUrl}/repos/${owner}/${repoName}`,
										pull_request: false,
										number: issue.number,
									};
								});
							allIssues = allIssues.concat(filteredIssues);
						}
						// Add delay
						await new Promise((r) => setTimeout(r, 100));
					} catch (e) {
						console.error(`Error fetching issues for repo ${repoName}:`, e);
					}
				}
			}

			const giteeData = {
				user: finalUser,
				issues: allIssues,
				pulls: allPulls,
			};

			this.cache.data = giteeData;
			this.cache.timestamp = Date.now();
			await this.saveToStorage(giteeData);

			// Resolve queue
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

	mapGiteeReportData(data) {
		// Map Gitee user login to username for compatibility
		const user = data.user || {};
		if (user.login && !user.username) {
			user.username = user.login;
		}
		return {
			githubIssuesData: { items: data.issues || [] },
			githubPrsReviewData: { items: data.pulls || [] },
			githubUserData: user,
		};
	}
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = GiteeHelper;
} else {
	window.GiteeHelper = GiteeHelper;
}

async function forceGiteeDataRefresh() {
	if (window.GiteeHelper && window.giteeHelper instanceof window.GiteeHelper) {
		window.giteeHelper.cache.data = null;
		window.giteeHelper.cache.cacheKey = null;
		window.giteeHelper.cache.timestamp = 0;
		window.giteeHelper.cache.fetching = false;
		window.giteeHelper.cache.queue = [];
	}
	await new Promise((resolve) => {
		chrome.storage.local.remove('giteeCache', resolve);
	});
	window.hasInjectedContent = false;
	if (window.GiteeHelper) {
		window.giteeHelper = new window.GiteeHelper();
	}
	return { success: true };
}

window['forceGiteeDataRefresh'] = forceGiteeDataRefresh;

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('gitee', {
		hasRepoFilter: false,
		checkTokenForFilter() {},
		checkTokenForShowCommits() {},
		checkTokenForMergedPRs() {},
		checkTokenForNextPlans() {},
		triggerRepoFetchIfEnabled() {},
		debugRepoFetch() {},
		loadRepos() {},
		performRepoFetch() {},
		validateOrgOnBlur(org) {
			console.log('[Org Check] Checking Gitee org on blur:', org);
			const baseUrl = 'https://gitee.com/api/v5';
			chrome.storage.local.get(['giteeToken']).then((result) => {
				const tokenQuery = result.giteeToken ? `?access_token=${encodeURIComponent(result.giteeToken)}` : '';
				fetch(`${baseUrl}/orgs/${encodeURIComponent(org)}${tokenQuery}`)
					.then((res) => {
						console.log('[Org Check] Gitee response status:', res.status);
						if (res.status === 404) {
							if (window.showPopupMessage) {
								window.showPopupMessage('Organization not found', { variant: 'error' });
							}
							return;
						}
						window.clearScrumHelperToast?.();
						chrome.storage.local.remove(['giteeCache']);
					})
					.catch((err) => {
						console.error('[Org Check] Gitee validate error:', err);
						if (window.showPopupMessage) {
							window.showPopupMessage('Error validating organization', { variant: 'error' });
						}
					});
			});
		},
		fetchUserRepositories() {
			return Promise.resolve([]);
		},
		fetchPrsMergedStatusBatch() {
			return Promise.resolve({});
		},
		forceDataRefresh: forceGiteeDataRefresh,
		fetchAssignedIssues() {
			return Promise.resolve([]);
		},
	});
}
