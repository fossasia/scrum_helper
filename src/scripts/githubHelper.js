/* global chrome, browser */

// Token validation and warning timeouts
let showCommitsWarningTimeout;

function showTokenWarningForShowCommits({ animate = false, durationMs = 4000 } = {}) {
	const tokenWarning = document.getElementById('tokenWarningForShowCommits');
	if (!tokenWarning) {
		return;
	}

	tokenWarning.classList.remove('hidden');
	if (animate) {
		tokenWarning.classList.add('shake-animation');
		setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
	}

	if (showCommitsWarningTimeout) {
		clearTimeout(showCommitsWarningTimeout);
	}
	showCommitsWarningTimeout = setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, durationMs);
}

function checkTokenForShowCommits({
	showWarning = false,
	animateWarning = false,
	warningDurationMs = 4000,
	persistState = false,
} = {}) {
	const showCommits = document.getElementById('showCommits');
	const githubTokenInput = document.getElementById('githubToken');

	if (!showCommits || !githubTokenInput) {
		return;
	}

	const isShowCommitsEnabled = showCommits.checked;
	const hasToken = githubTokenInput.value.trim() !== '';

	if (isShowCommitsEnabled && !hasToken) {
		showCommits.checked = false;
		if (showWarning) {
			showTokenWarningForShowCommits({
				animate: animateWarning,
				durationMs: warningDurationMs,
			});
		}
		// Always persist correction of invalid state
		browser.storage.local.set({ showCommits: false });
		return;
	}

	const tokenWarning = document.getElementById('tokenWarningForShowCommits');
	if (tokenWarning) {
		if (showCommitsWarningTimeout) {
			clearTimeout(showCommitsWarningTimeout);
			showCommitsWarningTimeout = null;
		}
		tokenWarning.classList.add('hidden');
	}
	if (persistState) {
		browser.storage.local.set({ showCommits: showCommits.checked });
	}
}

// Token validation and warning timeouts for merged PRs
let mergedPRsWarningTimeout;

function showTokenWarningForMergedPRs({ animate = false, durationMs = 4000 } = {}) {
	const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
	if (!tokenWarning) {
		return;
	}

	tokenWarning.classList.remove('hidden');
	if (animate) {
		tokenWarning.classList.add('shake-animation');
		setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
	}

	if (mergedPRsWarningTimeout) {
		clearTimeout(mergedPRsWarningTimeout);
	}
	mergedPRsWarningTimeout = setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, durationMs);
}

function checkTokenForMergedPRs({
	showWarning = false,
	animateWarning = false,
	warningDurationMs = 4000,
	persistState = false,
} = {}) {
	const mergedPRsCheckbox = document.getElementById('onlyMergedPRs');
	const githubTokenInput = document.getElementById('githubToken');

	if (!mergedPRsCheckbox || !githubTokenInput) {
		return;
	}

	const isMergedPRsEnabled = mergedPRsCheckbox.checked;
	const hasToken = githubTokenInput.value.trim() !== '';

	if (isMergedPRsEnabled && !hasToken) {
		mergedPRsCheckbox.checked = false;
		if (showWarning) {
			showTokenWarningForMergedPRs({
				animate: animateWarning,
				durationMs: warningDurationMs,
			});
		}
		chrome?.storage.local.set({ onlyMergedPRs: false });
		return;
	}

	const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
	if (tokenWarning) {
		if (mergedPRsWarningTimeout) {
			clearTimeout(mergedPRsWarningTimeout);
			mergedPRsWarningTimeout = null;
		}
		tokenWarning.classList.add('hidden');
	}
	if (persistState) {
		chrome?.storage.local.set({ onlyMergedPRs: mergedPRsCheckbox.checked });
	}
}

//  Validates GitHub token for enabling the repo filter and shows a short warning

function getGithubRepoFilterContext() {
	return window.githubRepoFilterContext || null;
}

