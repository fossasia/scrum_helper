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
var dropdownElement = document.getElementById('dropdown');
var selectedTextElement = document.getElementById('selectedText');
var selectedImageElement = document.getElementById('selectedImage');
var optionsElement = document.querySelectorAll('.option');


// add open closed labels


function handleBodyOnLoad() {
    // prefill name
    chrome.storage.local.get(
        [
            'scrumHelperEnabled',
            'githubUsername',
            'projectName',
            // 'toggleDot',
            // 'toggleInput',
            // 'toggleContainer',
            'lastWeekContribution',
            'yesterday',
            'startingDate',
            'endingDate',
            'checkbox',
            'userReason',
            'scrumReport',
            // 'copyButton',
            // 'fetchButton',
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
            if(scrumHelperEnabled === false){
                toggleInputElement.checked = false;
                handleToggleInputChange();
            } else {
                toggleInputElement.checked = true;
                handleToggleInputChange();
            }
            if(items.customSelectElement){
                // Write code for custom select
            }
            // if(write code for email clients)

        },
    );
}
// chrome.storage.local.set({toggleInput: value});



// Add custom select functionality
customSelectElement?.addEventListener('click', () => {
    dropdownElement.classList.toggle('active');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if ( !customSelectElement?.contains(e.target)) {
        dropdownElement?.classList.add('hidden');
    }
});

// handle option selection
optionsElement.forEach(option => {
    option.addEventListener('click', () => {
        const value = option.dataset.value;
        const text = option.querySelector('span').textContent;
        const img = option.querySelector('img');

        // update display
        selectedTextElement.textContent = text;
        if(img){
            selectedImageElement.src = img.src;
        }

        // hide dropdown
        dropdownElement.classList.add('hidden');

        // save selected value
        chrome.storage.local.set({
            
        })
    })


})

// Update UI from state
function updateUIFromSate(){
    var value = items.scrumHelperEnabled;
    if (value) {
        toggleContainerElement.classList.add('active');
    }

    projectNameElement.value = items.projectName || '';
    githubUsernameElement.value = items.githubUsername || '';
    startingDateElement.value = items.startingDate || '';
    endingDateElement.value = items.endingDate || '';
    lastWeekContributionElement.checked = items.lastWeekContribution;
    yesterdayElement.checked = items.yesterday;
    userReasonElement.value = items.userReason;
    scrumReportElement.value = items.scrumReport;
    emailClientSelectElement.value = items.selectedEmailClient;
    selectedEmailClient = items.selectedEmailClient;
    checkboxElement.checked = items.checkbox;
    // Update program selection
    const option = document.querySelector(`[data-value="${items.gsoc ? 'gsoc' : 'codeheat'}"]`);
    if (option) {
        const text = option.querySelector('span').textContent;
        const img = option.querySelector('img');
        selectedTextElement.textContent = text;
        if (img) selectedImageElement.src = img.src;
    }
}



function handleToggleInputChange() {
    var value = toggleInputElement.checked;
    
    // Toggle classes instead of inline styles
    if (value) {
        toggleContainerElement.classList.add('active');
    } else {
        toggleContainerElement.classList.remove('active');
    }
    
    // Update form elements enabled state
    [
        githubUsernameElement,
        projectNameElement,
        startingDateElement,
        endingDateElement,
        lastWeekContributionElement,
        yesterdayElement,
        checkboxElement,
        userReasonElement,
        emailClientSelectElement,
        fetchButtonElement,
        scrumReportElement
    ].forEach(element => {
        if (element) element.disabled = !value;
    });

    // Update custom select state
    if (customSelectElement) {
        customSelectElement.style.pointerEvents = value ? 'auto' : 'none';
        customSelectElement.style.opacity = value ? '1' : '0.5';
    }

    // Save state
    chrome.storage.local.set({ 
        toggleInput: value,
        scrumHelperEnabled: value 
    });
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

// Event handlers

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
toggleInputElement?.addEventListener('click', handleToggleInputChange);