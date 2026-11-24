// GitLab API Helper for Scrum Helper Extension
const DEFAULT_GITLAB_API_BASE_URL = 'https://gitlab.com/api/v4';
const GITLAB_ACCOUNT_STORAGE_KEYS = ['gitlabBaseUrl', 'gitlabToken', 'gitlabTokenInstance'];

function parseGitlabGroups(groupStr) {
	if (!groupStr) return [];
	return groupStr
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s && s !== 'all');
}
window.parseGitlabGroups = parseGitlabGroups;

const gitlabWarningTimeouts = {};

function gitlabShowTokenWarning(elementId, { animate = false, durationMs = 4000 } = {}) {
	const tokenWarning = document.getElementById(elementId);
	if (!tokenWarning) return;
	tokenWarning.classList.remove('hidden');
	if (animate) {
		window.shakeElement ? window.shakeElement(tokenWarning, 620) : tokenWarning.classList.add('shake-animation');
	}
	if (gitlabWarningTimeouts[elementId]) {
		clearTimeout(gitlabWarningTimeouts[elementId]);
	}
	gitlabWarningTimeouts[elementId] = setTimeout(() => {
		tokenWarning.classList.add('hidden');
		delete gitlabWarningTimeouts[elementId];
	}, durationMs);
}

function gitlabCheckToken({
	checkboxId,
	warningId,
	storageKey,
	showWarning = false,
	animateWarning = false,
	warningDurationMs = 4000,
	persistState = false,
} = {}) {
	const checkbox = document.getElementById(checkboxId);
	const gitlabTokenInput = document.getElementById('gitlabToken');
	if (!checkbox || !gitlabTokenInput) return;

	const isEnabled = checkbox.checked;
	const hasToken = gitlabTokenInput.value.trim() !== '';

	if (isEnabled && !hasToken) {
		checkbox.checked = false;
		if (showWarning) {
			gitlabShowTokenWarning(warningId, {
				animate: animateWarning,
				durationMs: warningDurationMs,
			});
		}
		browser.storage.local.set({ [storageKey]: false });
		if (checkboxId === 'includeNextPlans') {
			const container = document.getElementById('assignedIssuesSelector');
			if (container) {
				container.style.display = 'none';
				container.classList.add('hidden');
			}
		}
		return;
	}

	const tokenWarning = document.getElementById(warningId);
	if (tokenWarning) {
		if (gitlabWarningTimeouts[warningId]) {
			clearTimeout(gitlabWarningTimeouts[warningId]);
			delete gitlabWarningTimeouts[warningId];
		}
		tokenWarning.classList.add('hidden');
	}
	if (persistState) {
		browser.storage.local.set({ [storageKey]: checkbox.checked });
	}
}

function gitlabCheckTokenForShowCommits(options = {}) {
	gitlabCheckToken({
		checkboxId: 'showCommits',
		warningId: 'tokenWarningForShowCommits',
		storageKey: 'showCommits',
		...options,
	});
}

