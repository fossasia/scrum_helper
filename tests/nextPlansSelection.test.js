import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/scripts/nextPlansHelper.js';

const githubIssue = { id: 42, number: 1, title: 'GitHub task', repository: 'team/repo', _platform: 'github' };
const gitlabIssue = { id: 42, number: 2, title: 'GitLab task', repository: 'team/repo', _platform: 'gitlab' };

function select(index) {
	const checkbox = document.querySelectorAll('.issue-item-checkbox')[index];
	checkbox.checked = true;
	checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

async function saveLegacySelection(id) {
	await window.loadAssignedIssues();
	const keys = Object.keys(JSON.parse(localStorage.getItem('nextPlansCache')));
	expect(keys).toHaveLength(1);
	localStorage.setItem('selectedIssues', JSON.stringify({ [keys[0]]: [id] }));
}

describe('Next Plans issue identity', () => {
	let previousRegistry;

	beforeEach(() => {
		localStorage.clear();
		document.body.innerHTML =
			'<input id="includeNextPlans" type="checkbox" checked><div id="assignedIssuesSelector"></div>';
		vi.spyOn(browser.storage.local, 'get').mockResolvedValue({
			selectedPlatforms: ['github', 'gitlab'],
			githubUsername: 'alice',
			githubToken: 'github-test',
			gitlabUsername: 'alice',
			gitlabToken: 'gitlab-test',
		});
		previousRegistry = window.PlatformRegistry;
		window.PlatformRegistry = {
			get: (platform) => ({ fetchAssignedIssues: async () => [platform === 'github' ? githubIssue : gitlabIssue] }),
		};
	});

	afterEach(() => {
		window.PlatformRegistry = previousRegistry;
		vi.restoreAllMocks();
		localStorage.clear();
		document.body.innerHTML = '';
	});

	it('reports the selected GitLab issue when GitHub has the same numeric ID', async () => {
		await window.loadAssignedIssues();
		select(1);

		expect(await window.getNextPlansForReport()).toEqual([gitlabIssue]);
	});

	it('selects and restores both issues independently', async () => {
		await window.loadAssignedIssues();
		select(0);
		select(1);
		await window.loadAssignedIssues();

		expect(await window.getNextPlansForReport()).toEqual([githubIssue, gitlabIssue]);
		expect(Array.from(document.querySelectorAll('.issue-item-checkbox'), (checkbox) => checkbox.checked)).toEqual([
			true,
			true,
		]);
	});

	it('does not guess which issue an ambiguous legacy numeric selection meant', async () => {
		await saveLegacySelection('42');
		await window.loadAssignedIssues();

		expect(await window.getNextPlansForReport()).toEqual([]);
		expect(Array.from(document.querySelectorAll('.issue-item-checkbox'), (checkbox) => checkbox.checked)).toEqual([
			false,
			false,
		]);
	});

	it('preserves an unambiguous legacy selection', async () => {
		const unique = { ...gitlabIssue, id: 43 };
		window.PlatformRegistry.get = (platform) => ({
			fetchAssignedIssues: async () => [platform === 'github' ? githubIssue : unique],
		});
		await saveLegacySelection('43');
		await window.loadAssignedIssues();

		expect(await window.getNextPlansForReport()).toEqual([unique]);
		expect(Array.from(document.querySelectorAll('.issue-item-checkbox'), (checkbox) => checkbox.checked)).toEqual([
			false,
			true,
		]);
	});
});
