/* global $,Materialize*/
let enableToggleElement = document.getElementById('enable');
let githubUsernameElement = document.getElementById('githubUsername');
let projectNameElement = document.getElementById('projectName');
let lastWeekContributionElement = document.getElementById('lastWeekContribution');
let startingDateElement = document.getElementById('startingDate');
let endingDateElement = document.getElementById('endingDate');
let showOpenLabelElement = document.getElementById('showOpenLabel');
let userReasonElement = document.getElementById('userReason');
let gsoc = 0; //0 means gsoc. 1 means gsoc
function handleBodyOnLoad() {
	// prefill name
	chrome.storage.local.get(
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
			'gsoc',
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
			} else if (items.lastWeekContribution !== false) {
				lastWeekContributionElement.checked = true;
				handleLastWeekContributionChange();
			}
		},
	);
}
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
function handleLastWeekContributionChange() {
	let value = lastWeekContributionElement.checked;
	if (value) {
		startingDateElement.disabled = true;
		endingDateElement.disabled = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getLastWeek();
		handleEndingDateChange();
		handleStartingDateChange();
	} else {
		startingDateElement.disabled = false;
		endingDateElement.disabled = false;
	}
	chrome.storage.local.set({ lastWeekContribution: value });
}
function getLastWeek() {
	let today = new Date();
	let noDays_to_goback = gsoc == 0 ? 7 : 1;
	let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
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
function getToday() {
	let today = new Date();
	let week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	let weekMonth = week.getMonth() + 1;
	let weekDay = week.getDate();
	let weekYear = week.getFullYear();
	let weekDisplayPadded =
		('0000' + weekYear.toString()).slice(-4) +
		'-' +
		('00' + weekMonth.toString()).slice(-2) +
		'-' +
		('00' + weekDay.toString()).slice(-2);
	return weekDisplayPadded;
}
function handleGithubUsernameChange() {
	let value = githubUsernameElement.value;
	chrome.storage.local.set({ githubUsername: value });
}
function handleProjectNameChange() {
	let value = projectNameElement.value;
	chrome.storage.local.set({ projectName: value });
}
function handleOpenLabelChange() {
	let value = showOpenLabelElement.checked;
	chrome.storage.local.set({ showOpenLabel: value });
	chrome.storage.local.set({ showClosedLabel: value });
}
function handleUserReasonChange() {
	let value = userReasonElement.value;
	chrome.storage.local.set({ userReason: value });
}

enableToggleElement.addEventListener('change', handleEnableChange);
githubUsernameElement.addEventListener('keyup', handleGithubUsernameChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
lastWeekContributionElement.addEventListener('change', handleLastWeekContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
userReasonElement.addEventListener('keyup', handleUserReasonChange);
document.addEventListener('DOMContentLoaded', handleBodyOnLoad);