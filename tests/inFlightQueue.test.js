import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GitLabHelper from '../src/scripts/gitlabHelper.js';
import CodebergHelper from '../src/scripts/codebergHelper.js';

const OTHER_QUERY_DATA = 'DATA-FOR-THE-OTHER-QUERY';

const helpers = [
	[
		'GitLabHelper',
		() => new GitLabHelper('https://gitlab.com'),
		(helper) => helper.fetchGitLabData('alice', '2020-01-01', '2020-01-02'),
		'https://gitlab.com-alice-2020-01-01-2020-01-02-noauth-noorg-nocommits-norepos',
	],
	[
		'CodebergHelper',
		() => new CodebergHelper('https://codeberg.org/api/v1'),
		(helper) => helper.fetchCodebergData('alice', '2020-01-01', '2020-01-02'),
		'alice-2020-01-01-2020-01-02-noauth-nocommits',
	],
];

/**
 * Waits until `condition` holds, rather than for a fixed delay, so the tests
 * do not depend on how long storage and TTL lookups happen to take.
 */
async function until(condition, timeoutMs = 2000) {
	const start = Date.now();
	while (!condition()) {
		if (Date.now() - start > timeoutMs) {
			throw new Error('Timed out waiting for condition');
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}

/**
 * Puts the helper in the state it holds while a fetch for `key` is in flight.
 * `data` is left empty so the caller cannot be answered from cache instead.
 */
function withFetchInFlight(helper, key) {
	helper.cache.fetching = true;
	helper.cache.cacheKey = key;
	helper.cache.data = null;
	helper.cache.timestamp = Date.now();
}

/**
 * Settles every queued waiter the way a completed fetch would: the resolves
 * run first, then `fetching` is cleared synchronously, which is the order the
 * real fetch's try/finally produces.
 */
function completeInFlight(helper, value) {
	helper.cache.queue.splice(0).forEach(({ resolve }) => resolve(value));
	helper.cache.fetching = false;
}

describe.each(helpers)(
	'%s in-flight request queue',
	(_name, create, callFetch, expectedKey) => {
		let helper;

		beforeEach(() => {
			vi.spyOn(browser.storage.local, 'get').mockResolvedValue({});
			// Any request that actually reaches the network is a test failure
			// mode rather than a result, so make it fail fast.
			vi.stubGlobal(
				'fetch',
				vi.fn().mockRejectedValue(new Error('network disabled in test')),
			);
			helper = create();
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it('should share the result when the same query is already in flight', async () => {
			withFetchInFlight(helper, expectedKey);

			const pending = callFetch(helper);
			await until(() => helper.cache.queue.length === 1);

			completeInFlight(helper, 'RESULT');

			await expect(pending).resolves.toBe('RESULT');
			expect(fetch).not.toHaveBeenCalled();
		});

		it('should not hand a different query the in-flight result', async () => {
			withFetchInFlight(helper, 'SOME-OTHER-QUERY');

			const pending = callFetch(helper);
			await until(() => helper.cache.queue.length === 1);

			let outcome;
			const recorded = pending.then(
				(value) => {
					outcome = { resolved: value };
				},
				() => {
					outcome = { rejected: true };
				},
			);

			completeInFlight(helper, OTHER_QUERY_DATA);
			await recorded;

			expect(outcome).not.toEqual({ resolved: OTHER_QUERY_DATA });
		});

		it('should run its own request once the other query settles', async () => {
			withFetchInFlight(helper, 'SOME-OTHER-QUERY');

			const pending = callFetch(helper);
			await until(() => helper.cache.queue.length === 1);

			completeInFlight(helper, OTHER_QUERY_DATA);
			await pending.catch(() => {});

			// Having waited its turn, the caller issues the request it asked for
			// rather than reusing the other query's answer.
			expect(fetch).toHaveBeenCalled();
		});
	},
);

describe('CodebergHelper with a stale cache persisted in storage', () => {
	const inFlightKey = 'alice-2020-01-01-2020-01-02-noauth-nocommits';

	beforeEach(() => {
		vi.spyOn(browser.storage.local, 'get').mockImplementation(async (keys) => {
			const wanted = Array.isArray(keys) ? keys : [keys];
			if (wanted.includes('codebergCache')) {
				return {
					codebergCache: {
						data: { stale: true },
						cacheKey: 'STALE-PERSISTED-KEY',
						timestamp: 1,
					},
				};
			}
			return {};
		});
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in test')));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('should not reload storage over the key of a request in flight', async () => {
		const helper = new CodebergHelper('https://codeberg.org/api/v1');
		withFetchInFlight(helper, inFlightKey);

		const pending = callCodeberg(helper);
		await until(() => helper.cache.queue.length === 1);

		expect(helper.cache.cacheKey).toBe(inFlightKey);

		completeInFlight(helper, 'SHARED');
		await expect(pending).resolves.toBe('SHARED');
		expect(fetch).not.toHaveBeenCalled();
	});
});

function callCodeberg(helper) {
	return helper.fetchCodebergData('alice', '2020-01-01', '2020-01-02');
}