function checkTokenForFilter() {
	const useRepoFilter = document.getElementById('useRepoFilter');
	const githubTokenInput = document.getElementById('githubToken');
	const tokenWarning = document.getElementById('tokenWarningForFilter');
	const repoFilterContainer = document.getElementById('repoFilterContainer');

	if (!useRepoFilter || !githubTokenInput || !tokenWarning || !repoFilterContainer) {
		return;
	}
	const isFilterEnabled = useRepoFilter.checked;
	const hasToken = githubTokenInput.value.trim() !== '';

	if (isFilterEnabled && !hasToken) {
		useRepoFilter.checked = false;
		repoFilterContainer.classList.add('hidden');
		const context = getGithubRepoFilterContext();
		if (context?.hideDropdown) {
			context.hideDropdown();
		}
		browser.storage.local.set({ useRepoFilter: false });
	}
	tokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
	setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, 4000);
}

function makeRepoCacheKey(username, orgName, platform, storageItems) {
	const org = orgName || '';
	if (platform === 'github') {
		const token = (storageItems?.githubToken || '').trim();
		if (!token) {
			return `repos-${username}-${org}-notoken`;
		}
		let hash = 0;
		for (let i = 0; i < token.length; i++) {
			const char = token.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0; // Convert to 32bit integer
		}
		const fingerprint = (hash >>> 0).toString(36);
		return `repos-${username}-${org}-token-${fingerprint}`;
	}
	return `repos-${username}-${org}`;
}

// Trigger repo fetch when repo filtering is enabled (moved from popup.js)
async function triggerRepoFetchIfEnabled() {
	const context = getGithubRepoFilterContext();
	if (!context) {
		return;
	}

	const { useRepoFilter, repoStatus, repoSearch, filterAndDisplayRepos, setAvailableRepos } = context;

	// --- PLATFORM CHECK: Only run for GitHub ---
	let platform = 'github';
	try {
		const items = await browser.storage.local.get(['platform']);
		platform = items.platform || 'github';
	} catch {}
	if (platform !== 'github') {
		// Do not run repo fetch for non-GitHub platforms
		if (repoStatus)
			repoStatus.textContent =
				chrome?.i18n.getMessage('repoFilteringGithubOnly') || 'Repository filtering is only available for GitHub.';
		return;
	}
	if (!useRepoFilter?.checked) {
		return;
	}

	if (repoStatus) {
		repoStatus.textContent = browser.i18n.getMessage('repoRefetching');
	}

	try {
		const cacheData = await browser.storage.local.get(['repoCache']);
		const items = await browser.storage.local.get([
			'platform',
			'githubUsername',
			'gitlabUsername',
			'githubToken',
			'orgName',
		]);

		const platform2 = items.platform || 'github';
		const platformUsernameKey = `${platform2}Username`;
		const username = items[platformUsernameKey];

		if (!username) {
			if (repoStatus) {
				repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
			}
			return;
		}

		if (window.fetchUserRepositories) {
			const repos = await window.fetchUserRepositories(username, items.githubToken, items.orgName || '');
			setAvailableRepos?.(repos);

			if (repoStatus) {
				repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [repos.length]);
			}

			const repoCacheKey = makeRepoCacheKey(username, items.orgName || '', 'github', items);
			browser.storage.local.set({
				repoCache: {
					data: repos,
					cacheKey: repoCacheKey,
					timestamp: Date.now(),
				},
			});

			if (document.activeElement === repoSearch) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			} else if (repoSearch.value) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			} else {
				filterAndDisplayRepos('');
			}
		}
	} catch (err) {
		if (repoStatus) {
			repoStatus.textContent = `${browser.i18n.getMessage('errorLabel')}: ${err.message || browser.i18n.getMessage('repoRefetchFailed')}`;
		}
	}
}

function debugRepoFetch() {
	browser.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName']).then((items) => {
		const platform = items.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		const username = items[platformUsernameKey];
		console.log('Current settings:', {
			username: username,
			hasToken: !!items.githubToken,
			org: items.orgName || '',
		});
	});
}

