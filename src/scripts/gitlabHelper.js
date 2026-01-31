// GitLab API Helper for Scrum Helper Extension
class GitLabHelper {
	constructor() {
		this.baseUrl = 'https://gitlab.com/api/v4';
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
				}
				resolve();
			});
		});
	}

	async fetchGitLabData(username, startDate, endDate) {
		const cacheKey = `${username}-${startDate}-${endDate}`;

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
			const userRes = await fetch(userUrl);
			if (!userRes.ok) {
				throw new Error(`Error fetching GitLab user: ${userRes.status} ${userRes.statusText}`);
			}
			const users = await userRes.json();
			if (users.length === 0) {
				throw new Error(`GitLab user '${username}' not found`);
			}
			const userId = users[0].id;

			// Fetch all projects the user is a member of (including group projects)
			const membershipProjectsUrl = `${this.baseUrl}/users/${userId}/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;
			const membershipProjectsRes = await fetch(membershipProjectsUrl);
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
			this.cache.queue.forEach(({ resolve }) => resolve(gitlabData));
			this.cache.queue = [];

			return gitlabData;
		} catch (err) {
			console.error('GitLab Fetch Failed:', err);
			// Reject queued calls on error
			this.cache.queue.forEach(({ reject }) => reject(err));
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
				const res = await fetch(url);
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
				const res = await fetch(url);
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
