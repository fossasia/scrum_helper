# Scrum Helper - Implementation Guide & Code Templates

## Quick Start: Setting Up Multi-Platform Architecture

### Step 1: Create Platform Interface

**File: `src/scripts/core/platformInterface.js`**

```javascript
/**
 * Abstract Platform Adapter Interface
 * All platform adapters MUST implement this interface
 */
class PlatformAdapter {
  constructor(config) {
    this.config = config;
    this.platform = "base";
    this.cache = {
      data: null,
      timestamp: 0,
      ttl: 10 * 60 * 1000, // 10 minutes default
    };
  }

  // ==================== REQUIRED METHODS ====================

  /**
   * Validates that credentials are correct and have sufficient permissions
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validateCredentials() {
    throw new Error(
      `${this.platform} adapter must implement validateCredentials()`,
    );
  }

  /**
   * Get authenticated user profile
   * @returns {Promise<UserProfile>}
   * Format: {
   *   id: string,
   *   login: string,
   *   name: string,
   *   email: string,
   *   avatarUrl: string,
   *   profileUrl: string
   * }
   */
  async getUser() {
    throw new Error(`${this.platform} adapter must implement getUser()`);
  }

  /**
   * Get user's pull requests/merge requests
   * @param {Object} params
   * @param {string} params.username - Username to fetch PRs for
   * @param {Date} params.startDate - Start date (inclusive)
   * @param {Date} params.endDate - End date (inclusive)
   * @param {string[]} params.repos - Optional repo filter
   * @param {number} params.limit - Max results (default 100)
   * @returns {Promise<PullRequest[]>}
   * Format: {
   *   id: string,
   *   number: number,
   *   title: string,
   *   url: string,
   *   state: 'open'|'closed'|'merged'|'draft',
   *   createdAt: Date,
   *   updatedAt: Date,
   *   mergedAt?: Date,
   *   repository: string,
   *   author: string
   * }
   */
  async getPullRequests(params) {
    throw new Error(
      `${this.platform} adapter must implement getPullRequests()`,
    );
  }

  /**
   * Get user's issues
   * @param {Object} params
   * @param {string} params.username
   * @param {Date} params.startDate
   * @param {Date} params.endDate
   * @param {number} params.limit
   * @returns {Promise<Issue[]>}
   * Format: {
   *   id: string,
   *   number: number,
   *   title: string,
   *   url: string,
   *   state: 'open'|'closed',
   *   createdAt: Date,
   *   closedAt?: Date,
   *   repository: string,
   *   author: string,
   *   labels: string[]
   * }
   */
  async getIssues(params) {
    throw new Error(`${this.platform} adapter must implement getIssues()`);
  }

  /**
   * Get user's commits
   * @param {Object} params
   * @param {string} params.username
   * @param {Date} params.startDate
   * @param {Date} params.endDate
   * @param {number} params.limit
   * @returns {Promise<Commit[]>}
   * Format: {
   *   id: string,
   *   sha: string,
   *   message: string,
   *   url: string,
   *   author: string,
   *   authorEmail: string,
   *   committedAt: Date,
   *   repository: string
   * }
   */
  async getCommits(params) {
    throw new Error(`${this.platform} adapter must implement getCommits()`);
  }

  /**
   * Get PRs reviewed by user
   * @param {Object} params
   * @returns {Promise<ReviewedPR[]>}
   * Format: {
   *   ...PullRequest,
   *   reviewedAt: Date,
   *   reviewStatus: 'approved'|'changes_requested'|'commented'
   * }
   */
  async getReviewedPullRequests(params) {
    throw new Error(
      `${this.platform} adapter must implement getReviewedPullRequests()`,
    );
  }

  // ==================== OPTIONAL METHODS ====================

  /**
   * Get list of user's repositories
   * @param {Object} params
   * @returns {Promise<Repository[]>}
   */
  async getRepositories(params) {
    return [];
  }

  /**
   * Get commits within a specific PR
   * @param {Object} params
   * @param {string} params.owner
   * @param {string} params.repo
   * @param {number} params.prNumber
   * @returns {Promise<Commit[]>}
   */
  async getPullRequestCommits(params) {
    return [];
  }

  /**
   * Get organization/group info (platform specific)
   * @param {string} orgName
   * @returns {Promise<Organization|null>}
   */
  async getOrganization(orgName) {
    return null;
  }

  /**
   * Health check - verify API endpoint accessibility
   * @returns {Promise<{healthy: boolean, message?: string}>}
   */
  async healthCheck() {
    return { healthy: true };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear local cache
   */
  clearCache() {
    this.cache = {
      data: null,
      timestamp: 0,
      ttl: this.cache.ttl,
    };
  }

  /**
   * Check if cache is still valid
   * @returns {boolean}
   */
  isCacheValid() {
    if (!this.cache.data) return false;
    return Date.now() - this.cache.timestamp < this.cache.ttl;
  }

  /**
   * Rate limit aware fetch
   * @protected
   */
  async fetchWithRateLimit(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        ...options,
      });

      // Check for rate limiting
      const remaining = response.headers.get("X-RateLimit-Remaining");
      if (remaining !== null) {
        const reset = response.headers.get("X-RateLimit-Reset");
        if (parseInt(remaining) < 10) {
          console.warn(
            `[${this.platform}] Rate limit warning: ${remaining} requests remaining`,
          );
        }
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`[${this.platform}] Fetch error:`, error);
      throw error;
    }
  }

  /**
   * Get platform-specific headers
   * @protected
   */
  getHeaders() {
    return {};
  }
}
```

