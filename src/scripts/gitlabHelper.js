// GitLab API Helper for Scrum Helper Extension
const DEFAULT_GITLAB_API_BASE_URL = 'https://gitlab.com/api/v4';

let gitlabShowCommitsWarningTimeout;

function gitlabShowTokenWarningForShowCommits({ animate = false, durationMs = 4000 } = {}) {
	const tokenWarning = document.getElementById('tokenWarningForShowCommits');
	if (!tokenWarning) {
		return;
	}

	tokenWarning.classList.remove('hidden');
	if (animate) {
		tokenWarning.classList.add('shake-animation');
		setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
	}

	if (gitlabShowCommitsWarningTimeout) {
		clearTimeout(gitlabShowCommitsWarningTimeout);
	}
	gitlabShowCommitsWarningTimeout = setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, durationMs);
}

function gitlabCheckTokenForShowCommits({
	showWarning = false,
	animateWarning = false,
	warningDurationMs = 4000,
	persistState = false,
} = {}) {
	const showCommits = document.getElementById('showCommits');
	const gitlabTokenInput = document.getElementById('gitlabToken');

	if (!showCommits || !gitlabTokenInput) {
		return;
	}

	const isShowCommitsEnabled = showCommits.checked;
	const hasToken = gitlabTokenInput.value.trim() !== '';

	if (isShowCommitsEnabled && !hasToken) {
		showCommits.checked = false;
		if (showWarning) {
			gitlabShowTokenWarningForShowCommits({
				animate: animateWarning,
				durationMs: warningDurationMs,
			});
		}
		browser.storage.local.set({ showCommits: false });
		return;
	}

	const tokenWarning = document.getElementById('tokenWarningForShowCommits');
	if (tokenWarning) {
		if (gitlabShowCommitsWarningTimeout) {
			clearTimeout(gitlabShowCommitsWarningTimeout);
			gitlabShowCommitsWarningTimeout = null;
		}
		tokenWarning.classList.add('hidden');
	}
	if (persistState) {
		browser.storage.local.set({ showCommits: showCommits.checked });
	}
}

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

			let allProjects = [];
			let allMergeRequests = [];
			let allIssues = [];
			let finalUser = null;

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
				allProjects = groupProjectsRes.ok ? await groupProjectsRes.json() : [];

				// Fetch group merge requests
				const groupMRsUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}/merge_requests?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
				const groupMRsRes = await fetch(groupMRsUrl, { headers });
				allMergeRequests = groupMRsRes.ok ? await groupMRsRes.json() : [];

				// Fetch group issues
				const groupIssuesUrl = `${this.baseUrl}/groups/${encodeURIComponent(orgName)}/issues?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
				const groupIssuesRes = await fetch(groupIssuesUrl, { headers });
				allIssues = groupIssuesRes.ok ? await groupIssuesRes.json() : [];

				// Fetch user info for header mapping
				const userUrl = `${this.baseUrl}/users?username=${encodeURIComponent(username)}`;
				const userRes = await fetch(userUrl, { headers });
				if (userRes.ok) {
					const users = await userRes.json();
					if (users.length > 0) {
						finalUser = users[0];
					}
				}
				if (!finalUser) {
					finalUser = { username };
				}
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
				finalUser = users[0];
				const userId = finalUser.id;

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
				allProjects = Array.from(allProjectsMap.values());

				// Fetch merge requests from each project (works without auth for public projects)
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
					}
				}

				// Fetch issues from each project (works without auth for public projects)
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
					}
				}
			}

			// Fetch commits for open/draft Merge Requests if enabled
			const itemsLocal = await browser.storage.local.get(['showCommits']);
			const showCommits = itemsLocal.showCommits || false;

			if (showCommits && allMergeRequests.length > 0) {
				const openMRs = allMergeRequests.filter(
					(mr) =>
						mr.state === 'opened' ||
						mr.draft === true ||
						(mr.title && (mr.title.startsWith('Draft:') || mr.title.startsWith('WIP:'))),
				);

				const sinceDate = new Date(startDate + 'T00:00:00Z');
				const untilDate = new Date(endDate + 'T23:59:59Z');

				for (const mr of openMRs) {
					try {
						const commitsUrl = `${this.baseUrl}/projects/${mr.project_id}/merge_requests/${mr.iid}/commits?per_page=100`;
						const commitsRes = await fetch(commitsUrl, { headers });
						if (commitsRes.ok) {
							const commits = await commitsRes.json();
							mr._allCommits = commits
								.filter((commit) => {
									const commitDateStr = commit.committed_date || commit.created_at || commit.authored_date;
									if (!commitDateStr) return false;
									const commitDate = new Date(commitDateStr);
									return commitDate >= sinceDate && commitDate <= untilDate;
								})
								.map((commit) => ({
									messageHeadline: commit.title || commit.message,
									committedDate: commit.committed_date || commit.created_at || commit.authored_date,
								}));
						}
						// Add small delay to avoid rate limiting
						await new Promise((resolve) => setTimeout(resolve, 100));
					} catch (error) {
						console.error(`Error fetching commits for GitLab MR ${mr.iid}:`, error);
					}
				}
			}

			const gitlabData = {
				user: finalUser,
				projects: allProjects,
				mergeRequests: allMergeRequests,
				issues: allIssues,
				comments: [],
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
			_allCommits: item._allCommits || [],
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

async function fetchIssuesFromGitLab() {
	return [];
}

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('gitlab', {
		hasRepoFilter: false,
		checkTokenForFilter() {},
		checkTokenForShowCommits: gitlabCheckTokenForShowCommits,
    checkTokenForNextPlans() {},
		checkTokenForMergedPRs({ persistState = false } = {}) {
			const mergedPRsCheckbox = document.getElementById('onlyMergedPRs');
			if (!mergedPRsCheckbox) {
				return;
			}
			const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
			if (tokenWarning) {
				tokenWarning.classList.add('hidden');
			}
			if (persistState) {
				chrome?.storage.local.set({ onlyMergedPRs: mergedPRsCheckbox.checked });
			}
		},
		triggerRepoFetchIfEnabled() {},
		debugRepoFetch() {},
		loadRepos() {},
		performRepoFetch() {},
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
		fetchUserRepositories() {
			return Promise.resolve([]);
		},
		fetchPrsMergedStatusBatch() {
			return Promise.resolve({});
		},
		forceDataRefresh: forceGitlabDataRefresh,
		fetchAssignedIssues: fetchIssuesFromGitLab,
	});
}
