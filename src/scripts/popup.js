/* global chrome */

const injectedTabs = new Set();

function sanitizeTooltipHtml(html) {
	const parser = new DOMParser();
	const doc = parser.parseFromString(String(html), 'text/html');
	const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'CODE', 'A', 'BR', 'SPAN', 'P', 'U']);

	function cleanNode(node) {
		const children = Array.from(node.childNodes);
		children.forEach((child) => {
			if (child.nodeType === Node.ELEMENT_NODE) {
				const tag = child.nodeName.toUpperCase();
				if (!allowedTags.has(tag)) {
					// Replace disallowed element with its text content
					const text = document.createTextNode(child.textContent || '');
					node.replaceChild(text, child);
				} else {
					// Remove inline event handlers and unsafe attributes
					Array.from(child.attributes).forEach((attr) => {
						const name = attr.name.toLowerCase();
						const value = attr.value || '';
						if (name.startsWith('on')) {
							child.removeAttribute(attr.name);
						} else if (name === 'href' || name === 'src') {
							// allow only safe schemes: http(s), mailto, tel, or relative/anchor
							if (!/^(https?:|mailto:|tel:|\/|#)/i.test(value)) {
								child.removeAttribute(attr.name);
							}
						} else if (!['class', 'title', 'rel', 'target', 'aria-label', 'href', 'src'].includes(name)) {
							child.removeAttribute(attr.name);
						}
					});

					if (child.nodeName.toUpperCase() === 'A') {
						child.setAttribute('rel', 'noopener noreferrer');
						if (!child.getAttribute('target')) child.setAttribute('target', '_blank');
					}

					// Recurse into allowed children
					cleanNode(child);
				}
			} else if (child.nodeType === Node.TEXT_NODE) {
				// text nodes are safe
			} else {
				// remove comments, processing instructions, etc.
				node.removeChild(child);
			}
		});
	}

	cleanNode(doc.body);
	const frag = document.createDocumentFragment();
	Array.from(doc.body.childNodes).forEach((n) => frag.appendChild(n.cloneNode(true)));
	return frag;
}

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
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

function showShortcutNotification(messageKey) {
	if (typeof chrome === 'undefined' || !chrome.i18n) {
		return;
	}

	const existingNotification = document.querySelector('.shortcut-notification');
	if (existingNotification) {
		existingNotification.remove();
	}

	const message = chrome.i18n.getMessage(messageKey);
	if (!message) {
		return;
	}

	const notification = document.createElement('div');
	notification.className = 'shortcut-notification';
	notification.textContent = message;
	document.body.appendChild(notification);

	setTimeout(() => {
		notification.style.animation = 'slideOut 0.3s ease-out';
		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	}, 2000);
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
	return today.toISOString().split('T')[0];
}

function getYesterday() {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return yesterday.toISOString().split('T')[0];
}

