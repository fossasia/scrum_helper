// GitLab API Helper for Scrum Helper Extension
const DEFAULT_GITLAB_API_BASE_URL = 'https://gitlab.com/api/v4';

function normalizeGitLabApiBaseUrl(apiBaseUrl) {
	const value = typeof apiBaseUrl === 'string' && apiBaseUrl.trim() ? apiBaseUrl.trim() : DEFAULT_GITLAB_API_BASE_URL;
	return value.replace(/\/+$/, '');
}

class GitLabHelper {
	constructor(apiBaseUrl = DEFAULT_GITLAB_API_BASE_URL) {
		this.baseUrl = normalizeGitLabApiBaseUrl(apiBaseUrl);
		this.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000, // 10 minutes
			fetching: false,
			queue: [],
		};
	}

	async getCacheTTL() {
		try {
			const items = await browser.storage.local.get(['cacheInput']);
			const ttl = items.cacheInput ? Number.parseInt(items.cacheInput, 10) * 60 * 1000 : 10 * 60 * 1000;
			return ttl;
		} catch (error) {
			console.error('Error getting cache TTL:', error);
			return 10 * 60 * 1000;
		}
	}

	async saveToStorage(data) {
		try {
			await browser.storage.local.set({
				gitlabCache: {
					data: data,
					cacheKey: this.cache.cacheKey,
					timestamp: this.cache.timestamp,
				},
			});
		} catch (error) {
			console.error('Error saving to storage:', error);
		}
	}

	async loadFromStorage() {
		try {
			const items = await browser.storage.local.get(['gitlabCache']);
			if (items.gitlabCache) {
				this.cache.data = items.gitlabCache.data;
				this.cache.cacheKey = items.gitlabCache.cacheKey;
				this.cache.timestamp = items.gitlabCache.timestamp;
			}
		} catch (error) {
			console.error('Error loading from storage:', error);
		}
	}

	async fetchGitLabData(username, startDate, endDate, token = null, orgName = '') {
		// Include token state and orgName in cache key to invalidate when auth or org changes
		const tokenMarker = token ? 'auth' : 'noauth';
		const orgMarker = orgName ? `org-${orgName}` : 'noorg';
		const cacheKey = `${this.baseUrl}-${username}-${startDate}-${endDate}-${tokenMarker}-${orgMarker}`;

		// Check if we need to load from storage
		if (!this.cache.data && !this.cache.fetching) {
			await this.loadFromStorage();
		}

		const currentTTL = await this.getCacheTTL();
		this.cache.ttl = currentTTL;

		const now = Date.now();
		const isCacheFresh = now - this.cache.timestamp < this.cache.ttl;
		const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

		if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
			return this.cache.data;
		}

		if (!isCacheKeyMatch) {
			this.cache.data = null;
		}

		if (this.cache.fetching) {
			return new Promise((resolve, reject) => {
				this.cache.queue.push({ resolve, reject });
			});
		}

		this.cache.fetching = true;
		this.cache.cacheKey = cacheKey;

		// Build headers with optional token
		const headers = {};
		if (token) {
			headers['PRIVATE-TOKEN'] = token;
		}

		try {
			// Throttling 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			if (orgName) {
				// Verify group existence
				const groupUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}`;
				const groupRes = await fetch(groupUrl, { headers });
				if (!groupRes.ok) {
					if (groupRes.status === 404) {
						throw new Error('Organization not found');
					}
					throw new Error(`Error fetching GitLab group: ${groupRes.status} ${groupRes.statusText}`);
				}

				// Fetch group projects for project mapping (including subgroups)
				const groupProjectsUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}/projects?per_page=100&include_subgroups=true`;
				const groupProjectsRes = await fetch(groupProjectsUrl, { headers });
				const allProjects = groupProjectsRes.ok ? await groupProjectsRes.json() : [];

				// Fetch group merge requests
				const groupMRsUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}/merge_requests?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
				const groupMRsRes = await fetch(groupMRsUrl, { headers });
				const allMergeRequests = groupMRsRes.ok ? await groupMRsRes.json() : [];

				// Fetch group issues
				const groupIssuesUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}/issues?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
				const groupIssuesRes = await fetch(groupIssuesUrl, { headers });
				const allIssues = groupIssuesRes.ok ? await groupIssuesRes.json() : [];

				// Fetch user info for header mapping
				const userUrl = `${this.baseUrl}/users?username=${encodeURIComponent(username)}`;
				const userRes = await fetch(userUrl, { headers });
				let user = null;
				if (userRes.ok) {
					const users = await userRes.json();
					if (users.length > 0) {
						user = users[0];
					}
				}

				const gitlabData = {
					user: user || { username },
					projects: allProjects,
					mergeRequests: allMergeRequests,
					issues: allIssues,
					comments: [],
				};

				this.cache.data = gitlabData;
				this.cache.timestamp = Date.now();

				await this.saveToStorage(gitlabData);

				this.cache.queue.forEach(({ resolve }) => {
					resolve(gitlabData);
				});
				this.cache.queue = [];

				return gitlabData;
			} else {
				// Get user info first
				const userUrl = `${this.baseUrl}/users?username=${username}`;
				const userRes = await fetch(userUrl, { headers });
				if (!userRes.ok) {
					throw new Error(
						chrome?.i18n.getMessage('gitlabUserFetchError', [userRes.status, userRes.statusText]) ||
							`Error fetching GitLab user: ${userRes.status} ${userRes.statusText}`,
					);
				}
				const users = await userRes.json();
				if (users.length === 0) {
					throw new Error(
						chrome?.i18n.getMessage('gitlabUserNotFoundError', [username]) || `GitLab user '${username}' not found`,
					);
				}
				const userId = users[0].id;

				// Fetch all projects the user is a member of (including group projects)
				const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
				const membershipProjectsRes = await fetch(membershipProjectsUrl, { headers });
				if (!membershipProjectsRes.ok) {
					throw new Error(
						chrome?.i18n.getMessage('gitlabMembershipError', [
							membershipProjectsRes.status,
							membershipProjectsRes.statusText,
						]) ||
							`Error fetching GitLab membership projects: ${membershipProjectsRes.status} ${membershipProjectsRes.statusText}`,
					);
				}
				const membershipProjects = await membershipProjectsRes.json();

				// Fetch all projects the user has contributed to (public, group, etc.)
				const contributedProjectsUrl = `${this.baseUrl}/users/${userId}/contributed_projects?per_page=100&order_by=updated_at&sort=desc`;
				const contributedProjectsRes = await fetch(contributedProjectsUrl, { headers });
				if (!contributedProjectsRes.ok) {
					throw new Error(
						chrome?.i18n.getMessage('gitlabContributedError', [
							contributedProjectsRes.status,
							contributedProjectsRes.statusText,
						]) ||
							`Error fetching GitLab contributed projects: ${contributedProjectsRes.status} ${contributedProjectsRes.statusText}`,
					);
				}
				const contributedProjects = await contributedProjectsRes.json();

				// Merge and deduplicate projects by project id
				const allProjectsMap = new Map();
				for (const p of [...membershipProjects, ...contributedProjects]) {
					allProjectsMap.set(p.id, p);
				}
				const allProjects = Array.from(allProjectsMap.values());

				// Fetch merge requests from each project (works without auth for public projects)
				let allMergeRequests = [];
				for (const project of allProjects) {
					try {
						const projectMRsUrl = `${this.baseUrl}/projects/${project.id}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
						const projectMRsRes = await fetch(projectMRsUrl, { headers });
						if (projectMRsRes.ok) {
							const projectMRs = await projectMRsRes.json();
							allMergeRequests = allMergeRequests.concat(projectMRs);
						}
						// Add small delay to avoid rate limiting
						await new Promise((resolve) => setTimeout(resolve, 100));
					} catch (error) {
						console.error(`Error fetching MRs for project ${project.name}:`, error);
						// Continue with other projects
					}
				}

				// Fetch issues from each project (works without auth for public projects)
				let allIssues = [];
				for (const project of allProjects) {
					try {
						const projectIssuesUrl = `${this.baseUrl}/projects/${project.id}/issues?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
						const projectIssuesRes = await fetch(projectIssuesUrl, { headers });
						if (projectIssuesRes.ok) {
							const projectIssues = await projectIssuesRes.json();
							allIssues = allIssues.concat(projectIssues);
						}
						// Add small delay to avoid rate limiting
						await new Promise((resolve) => setTimeout(resolve, 100));
					} catch (error) {
						console.error(`Error fetching issues for project ${project.name}:`, error);
						// Continue with other projects
					}
				}

				const gitlabData = {
					user: users[0],
					projects: allProjects,
					mergeRequests: allMergeRequests, // use project-by-project response
					issues: allIssues, // use project-by-project response
					comments: [], // Empty array since we're not fetching comments
				};
				// Cache the data
				this.cache.data = gitlabData;
				this.cache.timestamp = Date.now();

				await this.saveToStorage(gitlabData);

				// Resolve queued calls
				this.cache.queue.forEach(({ resolve }) => {
					resolve(gitlabData);
				});
				this.cache.queue = [];

				return gitlabData;
			}
		} catch (err) {
			console.error('GitLab Fetch Failed:', err);
			// Reject queued calls on error
			this.cache.queue.forEach(({ reject }) => {
				reject(err);
			});
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	async getDetailedMergeRequests(mergeRequests, token = null) {
		const headers = {};
		if (token) {
			headers['PRIVATE-TOKEN'] = token;
		}
		const detailed = [];
		for (const mr of mergeRequests) {
			try {
				const url = `${this.baseUrl}/projects/${mr.project_id}/merge_requests/${mr.iid}`;
				const res = await fetch(url, { headers });
				if (res.ok) {
					const detailedMr = await res.json();
					detailed.push(detailedMr);
				}
				// Add small delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`[GITLAB-DEBUG] Error fetching detailed MR ${mr.iid}:`, error);
				detailed.push(mr); // Use basic data if detailed fetch fails
			}
		}
		return detailed;
	}

	async getDetailedIssues(issues, token = null) {
		const headers = {};
		if (token) {
			headers['PRIVATE-TOKEN'] = token;
		}
		const detailed = [];
		for (const issue of issues) {
			try {
				const url = `${this.baseUrl}/projects/${issue.project_id}/issues/${issue.iid}`;
				const res = await fetch(url, { headers });
				if (res.ok) {
					const detailedIssue = await res.json();
					detailed.push(detailedIssue);
				}
				// Add small delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error) {
				console.error(`[GITLAB-DEBUG] Error fetching detailed issue ${issue.iid}:`, error);
				detailed.push(issue); // Use basic data if detailed fetch fails
			}
		}
		return detailed;
	}

	formatDate(dateString) {
		const date = new Date(dateString);
		const options = { day: '2-digit', month: 'short', year: 'numeric' };
		return date.toLocaleDateString('en-US', options);
	}

	processGitLabData(data) {
		const processed = {
			mergeRequests: data.mergeRequests || [],
			issues: data.issues || [],
			comments: data.comments || [],
			user: data.user,
		};

		return processed;
	}

	mapGitLabReportItem(item, projectById, type) {
		const project = projectById.get(item.project_id);
		let repoName = project ? project.name : 'unknown';

		if (repoName === 'unknown' && item.web_url) {
			try {
				let projectPath = item.web_url.split('/-/')[0];
				if (projectPath.includes('/issues/')) {
					projectPath = projectPath.split('/issues/')[0];
				} else if (projectPath.includes('/merge_requests/')) {
					projectPath = projectPath.split('/merge_requests/')[0];
				}
				const pathParts = projectPath.split('/');
				if (pathParts.length > 0) {
					repoName = pathParts[pathParts.length - 1];
				}
			} catch (e) {
				console.error('Error parsing project name from web_url:', e);
			}
		}

		return {
			...item,
			repository_url:
				project && project.path_with_namespace
					? project.path_with_namespace
					: `${this.baseUrl}/projects/${item.project_id}`,
			html_url:
				type === 'issue'
					? item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : '')
					: item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : ''),
			number: item.iid,
			title: item.title,
			state: type === 'issue' && item.state === 'opened' ? 'open' : item.state,
			project: repoName,
			pull_request: type === 'mr',
		};
	}

	mapGitLabReportData(data) {
		const projects = Array.isArray(data.projects) ? data.projects : [];
		const projectById = new Map(projects.map((project) => [project.id, project]));
		const mappedIssues = (data.issues || []).map((issue) => this.mapGitLabReportItem(issue, projectById, 'issue'));
		const mappedMRs = (data.mergeRequests || data.mrs || []).map((mr) =>
			this.mapGitLabReportItem(mr, projectById, 'mr'),
		);

		return {
			githubIssuesData: { items: mappedIssues },
			githubPrsReviewData: { items: mappedMRs },
			githubUserData: data.user || {},
		};
	}
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GitLabHelper;
} else {
	window.GitLabHelper = GitLabHelper;
}