---

### Step 2: Create Platform Manager

**File: `src/scripts/core/platformManager.js`**

```javascript
/**
 * Platform Manager - Handles platform registration and switching
 */
class PlatformManager {
  constructor() {
    this.adapters = new Map();
    this.currentAdapter = null;
    this.currentPlatform = null;
    this.setupEventListeners();
  }

  /**
   * Register a platform adapter
   * @param {string} name - Platform identifier (github, gitlab, etc.)
   * @param {class} adapterClass - Class extending PlatformAdapter
   */
  register(name, adapterClass) {
    if (!name || !adapterClass) {
      throw new Error("Platform name and adapter class are required");
    }
    this.adapters.set(name, adapterClass);
    console.log(`[PlatformManager] Registered adapter: ${name}`);
  }

  /**
   * Set active platform adapter
   * @param {string} platform - Platform identifier
   * @param {Object} config - Platform configuration {token, baseUrl, username, etc.}
   * @returns {Promise<PlatformAdapter>}
   */
  async setActiveAdapter(platform, config) {
    const AdapterClass = this.adapters.get(platform);

    if (!AdapterClass) {
      throw new Error(`Platform '${platform}' not registered`);
    }

    try {
      // Create new adapter instance
      this.currentAdapter = new AdapterClass(config);
      this.currentPlatform = platform;

      // Validate credentials
      const validation = await this.currentAdapter.validateCredentials();
      if (!validation.valid) {
        throw new Error(
          validation.error || `Invalid credentials for ${platform}`,
        );
      }

      // Notify listeners
      this.dispatchEvent("platform-changed", {
        platform: platform,
        adapter: this.currentAdapter,
      });

      return this.currentAdapter;
    } catch (error) {
      this.currentAdapter = null;
      this.currentPlatform = null;
      throw error;
    }
  }

  /**
   * Get current active adapter
   * @returns {PlatformAdapter|null}
   */
  getCurrentAdapter() {
    return this.currentAdapter;
  }

  /**
   * Get current platform name
   * @returns {string|null}
   */
  getCurrentPlatform() {
    return this.currentPlatform;
  }

  /**
   * Get all registered platforms
   * @returns {string[]}
   */
  getAvailablePlatforms() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if platform is available
   * @param {string} platform
   * @returns {boolean}
   */
  hasPlatform(platform) {
    return this.adapters.has(platform);
  }

  /**
   * Simple event system for platform changes
   * @private
   */
  setupEventListeners() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  dispatchEvent(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      });
    }
  }
}

// Global singleton
const platformManager = new PlatformManager();
```

---

### Step 3: Create GitHub Adapter

**File: `src/scripts/adapters/githubAdapter.js`**

