/* global chrome, browser */

// Platform Registry to support dynamic pluggable platforms (GitHub, GitLab, ........)
window.PlatformRegistry = {
	platforms: {},
	register(id, helper) {
		this.platforms[id] = helper;
	},
	get(id) {
		return this.platforms[id] || null;
	},
};

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function formatLocalDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// Utility: Detect if the current OS is macOS
function isMacOS() {
	if (typeof navigator === 'undefined') {
		return false;
	}

	if (navigator.userAgentData && typeof navigator.userAgentData.platform === 'string') {
		return navigator.userAgentData.platform.toLowerCase().includes('mac');
	}

	const platform = navigator.platform || '';
	if (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(platform)) {
		return true;
	}

	return /Mac/.test(platform);
}

function showShortcutNotification(messageKey, variant = 'info') {
	if (typeof chrome === 'undefined' || !chrome.i18n) {
		return;
	}

	const message = chrome.i18n.getMessage(messageKey);
	if (!message) {
		return;
	}

	window.scrumHelperToast?.(message, { duration: 2200, variant });
}

function setupButtonTooltips() {
	const mac = isMacOS();

	const generateTooltipEl = document.getElementById('generateReportTooltipText');
	if (generateTooltipEl) {
		const text = chrome?.i18n.getMessage('generateReportTooltip') || 'Ctrl+G';
		generateTooltipEl.textContent = mac ? text.replace('Ctrl', 'Cmd') : text;
	}

	const copyTooltipEl = document.getElementById('copyReportTooltipText');
	if (copyTooltipEl) {
		const text = chrome?.i18n.getMessage('copyReportTooltip') || 'Ctrl+Shift+Y';
		copyTooltipEl.textContent = mac ? text.replace('Ctrl', 'Cmd') : text;
	}

	const insertEmailTooltipEl = document.getElementById('insertInEmailTooltipText');
	if (insertEmailTooltipEl) {
		const text = chrome?.i18n.getMessage('insertInEmailTooltip') || 'Ctrl+Shift+M';
		insertEmailTooltipEl.textContent = mac ? text.replace('Ctrl', 'Cmd') : text;
	}
}

function getToday() {
	const today = new Date();
	return formatLocalDate(today);
}

function getYesterday() {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return formatLocalDate(yesterday);
}

function getWeekAgo() {
	const today = new Date();
	const weekAgo = new Date(today);
	weekAgo.setDate(today.getDate() - 7);
	return formatLocalDate(weekAgo);
}

