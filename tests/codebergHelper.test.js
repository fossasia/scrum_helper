import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CodebergHelper from '../src/scripts/codebergHelper.js';
import '../src/scripts/nextPlansHelper.js';

describe('CodebergHelper', () => {
	let helper;

	beforeEach(() => {
		helper = new CodebergHelper();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor and URL normalization', () => {
		it('should initialize with default base URL when omitted', () => {
			const defaultHelper = new CodebergHelper();
			expect(defaultHelper.baseUrl).toBe('https://codeberg.org/api/v1');
		});

		it('should strip trailing slashes from custom base URL', () => {
			const customHelper = new CodebergHelper('https://my-codeberg.instance/api/v1///');
			expect(customHelper.baseUrl).toBe('https://my-codeberg.instance/api/v1');
		});

		it('should trim surrounding whitespace from custom base URL', () => {
			const customHelper = new CodebergHelper('   https://my-codeberg.instance/api/v1   ');
			expect(customHelper.baseUrl).toBe('https://my-codeberg.instance/api/v1');
		});

		it('should fall back to default when empty or null base URL is passed', () => {
			const emptyHelper = new CodebergHelper('');
			const nullHelper = new CodebergHelper(null);
			expect(emptyHelper.baseUrl).toBe('https://codeberg.org/api/v1');
			expect(nullHelper.baseUrl).toBe('https://codeberg.org/api/v1');
		});

		it('should initialize cache state correctly', () => {
			expect(helper.cache).toEqual({
				data: null,
				cacheKey: null,
				timestamp: 0,
				ttl: 10 * 60 * 1000,
				fetching: false,
				queue: [],
			});
		});
	});

	describe('mapCodebergReportItem', () => {
		it('should map issue from web URL correctly', () => {
			const item = {
				number: 42,
				title: 'Fix typo in documentation',
				state: 'closed',
				html_url: 'https://codeberg.org/fossasia/scrum_helper/issues/42',
			};

			const mapped = helper.mapCodebergReportItem(item, 'issue');

			expect(mapped.number).toBe(42);
			expect(mapped.title).toBe('Fix typo in documentation');
			expect(mapped.state).toBe('closed');
			expect(mapped.project).toBe('fossasia/scrum_helper');
			expect(mapped.repository_url).toBe('https://codeberg.org/api/v1/repos/fossasia/scrum_helper');
			expect(mapped.html_url).toBe('https://codeberg.org/fossasia/scrum_helper/issues/42');
		});

		it('should build fallback html_url when missing from item', () => {
			const item = {
				number: 10,
				title: 'Open issue without html_url',
				state: 'open',
				url: 'https://codeberg.org/api/v1/repos/myorg/myrepo/issues/10',
			};

			const mapped = helper.mapCodebergReportItem(item, 'issue');

			expect(mapped.html_url).toBe('https://codeberg.org/myorg/myrepo/issues/10');
			expect(mapped.repository_url).toBe('https://codeberg.org/api/v1/repos/myorg/myrepo');
			expect(mapped.project).toBe('myorg/myrepo');
		});

		it('should map merge request item and ensure pull_request object exists', () => {
			const mrItem = {
				number: 5,
				title: 'Add Codeberg integration',
				state: 'open',
				html_url: 'https://codeberg.org/fossasia/scrum_helper/pulls/5',
			};

			const mapped = helper.mapCodebergReportItem(mrItem, 'mr');

			expect(mapped.state).toBe('open');
			expect(mapped.pull_request).toEqual({ merged: false });
			expect(mapped.project).toBe('fossasia/scrum_helper');
		});

		it('should preserve existing pull_request data for merged PR', () => {
			const mrItem = {
				number: 7,
				title: 'Resolved PR',
				state: 'closed',
				html_url: 'https://codeberg.org/fossasia/scrum_helper/pulls/7',
				pull_request: { merged: true, merged_at: '2026-09-20T10:00:00Z' },
			};

			const mapped = helper.mapCodebergReportItem(mrItem, 'mr');

			expect(mapped.state).toBe('closed');
			expect(mapped.pull_request).toEqual({ merged: true, merged_at: '2026-09-20T10:00:00Z' });
		});

		it('should normalize non-closed states to open', () => {
			const openItem = { number: 1, title: 'Open', state: 'open', html_url: 'https://codeberg.org/a/b/issues/1' };
			const reopenedItem = {
				number: 2,
				title: 'Reopened',
				state: 'reopened',
				html_url: 'https://codeberg.org/a/b/issues/2',
			};

			expect(helper.mapCodebergReportItem(openItem, 'issue').state).toBe('open');
			expect(helper.mapCodebergReportItem(reopenedItem, 'issue').state).toBe('open');
		});

		it('should extract owner and repo from commit URLs', () => {
			const commitItem = {
				number: 99,
				title: 'Commit item',
				state: 'closed',
				html_url: 'https://codeberg.org/owner-name/repo-name/commit/abcdef123456',
			};

			const mapped = helper.mapCodebergReportItem(commitItem, 'issue');
			expect(mapped.project).toBe('owner-name/repo-name');
			expect(mapped.repository_url).toBe('https://codeberg.org/api/v1/repos/owner-name/repo-name');
		});

		it('should gracefully handle empty or invalid URLs', () => {
			const invalidItem = {
				number: 1,
				title: 'No URL',
				state: 'open',
			};

			const mapped = helper.mapCodebergReportItem(invalidItem, 'issue');
			expect(mapped.project).toBe('');
			expect(mapped.repository_url).toBe('https://codeberg.org/api/v1/repos//');
		});
	});

	describe('mapCodebergReportData', () => {
		it('should transform issues, merge requests, and user into unified report data', () => {
			const rawData = {
				user: { login: 'sampleuser', name: 'Sample User' },
				issues: [
					{
						number: 101,
						title: 'Standard issue',
						state: 'open',
						html_url: 'https://codeberg.org/org/repo/issues/101',
					},
					{
						number: 102,
						title: 'Issue that is a PR',
						state: 'closed',
						url: 'https://codeberg.org/api/v1/repos/org/repo/issues/102',
						pull_request: { merged: true },
					},
				],
				mergeRequests: [
					{
						number: 201,
						title: 'Separate MR',
						state: 'open',
						html_url: 'https://codeberg.org/org/repo/pulls/201',
					},
				],
			};

			const report = helper.mapCodebergReportData(rawData);

			expect(report.githubIssuesData.items).toHaveLength(2);
			expect(report.githubIssuesData.items[0].number).toBe(101);
			expect(report.githubIssuesData.items[1].pull_request).toEqual({ merged: true });
			expect(report.githubIssuesData.items[1].html_url).toBe('https://codeberg.org/org/repo/pulls/102');

			expect(report.githubPrsReviewData.items).toHaveLength(1);
			expect(report.githubPrsReviewData.items[0].number).toBe(201);
			expect(report.githubPrsReviewData.items[0].pull_request).toEqual({ merged: false });

			expect(report.githubUserData).toEqual(rawData.user);
		});

		it('should support mrs field as alias for mergeRequests', () => {
			const rawData = {
				issues: [],
				mrs: [{ number: 50, title: 'Alias MR', state: 'open', html_url: 'https://codeberg.org/a/b/pulls/50' }],
			};

			const report = helper.mapCodebergReportData(rawData);
			expect(report.githubPrsReviewData.items).toHaveLength(1);
			expect(report.githubPrsReviewData.items[0].number).toBe(50);
		});

		it('should handle missing or empty arrays safely', () => {
			const report = helper.mapCodebergReportData({});

			expect(report.githubIssuesData.items).toEqual([]);
			expect(report.githubPrsReviewData.items).toEqual([]);
			expect(report.githubUserData).toEqual({});
		});
	});

	describe('storage persistence (saveToStorage and loadFromStorage)', () => {
		it('should serialize and save cache to browser.storage.local', async () => {
			helper.cache.timestamp = 1727000000000;
			helper.cache.cacheKey = 'testuser-2026-09-01-2026-09-24-auth-commits';

			const testData = { report: 'ready' };
			await helper.saveToStorage(testData);

			expect(browser.storage.local.set).toHaveBeenCalledWith({
				codebergCache: {
					data: testData,
					timestamp: 1727000000000,
					cacheKey: 'testuser-2026-09-01-2026-09-24-auth-commits',
				},
			});
		});

		it('should catch and log storage errors during saveToStorage without throwing', async () => {
			vi.spyOn(browser.storage.local, 'set').mockRejectedValue(new Error('QuotaExceededError'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await expect(helper.saveToStorage({ data: 123 })).resolves.toBeUndefined();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it('should load cached data from browser.storage.local into helper cache', async () => {
			vi.spyOn(browser.storage.local, 'get').mockResolvedValue({
				codebergCache: {
					data: { items: ['cached'] },
					timestamp: 1727111111111,
					cacheKey: 'stored-key',
				},
			});

			await helper.loadFromStorage();

			expect(helper.cache.data).toEqual({ items: ['cached'] });
			expect(helper.cache.timestamp).toBe(1727111111111);
			expect(helper.cache.cacheKey).toBe('stored-key');
		});

		it('should keep cache intact if storage has no codebergCache', async () => {
			vi.spyOn(browser.storage.local, 'get').mockResolvedValue({});

			await helper.loadFromStorage();

			expect(helper.cache.data).toBeNull();
			expect(helper.cache.timestamp).toBe(0);
		});

		it('should catch and log storage errors during loadFromStorage without throwing', async () => {
			vi.spyOn(browser.storage.local, 'get').mockRejectedValue(new Error('Storage failure'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await expect(helper.loadFromStorage()).resolves.toBeUndefined();
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe('fetchAllPaginated', () => {
		it('should paginate and aggregate items until results are less than limit', async () => {
			const page1 = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
			const page2 = Array.from({ length: 12 }, (_, i) => ({ id: 51 + i }));

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page1,
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page2,
				});

			global.fetch = fetchMock;

			const results = await helper.fetchAllPaginated('https://codeberg.org/api/v1/repos', {});

			expect(results).toHaveLength(62);
			expect(fetchMock).toHaveBeenCalledTimes(2);
			expect(fetchMock.mock.calls[0][0]).toBe('https://codeberg.org/api/v1/repos?limit=50&page=1');
			expect(fetchMock.mock.calls[1][0]).toBe('https://codeberg.org/api/v1/repos?limit=50&page=2');
		});

		it('should stop immediately when response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			});

			const results = await helper.fetchAllPaginated('https://codeberg.org/api/v1/repos', {});
			expect(results).toEqual([]);
		});

		it('should handle URL with existing query parameters correctly', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => [{ id: 1 }],
			});

			await helper.fetchAllPaginated('https://codeberg.org/api/v1/repos?state=closed', {});

			expect(global.fetch).toHaveBeenCalledWith(
				'https://codeberg.org/api/v1/repos?state=closed&limit=50&page=1',
				expect.any(Object),
			);
		});
	});

	describe('fetchAllPaginatedWithDateLimit', () => {
		it('should stop pagination when item update date is before date limit', async () => {
			const page1 = Array.from({ length: 49 }, (_, i) => ({
				id: i + 1,
				updated_at: '2026-09-20T12:00:00Z',
			}));
			// 50th item is older than the date limit (2026-09-01)
			page1.push({ id: 50, updated_at: '2026-08-15T12:00:00Z' });

			const page2 = [{ id: 51, updated_at: '2026-08-01T12:00:00Z' }];

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page1,
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page2,
				});

			const results = await helper.fetchAllPaginatedWithDateLimit(
				'https://codeberg.org/api/v1/repos',
				{},
				'2026-09-01',
			);

			expect(results).toHaveLength(50);
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it('should continue pagination when all items on first page are within date limit', async () => {
			const page1 = Array.from({ length: 50 }, (_, i) => ({
				id: i + 1,
				updated_at: '2026-09-20T12:00:00Z',
			}));
			const page2 = [{ id: 51, updated_at: '2026-09-05T12:00:00Z' }];

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page1,
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page2,
				});

			const results = await helper.fetchAllPaginatedWithDateLimit(
				'https://codeberg.org/api/v1/repos',
				{},
				'2026-09-01',
			);

			expect(results).toHaveLength(51);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('fetchIssuesFromCodeberg', () => {
		const fetchIssuesFromCodeberg = CodebergHelper.fetchIssuesFromCodeberg;

		beforeEach(() => {
			document.body.innerHTML = '<div id="tokenWarningForNextPlans" class="hidden"></div>';
			browser.storage.local.get.mockReset();
		});

		it('should return only issues assigned to the user (case-insensitive)', async () => {
			browser.storage.local.get.mockResolvedValue({
				platform: 'codeberg',
				codebergUsername: 'testUser',
				codebergToken: 'valid-token',
			});

			const mockIssues = [
				{
					id: 1,
					number: 101,
					title: 'Direct assignee uppercase',
					html_url: 'https://codeberg.org/org/repo/issues/101',
					state: 'open',
					assignee: { login: 'TESTUSER' },
					repository: { full_name: 'org/repo' },
				},
				{
					id: 2,
					number: 102,
					title: 'Assignees list with username property',
					html_url: 'https://codeberg.org/org/repo/issues/102',
					state: 'open',
					assignees: [{ username: 'testuser' }],
					repository: { name: 'repo', owner: { login: 'org' } },
				},
				{
					id: 3,
					number: 103,
					title: 'Assigned to someone else',
					html_url: 'https://codeberg.org/org/repo/issues/103',
					state: 'open',
					assignee: { login: 'otherUser' },
					repository: { full_name: 'org/repo' },
				},
			];

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockIssues,
			});

			const result = await fetchIssuesFromCodeberg({ type: 'all' });

			expect(result).toHaveLength(2);
			expect(result.map((item) => item.id)).toEqual([1, 2]);
			expect(result[0].number).toBe(101);
			expect(result[0].repository).toBe('org/repo');
			expect(result[0].platform).toBe('codeberg');
			expect(result[0]._platform).toBe('codeberg');
			expect(result[1].number).toBe(102);
			expect(result[1].repository).toBe('org/repo');
			expect(result[1].platform).toBe('codeberg');
			expect(result[1]._platform).toBe('codeberg');
		});

		it('should exclude pull requests', async () => {
			browser.storage.local.get.mockResolvedValue({
				platform: 'codeberg',
				codebergUsername: 'testUser',
				codebergToken: 'valid-token',
			});

			const mockIssues = [
				{
					id: 10,
					number: 1,
					title: 'Regular issue',
					html_url: 'https://codeberg.org/org/repo/issues/1',
					state: 'open',
					assignee: { login: 'testUser' },
					pull_request: null,
					repository: { full_name: 'org/repo' },
				},
				{
					id: 20,
					number: 2,
					title: 'Pull request item',
					html_url: 'https://codeberg.org/org/repo/pulls/2',
					state: 'open',
					assignee: { login: 'testUser' },
					pull_request: { merged: false },
					repository: { full_name: 'org/repo' },
				},
			];

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockIssues,
			});

			const result = await fetchIssuesFromCodeberg({ type: 'all' });

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(10);
			expect(result[0].number).toBe(1);
		});

		it('should combine pages when pagination occurs', async () => {
			browser.storage.local.get.mockResolvedValue({
				platform: 'codeberg',
				codebergUsername: 'testUser',
				codebergToken: 'valid-token',
			});

			const page1 = Array.from({ length: 50 }, (_, i) => ({
				id: i + 1,
				number: i + 1,
				title: `Page 1 Issue ${i + 1}`,
				html_url: `https://codeberg.org/org/repo/issues/${i + 1}`,
				state: 'open',
				assignee: { login: 'testUser' },
				repository: { full_name: 'org/repo' },
			}));

			const page2 = Array.from({ length: 15 }, (_, i) => ({
				id: 50 + i + 1,
				number: 50 + i + 1,
				title: `Page 2 Issue ${i + 1}`,
				html_url: `https://codeberg.org/org/repo/issues/${50 + i + 1}`,
				state: 'open',
				assignee: { login: 'testUser' },
				repository: { full_name: 'org/repo' },
			}));

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page1,
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => page2,
				});

			const result = await fetchIssuesFromCodeberg({ type: 'all' });

			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).toHaveBeenNthCalledWith(
				1,
				expect.stringContaining('page=1&limit=50'),
				expect.any(Object),
			);
			expect(global.fetch).toHaveBeenNthCalledWith(
				2,
				expect.stringContaining('page=2&limit=50'),
				expect.any(Object),
			);
			expect(result).toHaveLength(65);
			expect(result[0].id).toBe(1);
			expect(result[64].id).toBe(65);
		});

		it('should show the token warning and reject when token is missing', async () => {
			browser.storage.local.get.mockResolvedValue({
				platform: 'codeberg',
				codebergUsername: 'testUser',
				codebergToken: '',
			});

			await expect(fetchIssuesFromCodeberg()).rejects.toThrow('Codeberg token is required');

			const warning = document.getElementById('tokenWarningForNextPlans');
			expect(warning.classList.contains('hidden')).toBe(false);
		});

		it('should show the token warning and reject when username is missing', async () => {
			browser.storage.local.get.mockResolvedValue({
				platform: 'codeberg',
				codebergUsername: '',
				codebergToken: 'some-token',
			});

			await expect(fetchIssuesFromCodeberg()).rejects.toThrow('Codeberg username is required');

			const warning = document.getElementById('tokenWarningForNextPlans');
			expect(warning.classList.contains('hidden')).toBe(false);
		});

		it('should not filter out Codeberg issues when scope belongs to GitHub or GitLab', async () => {
			browser.storage.local.get.mockResolvedValue({
				platform: 'codeberg',
				codebergUsername: 'testUser',
				codebergToken: 'valid-token',
			});

			const mockIssues = [
				{
					id: 99,
					number: 99,
					title: 'Codeberg Issue',
					html_url: 'https://codeberg.org/fossasia/codeberg-repo/issues/99',
					state: 'open',
					assignee: { login: 'testUser' },
					repository: { full_name: 'fossasia/codeberg-repo' },
				},
			];

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockIssues,
			});

			const githubScope = {
				type: 'selected',
				repos: ['fossasia/scrum_helper'],
				platform: 'github',
			};

			const result = await fetchIssuesFromCodeberg(githubScope);

			expect(result).toHaveLength(1);
			expect(result[0].repository).toBe('fossasia/codeberg-repo');
		});
	});

	describe('Next Plans Codeberg selection and cache identity', () => {
		beforeEach(() => {
			localStorage.clear();
			document.body.innerHTML = `
				<input type="checkbox" id="includeNextPlans" checked />
				<div id="assignedIssuesSelector"></div>
			`;
			browser.storage.local.get.mockReset();
			window.PlatformRegistry = {
				get: (p) => {
					if (p === 'codeberg') {
						return { fetchAssignedIssues: CodebergHelper.fetchIssuesFromCodeberg };
					}
					return null;
				},
			};
		});

		it('uses platform-qualified issue ID in checkbox and resolves it in getNextPlansForReport', async () => {
			browser.storage.local.get.mockResolvedValue({
				selectedPlatforms: ['codeberg'],
				codebergUsername: 'testUser',
				codebergToken: 'valid-token',
			});

			const mockIssues = [
				{
					id: 101,
					number: 10,
					title: 'Codeberg Issue 10',
					html_url: 'https://codeberg.org/org/repo/issues/10',
					state: 'open',
					assignee: { login: 'testUser' },
					repository: { full_name: 'org/repo' },
				},
			];

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockIssues,
			});

			await window.loadAssignedIssues();

			const checkbox = document.querySelector('.issue-item-checkbox');
			expect(checkbox).not.toBeNull();
			expect(checkbox.dataset.issueId).toBe('codeberg:101');

			// Simulate user selecting the checkbox
			checkbox.checked = true;
			checkbox.dispatchEvent(new Event('change'));

			const reportIssues = await window.getNextPlansForReport();
			expect(reportIssues).toHaveLength(1);
			expect(reportIssues[0].id).toBe(101);
			expect(reportIssues[0].platform).toBe('codeberg');
		});

		it('resolves legacy bare issue IDs when unambiguous', async () => {
			browser.storage.local.get.mockResolvedValue({
				selectedPlatforms: ['codeberg'],
				codebergUsername: 'testUser',
				codebergToken: 'valid-token',
			});

			const mockIssues = [
				{
					id: 202,
					number: 20,
					title: 'Legacy Issue 20',
					html_url: 'https://codeberg.org/org/repo/issues/20',
					state: 'open',
					assignee: { login: 'testUser' },
					repository: { full_name: 'org/repo' },
				},
			];

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockIssues,
			});

			// Seed legacy selection with bare ID
			const scopeKey = 'codeberg_all_cb:testuser@';
			localStorage.setItem('selectedIssues', JSON.stringify({ [scopeKey]: ['202'] }));

			await window.loadAssignedIssues();

			const checkbox = document.querySelector('.issue-item-checkbox');
			expect(checkbox.checked).toBe(true);

			const reportIssues = await window.getNextPlansForReport();
			expect(reportIssues).toHaveLength(1);
			expect(reportIssues[0].id).toBe(202);
		});

		it('scopes cache key to Codeberg username and instance URL to avoid stale cache across accounts', async () => {
			browser.storage.local.get.mockResolvedValue({
				selectedPlatforms: ['codeberg'],
				codebergUsername: 'userA',
				codebergToken: 'valid-token',
				codebergApiBaseUrl: 'https://codeberg.org/api/v1',
			});

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => [
					{
						id: 1,
						number: 1,
						title: 'UserA Issue',
						html_url: 'https://codeberg.org/org/repo/issues/1',
						state: 'open',
						assignee: { login: 'userA' },
						repository: { full_name: 'org/repo' },
					},
				],
			});

			await window.loadAssignedIssues();
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Calling again with same account uses cache (no fetch)
			await window.loadAssignedIssues();
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Switch to userB: should NOT use userA cache, must fetch again
			browser.storage.local.get.mockResolvedValue({
				selectedPlatforms: ['codeberg'],
				codebergUsername: 'userB',
				codebergToken: 'valid-token',
				codebergApiBaseUrl: 'https://codeberg.org/api/v1',
			});

			global.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{
						id: 2,
						number: 2,
						title: 'UserB Issue',
						html_url: 'https://codeberg.org/org/repo/issues/2',
						state: 'open',
						assignee: { login: 'userB' },
						repository: { full_name: 'org/repo' },
					},
				],
			});

			await window.loadAssignedIssues();
			expect(global.fetch).toHaveBeenCalledTimes(2);

			const itemSpan = document.querySelector('.issue-checkbox-label span');
			expect(itemSpan.textContent).toContain('UserB Issue');
		});
	});
});
