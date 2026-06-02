if (typeof importScripts === 'function') {
	try {
		importScripts('browser-polyfill.min.js');
	} catch (e) {
		console.error('Failed to import polyfill in background:', e);
	}
}

globalThis.browser =
	globalThis.browser ||
	(() => {
		if (globalThis.chrome) {
			const promisify = (fn, context) => {
				if (typeof fn !== 'function') return fn;
				return (...args) => {
					return new Promise((resolve, reject) => {
						fn.call(context, ...args, (result) => {
							const err = globalThis.chrome.runtime?.lastError;
							if (err) reject(new Error(err.message));
							else resolve(result);
						});
					});
				};
			};

			const shim = {
				storage: {
					local: {
						get: promisify(chrome.storage?.local?.get, chrome.storage?.local),
						set: promisify(chrome.storage?.local?.set, chrome.storage?.local),
						remove: promisify(chrome.storage?.local?.remove, chrome.storage?.local),
					},
				},
				tabs: chrome.tabs,
				action: chrome.action
					? {
							...chrome.action,
							setPopup: promisify(chrome.action?.setPopup, chrome.action),
						}
					: undefined,
			};

			if (chrome.storage?.onChanged) {
				shim.storage.onChanged = chrome.storage.onChanged;
			}

			if (chrome.sidePanel) {
				shim.sidePanel = {
					...chrome.sidePanel,
					open: promisify(chrome.sidePanel.open, chrome.sidePanel),
					close: promisify(chrome.sidePanel.close, chrome.sidePanel),
					setOptions: promisify(chrome.sidePanel.setOptions, chrome.sidePanel),
				};
			}

			if (chrome.sidebarAction) {
				shim.sidebarAction = {
					...chrome.sidebarAction,
					toggle: promisify(chrome.sidebarAction.toggle, chrome.sidebarAction),
				};
			}

			return shim;
		}

		return {
			storage: {
				local: {
					get: () => Promise.resolve({}),
					set: () => Promise.resolve(),
					remove: () => Promise.resolve(),
				},
				onChanged: { addListener: () => {} },
			},
			tabs: { onRemoved: { addListener: () => {} } },
			action: {
				setPopup: () => Promise.resolve(),
				onClicked: { addListener: () => {} },
			},
		};
	})();

const openByTabId = new Map();

browser.tabs?.onRemoved?.addListener((tabId) => {
	openByTabId.delete(tabId);
});

// Apply the display mode (popup vs sidePanel)
function applyDisplayMode(mode) {
	if (mode === 'popup') {
		browser.action.setPopup({ popup: 'popup.html' });
	} else {
		// sidePanel mode: clear popup so onClicked fires
		browser.action.setPopup({ popup: '' });
	}
}

// Initialize display mode on startup
browser.storage.local.get({ displayMode: 'sidePanel' }).then((result) => {
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
			});
	} catch (error) {
		console.error('Failed to toggle side panel:', error);
	}
});
