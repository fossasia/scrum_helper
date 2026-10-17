import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/scripts/main.js';
import '../src/scripts/scrumHelper.js';

describe('handleUsernameValidationError', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('highlights multiple platform input elements when given an array of platforms', () => {
		const gitlabInput = document.createElement('input');
		gitlabInput.id = 'dropdown-gitlabUsername';
		const codebergInput = document.createElement('input');
		codebergInput.id = 'dropdown-codebergUsername';
		document.body.appendChild(gitlabInput);
		document.body.appendChild(codebergInput);

		const msg = 'GitLab user "user1" not found.\nCodeberg user "user2" not found.';
		window.handleUsernameValidationError(msg, ['gitlab', 'codeberg']);

		expect(gitlabInput.classList.contains('input-error')).toBe(true);
		expect(codebergInput.classList.contains('input-error')).toBe(true);

		const toast = document.getElementById('scrum-helper-toast');
		expect(toast).not.toBeNull();
		expect(toast.textContent).toBe(msg);
	});
});
