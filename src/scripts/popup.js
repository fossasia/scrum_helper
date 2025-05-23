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
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = scrumReport.innerHTML;
        const links = tempDiv.getElementsByTagName('a');
        Array.from(links).forEach(link => {
            const title = link.textContent;
            const url = link.href;
            const markdownLink = `[${title}](${url})`;
            link.outerHTML = markdownLink;
        });
        const stateButtons = tempDiv.getElementsByClassName('State');
        Array.from(stateButtons).forEach(button => {
            button.remove();
        });
        tempDiv.innerHTML = tempDiv.innerHTML.replace(/<br\s*\/?>/gi, '\n');
        const listItems = tempDiv.getElementsByTagName('li');
        Array.from(listItems).forEach(item => {
            item.innerHTML = '\n- '+ item.innerHTML;
        });
        tempDiv.innerHTML = tempDiv.innerHTML.replace(/<\/?ul>/gi, '\n');
        let textContent = tempDiv.textContent;
        textContent = textContent.replace(/\n\s*\n/g, '\n\n');
        textContent = textContent.trim();
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fa fa-check"></i> Copied!';
        this.classList.add('bg-green-600');

        setTimeout(() => {
            this.innerHTML = originalText;
            this.classList.remove('bg-green-600');
        }, 2000);
    });

})

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
            yesterday: false
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
            yesterday: true
        }, () => {
            window.generateScrumReport();
        });
    }
   startDateInput.disabled = endDateInput.disabled = true;
}
document.getElementById('customDateContainer').addEventListener('click', () => {
    document.querySelectorAll('input[name="timeframe"]').forEach(radio => radio.checked = false);
    document.getElementById('startingDate').disabled = false;
    document.getElementById('endingDate').disabled = false;
    chrome.storage.local.set({
        lastWeekContribution: false,
        yesterday: false
    });
});

document.getElementById('startingDate').addEventListener('change', function() {
    chrome.storage.local.set({
        startingDate: this.value,
        lastWeekContribution: false,
        yesterday: false
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
        yesterday: false
    }, () => {
        if (document.getElementById('startingDate').value) {
            window.generateScrumReport();
        }
    });
});

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