import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../src/scripts/scrumHelper.js';

describe('formatDate (custom date report heading)', () => {
	const originalTz = process.env.TZ;

	beforeAll(() => {
		process.env.TZ = 'America/New_York';
	});

	afterAll(() => {
		if (originalTz !== undefined) {
			process.env.TZ = originalTz;
		} else {
			delete process.env.TZ;
		}
	});

	it('should display Oct 15, 2026 instead of Oct 14, 2026 in UTC-negative timezone America/New_York', () => {
		const formatted = window.formatDate('2026-10-15');
		expect(formatted).toBe('Oct 15, 2026');
	});

	it('should format date range endpoints consistently without timezone shift', () => {
		const startFormatted = window.formatDate('2026-10-15');
		const endFormatted = window.formatDate('2026-10-20');
		expect(startFormatted).toBe('Oct 15, 2026');
		expect(endFormatted).toBe('Oct 20, 2026');
	});

	it('should produce identical formatted date across multiple timezones', () => {
		const testTimezones = [
			'UTC',
			'America/New_York',
			'America/Los_Angeles',
			'Europe/London',
			'Asia/Kolkata',
			'Asia/Tokyo',
		];
		for (const tz of testTimezones) {
			process.env.TZ = tz;
			expect(window.formatDate('2026-10-15')).toBe('Oct 15, 2026');
			expect(window.formatDate('2026-10-20')).toBe('Oct 20, 2026');
		}
	});
});
