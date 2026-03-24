const GitLabHelper = require('../src/scripts/gitlabHelper');

describe('GitLabHelper date module tests', () => {
	test('formatDate returns US-formatted date for valid input', () => {
		const helper = new GitLabHelper();
		expect(helper.formatDate('2026-01-05T12:00:00Z')).toBe('Jan 05, 2026');
	});

	test('formatDate returns Invalid Date for invalid input', () => {
		const helper = new GitLabHelper();
		expect(helper.formatDate('not-a-date')).toBe('Invalid Date');
	});

	test('processGitLabData provides safe defaults for missing arrays', () => {
		const helper = new GitLabHelper();
		const processed = helper.processGitLabData({ user: { id: 1 } });

		expect(processed).toEqual({
			mergeRequests: [],
			issues: [],
			comments: [],
			user: { id: 1 },
		});
	});
});
