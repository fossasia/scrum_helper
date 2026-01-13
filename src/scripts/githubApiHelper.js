/**
 * GitHub API Helper for fetching user's assigned issues and PRs
 * Part of the planned work selection feature (#161)
 */

class GitHubApiHelper {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.token = null;
        this.username = null;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Set GitHub personal access token
     * @param {string} token - GitHub personal access token
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Set GitHub username
     * @param {string} username - GitHub username
     */
    setUsername(username) {
        this.username = username;
    }

    /**
     * Make authenticated API request
     * @param {string} endpoint - API endpoint
     * @returns {Promise} API response
     */
    async makeRequest(endpoint) {
        if (!this.token) {
            throw new Error('GitHub token not set. Please configure your token in settings.');
        }

        const cacheKey = endpoint;
        const cachedData = this.cache.get(cacheKey);
        
        if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpiry) {
            return cachedData.data;
        }

        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Scrum-Helper-Extension'
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, { headers });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid GitHub token. Please check your token in settings.');
                }
                if (response.status === 403) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                }
                throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('GitHub API request failed:', error);
            throw error;
        }
    }

    /**
     * Get current user information
     * @returns {Promise} User information
     */
    async getCurrentUser() {
        const user = await this.makeRequest('/user');
        this.username = user.login;
        return user;
    }

    /**
     * Fetch user's assigned issues
     * @param {string} state - Issue state ('open', 'closed', 'all')
     * @returns {Promise} Array of assigned issues
     */
    async getAssignedIssues(state = 'open') {
        const issues = await this.makeRequest(`/issues?filter=assigned&state=${state}&sort=updated&per_page=100`);
        return this.formatIssues(issues);
    }

    /**
     * Fetch user's pull requests
     * @param {string} state - PR state ('open', 'closed', 'all')
     * @returns {Promise} Array of pull requests
     */
    async getUserPullRequests(state = 'open') {
        if (!this.username) {
            await this.getCurrentUser();
        }
        
        const prs = await this.makeRequest(`/search/issues?q=type:pr+author:${this.username}+state:${state}&sort=updated&per_page=100`);
        return this.formatIssues(prs.items || []);
    }

    /**
     * Get recently active issues and PRs
     * @returns {Promise} Combined array of recent issues and PRs
     */
    async getRecentActivity() {
        try {
            const [issues, prs] = await Promise.all([
                this.getAssignedIssues('open'),
                this.getUserPullRequests('open')
            ]);

            // Combine and sort by updated date
            const combined = [...issues, ...prs].sort((a, b) => 
                new Date(b.updated_at) - new Date(a.updated_at)
            );

            return combined.slice(0, 50); // Limit to 50 most recent items
        } catch (error) {
            console.error('Failed to fetch recent activity:', error);
            throw error;
        }
    }

    /**
     * Format issues/PRs for consistent display
     * @param {Array} items - Raw GitHub API items
     * @returns {Array} Formatted items
     */
    formatIssues(items) {
        return items.map(item => ({
            id: item.id,
            number: item.number,
            title: item.title,
            url: item.html_url,
            repository: {
                name: item.repository_url ? item.repository_url.split('/').pop() : 'Unknown',
                full_name: this.extractRepoFullName(item)
            },
            type: item.pull_request ? 'pull_request' : 'issue',
            state: item.state,
            labels: item.labels || [],
            updated_at: item.updated_at,
            created_at: item.created_at,
            assignees: item.assignees || [],
            author: item.user ? item.user.login : 'Unknown'
        }));
    }

    /**
     * Extract full repository name from item
     * @param {Object} item - GitHub issue/PR item
     * @returns {string} Repository full name
     */
    extractRepoFullName(item) {
        if (item.repository_url) {
            const parts = item.repository_url.split('/');
            return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        }
        return 'Unknown/Unknown';
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Test API connection
     * @returns {Promise} Connection test result
     */
    async testConnection() {
        try {
            const user = await this.getCurrentUser();
            return {
                success: true,
                message: `Connected successfully as ${user.login}`,
                user: user
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }
}

// Make GitHubApiHelper available globally
window.GitHubApiHelper = GitHubApiHelper;