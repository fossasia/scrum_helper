const platformUsernameElement = document.getElementById('platformUsername');
const githubTokenElement = document.getElementById('githubToken');
const gitlabTokenElement = document.getElementById('gitlabToken');
const cacheInputElement = document.getElementById('cacheInput');
const projectNameElement = document.getElementById('projectName');
const yesterdayContributionElement = document.getElementById('yesterdayContribution');
const startingDateElement = document.getElementById('startingDate');
const endingDateElement = document.getElementById('endingDate');
const showOpenLabelElement = document.getElementById('showOpenLabel');

const userReasonElement = null;

const showCommitsElement = document.getElementById('showCommits');

if (!window.scrumDateRangeUtils) {
	window.scrumDateRangeUtils = {
		formatLocalDate(date) {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');

			return `${year}-${month}-${day}`;
		},
		getLocalTodayString() {
			return this.formatLocalDate(new Date());
		},
		getLocalYesterdayString() {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);

			return this.formatLocalDate(yesterday);
		},
		normalizeAndSync(startDateInput, endDateInput) {
			const today = this.getLocalTodayString();
			const originalStartDate = startDateInput.value;
			const originalEndDate = endDateInput.value;

			let normalizedStartDate = originalStartDate;
			let normalizedEndDate = originalEndDate;

			if (normalizedStartDate && normalizedStartDate > today) {
				normalizedStartDate = today;
			}
			if (normalizedEndDate && normalizedEndDate > today) {
				normalizedEndDate = today;
			}
			if (normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
				normalizedEndDate = '';
			}

			const didChange = normalizedStartDate !== originalStartDate || normalizedEndDate !== originalEndDate;

			if (didChange) {
				startDateInput.value = normalizedStartDate;
				endDateInput.value = normalizedEndDate;
			}

			const startDate = startDateInput.value;
			startDateInput.max = today;
			endDateInput.min = startDate || '';
			endDateInput.max = today;

			return didChange;
		},
		normalizeDateRangeValues(startDateInput, endDateInput) {
			const originalStartDate = startDateInput.value;
			const originalEndDate = endDateInput.value;

			this.normalizeAndSync(startDateInput, endDateInput);

			return startDateInput.value !== originalStartDate || endDateInput.value !== originalEndDate;
		},
		persistDateRange(startDateInput, endDateInput) {
			browser.storage.local.set({
				startingDate: startDateInput.value,
				endingDate: endDateInput.value,
			});
		},
		normalizeSyncAndPersistDateRange(startDateInput, endDateInput) {
			this.normalizeDateRangeValues(startDateInput, endDateInput);
			this.persistDateRange(startDateInput, endDateInput);
		},
	};
}

if (!window.scrumHelperToast) {
	window.SCRUM_TOAST_ANIM_MS = window.SCRUM_TOAST_ANIM_MS || 200;
	window.scrumHelperToast = function scrumHelperToast(message, options = {}) {
		if (!message || typeof document === 'undefined') return null;

		const { duration = 4000, variant = 'info' } = options;

		const toastId = 'scrum-helper-toast';
		const existingToast = document.getElementById(toastId);
		if (existingToast) existingToast.remove();

		const toast = document.createElement('div');
		toast.id = toastId;
		toast.className = `scrum-toast scrum-toast--${variant}`;
		toast.textContent = message;

		// Accessibility: announce via screen readers
		if (variant === 'error') {
			toast.setAttribute('role', 'alert');
			toast.setAttribute('aria-live', 'assertive');
		} else {
			toast.setAttribute('role', 'status');
			toast.setAttribute('aria-live', 'polite');
		}
		toast.setAttribute('aria-atomic', 'true');

		const container = document.getElementById('scrumHelperToastContainer') || document.body;
		container.appendChild(toast);

		requestAnimationFrame(() => {
			toast.classList.add('scrum-toast--visible');
		});

		window.setTimeout(() => {
			toast.classList.remove('scrum-toast--visible');
			window.setTimeout(() => {
				if (toast.parentNode) toast.parentNode.removeChild(toast);
			}, window.SCRUM_TOAST_ANIM_MS);
		}, duration);

		return toast;
	};
}

if (!window.clearScrumHelperToast) {
	window.clearScrumHelperToast = function clearScrumHelperToast() {
		const toast = document.getElementById('scrum-helper-toast');
		if (toast) toast.remove();
		const container = document.getElementById('scrumHelperToastContainer');
		if (container) {
			container.querySelectorAll('.scrum-toast').forEach((t) => t.remove());
		}
	};
}


// Backwards-compatible wrapper used across the codebase
if (!window.showPopupMessage) {
	window.showPopupMessage = function showPopupMessage(message, options = {}) {
		const opts = Object.assign({ duration: 4000, variant: 'info' }, options || {});
		return window.scrumHelperToast?.(message, opts);
	};
}

