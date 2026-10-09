import { describe, it, expect, beforeEach } from 'vitest';

// Load the script into the environment
import '../src/scripts/emailClientAdapter.js';

describe('emailClientAdapter hostname matcher logic', () => {
	const setHostname = (hostname) => {
		Object.defineProperty(window, 'location', {
			value: {
				hostname: hostname
			},
			writable: true
		});
	};

	describe('Gmail', () => {
		it('should match valid Gmail hostname', () => {
			setHostname('mail.google.com');
			expect(window.emailClientAdapter.detectClient()).toBe('gmail');
		});

		it('should not match invalid Gmail hostnames', () => {
			const invalidHostnames = ['google.com', 'mail.google.org', 'fake-mail.google.com.attacker.com'];
			for (const hostname of invalidHostnames) {
				setHostname(hostname);
				expect(window.emailClientAdapter.detectClient()).not.toBe('gmail');
			}
		});
	});

	describe('Google Groups', () => {
		it('should match valid Google Groups hostname', () => {
			setHostname('groups.google.com');
			expect(window.emailClientAdapter.detectClient()).toBe('google-groups');
		});

		it('should not match invalid Google Groups hostnames', () => {
			const invalidHostnames = ['google.com', 'groups.google.org'];
			for (const hostname of invalidHostnames) {
				setHostname(hostname);
				expect(window.emailClientAdapter.detectClient()).not.toBe('google-groups');
			}
		});
	});

	describe('Outlook', () => {
		it('should match valid Outlook hostnames', () => {
			const validHostnames = [
				'outlook.com',
				'sub.outlook.com',
				'portal.office.com',
				'admin.office365.com',
				'outlook.live.com',
				'sub.outlook.live.com',
				'outlook.cloud.microsoft',
				'sub.outlook.cloud.microsoft'
			];
			for (const hostname of validHostnames) {
				setHostname(hostname);
				expect(window.emailClientAdapter.detectClient()).toBe('outlook');
			}
		});

		it('should not match invalid Outlook hostnames', () => {
			const invalidHostnames = [
				'fakeoutlook.com',
				'office.org',
				'microsoft.com',
				'fakeoutlook.live.com',
				'fakeoutlook.cloud.microsoft'
			];
			for (const hostname of invalidHostnames) {
				setHostname(hostname);
				expect(window.emailClientAdapter.detectClient()).not.toBe('outlook');
			}
		});
	});

	describe('Yahoo Mail', () => {
		it('should match valid Yahoo Mail hostname', () => {
			setHostname('mail.yahoo.com');
			expect(window.emailClientAdapter.detectClient()).toBe('yahoo');
		});

		it('should not match invalid Yahoo Mail hostnames', () => {
			const invalidHostnames = ['yahoo.com', 'news.yahoo.com'];
			for (const hostname of invalidHostnames) {
				setHostname(hostname);
				expect(window.emailClientAdapter.detectClient()).not.toBe('yahoo');
			}
		});
	});
});
