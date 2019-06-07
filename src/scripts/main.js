/* global $,Materialize*/
var enableToggleElement = document.getElementById("enable");
var githubUsernameElement = document.getElementById("githubUsername");
var projectNameElement = document.getElementById("projectName");
var lastWeekContributionElement = document.getElementById("lastWeekContribution");
var startingDateElement = document.getElementById("startingDate");
var endingDateElement = document.getElementById("endingDate");
var showOpenLabelElement = document.getElementById("showOpenLabel");
var userReasonElement = document.getElementById("userReason");
var gsoc = 0; //0 means gsoc. 1 means gsoc
function handleBodyOnLoad() {
	// prefill name
	chrome.storage.local.get(["githubUsername", "projectName", "enableToggle", "startingDate", "endingDate", "showOpenLabel", "userReason", "lastWeekContribution", "gsoc"], function(items) {
		if (items.githubUsername) {
			githubUsernameElement.value = items.githubUsername;
		}
		if (items.projectName) {
			projectNameElement.value = items.projectName;
		}
		if (items.enableToggle) {
			enableToggleElement.checked = items.enableToggle;
		} else if (items.enableToggle !== false) { // undefined
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
		} else if (items.showOpenLabel !== false) { // undefined
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
	});
}

function handleEnableChange() {
	var value = enableToggleElement.checked;
	chrome.storage.local.set({
		"enableToggle": value
	});
}

function handleStartingDateChange() {
	var value = startingDateElement.value;
	chrome.storage.local.set({
		"startingDate": value
	});
}

function handleEndingDateChange() {
	var value = endingDateElement.value;
	chrome.storage.local.set({
		"endingDate": value
	});
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
	chrome.storage.local.set({
		"lastWeekContribution": value
	});
}

function getLastWeek() {
	var today = new Date();
	var noDays_to_goback = gsoc == 0 ? 7 : 1;
	var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
	var lastWeekMonth = lastWeek.getMonth() + 1;
	var lastWeekDay = lastWeek.getDate();
	var lastWeekYear = lastWeek.getFullYear();
	var lastWeekDisplayPadded = ("0000" + lastWeekYear.toString()).slice(-4) + "-" + ("00" + lastWeekMonth.toString()).slice(-2) + "-" + ("00" + lastWeekDay.toString()).slice(-2);
	return lastWeekDisplayPadded;
}

function getToday() {
	var today = new Date();
	var Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	var WeekMonth = Week.getMonth() + 1;
	var WeekDay = Week.getDate();
	var WeekYear = Week.getFullYear();
	var WeekDisplayPadded = ("0000" + WeekYear.toString()).slice(-4) + "-" + ("00" + WeekMonth.toString()).slice(-2) + "-" + ("00" + WeekDay.toString()).slice(-2);
	return WeekDisplayPadded;
}

function handleGithubUsernameChange() {
	var value = githubUsernameElement.value;
	chrome.storage.local.set({
		"githubUsername": value
	});
}

function handleProjectNameChange() {
	var value = projectNameElement.value;
	chrome.storage.local.set({
		"projectName": value
	});
}

function handleOpenLabelChange() {
	var value = showOpenLabelElement.checked;
	chrome.storage.local.set({
		"showOpenLabel": value
	});
}

function handleUserReasonChange() {
	var value = userReasonElement.value;
	chrome.storage.local.set({
		"userReason": value
	});
}

function handleCodeheatClick() {
	gsoc = 0;
	$("#codeheatTab").addClass("active");
	$(".tabs").tabs();
	$("#noDays").text("7 days");
	chrome.storage.local.set({
		"gsoc": 0
	});
	handleLastWeekContributionChange();
}

function handleGsocClick() {
	gsoc = 1;
	$("#gsocTab").addClass("active");
	$(".tabs").tabs();
	$("#noDays").text("1 day");
	chrome.storage.local.set({
		"gsoc": 1
	});
	handleLastWeekContributionChange();
}
enableToggleElement.addEventListener("change", handleEnableChange);
githubUsernameElement.addEventListener("keyup", handleGithubUsernameChange);
projectNameElement.addEventListener("keyup", handleProjectNameChange);
startingDateElement.addEventListener("change", handleStartingDateChange);
endingDateElement.addEventListener("change", handleEndingDateChange);
lastWeekContributionElement.addEventListener("change", handleLastWeekContributionChange);
showOpenLabelElement.addEventListener("change", handleOpenLabelChange);
userReasonElement.addEventListener("keyup", handleUserReasonChange);
document.addEventListener("DOMContentLoaded", handleBodyOnLoad);
document.getElementById("codeheatTab").addEventListener("click", handleCodeheatClick);
document.getElementById("gsocTab").addEventListener("click", handleGsocClick);