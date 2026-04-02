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
			if (
				startingDateElement.value &&
				endingDateElement.value &&
				startingDateElement.value > endingDateElement.value
			) {
				endingDateElement.value = startingDateElement.value;
			}
			syncDateRangeConstraints();
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
	if (startingDateElement.value && endingDateElement.value && startingDateElement.value > endingDateElement.value) {
		endingDateElement.value = startingDateElement.value;
	}
	syncDateRangeConstraints();
	browser.storage.local.set({
		startingDate: startingDateElement.value,
		endingDate: endingDateElement.value,
	});
}
function handleEndingDateChange() {
	if (startingDateElement.value && endingDateElement.value && endingDateElement.value < startingDateElement.value) {
		endingDateElement.value = startingDateElement.value;
	}
	syncDateRangeConstraints();
	browser.storage.local.set({
		startingDate: startingDateElement.value,
		endingDate: endingDateElement.value,
	});
}

function syncDateRangeConstraints() {
	const today = getToday();

	if (endingDateElement.value && endingDateElement.value > today) {
		endingDateElement.value = today;
	}
	if (startingDateElement.value && startingDateElement.value > today) {
		startingDateElement.value = today;
	}

	const startDate = startingDateElement.value;
	const endDate = endingDateElement.value;

	startingDateElement.max = endDate && endDate < today ? endDate : today;
	endingDateElement.min = startDate || '';
	endingDateElement.max = today;
}

function handleYesterdayContributionChange() {
	const value = yesterdayContributionElement.checked;
	const labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		startingDateElement.readOnly = true;
		endingDateElement.readOnly = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getYesterday();
		syncDateRangeConstraints();
		handleEndingDateChange();
		handleStartingDateChange();
		labelElement.classList.add('selectedLabel');
		labelElement.classList.remove('unselectedLabel');
	} else {
		startingDateElement.readOnly = false;
		endingDateElement.readOnly = false;
		syncDateRangeConstraints();
		labelElement.classList.add('unselectedLabel');
		labelElement.classList.remove('selectedLabel');
	}
	browser.storage.local.set({ yesterdayContribution: value });
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
