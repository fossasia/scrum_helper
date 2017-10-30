/* global $,Materialize*/
var enableToggleElement = document.getElementById("enable");
var githubUsernameElement = document.getElementById("githubUsername");
var lastWeekContributionElement=document.getElementById("lastWeekContribution");
var startingDateElement = document.getElementById("startingDate");
var endingDateElement = document.getElementById("endingDate");
var showOpenLabelElement = document.getElementById("showOpenLabel");
var showClosedLabelElement = document.getElementById("showClosedLabel");
var userReasonElement = document.getElementById("userReason");

function handleBodyOnLoad(){
	// prefill name
	chrome.storage.local.get(["githubUsername","enableToggle","startingDate","endingDate","showOpenLabel","showClosedLabel","userReason","lastWeekContribution"],function(items){
		if(items.githubUsername){
			githubUsernameElement.value=items.githubUsername;
		}
		if(items.enableToggle){
			enableToggleElement.checked=items.enableToggle;
		}
		else if(items.enableToggle!==false){// undefined
			enableToggleElement.checked=true;
			handleEnableChange();
		}
		if(items.endingDate){
			endingDateElement.value = items.endingDate;
		}
		if(items.startingDate){
			startingDateElement.value = items.startingDate;
		}
		if(items.showOpenLabel){
			showOpenLabelElement.checked= items.showOpenLabel;
		}
		else if(items.showOpenLabel!==false){// undefined
			showOpenLabelElement.checked=true;
			handleOpenLabelChange();
		}
		if(items.showClosedLabel){
			showClosedLabelElement.checked= items.showClosedLabel;
		}
		else if(items.showClosedLabel!==false){
			showClosedLabelElement.checked=true;
			handleClosedLabelChange();
		}
		if(items.userReason){
			userReasonElement.value = items.userReason;
		}
		if(items.lastWeekContribution){
			lastWeekContributionElement.checked=items.lastWeekContribution;
			handleLastWeekContributionChange();
		}
		else if(items.lastWeekContribution!==false){
			lastWeekContributionElement.checked=true;
			handleLastWeekContributionChange();
		}
	});
}
function handleEnableChange(){
	var value = enableToggleElement.checked;
	chrome.storage.local.set({"enableToggle": value});
}
function handleStartingDateChange(){
	var value = startingDateElement.value;
	chrome.storage.local.set({"startingDate": value});
}
function handleEndingDateChange(){
	var value = endingDateElement.value;
	chrome.storage.local.set({"endingDate": value});
}
function handleLastWeekContributionChange(){
	var value = lastWeekContributionElement.checked;
	if(value){
		startingDateElement.disabled=true;
		endingDateElement.disabled=true;
		endingDateElement.value=getToday();
		startingDateElement.value=getLastWeek();
		handleEndingDateChange();
		handleStartingDateChange();
	}
	else{
		startingDateElement.disabled=false;
		endingDateElement.disabled=false;
	}
	chrome.storage.local.set({"lastWeekContribution": value});
}
function getLastWeek(){
	var today = new Date();
	var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
	var lastWeekMonth = lastWeek.getMonth() + 1;
	var lastWeekDay = lastWeek.getDate();
	var lastWeekYear = lastWeek.getFullYear();
	var lastWeekDisplayPadded =("0000" + lastWeekYear .toString()).slice(-4) +"-" + ("00" + lastWeekMonth.toString()).slice(-2)+ "-" + ("00" + lastWeekDay .toString()).slice(-2);
	return lastWeekDisplayPadded;
}
function getToday(){
	var today = new Date();
	var Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	var WeekMonth = Week.getMonth() + 1;
	var WeekDay = Week.getDate();
	var WeekYear = Week.getFullYear();
	var WeekDisplayPadded =("0000" + WeekYear .toString()).slice(-4) +"-" + ("00" + WeekMonth.toString()).slice(-2)+ "-" + ("00" + WeekDay .toString()).slice(-2);
	return WeekDisplayPadded;
}


function handleGithubUsernameChange(){
	var value = githubUsernameElement.value;
	chrome.storage.local.set({"githubUsername": value});
}
function handleOpenLabelChange(){
	var value = showOpenLabelElement.checked;
	chrome.storage.local.set({"showOpenLabel": value});
}
function handleClosedLabelChange(){
	var value = showClosedLabelElement.checked;
	chrome.storage.local.set({"showClosedLabel": value});
}
function handleUserReasonChange(){
	var value = userReasonElement.value;
	chrome.storage.local.set({"userReason": value});
}
function handleRefresh(){
	window.onbeforeunload = null;
	window.close();
	chrome.tabs.executeScript({
		code: "document.location.reload()"
	});
}
enableToggleElement.addEventListener("change", handleEnableChange);
githubUsernameElement.addEventListener("keyup", handleGithubUsernameChange);
startingDateElement.addEventListener("keyup", handleStartingDateChange);
endingDateElement.addEventListener("keyup", handleEndingDateChange);
lastWeekContributionElement.addEventListener("change", handleLastWeekContributionChange);
showOpenLabelElement.addEventListener("change", handleOpenLabelChange);
showClosedLabelElement.addEventListener("change", handleClosedLabelChange);
userReasonElement.addEventListener("keyup", handleUserReasonChange);
document.getElementById("refresh").addEventListener("click",handleRefresh);
document.addEventListener("DOMContentLoaded", handleBodyOnLoad);
