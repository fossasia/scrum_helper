if (typeof importScripts === 'function') {
	try {
		// Chrome MV3 service workers resolve relative to extension root
		importScripts('/scripts/browser-polyfill.min.js');
	} catch (e) {
		try {
			importScripts('browser-polyfill.min.js');
		} catch (e2) {
			console.error('Failed to import polyfill in background:', e2);
		}
	}
}

if (typeof browser === 'undefined') {
	globalThis.browser = globalThis.chrome;
}

const openByTabId = new Map();

browser.tabs?.onRemoved?.addListener((tabId) => {
	openByTabId.delete(tabId);
});

// Apply the display mode (popup vs sidePanel)
function applyDisplayMode(mode) {
	const hasSidebarSupport = Boolean(browser.sidebarAction?.toggle || browser.sidePanel?.open);

	// If sidePanel is requested but neither sidebar nor sidePanel API is available,
	// ensure the popup is pre-configured so clicks open the popup directly, and persist popup mode.
	if (mode === 'sidePanel' && !hasSidebarSupport) {
		browser.action.setPopup({ popup: 'popup.html' });
		browser.storage.local.set({ displayMode: 'popup' });
		return;
	}

	if (mode === 'popup') {
		browser.action.setPopup({ popup: 'popup.html' });
	} else {
		// sidePanel mode: clear popup so onClicked fires
		browser.action.setPopup({ popup: '' });
	}
}

// Initialize display mode on startup
browser.storage.local
	.get({
		displayMode:
			(typeof window !== 'undefined' && window.isTauri) || browser.sidebarAction?.toggle ? 'sidePanel' : 'popup',
	})
	.then((result) => {
		applyDisplayMode(result.displayMode);
	});

// Listen for changes to displayMode
browser.storage.onChanged.addListener((changes, area) => {
	if (area === 'local' && changes.displayMode) {
		applyDisplayMode(changes.displayMode.newValue);
	}
});

browser.action.onClicked.addListener((tab) => {
	try {
		// Firefox support: use sidebarAction if available
		if (browser.sidebarAction?.toggle) {
			browser.sidebarAction.toggle().catch((error) => {
				console.error('Failed to toggle sidebar (Firefox):', error);
			});
			return;
		}

		if (!browser.sidePanel?.open) {
			console.warn('Side panel API not available.');
			browser.action.setPopup({ popup: 'popup.html' });
			browser.storage.local.set({ displayMode: 'popup' });
			return;
		}

		const tabId = typeof tab?.id === 'number' ? tab.id : undefined;
		if (tabId == null) {
			console.warn('No tabId available; cannot toggle side panel.');
			return;
		}

		const isOpen = openByTabId.get(tabId) === true;

		if (isOpen) {
			if (typeof browser.sidePanel.close === 'function') {
				browser.sidePanel.close({ tabId }).catch((error) => {
					console.error('Failed to close side panel:', error);
				});
			} else if (typeof browser.sidePanel.setOptions === 'function') {
				browser.sidePanel.setOptions({ tabId, enabled: false }).catch((error) => {
					console.error('Failed to disable side panel:', error);
				});
			}
			openByTabId.set(tabId, false);
			return;
		}

		// Fire-and-forget
		if (typeof browser.sidePanel.setOptions === 'function') {
			browser.sidePanel
				.setOptions({ tabId, enabled: true, path: 'popup.html' })
				.catch((error) => console.error('Failed to enable side panel:', error));
		}

		browser.sidePanel
			.open({ tabId })
			.then(() => openByTabId.set(tabId, true))
			.catch((error) => {
				openByTabId.set(tabId, false);
				console.error('Failed to open side panel:', error);

				// For tab-specific or transient failures, configure popup on this tab so the next
				// action click opens it directly, while preserving the user's global displayMode.
				if (typeof tabId === 'number') {
					browser.action.setPopup({ tabId, popup: 'popup.html' });
				} else {
					browser.action.setPopup({ popup: 'popup.html' });
				}

				// Persist popup mode globally only if the error establishes that side panels are globally unavailable.
				const isGloballyUnavailable =
					error &&
					typeof error.message === 'string' &&
					/not supported|unavailable|not implemented/i.test(error.message);
				if (isGloballyUnavailable) {
					browser.action.setPopup({ popup: 'popup.html' });
					browser.storage.local.set({ displayMode: 'popup' });
				}
			});
	} catch (error) {
		console.error('Failed to toggle side panel:', error);
	}
});
