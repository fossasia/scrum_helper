import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/scripts/main.js';

describe('scrumDateRangeUtils.commitNativeDatePickerChange', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('persists the selected range and blurs the changed input', () => {
		const startInput = document.createElement('input');
		const endInput = document.createElement('input');
		startInput.type = 'date';
		endInput.type = 'date';
		startInput.value = '2026-08-20';
		endInput.value = '2026-08-22';

		const blurSpy = vi.spyOn(startInput, 'blur');
		const setSpy = vi.spyOn(browser.storage.local, 'set');

		window.scrumDateRangeUtils.commitNativeDatePickerChange(startInput, startInput, endInput);

		expect(blurSpy).toHaveBeenCalledTimes(1);
		expect(setSpy).toHaveBeenCalledWith({
			startingDate: '2026-08-20',
			endingDate: '2026-08-22',
		});
	});

	it('still blurs when only one side of the range is set', () => {
		const startInput = document.createElement('input');
		const endInput = document.createElement('input');
		startInput.type = 'date';
		endInput.type = 'date';
		startInput.value = '2026-08-24';
		endInput.value = '';

		const blurSpy = vi.spyOn(endInput, 'blur');

		window.scrumDateRangeUtils.commitNativeDatePickerChange(endInput, startInput, endInput);

		expect(blurSpy).toHaveBeenCalledTimes(1);
	});
});
