import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CodebergHelper from '../src/scripts/codebergHelper.js';

const baseUrl = 'https://codeberg.org/api/v1';
const start = '2026-09-01';
const end = '2026-09-20';

function response(data) {
	return { ok: true, json: async () => data };
}

describe('Codeberg report pagination', () => {
	let helper;

	beforeEach(() => {
		helper = new CodebergHelper();
		vi.spyOn(browser.storage.local, 'get').mockResolvedValue({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('includes activity from repositories beyond the first page', async () => {
		const repos = Array.from({ length: 51 }, (_, i) => ({ owner: { login: 'alex' }, name: `repo${i}` }));
		const issue = { id: 1, user: { login: 'alex' }, updated_at: '2026-09-15T12:00:00Z' };
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url) => {
				const parsed = new URL(url);
				if (parsed.pathname === '/api/v1/users/alex') return response({ login: 'alex' });
				if (parsed.pathname === '/api/v1/users/alex/repos') {
					return response(parsed.searchParams.get('page') === '2' ? repos.slice(50) : repos.slice(0, 50));
				}
				if (parsed.pathname === '/api/v1/repos/alex/repo50/issues') return response([issue]);
				return response([]);
			}),
		);

		const report = await helper.fetchCodebergData('alex', start, end);

		expect(report.issues).toEqual([issue]);
		expect(fetch).toHaveBeenCalledWith(`${baseUrl}/users/alex/repos?limit=50&page=2`, expect.any(Object));
	});

	it('includes matching commits from later pages and keeps date filtering', async () => {
		const commits = Array.from({ length: 50 }, (_, i) => ({
			commit: { message: `old ${i}`, committer: { date: '2026-08-01T12:00:00Z' } },
		}));
		const recent = { commit: { message: 'Fix report\nDetails', committer: { date: '2026-09-15T12:00:00Z' } } };
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url) => response(new URL(url).searchParams.get('page') === '2' ? [recent] : commits)),
		);

		const result = await helper.fetchCommitsForOpenPRs(
			[{ number: 7, html_url: 'https://codeberg.org/alex/repo/pulls/7' }],
			'test-token',
			start,
			end,
		);

		expect(result['alex/repo#7']).toEqual([{ messageHeadline: 'Fix report', committedDate: '2026-09-15T12:00:00Z' }]);
		expect(fetch).toHaveBeenCalledWith(`${baseUrl}/repos/alex/repo/pulls/7/commits?limit=50&page=2`, {
			headers: { Accept: 'application/json', Authorization: 'token test-token' },
		});
	});

	it.each(['fetchAllPaginated', 'fetchAllPaginatedWithDateLimit'])(
		'%s follows pagination when the server returns fewer than the requested 50 items',
		async (method) => {
			const first = [{ id: 1, updated_at: '2026-09-15T12:00:00Z' }];
			const second = [{ id: 2, updated_at: '2026-09-14T12:00:00Z' }];
			vi.stubGlobal(
				'fetch',
				vi
					.fn()
					.mockResolvedValueOnce({
						...response(first),
						headers: new Headers({ Link: '<https://codeberg.org/api/v1/repos?limit=50&page=2>; rel="next"' }),
					})
					.mockResolvedValueOnce(response(second)),
			);

			expect(await helper[method](`${baseUrl}/repos`, {}, start)).toEqual([...first, ...second]);
			expect(fetch).toHaveBeenCalledTimes(2);
			expect(fetch.mock.calls[1][0]).toContain('page=2');
		},
	);

	describe.each([
		['HTTP failure', () => ({ ok: false, status: 503 })],
		['invalid response', () => response({ message: 'not an array' })],
	])('a later page with %s', (_name, failedPage) => {
		it.each(['fetchAllPaginated', 'fetchAllPaginatedWithDateLimit'])(
			'%s rejects instead of returning incomplete results',
			async (method) => {
				const first = Array.from({ length: 50 }, (_, id) => ({ id, updated_at: '2026-09-15T12:00:00Z' }));
				vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(first)).mockResolvedValueOnce(failedPage()));

				await expect(helper[method](`${baseUrl}/repos`, {}, start)).rejects.toThrow();
			},
		);

		it('does not return a partial commit list', async () => {
			const first = Array.from({ length: 50 }, () => ({
				commit: { message: 'Recent commit', committer: { date: '2026-09-15T12:00:00Z' } },
			}));
			vi.spyOn(console, 'error').mockImplementation(() => {});
			vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(first)).mockResolvedValueOnce(failedPage()));

			expect(
				await helper.fetchCommitsForOpenPRs(
					[{ number: 7, html_url: 'https://codeberg.org/alex/repo/pulls/7' }],
					null,
					start,
					end,
				),
			).toEqual({ 'alex/repo#7': [] });
		});

		it('does not cache a report with an incomplete repository list', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const save = vi.spyOn(browser.storage.local, 'set').mockResolvedValue();
			const first = Array.from({ length: 50 }, (_, i) => ({ owner: { login: 'alex' }, name: `repo${i}` }));
			vi.stubGlobal(
				'fetch',
				vi.fn(async (url) => {
					const parsed = new URL(url);
					if (parsed.pathname === '/api/v1/users/alex') return response({ login: 'alex' });
					if (parsed.pathname === '/api/v1/users/alex/repos') {
						return parsed.searchParams.get('page') === '2' ? failedPage() : response(first);
					}
					return response([]);
				}),
			);

			await expect(helper.fetchCodebergData('alex', start, end)).rejects.toThrow();
			expect(save).not.toHaveBeenCalled();
		});
	});

	it('returns an empty commit list when the API rejects the request', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, status: 404 })),
		);

		const result = await helper.fetchCommitsForOpenPRs(
			[{ number: 7, html_url: 'https://codeberg.org/alex/repo/pulls/7' }],
			null,
			start,
			end,
		);

		expect(result['alex/repo#7']).toEqual([]);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});
