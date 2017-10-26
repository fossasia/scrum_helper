var nameElement = document.getElementById("name");
var enableToggleElement = document.getElementById("enable");
var githubUsernameElement = document.getElementById("githubUsername");
var startingDateElement = document.getElementById("startingDate");
var endingDateElement = document.getElementById("endingDate");
var showOpenLabelElement = document.getElementById("showOpenLabel");
var showClosedLabelElement = document.getElementById("showClosedLabel");

function handleBodyOnLoad(){
    // prefill name
    chrome.storage.local.get(["name","githubUsername","enableToggle","startingDate","endingDate"],function(items){
        if(items.name){
            var value = items.name;
            nameElement.value=value;
        }
        if(items.githubUsername){
            var value = items.githubUsername;
            githubUsernameElement.value=value;
        }
        if(items.enableToggle){
            var value = items.enableToggle;
            enableToggleElement.checked=value;
        }
        if(items.endingDate){
            endingDateElement.value = items.endingDate;
        }
        if(items.startingDate){
            startingDateElement.value = items.startingDate;
        }
    });
}
function handleNameChange(){
    var value = nameElement.value;
    chrome.storage.local.set({'name': value});
}
function handleEnableChange(){
    var value = enableToggleElement.checked;
    chrome.storage.local.set({'enableToggle': value});
}
function handleStartingDateChange(){
    var value = startingDateElement.value;
    chrome.storage.local.set({'startingDate': value});
}
function handleEndingDateChange(){
    var value = endingDateElement.value;
    chrome.storage.local.set({'endingDate': value});
}
function handleGithubUsernameChange(){
    var value = githubUsernameElement.value;
    chrome.storage.local.set({'githubUsername': value});
}

nameElement.addEventListener("keyup", handleNameChange);
enableToggleElement.addEventListener("keyup", handleEnableChange);
githubUsernameElement.addEventListener("keyup", handleGithubUsernameChange);
startingDateElement.addEventListener("keyup", handleStartingDateChange);
endingDateElement.addEventListener("keyup", handleEndingDateChange);
document.addEventListener("DOMContentLoaded", handleBodyOnLoad);