```javascript
/**
 * GitHub Platform Adapter
 * Implements PlatformAdapter for GitHub API v3
 */
class GitHubAdapter extends PlatformAdapter {
  constructor(config) {
    super(config);
    this.platform = "github";
    this.baseUrl = "https://api.github.com";
    this.token = config.token;
    this.username = config.username;
    this.organization = config.organization || null;
  }

  getHeaders() {
    return {
      Authorization: `token ${this.token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async validateCredentials() {
    try {
      const response = await this.fetchWithRateLimit(`${this.baseUrl}/user`);
      const data = await response.json();

      if (data.login) {
        this.username = data.login;
        return { valid: true };
      }

      return { valid: false, error: "Invalid token or rate limited" };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async getUser() {
    try {
      const response = await this.fetchWithRateLimit(`${this.baseUrl}/user`);
      const data = await response.json();

      return {
        id: data.id.toString(),
        login: data.login,
        name: data.name || data.login,
        email: data.email,
        avatarUrl: data.avatar_url,
        profileUrl: data.html_url,
      };
    } catch (error) {
      console.error("[GitHub] Error fetching user:", error);
      throw error;
    }
  }

  async getPullRequests(params) {
    const { username, startDate, endDate, limit = 100 } = params;
    const queries = [
      `author:${username}`,
      `type:pr`,
      `merged:${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}`,
    ];

    try {
      const response = await this.fetchWithRateLimit(
        `${this.baseUrl}/search/issues?q=${encodeURIComponent(queries.join(" "))}&per_page=${Math.min(limit, 100)}`,
      );
      const data = await response.json();

      return data.items.map((pr) => ({
        id: pr.id.toString(),
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.draft ? "draft" : pr.merged_at ? "merged" : pr.state,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        repository: pr.repository_url.split("/").slice(-2).join("/"),
        author: pr.user.login,
      }));
    } catch (error) {
      console.error("[GitHub] Error fetching PRs:", error);
      return [];
    }
  }

  async getIssues(params) {
    const { username, startDate, endDate, limit = 100 } = params;
    const queries = [
      `author:${username}`,
      `type:issue`,
      `created:${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}`,
    ];

    try {
      const response = await this.fetchWithRateLimit(
        `${this.baseUrl}/search/issues?q=${encodeURIComponent(queries.join(" "))}&per_page=${Math.min(limit, 100)}`,
      );
      const data = await response.json();

      return data.items.map((issue) => ({
        id: issue.id.toString(),
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        state: issue.state,
        createdAt: new Date(issue.created_at),
        closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        repository: issue.repository_url.split("/").slice(-2).join("/"),
        author: issue.user.login,
        labels: issue.labels.map((l) => l.name),
      }));
    } catch (error) {
      console.error("[GitHub] Error fetching issues:", error);
      return [];
    }
  }

  async getCommits(params) {
    const { username, startDate, endDate, limit = 100 } = params;

    try {
      const response = await this.fetchWithRateLimit(
        `${this.baseUrl}/search/commits?q=author:${username} committer-date:${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}&per_page=${Math.min(limit, 100)}`,
        { headers: { Accept: "application/vnd.github.cloak-preview" } },
      );
      const data = await response.json();

      return data.items.map((commit) => ({
        id: commit.sha.substring(0, 7),
        sha: commit.sha,
        message: commit.commit.message.split("\n")[0], // First line only
        url: commit.html_url,
        author: commit.commit.author.name,
        authorEmail: commit.commit.author.email,
        committedAt: new Date(commit.commit.author.date),
        repository: commit.repository.full_name,
      }));
    } catch (error) {
      console.error("[GitHub] Error fetching commits:", error);
      return [];
    }
  }

  async getReviewedPullRequests(params) {
    const { username, startDate, endDate, limit = 100 } = params;
    const queries = [
      `reviewed-by:${username}`,
      `type:pr`,
      `updated:${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}`,
    ];

    try {
      const response = await this.fetchWithRateLimit(
        `${this.baseUrl}/search/issues?q=${encodeURIComponent(queries.join(" "))}&per_page=${Math.min(limit, 100)}`,
      );
      const data = await response.json();

      return data.items.map((pr) => ({
        id: pr.id.toString(),
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        state: pr.draft ? "draft" : pr.merged_at ? "merged" : pr.state,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        repository: pr.repository_url.split("/").slice(-2).join("/"),
        author: pr.user.login,
        reviewedAt: new Date(pr.updated_at),
        reviewStatus: "approved", // Simplified - would need additional API call
      }));
    } catch (error) {
      console.error("[GitHub] Error fetching reviewed PRs:", error);
      return [];
    }
  }

  async getRepositories(params) {
    const { username } = params;

    try {
      const response = await this.fetchWithRateLimit(
        `${this.baseUrl}/users/${username}/repos?per_page=100&sort=updated`,
      );
      const data = await response.json();

      return Array.isArray(data)
        ? data.map((repo) => ({
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            private: repo.private,
            stars: repo.stargazers_count,
            language: repo.language,
          }))
        : [];
    } catch (error) {
      console.error("[GitHub] Error fetching repositories:", error);
      return [];
    }
  }
}
```

---

### Step 4: Storage Manager

**File: `src/scripts/core/storageManager.js`**

```javascript
/**
 * Storage Manager - Unified storage abstraction
 * Provides a normalized interface for platform-agnostic storage
 */
class StorageManager {
  constructor() {
    this.STORAGE_KEYS = {
      ACTIVE_PLATFORM: "activePlatform",
      PLATFORMS_CONFIG: "platformsConfig",
      REPORT_SETTINGS: "reportSettings",
      CACHE: "cache",
      UI_STATE: "uiState",
      MIGRATION_VERSION: "_version",
    };

    this.CURRENT_VERSION = 2;
  }

  /**
   * Get all stored data
   * @returns {Promise<Object>}
   */
  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
        resolve(items || {});
      });
    });
  }

  /**
   * Save platform configuration
   * @param {string} platform - Platform name
   * @param {string} accountName - Account identifier
   * @param {Object} config - {token, baseUrl, username, etc.}
   */
  async savePlatformConfig(platform, accountName, config) {
    const all = await this.getAll();
    const platformsConfig = all.platformsConfig || {};

    if (!platformsConfig[platform]) {
      platformsConfig[platform] = { accounts: {}, config: {} };
    }

    platformsConfig[platform].accounts[accountName] = {
      ...config,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      isActive: true,
    };

    return new Promise((resolve) => {
      chrome.storage.local.set({ platformsConfig }, resolve);
    });
  }

  /**
   * Get platform configuration
   * @param {string} platform
   * @param {string} accountName
   * @returns {Promise<Object|null>}
   */
  async getPlatformConfig(platform, accountName) {
    const all = await this.getAll();
    const platformsConfig = all.platformsConfig || {};

    return platformsConfig[platform]?.accounts[accountName] || null;
  }

  /**
   * Get all accounts for a platform
   * @param {string} platform
   * @returns {Promise<Object>}
   */
  async getPlatformAccounts(platform) {
    const all = await this.getAll();
    const platformsConfig = all.platformsConfig || {};

    return platformsConfig[platform]?.accounts || {};
  }

  /**
   * Set active platform
   * @param {string} platform
   */
  async setActivePlatform(platform) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ activePlatform: platform }, resolve);
    });
  }

  /**
   * Get active platform
   * @returns {Promise<string|null>}
   */
  async getActivePlatform() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["activePlatform"], (items) => {
        resolve(items.activePlatform || null);
      });
    });
  }

  /**
   * Save report settings
   * @param {Object} settings
   */
  async saveReportSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ reportSettings: settings }, resolve);
    });
  }

  /**
   * Get report settings
   * @returns {Promise<Object>}
   */
  async getReportSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["reportSettings"], (items) => {
        resolve(items.reportSettings || {});
      });
    });
  }

  /**
   * Clear non-critical data (cache, temp)
   * @returns {Promise<void>}
   */
  async clearCache() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ cache: {} }, resolve);
    });
  }

  /**
   * Check and run migrations
   * @returns {Promise<void>}
   */
  async runMigrations() {
    const all = await this.getAll();
    const currentVersion = all._version || 1;

    if (currentVersion < this.CURRENT_VERSION) {
      console.log(
        `[Storage] Running migrations from v${currentVersion} to v${this.CURRENT_VERSION}`,
      );

      // v1 to v2 migration
      if (currentVersion < 2) {
        await this.migrateV1toV2(all);
      }

      return new Promise((resolve) => {
        chrome.storage.local.set({ _version: this.CURRENT_VERSION }, resolve);
      });
    }
  }

  /**
   * Migrate from v1 (original GitHub-only) to v2 (multi-platform)
   * @private
   */
  async migrateV1toV2(oldData) {
    const platformsConfig = {
      github: {
        accounts: {
          primary: {
            username: oldData.platformUsername || oldData.githubUsername,
            token: oldData.githubToken,
            organization: oldData.orgName,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        },
      },
    };

    const reportSettings = {
      projectName: oldData.projectName || "",
      includeCommits: oldData.showCommits !== false,
      includeIssues: oldData.onlyIssues !== false,
      includePRs: oldData.onlyPRs !== false,
      includePRReviews: oldData.onlyRevPRs !== false,
      showLabels: oldData.showOpenLabel !== false,
    };

    // Save migrated data
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          platformsConfig,
          reportSettings,
          activePlatform: "github",
        },
        resolve,
      );
    });
  }
}

