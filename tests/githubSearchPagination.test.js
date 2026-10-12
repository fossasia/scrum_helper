import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const windows = [];
function createWindow() {
	const window = new Window();
	windows.push(window);
	window.chrome = window.browser = {
		storage: { local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue() } },
		runtime: { onMessage: { addListener: vi.fn() } },
		i18n: { getMessage: () => '' },
	};
	return window;
}
function loadScript(window, name) {
	window.eval(readFileSync(`src/scripts/${name}.js`, 'utf8'));
}
function response(window, items, headers = {}, extra = {}) {
	return new window.Response(JSON.stringify({ items, total_count: 101, incomplete_results: false, ...extra }), {
		headers,
	});
}
function issue(n, reviewed = false) {
	return {
		id: n,
		number: n,
		title: `Task ${n}`,
		state: 'open',
		html_url: `https://github.com/team/repo/issues/${n}`,
		repository_url: 'https://api.github.com/repos/team/repo',
		created_at: '2026-10-02T12:00:00Z',
		updated_at: '2026-10-03T12:00:00Z',
		user: { login: reviewed ? 'bob' : 'alice' },
		...(reviewed ? { pull_request: {} } : {}),
	};
}
function setupReport(window, fetch, reviewed = false) {
	const settings = {
		selectedPlatforms: ['github'],
		platform: 'github',
		githubUsername: 'alice',
		githubToken: 'test-token',
		startingDate: '2026-10-01',
		endingDate: '2026-10-12',
		yesterdayContribution: false,
		weeklyContribution: false,
		onlyIssues: !reviewed,
		onlyPRs: false,
		onlyRevPRs: reviewed,
		onlyMergedPRs: false,
		includeNextPlans: false,
		showCommits: false,
	};
	const stored = {};
	window.chrome.storage.local = {
		remove: vi.fn().mockResolvedValue(),
		get: vi.fn((keys, cb) => {
			const data = { ...settings, ...stored };
			cb?.(data);
			return Promise.resolve(data);
		}),
		set: vi.fn((data, cb) => {
			Object.assign(stored, data);
			cb?.();
			return Promise.resolve();
		}),
	};
	window.document.body.innerHTML = '<div id="scrumReport"></div>';
	window.fetch = fetch;
	window.sanitizeHtml = (html) => html;
	window.showPopupMessage = vi.fn();
	window.scrumHelperToast = vi.fn();
	loadScript(window, 'githubHelper');
	loadScript(window, 'scrumHelper');
	window.generateScrumReport();
}
afterEach(async () => {
	await Promise.all(windows.splice(0).map((window) => window.happyDOM.abort()));
});

