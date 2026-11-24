import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiBaseUrl = 'https://gitlab.example.net/team/api/v4';
const apiUrl = `${apiBaseUrl}/user`;
const sender = { id: 'extension', tab: { id: 1 } };

describe('GitLab requests from an email content script', () => {
	let browser;
	let worker;
	let fetch;
	let accountKey;
	let settings;

	beforeEach(async () => {
		settings = { gitlabBaseUrl: apiBaseUrl, gitlabTokenInstance: apiBaseUrl, gitlabToken: 'fixture-token' };
		browser = {
			action: { setPopup: vi.fn(), onClicked: { addListener: vi.fn() } },
			i18n: { getMessage: (key) => key },
			permissions: { contains: vi.fn().mockResolvedValue(true) },
			runtime: { id: sender.id, onMessage: { addListener: vi.fn() } },
			storage: {
				local: { get: vi.fn(async () => settings) },
				onChanged: { addListener: vi.fn() },
			},
		};
		fetch = vi.fn(async () => new Response('{"username":"alice"}', { status: 200 }));
		worker = { browser, fetch, AbortSignal, URL, crypto: webcrypto, TextEncoder };
		for (const file of ['gitlabHelper.js', 'background.js']) {
			runInNewContext(readFileSync(resolve(`src/scripts/${file}`), 'utf8'), worker);
		}
		accountKey = await worker.getGitLabAccountKey(worker.resolveGitLabAccount(settings));
	});

	function dispatch(request) {
		const listener = browser.runtime.onMessage.addListener.mock.calls[0][0];
		return new Promise((resolve) => {
			expect(listener({ action: 'gitlabApi', apiBaseUrl, ...request }, sender, resolve)).toBe(true);
		});
	}

	it('uses the saved token, verifies host permission, and returns the API response', async () => {
		const result = await dispatch({ url: apiUrl, accountKey, headers: { 'PRIVATE-TOKEN': 'ignored' } });
		expect(browser.permissions.contains).toHaveBeenCalledWith({ origins: ['https://gitlab.example.net/*'] });
		expect(fetch).toHaveBeenCalledWith(
			apiUrl,
			expect.objectContaining({ headers: { 'PRIVATE-TOKEN': 'fixture-token' }, redirect: 'error', credentials: 'omit' }),
		);
		expect(result.status).toBe(200);
		expect(JSON.parse(result.body)).toEqual({ username: 'alice' });
	});

	it.each([
		['https://outside.example.net/user', 'outside'],
		['https://gitlab.example.net/team/unrelated', 'outside'],
	])('does not fetch %s outside the configured API base', async (url, message) => {
		expect((await dispatch({ url, accountKey })).error).toContain(message);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects requests after the stored token changes or permission is revoked', async () => {
		settings.gitlabToken = 'new-token';
		expect((await dispatch({ url: apiUrl, accountKey })).error).toContain('settings changed');
		settings.gitlabToken = 'fixture-token';
		browser.permissions.contains.mockResolvedValue(false);
		expect((await dispatch({ url: apiUrl, accountKey })).error).toBe('gitlabApiBasePermissionDenied');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('only accepts messages from an extension tab', () => {
		const listener = browser.runtime.onMessage.addListener.mock.calls[0][0];
		const reply = vi.fn();
		expect(listener({ action: 'gitlabApi', apiBaseUrl }, { id: 'other-extension', tab: { id: 1 } }, reply)).toBeUndefined();
		expect(listener({ action: 'gitlabApi', apiBaseUrl }, { id: sender.id }, reply)).toBeUndefined();
		expect(reply).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});
});