async function loadRepos() {
	const context = getGithubRepoFilterContext();
	if (!context) {
		return;
	}

	const { repoStatus } = context;

	// --- PLATFORM CHECK: Only run for GitHub ---
	let platform = 'github';
	try {
		const items = await browser.storage.local.get(['platform']);
		platform = items.platform || 'github';
	} catch {}
	if (platform !== 'github') {
		if (repoStatus)
			repoStatus.textContent =
				chrome?.i18n.getMessage('repoLoadingGithubOnly') || 'Repository loading is only available for GitHub.';
		return;
	}
	console.log('window.fetchUserRepositories exists:', !!window.fetchUserRepositories);
	console.log(
		'Available functions:',
		Object.keys(window).filter((key) => key.includes('fetch')),
	);

	if (!window.fetchUserRepositories) {
		repoStatus.textContent = 'Repository fetching not available';
		return;
	}

	browser.storage.local.get(['platform', 'githubUsername', 'githubToken']).then((items) => {
		const platform = items.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		const username = items[platformUsernameKey];
		console.log('Storage data for repo fetch:', {
			hasUsername: !!username,
			hasToken: !!items.githubToken,
			username: username,
		});

		if (!username) {
			repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
			return;
		}

		performRepoFetch();
	});
}

async function performRepoFetch() {
	const context = getGithubRepoFilterContext();
	if (!context) {
		return;
	}

	const { repoStatus, repoSearch, filterAndDisplayRepos, setAvailableRepos, getAvailableRepos } = context;

	let platform = 'github';
	try {
		const items = await browser.storage.local.get(['platform']);
		platform = items.platform || 'github';
	} catch (e) {}
	if (platform !== 'github') {
		if (repoStatus)
			repoStatus.textContent =
				chrome?.i18n.getMessage('repoFetchingGithubOnly') || 'Repository fetching is only available for GitHub.';
		return;
	}
	console.log('[POPUP-DEBUG] performRepoFetch called.');
	repoStatus.textContent = browser.i18n.getMessage('repoLoading');
	repoSearch.classList.add('repository-search-loading');

	try {
		const cacheData = await browser.storage.local.get(['repoCache']);
		const storageItems = await browser.storage.local.get([
			'platform',
			'githubUsername',
			'gitlabUsername',
			'githubToken',
			'orgName',
		]);
		const platform = storageItems.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		const username = storageItems[platformUsernameKey];
		const repoCacheKey = makeRepoCacheKey(username, storageItems.orgName || '', 'github', storageItems);
		const now = Date.now();
		const cacheAge = cacheData.repoCache?.timestamp ? now - cacheData.repoCache.timestamp : Number.POSITIVE_INFINITY;
		const cacheTTL = 10 * 60 * 1000; // 10 minutes

		console.log('[POPUP-DEBUG] Repo cache check:', {
			key: repoCacheKey,
			cacheKeyInCache: cacheData.repoCache?.cacheKey,
			isMatch: cacheData.repoCache?.cacheKey === repoCacheKey,
			age: cacheAge,
			isFresh: cacheAge < cacheTTL,
		});

		if (cacheData.repoCache && cacheData.repoCache.cacheKey === repoCacheKey && cacheAge < cacheTTL) {
			console.log('[POPUP-DEBUG] Using cached repositories in manual fetch');
			setAvailableRepos(cacheData.repoCache.data);
			const availableRepos = getAvailableRepos();
			repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [availableRepos.length]);

			if (document.activeElement === repoSearch) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			}
			return;
		}
		console.log('[POPUP-DEBUG] No valid cache. Fetching from network.');
		const fetchedRepos = await window.fetchUserRepositories(
			username,
			storageItems.githubToken,
			storageItems.orgName || '',
		);
		setAvailableRepos(fetchedRepos);
		const availableRepos = getAvailableRepos();
		repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [availableRepos.length]);
		console.log(`[POPUP-DEBUG] Fetched and loaded ${availableRepos.length} repos.`);

		browser.storage.local.set({
			repoCache: {
				data: availableRepos,
				cacheKey: repoCacheKey,
				timestamp: now,
			},
		});

		if (document.activeElement === repoSearch) {
			filterAndDisplayRepos(repoSearch.value.toLowerCase());
		}
	} catch (err) {
		console.error(`Failed to load repos:`, err);

		if (err.message && err.message.includes('401')) {
			repoStatus.textContent = browser.i18n.getMessage('repoTokenPrivate');
		} else if (err.message && err.message.includes('username')) {
			repoStatus.textContent = browser.i18n.getMessage('githubUsernamePlaceholder');
		} else {
			repoStatus.textContent = `${browser.i18n.getMessage('errorLabel')}: ${err.message || browser.i18n.getMessage('repoLoadFailed')}`;
		}
	} finally {
		repoSearch.classList.remove('repository-search-loading');
	}
}

