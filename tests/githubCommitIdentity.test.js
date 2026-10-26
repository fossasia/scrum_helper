import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pulls = ['first', 'second'].map((repo, index) => ({
	id: index + 1,
	number: 10,
	title: `${repo} pull request`,
	state: 'open',
	user: { login: 'alice' },
	created_at: '2026-10-11T12:00:00Z',
	updated_at: '2026-10-11T12:00:00Z',
	html_url: `https://github.com/alice/${repo}/pull/10`,
	repository_url: `https://api.github.com/repos/alice/${repo}`,
	pull_request: {},
}));
const commit = (repo) => ({
	messageHeadline: `${repo} change`,
	committedDate: '2026-10-11T12:00:00Z',
	url: `https://github.com/alice/${repo}/commit/abc`,
	author: { user: { login: 'alice' } },
});

let apiFetch;

beforeEach(async () => {
	vi.resetModules();
	document.body.innerHTML = '<div id="scrumReport"></div><button id="generateReport"></button>';
	vi.stubGlobal('sanitizeHtml', (html) => html);
	apiFetch = vi.fn(async (url) => {
		let body;
		if (url.includes('/graphql')) {
			body = {
				data: Object.fromEntries(
					['first', 'second'].map((repo, index) => [
						`pr${index}`,
						{ pullRequest: { commits: { nodes: [{ commit: commit(repo) }] } } },
					]),
				),
			};
		} else if (url.includes('/users/')) body = { login: 'alice', name: 'Alice' };
		else if (url.includes('reviewed-by')) body = { items: [] };
		else body = { items: structuredClone(pulls) };
		return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
	});
	vi.stubGlobal('fetch', apiFetch);
	const settings = {
		platform: 'github',
		selectedPlatforms: ['github'],
		githubUsername: 'alice',
		githubToken: 'fixture-token',
		startingDate: '2026-10-11',
		endingDate: '2026-10-11',
		selectedTimeframe: 'custom',
		showCommits: true,
		includeNextPlans: false,
		onlyPRs: true,
		showOpenLabel: true,
	};
	browser.storage.local.get.mockImplementation((_keys, callback) => {
		callback?.(settings);
		return Promise.resolve(settings);
	});
	browser.storage.local.set.mockImplementation((_value, callback) => {
		callback?.();
		return Promise.resolve();
	});
	await import('../src/scripts/githubHelper.js');
	for (const name of [
		'githubFetchUser',
		'githubFetchIssues',
		'githubFetchPullRequests',
		'githubFetchCommits',
		'githubFetchPrMergedStatusREST',
	])
		vi.stubGlobal(name, window[name]);
	await import('../src/scripts/scrumHelper.js');
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('GitHub commit repository identity', () => {
	it('preserves empty results outside the report date range', async () => {
		const map = await window.githubFetchCommits(pulls.slice(0, 1), 'fixture-token', '2026-10-12', '2026-10-12');
		expect(Object.values(map)).toEqual([[]]);
	});
	it('keeps equal pull-request numbers from different repositories distinct', async () => {
		const map = await window.githubFetchCommits(pulls, 'fixture-token', '2026-10-11', '2026-10-11');
		expect(map[`${pulls[0].repository_url}#10`]).toEqual([commit('first')]);
		expect(map[`${pulls[1].repository_url}#10`]).toEqual([commit('second')]);
	});
	it('does not erase another repository when a pull request has no commit data', async () => {
		apiFetch.mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					data: {
						pr0: { pullRequest: { commits: { nodes: [{ commit: commit('first') }] } } },
						pr1: { pullRequest: null },
					},
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			),
		);
		const map = await window.githubFetchCommits(pulls, 'fixture-token', '2026-10-11', '2026-10-11');
		expect(map[`${pulls[0].repository_url}#10`]).toEqual([commit('first')]);
		expect(map[`${pulls[1].repository_url}#10`]).toEqual([]);
	});
	it('attaches the correct commits in the generated report', async () => {
		window.generateScrumReport();
		await vi.waitFor(() => expect(document.getElementById('scrumReport').textContent).toContain('first change'));
		const report = document.getElementById('scrumReport');
		for (const [repo, other] of [
			['first', 'second'],
			['second', 'first'],
		]) {
			const item = report.querySelector(`a[href="https://github.com/alice/${repo}/pull/10"]`).closest('li');
			expect(item.textContent).toContain(`${repo} change`);
			expect(item.textContent).not.toContain(`${other} change`);
		}
	});
});
