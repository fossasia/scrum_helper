// GitLab API Helper for Scrum Helper Extension
const DEFAULT_GITLAB_API_BASE_URL = 'https://gitlab.com/api/v4';

function normalizeGitLabApiBaseUrl(apiBaseUrl) {
	const value = typeof apiBaseUrl === 'string' && apiBaseUrl.trim() ? apiBaseUrl.trim() : DEFAULT_GITLAB_API_BASE_URL;
	return value.replace(/\/+$/, '');
}

function getProjectPathFromWebUrl(webUrl) {
	if (!webUrl) return '';
	try {
		const urlObj = new URL(webUrl);
		let projectPath = urlObj.pathname;
		if (projectPath.startsWith('/')) {
			projectPath = projectPath.substring(1);
		}
		const delimiterIdx = projectPath.indexOf('/-/');
		if (delimiterIdx !== -1) {
			projectPath = projectPath.substring(0, delimiterIdx);
		}
		return projectPath;
	} catch (e) {
		return '';
	}
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
				let allMergeRequests = groupMRsRes.ok ? await groupMRsRes.json() : [];

				// Fetch group issues
				const groupIssuesUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}/issues?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
				const groupIssuesRes = await fetch(groupIssuesUrl, { headers });
				let allIssues = groupIssuesRes.ok ? await groupIssuesRes.json() : [];

				const filterSettings = await chrome.storage.local.get(['useRepoFilter', 'selectedRepos']);
				if (filterSettings.useRepoFilter && filterSettings.selectedRepos && filterSettings.selectedRepos.length > 0) {
					const selectedNames = new Set(
						filterSettings.selectedRepos.map((r) => (typeof r === 'object' ? r.fullName : r).toLowerCase()),
					);
					allMergeRequests = allMergeRequests.filter((mr) => {
						const path = getProjectPathFromWebUrl(mr.web_url).toLowerCase();
						return selectedNames.has(path);
					});
					allIssues = allIssues.filter((issue) => {
						const path = getProjectPathFromWebUrl(issue.web_url).toLowerCase();
						return selectedNames.has(path);
					});
				}

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
				let allProjects = Array.from(allProjectsMap.values());

				const filterSettings = await chrome.storage.local.get(['useRepoFilter', 'selectedRepos']);
				if (filterSettings.useRepoFilter && filterSettings.selectedRepos && filterSettings.selectedRepos.length > 0) {
					const selectedNames = new Set(
						filterSettings.selectedRepos.map((r) => (typeof r === 'object' ? r.fullName : r).toLowerCase()),
					);
					allProjects = allProjects.filter((p) => selectedNames.has(p.path_with_namespace.toLowerCase()));
				}

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
			repository_url: `${this.baseUrl}/projects/${item.project_id}`,
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

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('gitlab', {
		hasRepoFilter: true,
		checkTokenForFilter() {
			const useFilter = document.getElementById('useRepoFilter');
			const token = document.getElementById('gitlabToken');
			const warning = document.getElementById('tokenWarningForFilter');
			const container = document.getElementById('repoFilterContainer');
			if (useFilter?.checked && !token?.value.trim()) {
				useFilter.checked = false;
				container?.classList.add('hidden');
				warning?.classList.remove('hidden');
			} else {
				warning?.classList.add('hidden');
			}
		},
		checkTokenForShowCommits() {},
		checkTokenForMergedPRs({ persistState = false } = {}) {
			const mergedPRsCheckbox = document.getElementById('onlyMergedPRs');
			if (!mergedPRsCheckbox) return;
			const warning = document.getElementById('tokenWarningForMergedPRs');
			if (warning) warning.classList.add('hidden');
			if (persistState) chrome?.storage.local.set({ onlyMergedPRs: mergedPRsCheckbox.checked });
		},
		async triggerRepoFetchIfEnabled() {
			const context = window.githubRepoFilterContext;
			if (!context || !context.useRepoFilter?.checked) return;
			const { repoStatus, setAvailableRepos } = context;
			if (repoStatus) repoStatus.textContent = browser.i18n.getMessage('repoRefetching');
			try {
				const items = await browser.storage.local.get(['gitlabUsername', 'gitlabToken', 'orgName']);
				if (!items.gitlabUsername) {
					if (repoStatus)
						repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
					return;
				}
				const repos = await this.fetchUserRepositories(items.gitlabUsername, items.gitlabToken, items.orgName || '');
				setAvailableRepos?.(repos);
				if (repoStatus) repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [repos.length]);
				const key = makeRepoCacheKey(items.gitlabUsername, items.orgName || '', 'gitlab', items);
				browser.storage.local.set({ repoCache: { data: repos, cacheKey: key, timestamp: Date.now() } });
			} catch (err) {
				if (repoStatus) repoStatus.textContent = `Error: ${err.message}`;
			}
		},
		debugRepoFetch() {},
		async loadRepos() {
			const items = await browser.storage.local.get(['gitlabUsername']);
			if (!items.gitlabUsername) {
				const context = window.githubRepoFilterContext;
				if (context?.repoStatus)
					context.repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
				return;
			}
			this.performRepoFetch();
		},
		async performRepoFetch() {
			const context = window.githubRepoFilterContext;
			if (!context) return;
			const { repoStatus, repoSearch, filterAndDisplayRepos, setAvailableRepos, getAvailableRepos } = context;
			repoStatus.textContent = browser.i18n.getMessage('repoLoading');
			repoSearch.classList.add('repository-search-loading');
			try {
				const cache = await browser.storage.local.get(['repoCache']);
				const items = await browser.storage.local.get(['gitlabUsername', 'gitlabToken', 'orgName']);
				const key = makeRepoCacheKey(items.gitlabUsername, items.orgName || '', 'gitlab', items);
				if (cache.repoCache?.cacheKey === key && Date.now() - cache.repoCache.timestamp < 600000) {
					setAvailableRepos(cache.repoCache.data);
				} else {
					const repos = await this.fetchUserRepositories(items.gitlabUsername, items.gitlabToken, items.orgName || '');
					setAvailableRepos(repos);
					browser.storage.local.set({ repoCache: { data: repos, cacheKey: key, timestamp: Date.now() } });
				}
				repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [getAvailableRepos().length]);
				if (document.activeElement === repoSearch) filterAndDisplayRepos(repoSearch.value.toLowerCase());
			} catch (err) {
				repoStatus.textContent = `Error: ${err.message}`;
			} finally {
				repoSearch.classList.remove('repository-search-loading');
			}
		},
		validateOrgOnBlur(org) {
			const baseUrl = window.gitlabBaseUrl || 'https://gitlab.com/api/v4';
			chrome.storage.local.get(['gitlabToken']).then((result) => {
				const headers = {};
				if (result.gitlabToken) headers['PRIVATE-TOKEN'] = result.gitlabToken;
				fetch(`${baseUrl}/groups/${encodeURIComponent(org)}`, { headers })
					.then((res) => {
						if (res.status === 404) {
							if (window.showPopupMessage) window.showPopupMessage('Organization not found', { variant: 'error' });
							return;
						}
						window.clearScrumHelperToast?.();
						chrome.storage.local.remove(['gitlabCache']);
					})
					.catch((err) => {
						if (window.showPopupMessage) window.showPopupMessage('Error validating organization', { variant: 'error' });
					});
			});
		},
		async fetchUserRepositories(username, token, org = '') {
			const baseUrl = window.gitlabBaseUrl || 'https://gitlab.com/api/v4';
			const headers = {};
			if (token) {
				headers['PRIVATE-TOKEN'] = token;
			}

			console.log('[GitLab repo filter] Fetching GitLab user info for:', username);
			const userRes = await fetch(`${baseUrl}/users?username=${encodeURIComponent(username)}`, { headers });
			if (!userRes.ok) {
				throw new Error(`GitLab user fetch failed: ${userRes.status}`);
			}
			const users = await userRes.json();
			if (!users.length) {
				throw new Error(`GitLab user not found: ${username}`);
			}
			const userId = users[0].id;

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
				console.warn('[GitLab repo filter] Could not determine date range, using last 30 days:', err);
				const today = new Date();
				const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
				startDate = thirtyDaysAgo.toISOString().split('T')[0];
				endDate = today.toISOString().split('T')[0];
			}

			console.log(`[GitLab repo filter] Fetching events for userId: ${userId} between ${startDate} and ${endDate}`);

			const eventsUrl = `${baseUrl}/users/${userId}/events?after=${startDate}&before=${endDate}&per_page=100`;
			const eventsRes = await fetch(eventsUrl, { headers });
			if (!eventsRes.ok) {
				throw new Error(`GitLab events fetch failed: ${eventsRes.status}`);
			}
			const events = await eventsRes.json();

			const projectIds = Array.from(new Set(events.map((e) => e.project_id).filter((id) => !!id)));
			console.log(`[GitLab repo filter] Found ${projectIds.length} unique project IDs from push events`);

			if (projectIds.length === 0) {
				return [];
			}

			const repos = [];
			const fetchPromises = projectIds.map(async (projectId) => {
				try {
					const projectRes = await fetch(`${baseUrl}/projects/${projectId}`, { headers });
					if (projectRes.ok) {
						const project = await projectRes.json();

						// If this project is a fork, we ONLY include the original/upstream project.
						// Otherwise, we include the project itself.
						if (project.forked_from_project) {
							const upstream = project.forked_from_project;
							let includeUpstream = true;
							if (org && org !== 'all') {
								const upstreamPath = upstream.path_with_namespace?.toLowerCase() || '';
								const orgLower = org.toLowerCase();

								if (!upstreamPath.startsWith(orgLower + '/')) {
									includeUpstream = false;
								}
							}

							if (includeUpstream) {
								repos.push({
									name: upstream.name,
									fullName: upstream.path_with_namespace,
									description: upstream.description || '',
									language: null,
									updatedAt: project.last_activity_at, // Use the fork's activity timestamp as the user contribution date
									stars: upstream.star_count || 0,
								});
							}
						} else {
							let includeProject = true;
							if (org && org !== 'all') {
								const namespacePath = project.namespace?.path?.toLowerCase() || '';
								const pathWithNamespace = project.path_with_namespace?.toLowerCase() || '';
								const orgLower = org.toLowerCase();

								if (namespacePath !== orgLower && !pathWithNamespace.startsWith(orgLower + '/')) {
									includeProject = false;
								}
							}

							if (includeProject) {
								repos.push({
									name: project.name,
									fullName: project.path_with_namespace,
									description: project.description || '',
									language: null,
									updatedAt: project.last_activity_at,
									stars: project.star_count || 0,
								});
							}
						}
					}
				} catch (err) {
					console.error(`[GitLab repo filter] Failed to fetch project ${projectId}:`, err);
				}
			});

			await Promise.all(fetchPromises);

			// Deduplicate repos by fullName
			const uniqueReposMap = new Map();
			for (const repo of repos) {
				uniqueReposMap.set(repo.fullName.toLowerCase(), repo);
			}
			const uniqueRepos = Array.from(uniqueReposMap.values());

			return uniqueRepos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
		},
		fetchPrsMergedStatusBatch() {
			return Promise.resolve({});
		},
		forceDataRefresh: forceGitlabDataRefresh,
	});
}
