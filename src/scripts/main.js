var toggleContainerElement = document.getElementById('toggleContainer');  // Toggle behaiviour
var toggleInputElement = document.getElementById('toggleInput');  // Toggle behaiviour
var toggleDotElement = document.getElementById('toggleDot');  // Toggle behaiviour
var githubUsernameElement = document.getElementById('githubUsername');
var projectNameElement = document.getElementById('projectName');
var lastWeekContributionElement = document.getElementById('lastWeekContribution');
var yesterdayElement = document.getElementById('yesterday');
var startingDateElement = document.getElementById('startingDate');
var endingDateElement = document.getElementById('endingDate');
var checkboxElement = document.getElementById('checkbox');
var userReasonElement = document.getElementById('userReason');
var scrumReportElement = document.getElementById('scrumReport');
var copyButtonElement = document.getElementById('copyButton');
var fetchButtonElement = document.getElementById('fetchButton');
var customSelectElement = document.getElementById('customSelect');
var emailClientSelectElement = document.getElementById('emailClientSelect');
var selectedEmailClient = 'googlegroups';
// add open closed labels


function handleBodyOnLoad() {
    // prefill name
    chrome.storage.local.get(
        [
            'githubUsername',
            'projectName',
            'toggleDot',
            'toggleInput',
            'toggleContainer',
            'lastWeekContribution',
            'yesterday',
            'startingDate',
            'endingDate',
            'checkbox',
            'userReason',
            'scrumReport',
            'copyButton',
            'fetchButton',
            'customSelect',
        ],
        (items) => {
            if(items.githubUsername) {
                githubUsernameElement.value = items.githubUsername;
            }
            if(items.projectName){
                projectNameElement.value = items.projectName;
            }
            if(items.toggleInput){
                toggleInputElement.checked = items.toggleInput;
            }else if(items.toggleInput !== false){
                toggleInputElement.checked = true;
                handleToggleInputChange();
            }
            if(items.lastWeekContribution){
                lastWeekContributionElement.checked = items.lastWeekContribution;
                handleLastWeekContributionChange();
            } else if(items.lastWeekContribution !== false){
                lastWeekContributionElement.checked = true;
                handleLastWeekContributionChange();
            }
            if(items.yesterday){
                yesterdayElement.checked = items.yesterday;
                handleYesterdayChange();
            }
            if(items.startingDate){
                startingDateElement.value = items.startingDate;
            }
            if(items.endingDate){
                endingDateElement.value = items.endingDate;
            }
            if(items.checkbox){
                checkboxElement.checked = items.checkbox;
                handleCheckboxChange();
            }
            if(items.userReason){
                userReasonElement = items.userReason;
            }
            if(items.scrumReport){
                scrumReportElement = items.scrumReport;
            }
            if(items.customSelectElement){
                // Write code for custom select
            }
            // if(write code for email clients)

        },
    );
}
// chrome.storage.local.set({toggleInput: value});

