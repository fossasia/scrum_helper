/* global browser, chrome, DOMPurify */

(function () {
	const fingerprints = new Map();
	const pageId = Math.random().toString(36).slice(2);
	async function getAccountFingerprint(token) {
		if (!token) return 'noauth';
		if (!fingerprints.has(token)) {
			const pageKey = `page-${pageId}-${fingerprints.size}`;
			const fingerprint = (async () => {
				try {
					if (globalThis.crypto?.subtle) {
						const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
						return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
					}
				} catch {}
				// Limit reuse to this page when a persistent credential fingerprint is unavailable.
				return pageKey;
			})();
			fingerprints.set(token, fingerprint);
		}
		return fingerprints.get(token);
	}

	async function getRepositoryScope() {
		const scope = await getRepositoryFilterScope();
		const settings = await browser.storage.local.get([
			'platform',
			'platformUsername',
			'githubUsername',
			'githubToken',
			'gitlabUsername',
			'gitlabToken',
			'gitlabBaseUrl',
		]);
		const accounts = {};
		for (const platform of scope.platforms) {
			const username =
				settings[`${platform}Username`] ||
				(platform === (settings.platform || 'github') ? settings.platformUsername : '') ||
				'';
			const token = settings[`${platform}Token`] || '';
			const fingerprint = await getAccountFingerprint(token);
			const apiBaseUrl =
				platform === 'gitlab'
					? (settings.gitlabBaseUrl?.trim() || 'https://gitlab.com/api/v4').replace(/\/+$/, '')
					: 'https://api.github.com';
			accounts[platform] = { username: username.trim(), token, fingerprint, apiBaseUrl };
		}
		return { ...scope, accounts };
	}

	// 1. Determine repository scope
	async function getRepositoryFilterScope() {
		const result = await browser.storage.local.get([
			'useRepoFilter',
			'selectedRepos',
			'useGitlabRepoFilter',
			'selectedGitlabRepos',
			'platform',
			'selectedPlatforms',
		]);
		const platforms = Array.isArray(result.selectedPlatforms)
			? result.selectedPlatforms
			: result.platform
				? [result.platform]
				: [];
		const isGitlab = platforms.includes('gitlab');
		const isGithub = platforms.includes('github');

		const filterRepos = [];
		if (isGithub && result.useRepoFilter && Array.isArray(result.selectedRepos)) {
			filterRepos.push(...result.selectedRepos);
		}
		if (
			isGitlab &&
			(typeof result.useGitlabRepoFilter !== 'undefined' ? result.useGitlabRepoFilter : result.useRepoFilter) &&
			Array.isArray(result.selectedGitlabRepos || result.selectedRepos)
		) {
			filterRepos.push(...(result.selectedGitlabRepos || result.selectedRepos));
		}

		const hasFilter =
			(isGithub && result.useRepoFilter) ||
			(isGitlab &&
				(typeof result.useGitlabRepoFilter !== 'undefined' ? result.useGitlabRepoFilter : result.useRepoFilter));

		if (hasFilter && filterRepos.length > 0) {
			const repoNames = filterRepos
				.map((repo) => {
					if (typeof repo === 'object' && repo.fullName) {
						return repo.fullName.startsWith('/') ? repo.fullName.substring(1) : repo.fullName;
					}
					if (typeof repo === 'string') {
						return repo.startsWith('/') ? repo.substring(1) : repo;
					}
					return repo;
				})
				.filter(Boolean);

			return {
				platforms,
				type: 'selected',
				repos: repoNames,
				displayText: `Showing issues from: ${repoNames.length} selected repositories`,
			};
		}

		return {
			platforms,
			type: 'all',
			repos: [],
			displayText: 'Showing issues from: All repositories',
		};
	}

	// 2. Generate cache/selection key based on active scope
	function getCacheKey(scope) {
		const platforms = scope?.platforms ? [...scope.platforms].sort() : ['github'];
		const accounts = platforms.map((platform) => {
			const account = scope.accounts[platform];
			return [platform, account.username.toLowerCase(), account.apiBaseUrl, account.fingerprint];
		});
		const platformsKey = `${platforms.join('_')}_accounts_${JSON.stringify(accounts)}`;
		if (!scope || scope.type === 'all') {
			return `${platformsKey}_all`;
		}
		const sortedRepos = [...scope.repos].sort();
		return `${platformsKey}_selected_${sortedRepos.join('_')}`;
	}

	const maxSavedScopes = 20;
	const fallbackIssues = new Map();
	const fallbackSelections = new Map();

	function readStoredRecord(name) {
		try {
			const value = JSON.parse(localStorage.getItem(name) || '{}');
			return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
		} catch {
			return {};
		}
	}

	function rememberFallback(records, key, value) {
		records.delete(key);
		records.set(key, value);
		while (records.size > maxSavedScopes) records.delete(records.keys().next().value);
	}

	// 3. Cache management
	function cacheIssues(scope, issues, ttl = 300000) {
		const key = getCacheKey(scope);
		const now = Date.now();
		const entry = { issues, timestamp: now, ttl };
		const recent = Object.entries(readStoredRecord('nextPlansCache'))
			.filter(
				([oldKey, value]) =>
					oldKey !== key && value && now >= value.timestamp && now - value.timestamp < (value.ttl ?? 300000),
			)
			.sort((a, b) => b[1].timestamp - a[1].timestamp)
			.slice(0, maxSavedScopes - 1);
		const cache = Object.fromEntries([[key, entry], ...recent]);
		try {
			localStorage.setItem('nextPlansCache', JSON.stringify(cache));
			fallbackIssues.delete(key);
		} catch {
			rememberFallback(fallbackIssues, key, entry);
		}
	}

	function getCachedIssues(scope) {
		const key = getCacheKey(scope);
		const cached = fallbackIssues.get(key) || readStoredRecord('nextPlansCache')[key];
		return cached && Date.now() - cached.timestamp < (cached.ttl ?? 300000) ? cached.issues : null;
	}

	// 4. Selection persistence
	function saveSelectedIssues(scope, selectedIds) {
		const key = getCacheKey(scope);
		const previous = Object.entries(readStoredRecord('selectedIssues')).filter(([oldKey]) => oldKey !== key);
		const selections = Object.fromEntries([[key, selectedIds], ...previous.slice(0, maxSavedScopes - 1)]);
		try {
			localStorage.setItem('selectedIssues', JSON.stringify(selections));
			fallbackSelections.delete(key);
		} catch {
			rememberFallback(fallbackSelections, key, selectedIds);
		}
	}

	function getSavedIssueSelections(scope) {
		const key = getCacheKey(scope);
		const selections = fallbackSelections.get(key) || readStoredRecord('selectedIssues')[key];
		return Array.isArray(selections) ? selections : [];
	}

	// 6. UI Render Helpers
	function showLoadingState() {
		const container = document.getElementById('assignedIssuesSelector');
		if (!container) return;

		container.style.display = 'block';
		container.classList.remove('hidden');

		container.textContent = '';

		const wrapper = document.createElement('div');
		wrapper.classList.add('loading-issues');

		const spinner = document.createElement('div');
		spinner.classList.add('spinner');

		const span = document.createElement('span');
		span.textContent = chrome.i18n.getMessage('fetchingIssuesSpinner') || 'Fetching your assigned issues...';

		wrapper.appendChild(spinner);
		wrapper.appendChild(span);
		container.appendChild(wrapper);
	}

	function showErrorMessage(message) {
		const container = document.getElementById('assignedIssuesSelector');
		if (!container) return;

		container.style.display = 'block';
		container.classList.remove('hidden');

		container.textContent = '';

		const wrapper = document.createElement('div');
		wrapper.classList.add('empty-message');
		wrapper.style.color = '#d32f2f';
		wrapper.textContent = message;

		container.appendChild(wrapper);
	}

	function displayIssuesUI(issues, scope) {
		const container = document.getElementById('assignedIssuesSelector');
		if (!container) return;

		container.style.display = 'block';
		container.classList.remove('hidden');

		container.textContent = '';

		const selectedIds = getSavedIssueSelections(scope);

		const scopeDiv = document.createElement('div');
		scopeDiv.classList.add('scope-info');
		scopeDiv.textContent = scope.displayText;
		container.appendChild(scopeDiv);

		if (!issues || issues.length === 0) {
			const emptyDiv = document.createElement('div');
			emptyDiv.classList.add('empty-message');
			emptyDiv.textContent = chrome.i18n.getMessage('noIssuesFound') || 'No assigned open issues found';
			container.appendChild(emptyDiv);
			return;
		}

		issues.forEach((issue) => {
			const label = document.createElement('label');
			label.classList.add('issue-checkbox-label');

			const checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.classList.add('issue-item-checkbox');
			checkbox.dataset.issueId = issue.id;
			if (selectedIds.some((id) => String(id) === String(issue.id))) {
				checkbox.checked = true;
			}

			const span = document.createElement('span');
			span.textContent = `#${issue.number} - ${issue.title} `;

			const repoSpan = document.createElement('span');
			repoSpan.style.fontSize = '10px';
			repoSpan.style.color = '#888';
			repoSpan.textContent = `(${issue.repository})`;

			span.appendChild(repoSpan);

			label.appendChild(checkbox);
			label.appendChild(span);
			container.appendChild(label);
		});

		// Add event listeners to checkboxes
		const checkboxes = container.querySelectorAll('.issue-item-checkbox');
		checkboxes.forEach((cb) => {
			cb.addEventListener('change', () => {
				const updatedSelectedIds = [];
				container.querySelectorAll('.issue-item-checkbox:checked').forEach((checkedCb) => {
					updatedSelectedIds.push(checkedCb.dataset.issueId);
				});
				saveSelectedIssues(scope, updatedSelectedIds);
			});
		});
	}

	// 7. Load assigned issues
	let latestLoad = 0;
	async function loadAssignedIssues() {
		const load = ++latestLoad;
		const includeNextPlansCheckbox = document.getElementById('includeNextPlans');
		if (!includeNextPlansCheckbox || !includeNextPlansCheckbox.checked) {
			const container = document.getElementById('assignedIssuesSelector');
			if (container) {
				container.style.display = 'none';
				container.classList.add('hidden');
			}
			return;
		}

		const scope = await getRepositoryScope();
		if (load !== latestLoad) return;
		const cached = getCachedIssues(scope);

		if (cached) {
			console.log('[NextPlans] Using cached assigned issues for scope:', getCacheKey(scope));
			displayIssuesUI(cached, scope);
			return;
		}

		showLoadingState();

		try {
			const platforms = scope.platforms;
			const fetchPromises = [];

			if (platforms.includes('github') && scope.accounts.github.token.trim()) {
				const ghHelper = window.PlatformRegistry ? window.PlatformRegistry.get('github') : null;
				if (ghHelper && typeof ghHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(ghHelper.fetchAssignedIssues(scope));
				}
			}

			if (platforms.includes('gitlab') && scope.accounts.gitlab.token.trim()) {
				const glHelper = window.PlatformRegistry ? window.PlatformRegistry.get('gitlab') : null;
				if (glHelper && typeof glHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(glHelper.fetchAssignedIssues(scope));
				}
			}

			if (fetchPromises.length === 0) {
				const container = document.getElementById('assignedIssuesSelector');
				if (container) {
					container.style.display = 'none';
					container.classList.add('hidden');
				}
				return;
			}

			const settled = await Promise.allSettled(fetchPromises);
			const currentScope = await getRepositoryScope();
			if (load !== latestLoad || getCacheKey(currentScope) !== getCacheKey(scope)) return;
			const successful = settled.filter((r) => r.status === 'fulfilled');

			if (successful.length === 0) {
				const firstError = settled.find((r) => r.status === 'rejected')?.reason;
				throw firstError || new Error('Failed to fetch assigned issues from all platforms.');
			}

			const issues = successful.flatMap((r) => r.value || []);
			cacheIssues(scope, issues, successful.length === fetchPromises.length ? 300000 : 0);
			displayIssuesUI(issues, scope);
		} catch (error) {
			if (load !== latestLoad) return;
			const currentScope = await getRepositoryScope().catch(() => null);
			if (load !== latestLoad || !currentScope || getCacheKey(currentScope) !== getCacheKey(scope)) return;
			console.error('[NextPlans] Failed to load issues:', error);
			if (error.message.includes('username is required') || error.message.includes('token is required')) {
				const container = document.getElementById('assignedIssuesSelector');
				if (container) {
					container.style.display = 'none';
					container.classList.add('hidden');
				}
				return;
			}
			let userMsg = chrome.i18n.getMessage('failedToFetchIssues') || 'Failed to fetch assigned issues.';
			userMsg += ` (${error.message})`;
			showErrorMessage(userMsg);
		}
	}

	// 8. Report integration helper
	async function getNextPlansForReport() {
		const scope = await getRepositoryScope();
		const selectedIds = getSavedIssueSelections(scope);
		if (!selectedIds || selectedIds.length === 0) {
			return [];
		}

		const key = getCacheKey(scope);
		const cached = fallbackIssues.get(key) || readStoredRecord('nextPlansCache')[key];
		const issues = cached?.issues || [];

		// Map selectedIds to full issue objects
		return selectedIds
			.map((id) => {
				return issues.find((issue) => String(issue.id) === String(id));
			})
			.filter(Boolean);
	}

	// Expose globally
	window.loadAssignedIssues = loadAssignedIssues;
	window.getNextPlansForReport = getNextPlansForReport;
})();
