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
			if (platformUsernameElement && items[platformUsernameKey]) {
				platformUsernameElement.value = items[platformUsernameKey];
			}

			if (items.githubToken && githubTokenElement) {
				githubTokenElement.value = items.githubToken;
			}
			if (items.gitlabToken && gitlabTokenElement) {
				gitlabTokenElement.value = items.gitlabToken;
			}
			if (items.projectName && projectNameElement) {
				projectNameElement.value = items.projectName;
			}
			if (items.cacheInput && cacheInputElement) {
				cacheInputElement.value = items.cacheInput;
			}
			if (items.endingDate && endingDateElement) {
				endingDateElement.value = items.endingDate;
			}
			if (items.startingDate && startingDateElement) {
				startingDateElement.value = items.startingDate;
			}
			if (showOpenLabelElement) {
				if (items.showOpenLabel) {
					showOpenLabelElement.checked = items.showOpenLabel;
				} else if (items.showOpenLabel !== false) {
					// undefined
					showOpenLabelElement.checked = true;
					handleOpenLabelChange();
				}
			}

			if (startingDateElement && endingDateElement) {
				const wasNormalizedOnLoad = window.scrumDateRangeUtils.normalizeDateRangeValues(
					startingDateElement,
					endingDateElement,
				);
				if (wasNormalizedOnLoad) {
					window.scrumDateRangeUtils.persistDateRange(startingDateElement, endingDateElement);
				}
			}

			if (yesterdayContributionElement) {
				if (items.yesterdayContribution) {
					yesterdayContributionElement.checked = items.yesterdayContribution;
					handleYesterdayContributionChange();
				} else if (items.yesterdayContribution !== false) {
					yesterdayContributionElement.checked = true;
					handleYesterdayContributionChange();
				}
			}
			if (showCommitsElement) {
				if (items.showCommits) {
					showCommitsElement.checked = items.showCommits;
				} else {
					showCommitsElement.checked = false;
					handleShowCommitsChange();
				}
			}
		});
}

const refreshCacheButton = document.getElementById('refreshCache');
if (refreshCacheButton) {
	refreshCacheButton.addEventListener('click', (e) => {
		const button = e.currentTarget;
		button.classList.add('loading');
		button.disabled = true;

		setTimeout(() => {
			button.classList.remove('loading');
			button.disabled = false;
		}, 500);
	});
}

function handleStartingDateChange() {
	if (!startingDateElement) return;
	const value = startingDateElement.value;
	browser.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	if (!endingDateElement) return;
	if (!startingDateElement) return;
	window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateElement, endingDateElement);
}

function handleYesterdayContributionChange() {
	if (!yesterdayContributionElement) return;
	const value = yesterdayContributionElement.checked;
	const labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		if (startingDateElement) startingDateElement.readOnly = true;
		if (endingDateElement) endingDateElement.readOnly = true;
		if (endingDateElement) endingDateElement.value = getToday();
		if (startingDateElement) startingDateElement.value = getYesterday();
		window.scrumDateRangeUtils.normalizeSyncAndPersistDateRange(startingDateElement, endingDateElement);
		if (labelElement) {
			labelElement.classList.add('selectedLabel');
			labelElement.classList.remove('unselectedLabel');
		}
	} else {
		if (startingDateElement) startingDateElement.readOnly = false;
		if (endingDateElement) endingDateElement.readOnly = false;
		window.scrumDateRangeUtils.normalizeDateRangeValues(startingDateElement, endingDateElement);
		if (labelElement) {
			labelElement.classList.add('unselectedLabel');
			labelElement.classList.remove('selectedLabel');
		}
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
	if (!platformUsernameElement) return;
	const value = platformUsernameElement.value;
	browser.storage.local.get(['platform']).then((result) => {
		const platform = result.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		browser.storage.local.set({ [platformUsernameKey]: value });
	});
}
function handleGithubTokenChange() {
	if (!githubTokenElement) return;
	const value = githubTokenElement.value;
	browser.storage.local.set({ githubToken: value });
}
function handleGitlabTokenChange() {
	if (!gitlabTokenElement) return;
	const value = gitlabTokenElement.value;
	browser.storage.local.set({ gitlabToken: value });
}
function handleProjectNameChange() {
	if (!projectNameElement) return;
	const value = projectNameElement.value;
	browser.storage.local.set({ projectName: value });
}
function handleCacheInputChange() {
	if (!cacheInputElement) return;
	const value = cacheInputElement.value;
	browser.storage.local.set({ cacheInput: value });
}
function handleOpenLabelChange() {
	if (!showOpenLabelElement) return;
	const value = showOpenLabelElement.checked;
	const labelElement = document.querySelector("label[for='showOpenLabel']");

	if (labelElement) {
		if (value) {
			labelElement.classList.add('selectedLabel');
			labelElement.classList.remove('unselectedLabel');
		} else {
			labelElement.classList.add('unselectedLabel');
			labelElement.classList.remove('selectedLabel');
		}
	}

	browser.storage.local.set({ showOpenLabel: value });
}

function handleShowCommitsChange() {
	if (!showCommitsElement) return;
	const value = showCommitsElement.checked;
	browser.storage.local.set({ showCommits: value });
}

if (platformUsernameElement) {
	platformUsernameElement.addEventListener('keyup', handlePlatformUsernameChange);
}
if (githubTokenElement) {
	githubTokenElement.addEventListener('keyup', handleGithubTokenChange);
}
if (gitlabTokenElement) {
	gitlabTokenElement.addEventListener('keyup', handleGitlabTokenChange);
}
if (cacheInputElement) {
	cacheInputElement.addEventListener('keyup', handleCacheInputChange);
}
if (projectNameElement) {
	projectNameElement.addEventListener('keyup', handleProjectNameChange);
}
if (startingDateElement) {
	startingDateElement.addEventListener('change', handleStartingDateChange);
}
if (showCommitsElement) {
	showCommitsElement.addEventListener('change', handleShowCommitsChange);
}
if (endingDateElement) {
	endingDateElement.addEventListener('change', handleEndingDateChange);
}
if (yesterdayContributionElement) {
	yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
}
if (showOpenLabelElement) {
	showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
}

document.addEventListener('DOMContentLoaded', handleBodyOnLoad);
