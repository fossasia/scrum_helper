import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GitLabHelper from '../src/scripts/gitlabHelper.js';

describe('GitLabHelper', () => {
	let helper;

	beforeEach(() => {
		helper = new GitLabHelper();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('parseGitlabGroups', () => {
		it('should return an empty array when input is falsy or empty', () => {
			expect(window.parseGitlabGroups('')).toEqual([]);
			expect(window.parseGitlabGroups(null)).toEqual([]);
			expect(window.parseGitlabGroups(undefined)).toEqual([]);
		});

		it('should parse single group and convert to lowercase', () => {
			expect(window.parseGitlabGroups('FOSSASIA')).toEqual(['fossasia']);
		});

		it('should trim whitespace around groups', () => {
			expect(window.parseGitlabGroups('  fossasia  ,   gitlab-org  ')).toEqual(['fossasia', 'gitlab-org']);
		});

		it('should filter out "all" case-insensitively and empty items', () => {
			expect(window.parseGitlabGroups('all, FOSSASIA, , All, ALL, scrum-helper, ')).toEqual([
				'fossasia',
				'scrum-helper',
			]);
		});

		it('should return empty array if only "all" or spaces are provided', () => {
			expect(window.parseGitlabGroups('all, ALL,  ')).toEqual([]);
		});
	});

	describe('constructor and base URL normalization', () => {
		it('should initialize with default base URL when omitted', () => {
			const defaultHelper = new GitLabHelper();
			expect(defaultHelper.baseUrl).toBe('https://gitlab.com/api/v4');
		});

		it('should fall back to default base URL when empty or null is passed', () => {
			expect(new GitLabHelper('').baseUrl).toBe('https://gitlab.com/api/v4');
			expect(new GitLabHelper(null).baseUrl).toBe('https://gitlab.com/api/v4');
			expect(new GitLabHelper('   ').baseUrl).toBe('https://gitlab.com/api/v4');
		});

		it('should strip single trailing slash from custom base URL', () => {
			const custom = new GitLabHelper('https://gitlab.mycompany.com/api/v4/');
			expect(custom.baseUrl).toBe('https://gitlab.mycompany.com/api/v4');
		});

		it('should strip multiple trailing slashes from custom base URL', () => {
			const custom = new GitLabHelper('https://gitlab.mycompany.com/api/v4///');
			expect(custom.baseUrl).toBe('https://gitlab.mycompany.com/api/v4');
		});

		it('should trim surrounding whitespace from custom base URL', () => {
			const custom = new GitLabHelper('   https://gitlab.mycompany.com/api/v4   ');
			expect(custom.baseUrl).toBe('https://gitlab.mycompany.com/api/v4');
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

	describe('getCacheTTL', () => {
		it('should return configured minutes in milliseconds when valid', async () => {
			browser.storage.local.get.mockResolvedValueOnce({ cacheInput: '15' });
			const ttl = await helper.getCacheTTL();
			expect(ttl).toBe(15 * 60 * 1000);
			expect(browser.storage.local.get).toHaveBeenCalledWith(['cacheInput']);
		});

		it('should fall back to default 10 minutes when cacheInput is missing or non-positive', async () => {
			browser.storage.local.get.mockResolvedValueOnce({});
			expect(await helper.getCacheTTL()).toBe(10 * 60 * 1000);

			browser.storage.local.get.mockResolvedValueOnce({ cacheInput: '0' });
			expect(await helper.getCacheTTL()).toBe(10 * 60 * 1000);

			browser.storage.local.get.mockResolvedValueOnce({ cacheInput: '-5' });
			expect(await helper.getCacheTTL()).toBe(10 * 60 * 1000);

			browser.storage.local.get.mockResolvedValueOnce({ cacheInput: 'invalid' });
			expect(await helper.getCacheTTL()).toBe(10 * 60 * 1000);
		});

		it('should fall back to default 10 minutes when storage rejects', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			browser.storage.local.get.mockRejectedValueOnce(new Error('Storage failure'));
			const ttl = await helper.getCacheTTL();
			expect(ttl).toBe(10 * 60 * 1000);
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('mapGitLabReportItem', () => {
		const mockProject = {
			id: 101,
			name: 'scrum_helper',
			path_with_namespace: 'fossasia/scrum_helper',
			web_url: 'https://gitlab.com/fossasia/scrum_helper',
		};
		const projectById = new Map([[101, mockProject]]);

		it('should map GitLab issue with project lookup', () => {
			const item = {
				iid: 25,
				project_id: 101,
				title: 'Fix issue title',
				state: 'opened',
				web_url: 'https://gitlab.com/fossasia/scrum_helper/-/issues/25',
				created_at: '2026-10-01T10:00:00Z',
				updated_at: '2026-10-02T12:00:00Z',
			};

			const mapped = helper.mapGitLabReportItem(item, projectById, 'issue');

			expect(mapped.number).toBe(25);
			expect(mapped.title).toBe('Fix issue title');
			expect(mapped.state).toBe('open');
			expect(mapped.project).toBe('fossasia/scrum_helper');
			expect(mapped.pull_request).toBe(false);
			expect(mapped.repository_url).toBe('https://gitlab.com/api/v4/projects/101');
			expect(mapped.html_url).toBe('https://gitlab.com/fossasia/scrum_helper/-/issues/25');
			expect(mapped._allCommits).toEqual([]);
		});

		it('should map closed issue state to closed', () => {
			const item = {
				iid: 26,
				project_id: 101,
				title: 'Closed issue',
				state: 'closed',
				web_url: 'https://gitlab.com/fossasia/scrum_helper/-/issues/26',
			};

			const mapped = helper.mapGitLabReportItem(item, projectById, 'issue');
			expect(mapped.state).toBe('closed');
		});

		it('should map GitLab merge request with pull_request flag and state', () => {
			const item = {
				iid: 77,
				project_id: 101,
				title: 'Feat: Add GitLab MR support',
				state: 'merged',
				web_url: 'https://gitlab.com/fossasia/scrum_helper/-/merge_requests/77',
				_allCommits: [{ id: 'abc123' }],
			};

			const mapped = helper.mapGitLabReportItem(item, projectById, 'mr');

			expect(mapped.number).toBe(77);
			expect(mapped.pull_request).toBe(true);
			expect(mapped.state).toBe('merged');
			expect(mapped.project).toBe('fossasia/scrum_helper');
			expect(mapped._allCommits).toEqual([{ id: 'abc123' }]);
		});

		it('should parse project path from web_url when project is not in projectById', () => {
			const emptyProjectMap = new Map();
			const item = {
				iid: 12,
				project_id: 999,
				title: 'Subgroup issue',
				state: 'opened',
				web_url: 'https://gitlab.com/group/subgroup/project/-/issues/12',
			};

			const mapped = helper.mapGitLabReportItem(item, emptyProjectMap, 'issue');
			expect(mapped.project).toBe('group/subgroup/project');
		});

		it('should parse project path from merge request web_url when project is not in projectById', () => {
			const emptyProjectMap = new Map();
			const item = {
				iid: 8,
				project_id: 999,
				title: 'Subgroup MR',
				state: 'opened',
				web_url: 'https://gitlab.com/my-org/my-repo/-/merge_requests/8',
			};

			const mapped = helper.mapGitLabReportItem(item, emptyProjectMap, 'mr');
			expect(mapped.project).toBe('my-org/my-repo');
		});

		it('should fall back to "unknown" project when web_url is invalid or missing', () => {
			const emptyProjectMap = new Map();
			const item = {
				iid: 1,
				project_id: 888,
				title: 'No URL item',
				state: 'opened',
				web_url: null,
			};

			const mapped = helper.mapGitLabReportItem(item, emptyProjectMap, 'issue');
			expect(mapped.project).toBe('unknown');
		});

		it('should fall back to constructing html_url from project when item.web_url is missing', () => {
			const itemIssue = {
				iid: 5,
				project_id: 101,
				title: 'Issue without web_url',
				state: 'opened',
			};
			const mappedIssue = helper.mapGitLabReportItem(itemIssue, projectById, 'issue');
			expect(mappedIssue.html_url).toBe('https://gitlab.com/fossasia/scrum_helper/-/issues/5');

			const itemMR = {
				iid: 6,
				project_id: 101,
				title: 'MR without web_url',
				state: 'opened',
			};
			const mappedMR = helper.mapGitLabReportItem(itemMR, projectById, 'mr');
			expect(mappedMR.html_url).toBe('https://gitlab.com/fossasia/scrum_helper/-/merge_requests/6');
		});
	});

	describe('mapGitLabReportData', () => {
		it('should map complete GitLab response payload into unified format', () => {
			const rawData = {
				projects: [
					{
						id: 1,
						name: 'repo-one',
						path_with_namespace: 'fossasia/repo-one',
						web_url: 'https://gitlab.com/fossasia/repo-one',
					},
				],
				issues: [
					{
						iid: 10,
						project_id: 1,
						title: 'Issue 10',
						state: 'opened',
						web_url: 'https://gitlab.com/fossasia/repo-one/-/issues/10',
					},
				],
				mergeRequests: [
					{
						iid: 20,
						project_id: 1,
						title: 'MR 20',
						state: 'opened',
						web_url: 'https://gitlab.com/fossasia/repo-one/-/merge_requests/20',
					},
				],
				user: {
					id: 55,
					username: 'rishi919',
					name: 'Rishikesh Singh',
				},
			};

			const mapped = helper.mapGitLabReportData(rawData);

			expect(mapped.githubIssuesData.items).toHaveLength(1);
			expect(mapped.githubIssuesData.items[0].number).toBe(10);
			expect(mapped.githubIssuesData.items[0].state).toBe('open');

			expect(mapped.githubPrsReviewData.items).toHaveLength(1);
			expect(mapped.githubPrsReviewData.items[0].number).toBe(20);
			expect(mapped.githubPrsReviewData.items[0].pull_request).toBe(true);

			expect(mapped.githubUserData).toEqual(rawData.user);
		});

		it('should handle "mrs" alias and empty collections', () => {
			const rawData = {
				projects: [],
				issues: [],
				mrs: [
					{
						iid: 30,
						project_id: 99,
						title: 'MR 30',
						state: 'merged',
						web_url: 'https://gitlab.com/fossasia/repo-two/-/merge_requests/30',
					},
				],
			};

			const mapped = helper.mapGitLabReportData(rawData);

			expect(mapped.githubIssuesData.items).toEqual([]);
			expect(mapped.githubPrsReviewData.items).toHaveLength(1);
			expect(mapped.githubPrsReviewData.items[0].number).toBe(30);
			expect(mapped.githubUserData).toEqual({});
		});

		it('should handle missing or undefined fields in payload gracefully', () => {
			const mapped = helper.mapGitLabReportData({});
			expect(mapped.githubIssuesData.items).toEqual([]);
			expect(mapped.githubPrsReviewData.items).toEqual([]);
			expect(mapped.githubUserData).toEqual({});
		});
	});

	describe('storage persistence', () => {
		it('should save cache data and metadata to browser.storage.local', async () => {
			helper.cache.cacheKey = 'user:rishi:2026-10-01';
			helper.cache.timestamp = 1728470000000;
			const sampleData = { test: 'payload' };

			await helper.saveToStorage(sampleData);

			expect(browser.storage.local.set).toHaveBeenCalledWith({
				gitlabCache: {
					data: sampleData,
					cacheKey: 'user:rishi:2026-10-01',
					timestamp: 1728470000000,
				},
			});
		});

		it('should handle saveToStorage error gracefully without throwing', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			browser.storage.local.set.mockRejectedValueOnce(new Error('Write error'));
			await expect(helper.saveToStorage({ test: 123 })).resolves.not.toThrow();
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('should load cache data and metadata from browser.storage.local', async () => {
			browser.storage.local.get.mockResolvedValueOnce({
				gitlabCache: {
					data: { loaded: true },
					cacheKey: 'cached-key-1',
					timestamp: 123456,
				},
			});

			await helper.loadFromStorage();

			expect(helper.cache.data).toEqual({ loaded: true });
			expect(helper.cache.cacheKey).toBe('cached-key-1');
			expect(helper.cache.timestamp).toBe(123456);
		});

		it('should not alter cache state when gitlabCache is not present in storage', async () => {
			browser.storage.local.get.mockResolvedValueOnce({});
			await helper.loadFromStorage();

			expect(helper.cache.data).toBeNull();
			expect(helper.cache.cacheKey).toBeNull();
			expect(helper.cache.timestamp).toBe(0);
		});

		it('should handle malformed or partial gitlabCache in storage without throwing', async () => {
			browser.storage.local.get.mockResolvedValueOnce({
				gitlabCache: {
					corruptedPayload: true,
				},
			});

			await expect(helper.loadFromStorage()).resolves.not.toThrow();
			expect(helper.cache.data).toBeUndefined();
			expect(helper.cache.cacheKey).toBeUndefined();
			expect(helper.cache.timestamp).toBeUndefined();
		});

		it('should handle loadFromStorage error gracefully without throwing', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			browser.storage.local.get.mockRejectedValueOnce(new Error('Read error'));
			await expect(helper.loadFromStorage()).resolves.not.toThrow();
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('fetchGitLabData caching behavior', () => {
		it('should return in-memory cached data immediately when cacheKey and TTL match', async () => {
			const cachedResult = { githubIssuesData: { items: [] }, githubPrsReviewData: { items: [] } };
			const expectedKey = 'https://gitlab.com/api/v4-testuser-2026-10-01-2026-10-05-noauth-noorg-nocommits-norepos';

			helper.cache.data = cachedResult;
			helper.cache.cacheKey = expectedKey;
			helper.cache.timestamp = Date.now();
			helper.cache.ttl = 10 * 60 * 1000;

			browser.storage.local.get.mockResolvedValue({
				showCommits: false,
				useRepoFilter: false,
			});

			const data = await helper.fetchGitLabData('testuser', '2026-10-01', '2026-10-05');
			expect(data).toBe(cachedResult);
		});

		it('should clear in-memory cache data during invalidation and return fresh data when parameters change', async () => {
			helper.cache.data = { old: 'data' };
			helper.cache.cacheKey = 'old-key';
			helper.cache.timestamp = Date.now();
			helper.cache.ttl = 10 * 60 * 1000;

			browser.storage.local.get.mockResolvedValue({
				showCommits: false,
				useRepoFilter: false,
			});

			let observedCacheDataDuringFetch;
			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockImplementation((url) => {
				if (observedCacheDataDuringFetch === undefined) {
					observedCacheDataDuringFetch = helper.cache.data;
				}

				if (url.includes('/users?username=')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve([{ id: 1, username: 'differentuser' }]),
						headers: { get: () => null },
					});
				}
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve([]),
					headers: { get: () => null },
				});
			});

			try {
				const result = await helper.fetchGitLabData('differentuser', '2026-10-01', '2026-10-05');
				// Assert old cached data was cleared as part of invalidation before fetch completed
				expect(observedCacheDataDuringFetch).toBeNull();
				// Assert that request returns fresh data and updates cache state
				expect(result.user.username).toBe('differentuser');
				expect(result).not.toEqual({ old: 'data' });
				expect(helper.cache.data).toBe(result);
				expect(helper.cache.cacheKey).not.toBe('old-key');
			} finally {
				global.fetch = originalFetch;
			}
		});
	});

	describe('forceGitlabDataRefresh', () => {
		it('should reset in-memory cache and remove storage cache', async () => {
			window.gitlabHelper = helper;
			helper.cache.data = { some: 'data' };
			helper.cache.cacheKey = 'some-key';
			helper.cache.timestamp = 999;
			helper.cache.fetching = true;
			helper.cache.queue = [{ resolve: () => {} }];

			browser.storage.local.remove.mockImplementationOnce((key, cb) => {
				if (typeof cb === 'function') cb();
				return Promise.resolve();
			});

			const result = await window.forceGitlabDataRefresh();

			expect(result).toEqual({ success: true });
			expect(browser.storage.local.remove).toHaveBeenCalledWith('gitlabCache', expect.any(Function));
			expect(window.hasInjectedContent).toBe(false);
			expect(window.gitlabHelper.cache.data).toBeNull();
			expect(window.gitlabHelper.cache.cacheKey).toBeNull();
			expect(window.gitlabHelper.cache.timestamp).toBe(0);
			expect(window.gitlabHelper.cache.fetching).toBe(false);
			expect(window.gitlabHelper.cache.queue).toEqual([]);
		});
	});
});
