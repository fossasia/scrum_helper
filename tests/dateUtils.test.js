import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/scripts/main.js';

describe('scrumDateRangeUtils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should formatLocalDate correctly', () => {
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