// Global singleton
const storageManager = new StorageManager();
```

---

### Step 5: Initialize in popup.js

**File: `src/scripts/popup.js` (Updated section)**

```javascript
// Add this at the top of DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
  // Apply translations
  applyI18n();

  // Run storage migrations (v1 -> v2)
  await storageManager.runMigrations();

  // Register all platform adapters
  platformManager.register("github", GitHubAdapter);
  platformManager.register("gitlab", GitLabAdapter);
  platformManager.register("gitea", GiteaAdapter);
  platformManager.register("bitbucket", BitbucketAdapter);

  // Load and initialize active platform
  const activePlatform = await storageManager.getActivePlatform();
  if (activePlatform) {
    try {
      const config = await storageManager.getPlatformConfig(
        activePlatform,
        "primary",
      );
      if (config) {
        await platformManager.setActiveAdapter(activePlatform, config);
        updateUIForPlatform(activePlatform);
      }
    } catch (error) {
      console.error("Failed to load active platform:", error);
    }
  }

  // Listen for platform changes
  platformManager.on("platform-changed", (data) => {
    updateUIForPlatform(data.platform);
  });

  // ... rest of DOMContentLoaded
});
```

---

## Migration Path from Existing Code

### Phase 1: Create base infrastructure

1. Create `platformInterface.js`
2. Create `platformManager.js`
3. Create `storageManager.js`
4. Create migration script

### Phase 2: Migrate GitHub

1. Create `githubAdapter.js`
2. Move existing GitHub logic from `scrumHelper.js`
3. Test with existing users
4. Run backward compatibility tests

### Phase 3: Add GitLab

1. Create `gitlabAdapter.js` (enhance existing `gitlabHelper.js`)
2. Implement missing methods
3. Test with real GitLab accounts

### Phase 4: Add Gitea & Bitbucket

1. Create `giteaAdapter.js`
2. Create `bitbucketAdapter.js`
3. Implement and test each

### Phase 5: UI/UX

1. Update `popup.html` for platform selection
2. Create conditional UI sections
3. Add platform-specific settings panels

---

## Testing Strategy

### Unit Tests

```javascript
// tests/adapters/github.test.js
describe("GitHubAdapter", () => {
  let adapter;
  const mockConfig = {
    token: "test-token",
    username: "test-user",
  };

  beforeEach(() => {
    adapter = new GitHubAdapter(mockConfig);
  });

  describe("validateCredentials", () => {
    it("should validate correct credentials", async () => {
      // Mock fetch response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ login: "test-user" }),
        }),
      );

      const result = await adapter.validateCredentials();
      expect(result.valid).toBe(true);
    });

    it("should invalidate incorrect credentials", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        }),
      );

      const result = await adapter.validateCredentials();
      expect(result.valid).toBe(false);
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/platform-switching.test.js
describe("Platform Switching", () => {
  it("should switch from GitHub to GitLab", async () => {
    // Setup GitHub
    await platformManager.setActiveAdapter("github", githubConfig);
    expect(platformManager.getCurrentPlatform()).toBe("github");

    // Switch to GitLab
    await platformManager.setActiveAdapter("gitlab", gitlabConfig);
    expect(platformManager.getCurrentPlatform()).toBe("gitlab");
  });

  it("should maintain separate cache per platform", async () => {
    // Fetch with GitHub
    const githubAdapter = await platformManager.setActiveAdapter(
      "github",
      githubConfig,
    );
    const githubData = await githubAdapter.getUser();

    // Switch to GitLab
    const gitlabAdapter = await platformManager.setActiveAdapter(
      "gitlab",
      gitlabConfig,
    );
    const gitlabData = await gitlabAdapter.getUser();

    // Both should work independently
    expect(githubData.login).not.toBe(gitlabData.login);
  });
});
```

---

## Deployment Checklist

- [ ] All adapters implemented and tested
- [ ] Storage migration script working
- [ ] Backward compatibility verified
- [ ] UI updated for all platforms
- [ ] Translations added for new strings
- [ ] Documentation complete
- [ ] Beta testing with real accounts
- [ ] Performance benchmarks passed
- [ ] Security audit completed
- [ ] Rollback plan prepared

---

_Implementation Guide v1.0 - March 2024_
