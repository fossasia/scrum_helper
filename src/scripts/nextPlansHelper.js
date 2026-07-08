/* global browser, chrome, DOMPurify */

(function () {
	// 1. Determine repository scope
	async function getRepositoryScope() {
		const result = await browser.storage.local.get(['useRepoFilter', 'selectedRepos']);
		const useRepoFilter = result.useRepoFilter;
		let selectedRepos = result.selectedRepos;
		if (!Array.isArray(selectedRepos)) {
			selectedRepos = [];
		}

		if (useRepoFilter && selectedRepos.length > 0) {
			const repoNames = selectedRepos
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
				type: 'selected',
				repos: repoNames,
				displayText: `Showing issues from: ${repoNames.length} selected repositories`,
			};
		}

		return {
			type: 'all',
			repos: [],
			displayText: 'Showing issues from: All repositories',
		};
	}

	// 2. Generate cache/selection key based on active scope
	function getCacheKey(scope) {
		if (!scope || scope.type === 'all') {
			return 'all';
		}
		const sortedRepos = [...scope.repos].sort();
		return `selected_${sortedRepos.join('_')}`;
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

		const loadingText = chrome.i18n.getMessage('fetchingIssuesSpinner') || 'Fetching your assigned issues...';
		container.innerHTML = `
			<div class="loading-issues">
				<div class="spinner"></div>
				<span>${loadingText}</span>
			</div>
		`;
	}

	function showErrorMessage(message) {
		const container = document.getElementById('assignedIssuesSelector');
		if (!container) return;

		container.style.display = 'block';
		container.classList.remove('hidden');

		container.innerHTML = `
			<div class="empty-message" style="color: #d32f2f;">
				${message}
			</div>
		`;
	}

	function displayIssuesUI(issues, scope) {
		const container = document.getElementById('assignedIssuesSelector');
		if (!container) return;

		container.style.display = 'block';
		container.classList.remove('hidden');

		const selectedIds = getSavedIssueSelections(scope);

		let html = '';
		html += `<div class="scope-info">${scope.displayText}</div>`;

		if (!issues || issues.length === 0) {
			html += `<div class="empty-message">${
				chrome.i18n.getMessage('noIssuesFound') || 'No assigned open issues found'
			}</div>`;
			container.innerHTML = html;
			return;
		}

		issues.forEach((issue) => {
			const isChecked = selectedIds.includes(issue.id) ? 'checked' : '';
			html += `
				<label class="issue-checkbox-label">
					<input type="checkbox" class="issue-item-checkbox" data-issue-id="${issue.id}" ${isChecked} />
					<span>#${issue.number} - ${issue.title} <span style="font-size:10px; color:#888;">(${issue.repository})</span></span>
				</label>
			`;
		});

		container.innerHTML = html;

		// Add event listeners to checkboxes
		const checkboxes = container.querySelectorAll('.issue-item-checkbox');
		checkboxes.forEach((cb) => {
			cb.addEventListener('change', () => {
				const updatedSelectedIds = [];
				container.querySelectorAll('.issue-item-checkbox:checked').forEach((checkedCb) => {
					updatedSelectedIds.push(Number.parseInt(checkedCb.dataset.issueId, 10));
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
			const platformStorage = await browser.storage.local.get(['platform']);
			const platform = platformStorage.platform || 'github';
			const helper = window.PlatformRegistry ? window.PlatformRegistry.get(platform) : null;
			let issues = [];
			if (helper && typeof helper.fetchAssignedIssues === 'function') {
				issues = await helper.fetchAssignedIssues(scope);
			}
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
				return issues.find((issue) => issue.id === id);
			})
			.filter(Boolean);
	}

	// Expose globally
	window.loadAssignedIssues = loadAssignedIssues;
	window.getNextPlansForReport = getNextPlansForReport;
})();