function normalizeGitLabApiBaseUrl(apiBaseUrl) {
	if (apiBaseUrl == null || apiBaseUrl === '') return DEFAULT_GITLAB_API_BASE_URL;
	if (typeof apiBaseUrl !== 'string') return null;
	const value = apiBaseUrl.trim();
	if (!value) return DEFAULT_GITLAB_API_BASE_URL;
	if (!/^https:\/\//i.test(value) || /[?#\\]/.test(value)) return null;
	try {
		const url = new URL(value);
		const host = url.hostname.replace(/\.$/, '');
		const path = url.pathname.replace(/\/+$/, '');
		if (url.username || url.password || !/^(?:\/[\w.-]+)*\/api\/v4$/.test(path)) return null;
		// The browser resolves DNS. Reject local special-use names and address literals as inputs.
		if (!host.includes('.') || host.endsWith('.localhost') || host === 'metadata.google.internal') return null;
		if (host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
		url.hostname = host;
		return `${url.origin}${path}`;
	} catch {
		return null;
	}
}

function resolveGitLabAccount(items = {}) {
	const apiBaseUrl = normalizeGitLabApiBaseUrl(items.gitlabBaseUrl);
	const tokenInstance = items.gitlabTokenInstance ?? DEFAULT_GITLAB_API_BASE_URL;
	const token = apiBaseUrl && apiBaseUrl === tokenInstance ? (items.gitlabToken || '').trim() : '';
	return { apiBaseUrl, token };
}

async function loadGitLabAccount() {
	return resolveGitLabAccount(await browser.storage.local.get(GITLAB_ACCOUNT_STORAGE_KEYS));
}

function getGitLabAccountKey({ apiBaseUrl, token }) {
	return JSON.stringify([apiBaseUrl, getTokenMarker(token)]);
}

function gitLabHostPermission(apiBaseUrl) {
	return { origins: [`https://${new URL(apiBaseUrl).hostname}/*`] };
}

async function ensureGitLabAccess(apiBaseUrl) {
	if (!apiBaseUrl || normalizeGitLabApiBaseUrl(apiBaseUrl) !== apiBaseUrl) {
		throw new Error(browser.i18n.getMessage('gitlabApiBaseInvalid') || 'Enter a valid HTTPS GitLab API v4 URL.');
	}
	if (apiBaseUrl === DEFAULT_GITLAB_API_BASE_URL || window.isTauri) return;
	if (!(await browser.permissions?.contains(gitLabHostPermission(apiBaseUrl)))) {
		throw new Error(
			browser.i18n.getMessage('gitlabApiBasePermissionDenied') ||
				'Allow access to the GitLab instance using Apply in GitLab settings.',
		);
	}
}

async function requestGitLab(apiBaseUrl, url, headers) {
	await ensureGitLabAccess(apiBaseUrl);
	const target = new URL(url);
	if (target.origin !== new URL(apiBaseUrl).origin || !target.href.startsWith(`${apiBaseUrl}/`)) {
		throw new Error('GitLab request is outside the configured API base.');
	}
	const signal = AbortSignal.timeout(15_000);
	try {
		return await fetch(target.href, { headers, redirect: 'error', credentials: 'omit', signal });
	} catch (error) {
		if (signal.aborted) {
			throw new Error('GitLab request timed out. Check your network or VPN connection and try again.', {
				cause: error,
			});
		}
		throw error;
	}
}

window.resolveGitLabAccount = resolveGitLabAccount;
window.getGitLabAccountKey = getGitLabAccountKey;
window.ensureGitLabAccess = ensureGitLabAccess;

function getProjectPathFromWebUrl(webUrl, apiBaseUrl) {
	if (!webUrl) return '';
	try {
		const urlObj = new URL(webUrl);
		let projectPath = urlObj.pathname;
		if (apiBaseUrl) {
			const api = new URL(apiBaseUrl);
			const prefix = api.pathname.slice(0, -'/api/v4'.length);
			if (prefix && urlObj.origin === api.origin && projectPath.startsWith(prefix + '/')) {
				projectPath = projectPath.slice(prefix.length);
			}
		}
		if (projectPath.startsWith('/')) {
			projectPath = projectPath.substring(1);
		}
		const delimiterIdx = projectPath.indexOf('/-/');
		if (delimiterIdx !== -1) {
			return projectPath.substring(0, delimiterIdx);
		}
		return projectPath.replace(/\/(?:issues|merge_requests|work_items)\/\d+\/?$/, '');
	} catch (e) {
		return '';
	}
}

function getTokenMarker(token) {
	if (!token) return 'noauth';
	let hash = 0;
	for (let i = 0; i < token.length; i++) {
		hash = (hash << 5) - hash + token.charCodeAt(i);
		hash |= 0;
	}
	return `auth-${Math.abs(hash).toString(16)}`;
}

class GitLabHelper {
	constructor(apiBaseUrl = DEFAULT_GITLAB_API_BASE_URL, accountKey = null) {
		this.baseUrl = normalizeGitLabApiBaseUrl(apiBaseUrl);
		this.accountKey = accountKey;
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
		const defaultTtl = 10 * 60 * 1000;
		try {
			const items = await browser.storage.local.get(['cacheInput']);
			const minutes = Number.parseInt(items.cacheInput, 10);
			return Number.isSafeInteger(minutes) && minutes > 0 ? minutes * 60 * 1000 : defaultTtl;
		} catch (error) {
			console.error('Error getting cache TTL:', error);
			return defaultTtl;
		}
	}

	async saveToStorage(data) {
		try {
			if (this.accountKey && this.accountKey !== getGitLabAccountKey(await loadGitLabAccount())) return;
			if (this.invalidated) return;
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
	getTokenMarker(token) {
		return getTokenMarker(token);
	}

	async fetchGitLabData(username, startDate, endDate, token = null, orgName = '') {
		await ensureGitLabAccess(this.baseUrl);
		const itemsLocal = await browser.storage.local.get([
			'showCommits',
			'useRepoFilter',
			'selectedRepos',
			'useGitlabRepoFilter',
			'selectedGitlabRepos',
		]);
		const showCommits = itemsLocal.showCommits || false;
		const commitMarker = showCommits ? 'commits' : 'nocommits';

		const isRepoFilterEnabled =
			typeof itemsLocal.useGitlabRepoFilter !== 'undefined' ? itemsLocal.useGitlabRepoFilter : itemsLocal.useRepoFilter;
		const selectedReposList = itemsLocal.selectedGitlabRepos || itemsLocal.selectedRepos || [];

		// Include token state, orgName, showCommits, and repository filter state in cache key to invalidate on changes
		const tokenMarker = getTokenMarker(token);
		const normalizedGroups = parseGitlabGroups(orgName).sort().join(',');
		const orgMarker = normalizedGroups ? `org-${normalizedGroups}` : 'noorg';

		let repoMarker = 'norepos';
		if (isRepoFilterEnabled && selectedReposList && selectedReposList.length > 0) {
			const repoNames = selectedReposList
				.filter(Boolean)
				.map((r) => (typeof r === 'object' && r !== null ? r.fullName || '' : r || '').toLowerCase())
				.filter(Boolean)
				.sort()
				.join(',');
			repoMarker = `repos-${repoNames}`;
		}

		const cacheKey = `${this.baseUrl}-${username}-${startDate}-${endDate}-${tokenMarker}-${orgMarker}-${commitMarker}-${repoMarker}`;

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

			const groups = parseGitlabGroups(orgName);
			if (groups.length > 0) {
				for (const group of groups) {
					// Verify group existence
					const groupUrl = `${this.baseUrl}/groups/${encodeURIComponent(group)}`;
					const groupRes = await requestGitLab(this.baseUrl, groupUrl, headers);
					if (!groupRes.ok) {
						if (groupRes.status === 404) {
							throw new Error(`Organization "${group}" not found on GitLab.`);
						}
						throw new Error(`Error fetching GitLab group "${group}": ${groupRes.status} ${groupRes.statusText}`);
					}

					// Fetch group projects for project mapping (including subgroups)
					const groupProjectsUrl = `${this.baseUrl}/groups/${encodeURIComponent(group)}/projects?per_page=100&include_subgroups=true`;
					const groupProjectsRes = await requestGitLab(this.baseUrl, groupProjectsUrl, headers);
					if (groupProjectsRes.ok) {
						const projects = await groupProjectsRes.json();
						allProjects.push(...projects);
					}

					// Fetch group merge requests
					const groupMRsUrl = `${this.baseUrl}/groups/${encodeURIComponent(group)}/merge_requests?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const groupMRsRes = await requestGitLab(this.baseUrl, groupMRsUrl, headers);
					if (groupMRsRes.ok) {
						const mrs = await groupMRsRes.json();
						allMergeRequests.push(...mrs);
					}

					// Fetch group issues
					const groupIssuesUrl = `${this.baseUrl}/groups/${encodeURIComponent(group)}/issues?author_username=${encodeURIComponent(username)}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const groupIssuesRes = await requestGitLab(this.baseUrl, groupIssuesUrl, headers);
					if (groupIssuesRes.ok) {
						const issues = await groupIssuesRes.json();
						allIssues.push(...issues);
					}
				}

				// Deduplicate by id
				const dedupe = (arr) => {
					const seen = new Set();
					return arr.filter((item) => {
						if (!item || !item.id || seen.has(item.id)) return false;
						seen.add(item.id);
						return true;
					});
				};
				allProjects = dedupe(allProjects);
				allMergeRequests = dedupe(allMergeRequests);
				allIssues = dedupe(allIssues);

				const filterSettings = await browser.storage.local.get([
					'useRepoFilter',
					'selectedRepos',
					'repoCache',
					'gitlabRepoCache',
					'useGitlabRepoFilter',
					'selectedGitlabRepos',
				]);
				const isFilterEnabled =
					typeof filterSettings.useGitlabRepoFilter !== 'undefined'
						? filterSettings.useGitlabRepoFilter
						: filterSettings.useRepoFilter;
				const currentSelectedRepos = filterSettings.selectedGitlabRepos || filterSettings.selectedRepos;
				if (isFilterEnabled && currentSelectedRepos && currentSelectedRepos.length > 0) {
					const selectedNames = new Set(
						currentSelectedRepos
							.filter(Boolean)
							.map((r) => (typeof r === 'object' && r !== null ? r.fullName || '' : r || '').toLowerCase())
							.filter(Boolean),
					);
					const repoCacheData = filterSettings.gitlabRepoCache || filterSettings.repoCache;
					if (repoCacheData && repoCacheData.data) {
						for (const repo of repoCacheData.data) {
							const nameLower = repo.fullName.toLowerCase();
							const forkedFromLower = repo.forkedFrom?.toLowerCase();
							if (forkedFromLower) {
								if (selectedNames.has(nameLower)) {
									selectedNames.add(forkedFromLower);
								} else if (selectedNames.has(forkedFromLower)) {
									selectedNames.add(nameLower);
								}
							}
						}
					}
					allMergeRequests = allMergeRequests.filter((mr) => {
						const path = getProjectPathFromWebUrl(mr.web_url, this.baseUrl).toLowerCase();
						return selectedNames.has(path);
					});
					allIssues = allIssues.filter((issue) => {
						const path = getProjectPathFromWebUrl(issue.web_url, this.baseUrl).toLowerCase();
						return selectedNames.has(path);
					});
				}

				// Fetch user info for header mapping
				const userUrl = `${this.baseUrl}/users?username=${encodeURIComponent(username)}`;
				const userRes = await requestGitLab(this.baseUrl, userUrl, headers);
				if (!userRes.ok) {
					const err = new Error(
						chrome?.i18n.getMessage('gitlabUserFetchError', [userRes.status, userRes.statusText]) ||
							`Error fetching GitLab user: ${userRes.status} ${userRes.statusText}`,
					);
					err.platform = 'gitlab';
					err.username = username;
					throw err;
				}
				const users = await userRes.json();
				if (!Array.isArray(users) || users.length === 0) {
					const err = new Error(
						chrome?.i18n.getMessage('gitlabUserNotFoundError', [username]) || `GitLab user "${username}" not found.`,
					);
					err.code = 'USERNAME_VALIDATION';
					err.platform = 'gitlab';
					err.username = username;
					throw err;
				}
				finalUser = users[0];
			} else {
				// Get user info first
				const userUrl = `${this.baseUrl}/users?username=${encodeURIComponent(username)}`;
				const userRes = await requestGitLab(this.baseUrl, userUrl, headers);
				if (!userRes.ok) {
					const err = new Error(
						chrome?.i18n.getMessage('gitlabUserFetchError', [userRes.status, userRes.statusText]) ||
							`Error fetching GitLab user: ${userRes.status} ${userRes.statusText}`,
					);
					err.platform = 'gitlab';
					err.username = username;
					throw err;
				}
				const users = await userRes.json();
				if (!Array.isArray(users) || users.length === 0) {
					const err = new Error(
						chrome?.i18n.getMessage('gitlabUserNotFoundError', [username]) || `GitLab user "${username}" not found.`,
					);
					err.code = 'USERNAME_VALIDATION';
					err.platform = 'gitlab';
					err.username = username;
					throw err;
				}
				finalUser = users[0];
				const userId = finalUser.id;

				// Fetch all projects the user is a member of (including group projects)
				const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
				const membershipProjectsRes = await requestGitLab(this.baseUrl, membershipProjectsUrl, headers);
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
				const contributedProjectsRes = await requestGitLab(this.baseUrl, contributedProjectsUrl, headers);
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

				const filterSettings = await browser.storage.local.get([
					'useRepoFilter',
					'selectedRepos',
					'repoCache',
					'gitlabRepoCache',
					'useGitlabRepoFilter',
					'selectedGitlabRepos',
				]);
				const isFilterEnabled =
					typeof filterSettings.useGitlabRepoFilter !== 'undefined'
						? filterSettings.useGitlabRepoFilter
						: filterSettings.useRepoFilter;
				const currentSelectedRepos = filterSettings.selectedGitlabRepos || filterSettings.selectedRepos;
				if (isFilterEnabled && currentSelectedRepos && currentSelectedRepos.length > 0) {
					const selectedNames = new Set(
						currentSelectedRepos
							.filter(Boolean)
							.map((r) => (typeof r === 'object' && r !== null ? r.fullName || '' : r || '').toLowerCase())
							.filter(Boolean),
					);
					const repoCacheData = filterSettings.gitlabRepoCache || filterSettings.repoCache;
					if (repoCacheData && repoCacheData.data) {
						for (const repo of repoCacheData.data) {
							const nameLower = repo.fullName.toLowerCase();
							const forkedFromLower = repo.forkedFrom?.toLowerCase();
							if (forkedFromLower) {
								if (selectedNames.has(nameLower)) {
									selectedNames.add(forkedFromLower);
								} else if (selectedNames.has(forkedFromLower)) {
									selectedNames.add(nameLower);
								}
							}
						}
					}
					allProjects = allProjects.filter((p) => selectedNames.has(p.path_with_namespace.toLowerCase()));
				}

				// Fetch merge requests from each project (works without auth for public projects)
				for (const project of allProjects) {
					try {
						const projectMRsUrl = `${this.baseUrl}/projects/${project.id}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
						const projectMRsRes = await requestGitLab(this.baseUrl, projectMRsUrl, headers);
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
						const projectIssuesRes = await requestGitLab(this.baseUrl, projectIssuesUrl, headers);
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
						const commitsRes = await requestGitLab(this.baseUrl, commitsUrl, headers);
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
				const res = await requestGitLab(this.baseUrl, url, headers);
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
				const res = await requestGitLab(this.baseUrl, url, headers);
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
		let repoName = project ? project.path_with_namespace || project.name : 'unknown';

		if (repoName === 'unknown' && item.web_url) {
			repoName = getProjectPathFromWebUrl(item.web_url, this.baseUrl) || repoName;
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
}
if (typeof window !== 'undefined') {
	window.GitLabHelper = GitLabHelper;
}

async function forceGitlabDataRefresh() {
	const previous = window.gitlabHelper;
	if (previous instanceof GitLabHelper) {
		previous.invalidated = true;
		previous.cache.data = null;
		previous.cache.cacheKey = null;
		previous.cache.timestamp = 0;
	}
	await browser.storage.local.remove('gitlabCache');
	window.hasInjectedContent = false;
	const { apiBaseUrl } = await loadGitLabAccount();
	window.gitlabHelper = apiBaseUrl ? new GitLabHelper(apiBaseUrl) : null;
	return { success: true };
}

window['forceGitlabDataRefresh'] = forceGitlabDataRefresh;

function gitlabCheckTokenForNextPlans(options = {}) {
	gitlabCheckToken({
		checkboxId: 'includeNextPlans',
		warningId: 'tokenWarningForNextPlans',
		storageKey: 'includeNextPlans',
		...options,
	});
}

async function fetchIssuesFromGitLab(scope) {
	const storage = await browser.storage.local.get([
		'platform',
		'gitlabUsername',
		...GITLAB_ACCOUNT_STORAGE_KEYS,
		'platformUsername',
	]);
	const platform = storage.platform || 'github';
	const account = scope?.accounts?.gitlab;
	const username =
		account?.username ?? (storage.gitlabUsername || (platform === 'gitlab' ? storage.platformUsername : ''));
	const { token, apiBaseUrl: baseUrl } = account ?? resolveGitLabAccount(storage);

	if (!username) {
		throw new Error('GitLab username is required. Please set it in settings.');
	}
	if (!token) {
		throw new Error('GitLab token is required. Please set it in settings.');
	}

	const headers = {
		'PRIVATE-TOKEN': token,
	};

	let page = 1;
	let allIssues = [];
	let hasMore = true;

	// Limit to 2 pages (200 issues) to keep response times fast
	while (hasMore && page <= 2) {
		const url = `${baseUrl}/issues?assignee_username=${encodeURIComponent(username)}&state=opened&scope=all&per_page=100&page=${page}&order_by=updated_at&sort=desc`;
		console.log(`[NextPlans] Fetching page ${page} from GitLab: ${url}`);
		const response = await requestGitLab(baseUrl, url, headers);
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const message = errorData.message || response.statusText;
			throw new Error(`GitLab API error: ${message}`);
		}

		const items = await response.json();
		allIssues = allIssues.concat(items);

		if (items.length < 100) {
			hasMore = false;
		} else {
			page++;
		}
	}

	const repoSet = scope?.type === 'selected' ? new Set(scope.repos) : null;

	return allIssues
		.map((issue) => {
			let repoName = getProjectPathFromWebUrl(issue.web_url, baseUrl);

			if (!repoName && issue.references && issue.references.full) {
				repoName = issue.references.full.split('#')[0];
			}

			const safeTitle = typeof sanitizeHtml === 'function' ? sanitizeHtml(issue.title) : issue.title;
			const safeUrl = typeof sanitizeHtml === 'function' ? sanitizeHtml(issue.web_url) : issue.web_url;

			return {
				id: issue.id,
				number: Number.parseInt(issue.iid, 10),
				title: safeTitle,
				html_url: safeUrl,
				repository: repoName,
				state: issue.state,
				_platform: 'gitlab',
				platform: 'gitlab',
			};
		})
		.filter((issue) => {
			if (Number.isNaN(issue.number) || !issue.html_url) {
				return false;
			}
			if (repoSet && !repoSet.has(issue.repository)) {
				return false;
			}
			return true;
		});
}

if (window.PlatformRegistry) {
	window.PlatformRegistry.register('gitlab', {
		hasRepoFilter: true,
		async validateToken() {
			try {
				const { apiBaseUrl, token } = await loadGitLabAccount();
				if (!token) return { valid: false, status: 0, reason: 'empty' };
				const res = await requestGitLab(apiBaseUrl, `${apiBaseUrl}/user`, { 'PRIVATE-TOKEN': token });
				if (res.status === 401) return { valid: false, status: 401, reason: 'invalid' };
				if (res.ok) return { valid: true, status: res.status };
				return { valid: false, status: res.status, reason: 'error' };
			} catch (err) {
				return { valid: false, networkError: true };
			}
		},
		checkTokenForFilter() {
			const useFilter = document.getElementById('useGitlabRepoFilter') || document.getElementById('useRepoFilter');
			const token = document.getElementById('gitlabToken');
			const warning =
				document.getElementById('tokenWarningForGitlabFilter') || document.getElementById('tokenWarningForFilter');
			const container =
				document.getElementById('gitlabRepoFilterContainer') || document.getElementById('repoFilterContainer');
			if (useFilter?.checked && !token?.value.trim()) {
				useFilter.checked = false;
				container?.classList.add('hidden');
				warning?.classList.remove('hidden');
			} else {
				warning?.classList.add('hidden');
			}
		},
		checkTokenForShowCommits: gitlabCheckTokenForShowCommits,
		checkTokenForNextPlans: gitlabCheckTokenForNextPlans,
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
		async triggerRepoFetchIfEnabled() {
			const context = window.gitlabRepoFilterContext || window.githubRepoFilterContext;
			if (!context || !context.useRepoFilter?.checked) return;
			const { repoStatus, setAvailableRepos } = context;
			if (repoStatus) repoStatus.textContent = browser.i18n.getMessage('repoRefetching');
			try {
				const items = await browser.storage.local.get([
					'gitlabUsername',
					'gitlabGroupName',
					...GITLAB_ACCOUNT_STORAGE_KEYS,
				]);
				const username = items.gitlabUsername;
				const org = items.gitlabGroupName || '';
				if (!username) {
					if (repoStatus)
						repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
					return;
				}
				const account = resolveGitLabAccount(items);
				const repos = await this.fetchUserRepositories(username, null, org, account);
				if (getGitLabAccountKey(account) !== getGitLabAccountKey(await loadGitLabAccount())) return;
				setAvailableRepos?.(repos);
				if (repoStatus) repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [repos.length]);
				const key = makeRepoCacheKey(username, org, 'gitlab', items);
				browser.storage.local.set({ gitlabRepoCache: { data: repos, cacheKey: key, timestamp: Date.now() } });
			} catch (err) {
				if (repoStatus) repoStatus.textContent = `Error: ${err.message}`;
			}
		},
		debugRepoFetch() {},
		async loadRepos() {
			const items = await browser.storage.local.get(['gitlabUsername']);
			if (!items.gitlabUsername) {
				const context = window.gitlabRepoFilterContext || window.githubRepoFilterContext;
				if (context?.repoStatus)
					context.repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
				return;
			}
			this.performRepoFetch();
		},
		async performRepoFetch() {
			const context = window.gitlabRepoFilterContext || window.githubRepoFilterContext;
			if (!context) return;
			const { repoStatus, repoSearch, filterAndDisplayRepos, setAvailableRepos, getAvailableRepos } = context;
			repoStatus.textContent = browser.i18n.getMessage('repoLoading');
			repoSearch.classList.add('repository-search-loading');
			try {
				const cache = await browser.storage.local.get(['gitlabRepoCache', 'repoCache']);
				const items = await browser.storage.local.get([
					'gitlabUsername',
					'gitlabGroupName',
					...GITLAB_ACCOUNT_STORAGE_KEYS,
				]);
				const username = items.gitlabUsername;
				const org = items.gitlabGroupName || '';
				const account = resolveGitLabAccount(items);
				await ensureGitLabAccess(account.apiBaseUrl);
				const key = makeRepoCacheKey(username, org, 'gitlab', items);
				const cached = cache.gitlabRepoCache || cache.repoCache;
				if (cached?.cacheKey === key && Date.now() - cached.timestamp < 600000) {
					setAvailableRepos(cached.data);
				} else {
					const repos = await this.fetchUserRepositories(username, null, org, account);
					if (getGitLabAccountKey(account) !== getGitLabAccountKey(await loadGitLabAccount())) return;
					setAvailableRepos(repos);
					browser.storage.local.set({ gitlabRepoCache: { data: repos, cacheKey: key, timestamp: Date.now() } });
				}
				repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [getAvailableRepos().length]);
				if (document.activeElement === repoSearch) filterAndDisplayRepos(repoSearch.value.toLowerCase());
			} catch (err) {
				repoStatus.textContent = `Error: ${err.message}`;
			} finally {
				repoSearch.classList.remove('repository-search-loading');
			}
		},
		async validateOrgOnBlur(org) {
			const groups = parseGitlabGroups(org);
			if (groups.length === 0) {
				window.clearScrumHelperToast?.();
				const gitlabGroupInput = document.getElementById('gitlabGroupInput');
				if (gitlabGroupInput) {
					gitlabGroupInput.classList.remove('input-error', 'shake-animation');
				}
				return;
			}
			let invalidGroups;
			try {
				const { apiBaseUrl, token } = await loadGitLabAccount();
				const headers = token ? { 'PRIVATE-TOKEN': token } : {};
				const results = await Promise.all(
					groups.map(async (group) => {
						const res = await requestGitLab(apiBaseUrl, `${apiBaseUrl}/groups/${encodeURIComponent(group)}`, headers);
						if (res.status === 404) return group;
						if (!res.ok) throw new Error(`GitLab group lookup failed (HTTP ${res.status}).`);
						return null;
					}),
				);
				invalidGroups = results.filter(Boolean);
			} catch (err) {
				window.showPopupMessage?.(err.message, { variant: 'error' });
				return;
			}

			if (invalidGroups.length > 0) {
				const message =
					invalidGroups.length === 1
						? `Organization "${invalidGroups[0]}" not found on GitLab.`
						: `Organizations "${invalidGroups.join(', ')}" not found on GitLab.`;
				if (window.showPopupMessage) {
					window.showPopupMessage(message, { variant: 'error' });
				}
				window.triggerInputError?.('gitlabGroupInput', { focus: true, clearOnInput: true });
				return;
			}

			window.clearScrumHelperToast?.();
			const gitlabGroupInput = document.getElementById('gitlabGroupInput');
			if (gitlabGroupInput) {
				gitlabGroupInput.classList.remove('input-error', 'shake-animation');
			}
			browser.storage.local.remove(['gitlabCache', 'gitlabRepoCache']);
		},
		async fetchUserRepositories(username, _token, org = '', account) {
			const { apiBaseUrl: baseUrl, token } = account ?? (await loadGitLabAccount());
			const headers = {};
			if (token) {
				headers['PRIVATE-TOKEN'] = token;
			}

			console.log('[GitLab repo filter] Fetching GitLab user info for:', username);
			const userRes = await requestGitLab(
				baseUrl,
				`${baseUrl}/users?username=${encodeURIComponent(username)}`,
				headers,
			);
			if (!userRes.ok) {
				throw new Error(`GitLab user fetch failed: ${userRes.status}`);
			}
			const users = await userRes.json();
			if (!users.length) {
				const err = new Error(
					chrome?.i18n?.getMessage('gitlabUserNotFoundError', [username]) || `GitLab user "${username}" not found.`,
				);
				err.code = 'USERNAME_VALIDATION';
				err.platform = 'gitlab';
				err.username = username;
				throw err;
			}
			const userId = users[0].id;

			let startDate;
			let endDate;
			try {
				const storageData = await new Promise((resolve) => {
					browser.storage.local.get(['startingDate', 'endingDate', 'yesterdayContribution'], resolve);
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

			const prevDay = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000);
			const afterDateStr = prevDay.toISOString().split('T')[0];

			const nextDay = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000);
			const beforeDateStr = nextDay.toISOString().split('T')[0];

			console.log(
				`[GitLab repo filter] Fetching events for userId: ${userId} between ${afterDateStr} and ${beforeDateStr}`,
			);

			let page = 1;
			let hasMore = true;
			const events = [];
			while (hasMore) {
				const eventsUrl = `${baseUrl}/users/${userId}/events?after=${afterDateStr}&before=${beforeDateStr}&per_page=100&page=${page}`;
				const eventsRes = await requestGitLab(baseUrl, eventsUrl, headers);
				if (!eventsRes.ok) {
					throw new Error(`GitLab events fetch failed: ${eventsRes.status}`);
				}
				const pageEvents = await eventsRes.json();
				if (pageEvents.length < 100) {
					hasMore = false;
				}
				events.push(...pageEvents);
				page++;
			}

			const projectIds = Array.from(new Set(events.map((e) => e.project_id).filter((id) => !!id)));
			console.log(`[GitLab repo filter] Found ${projectIds.length} unique project IDs from push events`);

			if (projectIds.length === 0) {
				return [];
			}

			const filterOrgs = org && org !== 'all' ? parseGitlabGroups(org) : [];
			const repos = [];
			const fetchPromises = projectIds.map(async (projectId) => {
				try {
					const projectRes = await requestGitLab(baseUrl, `${baseUrl}/projects/${projectId}`, headers);
					if (projectRes.ok) {
						const project = await projectRes.json();

						// If this project is a fork, we include the fork project itself but keep track of upstream path.
						if (project.forked_from_project) {
							const upstream = project.forked_from_project;
							let includeUpstream = true;
							if (filterOrgs.length > 0) {
								const upstreamPath = upstream.path_with_namespace?.toLowerCase() || '';
								const matchesAny = filterOrgs.some((o) => upstreamPath.startsWith(o + '/'));
								if (!matchesAny) {
									includeUpstream = false;
								}
							}

							if (includeUpstream) {
								repos.push({
									name: project.name,
									fullName: project.path_with_namespace,
									description: project.description || '',
									language: null,
									updatedAt: project.last_activity_at, // Use the fork's activity timestamp as the user contribution date
									stars: project.star_count || 0,
									forkedFrom: upstream.path_with_namespace,
								});
							}
						} else {
							let includeProject = true;
							if (filterOrgs.length > 0) {
								const namespacePath = project.namespace?.path?.toLowerCase() || '';
								const pathWithNamespace = project.path_with_namespace?.toLowerCase() || '';
								const matchesAny = filterOrgs.some((o) => namespacePath === o || pathWithNamespace.startsWith(o + '/'));
								if (!matchesAny) {
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
		fetchAssignedIssues: fetchIssuesFromGitLab,
	});
}