function applyI18n() {
	document.querySelectorAll('[data-i18n]').forEach((el) => {
		const key = el.getAttribute('data-i18n');
		const message = chrome?.i18n.getMessage(key);
		if (message) {
			// For tooltip-like elements allow a small set of safe inline formatting.
			if (el.classList.contains('tooltip-bubble') || el.classList.contains('cache-info')) {
				try {
					const frag = sanitizeTooltipHtml(message);
					while (el.firstChild) el.removeChild(el.firstChild);
					el.appendChild(frag);
				} catch (error) {
					console.error('Failed to sanitize tooltip HTML for i18n key:', key, error);
					// Fallback to textContent on any parser/sanitizer error
					el.textContent = message;
				}
			} else {
				el.textContent = message;
			}
		}
	});

	document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
		const key = el.getAttribute('data-i18n-placeholder');
		const message = chrome?.i18n.getMessage(key);
		if (message) {
			el.placeholder = message;
		}
	});

	document.querySelectorAll('[data-i18n-title]').forEach((el) => {
		const key = el.getAttribute('data-i18n-title');
		const message = chrome?.i18n.getMessage(key);
		if (message) {
			el.title = message;
		}
	});

	document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
		const key = el.getAttribute('data-i18n-aria');
		const message = chrome?.i18n.getMessage(key);
		if (message) {
			el.setAttribute('aria-label', message);
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


	document.addEventListener('keydown', (e) => {
		if (e.ctrlKey && e.shiftKey) {
			const key = e.key.toLowerCase();
			if (key === 'y') {
				e.preventDefault();
				const copyBtn = document.getElementById('copyReport');
				if (copyBtn) {
					copyBtn._triggeredByShortcut = true;
					copyBtn.click();
				}
			} else if (key === 'm') {
				e.preventDefault();
				const insertBtn = document.getElementById('insertInEmail');
				if (insertBtn) {
					insertBtn._triggeredByShortcut = true;
					insertBtn.click();
				}
			}
		}
	});

	// Global click listener for closing dropdowns
	document.addEventListener('click', (e) => {
		// Custom Platform Dropdown
		const customDropdown = document.getElementById('customPlatformDropdown');
		const dropdownList = document.getElementById('platformDropdownList');
		if (customDropdown && dropdownList && !customDropdown.contains(e.target)) {
			customDropdown.classList.remove('open');
			dropdownList.classList.add('hidden');
		}

		// GitHub Repository Dropdown
		if (typeof hideDropdown === 'function') {
			if (!e.target.closest('#repoSearch') && !e.target.closest('#repoDropdown')) {
				hideDropdown();
			}
		}

		// GitLab Project Dropdown
		if (typeof hideGitLabProjectDropdown === 'function') {
			if (!e.target.closest('#gitlabProjectSearch') && !e.target.closest('#gitlabProjectDropdown')) {
				hideGitLabProjectDropdown();
			}
		}
	});

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
	let showCommitsWarningTimeout;
	let mergedPRsWarningTimeout;

	function checkTokenForFilter() {
		const useRepoFilter = document.getElementById('useRepoFilter');
		const githubTokenInput = document.getElementById('githubToken');
		const tokenWarning = document.getElementById('tokenWarningForFilter');
		const repoFilterContainer = document.getElementById('repoFilterContainer');

		if (!useRepoFilter || !githubTokenInput || !tokenWarning || !repoFilterContainer) {
			return;
		}
		// Normalize to strict booleans to make intent explicit and avoid
		// subtle truthiness issues that static analyzers may warn about.
		const isFilterEnabled = Boolean(useRepoFilter.checked);
		const hasToken = Boolean(githubTokenInput.value && githubTokenInput.value.trim().length > 0);

		if (isFilterEnabled === true && hasToken === false) {
			useRepoFilter.checked = false;
			repoFilterContainer.classList.add('hidden');
			if (typeof hideDropdown === 'function') {
				hideDropdown();
			}
			chrome?.storage.local.set({ useRepoFilter: false });
		}
		tokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
		setTimeout(() => {
			tokenWarning.classList.add('hidden');
		}, 4000);
	}

	function checkGitLabTokenForFilter() {
		const useGitlabProjectFilter = document.getElementById('useGitlabProjectFilter');
		const gitlabTokenInput = document.getElementById('gitlabToken');
		const gitlabTokenWarning = document.getElementById('gitlabTokenWarningForFilter');
		const gitlabProjectFilterContainer = document.getElementById('gitlabProjectFilterContainer');

		if (!useGitlabProjectFilter || !gitlabTokenInput || !gitlabTokenWarning || !gitlabProjectFilterContainer) {
			return;
		}
		// Normalize to strict booleans to make intent explicit and avoid
		// subtle truthiness issues that static analyzers may warn about.
		const isFilterEnabled = Boolean(useGitlabProjectFilter.checked);
		const hasToken = Boolean(gitlabTokenInput.value && gitlabTokenInput.value.trim().length > 0);

		if (isFilterEnabled === true && hasToken === false) {
			useGitlabProjectFilter.checked = false;
			gitlabProjectFilterContainer.classList.add('hidden');
			if (typeof hideGitLabProjectDropdown === 'function') {
				hideGitLabProjectDropdown();
			}
			browser.storage.local.set({ useGitlabProjectFilter: false });
		}
		gitlabTokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
		setTimeout(() => {
			gitlabTokenWarning.classList.add('hidden');
		}, 4000);
	}

	function showTokenWarningForMergedPRs({ animate = false, durationMs = 4000 } = {}) {
		const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
		if (!tokenWarning) {
			return;
		}

		tokenWarning.classList.remove('hidden');
		if (animate) {
			tokenWarning.classList.add('shake-animation');
			setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
		}

		if (mergedPRsWarningTimeout) {
			clearTimeout(mergedPRsWarningTimeout);
		}
		mergedPRsWarningTimeout = setTimeout(() => {
			tokenWarning.classList.add('hidden');
		}, durationMs);
	}

	function checkTokenForMergedPRs({
		showWarning = false,
		animateWarning = false,
		warningDurationMs = 4000,
		persistState = false,
	} = {}) {
		const mergedPRsCheckbox = document.getElementById('onlyMergedPRs');
		const githubTokenInput = document.getElementById('githubToken');

		if (!mergedPRsCheckbox || !githubTokenInput) {
			return;
		}

		const isMergedPRsEnabled = mergedPRsCheckbox.checked;
		const hasToken = githubTokenInput.value.trim() !== '';

		if (isMergedPRsEnabled && !hasToken) {
			mergedPRsCheckbox.checked = false;
			if (showWarning) {
				showTokenWarningForMergedPRs({
					animate: animateWarning,
					durationMs: warningDurationMs,
				});
			}
			chrome?.storage.local.set({ onlyMergedPRs: false });
			return;
		}

		const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
		if (tokenWarning) {
			if (mergedPRsWarningTimeout) {
				clearTimeout(mergedPRsWarningTimeout);
				mergedPRsWarningTimeout = null;
			}
			tokenWarning.classList.add('hidden');
		}
		if (persistState) {
			chrome?.storage.local.set({ onlyMergedPRs: mergedPRsCheckbox.checked });
		}
	}

	function showTokenWarningForShowCommits({ animate = false, durationMs = 4000 } = {}) {
		const tokenWarning = document.getElementById('tokenWarningForShowCommits');
		if (!tokenWarning) {
			return;
		}

		tokenWarning.classList.remove('hidden');
		if (animate) {
			tokenWarning.classList.add('shake-animation');
			setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
		}

		if (showCommitsWarningTimeout) {
			clearTimeout(showCommitsWarningTimeout);
		}
		showCommitsWarningTimeout = setTimeout(() => {
			tokenWarning.classList.add('hidden');
		}, durationMs);
	}

	function checkTokenForShowCommits({
		showWarning = false,
		animateWarning = false,
		warningDurationMs = 4000,
		persistState = false,
	} = {}) {
		const showCommits = document.getElementById('showCommits');
		const githubTokenInput = document.getElementById('githubToken');

		if (!showCommits || !githubTokenInput) {
			return;
		}

		const isShowCommitsEnabled = showCommits.checked;
		const hasToken = githubTokenInput.value.trim() !== '';

		if (isShowCommitsEnabled && !hasToken) {
			showCommits.checked = false;
			if (showWarning) {
				showTokenWarningForShowCommits({
					animate: animateWarning,
					durationMs: warningDurationMs,
				});
			}
			// Always persist correction of invalid state
			chrome?.storage.local.set({ showCommits: false });
			return;
		}

		const tokenWarning = document.getElementById('tokenWarningForShowCommits');
		if (tokenWarning) {
			if (showCommitsWarningTimeout) {
				clearTimeout(showCommitsWarningTimeout);
				showCommitsWarningTimeout = null;
			}
			tokenWarning.classList.add('hidden');
		}
		if (persistState) {
			chrome?.storage.local.set({ showCommits: showCommits.checked });
		}
	}

	browser.storage.local
		.get(['darkMode'])
		.then((result) => {
			if (result.darkMode) {
				body.classList.add('dark-mode');
				darkModeToggle.src = 'icons/light-mode.png';
				if (settingsIcon) {
					settingsIcon.src = 'icons/settings-night.png';
				}
			}
		})
		.catch((error) => {
			console.warn('Error loading dark mode preference:', error);
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

	// GitLab token visibility toggle (single instance - removed duplicate)
	if (toggleGitlabTokenBtn && gitlabTokenInput && gitlabTokenEyeIcon) {
		toggleGitlabTokenBtn.addEventListener('click', () => {
			gitlabTokenVisible = !gitlabTokenVisible;
			gitlabTokenInput.type = gitlabTokenVisible ? 'text' : 'password';

			gitlabTokenEyeIcon.classList.add('eye-animating');
			setTimeout(() => gitlabTokenEyeIcon.classList.remove('eye-animating'), 400);
			gitlabTokenEyeIcon.className = gitlabTokenVisible ? 'fa fa-eye-slash text-gray-600' : 'fa fa-eye text-gray-600';

			gitlabTokenInput.classList.add('token-animating');
			setTimeout(() => gitlabTokenInput.classList.remove('token-animating'), 300);
		});

		gitlabTokenInput.addEventListener('input', function () {
			checkGitLabTokenForFilter();
			browser.storage.local.set({ gitlabToken: gitlabTokenInput.value });
			if (window.triggerGitLabProjectFetchIfEnabled) {
				window.triggerGitLabProjectFetchIfEnabled();
			}
		});
		gitlabTokenInput.addEventListener('blur', function () {
			browser.storage.local.set({ gitlabToken: gitlabTokenInput.value });
			if (window.triggerGitLabProjectFetchIfEnabled) {
				window.triggerGitLabProjectFetchIfEnabled();
			}
		});

		// GitLab group input persistence
		const gitlabGroupInput = document.getElementById('gitlabGroupInput');
		if (gitlabGroupInput) {
			browser.storage.local
				.get(['gitlabGroup'])
				.then((res) => {
					if (res.gitlabGroup) gitlabGroupInput.value = res.gitlabGroup;
				})
				.catch((error) => {
					console.warn('Error loading GitLab group:', error);
				});

			gitlabGroupInput.addEventListener(
				'input',
				debounce(function () {
					browser.storage.local.set({ gitlabGroup: gitlabGroupInput.value });
				}, 300),
			);

			gitlabGroupInput.addEventListener('blur', function () {
				browser.storage.local.set({ gitlabGroup: gitlabGroupInput.value });
			});
		}
	}

	githubTokenInput.addEventListener('input', () => {
		const token = githubTokenInput.value;
		browser.storage.local.set({ githubToken: token });
		checkTokenForFilter();
		checkTokenForShowCommits({ persistState: false });
		checkTokenForMergedPRs({ persistState: false });
	});

	darkModeToggle.addEventListener('click', function () {
		body.classList.toggle('dark-mode');
		const isDarkMode = body.classList.contains('dark-mode');
		chrome?.storage.local.set({ darkMode: isDarkMode });
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
		console.log('[DEBUG] Storage changed:', changes, namespace);
		if (changes.startingDate || changes.endingDate) {
			console.log('[POPUP-DEBUG] Date changed in storage, triggering repo fetch.', {
				startingDate: changes.startingDate?.newValue,
				endingDate: changes.endingDate?.newValue,
			});
			if (window.triggerRepoFetchIfEnabled) {
				try {
					window.triggerRepoFetchIfEnabled();
				} catch (error) {
					console.error('Error triggering repo fetch:', error);
				}
			}
		}
	});

	function storageLocalGet(keys) {
		return browser.storage.local.get(keys).catch((error) => {
			console.error('Error reading from browser.storage.local:', error);
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

		const msg = chrome?.i18n.getMessage('generatingButton') || 'Generating...';
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
				attributeFilter: ['disabled']
			});

			generateBtn.dataset.generateButtonStateObserved = 'true';
		}

		applyGenerateButtonState();
	}

	window.updateGenerateButtonState = updateGenerateButtonState;

	function showPopupMessage(message) {
		if (!message) return;
		const isDarkMode = document.body?.classList.contains('dark-mode');

		const old = document.getElementById('scrum-cache-toast');
		if (old) old.remove();

		const toast = document.createElement('div');
		toast.id = 'scrum-cache-toast';
		toast.className = 'scrum-cache-toast-custom';
		toast.style.background = isDarkMode ? '#ffffff' : '#1f2937';
		toast.style.color = isDarkMode ? '#1f2937' : '#fff';
		toast.style.border = 'none';
		toast.style.fontWeight = 'bold';
		toast.style.padding = '12px 16px';
		toast.style.borderRadius = '8px';
		toast.style.position = 'fixed';
		toast.style.top = '12px';
		toast.style.left = '50%';
		toast.style.transform = 'translateX(-50%)';
		toast.style.zIndex = '2147483647';
		toast.style.width = 'calc(82% - 16px)';
		toast.style.maxWidth = '340px';
		toast.style.lineHeight = '1.4';
		toast.style.textAlign = 'start';
		toast.style.boxSizing = 'border-box';
		toast.style.wordBreak = 'break-word';
		toast.style.opacity = '1';
		toast.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
		toast.textContent = message;

		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 4000);
	}

	function hideGitLabProjectDropdown() {
		const gitlabProjectDropdown = document.getElementById('gitlabProjectDropdown');
		if (gitlabProjectDropdown) {
			gitlabProjectDropdown.classList.add('hidden');
		}
	}

	function showGitLabProjectDropdown() {
		const gitlabProjectDropdown = document.getElementById('gitlabProjectDropdown');
		if (gitlabProjectDropdown) {
			gitlabProjectDropdown.classList.remove('hidden');
		}
	}

	function updatePlatformUI(platform) {
		const body = document.body;
		const platformSelectHidden = document.getElementById('platformSelect');

		if (platform === 'gitlab') {
			body.classList.remove('github-selected');
			body.classList.add('gitlab-selected');
		} else {
			body.classList.remove('gitlab-selected');
			body.classList.add('github-selected');
		}

		if (platformSelectHidden) {
			platformSelectHidden.value = platform;
		}

		const usernameLabel = document.getElementById('usernameLabel');
		if (usernameLabel) {
			if (platform === 'gitlab') {
				usernameLabel.setAttribute('data-i18n', 'gitlabUsernameLabel');
			} else {
				usernameLabel.setAttribute('data-i18n', 'githubUsernameLabel');
			}
			const key = usernameLabel.getAttribute('data-i18n');
			let message = key;
			if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
				const resolved = chrome.i18n.getMessage(key);
				if (resolved) {
					message = resolved;
				}
			}
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


		const dropdownSelected = document.getElementById('platformDropdownSelected');
		if (dropdownSelected) {
			if (platform === 'gitlab') {
				dropdownSelected.innerHTML = '<i class="fab fa-gitlab" style="margin-right:8px;"></i> GitLab';
			} else {
				dropdownSelected.innerHTML = '<i class="fab fa-github" style="margin-right:8px;"></i> GitHub';
			}
		}
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
				`${activePlatform}LastScrumReportSubject`,
				'lastScrumReportHtml',
				'lastScrumReportPlatform',
				'lastScrumReportCacheKey',
				'lastScrumReportUsername',
				'lastScrumSubject',
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
					scrumReport.innerHTML = lastScrumReportHtml;
					if (generateBtn) generateBtn.disabled = false;
					return;
				}

				setGenerateButtonLoading(generateBtn, true);
				window.generateScrumReport();
				return;
			}

			// If cache is expired, still only show the old HTML if it was for the current username
			if ((!scrumReport.innerHTML || !scrumReport.innerHTML.trim()) && lastScrumReportHtml && isUsernameMatch) {
				scrumReport.innerHTML = lastScrumReportHtml;
			}

			if (generateBtn) generateBtn.disabled = false;
			return;
		}

		setGenerateButtonLoading(generateBtn, true);
		window.generateScrumReport();
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
		const startingDateInput = document.getElementById('startingDate');
		const endingDateInput = document.getElementById('endingDate');
		const platformUsername = document.getElementById('platformUsername');
		const usernameError = document.getElementById("usernameError");

		browser.storage.local
			.get([
				'projectName',
				'orgName',
				'userReason',
				'showOpenLabel',
				'showCommits',
				'githubToken',
				'gitlabToken',
				'cacheInput',
				'onlyIssues',
				'onlyPRs',
				'onlyRevPRs',
				'onlyMergedPRs',
				'yesterdayContribution',
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
				if (result.gitlabToken && gitlabTokenInput) gitlabTokenInput.value = result.gitlabToken;
				if (result.cacheInput) cacheInput.value = result.cacheInput;
				if (typeof result.yesterdayContribution !== 'undefined') yesterdayRadio.checked = result.yesterdayContribution;
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

		// Build the email subject from the most recently generated report,
		// falling back to constructing one from the project name + current date.
		function buildScrumSubjectFromPopup() {
			return browser.storage.local
				.get(['lastScrumSubject', 'githubLastScrumReportSubject', 'gitlabLastScrumReportSubject'])
				.then((result) => {
					const activePlatform = document.querySelector('input[name="platform"]:checked')?.value || 'github';
					const platformSpecificSubject = result[`${activePlatform}LastScrumReportSubject`];
					if (platformSpecificSubject) {
						return platformSpecificSubject;
					}

					if (result.lastScrumSubject) {
						return result.lastScrumSubject;
					}

					// Construct from project name + current date
					const project = document.getElementById('projectName')?.value?.trim() || '';
					const curDate = new Date();
					const year = curDate.getFullYear().toString();
					let month = curDate.getMonth() + 1;
					let date = curDate.getDate();
					if (month < 10) month = '0' + month;
					if (date < 10) date = '0' + date;
					const dateCode = year + month.toString() + date.toString();
					return `[Scrum]${project ? ' - ' + project : ''} - ${dateCode}`;
				});
		}
		const generateBtn = document.getElementById('generateReport');
		const copyBtn = document.getElementById('copyReport');
		const insertBtn = document.getElementById('insertInEmail');

		if (insertBtn) {
			insertBtn.addEventListener('click', async () => {
				try {
					const scrumReport = document.getElementById('scrumReport');
					const content = scrumReport ? scrumReport.innerHTML : '';

					if (!content) {
						alert('No scrum report to insert. Please generate a report first.');
						console.warn('[Insert] No scrum report to insert');
						return;
					}

					insertBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${browser.i18n.getMessage('insertingButton') || 'Inserting...'}`;
					insertBtn.disabled = true;

					const subject = await buildScrumSubjectFromPopup();
					console.log('[Insert] Subject:', subject);

					const tabs = await browser.tabs.query({ active: true, currentWindow: true });

					const tabId = tabs?.[0]?.id;
					const tabUrl = tabs?.[0]?.url;

					if (!tabId) {
						const msg = browser.i18n.getMessage('insertToEmailFailedError') || 'open an email tab to insert report';
						showPopupMessage(msg);
						console.warn('[Insert] No active tab found');
						insertBtn.innerHTML = `<i class="fa fa-envelope"></i> ${browser.i18n.getMessage('insertInEmailButton') || 'Insert to Email'}`;
						insertBtn.disabled = false;
						return;
					}

					console.log('[Insert] Tab ID:', tabId, 'URL:', tabUrl);

					const sendInsert = async (retry = false) => {
						try {
							console.log('[Insert] Sending message to tab', tabId, {
								action: 'insertReportToEmail',
								contentLength: content.length,
								subject,
							});

							try {
								const response = await browser.tabs.sendMessage(tabId, {
									action: 'insertReportToEmail',
									content,
									subject,
								});

								if (response?.success) {
									console.log('[Insert] Report inserted successfully');
									if (insertBtn._triggeredByShortcut) {
										showShortcutNotification('insertedInEmailNotification');
									} else {
										showPopupMessage(browser.i18n.getMessage('reportInsertedSuccess') || 'Report inserted successfully!');
									}
									insertBtn.innerHTML = `<i class="fa fa-check"></i> ${browser.i18n.getMessage('insertedButton') || 'Inserted!'}`;
									setTimeout(() => {
										insertBtn.innerHTML = `<i class="fa fa-envelope"></i> ${browser.i18n.getMessage('insertInEmailButton') || 'Insert to Email'}`;
										insertBtn.disabled = false;
									}, 2000);
								} else {
									const msg = 'Insert Failed: ' + (response?.error || 'Unknown error');
									console.warn('[Insert]', msg);
									showPopupMessage(msg);
									insertBtn.innerHTML = `<i class="fa fa-envelope"></i> ${browser.i18n.getMessage('insertInEmailButton') || 'Insert to Email'}`;
									insertBtn.disabled = false;
								}
							} catch (messageError) {
								const errMsg = messageError.message || String(messageError);
								
								const isRecoverable = errMsg.includes('Receiving end does not exist') || 
													 errMsg.includes('Could not establish connection');

								if (!isRecoverable || retry) {
									console.error('[Insert] Message sending error:', errMsg);
								}

								if (
									!retry &&
									(errMsg.includes('Receiving end does not exist') || errMsg.includes('Could not establish connection'))
								) {
									console.log('[Insert] Content scripts not found. Injecting minimal scripts...');

									if (injectedTabs.has(tabId)) {
										console.log('[Insert] Scripts already injected for tab', tabId, '. Skipping reinjection.');
										showPopupMessage('Cannot connect to email client: ' + errMsg);
										insertBtn.innerHTML = `<i class="fa fa-envelope"></i> ${browser.i18n.getMessage('insertInEmailButton') || 'Insert to Email'}`;
										insertBtn.disabled = false;
										return;
									}

									try {
										await browser.scripting.executeScript({
											target: { tabId },
											files: [
												'scripts/browser-polyfill.min.js',
												'scripts/jquery-3.2.1.min.js',
												'scripts/emailClientAdapter.js',
												'scripts/gitlabHelper.js',
												'scripts/scrumHelper.js',
											],
										});

										injectedTabs.add(tabId);
										console.log('[Insert] Minimal scripts injected successfully. Waiting before retry...');
										// Wait for scripts to initialize
										await new Promise((resolve) => setTimeout(resolve, 1000));
										console.log('[Insert] Retrying insert after script injection...');
										await sendInsert(true);
										return;
									} catch (injectionError) {
										console.error('[Insert] Script injection failed:', injectionError.message);
										let msg = 'Cannot inject script: ' + injectionError.message;
										if (injectionError.message.includes('Cannot access cross-origin')) {
											msg =
												'This page does not support email insertion.\n\nPlease use on:\n- Gmail (mail.google.com)\n- Outlook (outlook.office.com)\n- Yahoo Mail (mail.yahoo.com)';
										}
										showPopupMessage(msg);
										insertBtn.innerHTML = '<i class="fa fa-envelope"></i> Insert in Email';
										insertBtn.disabled = false;
										return;
									}
								} else if (!retry) {
									if (!injectedTabs.has(tabId)) {
										console.log('[Insert] Unknown error, trying script injection anyway...');
										try {
											await browser.scripting.executeScript({
												target: { tabId },
												files: [
													'scripts/browser-polyfill.min.js',
													'scripts/jquery-3.2.1.min.js',
													'scripts/emailClientAdapter.js',
													'scripts/gitlabHelper.js',
													'scripts/scrumHelper.js',
												],
											});
											injectedTabs.add(tabId);
											await new Promise((resolve) => setTimeout(resolve, 1000));
											await sendInsert(true);
											return;
										} catch (e) {
											console.error('[Insert] Fallback injection also failed:', e.message);
										}
									}

									showPopupMessage('Cannot connect to email client: ' + errMsg);
									insertBtn.innerHTML = '<i class="fa fa-envelope"></i> Insert in Email';
									insertBtn.disabled = false;
								}
							}
						} catch (error) {
							console.error('[Insert] Unexpected error in sendInsert:', error);
							showPopupMessage('Unexpected error: ' + error.message);
							insertBtn.innerHTML = '<i class="fa fa-envelope"></i> Insert in Email';
							insertBtn.disabled = false;
						}
					};

					await sendInsert();
				} catch (error) {
					console.error('[Insert] Error in insert click handler:', error);
					showPopupMessage('Error: ' + error.message);
					insertBtn.innerHTML = '<i class="fa fa-envelope"></i> Insert in Email';
					insertBtn.disabled = false;
				} finally {
					insertBtn._triggeredByShortcut = false;
				}
			});
		}
		generateBtn.addEventListener('click', () => {
			browser.storage.local.get(['platform']).then((result) => {
				platformUsername.classList.remove("input-error");
				usernameError.classList.remove("errorMessage");
				usernameError.textContent = "";
				const platform = result.platform || 'github';
				const platformUsernameKey = `${platform}Username`;

				return browser.storage.local
					.set({
						platform: platform,
						[platformUsernameKey]: platformUsername.value,
					})
					.then(() => {
						generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
						generateBtn.disabled = true;
						window.generateScrumReport && window.generateScrumReport();
					});
			});
		});

		copyBtn.addEventListener('click', function () {
			const scrumReport = document.getElementById('scrumReport');
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = scrumReport.innerHTML;
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
					showShortcutNotification(notificationKey);
				}
				this.innerHTML = `<i class="fa fa-check"></i> ${chrome?.i18n.getMessage('copiedButton')}`;
				setTimeout(() => {
					this.innerHTML = `<i class="fa fa-copy"></i> ${chrome?.i18n.getMessage('copyReportButton')}`;
				}, 2000);
			} catch (err) {
				console.error('Failed to copy: ', err);
			} finally {
				this._triggeredByShortcut = false;
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

			chrome?.storage.local.set({
				yesterdayContribution: false,
				selectedTimeframe: null,
			});
		});

		browser.storage.local
			.get(['selectedTimeframe', 'yesterdayContribution', 'startingDate', 'endingDate'])
			.then((items) => {
				console.log('Restoring state:', items);

				if (items.startingDate && items.endingDate && !items.yesterdayContribution) {
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
					}
					startDateInput.readOnly = endDateInput.readOnly = true;

					browser.storage.local.set({
						startingDate: startDateInput.value,
						endingDate: endDateInput.value,
						yesterdayContribution: items.selectedTimeframe === 'yesterdayContribution',
						selectedTimeframe: items.selectedTimeframe,
					});
				}

				const org = orgInput.value.trim().toLowerCase();
				chrome?.storage.local.set({ orgName: org });

				// Only validate if org name is not empty
				if (org) {
					validateOrgOnBlur(org);
				} else {
					// Clear any existing toast if org is empty
					const oldToast = document.getElementById('invalid-org-toast');
					if (oldToast) oldToast.parentNode.removeChild(oldToast);
				}
			});
		if (userReasonInput) {
			userReasonInput.addEventListener('input', () => {
				chrome?.storage.local.set({ userReason: userReasonInput.value });
			});
		}
		showOpenLabelCheckbox.addEventListener('change', () => {
			browser.storage.local.set({ showOpenLabel: showOpenLabelCheckbox.checked });
		});
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
		showCommitsCheckbox.addEventListener('change', () => {
			checkTokenForShowCommits({
				showWarning: true,
				animateWarning: true,
				warningDurationMs: 3000,
				persistState: true,
			});
		});
		cacheInput.addEventListener('input', () => {
			chrome?.storage.local.set({ cacheInput: cacheInput.value });
		});

		// Display mode (popup / sidepanel)
		// Apply the stored display mode class on next launch
		function applyDisplayModeClass(mode) {
			const className = mode === 'popup' ? 'mode-popup' : 'mode-sidepanel';
			if (!document.documentElement.classList.contains(className)) {
				document.documentElement.classList.remove('mode-popup', 'mode-sidepanel');
				body.classList.remove('mode-popup', 'mode-sidepanel');
				document.documentElement.classList.add(className);
				body.classList.add(className);
			}
		}

		browser.storage.local
			.get({ displayMode: 'sidePanel' })
			.then((result) => {
				applyDisplayModeClass(result.displayMode);
			})
			.catch((error) => {
				console.warn('Error loading display mode:', error);
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
				chrome?.storage.local.set({ displayMode: mode });
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
			chrome?.storage.local.set({ yesterdayContribution: yesterdayRadio.checked });
		});
		startingDateInput.addEventListener('input', () => {
			window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(
				startingDateInput,
				endingDateInput,
			);
		});
		endingDateInput.addEventListener('input', () => {
			window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(
				startingDateInput,
				endingDateInput,
			);
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

	
		browser.storage.local.get(['platform']).then((result) => {
			const platform = result.platform || 'github';
			updatePlatformUI(platform);
		});
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
	const useRepoFilter = document.getElementById('useRepoFilter');
	const repoFilterContainer = document.getElementById('repoFilterContainer');

	if (repoSearch && useRepoFilter && repoFilterContainer) {
		repoSearch.addEventListener('click', () => {
			if (!useRepoFilter.checked) {
				useRepoFilter.checked = true;
				repoFilterContainer.classList.remove('hidden');
				chrome?.storage.local.set({ useRepoFilter: true });
			}
		});
	}

	// shared state for repository filter UI (declared here so other handlers can access)
	let availableRepos = [];
	let selectedRepos = [];
	let highlightedIndex = -1;

	if (!repoSearch || !useRepoFilter) {
		console.log('Repository, filter elements not found in DOM');
	} else {
		async function triggerRepoFetchIfEnabled() {
			// --- PLATFORM CHECK: Only run for GitHub ---
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome?.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {
				console.error(
					'Failed to retrieve platform from browser.storage.local during triggerRepoFetchIfEnabled, defaulting to "github".',
					e,
				);
			}
			if (platform !== 'github') {
				// Do not run repo fetch for non-GitHub platforms
				if (repoStatus)
					repoStatus.textContent =
						chrome?.i18n.getMessage('repoFilteringGithubOnly') || 'Repository filtering is only available for GitHub.';
				return;
			}
			if (!useRepoFilter.checked) {
				return;
			}

			if (repoStatus) {
				repoStatus.textContent = chrome?.i18n.getMessage('repoRefetching');
			}

			try {
				const cacheData = await new Promise((resolve) => {
					chrome?.storage.local.get(['repoCache'], resolve);
				});
				const items = await new Promise((resolve) => {
					chrome?.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
				});

				const platform = items.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				const username = items[platformUsernameKey];

				if (!username) {
					if (repoStatus) {
						repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
					}
					return;
				}

				if (window.fetchUserRepositories) {
					const repos = await window.fetchUserRepositories(username, items.githubToken, items.orgName || '');

					availableRepos = repos;

					if (repoStatus) {
						repoStatus.textContent = chrome?.i18n.getMessage('repoLoaded', [repos.length]);
					}

					const repoCacheKey = `repos-${username}-${items.orgName || ''}`;
					chrome?.storage.local.set({
						repoCache: {
							data: repos,
							cacheKey: repoCacheKey,
							timestamp: Date.now(),
						},
					});

					if (document.activeElement === repoSearch) {
						filterAndDisplayRepos(repoSearch.value.toLowerCase());
					} else if (repoSearch.value) {
						filterAndDisplayRepos(repoSearch.value.toLowerCase());
					} else {
						filterAndDisplayRepos('');
					}
				}
			} catch (err) {
				if (repoStatus) {
					repoStatus.textContent = `${chrome?.i18n.getMessage('errorLabel')}: ${err.message || chrome?.i18n.getMessage('repoRefetchFailed')}`;
				}
			}
		}

		window.triggerRepoFetchIfEnabled = triggerRepoFetchIfEnabled;

		browser.storage.local
			.get(['selectedRepos', 'useRepoFilter'])
			.then((items) => {
				if (items.selectedRepos) {
					selectedRepos = items.selectedRepos;
					updateRepoDisplay();
				}
				if (items.useRepoFilter) {
					useRepoFilter.checked = items.useRepoFilter;
					repoFilterContainer.classList.toggle('hidden', !items.useRepoFilter);
					if (items.useRepoFilter && window.triggerRepoFetchIfEnabled) {
						setTimeout(() => window.triggerRepoFetchIfEnabled(), 100);
					}
				}
			})
			.catch((error) => {
				console.warn('Error loading repo filter settings:', error);
			});

		useRepoFilter.addEventListener(
			'change',
			debounce(async () => {
				// --- PLATFORM CHECK: Only run for GitHub ---
				let platform = 'github';
				try {
					const items = await new Promise((resolve) => {
						chrome?.storage.local.get(['platform'], resolve);
					});
					platform = items.platform || 'github';
				} catch { }
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
					repoFilterContainer.classList.add('hidden'); // Explicitly hide the container
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

				chrome?.storage.local.set({
					useRepoFilter: enabled,
					githubCache: null, //forces refresh
				});
				checkTokenForFilter();
				if (enabled) {
					repoStatus.textContent =
						chrome?.i18n.getMessage('loadingReposAutomatically') || 'Loading repos automatically...';

					try {
						const cacheData = await new Promise((resolve) => {
							chrome?.storage.local.get(['repoCache'], resolve);
						});
						const items = await new Promise((resolve) => {
							chrome?.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
						});

						const platform = items.platform || 'github';
						const platformUsernameKey = `${platform}Username`;
						const username = items[platformUsernameKey];

						if (!username) {
							repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
							return;
						}

						const repoCacheKey = `repos-${username}-${items.orgName || ''}`;

						const now = Date.now();
						const cacheAge = cacheData.repoCache?.timestamp
							? now - cacheData.repoCache.timestamp
							: Number.POSITIVE_INFINITY;
						const cacheTTL = 10 * 60 * 1000; // 10 minutes

						if (cacheData.repoCache && cacheData.repoCache.cacheKey === repoCacheKey && cacheAge < cacheTTL) {
							console.log('Using cached repositories');
							availableRepos = cacheData.repoCache.data;
							repoStatus.textContent = chrome?.i18n.getMessage('repoLoaded', [availableRepos.length]);

							if (document.activeElement === repoSearch) {
								filterAndDisplayRepos(repoSearch.value.toLowerCase());
							}
							return;
						}

						if (window.fetchUserRepositories) {
							const repos = await window.fetchUserRepositories(username, items.githubToken, items.orgName || '');
							availableRepos = repos;
							repoStatus.textContent = chrome?.i18n.getMessage('repoLoaded', [repos.length]);

							chrome?.storage.local.set({
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
							repoStatus.textContent = chrome?.i18n.getMessage('repoTokenPrivate');
						} else if (err.message?.includes('username')) {
							repoStatus.textContent = chrome?.i18n.getMessage('githubUsernamePlaceholder');
						} else {
							repoStatus.textContent = `${chrome?.i18n.getMessage('errorLabel')}: ${err.message || chrome?.i18n.getMessage('repoLoadFailed')}`;
						}
					}
				} else {
					selectedRepos = [];
					updateRepoDisplay();
					chrome?.storage.local.set({ selectedRepos: [] });
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



		function debugRepoFetch() {
			browser.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName']).then((items) => {
				const platform = items.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				const username = items[platformUsernameKey];
				console.log('Current settings:', {
					username: username,
					hasToken: !!items.githubToken,
					org: items.orgName || '',
				});
			});
		}
		debugRepoFetch();
		async function loadRepos() {
			// --- PLATFORM CHECK: Only run for GitHub ---
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome?.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch { }
			if (platform !== 'github') {
				if (repoStatus)
					repoStatus.textContent =
						chrome?.i18n.getMessage('repoLoadingGithubOnly') || 'Repository loading is only available for GitHub.';
				return;
			}
			console.log('window.fetchUserRepositories exists:', !!window.fetchUserRepositories);
			console.log(
				'Available functions:',
				Object.keys(window).filter((key) => key.includes('fetch')),
			);

			if (!window.fetchUserRepositories) {
				repoStatus.textContent = 'Repository fetching not available';
				return;
			}

			browser.storage.local.get(['platform', 'githubUsername', 'githubToken']).then((items) => {
				const platform = items.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				const username = items[platformUsernameKey];
				console.log('Storage data for repo fetch:', {
					hasUsername: !!username,
					hasToken: !!items.githubToken,
					username: username,
				});

				if (!username) {
					repoStatus.textContent = chrome?.i18n.getMessage('usernameMissingError') || 'Username required';
					return;
				}

				performRepoFetch();
			});
		}

		async function performRepoFetch() {
			// --- PLATFORM CHECK: Only run for GitHub ---
			let platform = 'github';
			try {
				const items = await browser.storage.local.get(['platform']);
				platform = items.platform || 'github';
			} catch (e) { }
			if (platform !== 'github') {
				if (repoStatus)
					repoStatus.textContent =
						chrome?.i18n.getMessage('repoFetchingGithubOnly') || 'Repository fetching is only available for GitHub.';
				return;
			}
			console.log('[POPUP-DEBUG] performRepoFetch called.');
			repoStatus.textContent = chrome?.i18n.getMessage('repoLoading');
			repoSearch.classList.add('repository-search-loading');

			try {
				const cacheData = await new Promise((resolve) => {
					chrome?.storage.local.get(['repoCache'], resolve);
				});
				const storageItems = await new Promise((resolve) => {
					chrome?.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
				});
				const platform = storageItems.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				const username = storageItems[platformUsernameKey];
				const repoCacheKey = `repos-${username}-${storageItems.orgName || ''}`;
				const now = Date.now();
				const cacheAge = cacheData.repoCache?.timestamp
					? now - cacheData.repoCache.timestamp
					: Number.POSITIVE_INFINITY;
				const cacheTTL = 10 * 60 * 1000; // 10 minutes

				console.log('[POPUP-DEBUG] Repo cache check:', {
					key: repoCacheKey,
					cacheKeyInCache: cacheData.repoCache?.cacheKey,
					isMatch: cacheData.repoCache?.cacheKey === repoCacheKey,
					age: cacheAge,
					isFresh: cacheAge < cacheTTL,
				});

				if (cacheData.repoCache && cacheData.repoCache.cacheKey === repoCacheKey && cacheAge < cacheTTL) {
					console.log('[POPUP-DEBUG] Using cached repositories in manual fetch');
					availableRepos = cacheData.repoCache.data;
					repoStatus.textContent = chrome?.i18n.getMessage('repoLoaded', [availableRepos.length]);

					if (document.activeElement === repoSearch) {
						filterAndDisplayRepos(repoSearch.value.toLowerCase());
					}
					return;
				}
				console.log('[POPUP-DEBUG] No valid cache. Fetching from network.');
				availableRepos = await window.fetchUserRepositories(
					username,
					storageItems.githubToken,
					storageItems.orgName || '',
				);
				repoStatus.textContent = chrome?.i18n.getMessage('repoLoaded', [availableRepos.length]);
				console.log(`[POPUP-DEBUG] Fetched and loaded ${availableRepos.length} repos.`);

				chrome?.storage.local.set({
					repoCache: {
						data: availableRepos,
						cacheKey: repoCacheKey,
						timestamp: now,
					},
				});

				if (document.activeElement === repoSearch) {
					filterAndDisplayRepos(repoSearch.value.toLowerCase());
				}
			} catch (err) {
				console.error(`Failed to load repos:`, err);

				if (err.message && err.message.includes('401')) {
					repoStatus.textContent = chrome?.i18n.getMessage('repoTokenPrivate');
				} else if (err.message && err.message.includes('username')) {
					repoStatus.textContent = chrome?.i18n.getMessage('githubUsernamePlaceholder');
				} else {
					repoStatus.textContent = `${chrome?.i18n.getMessage('errorLabel')}: ${err.message || chrome?.i18n.getMessage('repoLoadFailed')}`;
				}
			} finally {
				repoSearch.classList.remove('repository-search-loading');
			}
		}

		function filterAndDisplayRepos(query) {
			if (availableRepos.length === 0) {
				repoDropdown.textContent = '';
				const loadingDiv = document.createElement('div');
				loadingDiv.className = 'p-3 text-center text-gray-500 text-sm';
				loadingDiv.textContent = browser.i18n.getMessage('repoLoading');
				repoDropdown.appendChild(loadingDiv);
				showDropdown();
				return;
			}

			const filtered = availableRepos.filter((repo) => {
				if (selectedRepos.includes(repo.fullName)) {
					return false;
				}
				if (!query) {
					return true;
				}
				return repo.name.toLowerCase().includes(query) || repo.description?.toLowerCase().includes(query);
			});

			if (filtered.length === 0) {
				repoDropdown.textContent = '';
				const notFoundDiv = document.createElement('div');
				notFoundDiv.className = 'p-3 text-center text-gray-500 text-sm';
				notFoundDiv.style.paddingLeft = '10px';
				notFoundDiv.textContent = browser.i18n.getMessage('repoNotFound');
				repoDropdown.appendChild(notFoundDiv);
			} else {
				repoDropdown.textContent = '';
				const fragment = document.createDocumentFragment();

				filtered.slice(0, 10).forEach((repo) => {
					const item = document.createElement('div');
					item.className = 'repository-dropdown-item';
					item.dataset.repoName = repo.fullName || '';

					const repoNameDiv = document.createElement('div');
					repoNameDiv.className = 'repo-name';

					const nameSpan = document.createElement('span');
					nameSpan.textContent = repo.name || '';
					repoNameDiv.appendChild(nameSpan);

					if (repo.language) {
						const langSpan = document.createElement('span');
						langSpan.className = 'repo-language';
						langSpan.textContent = repo.language;
						repoNameDiv.appendChild(langSpan);
					}

					if (repo.stars || repo.stars === 0) {
						const starsSpan = document.createElement('span');
						starsSpan.className = 'repo-stars';
						const starIcon = document.createElement('i');
						starIcon.className = 'fa fa-star';
						starsSpan.appendChild(starIcon);
						starsSpan.appendChild(document.createTextNode(' ' + (repo.stars || 0)));
						repoNameDiv.appendChild(starsSpan);
					}

					item.appendChild(repoNameDiv);

					const repoInfoDiv = document.createElement('div');
					repoInfoDiv.className = 'repo-info';
					if (repo.description) {
						const descSpan = document.createElement('span');
						descSpan.className = 'repo-desc';
						let desc = String(repo.description).substring(0, 50);
						if (repo.description.length > 50) desc += '...';
						descSpan.textContent = desc;
						repoInfoDiv.appendChild(descSpan);
					}

					item.appendChild(repoInfoDiv);
					fragment.appendChild(item);
				});

				repoDropdown.appendChild(fragment);

				repoDropdown.querySelectorAll('.repository-dropdown-item').forEach((item) => {
					item.addEventListener('click', (e) => {
						e.stopPropagation();
						fnSelectedRepos(item.dataset.repoName);
					});
				});
			}
			highlightedIndex = -1;
			showDropdown();
		}

		function fnSelectedRepos(repoFullName) {
			if (!selectedRepos.includes(repoFullName)) {
				selectedRepos.push(repoFullName);
				updateRepoDisplay();
				saveRepoSelection();
			}

			repoSearch.value = '';
			filterAndDisplayRepos('');
			programmaticFocus = true;
			repoSearch.focus();
		}

		function removeRepo(repoFullName) {
			selectedRepos = selectedRepos.filter((name) => name !== repoFullName);
			updateRepoDisplay();
			saveRepoSelection();

			if (repoSearch.value) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			}
		}

		function updateRepoDisplay() {
			repoTags.textContent = '';
			if (selectedRepos.length === 0) {
				const placeholder = document.createElement('span');
				placeholder.className = 'text-xs text-gray-500 select-none';
				placeholder.id = 'repoPlaceholder';
				placeholder.textContent = browser.i18n.getMessage('repoPlaceholder');
				repoTags.appendChild(placeholder);
				repoCount.textContent = browser.i18n.getMessage('repoCountNone');
			} else {
				const fragment = document.createDocumentFragment();
				selectedRepos.forEach((repoFullName) => {
					const repoName = repoFullName.split('/')[1] || repoFullName;

					const tag = document.createElement('span');
					tag.className =
						'inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full';
					tag.style.margin = '5px';

					const nameNode = document.createTextNode(repoName);
					tag.appendChild(nameNode);

					const removeBtn = document.createElement('button');
					removeBtn.type = 'button';
					removeBtn.className = 'ml-1 text-blue-600 hover:text-blue-800 remove-repo-btn cursor-pointer';
					removeBtn.dataset.repoName = repoFullName;

					const icon = document.createElement('i');
					icon.className = 'fa fa-times';
					removeBtn.appendChild(icon);

					removeBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						const repoFullName = removeBtn.dataset.repoName;
						removeRepo(repoFullName);
					});

					tag.appendChild(removeBtn);
					fragment.appendChild(tag);
				});

				repoTags.appendChild(fragment);
				repoCount.textContent = browser.i18n.getMessage('repoCount', [selectedRepos.length]);
			}
		}

		function saveRepoSelection() {
			const cleanedRepos = selectedRepos.filter((repo) => repo !== null);
			chrome?.storage.local.set({
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
	}

	// Ensure GitLab DOM elements are declared before use to avoid undefined references
	const gitlabProjectSearch = document.getElementById('gitlabProjectSearch');
	const gitlabProjectDropdown = document.getElementById('gitlabProjectDropdown');
	const gitlabProjectTags = document.getElementById('gitlabProjectTags');
	const gitlabProjectCount = document.getElementById('gitlabProjectCount');
	const gitlabProjectStatus = document.getElementById('gitlabProjectStatus');
	const useGitlabProjectFilter = document.getElementById('useGitlabProjectFilter');
	const gitlabProjectFilterContainer = document.getElementById('gitlabProjectFilterContainer');

	
	const customDropdown = document.getElementById('customPlatformDropdown');
	const dropdownBtn = document.getElementById('platformDropdownBtn');
	const dropdownList = document.getElementById('platformDropdownList');
	const dropdownSelected = document.getElementById('platformDropdownSelected');

	if (platformSelect) {
		platformSelect.addEventListener('change', () => {
			const platform = platformSelect.value;
			browser.storage.local.set({ platform }).then(() => {
				const scrumReport = document.getElementById('scrumReport');
				if (scrumReport) {
					scrumReport.innerHTML = '';
				}
				const generateBtn = document.getElementById('generateReport');
				if (typeof bootstrapScrumReportOnPopupLoad === 'function') {
					bootstrapScrumReportOnPopupLoad(generateBtn);
				}
			});
			const platformUsername = document.getElementById('platformUsername');
			if (platformUsername) {
				const currentPlatform = platformSelect.value === 'github' ? 'gitlab' : 'github';
				const currentUsername = platformUsername.value;
				if (currentUsername.trim()) {
					browser.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
				}
			}

			browser.storage.local.get([`${platform}Username`]).then((result) => {
				if (platformUsername) {
					platformUsername.value = result[`${platform}Username`] || '';
					window.updateGenerateButtonState && window.updateGenerateButtonState();
				}
			});

			updatePlatformUI(platform);
			currentStoredPlatform = platform;
			if (window.triggerGitLabProjectFetchIfEnabled) window.triggerGitLabProjectFetchIfEnabled();
		});
	}

	function setPlatformDropdown(value) {
		const platformUsername = document.getElementById('platformUsername');
		if (platformUsername) {
			const currentPlatform = platformSelect.value;
			const currentUsername = platformUsername.value;
			if (currentUsername.trim()) {
				browser.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
			}
		}

		platformSelect.value = value;
		if (value === 'gitlab') {
			dropdownSelected.innerHTML = '<i class="fab fa-gitlab" style="margin-right:8px;"></i> GitLab';
		} else {
			dropdownSelected.innerHTML = '<i class="fab fa-github" style="margin-right:8px;"></i> GitHub';
		}

		browser.storage.local.set({ platform: value }).then(() => {
			const scrumReport = document.getElementById('scrumReport');
			if (scrumReport) scrumReport.innerHTML = '';

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
		currentStoredPlatform = value;
	}

	dropdownBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		customDropdown.classList.toggle('open');
		dropdownList.classList.toggle('hidden');
	});

	dropdownList.querySelectorAll('li').forEach((item) => {
		item.addEventListener('click', function () {
			const newPlatform = this.getAttribute('data-value');

			if (newPlatform !== currentStoredPlatform) {
				setPlatformDropdown(newPlatform);
			}

			customDropdown.classList.remove('open');
			dropdownList.classList.add('hidden');
		});
	});



	dropdownBtn.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			customDropdown.classList.add('open');
			dropdownList.classList.remove('hidden');
			dropdownList.querySelector('li').focus();
		}
	});

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

				if (newPlatform !== currentStoredPlatform) {
					setPlatformDropdown(newPlatform);
				}

				customDropdown.classList.remove('open');
				dropdownList.classList.add('hidden');
				dropdownBtn.focus();
			}
		});
	});

	if (!gitlabProjectSearch || !useGitlabProjectFilter) {
		console.log('GitLab project filter elements not found in DOM');
	} else {
		let availableGitlabProjects = [];
		let selectedGitlabProjects = [];
		let gitlabHighlightedIndex = -1;
		let gitlabProjectDelegateAttached = false;


		window.fetchUserProjects = async function (username, token) {
			if (typeof window.GitLabHelper === 'undefined') {
				console.warn('GitLabHelper not available in this context');
				return [];
			}
			try {
				const helper = new window.GitLabHelper(token);
				return await helper.fetchUserProjects(username);
			} catch (err) {
				console.error('fetchUserProjects failed', err);
				return [];
			}
		};
		let gitlabProjectClickListenerAttached = false;

		async function triggerGitLabProjectFetchIfEnabled() {
			let platform = 'github';
			try {
				try {
					const items = await browser.storage.local.get(['platform']);
					platform = items.platform || 'github';
				} catch (e) {
					console.warn('Failed to read platform from storage; using default "github".', e);
				}

				if (platform !== 'gitlab') {
					if (gitlabProjectStatus) gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectOnlyGitLab');
					return;
				}

				if (!useGitlabProjectFilter || !useGitlabProjectFilter.checked) {
					// Filter disabled or element missing
					return;
				}

				if (gitlabProjectStatus) {
					gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectFetching');
				}

				try {
					const items = await browser.storage.local.get(['platform', 'gitlabUsername', 'gitlabToken']);

					const username = items && items.gitlabUsername;

					if (!username) {
						if (gitlabProjectStatus) {
							gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectUsernameRequired');
						}
						return;
					}

					if (window.fetchUserProjects) {
						const projects = await window.fetchUserProjects(username, items ? items.gitlabToken : null);
						availableGitlabProjects = projects || [];

						if (gitlabProjectStatus) {
							gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectLoaded', [
								String(availableGitlabProjects.length),
							]);
						}
					}
				} catch (err) {
					console.error('Auto load GitLab projects failed', err);
					if (gitlabProjectStatus) {
						if (err && err.message && err.message.includes('401')) {
							gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectTokenRequired');
						} else if (err && err.message && err.message.includes('username')) {
							gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectUsernameRequired');
						} else {
							gitlabProjectStatus.textContent = `Error: ${err && err.message ? err.message : chrome?.i18n.getMessage('gitlabProjectLoadFailed')}`;
						}
					}
				}
			} catch (outerErr) {
				// Catch any unexpected errors in the outer function scope
				console.error('triggerGitLabProjectFetchIfEnabled failed', outerErr);
				if (gitlabProjectStatus) {
					gitlabProjectStatus.textContent = `Error: ${outerErr && outerErr.message ? outerErr.message : chrome?.i18n.getMessage('gitlabProjectLoadFailed')}`;
				}
			}
		}

		// Expose the function so it can be invoked from other handlers,
		// ensuring it is not considered unused by static analysis.
		window.triggerGitLabProjectFetchIfEnabled = triggerGitLabProjectFetchIfEnabled;

		useGitlabProjectFilter.addEventListener(
			'change',
			debounce(async function () {
				const isChecked = this.checked;

				if (isChecked) {
					// Require a GitLab token before enabling project filtering to avoid
					// silently loading 0 projects with no explanation.
					if (!gitlabTokenInput || !gitlabTokenInput.value || gitlabTokenInput.value.trim() === '') {
						// Revert the toggle since we cannot enable filtering without a token.
						this.checked = false;
						gitlabProjectFilterContainer.classList.add('hidden');
						hideGitLabProjectDropdown();
						const gitlabTokenWarning = document.getElementById('gitlabTokenWarningForFilter');
						if (gitlabTokenWarning) {
							gitlabTokenWarning.classList.remove('hidden');
							gitlabTokenWarning.classList.add('shake-animation');
							setTimeout(() => gitlabTokenWarning.classList.remove('shake-animation'), 620);
							setTimeout(() => {
								gitlabTokenWarning.classList.add('hidden');
							}, 3000);
						}
						return;
					}
					gitlabProjectFilterContainer.classList.remove('hidden');
					if (availableGitlabProjects.length === 0) {
						await loadGitLabProjects();
					}
					browser.storage.local.set({ useGitlabProjectFilter: true });
				} else {
					gitlabProjectFilterContainer.classList.add('hidden');
					selectedGitlabProjects = [];
					updateGitLabProjectDisplay();
					browser.storage.local.set({ selectedGitlabProjects: [] });
					gitlabProjectStatus.textContent = '';
					browser.storage.local.set({ useGitlabProjectFilter: false });
				}
			}, 300),
		);

		gitlabProjectSearch.addEventListener('keydown', (e) => {
			const items = gitlabProjectDropdown.querySelectorAll('.gitlab-project-dropdown-item');

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					gitlabHighlightedIndex = Math.min(gitlabHighlightedIndex + 1, items.length - 1);
					updateGitLabHighlight(items);
					break;
				case 'ArrowUp':
					e.preventDefault();
					gitlabHighlightedIndex = Math.max(gitlabHighlightedIndex - 1, 0);
					updateGitLabHighlight(items);
					break;
				case 'Enter':
					e.preventDefault();
					if (gitlabHighlightedIndex >= 0 && items[gitlabHighlightedIndex]) {
						addGitLabProject(items[gitlabHighlightedIndex].dataset.projectId);
					}
					break;
				case 'Escape':
					hideGitLabProjectDropdown();
					break;
			}
		});

		gitlabProjectSearch.addEventListener('input', (e) => {
			const query = e.target.value.toLowerCase();
			filterAndDisplayGitLabProjects(query);
		});

		let programmaticGitlabFocus = false;
		gitlabProjectSearch.addEventListener('focus', () => {
			if (programmaticGitlabFocus) {
				programmaticGitlabFocus = false;
				return;
			}
			if (gitlabProjectSearch.value) {
				filterAndDisplayGitLabProjects(gitlabProjectSearch.value.toLowerCase());
			} else if (availableGitlabProjects.length > 0) {
				filterAndDisplayGitLabProjects('');
			}
		});



		async function loadGitLabProjects() {
			let platform = 'github';
			try {
				const items = await browser.storage.local.get(['platform']);
				platform = items.platform || 'github';
			} catch (e) {
				console.error('Failed to retrieve platform from browser.storage.local, defaulting to "github".', e);
			}
			if (platform !== 'gitlab') {
				if (gitlabProjectStatus) gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectOnlyGitLab');
				return;
			}

			if (!window.fetchUserProjects) {
				gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectFetchNotAvailable');
				return;
			}

			try {
				const items = await browser.storage.local.get(['gitlabUsername', 'gitlabToken']);
				const username = items.gitlabUsername;

				if (!username) {
					gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectUsernameRequired');
					return;
				}

				await performGitLabProjectFetch();
			} catch (e) {
				console.error('[GitLab Projects] Error loading from storage:', e);
				gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectFetchError');
			}
		}

		async function performGitLabProjectFetch() {
			let platform = 'github';
			try {
				const items = await browser.storage.local.get(['platform']);
				platform = items.platform || 'github';
			} catch (e) {
				console.error('Failed to retrieve platform from browser.storage.local, defaulting to "github".', e);
			}
			if (platform !== 'gitlab') {
				if (gitlabProjectStatus) gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectOnlyGitLab');
				return;
			}

			gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectLoading');
			gitlabProjectSearch.classList.add('repository-search-loading');

			try {
				const storageItems = await browser.storage.local.get(['platform', 'gitlabUsername', 'gitlabToken']);
				const username = storageItems.gitlabUsername;

				if (!username) {
					gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectUsernameRequired');
					gitlabProjectSearch.classList.remove('repository-search-loading');
					return;
				}

				if (window.fetchUserProjects) {
					const projects = await window.fetchUserProjects(username, storageItems.gitlabToken);
					availableGitlabProjects = projects;
					gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectLoaded', [String(projects.length)]);
					gitlabProjectSearch.classList.remove('repository-search-loading');

					if (document.activeElement === gitlabProjectSearch) {
						filterAndDisplayGitLabProjects(gitlabProjectSearch.value.toLowerCase());
					}
				}
			} catch (err) {
				console.error('GitLab project fetch failed', err);
				gitlabProjectSearch.classList.remove('repository-search-loading');

				if (err.message && err.message.includes('401')) {
					gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectTokenRequired');
				} else if (err.message && err.message.includes('username')) {
					gitlabProjectStatus.textContent = chrome?.i18n.getMessage('gitlabProjectUsernameRequired');
				} else {
					gitlabProjectStatus.textContent = `Error: ${err && err.message ? err.message : chrome?.i18n.getMessage('gitlabProjectLoadFailed')}`;
				}
			}
		}

		function filterAndDisplayGitLabProjects(query) {
			if (availableGitlabProjects.length === 0) {
				gitlabProjectDropdown.textContent = '';
				const noProjDiv = document.createElement('div');
				noProjDiv.className = 'p-3 text-gray-500 text-sm';
				noProjDiv.textContent = chrome?.i18n.getMessage('gitlabProjectNoneAvailable');
				gitlabProjectDropdown.appendChild(noProjDiv);
				showGitLabProjectDropdown();
				if (!gitlabProjectClickListenerAttached) {
					gitlabProjectClickListenerAttached = true;
					gitlabProjectDropdown.addEventListener(
						'click',
						async () => {
							await loadGitLabProjects();
							if (gitlabProjectSearch.value) {
								filterAndDisplayGitLabProjects(gitlabProjectSearch.value.toLowerCase());
							}
							// allow re-attaching after handler runs
							gitlabProjectClickListenerAttached = false;
						},
						{ once: true },
					);
				}
				return;
			}

			const filtered = availableGitlabProjects.filter((proj) => {
				if (selectedGitlabProjects.includes(proj.id.toString())) return false;
				if (!query) return true;
				const name = (proj.name || '').toLowerCase();
				const pathNs = (proj.path_with_namespace || proj.path || '').toLowerCase();
				const desc = (proj.description || '').toLowerCase();
				return name.includes(query) || pathNs.includes(query) || desc.includes(query);
			});

			if (filtered.length === 0) {
				gitlabProjectDropdown.textContent = '';
				const noMatchDiv = document.createElement('div');
				noMatchDiv.className = 'p-3 text-gray-500 text-sm';
				noMatchDiv.textContent = chrome?.i18n.getMessage('gitlabProjectNoMatch');
				gitlabProjectDropdown.appendChild(noMatchDiv);
				showGitLabProjectDropdown();
				return;
			}

			// Limit number of rendered projects to avoid huge DOMs and many listeners
			const MAX_GITLAB_RESULTS = 50;
			const toRender = filtered.slice(0, MAX_GITLAB_RESULTS);
			const remaining = filtered.length - toRender.length;

			// Build dropdown items using safe DOM methods to avoid innerHTML/XSS
			gitlabProjectDropdown.textContent = '';
			const fragment = document.createDocumentFragment();

			toRender.forEach((proj) => {
				const item = document.createElement('div');
				item.className = 'repository-dropdown-item gitlab-project-dropdown-item';
				item.dataset.projectId = String(proj.id);

				const repoNameDiv = document.createElement('div');
				repoNameDiv.className = 'repo-name';

				const nameSpan = document.createElement('span');
				nameSpan.textContent = proj.name || '';
				repoNameDiv.appendChild(nameSpan);

				if (proj.language) {
					const langSpan = document.createElement('span');
					langSpan.className = 'repo-language';
					langSpan.textContent = proj.language;
					repoNameDiv.appendChild(langSpan);
				}

				const starsSpan = document.createElement('span');
				starsSpan.className = 'repo-stars';
				const starIcon = document.createElement('i');
				starIcon.className = 'fa fa-star';
				starsSpan.appendChild(starIcon);
				starsSpan.appendChild(document.createTextNode(' ' + (proj.star_count || 0)));
				repoNameDiv.appendChild(starsSpan);

				item.appendChild(repoNameDiv);

				// Second row: namespace/project path (mirrors GitHub's owner/repo identifier)
				const repoInfoDiv = document.createElement('div');
				repoInfoDiv.className = 'repo-info';
				const pathSpan = document.createElement('span');
				pathSpan.textContent = proj.path_with_namespace || proj.path || '';
				repoInfoDiv.appendChild(pathSpan);
				item.appendChild(repoInfoDiv);

				if (proj.description) {
					const descDiv = document.createElement('div');
					descDiv.className = 'repo-info';
					let desc = String(proj.description).substring(0, 50);
					if (proj.description.length > 50) desc += '...';
					descDiv.textContent = desc;
					item.appendChild(descDiv);
				}

				fragment.appendChild(item);
			});

			gitlabProjectDropdown.appendChild(fragment);

			if (remaining > 0) {
				const moreDiv = document.createElement('div');
				moreDiv.className = 'p-2 text-sm text-gray-500';
				moreDiv.textContent = `+${remaining} more â€” refine search to see more`;
				gitlabProjectDropdown.appendChild(moreDiv);
			}

			// Use event delegation to handle clicks with a single listener
			if (!gitlabProjectDelegateAttached) {
				gitlabProjectDelegateAttached = true;
				gitlabProjectDropdown.addEventListener('click', (e) => {
					const item = e.target.closest('.gitlab-project-dropdown-item');
					if (!item) return;
					e.stopPropagation();
					const projectId = item.dataset.projectId;
					addGitLabProject(projectId);
				});
			}

			gitlabHighlightedIndex = -1;
			showGitLabProjectDropdown();
		}

		function addGitLabProject(projectId) {
			if (!selectedGitlabProjects.includes(projectId)) {
				selectedGitlabProjects.push(projectId);
				updateGitLabProjectDisplay();
				saveGitLabProjectSelection();
			}

			gitlabProjectSearch.value = '';
			filterAndDisplayGitLabProjects('');
			programmaticGitlabFocus = true;
			gitlabProjectSearch.focus();
		}

		function removeGitLabProject(projectId) {
			selectedGitlabProjects = selectedGitlabProjects.filter((id) => id !== projectId);
			updateGitLabProjectDisplay();
			saveGitLabProjectSelection();

			if (gitlabProjectSearch.value) {
				filterAndDisplayGitLabProjects(gitlabProjectSearch.value.toLowerCase());
			}
		}

		function updateGitLabProjectDisplay() {
			gitlabProjectTags.textContent = '';
			if (selectedGitlabProjects.length === 0) {
				const placeholder = document.createElement('span');
				placeholder.className = 'text-xs text-gray-500 select-none';
				placeholder.id = 'gitlabProjectPlaceholder';
				placeholder.textContent = browser.i18n.getMessage('gitlabProjectPlaceholder') || 'No projects selected';
				gitlabProjectTags.appendChild(placeholder);
				gitlabProjectCount.textContent = browser.i18n.getMessage('gitlabProjectCountNone') || '0 projects';
			} else {
				const fragment = document.createDocumentFragment();
				selectedGitlabProjects.forEach((projectId) => {
					const project = availableGitlabProjects.find((p) => p.id.toString() === projectId);
					const projectName = project ? project.name || projectId : projectId;

					const tag = document.createElement('span');
					tag.className =
						'inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full';
					tag.style.margin = '5px';

					const nameNode = document.createTextNode(projectName);
					tag.appendChild(nameNode);

					const removeBtn = document.createElement('button');
					removeBtn.type = 'button';
					removeBtn.className = 'ml-1 text-blue-600 hover:text-blue-800 remove-gitlab-project-btn cursor-pointer';
					removeBtn.dataset.projectId = projectId;

					const icon = document.createElement('i');
					icon.className = 'fa fa-times';
					removeBtn.appendChild(icon);

					removeBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						const projectId = removeBtn.dataset.projectId;
						removeGitLabProject(projectId);
					});

					tag.appendChild(removeBtn);
					fragment.appendChild(tag);
				});

				gitlabProjectTags.appendChild(fragment);
				gitlabProjectCount.textContent =
					browser.i18n.getMessage('gitlabProjectCount', [selectedGitlabProjects.length]) ||
					`${selectedGitlabProjects.length} projects`;
			}
		}

		function saveGitLabProjectSelection() {
			const cleanedProjects = selectedGitlabProjects.filter((proj) => proj !== null);
			browser.storage.local.set({
				selectedGitlabProjects: cleanedProjects,
				gitlabCache: null,
			});
		}

		function updateGitLabHighlight(items) {
			items.forEach((item, index) => {
				item.classList.toggle('highlighted', index === gitlabHighlightedIndex);
			});

			if (gitlabHighlightedIndex >= 0 && items[gitlabHighlightedIndex]) {
				items[gitlabHighlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}

		window.removeGitLabProject = removeGitLabProject;

		// Load saved projects on init
		browser.storage.local.get([]).then((items) => {
			const username = items.gitlabUsername;

			if (items.selectedGitlabProjects) {
				selectedGitlabProjects = items.selectedGitlabProjects;
				updateGitLabProjectDisplay();
			}

			if (items.useGitlabProjectFilter) {
				useGitlabProjectFilter.checked = true;
				gitlabProjectFilterContainer.classList.remove('hidden');
			}

			if (username && useGitlabProjectFilter.checked && availableGitlabProjects.length === 0) {
				setTimeout(() => loadGitLabProjects(), 1000);
			}
		});
	}

	const cacheInput = document.getElementById('cacheInput');
	if (cacheInput) {
		browser.storage.local.get([]).then((result) => {
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

	let currentStoredPlatform = 'github';

	browser.storage.local.get(['platform']).then((result) => {
		const platform = result.platform || 'github';
		currentStoredPlatform = platform;
		console.log('Initialized currentStoredPlatform:', currentStoredPlatform);

		platformSelect.value = platform;
		updatePlatformUI(platform);

		const platformUsername = document.getElementById('platformUsername');
		if (platformUsername) {
			const platformUsernameKey = `${platform}Username`;
			platformUsername.value = result[platformUsernameKey] || '';
		}
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
				startDateInput.readOnly = false;
				endDateInput.readOnly = false;

				browser.storage.local.set({
					yesterdayContribution: false,
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

	document.getElementById('refreshCache').addEventListener('click', async function () {
		const originalText = this.innerHTML;

		this.classList.add('loading');
		this.innerHTML = `<i class="fa fa-refresh fa-spin"></i><span>${browser.i18n.getMessage('refreshingButton')}</span>`;
		this.disabled = true;

		try {
			// Clear all caches
			const keysToRemove = ['githubCache', 'repoCache', 'gitlabCache'];
			await browser.storage.local.remove(keysToRemove);

			// Clear the scrum report
			const scrumReport = document.getElementById('scrumReport');
			if (scrumReport) {
				scrumReport.textContent = '';
				const messageElement = document.createElement('p');
				messageElement.style.textAlign = 'center';
				messageElement.style.color = '#666';
				messageElement.style.padding = '20px';
				messageElement.textContent = browser.i18n.getMessage('cacheClearedMessage');
				scrumReport.appendChild(messageElement);
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

	function toggleRadio(radio) {
		const startDateInput = document.getElementById('startingDate');
		const endDateInput = document.getElementById('endingDate');

		console.log('Toggling radio:', radio.id);

		if (radio.id === 'yesterdayContribution') {
			startDateInput.value = getYesterday();
			endDateInput.value = getToday();
		}

		startDateInput.readOnly = endDateInput.readOnly = true;

		browser.storage.local.set(
			{
				startingDate: startDateInput.value,
				endingDate: endDateInput.value,
				yesterdayContribution: radio.id === 'yesterdayContribution',
				selectedTimeframe: radio.id,
				githubCache: null, // Clear cache to force new fetch
			},
			() => {
				console.log('State saved, dates:', {
					start: startDateInput.value,
					end: endDateInput.value,
				});

				triggerRepoFetchIfEnabledGlobal();
			},
		);
	}

	async function triggerRepoFetchIfEnabledGlobal() {
		if (window.triggerRepoFetchIfEnabled) {
			await window.triggerRepoFetchIfEnabled();
		}
	}

	// Validate organization only when user is done typing (on blur)
	function validateOrgOnBlur(org) {
		console.log('[Org Check] Checking organization on blur:', org);
		fetch(`https://api.github.com/orgs/${org}`)
			.then((res) => {
				console.log('[Org Check] Response status for', org, ':', res.status);
				if (res.status === 404) {
					console.log('[Org Check] Organization not found on GitHub:', org);
					const oldToast = document.getElementById('invalid-org-toast');
					if (oldToast) oldToast.parentNode.removeChild(oldToast);
					const toastDiv = document.createElement('div');
					toastDiv.id = 'invalid-org-toast';
					toastDiv.className = 'toast';
					toastDiv.style.background = '#dc2626';
					toastDiv.style.color = '#fff';
					toastDiv.style.fontWeight = 'bold';
					toastDiv.style.padding = '12px 24px';
					toastDiv.style.borderRadius = '8px';
					toastDiv.style.position = 'fixed';
					toastDiv.style.top = '24px';
					toastDiv.style.left = '50%';
					toastDiv.style.transform = 'translateX(-50%)';
					toastDiv.style.zIndex = '9999';
					toastDiv.innerText = browser.i18n.getMessage('orgNotFoundMessage');
					document.body.appendChild(toastDiv);
					setTimeout(() => {
						if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
					}, 3000);
					return;
				}
				const oldToast = document.getElementById('invalid-org-toast');
				if (oldToast) oldToast.parentNode.removeChild(oldToast);
				console.log('[Org Check] Organisation exists on GitHub:', org);
				browser.storage.local.remove(['githubCache', 'repoCache']);
				triggerRepoFetchIfEnabledGlobal();
			})
			.catch((err) => {
				console.log('[Org Check] Error validating organisation:', org, err);
				const oldToast = document.getElementById('invalid-org-toast');
				if (oldToast) oldToast.parentNode.removeChild(oldToast);
				const toastDiv = document.createElement('div');
				toastDiv.id = 'invalid-org-toast';
				toastDiv.className = 'toast';
				toastDiv.style.background = '#dc2626';
				toastDiv.style.color = '#fff';
				toastDiv.style.fontWeight = 'bold';
				toastDiv.style.padding = '12px 24px';
				toastDiv.style.borderRadius = '8px';
				toastDiv.style.position = 'fixed';
				toastDiv.style.top = '24px';
				toastDiv.style.left = '50%';
				toastDiv.style.transform = 'translateX(-50%)';
				toastDiv.style.zIndex = '9999';
				toastDiv.innerText = browser.i18n.getMessage('orgValidationErrorMessage');
				document.body.appendChild(toastDiv);
				setTimeout(() => {
					if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
				}, 3000);
			});
	}
});
