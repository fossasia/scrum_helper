function getLastWeek() {
    var today = new Date();
    var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    var lastWeekMonth = lastWeek.getMonth() + 1;
    var lastWeekDay = lastWeek.getDate();
    var lastWeekYear = lastWeek.getFullYear();
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
    var WeekMonth = today.getMonth() + 1;
    var WeekDay = today.getDate();
    var WeekYear = today.getFullYear();
    var WeekDisplayPadded =
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

    browser.storage.local.get(['darkMode'], function(result) {
        if(result.darkMode) {
            body.classList.add('dark-mode');
            darkModeToggle.src = 'icons/light-mode.png';
        }
    });

    darkModeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        browser.storage.local.set({ darkMode: isDarkMode });
        this.src = isDarkMode ? 'icons/light-mode.png' : 'icons/night-mode.png';
    });

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
        
        browser.storage.local.set({
            lastWeekContribution: false,
            yesterdayContribution: false,
            selectedTimeframe: null
        });
    });

    browser.storage.local.get([
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

            browser.storage.local.set({
                startingDate: startDateInput.value,
                endingDate: endDateInput.value,
                lastWeekContribution: items.selectedTimeframe === 'lastWeekContribution',
                yesterdayContribution: items.selectedTimeframe === 'yesterdayContribution',
                selectedTimeframe: items.selectedTimeframe
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
                
                browser.storage.local.set({
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

    browser.storage.local.set({
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