/* global chrome, browser */

const DEFAULT_GITEE_API_BASE_URL = 'https://gitee.com/api/v5';

class GiteeHelper {
	constructor(apiBaseUrl = DEFAULT_GITEE_API_BASE_URL) {
		this.baseUrl = apiBaseUrl?.trim() || DEFAULT_GITEE_API_BASE_URL;
		this.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000, // 10 minutes
			fetching: false,
			queue: [],
		};
	}

	/* ---------- CACHE ---------- */

	async getCacheTTL() {
		try {
			const items = await browser.storage.local.get(['cacheInput']);
			return items.cacheInput ? Number.parseInt(items.cacheInput, 10) * 60 * 1000 : 10 * 60 * 1000;
		} catch {
			return 10 * 60 * 1000;
		}
	}

	async saveToStorage(data) {
		try {
			await browser.storage.local.set({
				giteeCache: {
					data,
					timestamp: this.cache.timestamp,
					cacheKey: this.cache.cacheKey,
				},
			});
		} catch (e) {
			console.error('[Gitee] Save storage error:', e);
		}
	}

	async loadFromStorage() {
		try {
			const res = await browser.storage.local.get('giteeCache');
			if (res && res.giteeCache) {
				const cached = res.giteeCache;
				this.cache.data = cached.data;
				this.cache.timestamp = cached.timestamp;
				this.cache.cacheKey = cached.cacheKey;
			}
		} catch (e) {
			console.error('[Gitee] Load storage error:', e);
		}
	}

	/* ---------- PAGINATION ---------- */

	async fetchAllPaginated(url, headers, startDateLimit = null) {
		let page = 1;
		const limit = 100;
		const results = [];
		const limitDate = startDateLimit ? new Date(startDateLimit + 'T00:00:00Z') : new Date(0);

		while (true) {
			const sep = url.includes('?') ? '&' : '?';
			const paged = `${url}${sep}per_page=${limit}&page=${page}`;

			const res = await fetch(paged, { headers });
			if (!res.ok) break;

			const data = await res.json();
			if (!Array.isArray(data) || data.length === 0) break;

			results.push(...data);

			const lastItem = data[data.length - 1];
			const lastUpdated = new Date(lastItem.updated_at || lastItem.created_at);
			if (lastUpdated < limitDate) {
				break;
			}

			if (data.length < limit) break;
			page++;
		}

		return results;
	}

	/* ---------- MAIN FETCH ---------- */

	async fetchGiteeData(username, startDate, endDate, token = null, orgName = '') {
		const cacheKey = `${username}-${startDate}-${endDate}-${token ? 'auth' : 'noauth'}-${orgName || 'noorg'}`;

		if (!this.cache.data) await this.loadFromStorage();

		const now = Date.now();
		const ttl = await this.getCacheTTL();
		const isCacheKeyMatch = this.cache.cacheKey === cacheKey;
		const isCacheFresh = now - this.cache.timestamp < ttl;

		if (this.cache.data && isCacheKeyMatch && isCacheFresh) {
			return this.cache.data;
		}

		if (!isCacheKeyMatch || !isCacheFresh) {
			this.cache.data = null;
		}

		if (this.cache.fetching) {
			return new Promise((resolve, reject) => this.cache.queue.push({ resolve, reject }));
		}

		this.cache.fetching = true;
		this.cache.cacheKey = cacheKey;

		const headers = { Accept: 'application/json' };
		if (token) headers.Authorization = `Bearer ${token}`;

		try {
			/* USER */
			const userRes = await fetch(`${this.baseUrl}/users/${encodeURIComponent(username)}`, { headers });
			if (!userRes.ok) throw new Error('User not found');
			const user = await userRes.json();

			const start = new Date(startDate + 'T00:00:00Z');
			const end = new Date(endDate + 'T23:59:59Z');

			const issues = [];
			const pulls = [];

			/* REPOSITORIES */
			let repos = [];
			if (orgName) {
				repos = await this.fetchAllPaginated(`${this.baseUrl}/orgs/${encodeURIComponent(orgName)}/repos`, headers);
			} else if (token) {
				repos = await this.fetchAllPaginated(`${this.baseUrl}/user/repos`, headers);
			} else {
				repos = await this.fetchAllPaginated(`${this.baseUrl}/users/${encodeURIComponent(username)}/repos`, headers);
			}

			const filterUsername = username.trim().toLowerCase();

			/* FETCH ISSUES & PRS PER REPOSITORY */
			await Promise.all(
				repos.map(async (repo) => {
					try {
						const owner = repo.owner?.login || orgName || username;
						const repoName = repo.path || repo.name;
						const base = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;

						// Fetch PRs
						const repoPulls = await this.fetchAllPaginated(`${base}/pulls?state=all`, headers, startDate);
						if (Array.isArray(repoPulls)) {
							for (const pr of repoPulls) {
								const updated = new Date(pr.updated_at || pr.created_at);
								if (updated >= start && updated <= end) {
									const prUser = pr.user?.login || '';
									const isAuthor = prUser.toLowerCase() === filterUsername;
									const isAssignee = Array.isArray(pr.assignees)
										? pr.assignees.some((a) => a.login?.toLowerCase() === filterUsername)
										: pr.assignee?.login?.toLowerCase() === filterUsername;
									const isTester = Array.isArray(pr.testers)
										? pr.testers.some((t) => t.login?.toLowerCase() === filterUsername)
										: pr.tester?.login?.toLowerCase() === filterUsername;

									if (isAuthor || isAssignee || isTester) {
										let prState = pr.state || 'open';
										if (prState === 'merged' || pr.merged_at) {
											prState = 'merged';
										} else if (prState === 'closed') {
											prState = 'closed';
										} else {
											prState = 'open';
										}
										const isDraft =
											pr.draft ||
											(pr.title &&
												(pr.title.trim().startsWith('[WIP]') ||
													pr.title.trim().startsWith('WIP:') ||
													pr.title.trim().startsWith('[Draft]') ||
													pr.title.trim().startsWith('Draft:')));
										pulls.push({
											...pr,
											state: prState,
											draft: !!isDraft,
											project: repo.name,
											repository_url: base,
											pull_request: {
												url: pr.url,
												html_url: pr.html_url || `https://gitee.com/${owner}/${repoName}/pulls/${pr.number}`,
												merged_at: pr.merged_at || pr.closed_at || null,
											},
											number: pr.number,
										});
									}
								}
							}
						}

						// Fetch Issues
						const repoIssues = await this.fetchAllPaginated(`${base}/issues?state=all`, headers, startDate);
						if (Array.isArray(repoIssues)) {
							for (const issue of repoIssues) {
								const updated = new Date(issue.updated_at || issue.created_at);
								if (updated >= start && updated <= end) {
									const issueUser = issue.user?.login || '';
									const isAuthor = issueUser.toLowerCase() === filterUsername;
									const isAssignee = Array.isArray(issue.assignees)
										? issue.assignees.some((a) => a.login?.toLowerCase() === filterUsername)
										: issue.assignee?.login?.toLowerCase() === filterUsername;

									if (isAuthor || isAssignee) {
										let issueState = issue.state || 'open';
										if (issueState === 'open' || issueState === 'progressing') {
											issueState = 'open';
										} else {
											issueState = 'closed';
										}
										issues.push({
											...issue,
											state: issueState,
											project: repo.name,
											repository_url: base,
											html_url: issue.html_url || `https://gitee.com/${owner}/${repoName}/issues/${issue.number}`,
											pull_request: false,
											number: issue.number,
										});
									}
								}
							}
						}
					} catch (e) {
						console.error(`[Gitee] Error fetching repo data for ${repo.name}:`, e);
					}
				}),
			);

			const result = {
				user,
				issues,
				pulls,
			};

			this.cache.data = result;
			this.cache.timestamp = Date.now();
			await this.saveToStorage(result);

			this.cache.queue.forEach((r) => r.resolve(result));
			this.cache.queue = [];

			return result;
		} catch (err) {
			console.error('[Gitee] Error:', err);
			this.cache.queue.forEach((r) => r.reject(err));
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	mapGiteeReportData(data) {
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

/* EXPORT */
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GiteeHelper;
} else {
	window.GiteeHelper = GiteeHelper;
}

/* ---------- FORCE REFRESH ---------- */

async function forceGiteeDataRefresh() {
	if (window.giteeHelper instanceof window.GiteeHelper) {
		window.giteeHelper.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000,
			fetching: false,
			queue: [],
		};
	}

	try {
		await browser.storage.local.remove('giteeCache');
	} catch (e) {
		console.error(e);
	}

	window.hasInjectedContent = false;
	window.giteeHelper = new window.GiteeHelper();

	return { success: true };
}

window.forceGiteeDataRefresh = forceGiteeDataRefresh;

/* ---------- PLATFORM REGISTRATION ---------- */

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('gitee', {
		hasRepoFilter: false,
		checkTokenForFilter() {},
		checkTokenForShowCommits() {},
		checkTokenForMergedPRs() {},
		triggerRepoFetchIfEnabled() {},
		debugRepoFetch() {},
		loadRepos() {},
		performRepoFetch() {},
		validateOrgOnBlur() {},

		fetchUserRepositories() {
			return Promise.resolve([]);
		},

		fetchPrsMergedStatusBatch() {
			return Promise.resolve({});
		},

		forceDataRefresh: forceGiteeDataRefresh,
	});
}
