import { describe, it, expect } from 'vitest';
import '../src/scripts/scrumHelper.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

describe('resolveCacheTtlMs', () => {
	const resolve = (value) => window.resolveCacheTtlMs(value);

	it('should convert a valid minute value to milliseconds', () => {
		expect(resolve('15')).toBe(15 * 60 * 1000);
	});

	it('should accept a numeric value as well as a string', () => {
		expect(resolve(15)).toBe(15 * 60 * 1000);
	});

	it('should fall back to the default when nothing is stored', () => {
		expect(resolve(undefined)).toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a non-numeric value', () => {
		expect(resolve('abc')).toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for zero', () => {
		expect(resolve('0')).toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a negative value', () => {
		expect(resolve('-5')).toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for an empty string', () => {
		expect(resolve('')).toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default for a value that overflows to Infinity', () => {
		expect(resolve('9'.repeat(304))).toBe(DEFAULT_TTL_MS);
	});

	it('should fall back to the default beyond the safe integer range', () => {
		expect(resolve('9007199254740993')).toBe(DEFAULT_TTL_MS);
	});

	it('should always return a finite, positive TTL', () => {
		for (const value of ['abc', '0', '-5', '', '9'.repeat(304), undefined, null, {}]) {
			const ttl = resolve(value);
			expect(Number.isFinite(ttl)).toBe(true);
			expect(ttl).toBeGreaterThan(0);
		}
	});

	it('should keep a freshly written cache entry fresh for every input', () => {
		// A cache written a second ago must still pass `now - timestamp < ttl`.
		const now = Date.now();
		const writtenOneSecondAgo = now - 1000;
		for (const value of ['15', 'abc', '0', '-5', '', undefined]) {
			expect(now - writtenOneSecondAgo < resolve(value)).toBe(true);
		}
	});
});