function applyI18n() {
	document.querySelectorAll('[data-i18n]').forEach((el) => {
		const key = el.getAttribute('data-i18n');
		const message = browser.i18n.getMessage(key);
		if (message) {
			// Use innerHTML to support simple formatting like <b> in tooltips
			if (el.classList.contains('tooltip-bubble') || el.classList.contains('cache-info')) {
				el.innerHTML = sanitizeHtml(message);
			} else {
				el.textContent = message;
			}
		}
	});

	document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
		const key = el.getAttribute('data-i18n-placeholder');
		const message = browser.i18n.getMessage(key);
		if (message) {
			el.placeholder = message;
		}
	});

	document.querySelectorAll('[data-i18n-title]').forEach((el) => {
		const key = el.getAttribute('data-i18n-title');
		const message = browser.i18n.getMessage(key);
		if (message) {
			el.title = message;
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	// Apply translations as soon as the DOM is ready
	applyI18n();
	setupButtonTooltips();

	// Dark mode setup
	const darkModeToggle = document.querySelector('img[alt="Night Mode"]');
	const settingsIcon = document.getElementById('settingsIcon');
	const body = document.body;
	const homeButton = document.getElementById('homeButton');
	const scrumHelperHeading = document.getElementById('scrumHelperHeading');
	const settingsToggle = document.getElementById('settingsToggle');
	const reportSection = document.getElementById('reportSection');
	const settingsSection = document.getElementById('settingsSection');

	let isSettingsVisible = false;
	const githubTokenInput = document.getElementById('githubToken');
	const toggleTokenBtn = document.getElementById('toggleTokenVisibility');
	const tokenEyeIcon = document.getElementById('tokenEyeIcon');
	const tokenPreview = document.getElementById('tokenPreview');
	let tokenVisible = false;

	// GitLab token elements
	const gitlabTokenInput = document.getElementById('gitlabToken');
	const toggleGitlabTokenBtn = document.getElementById('toggleGitlabTokenVisibility');
	const gitlabTokenEyeIcon = document.getElementById('gitlabTokenEyeIcon');
	let gitlabTokenVisible = false;

	const orgInput = document.getElementById('orgInput');

	const platformSelect = document.getElementById('platformSelect');
	const usernameLabel = document.getElementById('usernameLabel');
	const platformUsername = document.getElementById('platformUsername');

	function getActivePlatformHelper() {
		const platform = platformSelect?.value || 'github';
		return window.PlatformRegistry.get(platform);
	}

	function checkTokenForFilter() {
		const helper = getActivePlatformHelper();
		if (helper && helper.checkTokenForFilter) {
			helper.checkTokenForFilter();
		}
	}

	function checkTokenForShowCommits(options) {
		const helper = getActivePlatformHelper();
		if (helper && helper.checkTokenForShowCommits) {
			helper.checkTokenForShowCommits(options);
		}
	}

	function checkTokenForMergedPRs(options) {
		const helper = getActivePlatformHelper();
		if (helper && helper.checkTokenForMergedPRs) {
			helper.checkTokenForMergedPRs(options);
		}
	}

	browser.storage.local.get(['darkMode']).then((result) => {
		if (result.darkMode) {
			body.classList.add('dark-mode');
			darkModeToggle.src = 'icons/light-mode.png';
			if (settingsIcon) {
				settingsIcon.src = 'icons/settings-night.png';
			}
		}
	});

	toggleTokenBtn.addEventListener('click', () => {
		tokenVisible = !tokenVisible;
		githubTokenInput.type = tokenVisible ? 'text' : 'password';

		tokenEyeIcon.classList.add('eye-animating');
		setTimeout(() => tokenEyeIcon.classList.remove('eye-animating'), 400);
		tokenEyeIcon.className = tokenVisible ? 'fa fa-eye-slash text-gray-600' : 'fa fa-eye text-gray-600';

		githubTokenInput.classList.add('token-animating');
		setTimeout(() => githubTokenInput.classList.remove('token-animating'), 300);
	});

	// GitLab token visibility toggle
	if (toggleGitlabTokenBtn && gitlabTokenInput) {
		toggleGitlabTokenBtn.addEventListener('click', () => {
			gitlabTokenVisible = !gitlabTokenVisible;
			gitlabTokenInput.type = gitlabTokenVisible ? 'text' : 'password';

			gitlabTokenEyeIcon.classList.add('eye-animating');
			setTimeout(() => gitlabTokenEyeIcon.classList.remove('eye-animating'), 400);
			gitlabTokenEyeIcon.className = gitlabTokenVisible ? 'fa fa-eye-slash text-gray-600' : 'fa fa-eye text-gray-600';

			gitlabTokenInput.classList.add('token-animating');
			setTimeout(() => gitlabTokenInput.classList.remove('token-animating'), 300);
		});
	}

	githubTokenInput.addEventListener('input', () => checkTokenForFilter());
	githubTokenInput.addEventListener('input', () => checkTokenForShowCommits({ persistState: false }));
	githubTokenInput.addEventListener('input', () => checkTokenForMergedPRs({ persistState: false }));

	darkModeToggle.addEventListener('click', function () {
		body.classList.toggle('dark-mode');
		const isDarkMode = body.classList.contains('dark-mode');
		browser.storage.local.set({ darkMode: isDarkMode });
		this.src = isDarkMode ? 'icons/light-mode.png' : 'icons/night-mode.png';
		const settingsIcon = document.getElementById('settingsIcon');
		if (settingsIcon) {
			settingsIcon.src = isDarkMode ? 'icons/settings-night.png' : 'icons/settings-light.png';
		}
		renderTokenPreview();
	});

	function renderTokenPreview() {
		if (!tokenPreview || !githubTokenInput) return;
		tokenPreview.innerHTML = '';
		const value = githubTokenInput.value;
		const isDark = document.body.classList.contains('dark-mode');
		for (let i = 0; i < value.length; i++) {
			const charBox = document.createElement('span');
			charBox.className = 'token-preview-char' + (isDark ? ' dark-mode' : '');
			if (tokenVisible) {
				charBox.textContent = value[i];
			} else {
				const dot = document.createElement('span');
				dot.className = 'token-preview-dot' + (isDark ? ' dark-mode' : '');
				charBox.appendChild(dot);
			}
			tokenPreview.appendChild(charBox);
			setTimeout(() => charBox.classList.add('flip'), 10 + i * 30);
		}
	}

	browser.storage.local.remove(['enableToggle']).then(() => {
		initializePopup();
		checkTokenForFilter();
		checkTokenForShowCommits();
	});

	browser.storage.onChanged.addListener((changes, namespace) => {
		console.log(
			'[DEBUG] Storage changed:',
			typeof logRedaction === 'function' ? logRedaction(changes) : changes,
			namespace,
		);
		if (changes.startingDate || changes.endingDate) {
			console.log('[POPUP-DEBUG] Date changed in storage, triggering repo fetch.', {
				startingDate: changes.startingDate?.newValue,
				endingDate: changes.endingDate?.newValue,
			});
			if (window.triggerRepoFetchIfEnabled) {
				window.triggerRepoFetchIfEnabled();
			}
		}
	});

	function storageLocalGet(keys) {
		return browser.storage.local.get(keys).catch((err) => {
			console.error('Storage access failed:', err);
			return {};
		});
	}

	function parsePositiveInt(value) {
		const n = Number.parseInt(value, 10);
		return Number.isFinite(n) && n > 0 ? n : null;
	}

	function setGenerateButtonLoading(generateBtn, isLoading) {
		if (!generateBtn) return;
		if (!isLoading) return;

		const msg = browser.i18n.getMessage('generatingButton') || 'Generating...';
		generateBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${msg}`;
		generateBtn.disabled = true;
	}

	function updateGenerateButtonState() {
		const generateBtn = document.getElementById('generateReport');
		const platformUsername = document.getElementById('platformUsername');
		if (!generateBtn || !platformUsername) {
			return;
		}

		const applyGenerateButtonState = () => {
			const hasUsername = Boolean(platformUsername.value.trim());
			const shouldDisable = !hasUsername;

			if (generateBtn.disabled !== shouldDisable) {
				generateBtn.disabled = shouldDisable;
			}
		};

		if (!platformUsername.dataset.generateButtonStateBound) {
			platformUsername.addEventListener('input', applyGenerateButtonState);
			platformUsername.addEventListener('change', applyGenerateButtonState);
			platformUsername.dataset.generateButtonStateBound = 'true';
		}

		if (!generateBtn.dataset.generateButtonStateObserved && typeof MutationObserver !== 'undefined') {
			const observer = new MutationObserver(() => {
				const shouldDisable = !platformUsername.value.trim();
				if (shouldDisable && generateBtn.disabled === false) {
					generateBtn.disabled = true;
				}
			});

			observer.observe(generateBtn, {
				attributes: true,
				attributeFilter: ['disabled'],
			});

			generateBtn.dataset.generateButtonStateObserved = 'true';
		}

		applyGenerateButtonState();
	}

	window.updateGenerateButtonState = updateGenerateButtonState;
	window.updateCopyButtonState = updateCopyButtonState;

	function updateCopyButtonState() {
		const copyBtn = document.getElementById('copyReport');
		const scrumReport = document.getElementById('scrumReport');
		if (!copyBtn || !scrumReport) {
			return;
		}

		const textContent = scrumReport.textContent;
		const cacheClearedText =
			(typeof browser !== 'undefined' && browser.i18n ? browser.i18n.getMessage('cacheClearedMessage') : null) ||
			(typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getMessage('cacheClearedMessage') : null) ||
			'Cache cleared successfully. Click "Generate" to fetch fresh data.';

		if (textContent === cacheClearedText) {
			scrumReport.dataset.copyPlaceholder = 'true';
		}

		copyBtn.disabled = scrumReport.dataset.copyPlaceholder === 'true' || !scrumReport.textContent.trim();
	}

	async function bootstrapScrumReportOnPopupLoad(generateBtn) {
		console.log('[BOOTSTRAP] bootstrapScrumReportOnPopupLoad called');

		if (typeof window.generateScrumReport !== 'function') {
			return;
		}

		const scrumReport = document.getElementById('scrumReport');
		if (!scrumReport) {
			return;
		}

		const { platform, cacheInput, githubCache, gitlabCache } = await storageLocalGet([
			'platform',
			'cacheInput',
			'githubCache',
			'gitlabCache',
		]);

		const ttlMinutes = parsePositiveInt(cacheInput) ?? 10;
		const ttlMs = ttlMinutes * 60 * 1000;

		const activePlatform = platform || 'github';
		const cache = activePlatform === 'gitlab' ? gitlabCache : githubCache;

		const hasCacheData = !!cache?.data;
		const timestamp = typeof cache?.timestamp === 'number' ? cache.timestamp : 0;

		if (!hasCacheData) {
			setGenerateButtonLoading(generateBtn, true);
			window.generateScrumReport();
			return;
		}

		if (timestamp > 0) {
			const age = Date.now() - timestamp;

			const storageValues = await storageLocalGet([
				`${activePlatform}LastScrumReportHtml`,
				`${activePlatform}LastScrumReportCacheKey`,
				`${activePlatform}LastScrumReportUsername`,
				'lastScrumReportHtml',
				'lastScrumReportPlatform',
				'lastScrumReportCacheKey',
				'lastScrumReportUsername',
				'githubUsername',
				'gitlabUsername',
				'platformUsername',
			]);

			let lastScrumReportHtml = storageValues[`${activePlatform}LastScrumReportHtml`];
			let lastScrumReportCacheKey = storageValues[`${activePlatform}LastScrumReportCacheKey`];
			let lastScrumReportUsername = storageValues[`${activePlatform}LastScrumReportUsername`];

			if (
				storageValues.lastScrumReportHtml &&
				(!storageValues.lastScrumReportPlatform || storageValues.lastScrumReportPlatform === activePlatform) &&
				!lastScrumReportHtml
			) {
				lastScrumReportHtml = storageValues.lastScrumReportHtml;
				lastScrumReportCacheKey = storageValues.lastScrumReportCacheKey;
				lastScrumReportUsername = storageValues.lastScrumReportUsername;
			}

			const expectedUsername =
				activePlatform === 'gitlab'
					? storageValues.gitlabUsername || storageValues.platformUsername
					: storageValues.githubUsername || storageValues.platformUsername;

			const isUsernameMatch = lastScrumReportUsername
				? lastScrumReportUsername === expectedUsername
				: lastScrumReportCacheKey && expectedUsername && lastScrumReportCacheKey.startsWith(expectedUsername + '-');

			if (age < ttlMs) {
				const cacheKey = cache?.cacheKey ?? null;
				const reportEmpty = !scrumReport.innerHTML || !scrumReport.innerHTML.trim();

				const matches = (!lastScrumReportCacheKey || lastScrumReportCacheKey === cacheKey) && isUsernameMatch;

				if (reportEmpty && lastScrumReportHtml && matches) {
					scrumReport.innerHTML = sanitizeHtml(lastScrumReportHtml);
					delete scrumReport.dataset.copyPlaceholder;
					updateCopyButtonState();
					if (generateBtn) generateBtn.disabled = false;
					return;
				}

				if (generateBtn) setGenerateButtonLoading(generateBtn, true);
				if (typeof window.generateScrumReport === 'function') window.generateScrumReport();
				return;
			}

			// If cache is expired, still only show the old HTML if it was for the current username
			if ((!scrumReport.innerHTML || !scrumReport.innerHTML.trim()) && lastScrumReportHtml && isUsernameMatch) {
				scrumReport.innerHTML = sanitizeHtml(lastScrumReportHtml);
				delete scrumReport.dataset.copyPlaceholder;
				updateCopyButtonState();
			}

			if (generateBtn) setGenerateButtonLoading(generateBtn, true);
			if (typeof window.generateScrumReport === 'function') window.generateScrumReport();
			return;
		}

		if (generateBtn) setGenerateButtonLoading(generateBtn, true);
		if (typeof window.generateScrumReport === 'function') window.generateScrumReport();
	}

	function initializePopup() {
		browser.storage.local.get(['platform', 'platformUsername']).then((result) => {
			if (result.platformUsername && result.platform) {
				const platformUsernameKey = `${result.platform}Username`;
				browser.storage.local.set({ [platformUsernameKey]: result.platformUsername });
				browser.storage.local.remove(['platformUsername']);
				console.log(`[MIGRATION] Migrated platformUsername to ${platformUsernameKey}`);
			}
		});

		// Restore all persistent fields immediately on DOMContentLoaded
		const projectNameInput = document.getElementById('projectName');
		const orgInput = document.getElementById('orgInput');
		const userReasonInput = document.getElementById('userReason');
		const showOpenLabelCheckbox = document.getElementById('showOpenLabel');
		const showCommitsCheckbox = document.getElementById('showCommits');
		const onlyIssuesCheckbox = document.getElementById('onlyIssues');
		const onlyPRsCheckbox = document.getElementById('onlyPRs');
		const onlyRevPRsCheckbox = document.getElementById('onlyRevPRs');
		const onlyMergedPRsCheckbox = document.getElementById('onlyMergedPRs');

		const githubTokenInput = document.getElementById('githubToken');
		const cacheInput = document.getElementById('cacheInput');
		const yesterdayRadio = document.getElementById('yesterdayContribution');
		const weeklyRadio = document.getElementById('weeklyContribution');
		const startingDateInput = document.getElementById('startingDate');
		const endingDateInput = document.getElementById('endingDate');
		const platformUsername = document.getElementById('platformUsername');
		const usernameError = document.getElementById('usernameError');

		browser.storage.local
			.get([
				'projectName',
				'orgName',
				'userReason',
				'showOpenLabel',
				'showCommits',
				'githubToken',
				'cacheInput',
				'onlyIssues',
				'onlyPRs',
				'onlyRevPRs',
				'onlyMergedPRs',
				'yesterdayContribution',
				'weeklyContribution',
				'startingDate',
				'endingDate',
				'selectedTimeframe',
				'platform',
				'githubUsername',
				'gitlabUsername',
			])
			.then((result) => {
				if (result.projectName) projectNameInput.value = result.projectName;
				if (result.orgName) orgInput.value = result.orgName;
				if (result.userReason) userReasonInput.value = result.userReason;
				if (typeof result.showOpenLabel !== 'undefined') {
					showOpenLabelCheckbox.checked = result.showOpenLabel;
				} else {
					showOpenLabelCheckbox.checked = true; // Default to true for new users
				}
				if (typeof result.showCommits !== 'undefined') showCommitsCheckbox.checked = result.showCommits;
				if (typeof result.onlyIssues !== 'undefined') {
					onlyIssuesCheckbox.checked = result.onlyIssues;
				}
				if (typeof result.onlyPRs !== 'undefined') {
					onlyPRsCheckbox.checked = result.onlyPRs;
				}
				if (typeof result.onlyRevPRs !== 'undefined') {
					onlyRevPRsCheckbox.checked = result.onlyRevPRs;
				}
				if (typeof result.onlyMergedPRs !== 'undefined') {
					onlyMergedPRsCheckbox.checked = result.onlyMergedPRs;
				}

				// Reconcile mutually exclusive "Only Issues" and "Only PRs" flags on initialization.
				// If both are somehow true in storage (e.g., from an older version or manual edits),
				// prefer "Only Issues" and clear "Only PRs", then persist the corrected state.
				if (onlyIssuesCheckbox.checked && onlyPRsCheckbox.checked) {
					onlyPRsCheckbox.checked = false;
					browser?.storage.local.set({ onlyPRs: false });
				}
				if (onlyMergedPRsCheckbox.checked && onlyRevPRsCheckbox.checked) {
					onlyRevPRsCheckbox.checked = false;
					browser?.storage.local.set({ onlyRevPRs: false });
				}
				// onlyMergedPRs overrides onlyIssues and onlyPRs
				if (onlyMergedPRsCheckbox.checked && onlyIssuesCheckbox.checked) {
					onlyIssuesCheckbox.checked = false;
					browser?.storage.local.set({ onlyIssues: false });
				}
				if (onlyMergedPRsCheckbox.checked && onlyPRsCheckbox.checked) {
					onlyPRsCheckbox.checked = false;
					browser?.storage.local.set({ onlyPRs: false });
				}
				if (result.githubToken) githubTokenInput.value = result.githubToken;
				if (result.cacheInput) cacheInput.value = result.cacheInput;
				if (typeof result.yesterdayContribution !== 'undefined') yesterdayRadio.checked = result.yesterdayContribution;
				if (typeof result.weeklyContribution !== 'undefined') weeklyRadio.checked = result.weeklyContribution;
				if (result.startingDate) startingDateInput.value = result.startingDate;
				if (result.endingDate) endingDateInput.value = result.endingDate;
				const wasNormalizedOnLoad = window.scrumDateRangeUtils.normalizeDateRangeValues(
					startingDateInput,
					endingDateInput,
				);
				if (wasNormalizedOnLoad) {
					window.scrumDateRangeUtils.persistDateRange(startingDateInput, endingDateInput);
				}

				// Load platform-specific username
				const platform = result.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				platformUsername.value = result[platformUsernameKey] || '';
				window.updateGenerateButtonState && window.updateGenerateButtonState();
				checkTokenForShowCommits();
				checkTokenForMergedPRs();
			});

		function dismissShortcutTooltipFocus(el) {
			el?.blur?.();
		}

		// Button setup
		const generateBtn = document.getElementById('generateReport');
		const copyBtn = document.getElementById('copyReport');
		const insertBtn = document.getElementById('insertInEmail');

		updateCopyButtonState();

		const scrumReportEl = document.getElementById('scrumReport');
		if (scrumReportEl) {
			scrumReportEl.addEventListener('input', () => {
				if (scrumReportEl.dataset.copyPlaceholder === 'true') {
					delete scrumReportEl.dataset.copyPlaceholder;
				}
				updateCopyButtonState();
			});
		}

		if (insertBtn) {
			insertBtn.addEventListener('click', () => {
				if (!insertBtn._triggeredByShortcut) {
					showPopupMessage(browser.i18n.getMessage('insertingInEmailNotification'));
				}
				const scrumReport = document.getElementById('scrumReport');
				const content = scrumReport ? sanitizeHtml(scrumReport.innerHTML) : '';
				const subject = buildScrumSubjectFromPopup();

				if (!content) {
					insertBtn._triggeredByShortcut = false;
					dismissShortcutTooltipFocus(insertBtn);
					return;
				}

				// Helper to handle insert-to-email failures consistently
				const handleInsertFailure = (errorMsg) => {
					console.warn('Insert to Email failed:', errorMsg);
					const failureMessage =
						browser.i18n.getMessage('insertToEmailFailedError') || 'open an email tab to insert report';
					showPopupMessage(failureMessage, { variant: 'error' });
				};

				browser.tabs
					.query({ active: true, currentWindow: true })
					.then((tabs) => {
						const tabId = tabs?.[0]?.id;
						if (!tabId) {
							handleInsertFailure('No active tab found');
							return;
						}

						browser.tabs
							.sendMessage(tabId, { action: 'insertReportToEmail', content, subject })
							.then((response) => {
								if (!response?.success) {
									handleInsertFailure(response?.error);
								} else {
									if (insertBtn._triggeredByShortcut) {
										showShortcutNotification('insertedInEmailNotification');
									} else {
										showPopupMessage(browser.i18n.getMessage('insertedInEmailNotification'), { variant: 'success' });
									}
								}
							})
							.catch((error) => {
								handleInsertFailure(error.message);
							});
					})
					.catch((error) => {
						handleInsertFailure('Failed to query tabs: ' + error.message);
					})
					.finally(() => {
						insertBtn._triggeredByShortcut = false;
						dismissShortcutTooltipFocus(insertBtn);
					});
			});
		}

		generateBtn.addEventListener('click', () => {
			if (!generateBtn._triggeredByShortcut) {
				showPopupMessage(browser.i18n.getMessage('generatingReportNotification'));
			}
			browser.storage.local
				.get(['platform'])
				.then((result) => {
					platformUsername.classList.remove('input-error');
					usernameError.classList.remove('errorMessage');
					usernameError.textContent = '';
					const platform = result.platform || 'github';
					const platformUsernameKey = `${platform}Username`;

					return browser.storage.local
						.set({
							platform: platformSelect.value,
							[platformUsernameKey]: platformUsername.value,
						})
						.then(() => {
							// Reload platform from storage before generating report
							return browser.storage.local.get(['platform']).then((res) => {
								platformSelect.value = res.platform || 'github';
								updatePlatformUI(platformSelect.value);
								generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
								generateBtn.disabled = true;
								window.generateScrumReport && window.generateScrumReport();
								generateBtn._triggeredByShortcut = false;
							});
						});
				})
				.finally(() => {
					if (generateBtn._triggeredByShortcut) {
						dismissShortcutTooltipFocus(generateBtn);
						generateBtn._triggeredByShortcut = false;
					}
				});
		});

		copyBtn.addEventListener('click', function () {
			if (!this._triggeredByShortcut) {
				showPopupMessage(browser.i18n.getMessage('copyingReportNotification'));
			}
			const scrumReport = document.getElementById('scrumReport');
			if (!scrumReport) {
				this._triggeredByShortcut = false;
				return;
			}
			if (scrumReport.dataset.copyPlaceholder === 'true') {
				this._triggeredByShortcut = false;
				return;
			}
			const reportHtml = sanitizeHtml(scrumReport.innerHTML);
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = reportHtml;
			if (!(tempDiv.textContent || '').trim()) {
				this._triggeredByShortcut = false;
				return;
			}

			const darkMode = document.body.classList.contains('dark-mode');

			//remove background styles
			tempDiv.querySelectorAll('*').forEach((el) => {
				const text = el.textContent?.trim().toLowerCase();

				const isStatusBadge = el.classList.contains('State') || el.classList.contains('state');
				if (isStatusBadge || text === 'open' || text === 'closed' || text === 'merged' || text === 'draft') {
					return;
				}

				el.style.backgroundColor = 'transparent';
				el.style.background = 'transparent';
				el.style.backgroundImage = 'none';

				const inlineColor = (el.style.color || '').replace(/\s+/g, '').toLowerCase();
				const isCommitHeadline =
					el.classList.contains('commitMessageHeadline') ||
					inlineColor === '#2563eb' ||
					inlineColor === 'rgb(37,99,235)';
				const isLink = el.tagName === 'A';

				// Change color only if it is darkmode and not a commit headline and not a PR link
				if (darkMode && !isCommitHeadline && !isLink) {
					el.style.color = '#000';
				}
			});
			document.body.appendChild(tempDiv);
			tempDiv.style.position = 'absolute';
			tempDiv.style.left = '-9999px';

			const range = document.createRange();
			range.selectNode(tempDiv);
			const selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange(range);

			try {
				document.execCommand('copy');
				if (this._triggeredByShortcut) {
					const notificationKey =
						browser?.i18n && browser.i18n.getMessage('copiedReportNotification')
							? 'copiedReportNotification'
							: 'copiedButton';
					showShortcutNotification(notificationKey, 'success');
				} else {
					showPopupMessage(browser.i18n.getMessage('copiedReportNotification'), { variant: 'success' });
				}
				this.innerHTML = `<i class="fa fa-check"></i> ${browser?.i18n.getMessage('copiedButton')}`;
				setTimeout(() => {
					this.innerHTML = `<i class="fa fa-copy"></i> ${browser.i18n.getMessage('copyReportButton')}`;
				}, 2000);
			} catch (err) {
				console.error('Failed to copy: ', err);
			} finally {
				this._triggeredByShortcut = false;
				dismissShortcutTooltipFocus(this);
				selection.removeAllRanges();
				document.body.removeChild(tempDiv);
			}
		});

		// Custom date container click handler
		document.getElementById('customDateContainer').addEventListener('click', () => {
			document.querySelectorAll('input[name="timeframe"]').forEach((radio) => {
				radio.checked = false;
				radio.dataset.wasChecked = 'false';
			});

			const startDateInput = document.getElementById('startingDate');
			const endDateInput = document.getElementById('endingDate');
			startDateInput.readOnly = false;
			endDateInput.readOnly = false;

			browser.storage.local.set({
				yesterdayContribution: false,
				weeklyContribution: false,
				selectedTimeframe: null,
			});
		});

		browser.storage.local
			.get(['selectedTimeframe', 'yesterdayContribution', 'weeklyContribution', 'startingDate', 'endingDate'])
			.then((items) => {
				console.log('Restoring state:', typeof logRedaction === 'function' ? logRedaction(items) : items);

				if (items.startingDate && items.endingDate && !items.yesterdayContribution && !items.weeklyContribution) {
					const startDateInput = document.getElementById('startingDate');
					const endDateInput = document.getElementById('endingDate');

					if (startDateInput && endDateInput) {
						startDateInput.value = items.startingDate;
						endDateInput.value = items.endingDate;
						startDateInput.readOnly = false;
						endDateInput.readOnly = false;
					}
					document.querySelectorAll('input[name="timeframe"]').forEach((radio) => {
						radio.checked = false;
						radio.dataset.wasChecked = 'false';
					});
					return;
				}

				if (!items.selectedTimeframe) {
					items.selectedTimeframe = 'yesterdayContribution';
					items.yesterdayContribution = true;
				}

				const radio = document.getElementById(items.selectedTimeframe);
				if (radio) {
					radio.checked = true;
					radio.dataset.wasChecked = 'true';

					const startDateInput = document.getElementById('startingDate');
					const endDateInput = document.getElementById('endingDate');

					if (items.selectedTimeframe === 'yesterdayContribution') {
						startDateInput.value = getYesterday();
						endDateInput.value = getToday();
					} else if (items.selectedTimeframe === 'weeklyContribution') {
						startDateInput.value = getWeekAgo();
						endDateInput.value = getToday();
					}
					startDateInput.readOnly = endDateInput.readOnly = true;

					browser.storage.local.set({
						startingDate: startDateInput.value,
						endingDate: endDateInput.value,
						yesterdayContribution: items.selectedTimeframe === 'yesterdayContribution',
						weeklyContribution: items.selectedTimeframe === 'weeklyContribution',
						selectedTimeframe: items.selectedTimeframe,
					});
				}
			});

		// Save all fields to storage on input/change
		if (projectNameInput) {
			projectNameInput.addEventListener('input', () => {
				browser.storage.local.set({ projectName: projectNameInput.value });
			});
		}

		// Save to storage and validate ONLY when user clicks out (blur event)
		if (orgInput) {
			orgInput.addEventListener('blur', () => {
				const org = orgInput.value.trim().toLowerCase();
				browser.storage.local.set({ orgName: org });

				// Only validate if org name is not empty
				if (org) {
					validateOrgOnBlur(org);
				} else {
					window.clearScrumHelperToast?.();
				}
			});
		}
		if (userReasonInput) {
			userReasonInput.addEventListener('input', () => {
				browser.storage.local.set({ userReason: userReasonInput.value });
			});
		}
		if (showOpenLabelCheckbox) {
			showOpenLabelCheckbox.addEventListener('change', () => {
				browser.storage.local.set({ showOpenLabel: showOpenLabelCheckbox.checked });
			});
		}
		if (onlyIssuesCheckbox && onlyPRsCheckbox) {
			onlyIssuesCheckbox.addEventListener('change', () => {
				const checked = onlyIssuesCheckbox.checked;
				browser?.storage.local.set({ onlyIssues: checked }, () => {
					if (checked) {
						if (onlyPRsCheckbox.checked) {
							onlyPRsCheckbox.checked = false;
							browser?.storage.local.set({ onlyPRs: false });
						}
						if (onlyMergedPRsCheckbox && onlyMergedPRsCheckbox.checked) {
							onlyMergedPRsCheckbox.checked = false;
							browser?.storage.local.set({ onlyMergedPRs: false });
						}
					}
				});
			});

			onlyPRsCheckbox.addEventListener('change', () => {
				const checked = onlyPRsCheckbox.checked;
				browser?.storage.local.set({ onlyPRs: checked }, () => {
					if (checked) {
						if (onlyIssuesCheckbox.checked) {
							onlyIssuesCheckbox.checked = false;
							browser?.storage.local.set({ onlyIssues: false });
						}
						if (onlyMergedPRsCheckbox && onlyMergedPRsCheckbox.checked) {
							onlyMergedPRsCheckbox.checked = false;
							browser?.storage.local.set({ onlyMergedPRs: false });
						}
					}
				});
			});

			if (onlyRevPRsCheckbox) {
				onlyRevPRsCheckbox.addEventListener('change', () => {
					const checked = onlyRevPRsCheckbox.checked;
					browser?.storage.local.set({ onlyRevPRs: checked }, () => {
						if (checked && onlyMergedPRsCheckbox && onlyMergedPRsCheckbox.checked) {
							onlyMergedPRsCheckbox.checked = false;
							browser?.storage.local.set({ onlyMergedPRs: false });
						}
					});
				});
			}
			if (onlyMergedPRsCheckbox) {
				onlyMergedPRsCheckbox.addEventListener('change', () => {
					if (onlyMergedPRsCheckbox.checked) {
						if (onlyRevPRsCheckbox && onlyRevPRsCheckbox.checked) {
							onlyRevPRsCheckbox.checked = false;
							browser?.storage.local.set({ onlyRevPRs: false });
						}
						if (onlyIssuesCheckbox && onlyIssuesCheckbox.checked) {
							onlyIssuesCheckbox.checked = false;
							browser?.storage.local.set({ onlyIssues: false });
						}
						if (onlyPRsCheckbox && onlyPRsCheckbox.checked) {
							onlyPRsCheckbox.checked = false;
							browser?.storage.local.set({ onlyPRs: false });
						}
					}
					checkTokenForMergedPRs({
						showWarning: true,
						animateWarning: true,
						warningDurationMs: 3000,
						persistState: true,
					});
				});
			}
		}
		if (showCommitsCheckbox) {
			showCommitsCheckbox.addEventListener('change', () => {
				checkTokenForShowCommits({
					showWarning: true,
					animateWarning: true,
					warningDurationMs: 3000,
					persistState: true,
				});
			});
		}
		if (githubTokenInput) {
			githubTokenInput.addEventListener('input', () => {
				const trimmed = githubTokenInput.value.trim();
				browser.storage.local.get(['githubToken']).then((items) => {
					const currentStored = items.githubToken || '';
					if (trimmed !== currentStored) {
						browser.storage.local.set({ githubToken: trimmed });
					}
				});
			});
			githubTokenInput.addEventListener('change', () => {
				const trimmed = githubTokenInput.value.trim();
				githubTokenInput.value = trimmed;
				browser.storage.local.get(['githubToken']).then((items) => {
					const currentStored = items.githubToken || '';
					if (trimmed !== currentStored) {
						browser.storage.local.set({ githubToken: trimmed }).then(() => {
							triggerRepoFetchIfEnabled();
						});
					}
				});
			});
			githubTokenInput.addEventListener('blur', () => {
				githubTokenInput.value = githubTokenInput.value.trim();
			});
		}
		if (cacheInput) {
			cacheInput.addEventListener('input', () => {
				browser.storage.local.set({ cacheInput: cacheInput.value });
			});
		}

		// Display mode (popup / sidepanel)
		// Apply the stored display mode class on next launch
		function applyDisplayModeClass(mode) {
			// If opened via Firefox sidebar_action, force sidepanel mode
			if (window.location.search.includes('view=sidebar')) {
				mode = 'sidepanel';
				document.documentElement.classList.add('firefox-sidebar');
				document.body.classList.add('firefox-sidebar');
			}

			const className = mode === 'popup' ? 'mode-popup' : 'mode-sidepanel';
			if (!document.documentElement.classList.contains(className)) {
				document.documentElement.classList.remove('mode-popup', 'mode-sidepanel');
				body.classList.remove('mode-popup', 'mode-sidepanel');
				document.documentElement.classList.add(className);
				body.classList.add(className);
			}
		}

		browser.storage.local.get({ displayMode: 'sidePanel' }).then((result) => {
			applyDisplayModeClass(result.displayMode);
		});

		const displayModeSelect = document.getElementById('displayModeSelect');
		const displayModeNotice = document.getElementById('displayModeNotice');
		const displayModeNoticeText = document.getElementById('displayModeNoticeText');
		if (displayModeSelect) {
			browser.storage.local.get({ displayMode: 'sidePanel' }).then((result) => {
				displayModeSelect.value = result.displayMode;
			});
			displayModeSelect.addEventListener('change', () => {
				const mode = displayModeSelect.value;
				browser.storage.local.set({ displayMode: mode });
				// Show notice instead of applying immediately
				const modeLabel = mode === 'popup' ? 'Popup' : 'Side Panel';
				if (displayModeNotice && displayModeNoticeText) {
					displayModeNoticeText.textContent =
						chrome?.i18n.getMessage('displayModeNotice', [modeLabel]) ||
						`The extension will open in ${modeLabel} mode on the next launch.`;
					displayModeNotice.classList.remove('hidden');
				}
			});
		}

		yesterdayRadio.addEventListener('change', () => {
			browser.storage.local.set({ yesterdayContribution: yesterdayRadio.checked });
		});
		weeklyRadio.addEventListener('change', () => {
			browser.storage.local.set({ weeklyContribution: weeklyRadio.checked });
		});
		startingDateInput.addEventListener('blur', () => {
			window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateInput, endingDateInput);
		});
		endingDateInput.addEventListener('blur', () => {
			window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateInput, endingDateInput);
		});

		// Save username to storage on input and update button state
		platformUsername.addEventListener('input', () => {
			browser.storage.local.get(['platform']).then((result) => {
				const platform = result.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				browser.storage.local.set({ [platformUsernameKey]: platformUsername.value });
			});
			window.updateGenerateButtonState && window.updateGenerateButtonState();
		});
		// Bootstrap report on popup open (restore cache / auto-generate / expired-cache toast)
		bootstrapScrumReportOnPopupLoad(generateBtn).catch((err) => {
			console.error('[POPUP] bootstrapScrumReportOnPopupLoad failed', err);
		});
	}

	function showReportView() {
		isSettingsVisible = false;
		reportSection.classList.remove('hidden');
		settingsSection.classList.add('hidden');
		settingsToggle.classList.remove('active');
	}

	function showSettingsView() {
		isSettingsVisible = true;
		reportSection.classList.add('hidden');
		settingsSection.classList.remove('hidden');
		settingsToggle.classList.add('active');
	}

	if (settingsToggle) {
		settingsToggle.addEventListener('click', () => {
			if (isSettingsVisible) {
				showReportView();
			} else {
				showSettingsView();
			}
		});
	}

	if (homeButton) {
		homeButton.addEventListener('click', showReportView);
	}
	if (scrumHelperHeading) {
		scrumHelperHeading.addEventListener('click', showReportView);
	}

	showReportView();

	//report filter
	const repoSearch = document.getElementById('repoSearch');
	const repoDropdown = document.getElementById('repoDropdown');
	const selectedReposDiv = document.getElementById('selectedRepos');
	const repoTags = document.getElementById('repoTags');
	const repoPlaceholder = document.getElementById('repoPlaceholder');
	const repoCount = document.getElementById('repoCount');
	const repoStatus = document.getElementById('repoStatus');
	const clearAllReposBtn = document.getElementById('clearAllReposBtn');
	const useRepoFilter = document.getElementById('useRepoFilter');
	const repoFilterContainer = document.getElementById('repoFilterContainer');

	if (repoSearch && useRepoFilter && repoFilterContainer) {
		repoSearch.addEventListener('click', () => {
			if (!useRepoFilter.checked) {
				useRepoFilter.checked = true;
				repoFilterContainer.classList.remove('hidden');
				browser.storage.local.set({ useRepoFilter: true });
			}
		});
	}

	if (!repoSearch || !useRepoFilter) {
		console.log('Repository, filter elements not found in DOM');
	} else {
		let availableRepos = [];
		let selectedRepos = [];
		let highlightedIndex = -1;

		window.githubRepoFilterContext = {
			useRepoFilter,
			repoStatus,
			repoSearch,
			filterAndDisplayRepos: (query) => filterAndDisplayRepos(query),
			hideDropdown: () => hideDropdown(),
			setAvailableRepos: (repos) => {
				availableRepos = repos;
			},
			getAvailableRepos: () => availableRepos,
		};

		browser.storage.local.get(['selectedRepos', 'useRepoFilter']).then((items) => {
			if (items.selectedRepos) {
				selectedRepos = items.selectedRepos;
				updateRepoDisplay();
			}
			if (items.useRepoFilter) {
				useRepoFilter.checked = items.useRepoFilter;
				repoFilterContainer.classList.toggle('hidden', !items.useRepoFilter);
			}
		});

		useRepoFilter.addEventListener(
			'change',
			debounce(async () => {
				let platform = 'github';
				try {
					const items = await browser.storage.local.get(['platform']);
					platform = items.platform || 'github';
				} catch {}
				if (platform !== 'github') {
					repoFilterContainer.classList.add('hidden');
					useRepoFilter.checked = false;
					if (repoStatus)
						repoStatus.textContent =
							chrome?.i18n.getMessage('repoFilteringGithubOnly') ||
							'Repository filtering is only available for GitHub.';
					return;
				}
				const enabled = useRepoFilter.checked;
				const hasToken = githubTokenInput.value.trim() !== '';
				repoFilterContainer.classList.toggle('hidden', !enabled);

				if (enabled && !hasToken) {
					useRepoFilter.checked = false;
					repoFilterContainer.classList.add('hidden'); // hide the container
					hideDropdown();
					const tokenWarning = document.getElementById('tokenWarningForFilter');
					if (tokenWarning) {
						tokenWarning.classList.remove('hidden');
						tokenWarning.classList.add('shake-animation');
						setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
						setTimeout(() => {
							tokenWarning.classList.add('hidden');
						}, 3000);
					}
					return;
				}
				repoFilterContainer.classList.toggle('hidden', !enabled);

				await browser.storage.local.set({
					useRepoFilter: enabled,
					repoCache: null, // forces refresh
				});
				checkTokenForFilter();
				if (enabled) {
					repoStatus.textContent =
						chrome?.i18n.getMessage('loadingReposAutomatically') || 'Loading repos automatically...';

					try {
						const cacheData = await browser.storage.local.get(['repoCache']);
						const items = await browser.storage.local.get([
							'platform',
							'githubUsername',
							'gitlabUsername',
							'githubToken',
							'orgName',
						]);

						const platform = items.platform || 'github';
						const platformUsernameKey = `${platform}Username`;
						const username = items[platformUsernameKey];

						if (!username) {
							repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
							return;
						}

						const repoCacheKey = makeRepoCacheKey(username, items.orgName || '', platform, items);

						const now = Date.now();
						const cacheAge = cacheData.repoCache?.timestamp
							? now - cacheData.repoCache.timestamp
							: Number.POSITIVE_INFINITY;
						const cacheTTL = 10 * 60 * 1000; // 10 minutes

						if (cacheData.repoCache && cacheData.repoCache.cacheKey === repoCacheKey && cacheAge < cacheTTL) {
							console.log('Using cached repositories');
							availableRepos = cacheData.repoCache.data;
							repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [availableRepos.length]);

							if (document.activeElement === repoSearch) {
								filterAndDisplayRepos(repoSearch.value.toLowerCase());
							}
							return;
						}

						if (window.fetchUserRepositories) {
							const repos = await window.fetchUserRepositories(
								username,

								items.githubToken,
								items.orgName || '',
							);
							availableRepos = repos;
							repoStatus.textContent = browser.i18n.getMessage('repoLoaded', [repos.length]);

							browser.storage.local.set({
								repoCache: {
									data: repos,
									cacheKey: repoCacheKey,
									timestamp: now,
								},
							});

							if (document.activeElement === repoSearch) {
								filterAndDisplayRepos(repoSearch.value.toLowerCase());
							}
						}
					} catch (err) {
						console.error('Auto load repos failed', err);

						if (err.message?.includes('401')) {
							repoStatus.textContent = browser.i18n.getMessage('repoTokenPrivate');
						} else if (err.message?.includes('username')) {
							repoStatus.textContent = browser.i18n.getMessage('githubUsernamePlaceholder');
						} else {
							repoStatus.textContent = `${browser.i18n.getMessage('errorLabel')}: ${err.message || browser.i18n.getMessage('repoLoadFailed')}`;
						}
					}
				} else {
					selectedRepos = [];
					updateRepoDisplay();
					browser.storage.local.set({ selectedRepos: [] });
					repoStatus.textContent = '';
				}
			}, 300),
		);

		repoSearch.addEventListener('keydown', (e) => {
			const items = repoDropdown.querySelectorAll('.repository-dropdown-item');

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
					updateHighlight(items);
					break;
				case 'ArrowUp':
					e.preventDefault();
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
					updateHighlight(items);
					break;
				case 'Enter':
					e.preventDefault();
					if (highlightedIndex >= 0 && items[highlightedIndex]) {
						fnSelectedRepos(items[highlightedIndex].dataset.repoName);
					}
					break;
				case 'Escape':
					hideDropdown();
					break;
			}
		});

		repoSearch.addEventListener('input', (e) => {
			const query = e.target.value.toLowerCase();
			filterAndDisplayRepos(query);
		});
		let programmaticFocus = false;
		repoSearch.addEventListener('focus', () => {
			if (programmaticFocus) {
				programmaticFocus = false;
				return;
			}
			const searchTerm = repoSearch.value.toLowerCase();
			filterAndDisplayRepos(searchTerm);
		});

		document.addEventListener('click', (e) => {
			if (!e.target.closest('#repoSearch') && !e.target.closest('#repoDropdown')) {
				hideDropdown();
			}
		});

		const helper = getActivePlatformHelper();
		if (helper && helper.debugRepoFetch) {
			helper.debugRepoFetch();
		}

		async function loadRepos() {
			const helper = getActivePlatformHelper();
			if (helper && helper.loadRepos) {
				await helper.loadRepos();
			}
		}

		function groupReposByOwner(repos) {
			const groups = new Map();

			repos.forEach((repo) => {
				const owner = repo.fullName && repo.fullName.includes('/') ? repo.fullName.split('/')[0] : 'Unknown';

				if (!groups.has(owner)) {
					groups.set(owner, []);
				}
				groups.get(owner).push(repo);
			});

			return [...groups.keys()]
				.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
				.map((owner) => ({
					owner,
					repos: groups.get(owner).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
				}));
		}

		function createRepoDropdownItem(repo) {
			const item = document.createElement('div');
			item.className = 'repository-dropdown-item';
			item.dataset.repoName = repo.fullName;

			const header = document.createElement('div');
			header.className = 'repo-header';

			const main = document.createElement('div');
			main.className = 'repo-main';

			const nameSpan = document.createElement('span');
			nameSpan.className = 'repo-name-text';
			nameSpan.textContent = repo.name;
			main.appendChild(nameSpan);

			if (repo.language) {
				const langSpan = document.createElement('span');
				langSpan.className = 'repo-language';
				langSpan.textContent = repo.language;
				main.appendChild(langSpan);
			}

			if (repo.stars) {
				const starsSpan = document.createElement('span');
				starsSpan.className = 'repo-stars';

				const starIcon = document.createElement('i');
				starIcon.className = 'fa fa-star';
				starsSpan.appendChild(starIcon);
				starsSpan.appendChild(document.createTextNode(` ${repo.stars}`));

				main.appendChild(starsSpan);
			}

			header.appendChild(main);
			item.appendChild(header);

			if (repo.description) {
				const infoRow = document.createElement('div');
				infoRow.className = 'repo-info';

				const descSpan = document.createElement('span');
				descSpan.className = 'repo-desc';
				descSpan.textContent = repo.description;

				infoRow.appendChild(descSpan);
				item.appendChild(infoRow);
			}

			item.addEventListener('click', (e) => {
				e.stopPropagation();
				fnSelectedRepos(repo.fullName);
			});

			return item;
		}

		function filterAndDisplayRepos(query) {
			if (availableRepos.length === 0) {
				const loadingMsg = document.createElement('div');
				loadingMsg.className = 'p-3 text-center text-gray-500 text-sm';
				loadingMsg.textContent = browser.i18n.getMessage('repoLoading');
				repoDropdown.replaceChildren(loadingMsg);
				showDropdown();
				return;
			}

			// Exclude already selected repositories
			const filtered = availableRepos.filter((repo) => {
				if (selectedRepos.includes(repo.fullName)) return false;

				if (!query) return true;
				const lowerQuery = query.toLowerCase();
				return (
					repo.name.toLowerCase().includes(lowerQuery) ||
					repo.description?.toLowerCase().includes(lowerQuery) ||
					repo.fullName.toLowerCase().includes(lowerQuery)
				);
			});

			repoDropdown.replaceChildren();

			if (filtered.length === 0) {
				const notFound = document.createElement('div');
				notFound.className = 'p-3 text-center text-gray-500 text-sm';
				notFound.style.paddingLeft = '10px';
				notFound.textContent = browser.i18n.getMessage('repoNotFound');
				repoDropdown.appendChild(notFound);
			} else {
				const fragment = document.createDocumentFragment();
				const grouped = groupReposByOwner(filtered);
				const REPO_DISPLAY_LIMIT = 25;
				let renderedCount = 0;

				for (const { owner, repos } of grouped) {
					if (renderedCount >= REPO_DISPLAY_LIMIT) break;

					const ownerHeader = document.createElement('div');
					ownerHeader.className = 'repository-group-header';
					ownerHeader.textContent = owner;
					fragment.appendChild(ownerHeader);

					for (const repo of repos) {
						if (renderedCount >= REPO_DISPLAY_LIMIT) break;
						fragment.appendChild(createRepoDropdownItem(repo));
						renderedCount++;
					}
				}

				repoDropdown.appendChild(fragment);
			}
			highlightedIndex = -1;
			showDropdown();
		}

		function fnSelectedRepos(repoFullName) {
			if (selectedRepos.includes(repoFullName)) {
				return;
			}

			selectedRepos.push(repoFullName);
			updateRepoDisplay();
			saveRepoSelection();

			filterAndDisplayRepos(repoSearch.value.toLowerCase());
			programmaticFocus = true;
			repoSearch.focus();
		}

		function removeRepo(repoFullName) {
			selectedRepos = selectedRepos.filter((name) => name !== repoFullName);
			updateRepoDisplay();
			saveRepoSelection();

			// Update dropdown state if it's open
			if (!repoDropdown.classList.contains('hidden')) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			}
		}

		function updateRepoDisplay() {
			if (!repoTags) return;

			// Clear container
			repoTags.replaceChildren();

			if (selectedRepos.length === 0) {
				const placeholder = document.createElement('span');
				placeholder.className = 'text-xs text-gray-500 select-none';
				placeholder.id = 'repoPlaceholder';
				placeholder.textContent = browser.i18n.getMessage('repoPlaceholder');
				repoTags.appendChild(placeholder);

				if (repoCount) {
					repoCount.textContent = browser.i18n.getMessage('repoCountNone');
				}
				if (clearAllReposBtn) {
					clearAllReposBtn.classList.add('hidden');
				}
			} else {
				const fragment = document.createDocumentFragment();

				selectedRepos.forEach((repoFullName) => {
					// Extract repo name from owner/repo
					const repoName = repoFullName.includes('/') ? repoFullName.split('/')[1] : repoFullName;

					// Use existing .repository-tag class from index.css for consistency
					const tag = document.createElement('span');
					tag.className = 'repository-tag';

					// Text container with truncation handled by .repo-name css
					const nameSpan = document.createElement('span');
					nameSpan.className = 'repo-name';
					nameSpan.textContent = repoName; // XSS Safe
					nameSpan.title = repoFullName; // Accessibility: show full name on hover

					// Remove button using existing .remove-tag css
					const removeBtn = document.createElement('button');
					removeBtn.type = 'button';
					removeBtn.className = 'remove-tag remove-repo-btn';

					const removeIcon = document.createElement('i');
					removeIcon.className = 'fa fa-times';
					removeBtn.appendChild(removeIcon);

					removeBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						removeRepo(repoFullName);
					});

					tag.appendChild(nameSpan);
					tag.appendChild(removeBtn);
					fragment.appendChild(tag);
				});
				repoTags.appendChild(fragment);

				if (repoCount) {
					repoCount.textContent = browser.i18n.getMessage('repoCount', [selectedRepos.length]);
				}

				if (clearAllReposBtn) {
					clearAllReposBtn.classList.remove('hidden');
				}
			}
		}

		if (clearAllReposBtn) {
			clearAllReposBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				selectedRepos = [];
				updateRepoDisplay();
				saveRepoSelection();
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			});
		}

		function saveRepoSelection() {
			const cleanedRepos = selectedRepos.filter((repo) => repo !== null);
			browser.storage.local.set({
				selectedRepos: cleanedRepos,
				githubCache: null,
			});
		}

		function showDropdown() {
			repoDropdown.classList.remove('hidden');
		}

		function hideDropdown() {
			repoDropdown.classList.add('hidden');
			highlightedIndex = -1;
		}

		function updateHighlight(items) {
			items.forEach((item, index) => {
				item.classList.toggle('highlighted', index === highlightedIndex);
			});

			if (highlightedIndex >= 0 && items[highlightedIndex]) {
				items[highlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}

		window.removeRepo = removeRepo;

		browser.storage.local.get(['platform', 'githubUsername']).then((items) => {
			const platform = items.platform || 'github';
			const platformUsernameKey = `${platform}Username`;
			const username = items[platformUsernameKey];
			if (username && useRepoFilter.checked && availableRepos.length === 0) {
				setTimeout(() => loadRepos(), 1000);
			}
		});
	}
});

const cacheInput = document.getElementById('cacheInput');
if (cacheInput) {
	browser.storage.local.get(['cacheInput']).then((result) => {
		if (result.cacheInput) {
			cacheInput.value = result.cacheInput;
		} else {
			cacheInput.value = 10;
		}
	});

	cacheInput.addEventListener('blur', function () {
		let ttlValue = Number.parseInt(this.value, 10);
		if (Number.isNaN(ttlValue) || ttlValue <= 0 || this.value.trim() === '') {
			ttlValue = 10;
			this.value = ttlValue;
			this.style.borderColor = '#ef4444';
		} else if (ttlValue > 1440) {
			ttlValue = 1440;
			this.value = ttlValue;
			this.style.borderColor = '#f59e0b';
		} else {
			this.style.borderColor = '#10b981';
		}

		browser.storage.local.set({ cacheInput: ttlValue }).then(() => {
			console.log('Cache TTL saved:', ttlValue, 'minutes');
		});
	});
}

browser.storage.local.get(['platform']).then((result) => {
	const platform = result.platform || 'github';
	const platformSelect = document.getElementById('platformSelect');
	if (platformSelect) {
		platformSelect.value = platform;
	}
	updatePlatformUI(platform);
});

// Update UI for platform
function updatePlatformUI(platform) {
	const usernameLabel = document.getElementById('usernameLabel');
	if (usernameLabel) {
		if (platform === 'gitlab') {
			usernameLabel.setAttribute('data-i18n', 'gitlabUsernameLabel');
		} else {
			usernameLabel.setAttribute('data-i18n', 'githubUsernameLabel');
		}
		const key = usernameLabel.getAttribute('data-i18n');
		const message = browser.i18n.getMessage(key);
		if (message) {
			usernameLabel.textContent = message;
		}
	}

	const orgSection = document.querySelector('.orgSection');
	if (orgSection) {
		if (platform === 'gitlab') {
			orgSection.classList.add('hidden');
		} else {
			orgSection.classList.remove('hidden');
		}
	}
	const githubOnlySections = document.querySelectorAll('.githubOnlySection');
	githubOnlySections.forEach((el) => {
		if (platform === 'gitlab') {
			el.classList.add('hidden');
		} else {
			el.classList.remove('hidden');
		}
	});
	const gitlabOnlySections = document.querySelectorAll('.gitlabOnlySection');
	gitlabOnlySections.forEach((el) => {
		if (platform === 'github') {
			el.classList.add('hidden');
		} else {
			el.classList.remove('hidden');
		}
	});
}

const platformSelectEl = document.getElementById('platformSelect');
if (platformSelectEl) {
	platformSelectEl.addEventListener('change', () => {
		const platform = platformSelectEl.value;
		browser.storage.local.set({ platform }).then(() => {
			const scrumReport = document.getElementById('scrumReport');
			if (scrumReport) {
				scrumReport.innerHTML = '';
				window.updateCopyButtonState?.();
			}
			const generateBtn = document.getElementById('generateReport');
			if (typeof bootstrapScrumReportOnPopupLoad === 'function') {
				bootstrapScrumReportOnPopupLoad(generateBtn);
			}
		});
		const platformUsername = document.getElementById('platformUsername');
		if (platformUsername) {
			const currentPlatform = platformSelectEl.value === 'github' ? 'gitlab' : 'github'; // Get the platform we're switching from
			const currentUsername = platformUsername.value;
			if (currentUsername.trim()) {
				browser.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
			}
		}

		browser.storage.local.get([`${platform}Username`]).then((result) => {
			const platformUsername = document.getElementById('platformUsername');
			if (platformUsername) {
				platformUsername.value = result[`${platform}Username`] || '';
				window.updateGenerateButtonState && window.updateGenerateButtonState();
			}
		});

		updatePlatformUI(platform);
	});
}

const customDropdown = document.getElementById('customPlatformDropdown');
const dropdownBtn = document.getElementById('platformDropdownBtn');
const dropdownList = document.getElementById('platformDropdownList');
const dropdownSelected = document.getElementById('platformDropdownSelected');
const platformSelectHidden = document.getElementById('platformSelect');

function buildScrumSubjectFromPopup() {
	const projectName = document.getElementById('projectName')?.value?.trim() || '';
	const now = new Date();
	const dateCode =
		String(now.getFullYear()) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');

	return `[Scrum]${projectName ? ' - ' + projectName : ''} - ${dateCode}`;
}

function setPlatformDropdown(value) {
	if (dropdownSelected) {
		if (value === 'gitlab') {
			dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
		} else {
			dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
		}
	}

	const platformUsername = document.getElementById('platformUsername');
	if (platformUsername && platformSelectHidden) {
		const currentPlatform = platformSelectHidden.value;
		const currentUsername = platformUsername.value;
		if (currentUsername.trim()) {
			browser.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
		}
	}

	if (platformSelectHidden) {
		platformSelectHidden.value = value;
	}
	browser.storage.local.set({ platform: value }).then(() => {
		const scrumReport = document.getElementById('scrumReport');
		if (scrumReport) scrumReport.innerHTML = '';
		window.updateCopyButtonState?.();

		const generateBtn = document.getElementById('generateReport');
		if (typeof bootstrapScrumReportOnPopupLoad === 'function') {
			bootstrapScrumReportOnPopupLoad(generateBtn);
		}
	});

	browser.storage.local.get([`${value}Username`]).then((result) => {
		if (platformUsername) {
			platformUsername.value = result[`${value}Username`] || '';
			window.updateGenerateButtonState && window.updateGenerateButtonState();
		}
	});

	updatePlatformUI(value);
}

if (dropdownBtn && customDropdown && dropdownList) {
	dropdownBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		customDropdown.classList.toggle('open');
		dropdownList.classList.toggle('hidden');
	});
}

if (dropdownList) {
	dropdownList.querySelectorAll('li').forEach((item) => {
		item.addEventListener('click', function (e) {
			const newPlatform = this.getAttribute('data-value');
			const currentPlatform = platformSelectHidden ? platformSelectHidden.value : 'github';
			const platformUsername = document.getElementById('platformUsername');
			const usernameError = document.getElementById('usernameError');
			if (platformUsername) platformUsername.classList.remove('input-error');
			if (usernameError) {
				usernameError.classList.remove('errorMessage');
				usernameError.textContent = '';
			}

			if (newPlatform !== currentPlatform) {
				const platformUsername = document.getElementById('platformUsername');
				if (platformUsername) {
					const currentUsername = platformUsername.value;
					if (currentUsername.trim()) {
						browser.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
					}
				}
			}

			setPlatformDropdown(newPlatform);
			if (customDropdown) customDropdown.classList.remove('open');
			dropdownList.classList.add('hidden');
		});
	});
}

document.addEventListener('click', (e) => {
	if (customDropdown && dropdownList && !customDropdown.contains(e.target)) {
		customDropdown.classList.remove('open');
		dropdownList.classList.add('hidden');
	}
});

// Keyboard navigation
const platformDropdownBtn = document.getElementById('platformDropdownBtn');
if (platformDropdownBtn && customDropdown && dropdownList) {
	platformDropdownBtn.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			customDropdown.classList.add('open');
			dropdownList.classList.remove('hidden');
			const firstLi = dropdownList.querySelector('li');
			if (firstLi) firstLi.focus();
		}
	});
}
if (dropdownList && customDropdown && dropdownBtn) {
	dropdownList.querySelectorAll('li').forEach((item, idx, arr) => {
		item.setAttribute('tabindex', '0');
		item.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				(arr[idx + 1] || arr[0]).focus();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				(arr[idx - 1] || arr[arr.length - 1]).focus();
			} else if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				const newPlatform = this.getAttribute('data-value');
				const currentPlatform = platformSelectHidden ? platformSelectHidden.value : 'github';

				// Save current username for current platform before switching
				if (newPlatform !== currentPlatform) {
					const platformUsername = document.getElementById('platformUsername');
					if (platformUsername) {
						const currentUsername = platformUsername.value;
						if (currentUsername.trim()) {
							browser.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
						}
					}
				}

				setPlatformDropdown(newPlatform);
				customDropdown.classList.remove('open');
				dropdownList.classList.add('hidden');
				dropdownBtn.focus();
			}
		});
	});
}

// On load, restore platform from storage
browser.storage.local.get(['platform']).then((result) => {
	const platform = result.platform || 'github';
	// Just update the UI without clearing username when restoring from storage
	if (dropdownSelected) {
		if (platform === 'gitlab') {
			dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
		} else {
			dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
		}
	}
	if (platformSelectHidden) {
		platformSelectHidden.value = platform;
	}
	updatePlatformUI(platform);
});

// Tooltip bubble
document.querySelectorAll('.tooltip-container').forEach((container) => {
	const bubble = container.querySelector('.tooltip-bubble');
	if (!bubble) return;

	function positionTooltip() {
		const icon = container.querySelector('.question-icon') || container;
		const rect = icon.getBoundingClientRect();
		const bubbleRect = bubble.getBoundingClientRect();
		const padding = 8;

		let top = rect.top + window.scrollY;
		let left = rect.right + padding + window.scrollX;

		if (left + bubbleRect.width > window.innerWidth - 10) {
			left = rect.left - bubbleRect.width - padding + window.scrollX;
		}
		if (left < 8) left = 8;
		if (top + bubbleRect.height > window.innerHeight - 10) {
			top = rect.top - bubbleRect.height - padding + window.scrollY;
		}
		if (top < 8) top = 8;

		bubble.style.left = left + 'px';
		bubble.style.top = top + 'px';
	}

	container.addEventListener('mouseenter', positionTooltip);
	container.addEventListener('focusin', positionTooltip);
	container.addEventListener('mousemove', positionTooltip);
	container.addEventListener('mouseleave', () => {
		bubble.style.left = '';
		bubble.style.top = '';
	});
	container.addEventListener('focusout', () => {
		bubble.style.left = '';
		bubble.style.top = '';
	});
});

// Radio button click handlers with toggle functionality
document.querySelectorAll('input[name="timeframe"]').forEach((radio) => {
	radio.addEventListener('click', function () {
		if (this.dataset.wasChecked === 'true') {
			this.checked = false;
			this.dataset.wasChecked = 'false';

			const startDateInput = document.getElementById('startingDate');
			const endDateInput = document.getElementById('endingDate');
			if (startDateInput) startDateInput.readOnly = false;
			if (endDateInput) endDateInput.readOnly = false;

			browser.storage.local.set({
				yesterdayContribution: false,
				weeklyContribution: false,
				selectedTimeframe: null,
			});
		} else {
			document.querySelectorAll('input[name="timeframe"]').forEach((r) => {
				r.dataset.wasChecked = 'false';
			});
			this.dataset.wasChecked = 'true';
			toggleRadio(this);
		}
	});

	// Handle clicks on links within scrumReport to open in new tabs
	document.addEventListener(
		'click',
		(e) => {
			const target = e.target.closest('a');
			if (target && target.closest('#scrumReport')) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				const href = target.getAttribute('href');
				if (href && href.startsWith('http')) {
					browser.tabs.create({ url: href });
				}
				return false;
			}
		},
		true,
	); // Use capture phase to handle before contentEditable
});

// refresh cache button

{
	const localRefreshCacheBtn = document.getElementById('refreshCache');
	if (localRefreshCacheBtn) {
		localRefreshCacheBtn.addEventListener('click', async function () {
			const originalText = this.innerHTML;

			this.classList.add('loading');
			this.innerHTML = `<i class="fa fa-refresh fa-spin"></i><span>${browser.i18n.getMessage('refreshingButton')}</span>`;
			this.disabled = true;

			try {
				// Determine platform
				let platform = 'github';
				try {
					const items = await browser.storage.local.get(['platform']);
					platform = items.platform || 'github';
				} catch (e) {}

				// Clear all caches
				const keysToRemove = ['githubCache', 'repoCache', 'gitlabCache'];
				await browser.storage.local.remove(keysToRemove);

				// Clear the scrum report
				const scrumReport = document.getElementById('scrumReport');
				if (scrumReport) {
					scrumReport.dataset.copyPlaceholder = 'true';
					scrumReport.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${browser.i18n.getMessage('cacheClearedMessage')}</p>`;
					window.updateCopyButtonState?.();
				}

				if (typeof availableRepos !== 'undefined') {
					availableRepos = [];
				}

				const repoStatus = document.getElementById('repoStatus');
				if (repoStatus) {
					repoStatus.textContent = '';
				}

				this.innerHTML = `<i class="fa fa-check"></i><span>${browser.i18n.getMessage('cacheClearedButton')}</span>`;
				this.classList.remove('loading');

				// Do NOT trigger report generation automatically

				setTimeout(() => {
					this.innerHTML = originalText;
					this.disabled = false;
				}, 2000);
			} catch (error) {
				console.error('Cache clear failed:', error);
				this.innerHTML = `<i class="fa fa-exclamation-triangle"></i><span>${browser.i18n.getMessage('cacheClearFailed')}</span>`;
				this.classList.remove('loading');

				setTimeout(() => {
					this.innerHTML = originalText;
					this.disabled = false;
				}, 3000);
			}
		});
	}
}

