// GitLab API Helper for Scrum Helper Extension
const DEFAULT_GITLAB_API_BASE_URL = 'https://gitlab.com/api/v4';

function normalizeGitLabApiBaseUrl(apiBaseUrl) {
	const value = typeof apiBaseUrl === 'string' && apiBaseUrl.trim() ? apiBaseUrl.trim() : DEFAULT_GITLAB_API_BASE_URL;
	return value.replace(/\/+$/, '');
}

class GitLabHelper {
	static debug = false;
	constructor(token = null, apiBaseUrl = DEFAULT_GITLAB_API_BASE_URL) {
		this.baseUrl = normalizeGitLabApiBaseUrl(apiBaseUrl);
		this.token = token;
		this.cache = {
			data: null,
			cacheKey: null,
			timestamp: 0,
			ttl: 10 * 60 * 1000, // 10 minutes
			fetching: false,
			queue: [],
		};
	}

	// Accept an optional overrideToken to allow callers to request headers
	// for a specific token without mutating `this.token`.
	// Semantics:
	//  - `overrideToken === undefined` -> use the instance token (`this.token`)
	//  - `overrideToken === null` -> force no token (unauthenticated request)
	//  - otherwise -> use the provided override token (may be empty string)
	getHeaders(overrideToken = undefined) {
		const headers = {
			Accept: 'application/json',
		};

		let tokenToUse;
		if (typeof overrideToken === 'undefined') {
			tokenToUse = this.token;
		} else {
			// explicit null means "force no token"
			tokenToUse = overrideToken;
		}

		if (tokenToUse) {
			// GitLab Personal Access Token authentication
			headers['PRIVATE-TOKEN'] = tokenToUse;
			if (GitLabHelper.debug) console.log('[GITLAB] Using authenticated requests with token');
		} else {
			if (GitLabHelper.debug) console.log('[GITLAB] Using unauthenticated requests');
		}
		return headers;
	}

