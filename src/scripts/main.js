let enableToggleElement = document.getElementById('enable');
let githubUsernameElement = document.getElementById('githubUsername');
let githubTokenElement = document.getElementById('githubToken');
let cacheInputElement = document.getElementById('cacheInput');
let projectNameElement = document.getElementById('projectName');
let lastWeekContributionElement = document.getElementById('lastWeekContribution');
let yesterdayContributionElement = document.getElementById('yesterdayContribution');
let startingDateElement = document.getElementById('startingDate');
let endingDateElement = document.getElementById('endingDate');
let showOpenLabelElement = document.getElementById('showOpenLabel');
let userReasonElement = document.getElementById('userReason');
let showCommitsElement = document.getElementById('showCommits');

function handleBodyOnLoad() {
	browser.storage.local.get(
		[
			'githubUsername',
			'projectName',
			'enableToggle',
			'startingDate',
			'endingDate',
			'showOpenLabel',
			'userReason',
			'lastWeekContribution',
			'yesterdayContribution',
			'cacheInput',
			'githubToken',
			'showCommits',
		],
		(items) => {
			if (items.githubUsername) {
				githubUsernameElement.value = items.githubUsername;
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
			if (items.userReason) {
				userReasonElement.value = items.userReason;
			}
			if (items.lastWeekContribution) {
				lastWeekContributionElement.checked = items.lastWeekContribution;
				handleLastWeekContributionChange();
			}
			else if (items.lastWeekContribution !== false) {
				lastWeekContributionElement.checked = true;
				handleLastWeekContributionChange();
			}
			if (items.yesterdayContribution) {
				yesterdayContributionElement.checked = items.yesterdayContribution;
				handleYesterdayContributionChange();
			}
			else if (items.yesterdayContribution !== false) {
				yesterdayContributionElement.checked = true;
				handleYesterdayContributionChange();
			}
			if (items.showCommits){
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
		const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
		await chrome.tabs.sendMessage(tabs[0].id, {
			action: 'forceRefresh',
			timestamp: Date.now()
		});

		// Reload the active tab to re-inject content
		chrome.tabs.reload(tabs[0].id);

		Materialize.toast({ html: 'Data refreshed successfully!', classes: 'green' });
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
	var value = enableToggleElement.checked;
	browser.storage.local.set({ enableToggle: value });
}
function handleStartingDateChange() {
	var value = startingDateElement.value;
	browser.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	var value = endingDateElement.value;
	browser.storage.local.set({ endingDate: value });
}
function handleLastWeekContributionChange() {
	let value = lastWeekContributionElement.checked;
	let labelElement = document.querySelector("label[for='lastWeekContribution']");
	if (value) {
		startingDateElement.readOnly = true;
		endingDateElement.readOnly = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getLastWeek();
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
	browser.storage.local.set({ lastWeekContribution: value });
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
	browser.storage.local.set({ yesterdayContribution: value });
}

function getLastWeek() {
	let today = new Date();
	let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
	let lastWeekMonth = lastWeek.getMonth() + 1;
	let lastWeekDay = lastWeek.getDate();
	let lastWeekYear = lastWeek.getFullYear();
	let lastWeekDisplayPadded =
		('0000' + lastWeekYear.toString()).slice(-4) +
		'-' +
		('00' + lastWeekMonth.toString()).slice(-2) +
		'-' +
		('00' + lastWeekDay.toString()).slice(-2);
	return lastWeekDisplayPadded;
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

function handleGithubUsernameChange() {
	var value = githubUsernameElement.value;
	browser.storage.local.set({ githubUsername: value });
}
function handleGithubTokenChange() {
	let value = githubTokenElement.value;
	chrome.storage.local.set({ githubToken: value });
}
function handleProjectNameChange() {
	var value = projectNameElement.value;
	browser.storage.local.set({ projectName: value });
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

	browser.storage.local.set({ showOpenLabel: value });
}

function handleUserReasonChange() {
	var value = userReasonElement.value;
	browser.storage.local.set({ userReason: value });
}

function handleShowCommitsChange() {
    let value = showCommitsElement.checked;
    chrome.storage.local.set({ showCommits: value });
}

enableToggleElement.addEventListener('change', handleEnableChange);
githubUsernameElement.addEventListener('keyup', handleGithubUsernameChange);
githubTokenElement.addEventListener('keyup', handleGithubTokenChange);
cacheInputElement.addEventListener('keyup', handleCacheInputChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
showCommitsElement.addEventListener('change', handleShowCommitsChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
lastWeekContributionElement.addEventListener('change', handleLastWeekContributionChange);
yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
userReasonElement.addEventListener('keyup', handleUserReasonChange);
document.addEventListener('DOMContentLoaded', handleBodyOnLoad);