function handleToggleInputChange() {
    var value = toggleInputElement.checked;

    if (value) {
        toggleContainerElement.classList.add('active');
        toggleDotElement.classList.add('active');
    } else {
        toggleContainerElement.classList.remove('active');
        toggleDotElement.classList.remove('active');
    }
    
    chrome.storage.local.set({ toggleInput: value });
}
function handleStartingDateChange(){
    var value = startingDateElement.value;
    chrome.storage.local.set({ startingDate: value });
}
function handleEndingDateChange(){
    var value = endingDateElement.value;
    chrome.storage.local.set({ endingDate: value });
}
function handleLastWeekContributionChange(){
    var value = lastWeekContributionElement.checked;
    if(value){
        startingDateElement.disable = true;
        endingDateElement.disable = true;
        endingDateElement.value = getToday();
        startingDateElement.value = getLastWeek();
        handleEndingDateChange();
        handleStartingDateChange();
    } else{
        startingDateElement.disable = false;
        endingDateElement.disable = false;
    }
    chrome.storage.local.set({ lastWeekContribution: value });
}
function handleYesterdayChange(){
    var value = yesterdayElement.checked;
    if(value){
        startingDateElement.disable = true;
        endingDateElement.disable = true;
        endingDateElement.value = getToday();
        startingDateElement.value = getYesterday();
        handleEndingDateChange();
        handleStartingDateChange();
    } else{
        startingDateElement.disable = false;
        endingDateElement.disable = false;
    }
    chrome.storage.local.set({ yesterday: value });
}
// Write a fetch function
function prefillScrumReport(){
    fetchButtonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Fetching...</span>';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'generateScrumReport',
            data: {
                githubUsername: githubUsernameElement.value,
                projectName: projectNameElement.value,
                startingDate: startingDateElement.value,
                endingDate: endingDateElement.value,
                emailClient: selectedEmailClient,
                userReason: userReasonElement.value,
            }
        }, function(response) {
            if(response && response.scrumReport){
                scrumReportElement.value = response.scrumReport;
                enableScrumReportEditing();
                chrome.storage.local.set({
                    scrumReport: response.scrumReport,
                    lastUpdated: new Date().toISOString()
                });

                fetchButtonElement.innerHTML = '<i class="fas fa-check"></i><span>Done</span>';
                setTimeout(() => {
                    fetchButtonElement.innerHTML = '<i class="fas fa-sync"></i><span>Fetch Report</span>';
                }, 2000);
            }
        });
    });
}

function getLastWeek() {
    var today = new Date();
    var noDays_to_goback = 7;
    var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
    var lastWeekMonth = lastWeek.getMonth() + 1;
    var lastWeekDay = lastWeek.getDate();
    var lastWeekYear = lastWeek.getFullYear();
    var lastWekDisplayPadded = ('0000' + lastWeekYear.toString()).slice(-4)+ '-' + ('00' + lastWeekMonth.toString()).slice(-2) + '-' + ('00' + lastWeekDay.toString()).slice(-2);
    return lastWekDisplayPadded;
}

function getYesterday() {
    var today = new Date();
    var noDays_to_goback = 1;
    var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
    var yesterdayMonth = yesterday.getMonth() + 1;
    var yesterdayDay = yesterday.getDate();
    var yesterdayYear = yesterday.getFullYear();
    var yesterdayDisplayPadded = ('0000' + yesterdayYear.toString()).slice(-4)+ '-' + ('00' + yesterdayMonth.toString()).slice(-2) + '-' + ('00' + yesterdayDay.toString()).slice(-2);
    return yesterdayDisplayPadded;
}
function handleGithubUsernameChange(){
    var value = githubUsernameElement.value;
    chrome.storage.local.set({githubUsername: value});
}
function handleProjectNameChange(){
    var value = projectNameElement.value;
    chrome.storage.local.set({projectName: value});
}
function handleUserReasonChange(){
    var value = userReasonElement.value;
    chrome.storage.local.set({ userReason: value});
}
function handleEmailClientChange(){
    var value = emailClientSelectElement.value;
    selectedEmailClient = value;
    chrome.storage.local.set({ selectedEmailClient: value });
}
function handleScrumReportChange() {
    var value = scrumReportElement.value;
    chrome.storage.local.set({ scrumReport: value });
}
function enableScrumReportEditing(){
    scrumReportElement.removeEventListener('input', handleScrumReportChange);
    scrumReportElement.readOnly = false;
    scrumReportElement.addEventListener('input', handleScrumReportChange);
    scrumReportElement.classList.add('editable');
}


toggleInputElement.addEventListener('change', handleToggleInputChange);
githubUsernameElement.addEventListener('keyup', handleGithubUsernameChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
lastWeekContributionElement.addEventListener('change', handleLastWeekContributionChange);
yesterdayElement.addEventListener('change', handleYesterdayChange);
userReasonElement.addEventListener('keyup', handleUserReasonChange);
document.addEventListener('DOMContentLoaded', handleBodyOnLoad);
emailClientSelectElement.addEventListener('change', handleEmailClientChange);
fetchButtonElement.addEventListener('click', prefillScrumReport);