async function forceGitlabDataRefresh() {
	// Clear in-memory cache if gitlabHelper is loaded
	if (window.GitLabHelper && window.gitlabHelper instanceof window.GitLabHelper) {
		window.gitlabHelper.cache.data = null;
		window.gitlabHelper.cache.cacheKey = null;
		window.gitlabHelper.cache.timestamp = 0;
		window.gitlabHelper.cache.fetching = false;
		window.gitlabHelper.cache.queue = [];
	}
	await new Promise((resolve) => {
		chrome.storage.local.remove('gitlabCache', resolve);
	});
	window.hasInjectedContent = false;
	// Re-instantiate gitlabHelper to ensure a fresh instance for next API call
	if (window.GitLabHelper) {
		window.gitlabHelper = new window.GitLabHelper(window.gitlabBaseUrl);
	}
	return { success: true };
}

window['forceGitlabDataRefresh'] = forceGitlabDataRefresh;

function checkTokenForFilter() {
	const gitlabTokenInput = document.getElementById('gitlabToken');

	const tokenWarningForFilter = document.getElementById('tokenWarningForFilter');

	const useRepoFilter = document.getElementById('useRepoFilter');

	if (gitlabTokenInput && tokenWarningForFilter && useRepoFilter) {
		const hasToken = gitlabTokenInput.value.trim() !== '';

		if (!hasToken && useRepoFilter.checked) {
			useRepoFilter.checked = false;

			const repoFilterContainer = document.getElementById('repoFilterContainer');

			if (repoFilterContainer) {
				repoFilterContainer.classList.add('hidden');
			}

			tokenWarningForFilter.classList.remove('hidden');

			const spanElement = tokenWarningForFilter.querySelector('span');

			if (spanElement) {
				spanElement.textContent =
					chrome?.i18n.getMessage('gitlabTokenRequiredWarning') ||
					'GitLab token is required for repository filtering. Please add one in the settings.';
			}

			tokenWarningForFilter.classList.add('shake-animation');

			setTimeout(() => tokenWarningForFilter.classList.remove('shake-animation'), 620);

			setTimeout(() => {
				tokenWarningForFilter.classList.add('hidden');
			}, 4000);
		} else if (hasToken) {
			tokenWarningForFilter.classList.add('hidden');
		}
	}
}

