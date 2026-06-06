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

			const repoCacheKey = `repos-${username}-${items.orgName || ''}`;
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
		const repoCacheKey = `repos-${username}-${storageItems.orgName || ''}`;
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
	});
}
