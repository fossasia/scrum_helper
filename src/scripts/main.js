var enableToggleElement = document.getElementById('enable');
var githubUsernameElement = document.getElementById('githubUsername');
var projectNameElement = document.getElementById('projectName');
var lastWeekContributionElement = document.getElementById('lastWeekContribution');
let yesterdayContributionElement = document.getElementById('yesterdayContribution');
var startingDateElement = document.getElementById('startingDate');
var endingDateElement = document.getElementById('endingDate');
var showOpenLabelElement = document.getElementById('showOpenLabel');
var userReasonElement = document.getElementById('userReason');
function handleBodyOnLoad() {
	browser.storage.local.get(
		[
			'githubUsername',
			'projectName',
			'enableToggle',
			'startingDate',
			'endingDate',
			'showOpenLabel',
			'showClosedLabel',
			'userReason',
			'lastWeekContribution',
			'yesterdayContribution',
		],
		(items) => {
			if (items.githubUsername) {
				githubUsernameElement.value = items.githubUsername;
			}
			if (items.projectName) {
				projectNameElement.value = items.projectName;
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
		},
	);
}
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
	var value = lastWeekContributionElement.checked;
	var labelElement = document.querySelector("label[for='lastWeekContribution']");

	if (value) {
			startingDateElement.disabled = true;
			endingDateElement.disabled = true;
			endingDateElement.value = getToday();
			startingDateElement.value = getLastWeek();
		        handleEndingDateChange();
		        handleStartingDateChange();
			labelElement.classList.add("selectedLabel");
			labelElement.classList.remove("unselectedLabel");
	} else {
			startingDateElement.disabled = false;
			endingDateElement.disabled = false;
			labelElement.classList.add("unselectedLabel");
			labelElement.classList.remove("selectedLabel");
	}
	
	browser.storage.local.set({ lastWeekContribution: value });
}

function handleYesterdayContributionChange() {
	let value = yesterdayContributionElement.checked;
	let labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		startingDateElement.disabled = true;
		endingDateElement.disabled = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getYesterday();
			handleEndingDateChange();
			handleStartingDateChange();
		labelElement.classList.add("selectedLabel");
		labelElement.classList.remove("unselectedLabel");
	} else {
		startingDateElement.disabled = false;
		endingDateElement.disabled = false;
		labelElement.classList.add("unselectedLabel");
		labelElement.classList.remove("selectedLabel");
	}
	browser.storage.local.set({ yesterdayContribution: value });
}

function getLastWeek() {
	var today = new Date();
	var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
	var lastWeekMonth = lastWeek.getMonth() + 1;
	var lastWeekDay = lastWeek.getDate();
	var lastWeekYear = lastWeek.getFullYear();
	var lastWeekDisplayPadded =
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
	var today = new Date();
	var Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	var WeekMonth = Week.getMonth() + 1;
	var WeekDay = Week.getDate();
	var WeekYear = Week.getFullYear();
	var WeekDisplayPadded =
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
function handleProjectNameChange() {
	var value = projectNameElement.value;
	browser.storage.local.set({ projectName: value });
}
function handleOpenLabelChange() {
	var value = showOpenLabelElement.checked;
	var labelElement = document.querySelector("label[for='showOpenLabel']");

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
enableToggleElement.addEventListener('change', handleEnableChange);
githubUsernameElement.addEventListener('keyup', handleGithubUsernameChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
lastWeekContributionElement.addEventListener('change', handleLastWeekContributionChange);
yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
userReasonElement.addEventListener('keyup', handleUserReasonChange);
document.addEventListener('DOMContentLoaded', handleBodyOnLoad);