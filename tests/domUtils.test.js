import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/scripts/main.js';

describe('scrumHelperToast', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should return null and render nothing when the message is empty', () => {
		expect(window.scrumHelperToast('')).toBeNull();
		expect(window.scrumHelperToast(null)).toBeNull();
		expect(window.scrumHelperToast(undefined)).toBeNull();
		expect(document.getElementById('scrum-helper-toast')).toBeNull();
	});

	it('should render the message with the default info variant', () => {
		const toast = window.scrumHelperToast('saved');

		expect(toast.id).toBe('scrum-helper-toast');
		expect(toast.textContent).toBe('saved');
		expect(toast.className).toBe('scrum-toast scrum-toast--info');
		expect(document.getElementById('scrum-helper-toast')).toBe(toast);
	});

	it('should apply the requested variant', () => {
		const toast = window.scrumHelperToast('gone wrong', { variant: 'error' });
		expect(toast.className).toBe('scrum-toast scrum-toast--error');
	});

	it('should set assertive live region attributes for errors', () => {
		const toast = window.scrumHelperToast('gone wrong', { variant: 'error' });

		expect(toast.getAttribute('role')).toBe('alert');
		expect(toast.getAttribute('aria-live')).toBe('assertive');
		expect(toast.getAttribute('aria-atomic')).toBe('true');
	});

	it('should set polite live region attributes for non-errors', () => {
		const toast = window.scrumHelperToast('saved');

		expect(toast.getAttribute('role')).toBe('status');
		expect(toast.getAttribute('aria-live')).toBe('polite');
		expect(toast.getAttribute('aria-atomic')).toBe('true');
	});

	it('should replace an existing toast rather than stacking', () => {
		const first = window.scrumHelperToast('first');
		const second = window.scrumHelperToast('second');

		expect(document.querySelectorAll('.scrum-toast')).toHaveLength(1);
		expect(first.parentNode).toBeNull();
		expect(document.getElementById('scrum-helper-toast')).toBe(second);
	});

	it('should mount into the toast container when one exists', () => {
		const container = document.createElement('div');
		container.id = 'scrumHelperToastContainer';
		document.body.appendChild(container);

		const toast = window.scrumHelperToast('saved');

		expect(toast.parentNode).toBe(container);
	});

	it('should fall back to document.body when there is no container', () => {
		const toast = window.scrumHelperToast('saved');
		expect(toast.parentNode).toBe(document.body);
	});

	it('should hide and then remove the toast after the duration elapses', () => {
		const toast = window.scrumHelperToast('saved', { duration: 1000 });

		vi.advanceTimersByTime(999);
		expect(toast.parentNode).not.toBeNull();

		vi.advanceTimersByTime(1);
		expect(toast.classList.contains('scrum-toast--visible')).toBe(false);
		expect(toast.parentNode).not.toBeNull();

		vi.advanceTimersByTime(window.SCRUM_TOAST_ANIM_MS);
		expect(toast.parentNode).toBeNull();
	});

	it('should not throw when the toast was already detached before removal', () => {
		const toast = window.scrumHelperToast('saved', { duration: 100 });
		toast.remove();

		expect(() => vi.advanceTimersByTime(100 + window.SCRUM_TOAST_ANIM_MS)).not.toThrow();
	});
});

describe('clearScrumHelperToast', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should remove the active toast', () => {
		window.scrumHelperToast('saved');
		window.clearScrumHelperToast();

		expect(document.getElementById('scrum-helper-toast')).toBeNull();
	});

	it('should clear leftover toasts inside the container', () => {
		const container = document.createElement('div');
		container.id = 'scrumHelperToastContainer';
		const stale = document.createElement('div');
		stale.className = 'scrum-toast';
		container.appendChild(stale);
		document.body.appendChild(container);

		window.clearScrumHelperToast();

		expect(container.querySelectorAll('.scrum-toast')).toHaveLength(0);
	});

	it('should be a no-op when there is nothing to clear', () => {
		expect(() => window.clearScrumHelperToast()).not.toThrow();
	});
});

describe('showPopupMessage', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('should delegate to scrumHelperToast with default options', () => {
		const spy = vi.spyOn(window, 'scrumHelperToast');

		window.showPopupMessage('saved');

		expect(spy).toHaveBeenCalledWith('saved', { duration: 2000, variant: 'info' });
	});

	it('should let callers override the defaults', () => {
		const spy = vi.spyOn(window, 'scrumHelperToast');

		window.showPopupMessage('gone wrong', { variant: 'error', duration: 500 });

		expect(spy).toHaveBeenCalledWith('gone wrong', { duration: 500, variant: 'error' });
	});

	it('should tolerate a null options argument', () => {
		expect(() => window.showPopupMessage('saved', null)).not.toThrow();
		expect(document.getElementById('scrum-helper-toast')).not.toBeNull();
	});
});