function handleBodyOnLoad() {
	// Migration: Handle existing users with old platformUsername storage
	browser.storage.local.get(['platform', 'platformUsername']).then((result) => {
		if (result.platformUsername && result.platform) {
			// Migrate old platformUsername to platform-specific storage
			const platformUsernameKey = `${result.platform}Username`;
			browser.storage.local.set({ [platformUsernameKey]: result.platformUsername });
			// Remove the old key
			browser.storage.local.remove(['platformUsername']);
			console.log(`[MIGRATION] Migrated platformUsername to ${platformUsernameKey}`);
		}
	});

	browser.storage.local
		.get([
			'platform',
			'githubUsername',
			'gitlabUsername',
			'projectName',
			'startingDate',
			'endingDate',
			'showOpenLabel',
			'userReason',
			'yesterdayContribution',
			'cacheInput',
			'githubToken',
			'gitlabToken',
			'showCommits',
		])
		.then((items) => {
			// Load platform-specific username
			const platform = items.platform || 'github';
			const platformUsernameKey = `${platform}Username`;
			if (items[platformUsernameKey]) {
				platformUsernameElement.value = items[platformUsernameKey];
			}

			if (items.githubToken && githubTokenElement) {
				githubTokenElement.value = items.githubToken;
			}
			if (items.gitlabToken && gitlabTokenElement) {
				gitlabTokenElement.value = items.gitlabToken;
			}
			if (items.projectName) {
				projectNameElement.value = items.projectName;
			}
			if (items.cacheInput) {
				cacheInputElement.value = items.cacheInput;
			}
			if (items.endingDate) {
				endingDateElement.value = items.endingDate;
			}
			if (items.startingDate) {
				startingDateElement.value = items.startingDate;
			}
			const wasNormalizedOnLoad = window.scrumDateRangeUtils.normalizeDateRangeValues(
				startingDateElement,
				endingDateElement,
			);
			if (wasNormalizedOnLoad) {
				window.scrumDateRangeUtils.persistDateRange(startingDateElement, endingDateElement);
			}
			if (items.showOpenLabel) {
				showOpenLabelElement.checked = items.showOpenLabel;
			} else if (items.showOpenLabel !== false) {
				// undefined
				showOpenLabelElement.checked = true;
				handleOpenLabelChange();
			}

			if (items.yesterdayContribution) {
				yesterdayContributionElement.checked = items.yesterdayContribution;
				handleYesterdayContributionChange();
			} else if (items.yesterdayContribution !== false) {
				yesterdayContributionElement.checked = true;
				handleYesterdayContributionChange();
			}
			if (items.showCommits) {
				showCommitsElement.checked = items.showCommits;
			} else {
				showCommitsElement.checked = false;
				handleShowCommitsChange();
			}
		});
}

document.getElementById('refreshCache').addEventListener('click', async (e) => {
	const button = e.currentTarget;
	button.classList.add('loading');
	button.disabled = true;

	setTimeout(() => {
		button.classList.remove('loading');
		button.disabled = false;
	}, 500);
});

function handleStartingDateChange() {
	window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateElement, endingDateElement);
}
function handleEndingDateChange() {
	window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateElement, endingDateElement);
}

function handleYesterdayContributionChange() {
	const value = yesterdayContributionElement.checked;
	const labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		startingDateElement.readOnly = true;
		endingDateElement.readOnly = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getYesterday();
		window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateElement, endingDateElement);
		labelElement.classList.add('selectedLabel');
		labelElement.classList.remove('unselectedLabel');
	} else {
		startingDateElement.readOnly = false;
		endingDateElement.readOnly = false;
		window.scrumDateRangeUtils.normalizeDateRangeValues(startingDateElement, endingDateElement);
		labelElement.classList.add('unselectedLabel');
		labelElement.classList.remove('selectedLabel');
	}
	browser.storage.local.set({ yesterdayContribution: value });
}

function getYesterday() {
	return window.scrumDateRangeUtils.getLocalYesterdayString();
}
function getToday() {
	return window.scrumDateRangeUtils.getLocalTodayString();
}

function handlePlatformUsernameChange() {
	const value = platformUsernameElement.value;
	browser.storage.local.get(['platform']).then((result) => {
		const platform = result.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		browser.storage.local.set({ [platformUsernameKey]: value });
	});
}
function handleGithubTokenChange() {
	const value = githubTokenElement.value;
	browser.storage.local.set({ githubToken: value });
}
function handleGitlabTokenChange() {
	const value = gitlabTokenElement.value;
	browser.storage.local.set({ gitlabToken: value });
}
function handleProjectNameChange() {
	const value = projectNameElement.value;
	browser.storage.local.set({ projectName: value });
}
function handleCacheInputChange() {
	const value = cacheInputElement.value;
	browser.storage.local.set({ cacheInput: value });
}
function handleOpenLabelChange() {
	const value = showOpenLabelElement.checked;
	const labelElement = document.querySelector("label[for='showOpenLabel']");

	if (value) {
		labelElement.classList.add('selectedLabel');
		labelElement.classList.remove('unselectedLabel');
	} else {
		labelElement.classList.add('unselectedLabel');
		labelElement.classList.remove('selectedLabel');
	}

	browser.storage.local.set({ showOpenLabel: value });
}

function handleShowCommitsChange() {
	const value = showCommitsElement.checked;
	browser.storage.local.set({ showCommits: value });
}

platformUsernameElement.addEventListener('keyup', handlePlatformUsernameChange);
if (githubTokenElement) {
	githubTokenElement.addEventListener('keyup', handleGithubTokenChange);
}
if (gitlabTokenElement) {
	gitlabTokenElement.addEventListener('keyup', handleGitlabTokenChange);
}
cacheInputElement.addEventListener('keyup', handleCacheInputChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
showCommitsElement.addEventListener('change', handleShowCommitsChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);

document.addEventListener('DOMContentLoaded', handleBodyOnLoad);
