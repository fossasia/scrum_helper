var enableToggleElement = document.getElementById("enable");
var githubUsernameElement = document.getElementById("githubUsername");
var startingDateElement = document.getElementById("startingDate");
var endingDateElement = document.getElementById("endingDate");
var showOpenLabelElement = document.getElementById("showOpenLabel");
var showClosedLabelElement = document.getElementById("showClosedLabel");
var userReasonElement = document.getElementById("userReason");

function handleBodyOnLoad(){
	// prefill name
	chrome.storage.local.get(["githubUsername","enableToggle","startingDate","endingDate","showOpenLabel","showClosedLabel","userReason"],function(items){
		if(items.githubUsername){
			githubUsernameElement.value=items.githubUsername;
		}
		if(items.enableToggle){
			enableToggleElement.checked=items.enableToggle;
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
		if(items.showClosedLabel){
			showClosedLabelElement.checked= items.showClosedLabel;
		}
		if(items.userReason){
			userReasonElement.value = items.userReason;
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
	window.close();
	chrome.tabs.executeScript({
		code: "document.location.reload()"
	});
}
enableToggleElement.addEventListener("change", handleEnableChange);
githubUsernameElement.addEventListener("keyup", handleGithubUsernameChange);
startingDateElement.addEventListener("keyup", handleStartingDateChange);
endingDateElement.addEventListener("keyup", handleEndingDateChange);
showOpenLabelElement.addEventListener("change", handleOpenLabelChange);
showClosedLabelElement.addEventListener("change", handleClosedLabelChange);
userReasonElement.addEventListener("keyup", handleUserReasonChange);
document.getElementById("refresh").addEventListener("click",handleRefresh);
document.addEventListener("DOMContentLoaded", handleBodyOnLoad);
