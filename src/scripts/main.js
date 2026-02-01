const enableToggleElement = document.getElementById('enable');
const platformUsernameElement = document.getElementById('platformUsername');
const githubTokenElement = document.getElementById('githubToken');
const cacheInputElement = document.getElementById('cacheInput');
const projectNameElement = document.getElementById('projectName');
const yesterdayContributionElement = document.getElementById('yesterdayContribution');
const startingDateElement = document.getElementById('startingDate');
const endingDateElement = document.getElementById('endingDate');
const showOpenLabelElement = document.getElementById('showOpenLabel');

const userReasonElement = null;

const showCommitsElement = document.getElementById('showCommits');

function handleBodyOnLoad() {
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

	chrome.storage.local.get(
		[
			'platform',
			'githubUsername',
			'gitlabUsername',
			'projectName',
			'enableToggle',
			'startingDate',
			'endingDate',
			'showOpenLabel',

			'userReason',

			'yesterdayContribution',
			'cacheInput',
			'githubToken',
			'showCommits',
		],
		(items) => {
			// Load platform-specific username
			const platform = items.platform || 'github';
			const platformUsernameKey = `${platform}Username`;
			if (items[platformUsernameKey]) {
				platformUsernameElement.value = items[platformUsernameKey];
			}

			if (items.githubToken) {
				githubTokenElement.value = items.githubToken;
			}
			if (items.projectName) {
				projectNameElement.value = items.projectName;
			}
			if (items.cacheInput) {
				cacheInputElement.value = items.cacheInput;
			}
			if (items.enableToggle) {
				enableToggleElement.checked = items.enableToggle;
			} else if (items.enableToggle !== false) {
				// undefined
				enableToggleElement.checked = true;
				handleEnableChange();
			}
			if (items.endingDate) {
				endingDateElement.value = items.endingDate;
			}
			if (items.startingDate) {
				startingDateElement.value = items.startingDate;
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
			const hasToken = items.githubToken && items.githubToken.trim() !== '';
			if (items.showCommits && hasToken) {
				showCommitsElement.checked = items.showCommits;
			} else {
				showCommitsElement.checked = false;
				// Persist false state when token is missing to keep storage aligned with UI
				if (items.showCommits && !hasToken) {
					chrome.storage.local.set({ showCommits: false });
				}
			}
		},
	);
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

function handleEnableChange() {
	const value = enableToggleElement.checked;
	chrome.storage.local.set({ enableToggle: value });
}
function handleStartingDateChange() {
	const value = startingDateElement.value;
	chrome.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	const value = endingDateElement.value;
	chrome.storage.local.set({ endingDate: value });
}

function handleYesterdayContributionChange() {
	const value = yesterdayContributionElement.checked;
	const labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		startingDateElement.readOnly = true;
		endingDateElement.readOnly = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getYesterday();
		handleEndingDateChange();
		handleStartingDateChange();
		labelElement.classList.add('selectedLabel');
		labelElement.classList.remove('unselectedLabel');
	} else {
		startingDateElement.readOnly = false;
		endingDateElement.readOnly = false;
		labelElement.classList.add('unselectedLabel');
		labelElement.classList.remove('selectedLabel');
	}
	chrome.storage.local.set({ yesterdayContribution: value });
}

function getYesterday() {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	return yesterday.toISOString().split('T')[0];
}
function getToday() {
	const today = new Date();
	return today.toISOString().split('T')[0];
}

function handlePlatformUsernameChange() {
	const value = platformUsernameElement.value;
	chrome.storage.local.get(['platform'], (result) => {
		const platform = result.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		chrome.storage.local.set({ [platformUsernameKey]: value });
	});
}
function handleGithubTokenChange() {
	const value = githubTokenElement.value;
	chrome.storage.local.set({ githubToken: value });
}
function handleProjectNameChange() {
	const value = projectNameElement.value;
	chrome.storage.local.set({ projectName: value });
}
function handleCacheInputChange() {
	const value = cacheInputElement.value;
	chrome.storage.local.set({ cacheInput: value });
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

	chrome.storage.local.set({ showOpenLabel: value });
}

function handleShowCommitsChange() {
	chrome.storage.local.get(['githubToken'], function(result) {
		const hasToken = result.githubToken && result.githubToken.trim() !== '';
		if (showCommitsElement.checked && !hasToken) {
			showCommitsElement.checked = false;
			return;
		}
		chrome.storage.local.set({ showCommits: showCommitsElement.checked });
	});
}

enableToggleElement.addEventListener('change', handleEnableChange);
platformUsernameElement.addEventListener('keyup', handlePlatformUsernameChange);
if (githubTokenElement) {
	githubTokenElement.addEventListener('keyup', handleGithubTokenChange);
}
cacheInputElement.addEventListener('keyup', handleCacheInputChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
showCommitsElement.addEventListener('change', handleShowCommitsChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);

document.addEventListener('DOMContentLoaded', handleBodyOnLoad);
