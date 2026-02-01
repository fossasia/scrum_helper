// GitLab API Helper for Scrum Helper Extension
class GitLabHelper {
	constructor(token = null) {
		this.baseUrl = 'https://gitlab.com/api/v4';
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

	getHeaders() {
		const headers = {
			'Content-Type': 'application/json',
		};
		if (this.token) {
			// GitLab Personal Access Token authentication
			headers['PRIVATE-TOKEN'] = this.token;
			console.log('[GITLAB] Using authenticated requests with token');
		} else {
			console.log('[GITLAB] Using unauthenticated requests');
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
				console.log('[GITLAB] Token validation successful:', user.username);
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
			const userUrl = `${this.baseUrl}/users?username=${username}`;
			const userRes = await this.fetchWithTimeout(userUrl, { headers: this.getHeaders() }, 10000);
			const users = await this.handleApiResponse(userRes, 'fetching user for projects');
			
			if (users.length === 0) {
				throw new Error(`GitLab user '${username}' not found`);
			}
			const userId = users[0].id;

			// Fetch user's projects
			const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
			const membershipProjectsRes = await this.fetchWithTimeout(membershipProjectsUrl, { headers: this.getHeaders() }, 15000);
			const membershipProjects = await this.handleApiResponse(membershipProjectsRes, 'fetching user projects');

			// Fetch contributed projects
			const contributedProjectsUrl = `${this.baseUrl}/users/${userId}/contributed_projects?per_page=100&order_by=updated_at&sort=desc`;
			const contributedProjectsRes = await this.fetchWithTimeout(contributedProjectsUrl, { headers: this.getHeaders() }, 15000);
			const contributedProjects = await this.handleApiResponse(contributedProjectsRes, 'fetching contributed projects');

			// Merge and deduplicate
			const allProjectsMap = new Map();
			for (const p of [...membershipProjects, ...contributedProjects]) {
				allProjectsMap.set(p.id, p);
			}
			const projects = Array.from(allProjectsMap.values());

			console.log(`[GITLAB] Fetched ${projects.length} projects for user ${username}`);
			return projects.map(p => ({
				id: p.id,
				name: p.name,
				path: p.path_with_namespace,
				description: p.description || '',
				visibility: p.visibility,
				namespace: p.namespace ? p.namespace.name : ''
			}));
		} catch (error) {
			console.error('[GITLAB] Error fetching user projects:', error);
			throw error;
		}
	}

	async getCacheTTL() {
		return new Promise((resolve) => {
			chrome.storage.local.get(['cacheInput'], (items) => {
				const ttl = items.cacheInput ? Number.parseInt(items.cacheInput, 10) * 60 * 1000 : 10 * 60 * 1000;
				resolve(ttl);
			});
		});
	}

	async saveToStorage(data) {
		return new Promise((resolve) => {
			chrome.storage.local.set(
				{
					gitlabCache: {
						data: data,
						cacheKey: this.cache.cacheKey,
						timestamp: this.cache.timestamp,
					},
				},
				resolve,
			);
		});
	}

	async loadFromStorage() {
		return new Promise((resolve) => {
			chrome.storage.local.get(['gitlabCache'], (items) => {
				if (items.gitlabCache) {
					this.cache.data = items.gitlabCache.data;
					this.cache.cacheKey = items.gitlabCache.cacheKey;
					this.cache.timestamp = items.gitlabCache.timestamp;
				}
				resolve();
			});
		});
	}

	async fetchGitLabData(username, startDate, endDate, group = '', selectedProjects = []) {
		const cacheKey = `${username}-${startDate}-${endDate}-${group}-${selectedProjects.join(',')}`;

		if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
			return this.cache.data;
		}

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

		try {
			// Throttling 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			// Get user info first
			const userUrl = `${this.baseUrl}/users?username=${username}`;
			const userRes = await this.fetchWithTimeout(userUrl, { headers: this.getHeaders() });
			const users = await this.handleApiResponse(userRes, 'fetching user');
			if (users.length === 0) {
				throw new Error(`GitLab user '${username}' not found`);
			}
			const userId = users[0].id;

			// Fetch all projects the user is a member of (including group projects)
			const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
			const membershipProjectsRes = await this.fetchWithTimeout(membershipProjectsUrl, { headers: this.getHeaders() });
			const membershipProjects = await this.handleApiResponse(membershipProjectsRes, 'fetching membership projects');

			// Fetch all projects the user has contributed to (public, group, etc.)
			const contributedProjectsUrl = `${this.baseUrl}/users/${userId}/contributed_projects?per_page=100&order_by=updated_at&sort=desc`;
			const contributedProjectsRes = await this.fetchWithTimeout(contributedProjectsUrl, {
				headers: this.getHeaders(),
			});
			const contributedProjects = await this.handleApiResponse(contributedProjectsRes, 'fetching contributed projects');

			// Merge and deduplicate projects by project id
			const allProjectsMap = new Map();
			for (const p of [...membershipProjects, ...contributedProjects]) {
				allProjectsMap.set(p.id, p);
			}
			let allProjects = Array.from(allProjectsMap.values());

			// Apply group filter if specified
			if (group && group.trim()) {
				const groupLower = group.trim().toLowerCase();
				allProjects = allProjects.filter(p => {
					// Check if project belongs to a group/namespace matching the filter
					if (p.namespace && p.namespace.path) {
						return p.namespace.path.toLowerCase().includes(groupLower) || 
						       p.namespace.full_path.toLowerCase().includes(groupLower) ||
						       (p.namespace.name && p.namespace.name.toLowerCase().includes(groupLower));
					}
					return false;
				});
				console.log(`[GITLAB] Filtered ${allProjects.length} projects by group: ${group}`);
			}

			// Apply project filter if specified
			if (selectedProjects && selectedProjects.length > 0) {
				const selectedProjectIds = selectedProjects.map(id => parseInt(id, 10));
				allProjects = allProjects.filter(p => selectedProjectIds.includes(p.id));
				console.log(`[GITLAB] Filtered to ${allProjects.length} selected projects`);
			}

			// Fetch merge requests from each project (works without auth for public projects)
			let allMergeRequests = [];
			let mrErrors = 0;
			for (const project of allProjects) {
				try {
					const projectMRsUrl = `${this.baseUrl}/projects/${project.id}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const projectMRsRes = await this.fetchWithTimeout(projectMRsUrl, { headers: this.getHeaders() }, 15000);
					if (projectMRsRes.ok) {
						const projectMRs = await projectMRsRes.json();
						allMergeRequests = allMergeRequests.concat(projectMRs);
					} else if (projectMRsRes.status === 403 || projectMRsRes.status === 401) {
						// Log but continue - might be a private project user doesn't have access to
						console.warn(`Access denied for project ${project.name} MRs - skipping`);
						mrErrors++;
					} else {
						console.error(`Error fetching MRs for project ${project.name}: ${projectMRsRes.status}`);
						mrErrors++;
					}
					// Add small delay to avoid rate limiting
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					console.error(`Error fetching MRs for project ${project.name}:`, error.message);
					mrErrors++;
					// Continue with other projects - graceful degradation
				}
			}
			if (mrErrors > 0) {
				console.warn(`Failed to fetch merge requests from ${mrErrors} project(s). Continuing with available data.`);
			}

			// Fetch issues from each project (works without auth for public projects)
			let allIssues = [];
			let issueErrors = 0;
			for (const project of allProjects) {
				try {
					const projectIssuesUrl = `${this.baseUrl}/projects/${project.id}/issues?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const projectIssuesRes = await this.fetchWithTimeout(projectIssuesUrl, { headers: this.getHeaders() }, 15000);
					if (projectIssuesRes.ok) {
						const projectIssues = await projectIssuesRes.json();
						allIssues = allIssues.concat(projectIssues);
					} else if (projectIssuesRes.status === 403 || projectIssuesRes.status === 401) {
						console.warn(`Access denied for project ${project.name} issues - skipping`);
						issueErrors++;
					} else {
						console.error(`Error fetching issues for project ${project.name}: ${projectIssuesRes.status}`);
						issueErrors++;
					}
					// Add small delay to avoid rate limiting
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					console.error(`Error fetching issues for project ${project.name}:`, error.message);
					issueErrors++;
					// Continue with other projects
				}
			}
			if (issueErrors > 0) {
				console.warn(`Failed to fetch issues from ${issueErrors} project(s). Continuing with available data.`);
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

	async getDetailedMergeRequests(mergeRequests) {
		const detailed = [];
		for (const mr of mergeRequests) {
			try {
				const url = `${this.baseUrl}/projects/${mr.project_id}/merge_requests/${mr.iid}`;
				const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() }, 10000);
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

	async getDetailedIssues(issues) {
		const detailed = [];
		for (const issue of issues) {
			try {
				const url = `${this.baseUrl}/projects/${issue.project_id}/issues/${issue.iid}`;
				const res = await this.fetchWithTimeout(url, { headers: this.getHeaders() }, 10000);
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
