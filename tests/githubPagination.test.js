import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/scripts/githubHelper.js';

const URL = 'https://api.github.com/search/issues?q=author:octocat&per_page=100';
const headers = { Accept: 'application/vnd.github.v3+json' };

function makeItems(start, count) {
	return Array.from({ length: count }, (_, i) => ({ id: start + i, number: start + i }));
}

function pageResponse(body, { next = false, status = 200 } = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: next ? { Link: '<https://api.github.com/next>; rel="next"' } : {},
	});
}

describe('githubFetchAllSearchPages', () => {
	let fetchMock;

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should return the items of a single page without truncation', async () => {
		fetchMock.mockResolvedValueOnce(pageResponse({ items: makeItems(1, 3), total_count: 3 }));

		const res = await window.githubFetchAllSearchPages(URL, headers);
		const data = await res.json();

		expect(res.ok).toBe(true);
		expect(data.items.map((i) => i.number)).toEqual([1, 2, 3]);
		expect(data.truncated).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(`${URL}&page=1`, { headers });
	});

	it('should follow the next link and merge items from every page', async () => {
		fetchMock
			.mockResolvedValueOnce(pageResponse({ items: makeItems(1, 100), total_count: 101 }, { next: true }))
			.mockResolvedValueOnce(pageResponse({ items: makeItems(101, 1), total_count: 101 }));

		const data = await (await window.githubFetchAllSearchPages(URL, headers)).json();

		expect(data.items).toHaveLength(101);
		expect(data.items[100].number).toBe(101);
		expect(data.truncated).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenLastCalledWith(`${URL}&page=2`, { headers });
	});

	it('should keep earlier pages and flag truncation when a later page fails', async () => {
		fetchMock
			.mockResolvedValueOnce(pageResponse({ items: makeItems(1, 100), total_count: 150 }, { next: true }))
			.mockResolvedValueOnce(pageResponse({ message: 'API rate limit exceeded' }, { status: 403 }));

		const res = await window.githubFetchAllSearchPages(URL, headers);
		const data = await res.json();

		expect(res.ok).toBe(true);
		expect(data.items).toHaveLength(100);
		expect(data.truncated).toBe(true);
	});

	it('should de-duplicate items that shift between pages', async () => {
		fetchMock
			.mockResolvedValueOnce(pageResponse({ items: makeItems(1, 100), total_count: 101 }, { next: true }))
			.mockResolvedValueOnce(pageResponse({ items: makeItems(100, 2), total_count: 101 }));

		const data = await (await window.githubFetchAllSearchPages(URL, headers)).json();

		expect(data.items.map((i) => i.id)).toEqual(Array.from({ length: 101 }, (_, i) => i + 1));
	});

	it('should return a failing first page unchanged', async () => {
		const failure = pageResponse({ message: 'Validation Failed' }, { status: 422 });
		fetchMock.mockResolvedValueOnce(failure);

		const res = await window.githubFetchAllSearchPages(URL, headers);

		expect(res).toBe(failure);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('should flag truncation when GitHub reports incomplete results', async () => {
		fetchMock.mockResolvedValueOnce(
			pageResponse({ items: makeItems(1, 5), total_count: 5, incomplete_results: true }),
		);

		const data = await (await window.githubFetchAllSearchPages(URL, headers)).json();

		expect(data.truncated).toBe(true);
	});

	it('should stop at 10 pages and flag truncation at the 1,000-result limit', async () => {
		fetchMock.mockImplementation(async (url) => {
			const page = Number(new globalThis.URL(url).searchParams.get('page'));
			return pageResponse(
				{ items: makeItems((page - 1) * 100 + 1, 100), total_count: 1000 },
				{ next: true },
			);
		});

		const data = await (await window.githubFetchAllSearchPages(URL, headers)).json();

		expect(fetchMock).toHaveBeenCalledTimes(10);
		expect(data.items).toHaveLength(1000);
		expect(data.truncated).toBe(true);
	});
});

describe.each([
	['githubFetchIssues', 'author%3Aoctocat'],
	['githubFetchReviews', 'reviewed-by%3Aoctocat'],
])('%s', (fnName, qualifier) => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(pageResponse({ items: makeItems(1, 100), total_count: 101 }, { next: true }))
				.mockResolvedValueOnce(pageResponse({ items: makeItems(101, 1), total_count: 101 })),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should request every page of the search and merge the results', async () => {
		const res = await window[fnName]('octocat', 'tok', '2026-01-01', '2026-01-31');
		const data = await res.json();

		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch.mock.calls[0][0]).toContain(qualifier);
		expect(fetch.mock.calls[0][0]).toContain('&page=1');
		expect(fetch.mock.calls[1][0]).toContain('&page=2');
		expect(data.items).toHaveLength(101);
	});
});
