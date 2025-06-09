function toggleRadio(radio){
    const startDateInput = document.getElementById('startingDate');
    const endDateInput = document.getElementById('endingDate');

    if(radio.id === 'lastWeekContribution'){
        startDateInput.value = getLastWeek();
        endDateInput.value = getToday();
        chrome.storage.local.set({
            startingDate: startDateInput.value,
            endingDate: endDateInput.value,
            lastWeekContribution: true,
            yesterdayContribution: false
        }, () => {
            window.generateScrumReport();
        });
    } else {
        startDateInput.value = getYesterday();
        endDateInput.value = getToday();
        chrome.storage.local.set({
            startingDate: startDateInput.value,
            endingDate: endDateInput.value,
            lastWeekContribution: false,
            yesterdayContribution: true
        }, () => {
            window.generateScrumReport();
        });
    }
   startDateInput.disabled = endDateInput.disabled = true;
}
// Function to activate the date containers after toggling radios of last week and day
document.getElementById('customDateContainer').addEventListener('click', () => {
    document.querySelectorAll('input[name="timeframe"]').forEach(radio => radio.checked = false);
    document.getElementById('startingDate').disabled = false;
    document.getElementById('endingDate').disabled = false;
    chrome.storage.local.set({
        lastWeekContribution: false,
        yesterdayContribution: false
    });
});


// Date change
document.getElementById('startingDate').addEventListener('change', function() {
    chrome.storage.local.set({
        startingDate: this.value,
        lastWeekContribution: false,
        yesterdayContribution: false
    }, () => {
        if (document.getElementById('endingDate').value) {
            window.generateScrumReport();
        }
    });
});

document.getElementById('endingDate').addEventListener('change', function() {
    chrome.storage.local.set({
        endingDate: this.value,
        lastWeekContribution: false,
        yesterdayContribution: false
    }, () => {
        if (document.getElementById('startingDate').value) {
            window.generateScrumReport();
        }
    });
});


// Dark mode
document.addEventListener('DOMContentLoaded', function() {
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
        
        // Save preference
        chrome.storage.local.set({ darkMode: isDarkMode });
        
        // Toggle icon
        this.src = isDarkMode ? 'icons/light-mode.png' : 'icons/night-mode.png';
    });
})
document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateReport');
    const copyBtn = document.getElementById('copyReport');
    
    generateBtn.addEventListener('click', function() {
        this.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
        this.disabled = true;
        
        window.generateScrumReport();
    });
    
    copyBtn.addEventListener('click', function() {
        const scrumReport = document.getElementById('scrumReport');
        
        // Create container for HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scrumReport.innerHTML;
        document.body.appendChild(tempDiv);
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        
        // Select the content
        const range = document.createRange();
        range.selectNode(tempDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        try {
            // Copy HTML content
            const success = document.execCommand('copy');
            if (!success) {
                throw new Error('Copy command failed');
            }
            Materialize.toast('Report copied with formatting!', 3000, 'green');
        } catch (err) {
            console.error('Failed to copy:', err);
            Materialize.toast('Failed to copy report', 3000, 'red');
        } finally {
            // Cleanup
            selection.removeAllRanges();
            document.body.removeChild(tempDiv);
        }
    });
});