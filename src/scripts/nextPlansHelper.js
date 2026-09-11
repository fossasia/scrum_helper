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
		]);
		const platforms = result.selectedPlatforms || [result.platform || 'github'];
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
		const platformsKey = scope?.platforms ? [...scope.platforms].sort().join('_') : 'github';
		if (!scope || scope.type === 'all') {
			return `${platformsKey}_all`;
		}
		const sortedRepos = [...scope.repos].sort();
		return `${platformsKey}_selected_${sortedRepos.join('_')}`;
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
			const storage = await browser.storage.local.get(['platform', 'selectedPlatforms', 'githubToken', 'gitlabToken']);
			const platforms = storage.selectedPlatforms || [storage.platform || 'github'];
			const fetchPromises = [];

			if (platforms.includes('github') && storage.githubToken?.trim()) {
				const ghHelper = window.PlatformRegistry ? window.PlatformRegistry.get('github') : null;
				if (ghHelper && typeof ghHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(
						ghHelper.fetchAssignedIssues(scope).catch((err) => {
							console.error('[NextPlans] GitHub issues fetch failed:', err);
							return [];
						}),
					);
				}
			}

			if (platforms.includes('gitlab') && storage.gitlabToken?.trim()) {
				const glHelper = window.PlatformRegistry ? window.PlatformRegistry.get('gitlab') : null;
				if (glHelper && typeof glHelper.fetchAssignedIssues === 'function') {
					fetchPromises.push(
						glHelper.fetchAssignedIssues(scope).catch((err) => {
							console.error('[NextPlans] GitLab issues fetch failed:', err);
							return [];
						}),
					);
				}
			}

			const results = await Promise.all(fetchPromises);
			const issues = results.flat();

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
				return issues.find((issue) => String(issue.id) === String(id));
			})
			.filter(Boolean);
	}

	// Expose globally
	window.loadAssignedIssues = loadAssignedIssues;
	window.getNextPlansForReport = getNextPlansForReport;
})();
