let enableToggleElement = document.getElementById('enable');
let platformUsernameElement = document.getElementById('platformUsername');
let githubTokenElement = document.getElementById('githubToken');
let cacheInputElement = document.getElementById('cacheInput');
let projectNameElement = document.getElementById('projectName');
let yesterdayContributionElement = document.getElementById('yesterdayContribution');
let startingDateElement = document.getElementById('startingDate');
let endingDateElement = document.getElementById('endingDate');
let showOpenLabelElement = document.getElementById('showOpenLabel');

let userReasonElement = null; 

let showCommitsElement = document.getElementById('showCommits');

function handleBodyOnLoad() {
	// Migration: Handle existing users with old platformUsername storage
	chrome.storage.local.get(['platform', 'platformUsername'], function (result) {
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
			}
			else if (items.yesterdayContribution !== false) {
				yesterdayContributionElement.checked = true;
				handleYesterdayContributionChange();
			}
			if (items.showCommits) {
				showCommitsElement.checked = items.showCommits;
			} else {
				showCommitsElement.checked = false;
				handleShowCommitsChange();
			}
		},
	);
}

document.getElementById('refreshCache').addEventListener('click', async (e) => {
	const button = e.currentTarget;
	button.classList.add('loading');
	button.disabled = true;

	try {
	} catch (err) {
		console.log('Refresh successful',);
	} finally {
		setTimeout(() => {
			button.classList.remove('loading');
			button.disabled = false;
		}, 500);
	}
});

function handleEnableChange() {
	let value = enableToggleElement.checked;
	chrome.storage.local.set({ enableToggle: value });
}
function handleStartingDateChange() {
	let value = startingDateElement.value;
	chrome.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	let value = endingDateElement.value;
	chrome.storage.local.set({ endingDate: value });
}

function handleYesterdayContributionChange() {
	let value = yesterdayContributionElement.checked;
	let labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		startingDateElement.readOnly = true;
		endingDateElement.readOnly = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getYesterday();
		handleEndingDateChange();
		handleStartingDateChange();
		labelElement.classList.add("selectedLabel");
		labelElement.classList.remove("unselectedLabel");
	} else {
		startingDateElement.readOnly = false;
		endingDateElement.readOnly = false;
		labelElement.classList.add("unselectedLabel");
		labelElement.classList.remove("selectedLabel");
	}
	chrome.storage.local.set({ yesterdayContribution: value });
}

function getYesterday() {
	let today = new Date();
	let yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
	let yesterdayMonth = yesterday.getMonth() + 1;
	let yesterdayWeekDay = yesterday.getDate();
	let yesterdayYear = yesterday.getFullYear();
	let yesterdayPadded =
		('0000' + yesterdayYear.toString()).slice(-4) +
		'-' +
		('00' + yesterdayMonth.toString()).slice(-2) +
		'-' +
		('00' + yesterdayWeekDay.toString()).slice(-2);
	return yesterdayPadded;
}
function getToday() {
	let today = new Date();
	let Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	let WeekMonth = Week.getMonth() + 1;
	let WeekDay = Week.getDate();
	let WeekYear = Week.getFullYear();
	let WeekDisplayPadded =
		('0000' + WeekYear.toString()).slice(-4) +
		'-' +
		('00' + WeekMonth.toString()).slice(-2) +
		'-' +
		('00' + WeekDay.toString()).slice(-2);
	return WeekDisplayPadded;
}

function handlePlatformUsernameChange() {
	let value = platformUsernameElement.value;
	chrome.storage.local.get(['platform'], function (result) {
		const platform = result.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		chrome.storage.local.set({ [platformUsernameKey]: value });
	});
}
function handleGithubTokenChange() {
	let value = githubTokenElement.value;
	chrome.storage.local.set({ githubToken: value });
}
function handleProjectNameChange() {
	let value = projectNameElement.value;
	chrome.storage.local.set({ projectName: value });
}
function handleCacheInputChange() {
	let value = cacheInputElement.value;
	chrome.storage.local.set({ cacheInput: value });
}
function handleOpenLabelChange() {
	let value = showOpenLabelElement.checked;
	let labelElement = document.querySelector("label[for='showOpenLabel']");

	if (value) {
		labelElement.classList.add("selectedLabel");
		labelElement.classList.remove("unselectedLabel");
	} else {
		labelElement.classList.add("unselectedLabel");
		labelElement.classList.remove("selectedLabel");
	}

	chrome.storage.local.set({ showOpenLabel: value });
}



function handleShowCommitsChange() {
	let value = showCommitsElement.checked;
	chrome.storage.local.set({ showCommits: value });
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