function toggleRadio(radio) {
	const startDateInput = document.getElementById('startingDate');
	const endDateInput = document.getElementById('endingDate');

	console.log('Toggling radio:', radio.id);

	if (radio.id === 'yesterdayContribution') {
		if (startDateInput) startDateInput.value = getYesterday();
		if (endDateInput) endDateInput.value = getToday();
	} else if (radio.id === 'weeklyContribution') {
		if (startDateInput) startDateInput.value = getWeekAgo();
		if (endDateInput) endDateInput.value = getToday();
	}

	if (startDateInput) startDateInput.readOnly = true;
	if (endDateInput) endDateInput.readOnly = true;

	if (startDateInput && endDateInput) {
		browser.storage.local
			.set({
				startingDate: startDateInput.value,
				endingDate: endDateInput.value,
				yesterdayContribution: radio.id === 'yesterdayContribution',
				weeklyContribution: radio.id === 'weeklyContribution',
				selectedTimeframe: radio.id,
				githubCache: null, // Clear cache to force new fetch
			})
			.then(() => {
				console.log('State saved, dates:', {
					start: startDateInput.value,
					end: endDateInput.value,
				});

				triggerRepoFetchIfEnabled();
			});
	} else {
		browser.storage.local
			.set({
				yesterdayContribution: radio.id === 'yesterdayContribution',
				weeklyContribution: radio.id === 'weeklyContribution',
				selectedTimeframe: radio.id,
				githubCache: null,
			})
			.then(() => {
				triggerRepoFetchIfEnabled();
			});
	}
}

