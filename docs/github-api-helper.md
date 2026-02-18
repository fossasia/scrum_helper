# GitHub API Helper

A lightweight, focused module for fetching GitHub issues and pull requests via the GitHub REST API v3.

## Features

- ✅ **Fetch assigned issues** - Get issues assigned to the authenticated user
- ✅ **Fetch user pull requests** - Get PRs created by the authenticated user
- ✅ **Caching support** - Reduces API calls with 5-minute cache TTL
- ✅ **Error handling** - Clear, user-friendly error messages
- ✅ **Rate limit aware** - Handles GitHub API rate limiting
- ✅ **Token-based auth** - Secure authentication via personal access tokens

## Usage

### Basic Setup

```javascript
// Initialize the helper
const githubApi = new GitHubApiHelper();

// Set your GitHub token
githubApi.setToken('ghp_your_token_here');

// Optionally set username (auto-fetched if not set)
githubApi.setUsername('your-username');
```

### Fetch Assigned Issues

```javascript
// Get open issues assigned to you
const issues = await githubApi.getAssignedIssues('open');

// Get all issues (open and closed)
const allIssues = await githubApi.getAssignedIssues('all');
```

### Fetch Your Pull Requests

```javascript
// Get your open PRs
const prs = await githubApi.getUserPullRequests('open');

// Get all your PRs
const allPRs = await githubApi.getUserPullRequests('all');
```

### Get Recent Activity

```javascript
// Get combined recent issues and PRs (sorted by update time)
const recentItems = await githubApi.getRecentActivity();
```

### Test Connection

```javascript
// Verify token and connection
const result = await githubApi.testConnection();
if (result.success) {
    console.log('Connected as:', result.user.login);
} else {
    console.error('Connection failed:', result.message);
}
```

## Response Format

All methods return items with a consistent structure:

```javascript
{
    id: 12345,
    number: 161,
    title: "Add planned work selection feature",
    url: "https://github.com/owner/repo/issues/161",
    repository: {
        name: "repo",
        full_name: "owner/repo"
    },
    type: "issue" | "pull_request",
    state: "open" | "closed",
    labels: [{name: "enhancement", color: "a2eeef"}],
    updated_at: "2026-01-15T10:30:00Z",
    created_at: "2026-01-13T08:00:00Z",
    assignees: [{login: "username"}],
    author: "username"
}
```

## Error Handling

The module throws clear errors for common issues:

- **Token not set**: `"GitHub token not set. Please configure your token in settings."`
- **Invalid token**: `"Invalid GitHub token. Please check your token in settings."`
- **Rate limit**: `"API rate limit exceeded. Please try again later."`
- **Network errors**: `"GitHub API error: 500 Internal Server Error"`

## Caching

- Responses are cached for **5 minutes** to reduce API calls
- Cache is stored in memory (cleared on page reload)
- Call `clearCache()` to manually clear the cache

```javascript
// Clear cache to force fresh data
githubApi.clearCache();
```

## Requirements

- GitHub Personal Access Token with `repo` and `read:user` scopes
- Modern browser with Fetch API support

## Security

- Tokens are never logged or exposed
- All API requests use HTTPS
- Follows GitHub API best practices

## Contributing

This module is part of the Scrum Helper extension planned work feature. For questions or improvements, please open an issue.

## License

Part of the Scrum Helper extension - see main project LICENSE
