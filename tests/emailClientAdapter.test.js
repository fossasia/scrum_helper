import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import '../src/scripts/emailClientAdapter.js';

function detectClientFor(hostname) {
	window.happyDOM.setURL(`https://${hostname}/`);
	return window.emailClientAdapter.detectClient();
}

const cases = [
	['gmail', ['mail.google.com'], ['google.com', 'mail.google.org', 'fake-mail.google.com.attacker.com']],
	['google-groups', ['groups.google.com'], ['google.com', 'groups.google.org']],
	[
		'outlook',
		[
			'outlook.com',
			'sub.outlook.com',
			'portal.office.com',
			'admin.office365.com',
			'outlook.live.com',
			'outlook.cloud.microsoft',
		],
		['fakeoutlook.com', 'office.org', 'microsoft.com'],
	],
	['yahoo', ['mail.yahoo.com'], ['yahoo.com', 'news.yahoo.com']],
];

describe('EmailClientAdapter detectClient', () => {
	let originalURL;

	beforeAll(() => {
		originalURL = window.location.href;
	});

	afterAll(() => {
		window.happyDOM.setURL(originalURL);
	});

	describe.each(cases)('%s', (id, valid, invalid) => {
		it.each(valid)(`should detect ${id} on %s`, (hostname) => {
			expect(detectClientFor(hostname)).toBe(id);
		});

		it.each(invalid)(`should not detect ${id} on %s`, (hostname) => {
			expect(detectClientFor(hostname)).not.toBe(id);
		});
	});

	it('should return null for an unsupported hostname', () => {
		expect(detectClientFor('example.com')).toBeNull();
	});
});