async function triggerRepoFetchIfEnabled() {
	const platformSelect = document.getElementById('platformSelect');
	const platform = platformSelect?.value || 'github';
	const helper = window.PlatformRegistry.get(platform);
	if (helper && helper.triggerRepoFetchIfEnabled) {
		await helper.triggerRepoFetchIfEnabled();
	}
}

// Keyboard shortcuts: Ctrl+G / Cmd+G to generate, Ctrl+Shift+Y / Cmd+Shift+Y to copy, Ctrl+Shift+M / Cmd+Shift+M to insert in email
document.addEventListener('keydown', (e) => {
	if (!document.hasFocus()) {
		return;
	}

	const target = e.target;
	const tagName = target?.tagName;
	const editableAncestor = typeof target?.closest === 'function' ? target.closest('[contenteditable="true"]') : null;
	const isFormField = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
	const isContentEditable = !!(editableAncestor || (target && target.isContentEditable));

	if (isFormField || isContentEditable) {
		return;
	}

	const key = (e.key || '').toLowerCase();
	const modifier = isMacOS() ? e.metaKey : e.ctrlKey;

	const generateBtn = document.getElementById('generateReport');
	const copyBtn = document.getElementById('copyReport');
	const insertEmailBtn = document.getElementById('insertInEmail');

	if (modifier && !e.shiftKey && !e.altKey && key === 'g' && !e.repeat && generateBtn && !generateBtn.disabled) {
		e.preventDefault();
		showShortcutNotification('generatingReportNotification');
		generateBtn._triggeredByShortcut = true;
		generateBtn.click();
	}

	if (modifier && e.shiftKey && !e.altKey && key === 'y' && !e.repeat && copyBtn && !copyBtn.disabled) {
		e.preventDefault();
		showShortcutNotification('copyingReportNotification');
		copyBtn._triggeredByShortcut = true;
		copyBtn.click();
	}

	if (modifier && e.shiftKey && !e.altKey && key === 'm' && !e.repeat && insertEmailBtn && !insertEmailBtn.disabled) {
		e.preventDefault();
		showShortcutNotification('insertingInEmailNotification');
		insertEmailBtn._triggeredByShortcut = true;
		insertEmailBtn.click();
	}
});

// Validate organization only when user is done typing (on blur)
function validateOrgOnBlur(org) {
	const platformSelect = document.getElementById('platformSelect');
	const platform = platformSelect?.value || 'github';
	const helper = window.PlatformRegistry.get(platform);
	if (helper && helper.validateOrgOnBlur) {
		helper.validateOrgOnBlur(org);
	}
}

// Rate Limit Warning banner management
(function () {
	let rateLimitTimeout;
	const rateLimitWarning = document.getElementById('rateLimitWarning');
	const closeRateLimitWarning = document.getElementById('closeRateLimitWarning');

	if (rateLimitWarning && closeRateLimitWarning) {
		closeRateLimitWarning.addEventListener('click', () => {
			rateLimitWarning.classList.add('hidden');
			if (rateLimitTimeout) {
				clearTimeout(rateLimitTimeout);
			}
		});
	}

	window.showRateLimitWarning = function () {
		const banner = document.getElementById('rateLimitWarning');
		if (banner) {
			banner.classList.remove('hidden');
			if (rateLimitTimeout) {
				clearTimeout(rateLimitTimeout);
			}
			rateLimitTimeout = setTimeout(() => {
				banner.classList.add('hidden');
			}, 6000); // 6 seconds
		}
	};
})();
