/**
 * GitHubHelper
 *
 * This extracts GitHub-specific behavior into a helper class and, in the
 * browser context, exposes a shared instance plus a backward-compatibility shim.
 *
 * Currently extracted: fetchUserRepositories
 * Planned: fetchData (issues, PRs, user), fetchCommitsForOpenPRs, cache management
 */

// Maximum number of repositories to resolve via GraphQL in a single query
const MAX_REPOS = 50;

class GitHubHelper {
	/**
	 * @param {object} storage - Storage backend (defaults to browser.storage.local).
	 *   Injected to avoid tight coupling and enable testing without a real browser env.
	 */
	constructor(storage = globalThis.browser?.storage?.local) {
		this.storage = storage;
	}

	/**
	 * Fetch repositories the user has contributed to within a date range.
	 * Uses GitHub Search API + GraphQL to resolve full repo metadata.
	 *
	 * @param {string} username - GitHub username
	 * @param {string|null} token - Optional personal access token
	 * @param {string} org - Optional org filter (empty = all orgs)
	 * @returns {Promise<Array>} Sorted array of repo objects
	 */
	async fetchUserRepositories(username, token, org = '') {
		const headers = {
			Accept: 'application/vnd.github.v3+json',
		};

		if (token) {
			headers.Authorization = `token ${token}`;
		}

		if (!username) {
			throw new Error('GitHub username is required');
		}

		console.log('[GitHubHelper] Fetching repos for username:', username, 'org:', org);

		try {
			let startDate;
			let endDate;

			try {
				const storageData = await this.storage.get([
					'startingDate',
					'endingDate',
					'yesterdayContribution',
				]);

				if (storageData.yesterdayContribution) {
					const today = new Date();
					const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
					startDate = yesterday.toISOString().split('T')[0];
					endDate = today.toISOString().split('T')[0];
				} else if (storageData.startingDate && storageData.endingDate) {
					startDate = storageData.startingDate;
					endDate = storageData.endingDate;
				} else {
					const today = new Date();
					const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
					startDate = lastWeek.toISOString().split('T')[0];
					endDate = today.toISOString().split('T')[0];
				}

				console.log(`[GitHubHelper] Using date range: ${startDate} to ${endDate}`);
			} catch (err) {
				console.warn('[GitHubHelper] Could not determine date range, using last 30 days:', err);
				const today = new Date();
				const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
				startDate = thirtyDaysAgo.toISOString().split('T')[0];
				endDate = today.toISOString().split('T')[0];
			}

			const dateRange = `+created:${startDate}..${endDate}`;
			const orgPart = org && org !== 'all' ? `+org:${org}` : '';

			const issuesUrl = `https://api.github.com/search/issues?q=author:${username}${orgPart}${dateRange}&per_page=100`;
			const commentsUrl = `https://api.github.com/search/issues?q=commenter:${username}${orgPart}${dateRange.replace('created:', 'updated:')}&per_page=100`;

			console.log('[GitHubHelper] Search URLs:', { issuesUrl, commentsUrl });

			const [issuesRes, commentsRes] = await Promise.all([
				fetch(issuesUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) })),
				fetch(commentsUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) })),
			]);

			const repoSet = new Set();

			const processRepoItems = (items) => {
				items?.forEach((item) => {
					if (item.repository_url) {
						const urlParts = item.repository_url.split('/');
						const repoFullName = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
						repoSet.add(repoFullName);
					}
				});
			};

			if (issuesRes.ok) {
				const issuesData = await issuesRes.json();
				processRepoItems(issuesData.items);
				console.log(`[GitHubHelper] Found ${issuesData.items?.length || 0} issues/PRs authored by user`);
			}

			if (commentsRes.ok) {
				const commentsData = await commentsRes.json();
				processRepoItems(commentsData.items);
				console.log(`[GitHubHelper] Found ${commentsData.items?.length || 0} issues/PRs with user comments`);
			}

			const repoNames = Array.from(repoSet);
			console.log(`[GitHubHelper] Found ${repoNames.length} unique repositories`);

			if (repoNames.length === 0) {
				return [];
			}

			const repoFields = `
				name
				nameWithOwner
				description
				pushedAt
				stargazerCount
				primaryLanguage {
					name
				}
			`;

			const repoQueries = repoNames
				.slice(0, MAX_REPOS)
				.map((repoFullName, i) => {
					const parts = repoFullName.split('/');
					if (parts.length !== 2) return '';
					const owner = parts[0];
					const repo = parts[1];
					return `
					repo${i}: repository(owner: "${owner}", name: "${repo}") {
						... on Repository {
							${repoFields}
						}
					}`;
				})
				.join('\n');

			const query = `query { ${repoQueries} }`;

			const res = await fetch('https://api.github.com/graphql', {
				method: 'POST',
				headers: {
					...headers,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query }),
			});

			if (!res.ok) {
				throw new Error(`[GitHubHelper] GraphQL request failed: ${res.status}`);
			}

			const graphQLData = await res.json();

			if (graphQLData.errors) {
				console.error('[GitHubHelper] GraphQL errors:', graphQLData.errors);
				return [];
			}

			const repos = Object.values(graphQLData.data)
				.filter((repo) => repo !== null)
				.map((repo) => ({
					name: repo.name,
					fullName: repo.nameWithOwner,
					description: repo.description,
					language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
					updatedAt: repo.pushedAt,
					stars: repo.stargazerCount,
				}));

			return repos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
		} catch (err) {
			console.error('[GitHubHelper] fetchUserRepositories failed:', err);
			return [];
		}
	}
}

// NOTE: Dual export for browser extension + Node.js (test) compatibility
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GitHubHelper;
} else {
	window.GitHubHelper = GitHubHelper;
	// Shared instance used by popup.js and scrumHelper.js
	window.gitHubHelper = new GitHubHelper();
	// Backward-compat shim so existing window.fetchUserRepositories calls keep working
	window.fetchUserRepositories = (username, token, org) =>
		window.gitHubHelper.fetchUserRepositories(username, token, org);
}
