/* global browser, chrome, DOMPurify */

(function () {
	// 1. Determine repository scope
	async function getRepositoryScope() {
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
		const platformsKey = scope?.platforms ? [...scope.platforms].sort().join('_') : 'github';
		let accountKey = '';
		if (scope?.platforms?.includes('codeberg') && (scope.codebergUsername || scope.codebergApiBaseUrl)) {
			accountKey = `_cb:${scope.codebergUsername || ''}@${scope.codebergApiBaseUrl || ''}`;
		}
		if (!scope || scope.type === 'all') {
			return `${platformsKey}_all${accountKey}`;
		}
		const sortedRepos = [...scope.repos].sort();
		return `${platformsKey}_selected_${sortedRepos.join('_')}${accountKey}`;
	}

	// 3. Cache management
	function cacheIssues(scope, issues) {
		const key = getCacheKey(scope);
		let cache = {};
		try {
			cache = JSON.parse(localStorage.getItem('nextPlansCache') || '{}');
		} catch (e) {}

		cache[key] = {
			issues: issues,
			timestamp: Date.now(),
			ttl: 300000, // 5 minutes
		};
		localStorage.setItem('nextPlansCache', JSON.stringify(cache));
	}

	function getCachedIssues(scope) {
		const key = getCacheKey(scope);
		try {
			const cache = JSON.parse(localStorage.getItem('nextPlansCache') || '{}');
			const cached = cache[key];
			if (cached && Date.now() - cached.timestamp < (cached.ttl || 300000)) {
				return cached.issues;
			}
		} catch (e) {}
		return null;
	}

	// 4. Selection persistence
	function saveSelectedIssues(scope, selectedIds) {
		const key = getCacheKey(scope);
		let selections = {};
		try {
			selections = JSON.parse(localStorage.getItem('selectedIssues') || '{}');
		} catch (e) {}

		selections[key] = selectedIds;
		localStorage.setItem('selectedIssues', JSON.stringify(selections));
	}

	function getSavedIssueSelections(scope) {
		const key = getCacheKey(scope);
		try {
			const selections = JSON.parse(localStorage.getItem('selectedIssues') || '{}');
			return selections[key] || [];
		} catch (e) {}
		return [];
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
	async function loadAssignedIssues() {
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
			const platforms = Array.isArray(storage.selectedPlatforms)
				? storage.selectedPlatforms
				: storage.platform
					? [storage.platform]
					: [];
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

			if (platforms.includes('github') && storage.githubToken?.trim()) {
				const ghHelper = window.PlatformRegistry ? window.PlatformRegistry.get('github') : null;
				if (ghHelper && typeof ghHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(ghHelper.fetchAssignedIssues(getPlatformScope('github')));
				}
			}

			if (platforms.includes('gitlab') && storage.gitlabToken?.trim()) {
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
			const successful = settled.filter((r) => r.status === 'fulfilled');

			if (successful.length === 0) {
				const firstError = settled.find((r) => r.status === 'rejected')?.reason;
				throw firstError || new Error('Failed to fetch assigned issues from all platforms.');
			}

			const issues = successful.flatMap((r) => r.value || []);
			cacheIssues(scope, issues);
			displayIssuesUI(issues, scope);
		} catch (error) {
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

		let issues = [];
		try {
			const cache = JSON.parse(localStorage.getItem('nextPlansCache') || '{}');
			const key = getCacheKey(scope);
			if (cache[key] && cache[key].issues) {
				issues = cache[key].issues;
			}
		} catch (e) {}

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