// Validate organization only when user is done typing (on blur)
function validateOrgOnBlur(org) {
	console.log('[Org Check] Checking organization on blur:', org);
	fetch(`https://api.github.com/orgs/${org}`)
		.then((res) => {
			console.log('[Org Check] Response status for', org, ':', res.status);
			if (res.status === 404) {
				console.log('[Org Check] Organization not found on GitHub:', org);
				if (typeof showPopupMessage === 'function') {
					showPopupMessage(browser.i18n.getMessage('orgNotFoundMessage'));
				} else if (window.showPopupMessage) {
					window.showPopupMessage(browser.i18n.getMessage('orgNotFoundMessage'));
				}
				return;
			}
			window.clearScrumHelperToast?.();
			console.log('[Org Check] Organisation exists on GitHub:', org);
			browser.storage.local.remove(['githubCache', 'repoCache']);
			triggerRepoFetchIfEnabled();
		})
		.catch((err) => {
			console.log('[Org Check] Error validating organisation:', org, err);
			if (typeof showPopupMessage === 'function') {
				showPopupMessage(browser.i18n.getMessage('orgValidationErrorMessage'), { variant: 'error' });
			} else if (window.showPopupMessage) {
				window.showPopupMessage(browser.i18n.getMessage('orgValidationErrorMessage'), { variant: 'error' });
			}
		});
}

async function fetchPrsMergedStatusBatch(prs, headers) {
	const results = {};
	if (prs.length === 0) return results;
	const query = `query {
${prs
	.map(
		(pr, i) => `	repo${i}: repository(owner: "${pr.owner}", name: "${pr.repo}") {
		pr${i}: pullRequest(number: ${pr.number}) { merged }
	}`,
	)
	.join('\n')}
}`;

	try {
		const res = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: {
				...headers,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query }),
		});
		if (!res.ok) return results;
		const data = await res.json();
		prs.forEach((pr, i) => {
			const merged = data.data[`repo${i}`]?.[`pr${i}`]?.merged;
			results[`${pr.owner}/${pr.repo}#${pr.number}`] = merged;
		});
		return results;
	} catch (e) {
		return results;
	}
}

