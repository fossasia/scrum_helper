document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateReport');
    const copyBtn = document.getElementById('copyReport');

    generateBtn.addEventListener('click', function() {
        this.innerHTML = '<i class"fa fa-spinner fa-spi"></i> Generating...';
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

        
    })
})

function toggleRadio(radio){
    const startDateInput = document.getElementById('startingDate');
    const endDateInput = document.getElementById('endingDate');


    if(radio.id === 'lastWeekContribution'){
        startDateInput.value = getLastWeek();
        endDateInput.value = getToday();
    } else {
        startDateInput.value = getYesterday();
        endDateInput.value = getToday();
    }
   startDateInput.disabled = endDateInput.disabled = true;
}
document.getElementById('customDateContainer').addEventListener('click', () => {
    document.querySelectorAll('input[name="timeframe"]').forEach(radio => radio.checked = false);
    document.getElementById('startingDate').disabled = false;
    document.getElementById('endingDate').disabled = false;
});
// Not working properly
// document.getElementById('startingDate').addEventListener('focus', () => {
//     document.querySelectorAll('input[name="timeframe"]').forEach(radio => radio.checked = false);
//     document.getElementById('startingDate').disabled = false;
//     document.getElementById('endingDate').disabled = false;
// });
// document.getElementById('endingDate').addEventListener('focus', () => {
//     document.querySelectorAll('input[name="timeframe"]').forEach(radio => radio.checked = false);
//     document.getElementById('startingDate').disabled = false;
//     document.getElementById('endingDate').disabled = false;
// });

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