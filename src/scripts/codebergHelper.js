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

	const webMatch = url.match(/codeberg\.org\/([^\/]+)\/([^\/]+)/);
	if (webMatch) return { owner: webMatch[1], repo: webMatch[2] };

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
					cacheKey: this.cache.cacheKey,
					timestamp: this.cache.timestamp,
				},
			});
		} catch (e) {
			console.error(e);
		}
	}

	async loadFromStorage() {
		try {
			const items = await browser.storage.local.get(['codebergCache']);
			if (items.codebergCache) {
				Object.assign(this.cache, items.codebergCache);
			}
		} catch (e) {
			console.error(e);
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

			/* REPOS */
			const reposRes = await fetch(`${this.baseUrl}/users/${username}/repos`, { headers });
			const repos = reposRes.ok ? await reposRes.json() : [];
			if (!Array.isArray(repos)) {
				throw new Error('Repositories list is not an array');
			}

			const start = new Date(startDate + 'T00:00:00Z');
			const end = new Date(endDate + 'T23:59:59Z');

			const issues = [];
			const mergeRequests = [];

			/* PER REPO FETCH */
			await Promise.all(
				repos.map(async (repo) => {
					const base = `${this.baseUrl}/repos/${repo.owner.login}/${repo.name}`;

					// ISSUES
					const repoIssues = await this.fetchAllPaginated(`${base}/issues?state=all`, headers);

					for (const issue of repoIssues) {
						const created = new Date(issue.created_at);
						const issueUser = issue.user?.username || issue.user?.login;
						const isAssignee =
							issue.assignees?.some((a) => (a.username || a.login) === username) ||
							(issue.assignee?.username || issue.assignee?.login) === username;

						if ((issueUser === username || isAssignee) && created >= start && created <= end) {
							issues.push(issue);
						}
					}

					// PRs
					const repoPRs = await this.fetchAllPaginated(`${base}/pulls?state=all`, headers);

					for (const pr of repoPRs) {
						const created = new Date(pr.created_at);
						const prUser = pr.user?.username || pr.user?.login;
						const isPrAssignee =
							pr.assignees?.some((a) => (a.username || a.login) === username) ||
							(pr.assignee?.username || pr.assignee?.login) === username;

						if ((prUser === username || isPrAssignee) && created >= start && created <= end) {
							mergeRequests.push(pr);
						}
					}
				}),
			);

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
		checkTokenForShowCommits(options = {}) {
			const { showWarning = false, animateWarning = false, warningDurationMs = 4000, persistState = false } = options;
			const showCommits = document.getElementById('showCommits');
			const codebergTokenInput = document.getElementById('codebergToken');

			if (!showCommits || !codebergTokenInput) {
				return;
			}

			const isShowCommitsEnabled = showCommits.checked;
			const hasToken = codebergTokenInput.value.trim() !== '';

			if (isShowCommitsEnabled && !hasToken) {
				showCommits.checked = false;
				if (showWarning) {
					const tokenWarning = document.getElementById('tokenWarningForShowCommits');
					if (tokenWarning) {
						tokenWarning.classList.remove('hidden');
						if (animateWarning) {
							tokenWarning.classList.add('shake-animation');
							setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
						}
						if (window.codebergShowCommitsWarningTimeout) {
							clearTimeout(window.codebergShowCommitsWarningTimeout);
						}
						window.codebergShowCommitsWarningTimeout = setTimeout(() => {
							tokenWarning.classList.add('hidden');
						}, warningDurationMs);
					}
				}
				browser.storage.local.set({ showCommits: false });
				return;
			}

			const tokenWarning = document.getElementById('tokenWarningForShowCommits');
			if (tokenWarning) {
				if (window.codebergShowCommitsWarningTimeout) {
					clearTimeout(window.codebergShowCommitsWarningTimeout);
					window.codebergShowCommitsWarningTimeout = null;
				}
				tokenWarning.classList.add('hidden');
			}
			if (persistState) {
				browser.storage.local.set({ showCommits: showCommits.checked });
			}
		},
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
