import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/scripts/nextPlansHelper.js';

const githubIssues = [
	{
		id: 1,
		number: 1,
		title: 'GH selected',
		html_url: 'https://github.com/team/shared/issues/1',
		repository_url: 'https://api.github.com/repos/team/shared',
	},
	{
		id: 2,
		number: 2,
		title: 'GH other',
		html_url: 'https://github.com/team/other/issues/2',
		repository_url: 'https://api.github.com/repos/team/other',
	},
];
const gitlabIssues = [
	{ id: 3, iid: 3, title: 'GL selected', web_url: 'https://gitlab.com/team/shared/-/issues/3' },
	{ id: 4, iid: 4, title: 'GL other', web_url: 'https://gitlab.com/team/other/-/issues/4' },
];

describe('Next Plans repository filters across platforms', () => {
	let settings;
	let previousRegistry;
	beforeEach(async () => {
		localStorage.clear();
		document.body.innerHTML =
			'<input id="includeNextPlans" type="checkbox" checked><div id="assignedIssuesSelector"></div>';
		settings = {
			selectedPlatforms: ['github', 'gitlab'],
			githubUsername: 'alice',
			gitlabUsername: 'alice',
			githubToken: 'gh-test',
			gitlabToken: 'gl-test',
			useRepoFilter: false,
			useGitlabRepoFilter: false,
		};
		vi.spyOn(browser.storage.local, 'get').mockImplementation(async () => settings);
		previousRegistry = window.PlatformRegistry;
		const helpers = {};
		window.PlatformRegistry = {
			register: (name, helper) => {
				helpers[name] = helper;
			},
			get: (name) => helpers[name],
		};
		vi.resetModules();
		await import('../src/scripts/githubHelper.js');
		await import('../src/scripts/gitlabHelper.js');
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url) => ({
				ok: true,
				json: async () => (url.startsWith('https://api.github.com/') ? { items: githubIssues } : gitlabIssues),
			})),
		);
	});
	afterEach(() => {
		window.PlatformRegistry = previousRegistry;
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		localStorage.clear();
		document.body.innerHTML = '';
	});
	const titles = () => Array.from(document.querySelectorAll('.issue-checkbox-label'), (label) => label.textContent);
	it('keeps GitLab unfiltered when only GitHub filtering is enabled', async () => {
		settings.useRepoFilter = true;
		settings.selectedRepos = ['team/shared'];
		await window.loadAssignedIssues();
		expect(titles()).toHaveLength(3);
		expect(titles().some((title) => title.includes('GL other'))).toBe(true);
		expect(titles().some((title) => title.includes('GH other'))).toBe(false);
	});
	it('keeps GitHub unfiltered when only GitLab filtering is enabled', async () => {
		settings.useGitlabRepoFilter = true;
		settings.selectedGitlabRepos = [{ fullName: '/team/shared' }];
		await window.loadAssignedIssues();
		expect(titles()).toHaveLength(3);
		expect(titles().some((title) => title.includes('GH other'))).toBe(true);
		expect(titles().some((title) => title.includes('GL other'))).toBe(false);
	});
	it('does not reuse cached issues when a filter moves to the other platform', async () => {
		settings.useRepoFilter = true;
		settings.selectedRepos = ['team/shared'];
		await window.loadAssignedIssues();
		settings.useRepoFilter = false;
		settings.useGitlabRepoFilter = true;
		settings.selectedGitlabRepos = ['team/shared'];
		await window.loadAssignedIssues();
		expect(titles().some((title) => title.includes('GH other'))).toBe(true);
		expect(titles().some((title) => title.includes('GL other'))).toBe(false);
		expect(fetch).toHaveBeenCalledTimes(4);
	});
	it('keeps selected repositories separate when both filters are enabled', async () => {
		settings.useRepoFilter = true;
		settings.selectedRepos = ['team/shared'];
		settings.useGitlabRepoFilter = true;
		settings.selectedGitlabRepos = ['team/other'];
		await window.loadAssignedIssues();
		expect(titles()).toHaveLength(2);
		expect(titles().some((title) => title.includes('GH selected'))).toBe(true);
		expect(titles().some((title) => title.includes('GL other'))).toBe(true);
	});
	it('retains all repositories when both filters are disabled', async () => {
		await window.loadAssignedIssues();
		expect(titles()).toHaveLength(4);
	});
});
