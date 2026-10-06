import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/scripts/nextPlansHelper.js';

describe('Next Plans account changes', () => {
	let settings;
	let previousRegistry;
	let fetchAssignedIssues;
	beforeEach(() => {
		localStorage.clear();
		document.body.innerHTML =
			'<input id="includeNextPlans" type="checkbox" checked><div id="assignedIssuesSelector"></div>';
		settings = {
			selectedPlatforms: ['github'],
			platform: 'github',
			githubUsername: 'alice',
			githubToken: 'test-token',
			gitlabUsername: 'alice',
			gitlabToken: 'test-token',
		};
		vi.spyOn(browser.storage.local, 'get').mockImplementation(async (keys) =>
			Object.fromEntries(keys.filter((key) => key in settings).map((key) => [key, settings[key]])),
		);
		previousRegistry = window.PlatformRegistry;
		fetchAssignedIssues = vi.fn(async (platform) => {
			const username =
				settings[`${platform}Username`] || (settings.platform === platform ? settings.platformUsername : '');
			if (!username) throw new Error(`${platform} username is required`);
			return [{ id: 1, number: 1, title: username, html_url: 'https://github.com/team/project/issues/1' }];
		});
		window.PlatformRegistry = { get: (platform) => ({ fetchAssignedIssues: () => fetchAssignedIssues(platform) }) };
	});
	afterEach(() => {
		window.PlatformRegistry = previousRegistry;
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		localStorage.clear();
		document.body.innerHTML = '';
	});

	it.each([
		['github', false],
		['github', true],
		['gitlab', false],
		['gitlab', true],
	])('fetches the new %s account with repository filtering %s', async (platform, filtered) => {
		settings.selectedPlatforms = [platform];
		settings.platform = platform;
		settings.useRepoFilter = filtered;
		settings.useGitlabRepoFilter = filtered;
		settings.selectedRepos = ['team/project'];
		settings.selectedGitlabRepos = ['team/project'];
		await window.loadAssignedIssues();
		settings[`${platform}Username`] = 'bob';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		expect(document.querySelector('.issue-checkbox-label').textContent).toContain('bob');
	});

	it('keeps issue selections separate and restores them when returning to an account', async () => {
		await window.loadAssignedIssues();
		const checkbox = document.querySelector('.issue-item-checkbox');
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event('change'));
		expect(await window.getNextPlansForReport()).toHaveLength(1);
		settings.githubUsername = 'bob';
		await window.loadAssignedIssues();
		expect(document.querySelector('.issue-item-checkbox').checked).toBe(false);
		expect(await window.getNextPlansForReport()).toEqual([]);
		settings.githubUsername = 'alice';
		await window.loadAssignedIssues();
		expect(document.querySelector('.issue-item-checkbox').checked).toBe(true);
		expect(await window.getNextPlansForReport()).toHaveLength(1);
	});

	it('does not display the previous account after its username is removed', async () => {
		await window.loadAssignedIssues();
		delete settings.githubUsername;
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		expect(document.getElementById('assignedIssuesSelector').style.display).toBe('none');
	});

	it('uses the legacy platformUsername when a provider username is absent', async () => {
		delete settings.githubUsername;
		settings.platformUsername = 'alice';
		await window.loadAssignedIssues();
		settings.platformUsername = 'bob';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		expect(document.querySelector('.issue-checkbox-label').textContent).toContain('bob');
	});

	it('reuses cached issues for the same account', async () => {
		await window.loadAssignedIssues();
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(1);
	});

	it('treats account-name casing as the same identity', async () => {
		await window.loadAssignedIssues();
		settings.githubUsername = 'ALICE';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(1);
	});
	it('invalidates cached issues when the token changes without storing either token', async () => {
		await window.loadAssignedIssues();
		settings.githubToken = 'replacement-token';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		const cache = localStorage.getItem('nextPlansCache');
		expect(cache).not.toContain('test-token');
		expect(cache).not.toContain('replacement-token');
	});

	it('separates equal GitLab usernames on different API servers', async () => {
		settings.platform = 'gitlab';
		settings.selectedPlatforms = ['gitlab'];
		await window.loadAssignedIssues();
		settings.gitlabBaseUrl = 'https://gitlab.example.net/api/v4/';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
	});

	it('ignores an older request that completes after the new account is shown', async () => {
		let resolveOld;
		fetchAssignedIssues.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveOld = resolve;
				}),
		);
		const oldLoad = window.loadAssignedIssues();
		await vi.waitFor(() => expect(fetchAssignedIssues).toHaveBeenCalledTimes(1));
		settings.githubUsername = 'bob';
		await window.loadAssignedIssues();
		resolveOld([{ id: 1, number: 1, title: 'alice', html_url: 'https://github.com/team/project/issues/1' }]);
		await oldLoad;
		expect(document.querySelector('.issue-checkbox-label').textContent).toContain('bob');
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
	});

	it('supports selections within the page when Web Crypto is unavailable', async () => {
		vi.stubGlobal('crypto', {});
		settings.githubToken = 'without-crypto-token';
		await window.loadAssignedIssues();
		const checkbox = document.querySelector('.issue-item-checkbox');
		checkbox.checked = true;
		checkbox.dispatchEvent(new Event('change'));
		expect(await window.getNextPlansForReport()).toHaveLength(1);
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(1);
		settings.githubToken = 'another-without-crypto-token';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		expect(await window.getNextPlansForReport()).toEqual([]);
		expect(localStorage.getItem('nextPlansCache')).not.toContain('without-crypto-token');
	});

	it('keeps distinct page namespaces when cryptographic digest fails', async () => {
		vi.stubGlobal('crypto', { subtle: { digest: vi.fn().mockRejectedValue(new Error('Digest unavailable')) } });
		settings.githubToken = 'failed-digest-token';
		await window.loadAssignedIssues();
		settings.githubToken = 'other-failed-digest-token';
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		await window.loadAssignedIssues();
		expect(fetchAssignedIssues).toHaveBeenCalledTimes(2);
		expect(localStorage.getItem('nextPlansCache')).not.toContain('failed-digest-token');
	});
});
