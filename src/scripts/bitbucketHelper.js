/* global chrome, browser */

const DEFAULT_BITBUCKET_API_BASE_URL = 'https://api.bitbucket.org/2.0';

/* ---------------- UTIL ---------------- */

function parseBitbucketRepoAndWorkspace(url) {
	if (!url) return { workspace: '', repo: '' };

	// e.g. https://api.bitbucket.org/2.0/repositories/workspace/repo
	const apiMatch = url.match(/\/repositories\/([^\/]+)\/([^\/]+)/);
	if (apiMatch) return { workspace: apiMatch[1], repo: apiMatch[2] };

	// e.g. https://bitbucket.org/workspace/repo
	try {
		const parsed = new URL(url);
		const parts = parsed.pathname.split('/').filter(Boolean);
		if (parts.length >= 2) {
			return { workspace: parts[0], repo: parts[1] };
		}
	} catch (e) {
		// ignore
	}

	return { workspace: '', repo: '' };
}

/* ---------------- CORE CLASS ---------------- */

class BitbucketHelper {
	constructor(apiBaseUrl = DEFAULT_BITBUCKET_API_BASE_URL) {
		this.baseUrl = apiBaseUrl.replace(/\/+$/, '');
		this.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000,
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
				bitbucketCache: {
					data,
					timestamp: this.cache.timestamp,
					cacheKey: this.cache.cacheKey,
				},
			});
		} catch (e) {
			console.error('[Bitbucket] Save storage error:', e);
		}
	}

	async loadFromStorage() {
		try {
			const res = await browser.storage.local.get('bitbucketCache');
			if (res && res.bitbucketCache) {
				const cached = res.bitbucketCache;
				this.cache.data = cached.data;
				this.cache.timestamp = cached.timestamp;
				this.cache.cacheKey = cached.cacheKey;
			}
		} catch (e) {
			console.error('[Bitbucket] Load storage error:', e);
		}
	}

	/* ---------- AUTH HEADER HELPER ---------- */

	getAuthHeader(username, token) {
		if (!token) return null;
		if (token.startsWith('Bearer ')) {
			return token;
		}
		// If username is provided, use Basic auth with username:token
		if (username) {
			try {
				return `Basic ${btoa(`${username}:${token}`)}`;
			} catch (e) {
				console.error('[Bitbucket] Failed to base64 encode credentials:', e);
			}
		}
		// Fallback to Bearer token if username is not present
		return `Bearer ${token}`;
	}

	/* ---------- REPOSITORY FETCHING ---------- */

	async fetchUserRepositories(username, token = null) {
		const headers = { Accept: 'application/json' };
		const auth = this.getAuthHeader(username, token);
		if (auth) headers.Authorization = auth;

		let url = `${this.baseUrl}/repositories?role=member`;
		if (!token) {
			url = `${this.baseUrl}/repositories/${username}`;
		}

		const repos = [];
		try {
			let nextPageUrl = url;
			let pagesFetched = 0;
			// Limit to 3 pages of repositories (up to 150 repos)
			while (nextPageUrl && pagesFetched < 3) {
				const sep = nextPageUrl.includes('?') ? '&' : '?';
				const res = await fetch(`${nextPageUrl}${sep}pagelen=50`, { headers });
				if (!res.ok) {
					console.warn(`[Bitbucket] Failed to fetch repositories from: ${nextPageUrl}. Status: ${res.status}`);
					break;
				}
				const data = await res.json();
				if (data && Array.isArray(data.values)) {
					repos.push(...data.values);
				}
				nextPageUrl = data.next;
				pagesFetched++;
			}
		} catch (e) {
			console.error('[Bitbucket] Error fetching repositories:', e);
		}
		return repos;
	}

	/* ---------- MAIN DATA FETCH ---------- */

	async fetchBitbucketData(username, startDate, endDate, token = null) {
		const cacheKey = `${username}-${startDate}-${endDate}-${token ? 'auth' : 'noauth'}`;

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
		const auth = this.getAuthHeader(username, token);
		if (auth) headers.Authorization = auth;

		try {
			/* USER DETAILS */
			let user = { username: username };
			let userAccountId = null;
			let userUuid = null;
			let userNickname = username;
			let userDisplayName = null;

			if (token) {
				try {
					const userRes = await fetch(`${this.baseUrl}/user`, { headers });
					if (userRes.ok) {
						const userData = await userRes.json();
						user = {
							username: userData.nickname || userData.username || username,
							name: userData.display_name || userData.username || username,
							avatar_url: userData.links?.avatar?.href || '',
						};
						userAccountId = userData.account_id;
						userUuid = userData.uuid;
						userNickname = userData.nickname || userData.username || username;
						userDisplayName = userData.display_name;
					}
				} catch (e) {
					console.warn('[Bitbucket] Failed to fetch auth user profile details:', e);
				}
			}

			/* REPOSITORIES */
			const repos = await this.fetchUserRepositories(username, token);

			const issues = [];
			const pullRequests = [];

			const matchNames = (n1, n2) => {
				if (!n1 || !n2) return false;
				const clean = (s) => s.toLowerCase().replace(/[\s\-_]+/g, '');
				return clean(n1) === clean(n2);
			};

			const startLimitDate = new Date(`${startDate}T00:00:00Z`);
			const endLimitDate = new Date(`${endDate}T23:59:59Z`);

			// For each repository, fetch pull requests and issues modified/updated in date range
			await Promise.all(
				repos.map(async (repo) => {
					const workspace = repo.workspace?.slug || repo.workspace?.username;
					const repoSlug = repo.slug;
					if (!workspace || !repoSlug) return;

					/* FETCH PULL REQUESTS */
					try {
						// Bitbucket API queries require updated_on comparison
						const prQuery = `updated_on >= "${startDate}T00:00:00Z" AND updated_on <= "${endDate}T23:59:59Z"`;
						const prUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests?q=${encodeURIComponent(
							prQuery,
						)}&state=OPEN&state=MERGED&state=DECLINED&state=SUPERSEDED&sort=-updated_on`;

						const res = await fetch(prUrl, { headers });
						if (res.ok) {
							const data = await res.json();
							if (data && Array.isArray(data.values)) {
								for (const pr of data.values) {
									// Filter client-side by author or reviewer to guarantee matching
									const prAuthorNickname = pr.author?.nickname || pr.author?.username || '';
									const prAuthorDisplayName = pr.author?.display_name || '';
									const prAuthorAccountId = pr.author?.account_id;
									const prAuthorUuid = pr.author?.uuid;

									const isAuthor =
										(userAccountId && prAuthorAccountId === userAccountId) ||
										(userUuid && prAuthorUuid === userUuid) ||
										matchNames(prAuthorNickname, userNickname) ||
										matchNames(prAuthorNickname, username) ||
										matchNames(prAuthorDisplayName, userDisplayName) ||
										matchNames(prAuthorDisplayName, username);

									const isReviewer =
										Array.isArray(pr.reviewers) &&
										pr.reviewers.some((r) => {
											const revNickname = r.nickname || r.username || '';
											const revDisplayName = r.display_name || '';
											return (
												(userAccountId && r.account_id === userAccountId) ||
												(userUuid && r.uuid === userUuid) ||
												matchNames(revNickname, userNickname) ||
												matchNames(revNickname, username) ||
												matchNames(revDisplayName, userDisplayName) ||
												matchNames(revDisplayName, username)
											);
										});

									if (isAuthor || isReviewer) {
										pullRequests.push({
											...pr,
											_repo: repo,
										});
									}
								}
							}
						}
					} catch (e) {
						console.warn(`[Bitbucket] Failed to fetch pull requests for ${workspace}/${repoSlug}:`, e);
					}

					/* FETCH ISSUES */
					if (repo.has_issues) {
						try {
							const issueQuery = `updated_on >= "${startDate}T00:00:00Z" AND updated_on <= "${endDate}T23:59:59Z"`;
							const issueUrl = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/issues?q=${encodeURIComponent(
								issueQuery,
							)}&sort=-updated_on`;

							const res = await fetch(issueUrl, { headers });
							if (res.ok) {
								const data = await res.json();
								if (data && Array.isArray(data.values)) {
									for (const issue of data.values) {
										const reporterNickname = issue.reporter?.nickname || issue.reporter?.username || '';
										const reporterDisplayName = issue.reporter?.display_name || '';
										const reporterAccountId = issue.reporter?.account_id;
										const reporterUuid = issue.reporter?.uuid;

										const assigneeNickname = issue.assignee?.nickname || issue.assignee?.username || '';
										const assigneeDisplayName = issue.assignee?.display_name || '';
										const assigneeAccountId = issue.assignee?.account_id;
										const assigneeUuid = issue.assignee?.uuid;

										const isReporter =
											(userAccountId && reporterAccountId === userAccountId) ||
											(userUuid && reporterUuid === userUuid) ||
											matchNames(reporterNickname, userNickname) ||
											matchNames(reporterNickname, username) ||
											matchNames(reporterDisplayName, userDisplayName) ||
											matchNames(reporterDisplayName, username);

										const isAssignee =
											(userAccountId && assigneeAccountId === userAccountId) ||
											(userUuid && assigneeUuid === userUuid) ||
											matchNames(assigneeNickname, userNickname) ||
											matchNames(assigneeNickname, username) ||
											matchNames(assigneeDisplayName, userDisplayName) ||
											matchNames(assigneeDisplayName, username);

										if (isReporter || isAssignee) {
											issues.push({
												...issue,
												_repo: repo,
											});
										}
									}
								}
							}
						} catch (e) {
							console.warn(`[Bitbucket] Failed to fetch issues for ${workspace}/${repoSlug}:`, e);
						}
					}
				}),
			);

			const result = {
				user,
				issues,
				pullRequests,
			};

			this.cache.data = result;
			this.cache.timestamp = Date.now();

			await this.saveToStorage(result);

			this.cache.queue.forEach((r) => r.resolve(result));
			this.cache.queue = [];

			return result;
		} catch (err) {
			console.error('[Bitbucket] Error:', err);
			this.cache.queue.forEach((r) => r.reject(err));
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	mapBitbucketReportItem(item, type) {
		const workspace = item._repo?.workspace?.slug || 'unknown';
		const repoSlug = item._repo?.slug || 'unknown';

		const isPR = type === 'pr';

		return {
			...item,
			id: item.id,
			number: item.id,
			title: item.title,
			state: isPR
				? item.state === 'OPEN'
					? 'open'
					: 'closed'
				: item.state === 'new' || item.state === 'open'
					? 'open'
					: 'closed',
			html_url:
				item.links?.html?.href ||
				`https://bitbucket.org/${workspace}/${repoSlug}/${isPR ? 'pull-requests' : 'issues'}/${item.id}`,
			repository_url: `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}`,
			project: repoSlug,
			created_at: item.created_on,
			updated_at: item.updated_on,
			pull_request: isPR
				? {
						merged: item.state === 'MERGED',
						merged_at: item.state === 'MERGED' ? item.updated_on : null,
					}
				: null,
		};
	}

	mapBitbucketReportData(data) {
		const mappedIssues = (data.issues || []).map((issue) => this.mapBitbucketReportItem(issue, 'issue'));
		const mappedPRs = (data.pullRequests || []).map((pr) => this.mapBitbucketReportItem(pr, 'pr'));

		return {
			githubIssuesData: { items: mappedIssues },
			githubPrsReviewData: { items: mappedPRs },
			githubUserData: data.user || {},
		};
	}
}

/* EXPORT */
if (typeof module !== 'undefined' && module.exports) {
	module.exports = BitbucketHelper;
} else {
	window.BitbucketHelper = BitbucketHelper;
}

/* ---------------- FORCE REFRESH ---------------- */

async function forceBitbucketDataRefresh() {
	if (window.bitbucketHelper instanceof window.BitbucketHelper) {
		window.bitbucketHelper.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000,
			fetching: false,
			queue: [],
		};
	}

	try {
		await browser.storage.local.remove('bitbucketCache');
	} catch (e) {
		console.error(e);
	}

	window.hasInjectedContent = false;
	window.bitbucketHelper = new window.BitbucketHelper();

	return { success: true };
}

window.forceBitbucketDataRefresh = forceBitbucketDataRefresh;

/* ---------------- PLATFORM REGISTRATION ---------------- */

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('bitbucket', {
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

		forceDataRefresh: forceBitbucketDataRefresh,
	});
}
