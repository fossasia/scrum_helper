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

	describe('instance configuration', () => {
		const customBase = 'https://gitlab.example.net:8443/team/api/v4';

		it.each([
			[200, { username: 'alice' }, true],
			[401, { message: '401 Unauthorized' }, true],
			[403, { message: '403 Forbidden' }, true],
			[404, { message: '404 Not Found' }, false],
			[503, { message: 'Service unavailable' }, false],
			[200, '<html>Sign in</html>', false],
		])('checks a custom API without credentials (HTTP %s)', async (status, body, reachable) => {
			browser.permissions = { contains: vi.fn().mockResolvedValue(true) };
			const fetch = vi.fn().mockResolvedValue(new Response(
				typeof body === 'string' ? body : JSON.stringify(body), { status },
			));
			vi.stubGlobal('fetch', fetch);
			try {
				await expect(window.isGitLabInstanceReachable(customBase)).resolves.toBe(reachable);
				expect(fetch).toHaveBeenCalledWith(customBase + '/user', {
					headers: {}, redirect: 'error', credentials: 'omit', signal: expect.any(AbortSignal),
				});
			} finally {
				delete browser.permissions;
				vi.unstubAllGlobals();
			}
		});

		it('rejects an unreachable API without changing the saved GitLab account', async () => {
			browser.permissions = { contains: vi.fn().mockResolvedValue(true) };
			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
			try {
				await expect(window.isGitLabInstanceReachable(customBase)).resolves.toBe(false);
				expect(browser.storage.local.set).not.toHaveBeenCalled();
			} finally {
				delete browser.permissions;
				vi.unstubAllGlobals();
			}
		});

		it('keeps repo and report cache identities separate for different hosts and formerly colliding tokens', async () => {
			const first = { apiBaseUrl: customBase, token: 'fixture-Aa' };
			const second = { ...first, token: 'fixture-BB' };
			const otherHost = { ...first, apiBaseUrl: 'https://gitlab.com/api/v4' };
			const accountKey = await window.getGitLabAccountKey(first);
			const repoKey = await window.getGitLabRepoCacheKey('alice', 'group', first);
			expect(accountKey).not.toContain(first.token);
			expect(repoKey).toContain(customBase);
			for (const account of [second, otherHost]) {
				expect(await window.getGitLabAccountKey(account)).not.toBe(accountKey);
				expect(await window.getGitLabRepoCacheKey('alice', 'group', account)).not.toBe(repoKey);
			}
		});

		it('waits for token edits in order before validating the saved account', async () => {
			let settings = { gitlabBaseUrl: customBase, gitlabTokenInstance: customBase, gitlabToken: 'original' };
			let finishFirstWrite;
			const firstWrite = new Promise((resolve) => {
				finishFirstWrite = resolve;
			});
			let markStarted;
			const started = new Promise((resolve) => {
				markStarted = resolve;
			});
			const storage = browser.storage.local;
			vi.spyOn(storage, 'get').mockImplementation(async () => settings);
			vi.spyOn(storage, 'set').mockImplementation(async (values) => {
				if (values.gitlabToken === 'first-edit') {
					markStarted();
					await firstWrite;
				}
				settings = { ...settings, ...values };
			});
			browser.permissions = { contains: vi.fn().mockResolvedValue(true) };
			const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
			vi.stubGlobal('fetch', fetch);
			try {
				const first = window.saveGitLabToken(customBase, 'first-edit');
				await started;
				const second = window.saveGitLabToken(customBase, 'latest-edit');
				const validation = window.PlatformRegistry.get('gitlab').validateToken();
				expect(fetch).not.toHaveBeenCalled();
				expect(storage.set).toHaveBeenCalledTimes(1);
				finishFirstWrite();
				await Promise.all([first, second]);
				await expect(validation).resolves.toEqual({ valid: true, status: 200 });
				expect(fetch).toHaveBeenCalledExactlyOnceWith(
					customBase + '/user',
					expect.objectContaining({ headers: { 'PRIVATE-TOKEN': 'latest-edit' } }),
				);
			} finally {
				finishFirstWrite();
				delete browser.permissions;
				vi.unstubAllGlobals();
			}
		});

		it('keeps default tokens and requires a matching instance binding for custom hosts', () => {
			const token = 'fake-pat';
			const settings = { gitlabToken: token, gitlabBaseUrl: customBase };
			expect(window.resolveGitLabAccount({ gitlabToken: token }).token).toBe(token);
			expect(window.resolveGitLabAccount(settings).token).toBe('');
			expect(window.resolveGitLabAccount({ ...settings, gitlabTokenInstance: customBase }).token).toBe(token);
			expect(window.resolveGitLabAccount({ ...settings, gitlabTokenInstance: 'https://gitlab.com/api/v4' }).token).toBe('');
		});

		it.each([
			'http://gitlab.example.net/api/v4',
			'https://gitlab.example.net/api/v4?query=1',
			'https://gitlab.example.net/api/v4#hash',
			'https://name:pass@gitlab.example.net/api/v4',
			'https://gitlab.example.net',
			'https://localhost/api/v4',
			'https://192.168.1.5/api/v4',
			'https://[::1]/api/v4',
		])('rejects unsupported API URL %s without falling back', (url) => {
			expect(new GitLabHelper(url).baseUrl).toBeNull();
		});

		it('discards a cached repository list if the account switches during the permission check', async () => {
			const account = { apiBaseUrl: customBase, token: 'old-token' };
			let settings = {
				gitlabUsername: 'alice', gitlabGroupName: 'group', gitlabBaseUrl: customBase,
				gitlabTokenInstance: customBase, gitlabToken: account.token,
				gitlabRepoCache: {
					cacheKey: await window.getGitLabRepoCacheKey('alice', 'group', account),
					data: [{ fullName: 'group/private' }],
					timestamp: Date.now(),
				},
			};
			const setAvailableRepos = vi.fn();
			window.gitlabRepoFilterContext = {
				repoStatus: document.createElement('div'),
				repoSearch: document.createElement('input'),
				setAvailableRepos,
				getAvailableRepos: () => [],
			};
			vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => settings);
			browser.permissions = {
				contains: vi.fn(async () => {
					settings = { gitlabBaseUrl: 'https://other.example.net/api/v4' };
					return true;
				}),
			};
			try {
				await window.PlatformRegistry.get('gitlab').performRepoFetch();
				expect(setAvailableRepos).not.toHaveBeenCalled();
			} finally {
				delete browser.permissions;
				delete window.gitlabRepoFilterContext;
			}
		});

		it('blocks ungranted custom access and requests the exact approved API origin and path without redirects', async () => {
			const permissions = { contains: vi.fn().mockResolvedValue(false) };
			browser.permissions = permissions;
			const fakeFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
			vi.stubGlobal('fetch', fakeFetch);
			browser.storage.local.get.mockResolvedValue({
				gitlabBaseUrl: customBase, gitlabTokenInstance: customBase, gitlabToken: 'fake-pat',
			});
			const registry = window.PlatformRegistry.get('gitlab');
			try {
				await expect(registry.validateToken()).resolves.toEqual({ valid: false, networkError: true });
				expect(fakeFetch).not.toHaveBeenCalled();
				permissions.contains.mockResolvedValue(true);
				await expect(registry.validateToken()).resolves.toEqual({ valid: true, status: 200 });
				expect(permissions.contains).toHaveBeenCalledWith({ origins: ['https://gitlab.example.net/*'] });
				expect(fakeFetch).toHaveBeenCalledWith(customBase + '/user', {
					headers: { 'PRIVATE-TOKEN': 'fake-pat' }, redirect: 'error', credentials: 'omit', signal: expect.any(AbortSignal),
				});
			} finally {
				delete browser.permissions;
				vi.unstubAllGlobals();
			}
		});
	});


	it('reports a GitLab connection timeout and lets the generation settle', async () => {
		const signal = AbortSignal.abort(new DOMException('Timed out', 'TimeoutError'));
		const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
		vi.stubGlobal('fetch', vi.fn(async (_url, options) => options.signal.throwIfAborted()));
		browser.storage.local.get.mockResolvedValue({});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			await expect(helper.fetchGitLabData('testuser', '2026-10-01', '2026-10-05')).rejects.toThrow(
				'gitlabRequestTimedOut',
			);
			expect(timeout).toHaveBeenCalledWith(15_000);
			expect(helper.cache.fetching).toBe(false);
		} finally {
			consoleSpy.mockRestore();
			vi.unstubAllGlobals();
		}
	});

	it.each(['issues', 'merge_requests', 'commits'])('rejects and leaves no report cache when project %s time out', async (route) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		browser.storage.local.get.mockResolvedValue({ showCommits: true });
		let controller;
		vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
			controller = new AbortController();
			return controller.signal;
		});
		const responses = {
			'/api/v4/users': [{ id: 1, username: 'alice' }],
			'/api/v4/users/1/projects': [{ id: 3, path_with_namespace: 'group/repo' }],
			'/api/v4/users/1/contributed_projects': [],
			'/api/v4/projects/3/merge_requests': [{ iid: 5, project_id: 3, state: 'opened' }],
			'/api/v4/projects/3/issues': [],
		};
		vi.stubGlobal('fetch', vi.fn(async (url, { signal }) => {
			const pathname = new URL(url).pathname;
			if (pathname.startsWith('/api/v4/projects/') && pathname.endsWith('/' + route)) {
				controller.abort();
				signal.throwIfAborted();
			}
			return { ok: true, json: async () => responses[pathname] };
		}));
		try {
			await expect(helper.fetchGitLabData('alice', '2026-10-01', '2026-10-05')).rejects.toThrow('gitlabRequestTimedOut');
			expect(browser.storage.local.set).not.toHaveBeenCalled();
			expect(helper.cache.fetching).toBe(false);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('rejects repository discovery when a project detail request loses its connection', async () => {
		vi.spyOn(browser.storage.local, 'get').mockImplementation(async (_keys, callback) => {
			if (callback) callback({});
			return {};
		});
		vi.stubGlobal('fetch', vi.fn(async (url) => {
			const pathname = new URL(url).pathname;
			if (pathname === '/api/v4/projects/3') throw new TypeError('Connection lost');
			return {
				ok: true,
				json: async () => pathname.endsWith('/events') ? [{ project_id: 3 }] : [{ id: 1, username: 'alice' }],
			};
		}));
		try {
			await expect(window.PlatformRegistry.get('gitlab').fetchUserRepositories('alice')).rejects.toThrow('gitlabRequestConnectionFailed');
		} finally {
			vi.unstubAllGlobals();
		}
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
			expect(mapped.created_at).toBe('2026-10-01T10:00:00Z');
			expect(mapped.updated_at).toBe('2026-10-02T12:00:00Z');
			expect(mapped.project).toBe('fossasia/scrum_helper');
			expect(mapped.pull_request).toBe(false);
			expect(mapped.repository_url).toBe('https://gitlab.com/api/v4/projects/101');
			expect(mapped.html_url).toBe('https://gitlab.com/fossasia/scrum_helper/-/issues/25');
			expect(mapped._allCommits).toEqual([]);
		});

		it('should map closed issue state to closed and preserve dates', () => {
			const item = {
				iid: 26,
				project_id: 101,
				title: 'Closed issue',
				state: 'closed',
				web_url: 'https://gitlab.com/fossasia/scrum_helper/-/issues/26',
				created_at: '2026-10-01T10:00:00Z',
				updated_at: '2026-10-02T12:00:00Z',
			};

			const mapped = helper.mapGitLabReportItem(item, projectById, 'issue');
			expect(mapped.state).toBe('closed');
			expect(mapped.created_at).toBe('2026-10-01T10:00:00Z');
			expect(mapped.updated_at).toBe('2026-10-02T12:00:00Z');
		});

		it('should map GitLab merge request with pull_request flag and state', () => {
			const item = {
				iid: 77,
				project_id: 101,
				title: 'Feat: Add GitLab MR support',
				state: 'merged',
				web_url: 'https://gitlab.com/fossasia/scrum_helper/-/merge_requests/77',
				created_at: '2026-10-01T10:00:00Z',
				updated_at: '2026-10-02T12:00:00Z',
				_allCommits: [{ id: 'abc123' }],
			};

			const mapped = helper.mapGitLabReportItem(item, projectById, 'mr');

			expect(mapped.number).toBe(77);
			expect(mapped.pull_request).toBe(true);
			expect(mapped.state).toBe('merged');
			expect(mapped.created_at).toBe('2026-10-01T10:00:00Z');
			expect(mapped.updated_at).toBe('2026-10-02T12:00:00Z');
			expect(mapped.project).toBe('fossasia/scrum_helper');
			expect(mapped._allCommits).toEqual([{ id: 'abc123' }]);
		});

		it('should map closed merge request state to closed and preserve dates', () => {
			const item = {
				iid: 78,
				project_id: 101,
				title: 'Closed MR',
				state: 'closed',
				web_url: 'https://gitlab.com/fossasia/scrum_helper/-/merge_requests/78',
				created_at: '2026-10-01T10:00:00Z',
				updated_at: '2026-10-02T12:00:00Z',
			};

			const mapped = helper.mapGitLabReportItem(item, projectById, 'mr');

			expect(mapped.number).toBe(78);
			expect(mapped.pull_request).toBe(true);
			expect(mapped.state).toBe('closed');
			expect(mapped.created_at).toBe('2026-10-01T10:00:00Z');
			expect(mapped.updated_at).toBe('2026-10-02T12:00:00Z');
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
			expect(mapped.githubPrsReviewData.items[0].state).toBe('opened');

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
			await expect(helper.saveToStorage({ test: 123 })).resolves.toBeUndefined();
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

			await expect(helper.loadFromStorage()).resolves.toBeUndefined();
			expect(helper.cache.data).toBeUndefined();
			expect(helper.cache.cacheKey).toBeUndefined();
			expect(helper.cache.timestamp).toBeUndefined();
		});

		it('should handle loadFromStorage error gracefully without throwing', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			browser.storage.local.get.mockRejectedValueOnce(new Error('Read error'));
			await expect(helper.loadFromStorage()).resolves.toBeUndefined();
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

		it('should fetch fresh data when a matching cache entry has expired', async () => {
			const cachedResult = { githubIssuesData: { items: [] }, githubPrsReviewData: { items: [] } };
			const expectedKey = 'https://gitlab.com/api/v4-testuser-2026-10-01-2026-10-05-noauth-noorg-nocommits-norepos';

			helper.cache.data = cachedResult;
			helper.cache.cacheKey = expectedKey;
			helper.cache.ttl = 10 * 60 * 1000;
			helper.cache.timestamp = Date.now() - helper.cache.ttl - 1;

			browser.storage.local.get.mockResolvedValue({
				showCommits: false,
				useRepoFilter: false,
			});

			const originalFetch = global.fetch;
			global.fetch = vi.fn().mockImplementation((url) => {
				if (url.includes('/users?username=')) {
					return Promise.resolve({
						ok: true,
						json: () => Promise.resolve([{ id: 1, username: 'testuser' }]),
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
				const result = await helper.fetchGitLabData('testuser', '2026-10-01', '2026-10-05');
				expect(global.fetch).toHaveBeenCalled();
				expect(result).not.toBe(cachedResult);
				expect(result.user.username).toBe('testuser');
			} finally {
				global.fetch = originalFetch;
			}
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

			browser.storage.local.get.mockResolvedValueOnce({ gitlabBaseUrl: 'https://gitlab.example.net/api/v4' });

			const result = await window.forceGitlabDataRefresh();

			expect(result).toEqual({ success: true });
			expect(browser.storage.local.remove).toHaveBeenCalledWith('gitlabCache');
			expect(window.hasInjectedContent).toBe(false);
			expect(helper.cache.data).toBeNull();
			expect(helper.cache.cacheKey).toBeNull();
			expect(helper.cache.timestamp).toBe(0);
			expect(helper.invalidated).toBe(true);
			expect(helper.cache.queue).toHaveLength(1);
			expect(window.gitlabHelper).toBeInstanceOf(GitLabHelper);
			expect(window.gitlabHelper).not.toBe(helper);
			expect(window.gitlabHelper.baseUrl).toBe('https://gitlab.example.net/api/v4');
		});
	});
});