	async fetchWithTimeout(url, options = {}, timeout = 30000) {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});
			clearTimeout(id);
			return response;
		} catch (error) {
			clearTimeout(id);
			if (error.name === 'AbortError') {
				throw new Error('Request timeout - GitLab API is taking too long to respond');
			}
			throw error;
		}
	}

	async handleApiResponse(response, context = '') {
		if (response.ok) {
			return await response.json();
		}

		const status = response.status;
		const contextMsg = context ? ` (${context})` : '';

		// Handle specific HTTP error codes
		switch (status) {
			case 401:
				throw new Error(`Authentication failed${contextMsg}. Please check your GitLab token.`);
			case 403: {
				const rateLimitRemaining = response.headers.get('RateLimit-Remaining');
				if (rateLimitRemaining === '0') {
					const resetTime = response.headers.get('RateLimit-Reset');
					const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'soon';
					throw new Error(`Rate limit exceeded${contextMsg}. Please try again at ${resetDate}.`);
				}
				throw new Error(`Access forbidden${contextMsg}. Token may lack required permissions (read_api scope needed).`);
			}
			case 404:
				throw new Error(`Resource not found${contextMsg}. The user or project may not exist.`);
			case 429:
				throw new Error(`Too many requests${contextMsg}. Please wait a moment and try again.`);
			case 500:
			case 502:
			case 503:
			case 504:
				throw new Error(`GitLab server error${contextMsg}. Please try again later.`);
			default:
				throw new Error(`API error${contextMsg}: ${status} ${response.statusText}`);
		}
	}

	async validateToken() {
		if (!this.token) {
			return {
				valid: false,
				error: 'No token provided',
				message: 'Please enter a token first',
			};
		}

		try {
			const response = await this.fetchWithTimeout(
				`${this.baseUrl}/user`,
				{ headers: this.getHeaders() },
				10000, // 10 second timeout for validation
			);

			if (response.ok) {
				const user = await response.json();
				if (GitLabHelper.debug) console.log('[GITLAB] Token validation successful:', user.username);
				return {
					valid: true,
					user: {
						username: user.username,
						name: user.name,
						id: user.id,
						email: user.email,
					},
				};
			}

			// Use centralized error handling
			const status = response.status;
			let message = '';

			if (status === 401) {
				message = 'Invalid or expired token. Please check and try again.';
			} else if (status === 403) {
				message = 'Token has insufficient permissions. Please ensure it has read_api scope.';
			} else {
				message = `Validation failed with status ${status}`;
			}

			console.warn('[GITLAB] Token validation failed:', status);
			return {
				valid: false,
				error: `HTTP ${status}`,
				message: message,
			};
		} catch (error) {
			console.warn('[GITLAB] Token validation error:', error);
			return {
				valid: false,
				error: error.message,
				message: error.message.includes('timeout')
					? 'Request timed out. Please check your connection and try again.'
					: 'Network error. Please check your connection.',
			};
		}
	}

	async fetchUserProjects(username) {
		if (!this.token) {
			console.warn('[GITLAB] Token required to fetch projects');
			return [];
		}

		try {
			// First get user ID
			const userUrl = `${this.baseUrl}/users?username=${encodeURIComponent(username)}`;
			const userRes = await this.fetchWithTimeout(userUrl, { headers: this.getHeaders() }, 10000);
			const users = await this.handleApiResponse(userRes, 'fetching user for projects');

			if (users.length === 0) {
				throw new Error(`GitLab user '${username}' not found`);
			}
			const userId = users[0].id;

			// Helper to fetch all pages for a given base URL using GitLab pagination headers
			const fetchAllProjectsForUrl = async (baseUrl, description) => {
				const allProjects = [];
				let page = 1;
				let hasNextPage = true;
				while (hasNextPage) {
					const urlWithPage = `${baseUrl}&page=${page}`;
					const res = await this.fetchWithTimeout(urlWithPage, { headers: this.getHeaders() }, 15000);
					const pageProjects = await this.handleApiResponse(res, description);
					if (Array.isArray(pageProjects) && pageProjects.length > 0) {
						allProjects.push(...pageProjects);
					}
					// GitLab provides X-Next-Page header; if empty, there are no more pages
					const nextPageHeader =
						res.headers && typeof res.headers.get === 'function' ? res.headers.get('x-next-page') : null;
					if (nextPageHeader) {
						const nextPageNumber = parseInt(nextPageHeader, 10);
						if (!isNaN(nextPageNumber) && nextPageNumber > page) {
							page = nextPageNumber;
						} else {
							// Malformed or non-incrementing next page; stop to avoid infinite loop
							hasNextPage = false;
						}
					} else {
						hasNextPage = false;
					}
				}
				return allProjects;
			};
			// Fetch user's projects (all pages)
			const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
			const membershipProjects = await fetchAllProjectsForUrl(membershipProjectsUrl, 'fetching user projects');
			// Fetch contributed projects (all pages)
			const contributedProjectsUrl = `${this.baseUrl}/users/${userId}/contributed_projects?per_page=100&order_by=updated_at&sort=desc`;
			const contributedProjects = await fetchAllProjectsForUrl(contributedProjectsUrl, 'fetching contributed projects');
			// Merge and deduplicate
			const allProjectsMap = new Map();
			for (const p of [...membershipProjects, ...contributedProjects]) {
				allProjectsMap.set(p.id, p);
			}
			const projects = Array.from(allProjectsMap.values());

			if (GitLabHelper.debug) console.log(`[GITLAB] Fetched ${projects.length} projects for user ${username}`);

			const projectsForLang = projects.slice(0, 30);
			const langResults = await Promise.allSettled(
				projectsForLang.map((p) =>
					this.fetchWithTimeout(`${this.baseUrl}/projects/${p.id}/languages`, { headers: this.getHeaders() }, 5000)
						.then((r) => (r.ok ? r.json() : {}))
						.catch(() => ({})),
				),
			);
			const languageMap = {};
			projectsForLang.forEach((p, i) => {
				const result = langResults[i];
				if (result.status === 'fulfilled' && result.value && typeof result.value === 'object') {
					const langs = Object.keys(result.value);
					languageMap[p.id] = langs[0] || null;
				} else {
					languageMap[p.id] = null;
				}
			});

			return projects.map((p) => ({
				id: p.id,
				name: p.name,
				// Keep both `path` (used by UI) and `path_with_namespace` (matches GitLab API shape)
				path: p.path_with_namespace,
				path_with_namespace: p.path_with_namespace,
				description: p.description || '',
				visibility: p.visibility,
				namespace: p.namespace ? p.namespace.name : '',
				star_count: p.star_count || 0,
				language: languageMap[p.id] || null,
			}));
		} catch (error) {
			console.error('[GITLAB] Error fetching user projects:', error);
			throw error;
		}
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

	async fetchGitLabData(username, startDate, endDate, token = undefined, group = '', selectedProjects = []) {
		const effectiveToken = typeof token === 'undefined' ? this.token : token;
		const tokenMarker = effectiveToken ? 'auth' : 'noauth';
		const cacheKey = `${this.baseUrl}-${username}-${startDate}-${endDate}-${tokenMarker}`;

		if (!this.cache.data && !this.cache.fetching) {
			await this.loadFromStorage();
		}

		const currentTTL = await this.getCacheTTL();
		this.cache.ttl = currentTTL;

		const now = Date.now();
		const isCacheFresh = now - this.cache.timestamp < this.cache.ttl;
		const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

		if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
			return this.applyFilters(this.cache.data, group, selectedProjects);
		}

		if (!isCacheKeyMatch) {
			this.cache.data = null;
		}

		if (this.cache.fetching) {
			const rawData = await new Promise((resolve, reject) => {
				this.cache.queue.push({ resolve, reject });
			});
			return this.applyFilters(rawData, group, selectedProjects);
		}

		this.cache.fetching = true;
		this.cache.cacheKey = cacheKey;

		try {
			// Throttling 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			// Get user info first
			const userUrl = `${this.baseUrl}/users?username=${encodeURIComponent(username)}`;
			const userRes = await this.fetchWithTimeout(userUrl, { headers: this.getHeaders(effectiveToken) });
			const users = await this.handleApiResponse(userRes, 'fetching user');
			if (users.length === 0) {
				throw new Error(`GitLab user '${username}' not found`);
			}
			const userId = users[0].id;

			const fetchAllPages = async (baseUrl, description) => {
				const all = [];
				let page = 1;
				const MAX_PAGE_ITERATIONS = 1000;
				let pageIterations = 0;
				while (true) {
					if (++pageIterations > MAX_PAGE_ITERATIONS) {
						console.warn(
							`fetchAllPages: reached max iterations (${MAX_PAGE_ITERATIONS}), aborting to avoid infinite loop.`,
						);
						break;
					}
					const urlWithPage = `${baseUrl}&page=${page}`;
					const res = await this.fetchWithTimeout(urlWithPage, { headers: this.getHeaders(effectiveToken) }, 15000);
					const pageItems = await this.handleApiResponse(res, description);
					if (Array.isArray(pageItems) && pageItems.length > 0) {
						all.push(...pageItems);
					}
					const nextPageHeader =
						res.headers && typeof res.headers.get === 'function' ? res.headers.get('x-next-page') : null;
					if (nextPageHeader) {
						const nextPageNumber = parseInt(nextPageHeader, 10);
						if (!isNaN(nextPageNumber)) {
							if (nextPageNumber > page) {
								page = nextPageNumber;
								continue;
							}
							break;
						}
					}
					break;
				}
				return all;
			};

			// Fetch all projects the user is a member of (including group projects)
			const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
			const membershipProjects = await fetchAllPages(membershipProjectsUrl, 'fetching membership projects');

			// Fetch all projects the user has contributed to (public, group, etc.)
			const contributedProjectsUrl = `${this.baseUrl}/users/${userId}/contributed_projects?per_page=100&order_by=updated_at&sort=desc`;
			const contributedProjects = await fetchAllPages(contributedProjectsUrl, 'fetching contributed projects');

			const allProjectsMap = new Map();
			for (const p of [...membershipProjects, ...contributedProjects]) {
				allProjectsMap.set(p.id, p);
			}
			const allProjects = Array.from(allProjectsMap.values());

			let allMergeRequests = [];
			let mrErrors = 0;
			for (const project of allProjects) {
				try {
					const projectMRsUrl = `${this.baseUrl}/projects/${project.id}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const projectMRs = await fetchAllPages(projectMRsUrl, `fetching MRs for project ${project.name}`);
					allMergeRequests = allMergeRequests.concat(projectMRs);
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					const msg = error.message;
					if (
						msg.includes('Access forbidden') ||
						msg.includes('Authentication failed') ||
						msg.includes('403') ||
						msg.includes('401')
					) {
						console.warn(`Access denied for project ${project.name} MRs - skipping`);
					} else {
						console.error(`Error fetching MRs for project ${project.name}:`, msg);
					}
					mrErrors++;
				}
			}
			if (mrErrors > 0) {
				console.warn(`Failed to fetch merge requests from ${mrErrors} project(s). Continuing with available data.`);
			}

			let allIssues = [];
			let issueErrors = 0;
			for (const project of allProjects) {
				try {
					const projectIssuesUrl = `${this.baseUrl}/projects/${project.id}/issues?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const projectIssues = await fetchAllPages(projectIssuesUrl, `fetching issues for project ${project.name}`);
					allIssues = allIssues.concat(projectIssues);
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					const msg = error.message;
					if (
						msg.includes('Access forbidden') ||
						msg.includes('Authentication failed') ||
						msg.includes('403') ||
						msg.includes('401')
					) {
						console.warn(`Access denied for project ${project.name} issues - skipping`);
					} else {
						console.error(`Error fetching issues for project ${project.name}:`, msg);
					}
					issueErrors++;
				}
			}
			if (issueErrors > 0) {
				console.warn(`Failed to fetch issues from ${issueErrors} project(s). Continuing with available data.`);
			}

			const gitlabData = {
				user: users[0],
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

			return this.applyFilters(gitlabData, group, selectedProjects);
		} catch (err) {
			console.error('GitLab Fetch Failed:', err);
			this.cache.queue.forEach(({ reject }) => {
				reject(err);
			});
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	applyFilters(data, group, selectedProjects) {
		if (!data) {
			return null;
		}

		let filteredProjects = data.projects || [];
		if (group && group.trim()) {
			const groupLower = group.trim().toLowerCase();
			filteredProjects = filteredProjects.filter((p) => {
				if (!p.namespace) {
					return false;
				}
				const namespacePath = (p.namespace.path ?? '').toLowerCase();
				const namespaceFullPath = (p.namespace.full_path ?? '').toLowerCase();
				const namespaceName = (p.namespace.name ?? '').toLowerCase();
				return (
					namespacePath.includes(groupLower) ||
					namespaceFullPath.includes(groupLower) ||
					namespaceName.includes(groupLower)
				);
			});
		}

		if (selectedProjects && selectedProjects.length > 0) {
			const selectedProjectIds = selectedProjects
				.map((id) => Number.parseInt(id, 10))
				.filter((id) => !Number.isNaN(id));
			filteredProjects = filteredProjects.filter((p) => selectedProjectIds.includes(p.id));
		}

		const filteredProjectIds = new Set(filteredProjects.map((p) => p.id));

		const filteredMergeRequests = (data.mergeRequests || []).filter((mr) => filteredProjectIds.has(mr.project_id));

		const filteredIssues = (data.issues || []).filter((issue) => filteredProjectIds.has(issue.project_id));

		return {
			user: data.user,
			projects: filteredProjects,
			mergeRequests: filteredMergeRequests,
			issues: filteredIssues,
			comments: data.comments || [],
		};
	}

	async getDetailedMergeRequests(mergeRequests, token = null) {
		const effectiveToken = typeof token === 'undefined' ? this.token : token;
		const detailed = [];
		for (const mr of mergeRequests) {
			try {
				const url = `${this.baseUrl}/projects/${mr.project_id}/merge_requests/${mr.iid}`;
				const res = await this.fetchWithTimeout(url, { headers: this.getHeaders(effectiveToken) }, 10000);
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
		const effectiveToken = typeof token === 'undefined' ? this.token : token;
		const detailed = [];
		for (const issue of issues) {
			try {
				const url = `${this.baseUrl}/projects/${issue.project_id}/issues/${issue.iid}`;
				const res = await this.fetchWithTimeout(url, { headers: this.getHeaders(effectiveToken) }, 10000);
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
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GitLabHelper;
} else {
	window.GitLabHelper = GitLabHelper;
}