async function triggerRepoFetchIfEnabled() {
	const context = getGitlabRepoFilterContext();

	if (!context) return;

	const { useRepoFilter, repoStatus } = context;

	let platform = 'gitlab';

	try {
		const items = await browser.storage.local.get(['platform']);

		platform = items.platform || 'gitlab';
	} catch {}

	if (platform !== 'gitlab') return;

	if (!useRepoFilter.checked) return;

	if (repoStatus) repoStatus.textContent = browser.i18n.getMessage('repoRefetching');

	browser.storage.local.get(['gitlabUsername']).then((items) => {
		const username = items.gitlabUsername;

		if (!username) {
			if (repoStatus) repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';

			return;
		}

		performRepoFetch();
	});
}

async function loadRepos() {
	const context = getGitlabRepoFilterContext();

	if (!context) return;

	let platform = 'gitlab';

	try {
		const items = await browser.storage.local.get(['platform']);

		platform = items.platform || 'gitlab';
	} catch {}

	if (platform !== 'gitlab') return;

	browser.storage.local.get(['gitlabUsername', 'gitlabToken']).then((items) => {
		if (!items.gitlabUsername) {
			context.repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';

			return;
		}

		performRepoFetch();
	});
}

async function performRepoFetch() {
	const context = getGitlabRepoFilterContext();

	if (!context) return;

	const { repoStatus, repoSearch, filterAndDisplayRepos, setAvailableRepos, getAvailableRepos, setIsFetchingRepos } =
		context;

	if (setIsFetchingRepos) setIsFetchingRepos(true);

	repoStatus.textContent = browser.i18n.getMessage('repoLoading');

	repoSearch.classList.add('repository-search-loading');

	try {
		const cacheData = await browser.storage.local.get(['repoCache']);

		const storageItems = await browser.storage.local.get(['gitlabUsername', 'gitlabToken', 'orgName']);

		const username = storageItems.gitlabUsername;

		const repoCacheKey = makeRepoCacheKey(username, storageItems.orgName || '', 'gitlab', storageItems);

		const now = Date.now();

		const cacheAge = cacheData.repoCache?.timestamp ? now - cacheData.repoCache.timestamp : Number.POSITIVE_INFINITY;

		const cacheTTL = 10 * 60 * 1000;

		if (cacheData.repoCache && cacheData.repoCache.cacheKey === repoCacheKey && cacheAge < cacheTTL) {
			setAvailableRepos(cacheData.repoCache.data);

			repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [getAvailableRepos().length]);

			if (setIsFetchingRepos) setIsFetchingRepos(false);

			if (document.activeElement === repoSearch) filterAndDisplayRepos(repoSearch.value.toLowerCase());

			return;
		}

		const fetchedRepos = await window.fetchGitlabUserRepositories(username, storageItems.gitlabToken);

		setAvailableRepos(fetchedRepos);

		repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [getAvailableRepos().length]);

		browser.storage.local.set({
			repoCache: {
				data: fetchedRepos,

				cacheKey: repoCacheKey,

				timestamp: now,
			},
		});

		if (setIsFetchingRepos) setIsFetchingRepos(false);

		if (document.activeElement === repoSearch) {
			filterAndDisplayRepos(repoSearch.value.toLowerCase());
		}
	} catch (err) {
		if (err.message?.includes('401')) {
			repoStatus.textContent =
				browser.i18n.getMessage('repoTokenPrivate') ||
				'A token is required for repository filtering. Please add one in the settings.';
		} else if (err.message?.includes('username')) {
			repoStatus.textContent = browser.i18n.getMessage('usernameMissingError') || 'Username required';
		} else {
			const errorLabel = browser.i18n.getMessage('errorLabel') || 'Error';

			repoStatus.textContent = `${errorLabel}: ${err.message || browser.i18n.getMessage('repoLoadFailed')}`;
		}
	} finally {
		if (setIsFetchingRepos) setIsFetchingRepos(false);

		repoSearch.classList.remove('repository-search-loading');
	}
}