describe('GitHub activity search pagination', () => {
	it('returns a complete single-page response without consuming its body', async () => {
		const window = createWindow();
		const single = response(
			window,
			[issue(1)],
			{ 'X-RateLimit-Remaining': '20', ETag: '"single-page"' },
			{ total_count: 1 },
		);
		window.fetch = vi.fn().mockResolvedValue(single);
		loadScript(window, 'githubHelper');
		const result = await window.githubFetchIssues('alice', '', '2026-10-01', '2026-10-12');
		expect(result).toBe(single);
		expect(result.bodyUsed).toBe(false);
		expect(result.headers.get('ETag')).toBe('"single-page"');
		expect((await result.json()).items).toHaveLength(1);
		expect(window.fetch).toHaveBeenCalledTimes(1);
	});

	it('retains empty-username rejection without making a request', async () => {
		const window = createWindow();
		window.fetch = vi.fn();
		loadScript(window, 'githubHelper');
		const result = await window.githubFetchReviews(' ');
		expect(result.status).toBe(404);
		expect(await result.json()).toEqual({ items: [] });
		expect(window.fetch).not.toHaveBeenCalled();
	});

	it.each([false, true])('includes second-page activity in the actual report (reviewed=%s)', async (reviewed) => {
		const window = createWindow();
		const fetch = vi.fn(async (url) => {
			const parsed = new URL(url);
			if (parsed.pathname === '/users/alice') return response(window, [], {}, { login: 'alice', id: 1 });
			const reviewQuery = parsed.searchParams.get('q').startsWith('reviewed-by:');
			if (reviewQuery !== reviewed) return response(window, [], {}, { total_count: 0 });
			const second = parsed.searchParams.get('page') === '2';
			return response(
				window,
				second ? [issue(101, reviewed)] : Array.from({ length: 100 }, (_, i) => issue(i + 1, reviewed)),
				second ? {} : { Link: `<${url}&page=2>; rel="next"` },
			);
		});
		setupReport(window, fetch, reviewed);
		await vi.waitFor(() => expect(window.document.getElementById('scrumReport').textContent).toContain('Task 1'));
		await vi.waitFor(() => expect(window.document.getElementById('scrumReport').textContent).toContain('Task 101'));
		expect(fetch.mock.calls.filter(([url]) => new URL(url).searchParams.get('page') === '2')).toHaveLength(1);
	});

	it('keeps clone/body/status and final rate-limit headers valid when aggregating', async () => {
		const window = createWindow();
		window.fetch = vi
			.fn()
			.mockImplementationOnce(async (url) => response(window, [issue(1)], { Link: `<${url}&page=2>; rel="next"` }))
			.mockResolvedValueOnce(
				response(window, [issue(2)], {
					'X-RateLimit-Remaining': '17',
					'Content-Length': '5',
					'Content-Encoding': 'gzip',
					ETag: '"second-page"',
					'Last-Modified': 'Mon, 12 Oct 2026 07:00:00 GMT',
				}),
			);
		loadScript(window, 'githubHelper');
		const result = await window.githubFetchIssues('alice', 'test', '2026-10-01', '2026-10-12', 'team');
		expect(result.status).toBe(200);
		expect(result.ok).toBe(true);
		expect(result.headers.get('X-RateLimit-Remaining')).toBe('17');
		expect(result.headers.has('Content-Length')).toBe(false);
		expect(result.headers.has('Content-Encoding')).toBe(false);
		expect(result.headers.has('ETag')).toBe(false);
		expect(result.headers.has('Last-Modified')).toBe(false);
		expect(result.headers.has('Link')).toBe(false);
		expect((await result.clone().json()).items).toHaveLength(2);
		expect((await result.json()).items).toHaveLength(2);
		expect(window.fetch.mock.calls[1][1].headers.Authorization).toBe('token test');
	});

	it.each([401, 403, 422, 429, 500])('returns a later-page HTTP %s response unchanged', async (status) => {
		const window = createWindow();
		const failure = new window.Response(JSON.stringify({ message: 'rate limit exceeded' }), {
			status,
			headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' },
		});
		window.fetch = vi
			.fn()
			.mockImplementationOnce(async (url) => response(window, [issue(1)], { Link: `<${url}&page=2>; rel="next"` }))
			.mockResolvedValueOnce(failure);
		loadScript(window, 'githubHelper');
		const result = await window.githubFetchReviews('alice', 'test', '2026-10-01', '2026-10-12');
		expect(result).toBe(failure);
		expect(result.headers.get('Retry-After')).toBe('60');
		expect((await result.clone().json()).message).toBe('rate limit exceeded');
		expect((await result.json()).message).toBe('rate limit exceeded');
	});

	it.each([{ total_count: 1001 }, { incomplete_results: true }])(
		'shows an incomplete-search error in the report UI (%j)',
		async (extra) => {
			const window = createWindow();
			const fetch = vi.fn(async (url) =>
				new URL(url).pathname === '/users/alice'
					? response(window, [], {}, { login: 'alice', id: 1 })
					: response(window, [issue(1)], {}, extra),
			);
			setupReport(window, fetch);
			await vi.waitFor(() =>
				expect(window.scrumHelperToast).toHaveBeenCalledWith(expect.stringContaining('Narrow the date range'), {
					duration: 2000,
					variant: 'error',
				}),
			);
			expect(window.document.getElementById('scrumReport').textContent).not.toContain('Task 1');
		},
	);

	it.each([
		'https://attacker.example/search/issues?q=x&page=2',
		'https://api.github.com/user?page=2',
		'https://api.github.com/search/issues?q=other&per_page=100&page=2',
	])('does not forward credentials to an unrelated next link (%s)', async (next) => {
		const window = createWindow();
		window.fetch = vi.fn().mockResolvedValue(response(window, [issue(1)], { Link: `<${next}>; rel="next"` }));
		loadScript(window, 'githubHelper');
		await expect(window.githubFetchIssues('alice', 'test', '2026-10-01', '2026-10-12')).rejects.toThrow(
			'pagination could not be completed',
		);
		expect(window.fetch).toHaveBeenCalledTimes(1);
	});

	it('stops at ten pages rather than silently returning a truncated report', async () => {
		const window = createWindow();
		window.fetch = vi.fn(async (url) => {
			const parsed = new URL(url);
			const page = Number(parsed.searchParams.get('page') || 1);
			parsed.searchParams.set('page', page + 1);
			return response(window, [issue(page)], { Link: `<${parsed}>; rel="next"` }, { total_count: 1000 });
		});
		loadScript(window, 'githubHelper');
		await expect(window.githubFetchIssues('alice', 'test', '2026-10-01', '2026-10-12')).rejects.toThrow(
			'pagination could not be completed',
		);
		expect(window.fetch).toHaveBeenCalledTimes(10);
	});
});
