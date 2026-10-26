import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DOMPurify from '../src/libs/purify.min.js';
import '../src/scripts/githubHelper.js';

const sanitizeHtml = new Function(`${readFileSync(resolve('src/scripts/domSanitizer.js'), 'utf8')}\nreturn sanitizeHtml;`)();

describe('GitHubHelper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.DOMPurify = DOMPurify;
		globalThis.sanitizeHtml = sanitizeHtml;
		document.body.innerHTML = '';
	});

	afterEach(() => {
		delete globalThis.sanitizeHtml;
		delete globalThis.DOMPurify;
		vi.restoreAllMocks();
	});

	describe('parseGithubOrgs', () => {
		it('should return an empty array for empty, falsy, or whitespace input', () => {
			expect(window.parseGithubOrgs('')).toEqual([]);
			expect(window.parseGithubOrgs(null)).toEqual([]);
			expect(window.parseGithubOrgs(undefined)).toEqual([]);
			expect(window.parseGithubOrgs('   ')).toEqual([]);
		});

		it('should parse a single organization and convert to lowercase', () => {
			expect(window.parseGithubOrgs('FOSSASIA')).toEqual(['fossasia']);
			expect(window.parseGithubOrgs('  Google  ')).toEqual(['google']);
		});

		it('should parse comma-separated organizations, trim whitespace, and ignore empty tokens', () => {
			expect(window.parseGithubOrgs('fossasia,  google , , open-source ')).toEqual([
				'fossasia',
				'google',
				'open-source',
			]);
		});

		it('should filter out "all" case-insensitively', () => {
			expect(window.parseGithubOrgs('all, FOSSASIA, ALL, All, scrum-helper, ')).toEqual([
				'fossasia',
				'scrum-helper',
			]);
		});

		it('should return empty array if only "all" or whitespace tokens are provided', () => {
			expect(window.parseGithubOrgs('all, ALL,   , All')).toEqual([]);
		});
	});

	describe('buildGithubOrgQuery', () => {
		it('should return an empty string when orgStr is empty, falsy, or only contains "all"', () => {
			expect(window.buildGithubOrgQuery('')).toBe('');
			expect(window.buildGithubOrgQuery(null)).toBe('');
			expect(window.buildGithubOrgQuery('all, ALL')).toBe('');
		});

		it('should format a single org query with +org prefix', () => {
			expect(window.buildGithubOrgQuery('fossasia')).toBe('+org:fossasia');
			expect(window.buildGithubOrgQuery('  FOSSASIA  ')).toBe('+org:fossasia');
		});

		it('should format multiple orgs joined by +', () => {
			expect(window.buildGithubOrgQuery('fossasia, google')).toBe('+org:fossasia+org:google');
			expect(window.buildGithubOrgQuery('all, FOSSASIA, kubernetes')).toBe('+org:fossasia+org:kubernetes');
		});
	});

	describe('makeRepoCacheKey', () => {
		it('should generate unauthenticated cache key for github when token is absent', () => {
			const key = window.makeRepoCacheKey('testuser', 'fossasia', 'github', {});
			expect(key).toBe('repos-github-testuser-fossasia-notoken');
		});

		it('should generate unauthenticated cache key for gitlab when token is absent', () => {
			const key = window.makeRepoCacheKey('testuser', 'fossasia', 'gitlab', {});
			expect(key).toBe('repos-gitlab-testuser-fossasia-notoken');
		});

		it('should generate deterministic token-hashed cache key for github', () => {
			const key1 = window.makeRepoCacheKey('testuser', 'fossasia', 'github', {
				githubToken: 'ghp_secretToken123',
			});
			const key2 = window.makeRepoCacheKey('testuser', 'fossasia', 'github', {
				githubToken: 'ghp_secretToken123',
			});

			expect(key1).toMatch(/^repos-github-testuser-fossasia-token-[a-z0-9]+$/);
			expect(key1).toBe(key2);
			expect(key1).not.toContain('ghp_secretToken123');
		});

		it('should generate distinct cache keys for different tokens', () => {
			const keyA = window.makeRepoCacheKey('testuser', 'fossasia', 'github', {
				githubToken: 'token-A',
			});
			const keyB = window.makeRepoCacheKey('testuser', 'fossasia', 'github', {
				githubToken: 'token-B',
			});

			expect(keyA).not.toBe(keyB);
		});

		it('should normalize and sort comma-separated org names in cache key', () => {
			const key1 = window.makeRepoCacheKey('testuser', 'google, fossasia', 'github', {});
			const key2 = window.makeRepoCacheKey('testuser', 'fossasia, google', 'github', {});

			expect(key1).toBe('repos-github-testuser-fossasia,google-notoken');
			expect(key1).toBe(key2);
		});

		it('should generate standard fallback key for other platforms', () => {
			const key = window.makeRepoCacheKey('testuser', 'fossasia', 'codeberg', {});
			expect(key).toBe('repos-codeberg-testuser-fossasia');
		});
	});

	describe('githubValidateToken', () => {
		it('should return invalid for empty, null, or whitespace-only token without calling fetch', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn();
			try {
				expect(await window.githubValidateToken('')).toEqual({ valid: false, status: 0, reason: 'empty' });
				expect(await window.githubValidateToken(null)).toEqual({ valid: false, status: 0, reason: 'empty' });
				expect(await window.githubValidateToken('   ')).toEqual({ valid: false, status: 0, reason: 'empty' });
				expect(global.fetch).not.toHaveBeenCalled();
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should return valid on HTTP 200 with correct headers passed to fetch', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
			});

			try {
				const result = await window.githubValidateToken('valid-token-123');
				expect(result).toEqual({ valid: true, status: 200 });
				expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/user', {
					headers: {
						Accept: 'application/vnd.github.v3+json',
						Authorization: 'token valid-token-123',
					},
				});
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should return invalid on HTTP 401', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
			});

			try {
				const result = await window.githubValidateToken('bad-token');
				expect(result).toEqual({ valid: false, status: 401, reason: 'invalid' });
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should treat HTTP 403 as valid with rateLimited flag when remaining requests is "0"', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				headers: {
					get: (name) => (name.toLowerCase() === 'x-ratelimit-remaining' ? '0' : null),
				},
			});

			try {
				const result = await window.githubValidateToken('rate-limited-token');
				expect(result).toEqual({ valid: true, rateLimited: true });
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should detect bad credentials disguised as HTTP 403 and return invalid', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				headers: {
					get: () => '100',
				},
				clone: () => ({
					json: async () => ({ message: 'Bad credentials' }),
				}),
			});

			try {
				const result = await window.githubValidateToken('bad-token-403');
				expect(result).toEqual({ valid: false, status: 401, reason: 'invalid' });
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should return forbidden on regular HTTP 403 response', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				headers: {
					get: () => '50',
				},
				clone: () => ({
					json: async () => ({ message: 'Resource blocked by admin policy' }),
				}),
			});

			try {
				const result = await window.githubValidateToken('forbidden-token');
				expect(result).toEqual({ valid: false, status: 403, reason: 'forbidden' });
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should return error for other non-ok HTTP statuses', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			try {
				const result = await window.githubValidateToken('server-error-token');
				expect(result).toEqual({ valid: false, status: 500, reason: 'error' });
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should gracefully handle fetch rejection as network error fallback', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

			try {
				const result = await window.githubValidateToken('offline-token');
				expect(result).toEqual({ valid: true, networkError: true });
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe('githubFetchUser', () => {
		it('should return 404 response object immediately when username is empty or falsy without calling fetch', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn();
			try {
				const resEmpty = await window.githubFetchUser('');
				expect(resEmpty.status).toBe(404);
				expect(resEmpty.ok).toBe(false);
				const data = await resEmpty.json();
				expect(data).toEqual({ message: 'Not Found' });

				const resNull = await window.githubFetchUser(null);
				expect(resNull.status).toBe(404);
				expect(global.fetch).not.toHaveBeenCalled();
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should fetch user profile with URL encoding and token header when provided', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ login: 'user/with-special' }),
			});

			try {
				await window.githubFetchUser('user/with-special', 'ghp_token');
				expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/users/user%2Fwith-special', {
					headers: {
						Accept: 'application/vnd.github.v3+json',
						Authorization: 'token ghp_token',
					},
				});
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should fetch user profile without Authorization header when token is omitted', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
			});

			try {
				await window.githubFetchUser('testuser');
				expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/users/testuser', {
					headers: {
						Accept: 'application/vnd.github.v3+json',
					},
				});
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe('githubFetchIssues', () => {
		it('should return empty items immediately if username is empty or falsy without calling fetch', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn();
			try {
				const res = await window.githubFetchIssues('');
				expect(res.status).toBe(404);
				expect(res.ok).toBe(false);
				const data = await res.json();
				expect(data).toEqual({ items: [] });
				expect(global.fetch).not.toHaveBeenCalled();
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should construct search URL with author, dates, and org query', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
			});

			try {
				await window.githubFetchIssues('testuser', 'token123', '2026-10-01', '2026-10-10', 'fossasia');
				expect(global.fetch).toHaveBeenCalledWith(
					'https://api.github.com/search/issues?q=author%3Atestuser+org:fossasia+updated%3A2026-10-01..2026-10-10&per_page=100',
					{
						headers: {
							Accept: 'application/vnd.github.v3+json',
							Authorization: 'token token123',
						},
					},
				);
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should include repoQueries qualifier when specified', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
			});

			try {
				await window.githubFetchIssues(
					'testuser',
					'token123',
					'2026-10-01',
					'2026-10-10',
					'',
					'repo:fossasia/scrum_helper',
				);
				expect(global.fetch).toHaveBeenCalledWith(
					'https://api.github.com/search/issues?q=author%3Atestuser+repo:fossasia/scrum_helper+updated%3A2026-10-01..2026-10-10&per_page=100',
					expect.any(Object),
				);
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe('githubFetchPrMergedStatusREST', () => {
		it('should return true when PR payload has merged_at', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ merged_at: '2026-10-05T12:00:00Z' }),
			});

			try {
				const merged = await window.githubFetchPrMergedStatusREST('fossasia', 'scrum_helper', 914, 'token');
				expect(merged).toBe(true);
				expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/repos/fossasia/scrum_helper/pulls/914', {
					headers: {
						Accept: 'application/vnd.github.v3+json',
						Authorization: 'token token',
					},
				});
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should return false when PR payload merged_at is null', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ merged_at: null }),
			});

			try {
				const merged = await window.githubFetchPrMergedStatusREST('fossasia', 'scrum_helper', 915, 'token');
				expect(merged).toBe(false);
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should return null when response is not ok', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			});

			try {
				const merged = await window.githubFetchPrMergedStatusREST('fossasia', 'scrum_helper', 9999, 'token');
				expect(merged).toBeNull();
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should use session cache on subsequent calls for the same PR without making another request', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ merged_at: '2026-10-08T10:00:00Z' }),
			});

			try {
				const firstResult = await window.githubFetchPrMergedStatusREST('fossasia', 'scrum_helper', 800, 'tok');
				expect(firstResult).toBe(true);
				expect(global.fetch).toHaveBeenCalledTimes(1);

				const secondResult = await window.githubFetchPrMergedStatusREST('fossasia', 'scrum_helper', 800, 'tok');
				expect(secondResult).toBe(true);
				expect(global.fetch).toHaveBeenCalledTimes(1);
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe('fetchIssuesFromGitHub (Next Plans assigned issues)', () => {
		it('should throw an error without calling fetch if username is missing in storage', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn();
			try {
				browser.storage.local.get.mockResolvedValueOnce({
					githubUsername: '',
					platformUsername: '',
					githubToken: 'token123',
				});

				await expect(window.fetchIssuesFromGitHub({ type: 'all' })).rejects.toThrow(
					'GitHub username is required. Please set it in settings.',
				);
				expect(global.fetch).not.toHaveBeenCalled();
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should throw an error without calling fetch if token is missing in storage', async () => {
			const originalFetch = global.fetch;
			global.fetch = vi.fn();
			try {
				browser.storage.local.get.mockResolvedValueOnce({
					githubUsername: 'testuser',
					githubToken: '',
				});

				await expect(window.fetchIssuesFromGitHub({ type: 'all' })).rejects.toThrow(
					'GitHub token is required. Please set it in settings.',
				);
				expect(global.fetch).not.toHaveBeenCalled();
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should fetch, map, and filter assigned issues properly', async () => {
			browser.storage.local.get.mockResolvedValueOnce({
				platform: 'github',
				githubUsername: 'octocat',
				githubToken: 'ghp_secret',
			});

			const mockItems = [
				{
					id: 101,
					number: 10,
					title: '<script>alert(1)</script>Fix issue title',
					html_url: 'https://github.com/fossasia/scrum_helper/issues/10<img src=x onerror=alert(1)>',
					repository_url: 'https://api.github.com/repos/fossasia/scrum_helper',
					state: 'open',
				},
				{
					id: 102,
					number: 20,
					title: 'Other repo issue',
					html_url: 'https://github.com/other/repo/issues/20',
					repository_url: 'https://api.github.com/repos/other/repo',
					state: 'open',
				},
				{
					id: 103,
					number: 'invalid',
					title: 'Malformed issue',
					html_url: 'https://github.com/fossasia/scrum_helper/issues/bad',
					repository_url: 'https://api.github.com/repos/fossasia/scrum_helper',
					state: 'open',
				},
			];

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ items: mockItems }),
			});

			try {
				const issues = await window.fetchIssuesFromGitHub({
					type: 'selected',
					repos: ['fossasia/scrum_helper'],
				});

				expect(issues).toHaveLength(1);
				expect(issues[0]).toEqual({
					id: 101,
					number: 10,
					title: 'Fix issue title',
					html_url: 'https://github.com/fossasia/scrum_helper/issues/10',
					repository: 'fossasia/scrum_helper',
					state: 'open',
					_platform: 'github',
					platform: 'github',
				});
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should handle pagination when items count is 100 on page 1', async () => {
			browser.storage.local.get.mockResolvedValueOnce({
				githubUsername: 'octocat',
				githubToken: 'ghp_secret',
			});

			const page1Items = Array.from({ length: 100 }, (_, i) => ({
				id: i + 1,
				number: i + 1,
				title: `Issue ${i + 1}`,
				html_url: `https://github.com/fossasia/scrum_helper/issues/${i + 1}`,
				repository_url: 'https://api.github.com/repos/fossasia/scrum_helper',
				state: 'open',
			}));

			const page2Items = [
				{
					id: 101,
					number: 101,
					title: 'Issue 101',
					html_url: 'https://github.com/fossasia/scrum_helper/issues/101',
					repository_url: 'https://api.github.com/repos/fossasia/scrum_helper',
					state: 'open',
				},
			];

			const originalFetch = global.fetch;
			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ items: page1Items }),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ items: page2Items }),
				});

			try {
				const issues = await window.fetchIssuesFromGitHub({ type: 'all' });
				expect(global.fetch).toHaveBeenCalledTimes(2);
				expect(issues).toHaveLength(101);
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should throw an error when API response is not ok', async () => {
			browser.storage.local.get.mockResolvedValueOnce({
				githubUsername: 'octocat',
				githubToken: 'ghp_secret',
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Forbidden',
				json: async () => ({ message: 'API rate limit exceeded' }),
			});

			try {
				await expect(window.fetchIssuesFromGitHub({ type: 'all' })).rejects.toThrow(
					'GitHub API error: API rate limit exceeded',
				);
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe('UI Token guards', () => {
		beforeEach(() => {
			document.body.innerHTML = `
				<input type="checkbox" id="showCommits" />
				<input type="checkbox" id="includeNextPlans" />
				<input type="checkbox" id="onlyMergedPRs" />
				<input type="checkbox" id="useRepoFilter" />
				<div id="repoFilterContainer"></div>
				<input type="text" id="githubToken" />
				<div id="tokenWarningForShowCommits" class="hidden"></div>
				<div id="tokenWarningForNextPlans" class="hidden"></div>
				<div id="tokenWarningForMergedPRs" class="hidden"></div>
				<div id="tokenWarningForFilter" class="hidden"></div>
			`;
		});

		it('checkTokenForShowCommits unchecks and shows warning if token is empty', () => {
			const checkbox = document.getElementById('showCommits');
			const warning = document.getElementById('tokenWarningForShowCommits');
			checkbox.checked = true;

			window.checkTokenForShowCommits({ showWarning: true });

			expect(checkbox.checked).toBe(false);
			expect(warning.classList.contains('hidden')).toBe(false);
			expect(browser.storage.local.set).toHaveBeenCalledWith({ showCommits: false });
		});

		it('checkTokenForShowCommits hides warning and saves state when token is present', () => {
			const checkbox = document.getElementById('showCommits');
			const tokenInput = document.getElementById('githubToken');
			const warning = document.getElementById('tokenWarningForShowCommits');

			checkbox.checked = true;
			tokenInput.value = 'valid-token';
			warning.classList.remove('hidden');

			window.checkTokenForShowCommits({ persistState: true });

			expect(checkbox.checked).toBe(true);
			expect(warning.classList.contains('hidden')).toBe(true);
			expect(browser.storage.local.set).toHaveBeenCalledWith({ showCommits: true });
		});

		it('checkTokenForNextPlans unchecks and shows warning if token is empty', () => {
			const checkbox = document.getElementById('includeNextPlans');
			const warning = document.getElementById('tokenWarningForNextPlans');
			checkbox.checked = true;

			window.checkTokenForNextPlans({ showWarning: true });

			expect(checkbox.checked).toBe(false);
			expect(warning.classList.contains('hidden')).toBe(false);
			expect(browser.storage.local.set).toHaveBeenCalledWith({ includeNextPlans: false });
		});

		it('checkTokenForMergedPRs shows warning if token is empty and preserves checkbox', () => {
			const checkbox = document.getElementById('onlyMergedPRs');
			const warning = document.getElementById('tokenWarningForMergedPRs');
			checkbox.checked = true;

			window.checkTokenForMergedPRs({ showWarning: true, persistState: true });

			expect(checkbox.checked).toBe(true);
			expect(warning.classList.contains('hidden')).toBe(false);
			expect(chrome.storage.local.set).toHaveBeenCalledWith({ onlyMergedPRs: true });
		});

		it('checkTokenForFilter unchecks filter, hides container, and shows warning if token is empty', () => {
			const checkbox = document.getElementById('useRepoFilter');
			const container = document.getElementById('repoFilterContainer');
			const warning = document.getElementById('tokenWarningForFilter');
			checkbox.checked = true;

			window.checkTokenForFilter();

			expect(checkbox.checked).toBe(false);
			expect(container.classList.contains('hidden')).toBe(true);
			expect(warning.classList.contains('hidden')).toBe(false);
			expect(browser.storage.local.set).toHaveBeenCalledWith({ useRepoFilter: false });
		});
	});

	describe('PlatformRegistry integration', () => {
		it('should have registered github helper in PlatformRegistry and assigned to window.githubHelper', () => {
			expect(window.PlatformRegistry).toBeDefined();
			const githubHelper = window.PlatformRegistry.get('github');
			expect(githubHelper).toBeDefined();
			expect(window.githubHelper).toBe(githubHelper);
			expect(githubHelper.hasRepoFilter).toBe(true);
			expect(typeof githubHelper.validateToken).toBe('function');
			expect(typeof githubHelper.checkTokenForFilter).toBe('function');
			expect(typeof githubHelper.checkTokenForShowCommits).toBe('function');
			expect(typeof githubHelper.checkTokenForMergedPRs).toBe('function');
			expect(typeof githubHelper.checkTokenForNextPlans).toBe('function');
			expect(typeof githubHelper.fetchAssignedIssues).toBe('function');
			expect(typeof githubHelper.forceDataRefresh).toBe('function');
			expect(typeof window.githubHelper.validateToken).toBe('function');
			expect(typeof window.githubHelper.fetchAssignedIssues).toBe('function');
		});

		it('should allow consumers to retrieve the registered helper and invoke its methods', async () => {
			const githubHelper = window.PlatformRegistry.get('github');
			expect(githubHelper).toBeDefined();

			const validateSpy = vi.spyOn(githubHelper, 'validateToken').mockResolvedValueOnce({ valid: true, username: 'octocat' });
			const fetchSpy = vi.spyOn(githubHelper, 'fetchAssignedIssues').mockResolvedValueOnce([{ id: 101, title: 'Fix bug' }]);

			// Simulate a consumer (e.g. NextPlans or popup dispatch) retrieving and executing the helper methods
			const consumer = async (platformName) => {
				const helper = window.PlatformRegistry?.get(platformName);
				if (!helper) return null;
				const auth = await helper.validateToken('ghp_test');
				const issues = await helper.fetchAssignedIssues({ type: 'selected' });
				return { auth, issues };
			};

			const result = await consumer('github');
			expect(validateSpy).toHaveBeenCalledWith('ghp_test');
			expect(fetchSpy).toHaveBeenCalledWith({ type: 'selected' });
			expect(result).toEqual({
				auth: { valid: true, username: 'octocat' },
				issues: [{ id: 101, title: 'Fix bug' }],
			});
		});
	});
});
