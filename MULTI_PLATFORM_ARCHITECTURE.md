# Scrum Helper - Multi-Platform Architecture Plan

## Executive Summary

This document outlines the architecture, design system, and implementation strategy for extending Scrum Helper to support multiple source control management (SCM) platforms: GitHub, GitLab, Gitea, and Bitbucket.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Design](#architecture-design)
3. [Platform Abstraction Layer](#platform-abstraction-layer)
4. [UI/UX Design System](#uiux-design-system)
5. [Storage & Configuration](#storage--configuration)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Code Organization](#code-organization)

---

## Current State Analysis

### Strengths

- ✅ Primary GitHub support is well-established
- ✅ GitLabHelper class shows attempt at platform extension
- ✅ i18n system supports multi-language
- ✅ Storage layer abstraction (chrome.storage.local)
- ✅ Modular UI approach with popup.html

### Challenges

- ❌ Tight coupling between GitHub-specific logic and core logic
- ❌ Platform detection scattered across multiple files
- ❌ No unified API interface for different SCM platforms
- ❌ UI hardcoded for GitHub-specific features
- ❌ Token management not platform-agnostic
- ❌ API endpoints hardcoded per platform

---

## Architecture Design

### Core Principle: Plugin-Based Adapter Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (popup.html)                │
│         ├─ Platform Selector                            │
│         ├─ Universal Settings Panel                     │
│         └─ Report Generator Component                   │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│          Platform Adapter Manager                       │
│  (platformManager.js)                                   │
│  ├─ Platform Registry                                  │
│  ├─ Adapter Selection Logic                            │
│  └─ Unified API Interface                              │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────┬───────────┼───────────┬──────────┐
        │      │           │           │          │
┌───────▼──┐┌──▼────────┐┌▼────────┐┌▼────────┐┌▼──────────┐
│ GitHub   ││ GitLab    ││ Gitea   ││Bitbucket││ (Future) │
│ Adapter  ││ Adapter   ││ Adapter ││ Adapter ││ Adapters │
└──────────┘└───────────┘└─────────┘└─────────┘└──────────┘
```

### Layered Architecture

```
Layer 4: UI/Presentation
    └─ popup.html, popup.js, popup.css
    └─ platform-specific UI components (optional)

Layer 3: Business Logic
    └─ reportGenerator.js (core report generation)
    └─ dataProcessor.js (data transformation)
    └─ emailFormatter.js (email formatting)

Layer 2: Platform Abstraction
    └─ platformManager.js (adapter selection & registry)
    └─ platformInterface.js (abstract interface definition)
    └─ adapters/
        ├─ githubAdapter.js
        ├─ gitlabAdapter.js
        ├─ giteaAdapter.js
        └─ bitbucketAdapter.js

Layer 1: Infrastructure
    └─ storageManager.js (normalized storage)
    └─ tokenManager.js (platform-agnostic token handling)
    └─ config.js (constants & configurations)
```

---

## Platform Abstraction Layer

### Platform Interface (Template)

```javascript
/**
 * Abstract Platform Adapter Interface
 * All platform adapters must implement this interface
 */
class PlatformAdapter {
  constructor(config) {
    this.config = config; // {token, baseUrl, username, org}
    this.platform = "base"; // Override in subclass
  }

  // ==================== REQUIRED METHODS ====================

  /**
   * Validate platform credentials
   * @returns {Promise<boolean>}
   */
  async validateCredentials() {
    throw new Error("Not implemented");
  }

  /**
   * Get user profile information
   * @returns {Promise<Object>} {id, login, name, email, avatar_url}
   */
  async getUser() {
    throw new Error("Not implemented");
  }

  /**
   * Get merged/closed PRs for user in date range
   * @param {Object} params {username, startDate, endDate, limit}
   * @returns {Promise<Array>}
   */
  async getPullRequests(params) {
    throw new Error("Not implemented");
  }

  /**
   * Get issues for user in date range
   * @param {Object} params {username, startDate, endDate, limit}
   * @returns {Promise<Array>}
   */
  async getIssues(params) {
    throw new Error("Not implemented");
  }

  /**
   * Get commits for user in date range
   * @param {Object} params {username, startDate, endDate, limit}
   * @returns {Promise<Array>}
   */
  async getCommits(params) {
    throw new Error("Not implemented");
  }

  /**
   * Get PRs reviewed by user
   * @param {Object} params {username, startDate, endDate, limit}
   * @returns {Promise<Array>}
   */
  async getReviewedPullRequests(params) {
    throw new Error("Not implemented");
  }

  /**
   * Get repositories (optional)
   * @param {Object} params {username, org}
   * @returns {Promise<Array>}
   */
  async getRepositories(params) {
    throw new Error("Not implemented");
  }

  /**
   * Get PR commits (for detailed report)
   * @param {Object} params {owner, repo, prNumber}
   * @returns {Promise<Array>}
   */
  async getPullRequestCommits(params) {
    throw new Error("Not implemented");
  }

  /**
   * Normalize platform-specific response to standard format
   * @param {Object} rawData - Platform API response
   * @param {string} dataType - 'pr', 'issue', 'commit', etc.
   * @returns {Object} Normalized data
   */
  normalize(rawData, dataType) {
    throw new Error("Not implemented");
  }

  // ==================== OPTIONAL METHODS ====================

  /**
   * Get organization data (if supported)
   */
  async getOrganization(orgName) {
    return null;
  }

  /**
   * Get project/group data (GitLab specific)
   */
  async getProject(projectId) {
    return null;
  }
}
```

### GitHub Adapter Implementation Structure

```javascript
class GitHubAdapter extends PlatformAdapter {
  constructor(config) {
    super(config);
    this.platform = "github";
    this.baseUrl = "https://api.github.com";
    this.headers = {
      Authorization: `token ${config.token}`,
      Accept: "application/vnd.github.v3+json",
    };
  }

  async validateCredentials() {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: this.headers,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getUser() {
    // Implementation
  }

  async getPullRequests(params) {
    // Implementation
  }

  normalize(data, type) {
    // Normalize GitHub response to standard format
    return {
      id: data.id,
      title: data.title,
      url: data.html_url,
      state: data.state, // 'open', 'closed', 'merged'
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      // ... other normalized fields
    };
  }
}
```

### GitLab Adapter Implementation Structure

```javascript
class GitLabAdapter extends PlatformAdapter {
  constructor(config) {
    super(config);
    this.platform = "gitlab";
    // Support self-hosted GitLab
    this.baseUrl = config.baseUrl || "https://gitlab.com/api/v4";
    this.headers = {
      "PRIVATE-TOKEN": config.token,
      "Content-Type": "application/json",
    };
  }

  async validateCredentials() {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: this.headers,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Similar implementations with GitLab-specific logic
}
```

### Gitea Adapter Implementation Structure

```javascript
class GiteaAdapter extends PlatformAdapter {
  constructor(config) {
    super(config);
    this.platform = "gitea";
    // Self-hosted only
    this.baseUrl = config.baseUrl;
    this.headers = {
      Authorization: `token ${config.token}`,
      "Content-Type": "application/json",
    };
  }

  // Gitea API is simpler, subset of GitHub API
}
```

### Bitbucket Adapter Implementation Structure

```javascript
class BitbucketAdapter extends PlatformAdapter {
  constructor(config) {
    super(config);
    this.platform = "bitbucket";
    this.baseUrl = "https://api.bitbucket.org/2.0";
    // Bitbucket Cloud uses Basic Auth or OAuth
    this.credentials = Buffer.from(
      `${config.username}:${config.appPassword}`,
    ).toString("base64");
    this.headers = {
      Authorization: `Basic ${this.credentials}`,
      "Content-Type": "application/json",
    };
  }

  // Bitbucket-specific implementations
}
```

### Platform Manager

```javascript
class PlatformManager {
  constructor() {
    this.adapters = {};
    this.currentAdapter = null;
    this.registerDefaultAdapters();
  }

  registerDefaultAdapters() {
    this.register("github", GitHubAdapter);
    this.register("gitlab", GitLabAdapter);
    this.register("gitea", GiteaAdapter);
    this.register("bitbucket", BitbucketAdapter);
  }

  register(name, adapterClass) {
    this.adapters[name] = adapterClass;
  }

  async setActiveAdapter(platform, config) {
    const AdapterClass = this.adapters[platform];
    if (!AdapterClass) {
      throw new Error(`Platform '${platform}' not supported`);
    }
    this.currentAdapter = new AdapterClass(config);

    // Validate before activating
    const isValid = await this.currentAdapter.validateCredentials();
    if (!isValid) {
      throw new Error("Invalid credentials for " + platform);
    }

    return this.currentAdapter;
  }

  getCurrentAdapter() {
    return this.currentAdapter;
  }

  getAvailablePlatforms() {
    return Object.keys(this.adapters);
  }
}

// Global instance
const platformManager = new PlatformManager();
```

---

## UI/UX Design System

### Component Hierarchy

```
┌─ Scrum Helper Popup
│  ├─ Header
│  │  ├─ Title + Logo
│  │  ├─ Settings Toggle
│  │  └─ Dark Mode Toggle
│  │
│  ├─ Platform Selector (Tab/Dropdown)
│  │  ├─ GitHub
│  │  ├─ GitLab (with self-hosted option)
│  │  ├─ Gitea (with custom URL)
│  │  └─ Bitbucket
│  │
│  ├─ Main Content Area
│  │  ├─ Report Section (default tab)
│  │  └─ Settings Section
│  │
│  ├─ Report Section
│  │  ├─ Platform-Universal Settings
│  │  │  ├─ Project Name
│  │  │  ├─ Username/User ID
│  │  │  ├─ Date Range Picker
│  │  │  └─ Filters (Issues, PRs, Commits)
│  │  │
│  │  ├─ Platform-Specific Settings (conditional)
│  │  │  ├─ Organization (GitHub, GitLab)
│  │  │  ├─ Repository Filter
│  │  │  └─ Custom Base URL (Gitea, self-hosted)
│  │  │
│  │  ├─ Report Area
│  │  │  └─ Generated Report (editable)
│  │  │
│  │  └─ Action Buttons
│  │     ├─ Generate
│  │     ├─ Copy
│  │     └─ Send by Email
│  │
│  └─ Settings Section
│     ├─ Credentials Management
│     │  ├─ GitHub Token Input
│     │  ├─ GitLab Token + Base URL
│     │  ├─ Gitea Token + Base URL
│     │  └─ Bitbucket App Password
│     ├─ Cache Settings
│     ├─ Report Format Options
│     └─ Export/Import Settings
```

### UI States & Variants

#### Platform Selector

```
State: Default (GitHub)
┌──────────────────────────────────────┐
│ GitHub  ▼ | Manage Platforms        │
└──────────────────────────────────────┘

State: Dropdown Open
┌──────────────────────────────────────┐
│ GitHub  ▼ | Manage Platforms        │
├──────────────────────────────────────┤
│ ☑ GitHub                            │
│ ☐ GitLab                             │
│ ☐ Gitea (Custom)                    │
│ ☐ Bitbucket                          │
└──────────────────────────────────────┘

State: With Custom Instance
┌──────────────────────────────────────┐
│ GitLab (self-hosted)  ▼              │
│ Instance: gitlab.company.com         │
└──────────────────────────────────────┘
```

#### Token Input Component

```
Universal Pattern:
┌─────────────────────────────────────────┐
│ Platform: [GitHub ▼]                    │
├─────────────────────────────────────────┤
│ Token/Credential Type: [Personal Access │
│  Token ▼]                               │
├─────────────────────────────────────────┤
│ Token: [••••••••••••••••] [👁]  [✓]    │
│ (Validate button + visibility toggle)   │
├─────────────────────────────────────────┤
│ ℹ How to get token                     │
├─────────────────────────────────────────┤
│ ☐ I have multiple accounts for this     │
│   platform (save multiple tokens)       │
└─────────────────────────────────────────┘
```

#### Platform-Specific Options

**GitHub & GitLab:**

```
Organization/Group Settings:
┌─────────────────────────────────────────┐
│ Organization/Group (optional):          │
│ [my-company            ▼]               │
│ Or choose specific repositories          │
│ [Repo Filter Settings] ⚙                │
└─────────────────────────────────────────┘
```

**Gitea & Self-Hosted:**

```
Instance Configuration:
┌─────────────────────────────────────────┐
│ Instance URL:                           │
│ [https://gitea.company.com         ]    │
│                                    [✓]  │
│                                         │
│ Port (if default 443 not used):        │
│ [3000]                                  │
└─────────────────────────────────────────┘
```

**Bitbucket:**

```
Workspace & Account:
┌─────────────────────────────────────────┐
│ Workspace ID/Slug:                      │
│ [my-workspace]                          │
│                                         │
│ Credential Type:                        │
│ ○ App Password                          │
│ ○ OAuth Token                           │
│                                         │
│ App Password/Token:                     │
│ [••••••••••••••••] [👁]                │
└─────────────────────────────────────────┘
```

### Visual Consistency

#### Color Schema (Dark & Light Mode)

**Light Mode:**

```
Primary: #2563eb (Blue) - Actions, highlights
Success: #16a34a (Green) - Send, success states
Warning: #f59e0b (Orange) - Caution, info
Error: #dc2626 (Red) - Errors, deletions
Neutral: #6b7280 (Gray) - Disabled, secondary text
Background: #ffffff
Surface: #f9fafb
Text: #1f2937
```

**Dark Mode:**

```
Primary: #3b82f6 (Lighter Blue)
Success: #22c55e (Lighter Green)
Warning: #fbbf24 (Lighter Orange)
Error: #ef4444 (Lighter Red)
Neutral: #9ca3af (Lighter Gray)
Background: #1f2937
Surface: #111827
Text: #f3f4f6
```

#### Typography

```
Headlines: Inter, 600-700 weight, 18-24px
Body: Inter, 400-500 weight, 12-14px
Mono (code/tokens): 'Courier New', monospace, 11px
Labels: Inter, 600 weight, 12px
```

#### Spacing (8px unit system)

```
xs: 4px (rarely used)
sm: 8px
md: 16px
lg: 24px
xl: 32px
```

---

## Storage & Configuration

### Normalized Storage Schema

```javascript
// Chrome Storage Structure (chrome.storage.local)

{
  // Current active platform
  "activePlatform": "github",

  // Platform instances (support multiple accounts)
  "platforms": {
    "github": {
      "accounts": {
        "primary": {
          "username": "john-doe",
          "token": "[encrypted]",
          "organization": "company",
          "isActive": true,
          "createdAt": "2024-01-01T00:00:00Z",
          "lastUsed": "2024-01-15T10:30:00Z"
        },
        "secondary": {
          "username": "john-doe-work",
          "token": "[encrypted]",
          "organization": "another-company",
          "isActive": false
        }
      },
      "config": {
        "cacheEnabled": true,
        "cacheTTL": 600000, // ms
        "defaultOrganization": "company"
      }
    },

    "gitlab": {
      "accounts": {
        "saas": {
          "username": "john-doe",
          "token": "[encrypted]",
          "baseUrl": "https://gitlab.com/api/v4",
          "isActive": true
        },
        "selfhosted": {
          "username": "john-doe",
          "token": "[encrypted]",
          "baseUrl": "https://gitlab.company.com/api/v4",
          "isActive": false
        }
      }
    },

    "gitea": {
      "accounts": {
        "company": {
          "username": "john-doe",
          "token": "[encrypted]",
          "baseUrl": "https://gitea.company.com/api/v1",
          "isActive": true
        }
      }
    },

    "bitbucket": {
      "accounts": {
        "cloud": {
          "username": "john-doe",
          "appPassword": "[encrypted]",
          "workspace": "workspace-slug",
          "type": "bitbucket_cloud",
          "isActive": true
        }
      }
    }
  },

  // Global report settings
  "reportSettings": {
    "projectName": "My Project",
    "dateFormat": "YYYY-MM-DD",
    "includeCommits": true,
    "includeIssues": true,
    "includePRs": true,
    "includePRReviews": true,
    "reportTemplate": "default", // or 'detailed', 'summary'
    "sortBy": "date" // or 'type', 'status'
  },

  // Cache management
  "cache": {
    "github_primary": {
      "data": {...},
      "timestamp": 1234567890000,
      "ttl": 600000
    }
  },

  // UI preferences
  "ui": {
    "darkMode": false,
    "sidebarOpen": true,
    "lastActiveTab": "report"
  },

  // Migration/version tracking
  "_version": 2,
  "_lastMigration": "2024-01-01T00:00:00Z"
}
```

### Token Encryption

```javascript
/**
 * TokenManager - Handles secure token storage
 */
class TokenManager {
  /**
   * Store token securely (encrypted at rest)
   */
  async storeToken(platform, accountName, token) {
    const encrypted = await this.encrypt(token);
    // Store encrypted token
  }

  /**
   * Retrieve and decrypt token
   */
  async getToken(platform, accountName) {
    const encrypted = await this.getStoredToken(platform, accountName);
    return await this.decrypt(encrypted);
  }

  /**
   * Use Web Crypto API for encryption
   */
  private async encrypt(plaintext) {
    // Use SubtleCrypto for encryption
  }

  private async decrypt(encrypted) {
    // Use SubtleCrypto for decryption
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Create abstraction interfaces
- [ ] Implement PlatformManager
- [ ] Create TokenManager with encryption
- [ ] Migrate existing GitHub code to GitHubAdapter
- [ ] Update storage schema with migration script

### Phase 2: Platform Adapters (Weeks 3-4)

- [ ] Implement GitLabAdapter (with self-hosted support)
- [ ] Implement GiteaAdapter
- [ ] Implement BitbucketAdapter
- [ ] Create adapter tests

### Phase 3: UI/UX Redesign (Weeks 5-6)

- [ ] Update popup.html for multi-platform
- [ ] Add platform selector component
- [ ] Create conditional UI sections
- [ ] Add platform-specific settings panels
- [ ] Implement visual consistency

### Phase 4: Report Generation (Week 7)

- [ ] Create DataProcessor (platform-agnostic)
- [ ] Update report generation logic
- [ ] Implement data normalization
- [ ] Create report templates

### Phase 5: Testing & Refinement (Week 8)

- [ ] Integration testing
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Documentation

### Phase 6: Deployment (Week 9)

- [ ] Create migration guide
- [ ] Update README & docs
- [ ] Release management

---

## Code Organization

### New Directory Structure

```
scrum_helper/
├── src/
│   ├── scripts/
│   │   ├── core/
│   │   │   ├── platformManager.js
│   │   │   ├── tokenManager.js
│   │   │   ├── storageManager.js
│   │   │   ├── configManager.js
│   │   │   └── dataProcessor.js
│   │   │
│   │   ├── adapters/
│   │   │   ├── platformInterface.js (abstract)
│   │   │   ├── githubAdapter.js
│   │   │   ├── gitlabAdapter.js
│   │   │   ├── giteaAdapter.js
│   │   │   ├── bitbucketAdapter.js
│   │   │   └── adapterUtils.js (shared utilities)
│   │   │
│   │   ├── ui/
│   │   │   ├── components/
│   │   │   │   ├─ platformSelector.js
│   │   │   │   ├─ tokenInput.js
│   │   │   │   ├─ settingsPanel.js
│   │   │   │   └─ reportGenerator.js
│   │   │   └── uiManager.js
│   │   │
│   │   ├── formatters/
│   │   │   ├── reportFormatter.js
│   │   │   ├── emailFormatter.js
│   │   │   └── templates/
│   │   │       ├─ default.html
│   │   │       ├─ detailed.html
│   │   │       └─ summary.html
│   │   │
│   │   ├── popup.js (refactored - thin layer)
│   │   ├── background.js (updated)
│   │   ├── emailClientAdapter.js (existing)
│   │   ├── main.js (existing)
│   │   └── jquery-3.2.1.min.js (existing)
│   │
│   ├── styles/
│   │   ├── variables.css (design tokens)
│   │   ├── components.css (component styles)
│   │   ├── platforms.css (platform-specific)
│   │   ├── popup.css (popup-specific)
│   │   ├── dark-mode.css (dark mode)
│   │   └── responsive.css (responsive)
│   │
│   ├── popup.html (redesigned)
│   ├── manifest.json (updated scripts)
│   └── _locales/
│       └── en/ (updated translations)
│
├── tests/
│   ├── adapters/
│   │   ├── github.test.js
│   │   ├── gitlab.test.js
│   │   ├── gitea.test.js
│   │   └── bitbucket.test.js
│   ├── core/
│   │   ├── platformManager.test.js
│   │   ├── tokenManager.test.js
│   │   └── dataProcessor.test.js
│   └── ui/
│       └── components.test.js
│
├── docs/
│   ├── PLATFORM_SETUP.md (setup guides for each platform)
│   ├── API_REFERENCE.md (adapter API docs)
│   ├── CONTRIBUTING.md (updated)
│   └── MIGRATION_GUIDE.md (for existing users)
│
└── MULTI_PLATFORM_ARCHITECTURE.md (this file)
```

### Migration Script Example

```javascript
/**
 * Storage schema migration from v1 to v2
 */
class StorageMigration {
  static async migrate() {
    const v1Data = await this.getV1Data();
    const v2Data = this.transformToV2(v1Data);
    await chrome.storage.local.set(v2Data);
  }

  private static transformToV2(v1Data) {
    return {
      activePlatform: 'github',
      platforms: {
        github: {
          accounts: {
            primary: {
              username: v1Data.platformUsername,
              token: v1Data.githubToken,
              organization: v1Data.orgName,
              isActive: true
            }
          }
        }
      },
      reportSettings: {
        projectName: v1Data.projectName,
        includeCommits: v1Data.showCommits,
        // ... other settings
      }
    };
  }
}
```

---

## Benefits of This Architecture

### Maintainability

✅ Clear separation of concerns
✅ Each adapter is independent and testable
✅ Platform-specific logic isolated
✅ Easy to add new platforms (minimal changes)

### Extensibility

✅ Plugin-based system for adding platforms
✅ Standardized interface for new adapters
✅ Component-based UI system
✅ Template-based report generation

### User Experience

✅ Platform-agnostic settings
✅ Seamless switching between platforms
✅ Support for multiple accounts
✅ Consistent UI across platforms

### Performance

✅ Lazy loading of adapters
✅ Platform-specific optimizations
✅ Intelligent caching per platform
✅ Minimal bundle size growth

### Security

✅ Encrypted token storage
✅ Token manager abstraction
✅ Input validation per adapter
✅ Secure credential handling

---

## Risk Mitigation

### Backward Compatibility

- [ ] Create storage migration script
- [ ] Support old format temporarily
- [ ] Provide rollback mechanism
- [ ] Clear migration documentation

### Testing Requirements

- [ ] Unit tests for each adapter
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] Cross-platform testing
- [ ] Real API testing with test accounts

### Performance Monitoring

- [ ] Measure adapter load times
- [ ] Monitor cache effectiveness
- [ ] Track error rates per platform
- [ ] User analytics for platform usage

---

## Next Steps

1. **Review & Approve Architecture**: Get team feedback on design
2. **Create Base Implementation**: Start with platformManager and interface
3. **Setup Testing Framework**: Jest/Mocha for adapter testing
4. **Migrate GitHub**: Refactor existing code to GitHubAdapter
5. **Implement Adapters**: Build each adapter sequentially
6. **UI/UX Implementation**: Redesign popup with platform support
7. **Integration & Testing**: Full system testing
8. **Documentation**: Complete setup guides and API docs
9. **Release Planning**: Beta, feedback, production release

---

## Questions for Discussion

1. Should we support OAuth for platforms that offer it (beyond basic token auth)?
2. Do we need to support Gitea/Bitbucket server (self-hosted) variants?
3. Should we implement rate-limiting strategy per platform?
4. Do we need export/import of settings and history?
5. Should we add analytics to track which platforms users are using?

---

_Last Updated: March 2, 2024_
_Version: 1.0_
