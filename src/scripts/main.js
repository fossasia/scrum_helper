var nameElement = document.getElementById("name");
var enableToggleElement = document.getElementById("enable");
var githubUsernameElement = document.getElementById("githubUsername");
var startingDateElement = document.getElementById("startingDate");
var endingDateElement = document.getElementById("endingDate");
var showOpenLabelElement = document.getElementById("showOpenLabel");
var showClosedLabelElement = document.getElementById("showClosedLabel");

function handleBodyOnLoad(){
    // prefill name
    chrome.storage.local.get(["name","githubUsername","enableToggle","startingDate","endingDate","showOpenLabel","showClosedLabel"],function(items){
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
        if(items.showOpenLabel){
            showOpenLabelElement.checked= items.showOpenLabel;
        }
        if(items.showClosedLabel){
            showClosedLabelElement.checked= items.showClosedLabel;
        }
    });
}
function handleNameChange(){
    var username = githubUsernameElement.value;
    var value = fetchGithubUserData(username);
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
function handleOpenLabelChange(){
    var value = showOpenLabelElement.checked;
    chrome.storage.local.set({'showOpenLabel': value});
}
function handleClosedLabelChange(){
    var value = showClosedLabelElement.checked;
    chrome.storage.local.set({'showClosedLabel': value});
}
function handleRefresh(){
    window.close();
    chrome.tabs.executeScript({
    code: 'document.location.reload()'
  });
}

function fetchGithubUserData(username) {
  var url="https://api.github.com/users/"+username;
  $.ajax({
    dataType: "json",
    type: "GET",
    url: url,
    error: function(xhr,textStatus,errorThrown) {
      console.log(textStatus);
    },
    success: function (data) {
      return data.username;
    }
  });
}

nameElement.addEventListener("keyup", handleNameChange);
enableToggleElement.addEventListener("change", handleEnableChange);
githubUsernameElement.addEventListener("keyup", handleGithubUsernameChange);
startingDateElement.addEventListener("keyup", handleStartingDateChange);
endingDateElement.addEventListener("keyup", handleEndingDateChange);
showOpenLabelElement.addEventListener("change", handleOpenLabelChange);
showClosedLabelElement.addEventListener("change", handleClosedLabelChange);
document.getElementById("refresh").addEventListener("click",handleRefresh);
document.addEventListener("DOMContentLoaded", handleBodyOnLoad);
