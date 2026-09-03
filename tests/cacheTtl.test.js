import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GitLabHelper from '../src/scripts/gitlabHelper.js';
import CodebergHelper from '../src/scripts/codebergHelper.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function mockCacheInput(value) {
	browser.storage.local.get = vi
		.fn()
		.mockResolvedValue(value === undefined ? {} : { cacheInput: value });
}

const helpers = [
	['GitLabHelper', () => new GitLabHelper('https://gitlab.com')],
	['CodebergHelper', () => new CodebergHelper('https://codeberg.org/api/v1')],
];

describe.each(helpers)('%s getCacheTTL', (_name, create) => {
	let helper;

	beforeEach(() => {
		helper = create();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should convert a valid minute value to milliseconds', async () => {
		mockCacheInput('15');
		await expect(helper.getCacheTTL()).resolves.toBe(15 * 60 * 1000);
	});

	it('should accept a numeric value as well as a string', async () => {
		mockCacheInput(15);
		await expect(helper.getCacheTTL()).resolves.toBe(15 * 60 * 1000);
	});

	it('should fall back to the default when nothing is stored', async () => {
		mockCacheInput(undefined);
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a non-numeric value', async () => {
		mockCacheInput('abc');
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for zero', async () => {
		mockCacheInput('0');
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a negative value', async () => {
		mockCacheInput('-5');
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for an empty string', async () => {
		mockCacheInput('');
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default when storage rejects', async () => {
		browser.storage.local.get = vi.fn().mockRejectedValue(new Error('storage unavailable'));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should never resolve to a value that disables caching', async () => {
		for (const value of ['abc', '0', '-5', '', undefined, null, {}]) {
			mockCacheInput(value);
			const ttl = await helper.getCacheTTL();

			expect(Number.isFinite(ttl)).toBe(true);
			expect(ttl).toBeGreaterThan(0);
		}
	});
});
