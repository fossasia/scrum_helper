/* global $,Materialize*/
var enableToggleElement = document.getElementById('enable');
var githubUsernameElement = document.getElementById('githubUsername');
var projectNameElement = document.getElementById('projectName');
var lastWeekContributionElement = document.getElementById('lastWeekContribution');
var startingDateElement = document.getElementById('startingDate');
var endingDateElement = document.getElementById('endingDate');
var showOpenLabelElement = document.getElementById('showOpenLabel');
var userReasonElement = document.getElementById('userReason');
var gsoc = 0; //0 means gsoc. 1 means gsoc
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
			if (items.gsoc == 1) {
				handleGsocClick();
			} else {
				handleCodeheatClick();
			}
		},
	);
}
function handleEnableChange() {
	var value = enableToggleElement.checked;
	chrome.storage.local.set({ enableToggle: value });
}
function handleStartingDateChange() {
	var value = startingDateElement.value;
	chrome.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	var value = endingDateElement.value;
	chrome.storage.local.set({ endingDate: value });
}
function handleLastWeekContributionChange() {
	var value = lastWeekContributionElement.checked;
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
	var today = new Date();
	var noDays_to_goback = gsoc == 0 ? 7 : 1;
	var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
	lastWeek.setHours(0, 0, 0 , 0);
	var extendedLastWeek = new Date(lastWeek.getTime() + (14 *60 *60 * 1000));
	var lastWeekMonth = extendedLastWeek.getMonth() + 1;
	var lastWeekDay = extendedLastWeek.getDate();
	var lastWeekYear = extendedLastWeek.getFullYear();
	var lastWeekDisplayPadded =
		('0000' + lastWeekYear.toString()).slice(-4) +
		'-' +
		('00' + lastWeekMonth.toString()).slice(-2) +
		'-' +
		('00' + lastWeekDay.toString()).slice(-2);
	return lastWeekDisplayPadded;
}
function getToday() {
	var today = new Date();
	var today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	today.setHours(23, 59, 59, 999);
	var extendedToday = new Date(today.getTime() + (14 * 60 * 60 * 1000));
	var todayMonth = extendedToday.getMonth() + 1;
    var todayDay = extendedToday.getDate();
    var todayYear = extendedToday.getFullYear();
    var todayDisplayPadded =
        ('0000' + todayYear.toString()).slice(-4) +
        '-' +
        ('00' + todayMonth.toString()).slice(-2) +
        '-' +
        ('00' + todayDay.toString()).slice(-2);
    return todayDisplayPadded;
}

function handleGithubUsernameChange() {
	var value = githubUsernameElement.value;
	chrome.storage.local.set({ githubUsername: value });
}
function handleProjectNameChange() {
	var value = projectNameElement.value;
	chrome.storage.local.set({ projectName: value });
}
function handleOpenLabelChange() {
	var value = showOpenLabelElement.checked;
	chrome.storage.local.set({ showOpenLabel: value });
	chrome.storage.local.set({ showClosedLabel: value });
}
function handleUserReasonChange() {
	var value = userReasonElement.value;
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
