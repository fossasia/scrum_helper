// GitLab API Helper for Scrum Helper Extension
class GitLabHelper {
	constructor() {
		this.baseUrl = 'https://gitlab.com/api/v4';
		this.graphqlUrl = 'https://gitlab.com/api/graphql';
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
		return new Promise((resolve) => {
			chrome.storage.local.get(['cacheInput'], (items) => {
				const ttl = items.cacheInput ? Number.parseInt(items.cacheInput) * 60 * 1000 : 10 * 60 * 1000;
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
					console.log('Restored GitLab cache from storage');
				}
				resolve();
			});
		});
	}

	// Optimized GraphQL method for GitLab data fetching
	async fetchGitLabDataGraphQL(username, startDate, endDate, token = null) {
		const cacheKey = `${username}-${startDate}-${endDate}-${token ? 'auth-graphql' : 'public-graphql'}`;

		if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
			console.log('GitLab GraphQL fetch already in progress or data already fetched. Skipping fetch.');
			return this.cache.data;
		}

		console.log('Fetching GitLab data via GraphQL:', {
			username: username,
			startDate: startDate,
			endDate: endDate,
			hasToken: !!token,
		});

		// Check if we need to load from storage
		if (!this.cache.data && !this.cache.fetching) {
			await this.loadFromStorage();
		}

		const currentTTL = await this.getCacheTTL();
		this.cache.ttl = currentTTL;
		console.log(`GitLab GraphQL caching for ${currentTTL / (60 * 1000)} minutes`);

		const now = Date.now();
		const isCacheFresh = now - this.cache.timestamp < this.cache.ttl;
		const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

		if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
			console.log('Using cached GitLab GraphQL data - cache is fresh and key matches');
			return this.cache.data;
		}

		if (!isCacheKeyMatch) {
			console.log('GitLab GraphQL cache key mismatch - fetching new data');
			this.cache.data = null;
		} else if (!isCacheFresh) {
			console.log('GitLab GraphQL cache is stale - fetching new data');
		}

		if (this.cache.fetching) {
			console.log('GitLab GraphQL fetch in progress, queuing requests');
			return new Promise((resolve, reject) => {
				this.cache.queue.push({ resolve, reject });
			});
		}

		this.cache.fetching = true;
		this.cache.cacheKey = cacheKey;

		try {
			// Throttling 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			// Comprehensive GraphQL query for GitLab data
			const graphqlQuery = `
				query($username: String!, $startDate: Time!, $endDate: Time!) {
					user(username: $username) {
						id
						name
						username
						projects {
							nodes {
								id
								name
								path
								webUrl
								mergeRequests(authorUsernames: [$username], createdAfter: $startDate, createdBefore: $endDate) {
									nodes {
										id
										iid
										title
										state
										createdAt
										updatedAt
										webUrl
										project {
											id
											name
											path
										}
									}
								}
								issues(authorUsernames: [$username], createdAfter: $startDate, createdBefore: $endDate) {
									nodes {
										id
										iid
										title
										state
										createdAt
										updatedAt
										webUrl
										project {
											id
											name
											path
										}
									}
								}
							}
						}
					}
				}
			`;

			const variables = {
				username: username,
				startDate: `${startDate}T00:00:00Z`,
				endDate: `${endDate}T23:59:59Z`,
			};

			const headers = {
				'Content-Type': 'application/json',
			};

			if (token) {
				headers.Authorization = `Bearer ${token}`;
			}

			const graphqlRes = await fetch(this.graphqlUrl, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify({
					query: graphqlQuery,
					variables: variables,
				}),
			});

			if (!graphqlRes.ok) {
				throw new Error(`GraphQL request failed: ${graphqlRes.status} ${graphqlRes.statusText}`);
			}

			const graphqlData = await graphqlRes.json();
			console.log('GraphQL response:', graphqlData);

			if (graphqlData.errors) {
				console.error('GraphQL errors:', graphqlData.errors);
				// Fallback to REST API if GraphQL fails
				console.log('GraphQL failed, falling back to REST API...');
				this.cache.fetching = false;
				return this.fetchGitLabDataREST(username, startDate, endDate, token);
			}

			// Process GraphQL response
			const user = graphqlData.data?.user;
			if (!user) {
				throw new Error(`GitLab user '${username}' not found`);
			}

			// Extract data from GraphQL response
			const projects = user.projects?.nodes || [];
			const allMergeRequests = [];
			const allIssues = [];

			for (const project of projects) {
				// Add merge requests
				if (project.mergeRequests?.nodes) {
					for (const mr of project.mergeRequests.nodes) {
						allMergeRequests.push({
							...mr,
							project_id: project.id,
							web_url: mr.webUrl,
						});
					}
				}

				// Add issues
				if (project.issues?.nodes) {
					for (const issue of project.issues.nodes) {
						allIssues.push({
							...issue,
							project_id: project.id,
							web_url: issue.webUrl,
						});
					}
				}
			}

			const gitlabData = {
				user: {
					id: user.id,
					name: user.name,
					username: user.username,
				},
				projects: projects,
				mergeRequests: allMergeRequests,
				issues: allIssues,
				comments: [], // GraphQL doesn't fetch comments by default
			};

			console.log('GitLab GraphQL data fetched:', {
				user: gitlabData.user?.username,
				projectsCount: gitlabData.projects?.length || 0,
				mergeRequestsCount: gitlabData.mergeRequests?.length || 0,
				issuesCount: gitlabData.issues?.length || 0,
			});

			// Cache the data
			this.cache.data = gitlabData;
			this.cache.timestamp = Date.now();

			await this.saveToStorage(gitlabData);

			// Resolve queued calls
			this.cache.queue.forEach(({ resolve }) => resolve(gitlabData));
			this.cache.queue = [];

			return gitlabData;
		} catch (err) {
			console.error('GitLab GraphQL Fetch Failed:', err);
			// Fallback to REST API
			console.log('Falling back to REST API...');
			this.cache.fetching = false;
			return this.fetchGitLabDataREST(username, startDate, endDate, token);
		} finally {
			this.cache.fetching = false;
		}
	}

	// Optimized REST method with batch operations
	async fetchGitLabDataREST(username, startDate, endDate, token = null) {
		const cacheKey = `${username}-${startDate}-${endDate}-${token ? 'auth-rest' : 'public-rest'}`;

		// Reset cache state when falling back from GraphQL
		if (this.cache.cacheKey?.includes('graphql')) {
			console.log('Resetting cache state for REST fallback');
			this.cache.data = null;
			this.cache.cacheKey = null;
			this.cache.timestamp = 0;
			this.cache.fetching = false;
		}

		if (this.cache.fetching || (this.cache.cacheKey === cacheKey && this.cache.data)) {
			console.log('GitLab REST fetch already in progress or data already fetched. Skipping fetch.');
			return this.cache.data;
		}

		console.log('Fetching GitLab data via REST:', {
			username: username,
			startDate: startDate,
			endDate: endDate,
			hasToken: !!token,
		});

		// Check if we need to load from storage
		if (!this.cache.data && !this.cache.fetching) {
			await this.loadFromStorage();
		}

		const currentTTL = await this.getCacheTTL();
		this.cache.ttl = currentTTL;
		console.log(`GitLab REST caching for ${currentTTL / (60 * 1000)} minutes`);

		const now = Date.now();
		const isCacheFresh = now - this.cache.timestamp < this.cache.ttl;
		const isCacheKeyMatch = this.cache.cacheKey === cacheKey;

		if (this.cache.data && isCacheFresh && isCacheKeyMatch) {
			console.log('Using cached GitLab REST data - cache is fresh and key matches');
			return this.cache.data;
		}

		if (!isCacheKeyMatch) {
			console.log('GitLab REST cache key mismatch - fetching new data');
			this.cache.data = null;
		} else if (!isCacheFresh) {
			console.log('GitLab REST cache is stale - fetching new data');
		}

		if (this.cache.fetching) {
			console.log('GitLab REST fetch in progress, queuing requests');
			return new Promise((resolve, reject) => {
				this.cache.queue.push({ resolve, reject });
			});
		}

		this.cache.fetching = true;
		this.cache.cacheKey = cacheKey;

		try {
			// Throttling 500ms to avoid burst
			await new Promise((res) => setTimeout(res, 500));

			const headers = token ? { Authorization: `Bearer ${token}` } : {};

			// Get user info first
			const userUrl = `${this.baseUrl}/users?username=${username}`;
			console.log('GitLab API call with headers:', {
				url: userUrl,
				hasToken: !!token,
				headers: headers,
			});
			const userRes = await fetch(userUrl, { headers: headers });
			console.log('GitLab user API response:', {
				status: userRes.status,
				statusText: userRes.statusText,
				headers: Object.fromEntries(userRes.headers.entries()),
			});
			if (!userRes.ok) {
				throw new Error(`Error fetching GitLab user: ${userRes.status} ${userRes.statusText}`);
			}
			const users = await userRes.json();
			if (users.length === 0) {
				throw new Error(`GitLab user '${username}' not found`);
			}
			const userId = users[0].id;

			// If we have a token, use optimized endpoints
			if (token) {
				console.log('Using authenticated endpoints for optimized data fetching');
				return await this.fetchGitLabDataAuthenticated(userId, username, startDate, endDate, token);
			} else {
				console.log('Using public endpoints for data fetching');
				return await this.fetchGitLabDataPublic(userId, username, startDate, endDate);
			}
		} catch (err) {
			console.error('GitLab REST Fetch Failed:', err);
			// Reject queued calls on error
			this.cache.queue.forEach(({ reject }) => reject(err));
			this.cache.queue = [];
			throw err;
		} finally {
			this.cache.fetching = false;
		}
	}

	// Optimized method for authenticated requests
	async fetchGitLabDataAuthenticated(userId, username, startDate, endDate, token) {
		const headers = { Authorization: `Bearer ${token}` };

		// Get user's projects first (optimized with token)
		const projectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
		console.log('GitLab authenticated projects API call:', {
			url: projectsUrl,
			hasToken: !!token,
		});

		const projectsRes = await fetch(projectsUrl, { headers });
		if (!projectsRes.ok) {
			throw new Error(`Error fetching GitLab projects: ${projectsRes.status} ${projectsRes.statusText}`);
		}

		const projects = await projectsRes.json();
		console.log(`Fetched ${projects.length} GitLab projects`);

		// Use optimized endpoints to get merge requests and issues across all projects
		const mergeRequests = [];
		const issues = [];

		// Fetch merge requests using optimized endpoint
		const mrsUrl = `${this.baseUrl}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
		console.log('GitLab authenticated MRs API call:', {
			url: mrsUrl,
			hasToken: !!token,
		});

		const mrsRes = await fetch(mrsUrl, { headers });
		if (mrsRes.ok) {
			const mrs = await mrsRes.json();
			console.log(`Fetched ${mrs.length} merge requests`);
			mergeRequests.push(...mrs);
		} else {
			console.warn('Failed to fetch merge requests via optimized endpoint, falling back to project-by-project');
			// Fallback to project-by-project for merge requests
			for (const project of projects) {
				try {
					const projectMRsUrl = `${this.baseUrl}/projects/${project.id}/merge_requests?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const projectMRsRes = await fetch(projectMRsUrl, { headers });
					if (projectMRsRes.ok) {
						const projectMRs = await projectMRsRes.json();
						mergeRequests.push(...projectMRs);
					}
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					console.error(`Error fetching MRs for project ${project.name}:`, error);
				}
			}
		}

		// Fetch issues using optimized endpoint
		const issuesUrl = `${this.baseUrl}/issues?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
		console.log('GitLab authenticated Issues API call:', {
			url: issuesUrl,
			hasToken: !!token,
		});

		const issuesRes = await fetch(issuesUrl, { headers });
		if (issuesRes.ok) {
			const fetchedIssues = await issuesRes.json();
			console.log(`Fetched ${fetchedIssues.length} issues`);
			issues.push(...fetchedIssues);
		} else {
			console.warn('Failed to fetch issues via optimized endpoint, falling back to project-by-project');
			// Fallback to project-by-project for issues
			for (const project of projects) {
				try {
					const projectIssuesUrl = `${this.baseUrl}/projects/${project.id}/issues?author_id=${userId}&created_after=${startDate}T00:00:00Z&created_before=${endDate}T23:59:59Z&per_page=100&order_by=updated_at&sort=desc`;
					const projectIssuesRes = await fetch(projectIssuesUrl, { headers });
					if (projectIssuesRes.ok) {
						const projectIssues = await projectIssuesRes.json();
						issues.push(...projectIssues);
					}
					await new Promise((resolve) => setTimeout(resolve, 100));
				} catch (error) {
					console.error(`Error fetching issues for project ${project.name}:`, error);
				}
			}
		}

		const gitlabData = {
			user: { id: userId, username: username },
			projects: projects,
			mergeRequests: mergeRequests,
			issues: issues,
			comments: [],
		};

		console.log('GitLab authenticated data fetched:', {
			user: gitlabData.user?.username,
			projectsCount: gitlabData.projects?.length || 0,
			mergeRequestsCount: gitlabData.mergeRequests?.length || 0,
			issuesCount: gitlabData.issues?.length || 0,
		});

		// Cache the data
		this.cache.data = gitlabData;
		this.cache.timestamp = Date.now();

		await this.saveToStorage(gitlabData);

		// Resolve queued calls
		this.cache.queue.forEach(({ resolve }) => resolve(gitlabData));
		this.cache.queue = [];

		return gitlabData;
	}

	// Method for public API requests (fallback)
	async fetchGitLabDataPublic(userId, username, startDate, endDate) {
		// Fetch all projects the user is a member of (including group projects)
		const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
		console.log('GitLab membership projects API call:', {
			url: membershipProjectsUrl,
		});
		const membershipProjectsRes = await fetch(membershipProjectsUrl);
		console.log('GitLab membership projects response:', {
			status: membershipProjectsRes.status,
			statusText: membershipProjectsRes.statusText,
			rateLimitRemaining: membershipProjectsRes.headers.get('X-RateLimit-Remaining'),
			rateLimitLimit: membershipProjectsRes.headers.get('X-RateLimit-Limit'),
		});
		if (!membershipProjectsRes.ok) {
			throw new Error(
				`Error fetching GitLab membership projects: ${membershipProjectsRes.status} ${membershipProjectsRes.statusText}`,
			);
		}
		const membershipProjects = await membershipProjectsRes.json();

		// Fetch all projects the user has contributed to (public, group, etc.)
		const contributedProjectsUrl = `${this.baseUrl}/users/${userId}/contributed_projects?per_page=100&order_by=updated_at&sort=desc`;
		const contributedProjectsRes = await fetch(contributedProjectsUrl);
		if (!contributedProjectsRes.ok) {
			throw new Error(
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
				console.log('GitLab MR API call:', {
					url: projectMRsUrl,
					project: project.name,
				});
				const projectMRsRes = await fetch(projectMRsUrl);
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
				console.log('GitLab Issues API call:', {
					url: projectIssuesUrl,
					project: project.name,
				});
				const projectIssuesRes = await fetch(projectIssuesUrl);
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
			user: { id: userId, username: username },
			projects: allProjects,
			mergeRequests: allMergeRequests,
			issues: allIssues,
			comments: [],
		};

		console.log('GitLab public data fetched:', {
			user: gitlabData.user?.username,
			projectsCount: gitlabData.projects?.length || 0,
			mergeRequestsCount: gitlabData.mergeRequests?.length || 0,
			issuesCount: gitlabData.issues?.length || 0,
		});

		// Cache the data
		this.cache.data = gitlabData;
		this.cache.timestamp = Date.now();

		await this.saveToStorage(gitlabData);

		// Resolve queued calls
		this.cache.queue.forEach(({ resolve }) => resolve(gitlabData));
		this.cache.queue = [];

		return gitlabData;
	}

	// Main method that chooses between GraphQL and REST
	async fetchGitLabData(username, startDate, endDate, token = null) {
		// Only try GraphQL if we have a token (GraphQL works better with authentication)
		if (token) {
			console.log('Token provided, attempting GraphQL for GitLab data fetch...');
			try {
				return await this.fetchGitLabDataGraphQL(username, startDate, endDate, token);
			} catch (error) {
				console.log('GraphQL failed, falling back to REST API...');
				return await this.fetchGitLabDataREST(username, startDate, endDate, token);
			}
		} else {
			console.log('No token provided, using REST API directly for GitLab data fetch...');
			return await this.fetchGitLabDataREST(username, startDate, endDate, token);
		}
	}

	async getDetailedMergeRequests(mergeRequests, token = null) {
		const detailed = [];
		const headers = token ? { Authorization: `Bearer ${token}` } : {};
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
		const detailed = [];
		const headers = token ? { Authorization: `Bearer ${token}` } : {};
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
		console.log('[GITLAB-DEBUG] processGitLabData input:', data);
		console.log('[GITLAB-DEBUG] processGitLabData output:', processed);
		console.log('GitLab data processed:', {
			mergeRequests: processed.mergeRequests.length,
			issues: processed.issues.length,
			comments: processed.comments.length,
			user: processed.user?.username,
		});

		return processed;
	}
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GitLabHelper;
} else {
	window.GitLabHelper = GitLabHelper;
}