async function fetchGitlabUserRepositories(username, token) {
	if (!token) {
		throw new Error('GitLab token is required for repository filtering');
	}

	const headers = {
		'PRIVATE-TOKEN': token,
	};

	const baseUrl = window.gitlabBaseUrl || 'https://gitlab.com';

	let startDate;

	let endDate;

	try {
		const storageData = await new Promise((resolve) => {
			chrome.storage.local.get(['startingDate', 'endingDate', 'yesterdayContribution'], resolve);
		});

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
	} catch (err) {
		console.warn('Could not determine date range for GitLab, using last 30 days:', err);

		const today = new Date();

		const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);

		startDate = thirtyDaysAgo.toISOString().split('T')[0];

		endDate = today.toISOString().split('T')[0];
	}

	const eventsUrl = `${baseUrl}/api/v4/events?action=pushed&created_after=${startDate}&created_before=${endDate}&per_page=100`;

	const res = await fetch(eventsUrl, { headers });

	if (!res.ok) {
		if (res.status === 401) throw new Error('401');

		throw new Error(`Failed to fetch GitLab events: ${res.status}`);
	}

	const events = await res.json();

	const projectIds = [...new Set(events.map((e) => e.project_id).filter((id) => id))];

	if (projectIds.length === 0) {
		return [];
	}

	const projects = [];

	await Promise.all(
		projectIds.map(async (projectId) => {
			try {
				const projectUrl = `${baseUrl}/api/v4/projects/${projectId}`;

				const projectRes = await fetch(projectUrl, { headers });

				if (projectRes.ok) {
					projects.push(await projectRes.json());
				}
			} catch (err) {
				console.error(`Failed to fetch project ${projectId}:`, err);
			}
		}),
	);

	return projects.map((project) => ({
		name: project.name,

		fullName: project.path_with_namespace,

		description: project.description,

		language: null,

		updatedAt: project.last_activity_at,

		private: project.visibility !== 'public',
	}));
}

