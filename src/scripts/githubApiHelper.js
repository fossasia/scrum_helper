/**
 * GitHub API Helper
 * Provides methods for fetching GitHub issues and pull requests
 * 
 * @class GitHubApiHelper
 * @description Lightweight wrapper around GitHub REST API v3
 * Handles authentication, caching, and error handling
 */

class GitHubApiHelper {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.token = null;
        this.username = null;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache TTL
    }

    /**
     * Set GitHub personal access token for authentication
     * @param {string} token - GitHub personal access token
     * @throws {Error} If token is empty or invalid
     */
    setToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid token provided');
        }
        this.token = token;
    }

    /**
     * Set GitHub username for API requests
     * @param {string} username - GitHub username
     */
    setUsername(username) {
        this.username = username;
    }

    /**
     * Make authenticated API request with caching support
     * @param {string} endpoint - API endpoint path (e.g., '/user')
     * @returns {Promise<Object>} Parsed JSON response
     * @throws {Error} If token not set, rate limit exceeded, or request fails
     * @private
     */
    async makeRequest(endpoint) {
        if (!this.token) {
            throw new Error('GitHub token not set. Please configure your token in settings.');
        }

        // Check cache first
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
        
        // Store in cache
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Get current authenticated user information
     * @returns {Promise<Object>} User object with login, name, etc.
     * @throws {Error} If request fails
     */
    async getCurrentUser() {
        const user = await this.makeRequest('/user');
        this.username = user.login;
        return user;
    }

    /**
     * Fetch issues assigned to the authenticated user
     * @param {string} [state='open'] - Filter by state: 'open', 'closed', or 'all'
     * @returns {Promise<Array>} Array of formatted issue objects
     * @throws {Error} If request fails
     */
    async getAssignedIssues(state = 'open') {
        const issues = await this.makeRequest(
            `/issues?filter=assigned&state=${state}&sort=updated&per_page=100`
        );
        return this.formatIssues(issues);
    }

    /**
     * Fetch pull requests created by the authenticated user
     * @param {string} [state='open'] - Filter by state: 'open', 'closed', or 'all'
     * @returns {Promise<Array>} Array of formatted PR objects
     * @throws {Error} If request fails
     */
    async getUserPullRequests(state = 'open') {
        if (!this.username) {
            await this.getCurrentUser();
        }
        
        try {
            // Use search API for author-based query
            const prs = await this.makeRequest(
                `/search/issues?q=type:pr+author:${this.username}+state:${state}&sort=updated&per_page=50`
            );
            return this.formatIssues(prs.items || []);
        } catch (error) {
            // Fallback: fetch assigned PRs instead
            const assignedPRs = await this.makeRequest(
                `/issues?filter=assigned&state=${state}&sort=updated&per_page=50`
            );
            return this.formatIssues(assignedPRs.filter(item => item.pull_request));
        }
    }

    /**
     * Get combined list of recent issues and PRs
     * @returns {Promise<Array>} Array of formatted items sorted by update time
     * @throws {Error} If requests fail
     */
    async getRecentActivity() {
        const [issues, prs] = await Promise.all([
            this.getAssignedIssues('open'),
            this.getUserPullRequests('open')
        ]);

        // Combine and sort by most recently updated
        const combined = [...issues, ...prs].sort((a, b) => 
            new Date(b.updated_at) - new Date(a.updated_at)
        );

        return combined.slice(0, 50); // Return top 50 items
    }

    /**
     * Format raw GitHub API response into consistent structure
     * @param {Array} items - Raw GitHub issue/PR objects
     * @returns {Array} Formatted objects with consistent structure
     * @private
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
     * Extract repository full name (owner/repo) from API response
     * @param {Object} item - GitHub issue/PR object
     * @returns {string} Repository full name (e.g., 'owner/repo')
     * @private
     */
    extractRepoFullName(item) {
        if (item.repository_url) {
            const parts = item.repository_url.split('/');
            return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        }
        return 'Unknown/Unknown';
    }

    /**
     * Clear all cached API responses
     * Useful when forcing a refresh or on token change
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Test API connection and authentication
     * @returns {Promise<Object>} Result object with success status and message
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

// Export for use in extension
if (typeof window !== 'undefined') {
    window.GitHubApiHelper = GitHubApiHelper;
}
