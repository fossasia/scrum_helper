function getLastWeek() {
    let today = new Date();
    let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
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
    let WeekMonth = today.getMonth() + 1;
    let WeekDay = today.getDate();
    let WeekYear = today.getFullYear();
    let WeekDisplayPadded =
        ('0000' + WeekYear.toString()).slice(-4) +
        '-' +
        ('00' + WeekMonth.toString()).slice(-2) +
        '-' +
        ('00' + WeekDay.toString()).slice(-2);
    return WeekDisplayPadded;
}

function getYesterday() {
    let today = new Date();
    let yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    let yesterdayMonth = yesterday.getMonth() + 1;
    let yesterdayDay = yesterday.getDate();
    let yesterdayYear = yesterday.getFullYear();
    let yesterdayPadded = 
        ('0000' + yesterdayYear.toString()).slice(-4) +
        '-' +
        ('00' + yesterdayMonth.toString()).slice(-2) +
        '-' +
        ('00' + yesterdayDay.toString()).slice(-2);
    return yesterdayPadded;
}

document.addEventListener('DOMContentLoaded', function() {
    // Dark mode setup
    const darkModeToggle = document.querySelector('img[alt="Night Mode"]');
    const body = document.body;

    chrome.storage.local.get(['darkMode'], function(result) {
        if(result.darkMode) {
            body.classList.add('dark-mode');
            darkModeToggle.src = 'icons/light-mode.png';
        }
    });

    darkModeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        chrome.storage.local.set({ darkMode: isDarkMode });
        this.src = isDarkMode ? 'icons/light-mode.png' : 'icons/night-mode.png';
    });

    function updateContentState(enableToggle) {
        const elementsToToggle = [
            'startingDate',
            'endingDate',
            'userReason',
            'generateReport',
            'copyReport',
            'refreshCache',
            'showOpenLabel',
            'scrumReport',
            'githubUsername',
            'projectName',
        ];

        const radios = document.querySelectorAll('input[name="timeframe"]');
        const customDateContainer = document.getElementById('customDateContainer');

        elementsToToggle.forEach(id => {
            const element = document.getElementById(id);
            if(element) {
                element.disabled = !enableToggle;
                if(!enableToggle) {
                    element.style.opacity = '0.5';
                    element.style.pointerEvents = 'none';
                } else {
                    element.style.opacity = '1';
                    element.style.pointerEvents = 'auto';
                }
            }
        });

        radios.forEach(radio => {
            radio.disabled = !enableToggle;
            const label = document.querySelector(`label[for="${radio.id}"]`);
            if(label){
                if(!enableToggle) {
                    label.style.opacity = '0.5';
                    label.style.pointerEvents = 'none';
                } else {
                    label.style.opacity = '1';
                    label.style.pointerEvents = 'auto';
                }
            }
        });


        if(customDateContainer){
            if (!enableToggle) {
                customDateContainer.style.opacity = '0.5';
                customDateContainer.style.pointerEvents = 'none';
            } else {
                customDateContainer.style.opacity = '1';
                customDateContainer.style.pointerEvents = 'auto';
            }
        }

        const scrumReport = document.getElementById('scrumReport');
        if(scrumReport){
            scrumReport.contentEditable = enableToggle;
            if(!enableToggle){
                scrumReport.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Extension is disabled. Enable it from the options to generate scrum reports.</p>';
            } else{
                const disabledMessage = '<p style="text-align: center; color: #999; padding: 20px;">Extension is disabled. Enable it from the options to generate scrum reports.</p>';
                if(scrumReport.innerHTML === disabledMessage) {
                    scrumReport.innerHTML = '';
                }
            }
        }
    }

    chrome.storage.local.get(['enableToggle'], (items) => {
        const enableToggle = items.enableToggle !== false;
        updateContentState(enableToggle);
        if(!enableToggle){
            return;
        }
        
        initializePopup();
    })

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.enableToggle) {
            updateContentState(changes.enableToggle.newValue);
            if (changes.enableToggle.newValue) {
                // re-initialize if enabled
                initializePopup();
            }
        }
    });

    function initializePopup() {

        // Button setup
        const generateBtn = document.getElementById('generateReport');
        const copyBtn = document.getElementById('copyReport');
        
        generateBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
            this.disabled = true;
            window.generateScrumReport();
        });

        copyBtn.addEventListener('click', function() {
            const scrumReport = document.getElementById('scrumReport');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = scrumReport.innerHTML;
            document.body.appendChild(tempDiv);
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            
            const range = document.createRange();
            range.selectNode(tempDiv);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            try {
                document.execCommand('copy');
                this.innerHTML = '<i class="fa fa-check"></i> Copied!';
                setTimeout(() => {
                    this.innerHTML = '<i class="fa fa-copy"></i> Copy Report';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
            } finally {
                selection.removeAllRanges();
                document.body.removeChild(tempDiv);
            }
        });
        
        // refresh cache button
        document.getElementById('refreshCache').addEventListener('click', async function () {
            const button = this;
            const originalText = button.innerHTML;

            button.classList.add('loading');
            button.innerHTML = '<i class="fa fa-refresh fa-spin"></i><span>Refreshing...</span>';
            button.disabled = true;

            try{
                await chrome.runtime.sendMessage({action: 'forceRefresh'});
                button.innerHTML = '<i class="fa fa-check"></i><span>Refreshed!</span>';
                button.classList.remove('loading');

                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Refresh failed', error);
                button.innerHTML = '<i class="fa fa-exclamation-triangle"></i><span>Failed to refresh</span>';
                button.classList.remove('loading');

                setTimeout(() =>{
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            }
        })

        // Custom date container click handler
        document.getElementById('customDateContainer').addEventListener('click', () => {
            document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
                radio.checked = false
                radio.dataset.wasChecked = 'false'
            });
            
            const startDateInput = document.getElementById('startingDate');
            const endDateInput = document.getElementById('endingDate');
            startDateInput.disabled = false;
            endDateInput.disabled = false;
            
            chrome.storage.local.set({
                lastWeekContribution: false,
                yesterdayContribution: false,
                selectedTimeframe: null
            });
        });

        chrome.storage.local.get([
            'selectedTimeframe', 
            'lastWeekContribution', 
            'yesterdayContribution'
        ], (items) => {
            console.log('Restoring state:', items);
            
            if (!items.selectedTimeframe) {
                items.selectedTimeframe = 'yesterdayContribution';
                items.lastWeekContribution = false;
                items.yesterdayContribution = true;
            }
    
            const radio = document.getElementById(items.selectedTimeframe);
            if (radio) {
                radio.checked = true;
                radio.dataset.wasChecked = 'true';
                
                const startDateInput = document.getElementById('startingDate');
                const endDateInput = document.getElementById('endingDate');
    
                if (items.selectedTimeframe === 'lastWeekContribution') {
                    startDateInput.value = getLastWeek();
                    endDateInput.value = getToday();
                } else {
                    startDateInput.value = getYesterday();
                    endDateInput.value = getToday();
                }
    
                startDateInput.disabled = endDateInput.disabled = true;
    
                chrome.storage.local.set({
                    startingDate: startDateInput.value,
                    endingDate: endDateInput.value,
                    lastWeekContribution: items.selectedTimeframe === 'lastWeekContribution',
                    yesterdayContribution: items.selectedTimeframe === 'yesterdayContribution',
                    selectedTimeframe: items.selectedTimeframe
                });
            }
        });
    }
});

