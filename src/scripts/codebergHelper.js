/* global chrome, browser */

const DEFAULT_CODEBERG_API_BASE_URL = 'https://codeberg.org/api/v1';

/* ---------------- UTIL ---------------- */

function normalizeCodebergApiBaseUrl(apiBaseUrl) {
	return (apiBaseUrl?.trim() || DEFAULT_CODEBERG_API_BASE_URL).replace(/\/+$/, '');
}

function parseRepoAndOwner(url) {
	if (!url) return { owner: '', repo: '' };

	const apiMatch = url.match(/\/api\/v1\/repos\/([^\/]+)\/([^\/]+)/);
	if (apiMatch) return { owner: apiMatch[1], repo: apiMatch[2] };

	const webPathMatch = url.match(/\/([^\/]+)\/([^\/]+)\/(issues|pulls|pull|commit)\/\d+/i);
	if (webPathMatch) return { owner: webPathMatch[1], repo: webPathMatch[2] };

	try {
		const parsed = new URL(url);
		const parts = parsed.pathname.split('/').filter(Boolean);
		if (parts.length >= 2) {
			return { owner: parts[0], repo: parts[1] };
		}
	} catch (e) {
		// ignore
	}

	return { owner: '', repo: '' };
}

/* ---------------- CORE CLASS ---------------- */