window['forceGitlabDataRefresh'] = forceGitlabDataRefresh;

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('gitlab', {
		hasRepoFilter: false,
		checkTokenForFilter,
		checkTokenForShowCommits() {},
		checkTokenForMergedPRs() {},
		triggerRepoFetchIfEnabled,
		debugRepoFetch() {},
		loadRepos,
		performRepoFetch,
		validateOrgOnBlur(org) {
			console.log('[Org Check] Checking GitLab group on blur:', org);
			const baseUrl = window.gitlabBaseUrl || 'https://gitlab.com/api/v4';
			chrome.storage.local.get(['gitlabToken']).then((result) => {
				const headers = {};
				if (result.gitlabToken) {
					headers['PRIVATE-TOKEN'] = result.gitlabToken;
				}
				fetch(`${baseUrl}/groups/${encodeURIComponent(org)}`, { headers })
					.then((res) => {
						console.log('[Org Check] GitLab response status:', res.status);
						if (res.status === 404) {
							if (window.showPopupMessage) {
								window.showPopupMessage('Organization not found', { variant: 'error' });
							}
							return;
						}
						window.clearScrumHelperToast?.();
						chrome.storage.local.remove(['gitlabCache']);
					})
					.catch((err) => {
						console.error('[Org Check] GitLab validate error:', err);
						if (window.showPopupMessage) {
							window.showPopupMessage('Error validating organization', { variant: 'error' });
						}
					});
			});
		},
		fetchGitlabUserRepositories,
		fetchPrsMergedStatusBatch() {
			return Promise.resolve({});
		},
		forceDataRefresh: forceGitlabDataRefresh,
	});
}

window.fetchGitlabUserRepositories = fetchGitlabUserRepositories;
