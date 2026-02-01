// Utility function to escape HTML and prevent XSS
function escapeHtml(unsafe) {
	if (typeof unsafe !== 'string') return '';
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
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
		const message = chrome.i18n.getMessage(key);
		if (message) {
			// Use innerHTML to support simple formatting like <b> in tooltips
			if (el.classList.contains('tooltip-bubble') || el.classList.contains('cache-info')) {
				el.innerHTML = message;
			} else {
				el.textContent = message;
			}
		}
	});

	document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
		const key = el.getAttribute('data-i18n-placeholder');
		const message = chrome.i18n.getMessage(key);
		if (message) {
			el.placeholder = message;
		}
	});

	document.querySelectorAll('[data-i18n-title]').forEach((el) => {
		const key = el.getAttribute('data-i18n-title');
		const message = chrome.i18n.getMessage(key);
		if (message) {
			el.title = message;
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	// Apply translations as soon as the DOM is ready
	applyI18n();

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

	const orgInput = document.getElementById('orgInput');

	// GitLab elements
	const gitlabTokenInput = document.getElementById('gitlabToken');
	const toggleGitlabTokenBtn = document.getElementById('toggleGitlabTokenVisibility');
	const gitlabTokenEyeIcon = document.getElementById('gitlabTokenEyeIcon');
	let gitlabTokenVisible = false;

	const platformSelect = document.getElementById('platformSelect');
	const usernameLabel = document.getElementById('usernameLabel');
	const platformUsername = document.getElementById('platformUsername');

	function checkTokenForFilter() {
		const useRepoFilter = document.getElementById('useRepoFilter');
		const githubTokenInput = document.getElementById('githubToken');
		const tokenWarning = document.getElementById('tokenWarningForFilter');
		const repoFilterContainer = document.getElementById('repoFilterContainer');

		if (!useRepoFilter || !githubTokenInput || !tokenWarning || !repoFilterContainer) {
			return;
		}
		const isFilterEnabled = useRepoFilter.checked;
		const hasToken = githubTokenInput.value.trim() !== '';

		if (isFilterEnabled && !hasToken) {
			useRepoFilter.checked = false;
			repoFilterContainer.classList.add('hidden');
			if (typeof hideDropdown === 'function') {
				hideDropdown();
			}
			chrome.storage.local.set({ useRepoFilter: false });
		}
		tokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
		setTimeout(() => {
			tokenWarning.classList.add('hidden');
		}, 4000);
	}

	function checkGitlabTokenForFilter() {
		const useGitlabProjectFilter = document.getElementById('useGitlabProjectFilter');
		const gitlabTokenInput = document.getElementById('gitlabToken');
		const gitlabTokenWarning = document.getElementById('gitlabTokenWarningForFilter');
		const gitlabProjectFilterContainer = document.getElementById('gitlabProjectFilterContainer');

		if (!useGitlabProjectFilter || !gitlabTokenInput || !gitlabTokenWarning || !gitlabProjectFilterContainer) {
			return;
		}
		const isFilterEnabled = useGitlabProjectFilter.checked;
		const hasToken = gitlabTokenInput.value.trim() !== '';

		if (isFilterEnabled && !hasToken) {
			useGitlabProjectFilter.checked = false;
			gitlabProjectFilterContainer.classList.add('hidden');
			if (typeof hideGitlabProjectDropdown === 'function') {
				hideGitlabProjectDropdown();
			}
			chrome.storage.local.set({ useGitlabProjectFilter: false });
		}
		gitlabTokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
		setTimeout(() => {
			gitlabTokenWarning.classList.add('hidden');
		}, 4000);
	}

	chrome.storage.local.get(['darkMode'], (result) => {
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

	githubTokenInput.addEventListener('input', checkTokenForFilter);

	// GitLab token toggle
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

		gitlabTokenInput.addEventListener('input', checkGitlabTokenForFilter);
	}

	darkModeToggle.addEventListener('click', function () {
		body.classList.toggle('dark-mode');
		const isDarkMode = body.classList.contains('dark-mode');
		chrome.storage.local.set({ darkMode: isDarkMode });
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

	function updateContentState(enableToggle) {
		console.log('[DEBUG] updateContentState called with:', enableToggle);
		const elementsToToggle = [
			'startingDate',
			'endingDate',
			'generateReport',
			'copyReport',
			'refreshCache',
			'showOpenLabel',
			'showCommits',
			'onlyIssues',
			'onlyPRs',
			'onlyRevPRs',
			'scrumReport',
			'githubUsername',
			'githubToken',
			'projectName',
			'platformUsername',
			'orgInput',
			'cacheInput',
			'settingsToggle',
			'toggleTokenVisibility',
			'useRepoFilter',
			'repoSearch',
			'platformDropdownBtn',
		];

		const radios = document.querySelectorAll('input[name="timeframe"]');
		const customDateContainer = document.getElementById('customDateContainer');

		elementsToToggle.forEach((id) => {
			const element = document.getElementById(id);
			if (element) {
				element.disabled = !enableToggle;
				if (!enableToggle) {
					element.style.opacity = '0.5';
					element.style.pointerEvents = 'none';
				} else {
					element.style.opacity = '1';
					element.style.pointerEvents = 'auto';
				}
			}
		});

		radios.forEach((radio) => {
			radio.disabled = !enableToggle;
			const label = document.querySelector(`label[for="${radio.id}"]`);
			if (label) {
				if (!enableToggle) {
					label.style.opacity = '0.5';
					label.style.pointerEvents = 'none';
				} else {
					label.style.opacity = '1';
					label.style.pointerEvents = 'auto';
				}
			}
		});

		if (customDateContainer) {
			if (!enableToggle) {
				customDateContainer.style.opacity = '0.5';
				customDateContainer.style.pointerEvents = 'none';
			} else {
				customDateContainer.style.opacity = '1';
				customDateContainer.style.pointerEvents = 'auto';
			}
		}

		// Handle platform dropdown list items
		const platformDropdownList = document.getElementById('platformDropdownList');
		const customPlatformDropdown = document.getElementById('customPlatformDropdown');
		if (platformDropdownList && customPlatformDropdown) {
			if (!enableToggle) {
				customPlatformDropdown.style.opacity = '0.5';
				customPlatformDropdown.style.pointerEvents = 'none';
				// Close dropdown if open
				customPlatformDropdown.classList.remove('open');
				platformDropdownList.classList.add('hidden');
			} else {
				customPlatformDropdown.style.opacity = '1';
				customPlatformDropdown.style.pointerEvents = 'auto';
			}
		}

		// Handle repository filter container and selected repos
		const repoFilterContainer = document.getElementById('repoFilterContainer');
		const selectedRepos = document.getElementById('selectedRepos');
		if (repoFilterContainer) {
			if (!enableToggle) {
				repoFilterContainer.style.opacity = '0.5';
				repoFilterContainer.style.pointerEvents = 'none';
			} else {
				repoFilterContainer.style.opacity = '1';
				repoFilterContainer.style.pointerEvents = 'auto';
			}
		}
		if (selectedRepos) {
			if (!enableToggle) {
				selectedRepos.style.opacity = '0.5';
				selectedRepos.style.pointerEvents = 'none';
				// Disable all remove buttons inside
				const removeButtons = selectedRepos.querySelectorAll('.remove-repo-btn');
				removeButtons.forEach((btn) => {
					btn.disabled = true;
					btn.style.pointerEvents = 'none';
				});
			} else {
				selectedRepos.style.opacity = '1';
				selectedRepos.style.pointerEvents = 'auto';
				const removeButtons = selectedRepos.querySelectorAll('.remove-repo-btn');
				removeButtons.forEach((btn) => {
					btn.disabled = false;
					btn.style.pointerEvents = 'auto';
				});
			}
		}

		// Handle repository dropdown
		const repoDropdown = document.getElementById('repoDropdown');
		if (repoDropdown && !enableToggle) {
			repoDropdown.classList.add('hidden');
		}

		// Handle useRepoFilter label
		const useRepoFilterLabel = document.querySelector('label[for="useRepoFilter"]');
		if (useRepoFilterLabel) {
			if (!enableToggle) {
				useRepoFilterLabel.style.opacity = '0.5';
				useRepoFilterLabel.style.pointerEvents = 'none';
			} else {
				useRepoFilterLabel.style.opacity = '1';
				useRepoFilterLabel.style.pointerEvents = 'auto';
			}
		}

		const scrumReport = document.getElementById('scrumReport');
		if (scrumReport) {
			scrumReport.contentEditable = enableToggle;
			if (!enableToggle) {
				scrumReport.innerHTML = `<p style="text-align: center; color: #999; padding: 20px;">${chrome.i18n.getMessage('extensionDisabledMessage')}</p>`;
			} else {
				const disabledMessage = `<p style="text-align: center; color: #999; padding: 20px;">${chrome.i18n.getMessage('extensionDisabledMessage')}</p>`;
				if (scrumReport.innerHTML === disabledMessage) {
					scrumReport.innerHTML = '';
				}
			}
		}
	}

	chrome.storage.local.get(['enableToggle'], (items) => {
		console.log('[DEBUG] Storage items received:', items);
		const enableToggle = items.enableToggle !== false;
		console.log('[DEBUG] enableToggle calculated:', enableToggle);

		// If enableToggle is undefined (first install), set it to true by default
		if (typeof items.enableToggle === 'undefined') {
			console.log('[DEBUG] Setting default enableToggle to true');
			chrome.storage.local.set({ enableToggle: true });
		}

		console.log('[DEBUG] Calling updateContentState with:', enableToggle);
		updateContentState(enableToggle);

		console.log('[DEBUG] Extension enabled, initializing popup');
		if (!enableToggle) {
			console.log('[DEBUG] Extension disabled, returning early');
			return;
		}
		initializePopup();
		checkTokenForFilter();
	});

	chrome.storage.onChanged.addListener((changes, namespace) => {
		console.log('[DEBUG] Storage changed:', changes, namespace);
		if (namespace === 'local' && changes.enableToggle) {
			console.log('[DEBUG] enableToggle changed to:', changes.enableToggle.newValue);
			updateContentState(changes.enableToggle.newValue);
			if (changes.enableToggle.newValue) {
				// re-initialize if enabled
				console.log('[DEBUG] Re-initializing popup due to enable toggle change');
				initializePopup();
			}
		}
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

	function initializePopup() {
		// Migration: Handle existing users with old platformUsername storage
		chrome.storage.local.get(['platform', 'platformUsername'], (result) => {
			if (result.platformUsername && result.platform) {
				// Migrate old platformUsername to platform-specific storage
				const platformUsernameKey = `${result.platform}Username`;
				chrome.storage.local.set({ [platformUsernameKey]: result.platformUsername });
				// Remove the old key
				chrome.storage.local.remove(['platformUsername']);
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

		const githubTokenInput = document.getElementById('githubToken');
		const cacheInput = document.getElementById('cacheInput');
		const enableToggleSwitch = document.getElementById('enable');
		const yesterdayRadio = document.getElementById('yesterdayContribution');
		const startingDateInput = document.getElementById('startingDate');
		const endingDateInput = document.getElementById('endingDate');
		const platformUsername = document.getElementById('platformUsername');

		chrome.storage.local.get(
			[
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
				'enableToggle',
				'yesterdayContribution',
				'startingDate',
				'endingDate',
				'selectedTimeframe',
				'platform',
				'githubUsername',
				'gitlabUsername',
			],
			(result) => {
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

				// Reconcile mutually exclusive "Only Issues" and "Only PRs" flags on initialization.
				// If both are somehow true in storage (e.g., from an older version or manual edits),
				// prefer "Only Issues" and clear "Only PRs", then persist the corrected state.
				if (onlyIssuesCheckbox.checked && onlyPRsCheckbox.checked) {
					onlyPRsCheckbox.checked = false;
					if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
						chrome.storage.sync.set({ onlyPRs: false });
					}
				}
				if (result.githubToken) githubTokenInput.value = result.githubToken;
				if (result.gitlabToken && gitlabTokenInput) gitlabTokenInput.value = result.gitlabToken;
				if (result.cacheInput) cacheInput.value = result.cacheInput;
				if (enableToggleSwitch) {
					if (typeof result.enableToggle !== 'undefined') {
						enableToggleSwitch.checked = result.enableToggle;
					} else {
						enableToggleSwitch.checked = true; // Default to enabled
					}
				}
				if (typeof result.yesterdayContribution !== 'undefined') yesterdayRadio.checked = result.yesterdayContribution;
				if (result.startingDate) startingDateInput.value = result.startingDate;
				if (result.endingDate) endingDateInput.value = result.endingDate;

				// Load platform-specific username
				const platform = result.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				platformUsername.value = result[platformUsernameKey] || '';
			},
		);

		// Button setup
		const generateBtn = document.getElementById('generateReport');
		const copyBtn = document.getElementById('copyReport');

		generateBtn.addEventListener('click', () => {
			chrome.storage.local.get(['platform'], (result) => {
				const platform = result.platform || 'github';
				const platformUsernameKey = `${platform}Username`;

				chrome.storage.local.set(
					{
						platform: platformSelect.value,
						[platformUsernameKey]: platformUsername.value,
					},
					() => {
						// Reload platform from storage before generating report
						chrome.storage.local.get(['platform'], (res) => {
							platformSelect.value = res.platform || 'github';
							updatePlatformUI(platformSelect.value);
							generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
							generateBtn.disabled = true;
							window.generateScrumReport && window.generateScrumReport();
						});
					},
				);
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
				this.innerHTML = `<i class="fa fa-check"></i> ${chrome.i18n.getMessage('copiedButton')}`;
				setTimeout(() => {
					this.innerHTML = `<i class="fa fa-copy"></i> ${chrome.i18n.getMessage('copyReportButton')}`;
				}, 2000);
			} catch (err) {
				console.error('Failed to copy: ', err);
			} finally {
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

			chrome.storage.local.set({
				yesterdayContribution: false,
				selectedTimeframe: null,
			});
		});

		chrome.storage.local.get(['selectedTimeframe', 'yesterdayContribution', 'startingDate', 'endingDate'], (items) => {
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

				chrome.storage.local.set({
					startingDate: startDateInput.value,
					endingDate: endDateInput.value,
					yesterdayContribution: items.selectedTimeframe === 'yesterdayContribution',
					selectedTimeframe: items.selectedTimeframe,
				});
			}
		});

		// Save all fields to storage on input/change
		projectNameInput.addEventListener('input', () => {
			chrome.storage.local.set({ projectName: projectNameInput.value });
		});

		// Save to storage and validate ONLY when user clicks out (blur event)
		orgInput.addEventListener('blur', () => {
			const org = orgInput.value.trim().toLowerCase();
			chrome.storage.local.set({ orgName: org });

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
				chrome.storage.local.set({ userReason: userReasonInput.value });
			});
		}
		showOpenLabelCheckbox.addEventListener('change', () => {
			chrome.storage.local.set({ showOpenLabel: showOpenLabelCheckbox.checked });
		});
		if (onlyIssuesCheckbox && onlyPRsCheckbox) {
			onlyIssuesCheckbox.addEventListener('change', () => {
				const checked = onlyIssuesCheckbox.checked;
				chrome.storage.local.set({ onlyIssues: checked }, () => {
					if (checked && onlyPRsCheckbox.checked) {
						// Uncheck the previously selected "Only PRs"
						onlyPRsCheckbox.checked = false;
						chrome.storage.local.set({ onlyPRs: false });
					}
				});
			});

			onlyPRsCheckbox.addEventListener('change', () => {
				const checked = onlyPRsCheckbox.checked;
				chrome.storage.local.set({ onlyPRs: checked }, () => {
					if (checked && onlyIssuesCheckbox.checked) {
						// Uncheck the previously selected "Only Issues"
						onlyIssuesCheckbox.checked = false;
						chrome.storage.local.set({ onlyIssues: false });
					}
				});
			});

			if (onlyRevPRsCheckbox) {
				onlyRevPRsCheckbox.addEventListener('change', () => {
					chrome.storage.local.set({ onlyRevPRs: onlyRevPRsCheckbox.checked });
				});
			}
		}
		showCommitsCheckbox.addEventListener('change', () => {
			chrome.storage.local.set({ showCommits: showCommitsCheckbox.checked });
		});
		githubTokenInput.addEventListener('input', () => {
			chrome.storage.local.set({ githubToken: githubTokenInput.value });
		});
		cacheInput.addEventListener('input', () => {
			chrome.storage.local.set({ cacheInput: cacheInput.value });
		});
		if (enableToggleSwitch) {
			console.log('[DEBUG] Setting up enable toggle switch event listener');
			enableToggleSwitch.addEventListener('change', () => {
				console.log('[DEBUG] Enable toggle changed to:', enableToggleSwitch.checked);
				chrome.storage.local.set({ enableToggle: enableToggleSwitch.checked });
			});
		}
		yesterdayRadio.addEventListener('change', () => {
			chrome.storage.local.set({ yesterdayContribution: yesterdayRadio.checked });
		});
		startingDateInput.addEventListener('input', () => {
			chrome.storage.local.set({ startingDate: startingDateInput.value });
		});
		endingDateInput.addEventListener('input', () => {
			chrome.storage.local.set({ endingDate: endingDateInput.value });
		});

		// Save username to storage on input
		platformUsername.addEventListener('input', () => {
			chrome.storage.local.get(['platform'], (result) => {
				const platform = result.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				chrome.storage.local.set({ [platformUsernameKey]: platformUsername.value });
			});
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

	// Debug function to test storage
	window.testStorage = () => {
		chrome.storage.local.get(['enableToggle'], (result) => {
			console.log('[TEST] Current enableToggle value:', result.enableToggle);
		});
	};

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
				chrome.storage.local.set({ useRepoFilter: true });
			}
		});
	}

	if (!repoSearch || !useRepoFilter) {
		console.log('Repository, filter elements not found in DOM');
	} else {
		let availableRepos = [];
		let selectedRepos = [];
		let highlightedIndex = -1;

		async function triggerRepoFetchIfEnabled() {
			// --- PLATFORM CHECK: Only run for GitHub ---
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {}
			if (platform !== 'github') {
				// Do not run repo fetch for non-GitHub platforms
				if (repoStatus) repoStatus.textContent = 'Repository filtering is only available for GitHub.';
				return;
			}
			if (!useRepoFilter.checked) {
				return;
			}

			if (repoStatus) {
				repoStatus.textContent = chrome.i18n.getMessage('repoRefetching');
			}

			try {
				const cacheData = await new Promise((resolve) => {
					chrome.storage.local.get(['repoCache'], resolve);
				});
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
				});

				const platform = items.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				const username = items[platformUsernameKey];

				if (!username) {
					if (repoStatus) {
						repoStatus.textContent = 'Username required';
					}
					return;
				}

				if (window.fetchUserRepositories) {
					const repos = await window.fetchUserRepositories(username, items.githubToken, items.orgName || '');

					availableRepos = repos;

					if (repoStatus) {
						repoStatus.textContent = chrome.i18n.getMessage('repoLoaded', [repos.length]);
					}

					const repoCacheKey = `repos-${username}-${items.orgName || ''}`;
					chrome.storage.local.set({
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
					repoStatus.textContent = `${chrome.i18n.getMessage('errorLabel')}: ${err.message || chrome.i18n.getMessage('repoRefetchFailed')}`;
				}
			}
		}

		window.triggerRepoFetchIfEnabled = triggerRepoFetchIfEnabled;

		chrome.storage.local.get(['selectedRepos', 'useRepoFilter'], (items) => {
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
				// --- PLATFORM CHECK: Only run for GitHub ---
				let platform = 'github';
				try {
					const items = await new Promise((resolve) => {
						chrome.storage.local.get(['platform'], resolve);
					});
					platform = items.platform || 'github';
				} catch (e) {}
				if (platform !== 'github') {
					repoFilterContainer.classList.add('hidden');
					useRepoFilter.checked = false;
					if (repoStatus) repoStatus.textContent = 'Repository filtering is only available for GitHub.';
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

				chrome.storage.local.set({
					useRepoFilter: enabled,
					githubCache: null, //forces refresh
				});
				checkTokenForFilter();
				if (enabled) {
					repoStatus.textContent = 'Loading repos automatically..';

					try {
						const cacheData = await new Promise((resolve) => {
							chrome.storage.local.get(['repoCache'], resolve);
						});
						const items = await new Promise((resolve) => {
							chrome.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
						});

						const platform = items.platform || 'github';
						const platformUsernameKey = `${platform}Username`;
						const username = items[platformUsernameKey];

						if (!username) {
							repoStatus.textContent = 'Github Username required';

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
							repoStatus.textContent = chrome.i18n.getMessage('repoLoaded', [availableRepos.length]);

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
							repoStatus.textContent = chrome.i18n.getMessage('repoLoaded', [repos.length]);

							chrome.storage.local.set({
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
							repoStatus.textContent = chrome.i18n.getMessage('repoTokenPrivate');
						} else if (err.message?.includes('username')) {
							repoStatus.textContent = chrome.i18n.getMessage('githubUsernamePlaceholder');
						} else {
							repoStatus.textContent = `${chrome.i18n.getMessage('errorLabel')}: ${err.message || chrome.i18n.getMessage('repoLoadFailed')}`;
						}
					}
				} else {
					selectedRepos = [];
					updateRepoDisplay();
					chrome.storage.local.set({ selectedRepos: [] });
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
			if (repoSearch.value) {
				filterAndDisplayRepos(repoSearch.value.toLowerCase());
			} else if (availableRepos.length > 0) {
				filterAndDisplayRepos('');
			}
		});

		document.addEventListener('click', (e) => {
			if (!e.target.closest('#repoSearch') && !e.target.closest('#repoDropdown')) {
				hideDropdown();
			}
		});

		function debugRepoFetch() {
			chrome.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], (items) => {
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
					chrome.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {}
			if (platform !== 'github') {
				if (repoStatus) repoStatus.textContent = 'Repository loading is only available for GitHub.';
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

			chrome.storage.local.get(['platform', 'githubUsername', 'githubToken'], (items) => {
				const platform = items.platform || 'github';
				const platformUsernameKey = `${platform}Username`;
				const username = items[platformUsernameKey];
				console.log('Storage data for repo fetch:', {
					hasUsername: !!username,
					hasToken: !!items.githubToken,
					username: username,
				});

				if (!username) {
					repoStatus.textContent = 'Username required';

					return;
				}

				performRepoFetch();
			});
		}

		async function performRepoFetch() {
			// --- PLATFORM CHECK: Only run for GitHub ---
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {}
			if (platform !== 'github') {
				if (repoStatus) repoStatus.textContent = 'Repository fetching is only available for GitHub.';
				return;
			}
			console.log('[POPUP-DEBUG] performRepoFetch called.');
			repoStatus.textContent = chrome.i18n.getMessage('repoLoading');
			repoSearch.classList.add('repository-search-loading');

			try {
				const cacheData = await new Promise((resolve) => {
					chrome.storage.local.get(['repoCache'], resolve);
				});
				const storageItems = await new Promise((resolve) => {
					chrome.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
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
					repoStatus.textContent = chrome.i18n.getMessage('repoLoaded', [availableRepos.length]);

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
				repoStatus.textContent = chrome.i18n.getMessage('repoLoaded', [availableRepos.length]);
				console.log(`[POPUP-DEBUG] Fetched and loaded ${availableRepos.length} repos.`);

				chrome.storage.local.set({
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
					repoStatus.textContent = chrome.i18n.getMessage('repoTokenPrivate');
				} else if (err.message && err.message.includes('username')) {
					repoStatus.textContent = chrome.i18n.getMessage('githubUsernamePlaceholder');
				} else {
					repoStatus.textContent = `${chrome.i18n.getMessage('errorLabel')}: ${err.message || chrome.i18n.getMessage('repoLoadFailed')}`;
				}
			} finally {
				repoSearch.classList.remove('repository-search-loading');
			}
		}

		function filterAndDisplayRepos(query) {
			if (availableRepos.length === 0) {
				repoDropdown.innerHTML = `<div class="p-3 text-center text-gray-500 text-sm">${chrome.i18n.getMessage('repoLoading')}</div>`;
				showDropdown();
				return;
			}

			const filtered = availableRepos.filter(
				(repo) =>
					!selectedRepos.includes(repo.fullName) &&
					(repo.name.toLowerCase().includes(query) || repo.description?.toLowerCase().includes(query)),
			);

			if (filtered.length === 0) {
				repoDropdown.innerHTML = `<div class="p-3 text-center text-gray-500 text-sm" style="padding-left: 10px; ">${chrome.i18n.getMessage('repoNotFound')}</div>`;
			} else {
				repoDropdown.innerHTML = filtered
					.slice(0, 10)
					.map(
						(repo) => {
							const safeName = escapeHtml(repo.name);
							const safeFullName = escapeHtml(repo.fullName);
							const safeLanguage = escapeHtml(repo.language);
							const safeStars = escapeHtml(String(repo.stars));
							const safeDescription = escapeHtml(repo.description?.substring(0, 50));
							return `
                    <div class="repository-dropdown-item" data-repo-name="${safeFullName}">
                        <div class="repo-name">
                            <span>${safeName}</span>
                            ${repo.language ? `<span class="repo-language">${safeLanguage}</span>` : ''}
                            ${repo.stars ? `<span class="repo-stars"><i class="fa fa-star"></i> ${safeStars}</span>` : ''}
                        </div>
                        <div class="repo-info">
                            ${repo.description ? `<span class="repo-desc">${safeDescription}${repo.description.length > 50 ? '...' : ''}</span>` : ''}
                        </div>
                    </div>
                `;
						},
					)
					.join('');

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
			if (selectedRepos.length === 0) {
				repoTags.innerHTML = `<span class="text-xs text-gray-500 select-none" id="repoPlaceholder">${chrome.i18n.getMessage('repoPlaceholder')}</span>`;
				repoCount.textContent = chrome.i18n.getMessage('repoCountNone');
			} else {
				repoTags.innerHTML = selectedRepos
					.map((repoFullName) => {
						const repoName = repoFullName.split('/')[1] || repoFullName;
						const safeRepoName = escapeHtml(repoName);
						const safeRepoFullName = escapeHtml(repoFullName);
						return `
                        <span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full" style="margin:5px;">
                            ${safeRepoName}
                            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-repo-btn cursor-pointer" data-repo-name="${safeRepoFullName}">
                                <i class="fa fa-times"></i>
                            </button>
                        </span>
                    `;
					})
					.join(' ');
				repoTags.querySelectorAll('.remove-repo-btn').forEach((btn) => {
					btn.addEventListener('click', (e) => {
						e.stopPropagation();
						const repoFullName = btn.dataset.repoName;
						removeRepo(repoFullName);
					});
				});
				repoCount.textContent = chrome.i18n.getMessage('repoCount', [selectedRepos.length]);
			}
		}

		function saveRepoSelection() {
			const cleanedRepos = selectedRepos.filter((repo) => repo !== null);
			chrome.storage.local.set({
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

		chrome.storage.local.get(['platform', 'githubUsername'], (items) => {
			const platform = items.platform || 'github';
			const platformUsernameKey = `${platform}Username`;
			const username = items[platformUsernameKey];
			if (username && useRepoFilter.checked && availableRepos.length === 0) {
				setTimeout(() => loadRepos(), 1000);
			}
		});
	}

	// ======= GitLab Project Filter Section =======
	const gitlabProjectSearch = document.getElementById('gitlabProjectSearch');
	const gitlabProjectDropdown = document.getElementById('gitlabProjectDropdown');
	const selectedGitlabProjectsDiv = document.getElementById('selectedGitlabProjects');
	const gitlabProjectTags = document.getElementById('gitlabProjectTags');
	const gitlabProjectPlaceholder = document.getElementById('gitlabProjectPlaceholder');
	const gitlabProjectCount = document.getElementById('gitlabProjectCount');
	const gitlabProjectStatus = document.getElementById('gitlabProjectStatus');
	const useGitlabProjectFilter = document.getElementById('useGitlabProjectFilter');
	const gitlabProjectFilterContainer = document.getElementById('gitlabProjectFilterContainer');

	if (gitlabProjectSearch && useGitlabProjectFilter && gitlabProjectFilterContainer) {
		gitlabProjectSearch.addEventListener('click', () => {
			if (!useGitlabProjectFilter.checked) {
				useGitlabProjectFilter.checked = true;
				gitlabProjectFilterContainer.classList.remove('hidden');
				chrome.storage.local.set({ useGitlabProjectFilter: true });
			}
		});
	}

	if (!gitlabProjectSearch || !useGitlabProjectFilter) {
		console.log('GitLab project filter elements not found in DOM');
	} else {
		let availableGitlabProjects = [];
		let selectedGitlabProjects = [];
		let gitlabHighlightedIndex = -1;

		async function triggerGitlabProjectFetchIfEnabled() {
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {}
			if (platform !== 'gitlab') {
				if (gitlabProjectStatus) gitlabProjectStatus.textContent = 'Project filtering is only available for GitLab.';
				return;
			}
			if (!useGitlabProjectFilter.checked) {
				return;
			}

			if (gitlabProjectStatus) {
				gitlabProjectStatus.textContent = 'Fetching projects...';
			}

			try {
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform', 'gitlabUsername', 'gitlabToken'], resolve);
				});

				const platform = items.platform || 'github';
				const username = items.gitlabUsername;

				if (!username) {
					if (gitlabProjectStatus) {
						gitlabProjectStatus.textContent = 'Username required';
					}
					return;
				}

				if (window.fetchUserProjects) {
					const projects = await window.fetchUserProjects(username, items.gitlabToken);
					availableGitlabProjects = projects;

					if (gitlabProjectStatus) {
						gitlabProjectStatus.textContent = `${projects.length} projects loaded`;
					}
				}
			} catch (err) {
				console.error('Auto load GitLab projects failed', err);
				if (gitlabProjectStatus) {
					if (err.message && err.message.includes('401')) {
						gitlabProjectStatus.textContent = 'Token required for private projects';
					} else if (err.message && err.message.includes('username')) {
						gitlabProjectStatus.textContent = 'Username required';
					} else {
						gitlabProjectStatus.textContent = `Error: ${escapeHtml(err.message || 'Failed to load projects')}`;
					}
				}
			}
		}

		useGitlabProjectFilter.addEventListener(
			'change',
			debounce(async function () {
				const isChecked = this.checked;
				chrome.storage.local.set({ useGitlabProjectFilter: isChecked });

				if (isChecked) {
					gitlabProjectFilterContainer.classList.remove('hidden');
					if (availableGitlabProjects.length === 0) {
						await loadGitlabProjects();
					}
				} else {
					gitlabProjectFilterContainer.classList.add('hidden');
					selectedGitlabProjects = [];
					updateGitlabProjectDisplay();
					chrome.storage.local.set({ selectedGitlabProjects: [] });
					gitlabProjectStatus.textContent = '';
				}
			}, 300),
		);

		gitlabProjectSearch.addEventListener('keydown', (e) => {
			const items = gitlabProjectDropdown.querySelectorAll('.gitlab-project-dropdown-item');

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					gitlabHighlightedIndex = Math.min(gitlabHighlightedIndex + 1, items.length - 1);
					updateGitlabHighlight(items);
					break;
				case 'ArrowUp':
					e.preventDefault();
					gitlabHighlightedIndex = Math.max(gitlabHighlightedIndex - 1, 0);
					updateGitlabHighlight(items);
					break;
				case 'Enter':
					e.preventDefault();
					if (gitlabHighlightedIndex >= 0 && items[gitlabHighlightedIndex]) {
						addGitlabProject(items[gitlabHighlightedIndex].dataset.projectId);
					}
					break;
				case 'Escape':
					hideGitlabProjectDropdown();
					break;
			}
		});

		gitlabProjectSearch.addEventListener('input', (e) => {
			const query = e.target.value.toLowerCase();
			filterAndDisplayGitlabProjects(query);
		});

		let programmaticGitlabFocus = false;
		gitlabProjectSearch.addEventListener('focus', () => {
			if (programmaticGitlabFocus) {
				programmaticGitlabFocus = false;
				return;
			}
			if (gitlabProjectSearch.value) {
				filterAndDisplayGitlabProjects(gitlabProjectSearch.value.toLowerCase());
			} else if (availableGitlabProjects.length > 0) {
				filterAndDisplayGitlabProjects('');
			}
		});

		document.addEventListener('click', (e) => {
			if (!e.target.closest('#gitlabProjectSearch') && !e.target.closest('#gitlabProjectDropdown')) {
				hideGitlabProjectDropdown();
			}
		});

		async function loadGitlabProjects() {
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {}
			if (platform !== 'gitlab') {
				if (gitlabProjectStatus) gitlabProjectStatus.textContent = 'Project loading is only available for GitLab.';
				return;
			}

			if (!window.fetchUserProjects) {
				gitlabProjectStatus.textContent = 'Project fetching not available';
				return;
			}

			chrome.storage.local.get(['platform', 'gitlabUsername', 'gitlabToken'], async (items) => {
				const platform = items.platform || 'github';
				const username = items.gitlabUsername;

				if (!username) {
					gitlabProjectStatus.textContent = 'Username required';
					return;
				}

				await performGitlabProjectFetch();
			});
		}

		async function performGitlabProjectFetch() {
			let platform = 'github';
			try {
				const items = await new Promise((resolve) => {
					chrome.storage.local.get(['platform'], resolve);
				});
				platform = items.platform || 'github';
			} catch (e) {}
			if (platform !== 'gitlab') {
				if (gitlabProjectStatus) gitlabProjectStatus.textContent = 'Project fetching is only available for GitLab.';
				return;
			}

			gitlabProjectStatus.textContent = 'Loading projects...';
			gitlabProjectSearch.classList.add('repository-search-loading');

			try {
				const storageItems = await new Promise((resolve) => {
					chrome.storage.local.get(['platform', 'gitlabUsername', 'gitlabToken'], resolve);
				});
				const username = storageItems.gitlabUsername;

				if (!username) {
					gitlabProjectStatus.textContent = 'Username required';
					gitlabProjectSearch.classList.remove('repository-search-loading');
					return;
				}

				if (window.fetchUserProjects) {
					const projects = await window.fetchUserProjects(username, storageItems.gitlabToken);
					availableGitlabProjects = projects;
					gitlabProjectStatus.textContent = `${projects.length} projects loaded`;
					gitlabProjectSearch.classList.remove('repository-search-loading');

					if (document.activeElement === gitlabProjectSearch) {
						filterAndDisplayGitlabProjects(gitlabProjectSearch.value.toLowerCase());
					}
				}
			} catch (err) {
				console.error('GitLab project fetch failed', err);
				gitlabProjectSearch.classList.remove('repository-search-loading');

				if (err.message && err.message.includes('401')) {
					gitlabProjectStatus.textContent = 'Token required for private projects';
				} else if (err.message && err.message.includes('username')) {
					gitlabProjectStatus.textContent = 'Username required';
				} else {
					gitlabProjectStatus.textContent = `Error: ${escapeHtml(err.message || 'Failed to load projects')}`;
				}
			}
		}

		function filterAndDisplayGitlabProjects(query) {
			if (availableGitlabProjects.length === 0) {
				gitlabProjectDropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No projects available. Click to load.</div>';
				showGitlabProjectDropdown();
				gitlabProjectDropdown.addEventListener(
					'click',
					async () => {
						await loadGitlabProjects();
						if (gitlabProjectSearch.value) {
							filterAndDisplayGitlabProjects(gitlabProjectSearch.value.toLowerCase());
						}
					},
					{ once: true },
				);
				return;
			}

			const filtered = availableGitlabProjects.filter(
				(proj) =>
					proj.name.toLowerCase().includes(query) ||
					proj.path_with_namespace.toLowerCase().includes(query) ||
					(proj.description && proj.description.toLowerCase().includes(query)),
			);

			if (filtered.length === 0) {
				gitlabProjectDropdown.innerHTML = '<div class="p-3 text-gray-500 text-sm">No matching projects found.</div>';
				showGitlabProjectDropdown();
				return;
			}

			gitlabProjectDropdown.innerHTML = filtered
				.map((proj) => {
					const isSelected = selectedGitlabProjects.includes(proj.id.toString());
					const safeName = escapeHtml(proj.name);
					const safeNamespace = escapeHtml(proj.path_with_namespace);
					const safeDescription = proj.description ? escapeHtml(proj.description.substring(0, 60)) : '';
					return `
					<div class="gitlab-project-dropdown-item p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${isSelected ? 'bg-blue-50' : ''}" data-project-id="${proj.id}">
						<div class="font-medium text-sm">${safeName}</div>
						<div class="text-xs text-gray-500">${safeNamespace}</div>
						${safeDescription ? `<div class="text-xs text-gray-400 mt-1">${safeDescription}...</div>` : ''}
					</div>
				`;
				})
				.join('');

			gitlabProjectDropdown.querySelectorAll('.gitlab-project-dropdown-item').forEach((item) => {
				item.addEventListener('click', (e) => {
					e.stopPropagation();
					const projectId = item.dataset.projectId;
					addGitlabProject(projectId);
				});
			});

			gitlabHighlightedIndex = -1;
			showGitlabProjectDropdown();
		}

		function addGitlabProject(projectId) {
			if (!selectedGitlabProjects.includes(projectId)) {
				selectedGitlabProjects.push(projectId);
				updateGitlabProjectDisplay();
				saveGitlabProjectSelection();
			}

			gitlabProjectSearch.value = '';
			filterAndDisplayGitlabProjects('');
			programmaticGitlabFocus = true;
			gitlabProjectSearch.focus();
		}

		function removeGitlabProject(projectId) {
			selectedGitlabProjects = selectedGitlabProjects.filter((id) => id !== projectId);
			updateGitlabProjectDisplay();
			saveGitlabProjectSelection();

			if (gitlabProjectSearch.value) {
				filterAndDisplayGitlabProjects(gitlabProjectSearch.value.toLowerCase());
			}
		}

		function updateGitlabProjectDisplay() {
			if (selectedGitlabProjects.length === 0) {
				gitlabProjectTags.innerHTML = '<span class="text-xs text-gray-500 select-none" id="gitlabProjectPlaceholder">No projects selected (all will be included)</span>';
				gitlabProjectCount.textContent = '0 projects selected';
			} else {
				gitlabProjectTags.innerHTML = selectedGitlabProjects
					.map((projectId) => {
						const project = availableGitlabProjects.find((p) => p.id.toString() === projectId);
						const projectName = project ? project.name : `Project ${projectId}`;
						const safeProjectName = escapeHtml(projectName);
						const safeProjectId = escapeHtml(projectId);
						return `
						<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full" style="margin:5px;">
							${safeProjectName}
							<button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-gitlab-project-btn cursor-pointer" data-project-id="${safeProjectId}">
								<i class="fa fa-times"></i>
							</button>
						</span>
					`;
					})
					.join(' ');
				gitlabProjectTags.querySelectorAll('.remove-gitlab-project-btn').forEach((btn) => {
					btn.addEventListener('click', (e) => {
						e.stopPropagation();
						const projectId = btn.dataset.projectId;
						removeGitlabProject(projectId);
					});
				});
				gitlabProjectCount.textContent = `${selectedGitlabProjects.length} project${selectedGitlabProjects.length !== 1 ? 's' : ''} selected`;
			}
		}

		function saveGitlabProjectSelection() {
			const cleanedProjects = selectedGitlabProjects.filter((id) => id !== null);
			chrome.storage.local.set({
				selectedGitlabProjects: cleanedProjects,
				gitlabCache: null,
			});
		}

		function showGitlabProjectDropdown() {
			gitlabProjectDropdown.classList.remove('hidden');
		}

		function hideGitlabProjectDropdown() {
			gitlabProjectDropdown.classList.add('hidden');
			gitlabHighlightedIndex = -1;
		}

		function updateGitlabHighlight(items) {
			items.forEach((item, index) => {
				item.classList.toggle('highlighted', index === gitlabHighlightedIndex);
			});

			if (gitlabHighlightedIndex >= 0 && items[gitlabHighlightedIndex]) {
				items[gitlabHighlightedIndex].scrollIntoView({ block: 'nearest' });
			}
		}

		window.removeGitlabProject = removeGitlabProject;

		// Load saved projects on init
		chrome.storage.local.get(['platform', 'gitlabUsername', 'selectedGitlabProjects', 'useGitlabProjectFilter'], (items) => {
			const platform = items.platform || 'github';
			const username = items.gitlabUsername;

			if (items.selectedGitlabProjects) {
				selectedGitlabProjects = items.selectedGitlabProjects;
				updateGitlabProjectDisplay();
			}

			if (items.useGitlabProjectFilter) {
				useGitlabProjectFilter.checked = true;
				gitlabProjectFilterContainer.classList.remove('hidden');
			}

			if (username && useGitlabProjectFilter.checked && availableGitlabProjects.length === 0) {
				setTimeout(() => loadGitlabProjects(), 1000);
			}
		});
	}
});

const cacheInput = document.getElementById('cacheInput');
if (cacheInput) {
	chrome.storage.local.get(['cacheInput'], (result) => {
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

		chrome.storage.local.set({ cacheInput: ttlValue }, () => {
			console.log('Cache TTL saved:', ttlValue, 'minutes');
		});
	});
}

chrome.storage.local.get(['platform'], (result) => {
	const platform = result.platform || 'github';
	platformSelect.value = platform;
	updatePlatformUI(platform);
});

// Update UI for platform
function updatePlatformUI(platform) {
	const body = document.body;
	
	// Set body class for CSS-based visibility
	if (platform === 'gitlab') {
		body.classList.remove('github-selected');
		body.classList.add('gitlab-selected');
	} else {
		body.classList.remove('gitlab-selected');
		body.classList.add('github-selected');
	}

	const usernameLabel = document.getElementById('usernameLabel');
	if (usernameLabel) {
		if (platform === 'gitlab') {
			usernameLabel.setAttribute('data-i18n', 'gitlabUsernameLabel');
		} else {
			usernameLabel.setAttribute('data-i18n', 'githubUsernameLabel');
		}
		const key = usernameLabel.getAttribute('data-i18n');
		const message = chrome.i18n.getMessage(key);
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
}

platformSelect.addEventListener('change', () => {
	const platform = platformSelect.value;
	chrome.storage.local.set({ platform });
	const platformUsername = document.getElementById('platformUsername');
	if (platformUsername) {
		const currentPlatform = platformSelect.value === 'github' ? 'gitlab' : 'github'; // Get the platform we're switching from
		const currentUsername = platformUsername.value;
		if (currentUsername.trim()) {
			chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
		}
	}

	chrome.storage.local.get([`${platform}Username`], (result) => {
		if (platformUsername) {
			platformUsername.value = result[`${platform}Username`] || '';
		}
	});

	updatePlatformUI(platform);
});

const customDropdown = document.getElementById('customPlatformDropdown');
const dropdownBtn = document.getElementById('platformDropdownBtn');
const dropdownList = document.getElementById('platformDropdownList');
const dropdownSelected = document.getElementById('platformDropdownSelected');
const platformSelectHidden = document.getElementById('platformSelect');

function setPlatformDropdown(value) {
	if (value === 'gitlab') {
		dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
	} else {
		dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
	}

	const platformUsername = document.getElementById('platformUsername');
	if (platformUsername) {
		const currentPlatform = platformSelectHidden.value;
		const currentUsername = platformUsername.value;
		if (currentUsername.trim()) {
			chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
		}
	}

	platformSelectHidden.value = value;
	chrome.storage.local.set({ platform: value });

	chrome.storage.local.get([`${value}Username`], (result) => {
		if (platformUsername) {
			platformUsername.value = result[`${value}Username`] || '';
		}
	});

	updatePlatformUI(value);
}

dropdownBtn.addEventListener('click', (e) => {
	e.stopPropagation();
	customDropdown.classList.toggle('open');
	dropdownList.classList.toggle('hidden');
});

dropdownList.querySelectorAll('li').forEach((item) => {
	item.addEventListener('click', function (e) {
		const newPlatform = this.getAttribute('data-value');
		const currentPlatform = platformSelectHidden.value;

		if (newPlatform !== currentPlatform) {
			const platformUsername = document.getElementById('platformUsername');
			if (platformUsername) {
				const currentUsername = platformUsername.value;
				if (currentUsername.trim()) {
					chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
				}
			}
		}

		setPlatformDropdown(newPlatform);
		customDropdown.classList.remove('open');
		dropdownList.classList.add('hidden');
	});
});

document.addEventListener('click', (e) => {
	if (!customDropdown.contains(e.target)) {
		customDropdown.classList.remove('open');
		dropdownList.classList.add('hidden');
	}
});

// Keyboard navigation
platformDropdownBtn.addEventListener('keydown', (e) => {
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
			const currentPlatform = platformSelectHidden.value;

			// Save current username for current platform before switching
			if (newPlatform !== currentPlatform) {
				const platformUsername = document.getElementById('platformUsername');
				if (platformUsername) {
					const currentUsername = platformUsername.value;
					if (currentUsername.trim()) {
						chrome.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
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

// On load, restore platform from storage
chrome.storage.local.get(['platform'], (result) => {
	const platform = result.platform || 'github';
	// Just update the UI without clearing username when restoring from storage
	if (platform === 'gitlab') {
		dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
	} else {
		dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
	}
	platformSelectHidden.value = platform;
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
			startDateInput.readOnly = false;
			endDateInput.readOnly = false;

			chrome.storage.local.set({
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
					chrome.tabs.create({ url: href });
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
	this.innerHTML = `<i class="fa fa-refresh fa-spin"></i><span>${chrome.i18n.getMessage('refreshingButton')}</span>`;
	this.disabled = true;

	try {
		// Determine platform
		let platform = 'github';
		try {
			const items = await new Promise((resolve) => {
				chrome.storage.local.get(['platform'], resolve);
			});
			platform = items.platform || 'github';
		} catch (e) {}

		// Clear all caches
		const keysToRemove = ['githubCache', 'repoCache', 'gitlabCache'];
		await new Promise((resolve) => {
			chrome.storage.local.remove(keysToRemove, resolve);
		});

		// Clear the scrum report
		const scrumReport = document.getElementById('scrumReport');
		if (scrumReport) {
			scrumReport.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${chrome.i18n.getMessage('cacheClearedMessage')}</p>`;
		}

		if (typeof availableRepos !== 'undefined') {
			availableRepos = [];
		}

		const repoStatus = document.getElementById('repoStatus');
		if (repoStatus) {
			repoStatus.textContent = '';
		}

		this.innerHTML = `<i class="fa fa-check"></i><span>${chrome.i18n.getMessage('cacheClearedButton')}</span>`;
		this.classList.remove('loading');

		// Do NOT trigger report generation automatically

		setTimeout(() => {
			this.innerHTML = originalText;
			this.disabled = false;
		}, 2000);
	} catch (error) {
		console.error('Cache clear failed:', error);
		this.innerHTML = `<i class="fa fa-exclamation-triangle"></i><span>${chrome.i18n.getMessage('cacheClearFailed')}</span>`;
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

	chrome.storage.local.set(
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

			triggerRepoFetchIfEnabled();
		},
	);
}

async function triggerRepoFetchIfEnabled() {
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
				toastDiv.innerText = chrome.i18n.getMessage('orgNotFoundMessage');
				document.body.appendChild(toastDiv);
				setTimeout(() => {
					if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
				}, 3000);
				return;
			}
			const oldToast = document.getElementById('invalid-org-toast');
			if (oldToast) oldToast.parentNode.removeChild(oldToast);
			console.log('[Org Check] Organisation exists on GitHub:', org);
			chrome.storage.local.remove(['githubCache', 'repoCache']);
			triggerRepoFetchIfEnabled();
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
			toastDiv.innerText = chrome.i18n.getMessage('orgValidationErrorMessage');
			document.body.appendChild(toastDiv);
			setTimeout(() => {
				if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
			}, 3000);
		});
}
