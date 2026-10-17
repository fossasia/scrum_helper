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
		for (const platform of scope.platforms.filter((provider) => provider === 'github' || provider === 'gitlab')) {
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
			'codebergUsername',
			'codebergApiBaseUrl',
			'platformUsername',
		]);
		const platforms = Array.isArray(result.selectedPlatforms)
			? result.selectedPlatforms
			: result.platform
				? [result.platform]
				: [];
		const isGitlab = platforms.includes('gitlab');
		const isGithub = platforms.includes('github');
		const isCodeberg = platforms.includes('codeberg');

		const normalizeRepos = (repos) => {
			if (!Array.isArray(repos)) return [];
			return repos
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
		};

		const githubRepos =
			isGithub && result.useRepoFilter && Array.isArray(result.selectedRepos)
				? normalizeRepos(result.selectedRepos)
				: [];
		const hasGithubFilter = isGithub && !!result.useRepoFilter && githubRepos.length > 0;

		const useGitlabFilter =
			typeof result.useGitlabRepoFilter !== 'undefined' ? result.useGitlabRepoFilter : result.useRepoFilter;
		const gitlabRepos =
			isGitlab && useGitlabFilter && Array.isArray(result.selectedGitlabRepos || result.selectedRepos)
				? normalizeRepos(result.selectedGitlabRepos || result.selectedRepos)
				: [];
		const hasGitlabFilter = isGitlab && !!useGitlabFilter && gitlabRepos.length > 0;

		const hasAnyFilter = hasGithubFilter || hasGitlabFilter;
		const allFilterRepos = [...githubRepos, ...gitlabRepos];
		const platform = result.platform || 'github';

		const codebergUser = (
			result.codebergUsername ||
			(result.platform === 'codeberg' ? result.platformUsername : '') ||
			''
		)
			.trim()
			.toLowerCase();
		const codebergBaseUrl = (result.codebergApiBaseUrl || '').trim().toLowerCase().replace(/\/+$/, '');

		let displayText = chrome.i18n.getMessage('showingIssuesFromAll') || 'Showing issues from: All repositories';
		if (hasAnyFilter) {
			const parts = [];
			if (hasGithubFilter) parts.push(`${githubRepos.length} GitHub`);
			if (hasGitlabFilter) parts.push(`${gitlabRepos.length} GitLab`);
			if (isCodeberg) parts.push('all Codeberg');
			displayText = `Showing issues from: ${parts.join(', ')} repositories`;
		}

		return {
			platforms,
			type: hasAnyFilter ? 'selected' : 'all',
			repos: allFilterRepos,
			githubRepos,
			gitlabRepos,
			githubFilter: hasGithubFilter,
			gitlabFilter: hasGitlabFilter,
			platform: platform,
			codebergUsername: codebergUser,
			codebergApiBaseUrl: codebergBaseUrl,
			displayText,
		};
	}

	// 2. Generate cache/selection key based on active scope
	function getCacheKey(scope) {
		const platforms = scope?.platforms ? [...scope.platforms].sort() : ['github'];
		const accounts = platforms
			.filter((platform) => platform === 'github' || platform === 'gitlab')
			.map((platform) => {
				const account = scope.accounts[platform];
				return [platform, account.username.toLowerCase(), account.apiBaseUrl, account.fingerprint];
			});
		const platformsKey =
			accounts.length > 0 ? `${platforms.join('_')}_accounts_${JSON.stringify(accounts)}` : platforms.join('_');
		let accountKey = '';
		if (scope?.platforms?.includes('codeberg') && (scope.codebergUsername || scope.codebergApiBaseUrl)) {
			accountKey = `_cb:${scope.codebergUsername || ''}@${scope.codebergApiBaseUrl || ''}`;
		}
		if (!scope || scope.type === 'all') {
			return `${platformsKey}_all${accountKey}`;
		}
		const gh = scope.githubFilter ? `_gh:${[...(scope.githubRepos || [])].sort().join(',')}` : '';
		const gl = scope.gitlabFilter ? `_gl:${[...(scope.gitlabRepos || [])].sort().join(',')}` : '';
		return `${platformsKey}_selected${gh}${gl}${accountKey}`;
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

	function getIssueSelectionId(issue) {
		const platform = issue.platform || issue._platform || 'codeberg';
		return `${platform}:${issue.id}`;
	}

	function isIssueSelected(selectedIds, issues, issue) {
		const selectionId = getIssueSelectionId(issue);
		if (selectedIds.some((id) => String(id) === selectionId)) {
			return true;
		}
		const matchingIssues = issues.filter((candidate) => String(candidate.id) === String(issue.id));
		return matchingIssues.length === 1 && selectedIds.some((id) => String(id) === String(issue.id));
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
			checkbox.dataset.issueId = getIssueSelectionId(issue);
			if (isIssueSelected(selectedIds, issues, issue)) {
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
			const storage = await browser.storage.local.get([
				'platform',
				'selectedPlatforms',
				'githubToken',
				'gitlabToken',
				'codebergToken',
			]);
			const platforms = scope.platforms;
			const getPlatformScope = (p) => {
				if (p === 'github') {
					return {
						...scope,
						platform: 'github',
						type: scope.githubFilter ? 'selected' : 'all',
						repos: scope.githubRepos || [],
					};
				}
				if (p === 'gitlab') {
					return {
						...scope,
						platform: 'gitlab',
						type: scope.gitlabFilter ? 'selected' : 'all',
						repos: scope.gitlabRepos || [],
					};
				}
				if (p === 'codeberg') {
					return {
						...scope,
						platform: 'codeberg',
						type: 'all',
						repos: [],
					};
				}
				return scope;
			};

			const fetchPromises = [];

			if (platforms.includes('github') && scope.accounts.github.token.trim()) {
				const ghHelper = window.PlatformRegistry ? window.PlatformRegistry.get('github') : null;
				if (ghHelper && typeof ghHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(ghHelper.fetchAssignedIssues(getPlatformScope('github')));
				}
			}

			if (platforms.includes('gitlab') && scope.accounts.gitlab.token.trim()) {
				const glHelper = window.PlatformRegistry ? window.PlatformRegistry.get('gitlab') : null;
				if (glHelper && typeof glHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(glHelper.fetchAssignedIssues(getPlatformScope('gitlab')));
				}
			}

			if (platforms.includes('codeberg') && storage.codebergToken?.trim()) {
				const cbHelper = window.PlatformRegistry ? window.PlatformRegistry.get('codeberg') : null;
				if (cbHelper && typeof cbHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(cbHelper.fetchAssignedIssues(getPlatformScope('codeberg')));
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
			if (load !== latestLoad) return;
			if (getCacheKey(currentScope) !== getCacheKey(scope)) return loadAssignedIssues();
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
			if (load !== latestLoad || !currentScope) return;
			if (getCacheKey(currentScope) !== getCacheKey(scope)) return loadAssignedIssues();
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
				const selectionId = String(id);
				const match = issues.find((issue) => getIssueSelectionId(issue) === selectionId);
				if (match) return match;
				const legacyMatches = issues.filter((issue) => String(issue.id) === selectionId);
				return legacyMatches.length === 1 ? legacyMatches[0] : undefined;
			})
			.filter(Boolean);
	}

	// Expose globally
	window.loadAssignedIssues = loadAssignedIssues;
	window.getNextPlansForReport = getNextPlansForReport;
})();
