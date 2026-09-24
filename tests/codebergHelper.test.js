import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CodebergHelper from '../src/scripts/codebergHelper.js';

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
});
