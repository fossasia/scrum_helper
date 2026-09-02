import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock DOM for popup.js
const popupHtml = fs.readFileSync(path.resolve(__dirname, '../src/popup.html'), 'utf8');

describe('Cache Status UI logic', () => {
	beforeEach(() => {
		document.documentElement.innerHTML = popupHtml;
		
		// Setup window properties expected by popup.js
		window.PlatformRegistry = { get: vi.fn() };
		window.updatePlatformUI = vi.fn();
		window.triggerNextPlansReload = vi.fn();
		window.scrumDateRangeUtils = { 
			normalizeDateRangeValues: vi.fn().mockReturnValue(true),
			persistDateRange: vi.fn()
		};
		global.lastPlatform = 'github';
		global.checkTokenForNextPlans = vi.fn();
		global.triggerNextPlansReload = vi.fn();
		global.sanitizeHtml = (str) => str;
		
		global.browser.i18n.getMessage = vi.fn((key) => {
			const msgs = {
				cacheJustNow: 'just now',
				cacheMinAgo: '$1 min ago',
				cacheHrsAgo: '$1 hr ago',
				cacheDaysAgo: '$1 day ago',
				noCache: 'No cache',
				noCacheTooltip: 'No cached report exists. Click Generate to fetch data.',
				cacheFresh: 'Fresh ($1)',
				cacheFreshTooltip: 'This report was generated $1. Cache refreshes automatically after $2 minutes.',
				cacheStale: 'Stale ($1)',
				cacheStaleTooltip: 'This report was generated $1. The cache TTL is $2 minutes, so the data may be outdated.'
			};
			return msgs[key] || key;
		});
		
		// Reset mocks
		vi.resetModules();
		vi.clearAllMocks();
		
		global.browser.storage.local.get.mockResolvedValue({
			platform: 'github',
			cacheInput: '10',
			githubCache: {
				data: { items: [] },
				timestamp: Date.now() - 2 * 60 * 1000 // 2 minutes ago
			}
		});
	});

	it('should format cache age correctly (minutes)', async () => {
		// Import script after setting up DOM
		await import('../src/scripts/popup.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		
		const timestamp = Date.now() - 3 * 60 * 1000; // 3 minutes ago
		global.browser.storage.local.get.mockResolvedValue({
			platform: 'github',
			cacheInput: '10',
			githubCache: {
				data: { items: [] },
				timestamp: timestamp
			}
		});

		// wait for DOMContentLoaded promises to settle
		await new Promise(r => setTimeout(r, 100));
		
		await window.updateCacheStatusUI();
		
		const badge = document.getElementById('cacheStatusBadge');
		expect(badge.innerHTML).toContain('Fresh (3 min ago)');
	});

	it('should mark cache as stale if age exceeds TTL', async () => {
		await import('../src/scripts/popup.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		
		const timestamp = Date.now() - 15 * 60 * 1000; // 15 minutes ago
		global.browser.storage.local.get.mockResolvedValue({
			platform: 'github',
			cacheInput: '10', // 10 minutes TTL
			githubCache: {
				data: { items: [] },
				timestamp: timestamp
			}
		});

		await new Promise(r => setTimeout(r, 100));
		await window.updateCacheStatusUI();
		
		const badge = document.getElementById('cacheStatusBadge');
		expect(badge.innerHTML).toContain('Stale (15 min ago)');
		
		const warning = document.getElementById('staleCacheWarning');
		expect(warning.classList.contains('hidden')).toBe(false);
	});

	it('should show "No cache" if there is no cache timestamp', async () => {
		await import('../src/scripts/popup.js');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		
		global.browser.storage.local.get.mockResolvedValue({
			platform: 'github',
			cacheInput: '10',
			githubCache: {
				data: null,
				timestamp: 0
			}
		});

		await new Promise(r => setTimeout(r, 100));
		await window.updateCacheStatusUI();
		
		const badge = document.getElementById('cacheStatusBadge');
		expect(badge.innerHTML).toContain('No cache');
		
		const warning = document.getElementById('staleCacheWarning');
		expect(warning.classList.contains('hidden')).toBe(true);
	});
});
