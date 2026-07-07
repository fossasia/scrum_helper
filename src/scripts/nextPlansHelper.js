/* global browser, chrome, DOMPurify */

(function () {
	// Helper to sanitize HTML URLs
	function sanitizeUrl(url) {
		if (!url) return '';
		try {
			const parsed = new URL(url);
			if (parsed.protocol === 'https:' && parsed.hostname === 'github.com') {
				return url;
			}
		} catch (e) {}
		return '';
	}

	// Helper to escape basic text to prevent XSS
	function sanitizeText(text) {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

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

	// 5. Fetch issues from GitHub API
	async function fetchIssuesFromGitHub(scope) {
		const storage = await browser.storage.local.get(['platform', 'githubUsername', 'githubToken', 'platformUsername']);
		const platform = storage.platform || 'github';
		const username = storage.githubUsername || (platform === 'github' ? storage.platformUsername : '');
		const token = storage.githubToken;

		if (!username) {
			throw new Error('GitHub username is required. Please set it in settings.');
		}
		if (!token) {
			throw new Error('GitHub token is required. Please set it in settings.');
		}

		let query = `assignee:${username}+state:open+type:issue`;

		if (scope.type === 'selected' && scope.repos.length > 0) {
			const repoQueries = scope.repos.map((repo) => `repo:${repo}`).join('+');
			query += `+${repoQueries}`;
		}

		let page = 1;
		let allIssues = [];
		let hasMore = true;

		const headers = {
			Accept: 'application/vnd.github.v3+json',
			Authorization: `token ${token}`,
		};

		while (hasMore && page <= 10) {
			const url = `https://api.github.com/search/issues?q=${query}&per_page=100&page=${page}`;
			console.log(`[NextPlans] Fetching page ${page}: ${url}`);
			const response = await fetch(url, { headers });
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const message = errorData.message || response.statusText;
				throw new Error(`GitHub API error: ${message}`);
			}

			const data = await response.json();
			const items = data.items || [];
			allIssues = allIssues.concat(items);

			if (items.length < 100) {
				hasMore = false;
			} else {
				page++;
			}
		}

		return allIssues
			.map((issue) => {
				const repoUrl = issue.repository_url || '';
				const repoParts = repoUrl.split('/');
				const repoName = repoParts.slice(-2).join('/'); // owner/repo

				return {
					id: issue.id,
					number: Number.parseInt(issue.number, 10),
					title: sanitizeText(issue.title),
					html_url: sanitizeUrl(issue.html_url),
					repository: repoName,
					state: issue.state,
				};
			})
			.filter((issue) => !Number.isNaN(issue.number) && issue.html_url.startsWith('https://github.com/'));
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
			const issues = await fetchIssuesFromGitHub(scope);
			cacheIssues(scope, issues);
			displayIssuesUI(issues, scope);
		} catch (error) {
			console.error('[NextPlans] Failed to load issues:', error);
			let userMsg = chrome.i18n.getMessage('failedToFetchIssues') || 'Failed to fetch assigned issues.';
			if (error.message.includes('username is required') || error.message.includes('token is required')) {
				userMsg =
					chrome.i18n.getMessage('githubTokenRequiredNextPlans') ||
					'A GitHub token is required to fetch assigned open issues. Please add one in settings.';
			} else {
				userMsg += ` (${error.message})`;
			}
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