async function fetchUserRepositories(username, token, org = '') {
	const headers = {
		Accept: 'application/vnd.github.v3+json',
	};

	if (token) {
		headers.Authorization = `token ${token}`;
	}

	if (!username) {
		throw new Error('GitHub username is required');
	}

	console.log('Fetching repos for username:', username, 'org:', org);

	try {
		let dateRange = '';
		try {
			const storageData = await new Promise((resolve) => {
				chrome.storage.local.get(['startingDate', 'endingDate', 'yesterdayContribution'], resolve);
			});

			let startDate;
			let endDate;
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

			dateRange = `+created:${startDate}..${endDate}`;
			console.log(`Using date range for repo search: ${startDate} to ${endDate}`);
		} catch (err) {
			console.warn('Could not determine date range, using last 30 days:', err);
			const today = new Date();
			const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
			const startDate = thirtyDaysAgo.toISOString().split('T')[0];
			const endDate = today.toISOString().split('T')[0];
			dateRange = `+created:${startDate}..${endDate}`;
		}
		const orgPart = org && org !== 'all' ? `+org:${org}` : '';
		const issuesUrl = `https://api.github.com/search/issues?q=author:${username}${orgPart}${dateRange}&per_page=100`;
		const commentsUrl = `https://api.github.com/search/issues?q=commenter:${username}${orgPart}${dateRange.replace('created:', 'updated:')}&per_page=100`;

		console.log('Search URLs:', { issuesUrl, commentsUrl });

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
					const repoName = `${urlParts[urlParts.length - 1]}`;
					repoSet.add(repoFullName);
				}
			});
		};

		if (issuesRes.ok) {
			const issuesData = await issuesRes.json();
			processRepoItems(issuesData.items);
			console.log(`Found ${issuesData.items?.length || 0} issues/PRs authored by user in date range`);
		}

		if (commentsRes.ok) {
			const commentsData = await commentsRes.json();
			processRepoItems(commentsData.items);
			console.log(`Found ${commentsData.items?.length || 0} issues/PRs with user comments in date range`);
		}

		const repoNames = Array.from(repoSet);
		console.log(`Found ${repoNames.length} unique repositories with contributions in the selected date range`);

		if (repoNames.length === 0) {
			console.log(`No repositories with contributions found in the selected date range`);
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
			.slice(0, 50)
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
                }
            `;
			})
			.join('\n');

		const query = `query { ${repoQueries} }`;

		try {
			const res = await fetch('https://api.github.com/graphql', {
				method: 'POST',
				headers: {
					...headers,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ query }),
			});

			if (!res.ok) {
				throw new Error(`GraphQL request for repos failed: ${res.status}`);
			}

			const graphQLData = await res.json();

			if (graphQLData.errors) {
				console.error('GraphQL errors fetching repos:', graphQLData.errors);
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
		} catch (err) {}
	} catch (err) {}
}

window.fetchUserRepositories = fetchUserRepositories;
window.fetchPrsMergedStatusBatch = fetchPrsMergedStatusBatch;

async function forceGithubDataRefresh() {
	let showCommits = false;

	await new Promise((resolve) => {
		chrome.storage.local.get('showCommits', (result) => {
			if (result.showCommits !== undefined) {
				showCommits = result.showCommits;
			}
			resolve();
		});
	});

	if (typeof githubCache !== 'undefined') {
		githubCache.data = null;
		githubCache.cacheKey = null;
		githubCache.timestamp = 0;
		githubCache.subject = null;
		githubCache.fetching = false;
		githubCache.queue = [];
	}

	await new Promise((resolve) => {
		chrome.storage.local.remove('githubCache', resolve);
	});

	chrome.storage.local.set({ showCommits: showCommits });

	window.hasInjectedContent = false;

	return { success: true };
}

window['forceGithubDataRefresh'] = forceGithubDataRefresh;

// Global fetch helpers
const GITHUB_DEBUG = false;
function log(...args) {
	if (GITHUB_DEBUG) {
		console.log(`[GITHUB-HELPER]:`, ...args);
	}
}

async function githubFetchUser(username, token) {
	const url = `https://api.github.com/users/${username}`;
	const headers = { Accept: 'application/vnd.github.v3+json' };
	if (token) {
		headers.Authorization = `token ${token}`;
	}
	return fetch(url, { headers });
}

async function githubFetchIssues(username, token, startDate, endDate, orgName, repoQueries) {
	const headers = { Accept: 'application/vnd.github.v3+json' };
	if (token) {
		headers.Authorization = `token ${token}`;
	}
	const orgPart = orgName ? `org:${orgName}` : '';
	const orgQuery = orgPart ? `+${orgPart}` : '';
	let url;
	if (repoQueries) {
		url = `https://api.github.com/search/issues?q=author%3A${username}+${repoQueries}${orgQuery}+updated%3A${startDate}..${endDate}&per_page=100`;
	} else {
		url = `https://api.github.com/search/issues?q=author%3A${username}${orgQuery}+updated%3A${startDate}..${endDate}&per_page=100`;
	}
	return fetch(url, { headers });
}

async function githubFetchReviews(username, token, startDate, endDate, orgName, repoQueries) {
	const headers = { Accept: 'application/vnd.github.v3+json' };
	if (token) {
		headers.Authorization = `token ${token}`;
	}
	const orgPart = orgName ? `org:${orgName}` : '';
	const orgQuery = orgPart ? `+${orgPart}` : '';
	let url;
	if (repoQueries) {
		url = `https://api.github.com/search/issues?q=commenter%3A${username}+${repoQueries}${orgQuery}+updated%3A${startDate}..${endDate}&per_page=100`;
	} else {
		url = `https://api.github.com/search/issues?q=commenter%3A${username}${orgQuery}+updated%3A${startDate}..${endDate}&per_page=100`;
	}
	return fetch(url, { headers });
}

