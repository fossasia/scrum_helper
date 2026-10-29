import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import rateLimitUtils from '../src/scripts/rateLimitUtils.js';

describe('rateLimitUtils', () => {
	const fixedNow = 1700000000000; // Fixed timestamp in ms

	describe('getRateLimitResetTime', () => {
		it('returns null for null or missing response/headers', () => {
			expect(rateLimitUtils.getRateLimitResetTime(null)).toBeNull();
			expect(rateLimitUtils.getRateLimitResetTime(undefined)).toBeNull();
			expect(rateLimitUtils.getRateLimitResetTime({})).toBeNull();
		});

		it('extracts epoch seconds from standard GitHub x-ratelimit-reset header', () => {
			const resetEpochSec = 1700001000;
			const res = {
				headers: {
					get: (name) => (name.toLowerCase() === 'x-ratelimit-reset' ? String(resetEpochSec) : null),
				},
			};
			const result = rateLimitUtils.getRateLimitResetTime(res, fixedNow);
			expect(result).toBeInstanceOf(Date);
			expect(result.getTime()).toBe(resetEpochSec * 1000);
		});

		it('extracts from plain object headers (case variations)', () => {
			const resetEpochSec = 1700002000;
			const res1 = { headers: { 'x-ratelimit-reset': String(resetEpochSec) } };
			const res2 = { headers: { 'RateLimit-Reset': String(resetEpochSec) } };
			const res3 = { headers: { 'X-RateLimit-Reset': String(resetEpochSec) } };

			expect(rateLimitUtils.getRateLimitResetTime(res1).getTime()).toBe(resetEpochSec * 1000);
			expect(rateLimitUtils.getRateLimitResetTime(res2).getTime()).toBe(resetEpochSec * 1000);
			expect(rateLimitUtils.getRateLimitResetTime(res3).getTime()).toBe(resetEpochSec * 1000);
		});

		it('handles headers passed directly without response wrapper', () => {
			const resetEpochSec = 1700001500;
			const headers = { 'x-ratelimit-reset': String(resetEpochSec) };
			const result = rateLimitUtils.getRateLimitResetTime(headers);
			expect(result.getTime()).toBe(resetEpochSec * 1000);
		});

		it('falls back to retry-after in seconds relative to current time', () => {
			const retryAfterSeconds = 120;
			const res = {
				headers: {
					get: (name) => (name.toLowerCase() === 'retry-after' ? String(retryAfterSeconds) : null),
				},
			};
			const result = rateLimitUtils.getRateLimitResetTime(res, fixedNow);
			expect(result).toBeInstanceOf(Date);
			expect(result.getTime()).toBe(fixedNow + retryAfterSeconds * 1000);
		});

		it('returns null when header values are non-numeric or zero', () => {
			const res = {
				headers: {
					get: () => 'invalid-timestamp',
				},
			};
			expect(rateLimitUtils.getRateLimitResetTime(res)).toBeNull();
		});
	});

	describe('formatRateLimitCountdown', () => {
		it('returns empty string for null, undefined, or invalid date', () => {
			expect(rateLimitUtils.formatRateLimitCountdown(null)).toBe('');
			expect(rateLimitUtils.formatRateLimitCountdown(undefined)).toBe('');
			expect(rateLimitUtils.formatRateLimitCountdown('invalid-date')).toBe('');
		});

		it('returns "shortly" when reset timestamp is in the past', () => {
			const pastTime = new Date(fixedNow - 5000);
			expect(rateLimitUtils.formatRateLimitCountdown(pastTime, fixedNow)).toBe('shortly');
		});

		it('returns "in less than a minute" when reset is under 60 seconds away', () => {
			const soonTime = new Date(fixedNow + 45 * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(soonTime, fixedNow);
			expect(formatted).toContain('in less than a minute');
		});

		it('formats single minute correctly', () => {
			const oneMinute = new Date(fixedNow + 60 * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(oneMinute, fixedNow);
			expect(formatted).toContain('in 1 minute');
		});

		it('formats multiple minutes correctly', () => {
			const fourteenMinutes = new Date(fixedNow + 14 * 60 * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(fourteenMinutes, fixedNow);
			expect(formatted).toContain('in 14 minutes');
		});

		it('formats exact 1 hour correctly', () => {
			const oneHour = new Date(fixedNow + 3600 * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(oneHour, fixedNow);
			expect(formatted).toContain('in 1 hour');
		});

		it('formats 1 hour and multiple minutes correctly', () => {
			const oneHourFifteen = new Date(fixedNow + (3600 + 15 * 60) * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(oneHourFifteen, fixedNow);
			expect(formatted).toContain('in 1 hour and 15 minutes');
		});

		it('formats multiple hours and minutes correctly', () => {
			const twoHoursOneMin = new Date(fixedNow + (2 * 3600 + 60) * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(twoHoursOneMin, fixedNow);
			expect(formatted).toContain('in 2 hours and 1 minute');
		});

		it('includes the local clock time in the output', () => {
			const resetDate = new Date(fixedNow + 14 * 60 * 1000);
			const formatted = rateLimitUtils.formatRateLimitCountdown(resetDate, fixedNow);
			expect(formatted).toMatch(/in 14 minutes \(at .+\)/);
		});
	});

	describe('getRateLimitMessage', () => {
		beforeEach(() => {
			// Mock chrome.i18n
			global.chrome = {
				i18n: {
					getMessage: vi.fn((key, placeholders) => {
						if (key === 'rateLimitErrorWithReset' && placeholders?.length) {
							return `GitHub API rate limit exceeded. Quota resets ${placeholders[0]}. Please add or check your GitHub token in the Scrum Helper settings.`;
						}
						if (key === 'rateLimitWarningWithReset' && placeholders?.length) {
							return `Some data may be missing due to GitHub rate limit. Quota resets ${placeholders[0]}. Please add or check your GitHub token in settings.`;
						}
						if (key === 'rateLimitError') {
							return 'GitHub API rate limit exceeded. Please try again later or add/check your GitHub token in the Scrum Helper settings.';
						}
						if (key === 'rateLimitWarningMessage') {
							return 'Some data may be missing due to GitHub rate limit. Please add or check your GitHub token in settings.';
						}
						return '';
					}),
				},
			};
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('returns countdown-enhanced error message when resetDate is provided', () => {
			const resetDate = new Date(fixedNow + 14 * 60 * 1000);
			const msg = rateLimitUtils.getRateLimitMessage(resetDate, {
				platform: 'GitHub',
				type: 'error',
				now: fixedNow,
			});
			expect(msg).toContain('Quota resets in 14 minutes');
			expect(msg).toContain('Scrum Helper settings');
		});

		it('returns fallback error message when resetDate is null', () => {
			const msg = rateLimitUtils.getRateLimitMessage(null, {
				platform: 'GitHub',
				type: 'error',
				now: fixedNow,
			});
			expect(msg).toBe(
				'GitHub API rate limit exceeded. Please try again later or add/check your GitHub token in the Scrum Helper settings.',
			);
		});

		it('returns countdown-enhanced warning message when resetDate is provided', () => {
			const resetDate = new Date(fixedNow + 14 * 60 * 1000);
			const msg = rateLimitUtils.getRateLimitMessage(resetDate, {
				platform: 'GitHub',
				type: 'warning',
				now: fixedNow,
			});
			expect(msg).toContain('Some data may be missing due to GitHub rate limit');
			expect(msg).toContain('Quota resets in 14 minutes');
		});

		it('returns fallback warning message when resetDate is null', () => {
			const msg = rateLimitUtils.getRateLimitMessage(null, {
				platform: 'GitHub',
				type: 'warning',
				now: fixedNow,
			});
			expect(msg).toBe(
				'Some data may be missing due to GitHub rate limit. Please add or check your GitHub token in settings.',
			);
		});

		it('adapts to other platforms when i18n key is not customized', () => {
			// Mock without i18n
			const originalChrome = global.chrome;
			delete global.chrome;

			const resetDate = new Date(fixedNow + 10 * 60 * 1000);
			const msg = rateLimitUtils.getRateLimitMessage(resetDate, {
				platform: 'GitLab',
				type: 'error',
				now: fixedNow,
			});
			expect(msg).toContain('GitLab API rate limit exceeded');
			expect(msg).toContain('Quota resets in 10 minutes');

			global.chrome = originalChrome;
		});
	});
});
