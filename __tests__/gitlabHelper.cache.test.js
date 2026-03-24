const GitLabHelper = require('../src/scripts/gitlabHelper');

describe('GitLabHelper cache module tests', () => {
	beforeEach(() => {
		global.chrome = {
			storage: {
				local: {
					get: jest.fn(),
					set: jest.fn(),
				},
			},
			i18n: {
				getMessage: jest.fn(),
			},
		};
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	test('getCacheTTL uses configured cacheInput minutes', async () => {
		chrome.storage.local.get.mockImplementation((keys, cb) => cb({ cacheInput: '15' }));
		const helper = new GitLabHelper();
		await expect(helper.getCacheTTL()).resolves.toBe(15 * 60 * 1000);
	});

	test('getCacheTTL falls back to default when cacheInput is missing', async () => {
		chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
		const helper = new GitLabHelper();
		await expect(helper.getCacheTTL()).resolves.toBe(10 * 60 * 1000);
	});

	test('saveToStorage writes data with cache metadata', async () => {
		chrome.storage.local.set.mockImplementation((_payload, cb) => cb());
		const helper = new GitLabHelper();
		helper.cache.cacheKey = 'user-2026-01-01-2026-01-02-noauth';
		helper.cache.timestamp = 12345;

		await helper.saveToStorage({ test: true });

		expect(chrome.storage.local.set).toHaveBeenCalledWith(
			{
				gitlabCache: {
					data: { test: true },
					cacheKey: 'user-2026-01-01-2026-01-02-noauth',
					timestamp: 12345,
				},
			},
			expect.any(Function),
		);
	});

	test('loadFromStorage hydrates in-memory cache from storage', async () => {
		chrome.storage.local.get.mockImplementation((keys, cb) =>
			cb({
				gitlabCache: {
					data: { ok: true },
					cacheKey: 'cached-key',
					timestamp: 999,
				},
			}),
		);
		const helper = new GitLabHelper();

		await helper.loadFromStorage();

		expect(helper.cache.data).toEqual({ ok: true });
		expect(helper.cache.cacheKey).toBe('cached-key');
		expect(helper.cache.timestamp).toBe(999);
	});

	test('fetchGitLabData returns fresh in-memory cache without network call', async () => {
		const helper = new GitLabHelper();
		const cached = { mergeRequests: [], issues: [] };
		helper.cache.data = cached;
		helper.cache.cacheKey = 'alice-2026-01-01-2026-01-05-noauth';
		helper.cache.timestamp = Date.now();
		jest.spyOn(helper, 'getCacheTTL').mockResolvedValue(10 * 60 * 1000);

		const result = await helper.fetchGitLabData('alice', '2026-01-01', '2026-01-05');

		expect(result).toBe(cached);
		expect(global.fetch).not.toHaveBeenCalled();
	});
});
