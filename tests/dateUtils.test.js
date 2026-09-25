import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatLocalDate } from '../src/scripts/dateUtils.js';
import '../src/scripts/main.js';

describe('formatLocalDate', () => {
	it('should format dates with single-digit months and days with leading zeros', () => {
		const date = new Date(2026, 0, 5); // January 5, 2026
		expect(formatLocalDate(date)).toBe('2026-01-05');
	});

	it('should format dates with double-digit months and days', () => {
		const date = new Date(2026, 11, 25); // December 25, 2026
		expect(formatLocalDate(date)).toBe('2026-12-25');
	});

	it('should correctly format leap day', () => {
		const leapDate = new Date(2024, 1, 29); // February 29, 2024
		expect(formatLocalDate(leapDate)).toBe('2024-02-29');
	});

	it('should format year-end and year-start dates correctly', () => {
		const yearEnd = new Date(2025, 11, 31); // December 31, 2025
		expect(formatLocalDate(yearEnd)).toBe('2025-12-31');

		const yearStart = new Date(2026, 0, 1); // January 1, 2026
		expect(formatLocalDate(yearStart)).toBe('2026-01-01');
	});

	it('should return empty string for invalid date objects', () => {
		const invalidDate = new Date('invalid-date-string');
		expect(formatLocalDate(invalidDate)).toBe('');
	});

	it('should return empty string for non-Date inputs', () => {
		expect(formatLocalDate(null)).toBe('');
		expect(formatLocalDate(undefined)).toBe('');
		expect(formatLocalDate('2026-08-25')).toBe('');
		expect(formatLocalDate(1234567890)).toBe('');
		expect(formatLocalDate({})).toBe('');
	});

	it('should be exposed on the window object', () => {
		expect(typeof window.formatLocalDate).toBe('function');
		const date = new Date(2026, 7, 24);
		expect(window.formatLocalDate(date)).toBe('2026-08-24');
	});
});

describe('scrumDateRangeUtils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should delegate formatLocalDate correctly', () => {
		const date = new Date(2026, 7, 24); // August 24, 2026 (0-indexed month)
		const formatted = window.scrumDateRangeUtils.formatLocalDate(date);
		expect(formatted).toBe('2026-08-24');
	});

	it('should calculate today, yesterday and week ago string formats', () => {
		const today = window.scrumDateRangeUtils.getLocalTodayString();
		expect(today).toBe('2026-08-25');

		const yesterday = window.scrumDateRangeUtils.getLocalYesterdayString();
		expect(yesterday).toBe('2026-08-24');

		const weekAgo = window.scrumDateRangeUtils.getLocalWeekAgoString();
		expect(weekAgo).toBe('2026-08-18');
	});

	describe('normalizeAndSync', () => {
		let startInput;
		let endInput;

		beforeEach(() => {
			startInput = document.createElement('input');
			endInput = document.createElement('input');
		});

		it('should do nothing if inputs are valid and in the past', () => {
			startInput.value = '2026-08-01';
			endInput.value = '2026-08-10';

			const didChange = window.scrumDateRangeUtils.normalizeAndSync(startInput, endInput);
			expect(didChange).toBe(false);
			expect(startInput.value).toBe('2026-08-01');
			expect(endInput.value).toBe('2026-08-10');
		});

		it('should reset end date if starting date is after ending date', () => {
			startInput.value = '2026-08-20';
			endInput.value = '2026-08-10';

			const didChange = window.scrumDateRangeUtils.normalizeAndSync(startInput, endInput);
			expect(didChange).toBe(true);
			expect(startInput.value).toBe('2026-08-20');
			expect(endInput.value).toBe('');
		});

		it('should cap dates to today if they are in the future', () => {
			const today = window.scrumDateRangeUtils.getLocalTodayString();
			startInput.value = '2050-01-01';
			endInput.value = '2050-01-02';

			const didChange = window.scrumDateRangeUtils.normalizeAndSync(startInput, endInput);
			expect(didChange).toBe(true);
			expect(startInput.value).toBe(today);
			expect(endInput.value).toBe(today);
		});
	});
});

