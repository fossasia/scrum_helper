import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GitLabHelper from '../src/scripts/gitlabHelper.js';
import CodebergHelper from '../src/scripts/codebergHelper.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function mockCacheInput(value) {
	vi.spyOn(browser.storage.local, 'get').mockResolvedValue(
		value === undefined ? {} : { cacheInput: value },
	);
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
		vi.spyOn(browser.storage.local, 'get').mockRejectedValue(new Error('storage unavailable'));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a value that overflows to Infinity', async () => {
		mockCacheInput('9'.repeat(304));
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a value beyond the safe integer range', async () => {
		mockCacheInput('9007199254740993');
		await expect(helper.getCacheTTL()).resolves.toBe(DEFAULT_TTL_MS);
	});

	it('should always resolve to a finite, positive TTL', async () => {
		for (const value of ['abc', '0', '-5', '', '9'.repeat(304), undefined, null, {}]) {
			mockCacheInput(value);
			const ttl = await helper.getCacheTTL();

			expect(Number.isFinite(ttl)).toBe(true);
			expect(ttl).toBeGreaterThan(0);
		}
	});
});