// Radio button click handlers with toggle functionality
document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
    radio.addEventListener('click', function() {
        if (this.dataset.wasChecked === 'true') {
            this.checked = false;
            this.dataset.wasChecked = 'false';
            
            const startDateInput = document.getElementById('startingDate');
            const endDateInput = document.getElementById('endingDate');
            startDateInput.disabled = false;
            endDateInput.disabled = false;
            
            chrome.storage.local.set({
                lastWeekContribution: false,
                yesterdayContribution: false,
                selectedTimeframe: null
            });
        } else {
            document.querySelectorAll('input[name="timeframe"]').forEach(r => {
                r.dataset.wasChecked = 'false';
            });
            this.dataset.wasChecked = 'true';
            toggleRadio(this);
        }
    });
});

function toggleRadio(radio) {
    const startDateInput = document.getElementById('startingDate');
    const endDateInput = document.getElementById('endingDate');

    console.log('Toggling radio:', radio.id);

    if (radio.id === 'lastWeekContribution') {
        startDateInput.value = getLastWeek();
        endDateInput.value = getToday();
    } else if (radio.id === 'yesterdayContribution') {
        startDateInput.value = getYesterday();
        endDateInput.value = getToday();
    }

    startDateInput.disabled = endDateInput.disabled = true;

    chrome.storage.local.set({
        startingDate: startDateInput.value,
        endingDate: endDateInput.value,
        lastWeekContribution: radio.id === 'lastWeekContribution',
        yesterdayContribution: radio.id === 'yesterdayContribution',
        selectedTimeframe: radio.id,
        githubCache: null // Clear cache to force new fetch
    }, () => {
        console.log('State saved, dates:', {
            start: startDateInput.value,
            end: endDateInput.value,
            isLastWeek: radio.id === 'lastWeekContribution'
        });
        // window.generateScrumReport();
    });
}