class CodebergHelper {
	constructor(apiBaseUrl = DEFAULT_CODEBERG_API_BASE_URL) {
		this.baseUrl = normalizeCodebergApiBaseUrl(apiBaseUrl);

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
				codebergCache: {
					data,
					timestamp: this.cache.timestamp,
					cacheKey: this.cache.cacheKey,
				},
			});
		} catch (e) {
			console.error('[Codeberg] Save storage error:', e);
		}
	}

	async loadFromStorage() {
		try {
			const res = await browser.storage.local.get('codebergCache');
			if (res && res.codebergCache) {
				const cached = res.codebergCache;
				this.cache.data = cached.data;
				this.cache.timestamp = cached.timestamp;
				this.cache.cacheKey = cached.cacheKey;
			}
		} catch (e) {
			console.error('[Codeberg] Load storage error:', e);
		}
	}

	/* ---------- PAGINATION ---------- */

	async fetchAllPaginated(url, headers) {
		let page = 1;
		const limit = 50;
		const results = [];

		while (true) {
			const sep = url.includes('?') ? '&' : '?';
			const paged = `${url}${sep}limit=${limit}&page=${page}`;

			const res = await fetch(paged, { headers });
			if (!res.ok) break;

			const data = await res.json();
			if (!Array.isArray(data) || data.length === 0) break;

			results.push(...data);

			if (data.length < limit) break;
			page++;
		}

		return results;
	}

	async fetchAllPaginatedWithDateLimit(url, headers, startDateLimit) {
		let page = 1;
		const limit = 50;
		const results = [];
		const limitDate = startDateLimit ? new Date(startDateLimit + 'T00:00:00Z') : new Date(0);

		while (true) {
			const sep = url.includes('?') ? '&' : '?';
			const paged = `${url}${sep}limit=${limit}&page=${page}&sort=updated&order=desc`;

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

	/* ---------- MAIN FETCH (FIXED API) ---------- */

	async fetchCodebergData(username, startDate, endDate, token = null) {
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
		if (token) headers.Authorization = `token ${token}`;

		try {
			/* USER */
			const userRes = await fetch(`${this.baseUrl}/users/${username}`, { headers });
			if (!userRes.ok) throw new Error('User not found');
			const user = await userRes.json();

			const start = new Date(startDate + 'T00:00:00Z');
			const end = new Date(endDate + 'T23:59:59Z');

			const issues = [];
			const mergeRequests = [];

			if (token) {
				/* FETCH ISSUES/PRS VIA GLOBAL SEARCH */
				const issueUrls = [
					`${this.baseUrl}/repos/issues/search?state=all&created=true`,
					`${this.baseUrl}/repos/issues/search?state=all&assigned=true`,
					`${this.baseUrl}/repos/issues/search?state=all&mentioned=true`,
				];
				const mrUrls = [];
				const isCodeberg = this.baseUrl.includes('codeberg.org');
				if (!isCodeberg) {
					mrUrls.push(
						`${this.baseUrl}/repos/issues/search?state=all&review_requested=true`,
						`${this.baseUrl}/repos/issues/search?state=all&reviewed=true`
					);
				}

				const fetchQuery = async (url) => {
					try {
						return await this.fetchAllPaginatedWithDateLimit(url, headers, startDate);
					} catch (e) {
						console.warn(`Failed to fetch from ${url}:`, e);
						return [];
					}
				};

				const [issueResultsArray, mrResultsArray] = await Promise.all([
					Promise.all(issueUrls.map((url) => fetchQuery(url))),
					Promise.all(mrUrls.map((url) => fetchQuery(url))),
				]);

				// De-duplicate issues
				const allMatchedIssues = [];
				const seenIssueIds = new Set();
				for (const list of issueResultsArray) {
					for (const item of list) {
						if (!seenIssueIds.has(item.id)) {
							seenIssueIds.add(item.id);
							allMatchedIssues.push(item);
						}
					}
				}

				// De-duplicate merge requests
				const allMatchedMRs = [];
				const seenMRIds = new Set();
				for (const list of mrResultsArray) {
					for (const item of list) {
						if (!seenMRIds.has(item.id)) {
							seenMRIds.add(item.id);
							allMatchedMRs.push(item);
						}
					}
				}

				for (const item of allMatchedIssues) {
					const updated = new Date(item.updated_at || item.created_at);
					if (updated >= start && updated <= end) {
						issues.push(item);
					}
				}

				for (const item of allMatchedMRs) {
					const updated = new Date(item.updated_at || item.created_at);
					if (updated >= start && updated <= end) {
						if (item.pull_request) {
							mergeRequests.push(item);
						}
					}
				}
			} else {
				/* FALLBACK FOR UNAUTHENTICATED USERS: REPO-BASED FETCHING */
				const reposRes = await fetch(`${this.baseUrl}/users/${username}/repos`, { headers });
				const repos = reposRes.ok ? await reposRes.json() : [];
				if (!Array.isArray(repos)) {
					throw new Error('Repositories list is not an array');
				}

				await Promise.all(
					repos.map(async (repo) => {
						try {
							const base = `${this.baseUrl}/repos/${repo.owner.login}/${repo.name}`;
							const repoIssues = await this.fetchAllPaginated(`${base}/issues?state=all`, headers);

							for (const issue of repoIssues) {
								const updated = new Date(issue.updated_at || issue.created_at);
								if (updated >= start && updated <= end) {
									const issueUser = issue.user?.username || issue.user?.login;
									const isAssignee =
										issue.assignees?.some((a) => (a.username || a.login) === username) ||
										(issue.assignee?.username || issue.assignee?.login) === username;

									if (issueUser === username || isAssignee) {
										issues.push(issue);
										if (issue.pull_request) {
											mergeRequests.push(issue);
										}
									}
								}
							}
						} catch (e) {
							console.warn(`Failed to fetch issues for repo ${repo.name}:`, e);
						}
					})
				);
			}

			const result = {
				user,
				issues,
				mergeRequests,
				comments: [],
			};

			this.cache.data = result;
			this.cache.timestamp = Date.now();

			await this.saveToStorage(result);

			this.cache.queue.forEach((r) => r.resolve(result));
			this.cache.queue = [];

			return result;
		} catch (err) {
			console.error('[Codeberg] Error:', err);
			this.cache.queue.forEach((r) => r.reject(err));
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	async fetchCommitsForOpenPRs(prs, token, startDate, endDate) {
		const commitMap = {};
		if (!prs || prs.length === 0) return commitMap;

		const promises = prs.map(async (pr) => {
			try {
				const { owner, repo: repoName } = parseRepoAndOwner(pr.repository_url || pr.html_url);

				const url = `${this.baseUrl}/repos/${owner}/${repoName}/pulls/${pr.number}/commits`;
				const headers = {
					Accept: 'application/json',
				};
				if (token) {
					headers.Authorization = `token ${token}`;
				}
				const res = await fetch(url, { headers });
				if (!res.ok) {
					commitMap[pr.number] = [];
					return;
				}
				const commits = await res.json();

				const since = new Date(startDate + 'T00:00:00Z');
				const until = new Date(endDate + 'T23:59:59Z');

				const filteredCommits = commits
					.filter((c) => {
						const commitDate = new Date(c.commit.author.date || c.commit.committer.date);
						return commitDate >= since && commitDate <= until;
					})
					.map((c) => ({
						messageHeadline: c.commit.message.split('\n')[0],
						committedDate: c.commit.author.date || c.commit.committer.date,
						url: c.html_url,
						author: {
							name: c.commit.author.name,
							user: c.author ? { login: c.author.login } : null,
						},
					}));

				commitMap[pr.number] = filteredCommits;
			} catch (e) {
				console.error(`Error fetching commits for PR #${pr.number}:`, e);
				commitMap[pr.number] = [];
			}
		});

		await Promise.all(promises);
		return commitMap;
	}

	mapCodebergReportItem(item, type) {
		const { owner, repo } = parseRepoAndOwner(item.html_url || item.url);

		return {
			...item,
			repository_url: `${this.baseUrl}/repos/${owner}/${repo}`,
			html_url:
				item.html_url ||
				`${this.baseUrl.replace('/api/v1', '')}/${owner}/${repo}/${type === 'issue' ? 'issues' : 'pulls'}/${item.number}`,
			number: item.number,
			title: item.title,
			state: item.state === 'closed' ? 'closed' : 'open',
			project: repo,
			pull_request: type === 'mr' ? item.pull_request || { merged: false } : item.pull_request,
		};
	}

	mapCodebergReportData(data) {
		const mappedIssues = (data.issues || []).map((issue) => {
			const isMR = !!issue.pull_request;
			return this.mapCodebergReportItem(issue, isMR ? 'mr' : 'issue');
		});
		const mappedMRs = (data.mergeRequests || data.mrs || []).map((mr) => this.mapCodebergReportItem(mr, 'mr'));

		return {
			githubIssuesData: { items: mappedIssues },
			githubPrsReviewData: { items: mappedMRs },
			githubUserData: data.user || {},
		};
	}
}

/* EXPORT */
if (typeof module !== 'undefined' && module.exports) {
	module.exports = CodebergHelper;
} else {
	window.CodebergHelper = CodebergHelper;
}

/* ---------------- FORCE REFRESH (FIXED) ---------------- */

async function forceCodebergDataRefresh() {
	if (window.codebergHelper instanceof window.CodebergHelper) {
		window.codebergHelper.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000,
			fetching: false,
			queue: [],
		};
	}

	try {
		await browser.storage.local.remove('codebergCache');
	} catch (e) {
		console.error(e);
	}

	window.hasInjectedContent = false;

	window.codebergHelper = new window.CodebergHelper(window.codebergApiBaseUrl);

	return { success: true };
}

window.forceCodebergDataRefresh = forceCodebergDataRefresh;

/* ---------------- PLATFORM REGISTRATION ---------------- */

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('codeberg', {
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

		forceDataRefresh: forceCodebergDataRefresh,
	});
}