async function githubFetchPullRequests(username, token, startDate, endDate, orgName, repoQueries) {
	return githubFetchReviews(username, token, startDate, endDate, orgName, repoQueries);
}

async function githubFetchCommits(prs, githubToken, startDate, endDate) {
	log(
		'githubFetchCommits called with PRs:',
		prs.map((pr) => pr.number),
		'startDate:',
		startDate,
		'endDate:',
		endDate,
	);
	if (!prs.length) return {};
	const since = new Date(startDate + 'T00:00:00Z').toISOString();
	const until = new Date(endDate + 'T23:59:59Z').toISOString();
	const queries = prs
		.map((pr, idx) => {
			const repoParts = pr.repository_url.split('/');
			const owner = repoParts[repoParts.length - 2];
			const repo = repoParts[repoParts.length - 1];
			return `
		pr${idx}: repository(owner: "${owner}", name: "${repo}") {
			pullRequest(number: ${pr.number}) {
				commits(first: 100) {
					nodes {
						commit {
							messageHeadline
							committedDate
							url
							author {
								name
								user { login }
							}
						}
					}
				}
			}
		}`;
		})
		.join('\n');
	const query = `query { ${queries} }`;
	log('GraphQL query for commits:', query);
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(githubToken ? { Authorization: `bearer ${githubToken}` } : {}),
		},
		body: JSON.stringify({ query }),
	});
	log('githubFetchCommits response status:', res.status);
	const data = await res.json();
	log('githubFetchCommits response data:', data);
	const commitMap = {};
	prs.forEach((pr, idx) => {
		const prData = data.data && data.data[`pr${idx}`] && data.data[`pr${idx}`].pullRequest;
		if (prData && prData.commits && prData.commits.nodes) {
			const allCommits = prData.commits.nodes.map((n) => n.commit);
			log(`PR #${pr.number} allCommits:`, allCommits);
			const filteredCommits = allCommits.filter((commit) => {
				const commitDate = new Date(commit.committedDate);
				const sinceDate = new Date(since);
				const untilDate = new Date(until);
				const isInRange = commitDate >= sinceDate && commitDate <= untilDate;
				log(`PR #${pr.number} commit "${commit.messageHeadline}" (${commit.committedDate}) - in range: ${isInRange}`);
				return isInRange;
			});
			commitMap[pr.number] = filteredCommits;
		} else {
			commitMap[pr.number] = [];
		}
	});
	return commitMap;
}

const sessionMergedStatusCache = {};

async function githubFetchPrMergedStatusREST(owner, repo, number, token) {
	const cacheKey = `${owner}/${repo}#${number}`;
	if (sessionMergedStatusCache[cacheKey] !== undefined) {
		return sessionMergedStatusCache[cacheKey];
	}
	const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
	const headers = { Accept: 'application/vnd.github.v3+json' };
	if (token) {
		headers.Authorization = `token ${token}`;
	}
	try {
		const res = await fetch(url, { headers });
		if (!res.ok) return null;
		const data = await res.json();
		const merged = !!data.merged_at;
		sessionMergedStatusCache[cacheKey] = merged;
		return merged;
	} catch (e) {
		return null;
	}
}

window.githubFetchUser = githubFetchUser;
window.githubFetchIssues = githubFetchIssues;
window.githubFetchReviews = githubFetchReviews;
window.githubFetchPullRequests = githubFetchPullRequests;
window.githubFetchCommits = githubFetchCommits;
window.githubFetchPrMergedStatusREST = githubFetchPrMergedStatusREST;

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('github', {
		hasRepoFilter: true,
		checkTokenForFilter,
		checkTokenForShowCommits,
		checkTokenForMergedPRs,
		triggerRepoFetchIfEnabled,
		debugRepoFetch,
		loadRepos,
		performRepoFetch,
		validateOrgOnBlur,
		fetchUserRepositories,
		fetchPrsMergedStatusBatch,
		forceDataRefresh: forceGithubDataRefresh,
	});
}
