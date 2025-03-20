/* global $,Materialize*/
const enableToggleElement = document.getElementById('enable');
const githubUsernameElement = document.getElementById('githubUsername');
const projectNameElement = document.getElementById('projectName');
const lastWeekContributionElement = document.getElementById('lastWeekContribution');
const startingDateElement = document.getElementById('startingDate');
const endingDateElement = document.getElementById('endingDate');
const showOpenLabelElement = document.getElementById('showOpenLabel');
const userReasonElement = document.getElementById('userReason');
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
			if (items.gsoc === 1) {
				handleGsocClick();
			} else {
				handleCodeheatClick();
			}
		},
	);
}
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
function handleLastWeekContributionChange() {
	const value = lastWeekContributionElement.checked;
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
function getLastWeek(gsoc) {
	const today = new Date();
	const noDays_to_goback = gsoc === 0 ? 7 : 1;
	const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);

	const lastWeekYear = lastWeek.getFullYear();
	const lastWeekMonth = String(lastWeek.getMonth() + 1).padStart(2, '0');
	const lastWeekDay = String(lastWeek.getDate()).padStart(2, '0');

	return `${lastWeekYear}-${lastWeekMonth}-${lastWeekDay}`;
}

function getToday() {
	const today = new Date();
	const Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const WeekMonth = Week.getMonth() + 1;
	const WeekDay = Week.getDate();
	const WeekYear = Week.getFullYear();
	const WeekDisplayPadded = `${(`0000${WeekYear.toString()}`).slice(-4)}-${(`00${WeekMonth.toString()}`).slice(-2)}-${(`00${WeekDay.toString()}`).slice(-2)}`;
	return WeekDisplayPadded;
}

function handleGithubUsernameChange() {
	const value = githubUsernameElement.value;
	chrome.storage.local.set({ githubUsername: value });
}
function handleProjectNameChange() {
	const value = projectNameElement.value;
	chrome.storage.local.set({ projectName: value });
}
function handleOpenLabelChange() {
	const value = showOpenLabelElement.checked;
	chrome.storage.local.set({ showOpenLabel: value });
	chrome.storage.local.set({ showClosedLabel: value });
}
function handleUserReasonChange() {
	const value = userReasonElement.value;
	chrome.storage.local.set({ userReason: value });
}
function handleCodeheatClick() {
	gsoc = 0;
	$('#codeheatTab').addClass('active');
	$('.tabs').tabs();
	$('#noDays').text('7 days');
	chrome.storage.local.set({ gsoc: 0 });
	handleLastWeekContributionChange();
}
function handleGsocClick() {
	gsoc = 1;
	$('#gsocTab').addClass('active');
	$('.tabs').tabs();
	$('#noDays').text('1 day');
	chrome.storage.local.set({ gsoc: 1 });
	handleLastWeekContributionChange();
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
document.getElementById('codeheatTab').addEventListener('click', handleCodeheatClick);
document.getElementById('gsocTab').addEventListener('click', handleGsocClick);
