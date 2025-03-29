document.addEventListener('DOMContentLoaded', function() {

    // UI Elements
    const elements = {
        fetchButton: document.getElementById('fetchButton'),
        copyButton: document.getElementById('copyButton'),
        customSelect: document.getElementById('customSelect'),
        dropdown: document.getElementById('dropdown'),
        selectedText: document.getElementById('selectedText'),
        selectedImage: document.getElementById('selectedImage'),
        options: document.querySelectorAll('.option'),
        toggleContainer: document.getElementById('toggleContainer'),
        toggleDot: document.getElementById('toggleDot'),
        toggleInput: document.getElementById('toggleInput'),
        githubUsername: document.getElementById('githubUsername'),
        projectName: document.getElementById('projectName'),
        startingDate: document.getElementById('startingDate'),
        endingDate: document.getElementById('endingDate'),
        lastWeekContribution: document.getElementById('lastWeekContribution'),
        yesterday: document.getElementById('yesterday'),
        userReason: document.getElementById('userReason'),
        emailClientSelect: document.getElementById('emailClientSelect'),
        scrumReport: document.getElementById('scrumReport'),
        checkboxLabel: document.getElementById('checkboxLabel'),
    };

    // State Management
    let state = {
        enabled: true,
    };

    function updateInputStates(enabled){
        const controlElements = [
            elements.githubUsername,
            elements.projectName,
            elements.startingDate,
            elements.endingDate,
            elements.lastWeekContribution,
            elements.yesterday,
            elements.userReason,
            elements.emailClientSelect,
            elements.scrumReport,
            elements.fetchButton,
            elements.copyButton,
            elements.checkbox,
        ];

        controlElements.forEach(element => {
            if (element) {
                element.disabled = !enabled;
                element.style.opacity = enabled ? '1' : '0.5';
                if (element === elements.checkbox) {
                    element.style.pointerEvents = enabled ? 'auto' : 'none';
                    if (!enabled) {
                        element.checked = false; // Uncheck when disabled
                    }
                }
                if(element.classList.contains('cursor-pointer')) {
                    element.style.cursor = enabled ? 'pointer' : 'not-allowed';
                }
            }
        });

        if(elements.customSelect){
            elements.customSelect.style.pointerEvents = enabled ? 'auto' : 'none';
            elements.customSelect.style.opacity = enabled ? '1' : '0.5';
            elements.customSelect.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }

        if (elements.dropdown) {
            elements.dropdown.classList.add('hidden');
        }

        if(elements.fetchButton){
            elements.fetchButton.disabled = !enabled;
            elements.fetchButton.style.opacity = enabled ? '1' : '0.5';
            elements.fetchButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }

        if(elements.copyButton){
            elements.copyButton.disabled = !enabled;
            elements.copyButton.style.opacity = enabled ? '1' : '0.5';
            elements.copyButton.style.cursor = enabled ? 'pointer' : 'not-allowed';

        }

        if(elements.checkboxLabel){
            elements.checkboxLabel.style.pointerEvents = enabled ? 'auto' : 'none';
            checkboxLabel.style.opacity = enabled ? '1' : '0.5';
            checkboxLabel.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }

        if(!enabled){
            elements.scrumReport.value = 'Extension is disabled. Enable it to generate scrum report.';
        } else {
            elements.scrumReport.value = '';
        }
    }

    // Initialize state from storage and ScrumState
    chrome.storage.local.get(['scrumHelperEnabled'], function(data) {
        const enabled = data.scrumHelperEnabled !== false;
        elements.toggleInput.checked = enabled;
        updateInputStates(enabled);
        if(!enabled){
            elements.toggleContainer.click();
        }
    });

    // Toggle Handler
    elements.toggleContainer?.addEventListener('click', function() {
        const enabled = !elements.toggleInput.checked;
        elements.toggleInput.checked = enabled;
        
        if (enabled) {
            elements.toggleDot.style.transform = 'translateX(16px)';
            elements.toggleContainer.classList.add('bg-green-500');
            elements.toggleContainer.classList.remove('bg-gray-300');
        } else {
            elements.toggleDot.style.transform = 'translateX(0)';
            elements.toggleContainer.classList.remove('bg-green-500');
            elements.toggleContainer.classList.add('bg-gray-300');
        }

        updateInputStates(enabled);

        state.scrumHelperEnabled = enabled;
        chrome.storage.local.set({ scrumHelperEnabled: enabled });
    });

    // Custom Select Handler
    elements.customSelect?.addEventListener('click', () => {
        elements.dropdown.classList.toggle('hidden');
    });

    elements.options?.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.dataset.value;
            const text = option.querySelector('span').textContent;
            const img = option.querySelector('img');
            
            elements.selectedText.textContent = text;
            if (img) {
                elements.selectedImage.src = img.src;
            }
            
            elements.dropdown.classList.add('hidden');
            state.gsoc = value === 'gsoc';
            chrome.storage.local.set({ gsoc: state.gsoc });
        });
    });

// Update the lastWeekContribution event listener
elements.lastWeekContribution?.addEventListener('change', function() {
    if(this.checked) {
        // Uncheck yesterday option
        elements.yesterday.checked = false;
        // Disable and update dates
        elements.startingDate.disabled = true;
        elements.endingDate.disabled = true;
        elements.startingDate.value = getLastWeek();
        elements.endingDate.value = getToday();
    } else {
        // Enable date inputs
        elements.startingDate.disabled = false;
        elements.endingDate.disabled = false;   
    }
    
    chrome.storage.local.set({
        lastWeekContribution: this.checked,
        yesterday: false
    });
});

// Update the yesterday event listener
elements.yesterday?.addEventListener('change', function() {
    if (this.checked) {
        // Uncheck last week option
        elements.lastWeekContribution.checked = false;
        // Disable and update dates
        elements.startingDate.disabled = true;
        elements.endingDate.disabled = true;
        elements.startingDate.value = getYesterday();
        elements.endingDate.value = getToday();
    } else {
        // Enable date inputs
        elements.startingDate.disabled = false;
        elements.endingDate.disabled = false;
    }
    
    chrome.storage.local.set({ 
        lastWeekContribution: false,
        yesterday: this.checked 
    });
});

function getToday() {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${year}-${month}-${day}`;
}

    // // Fetch Button Handler
    // elements.fetchButton?.addEventListener('click', async function() {
    //     this.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Fetching...</span>';
    //     try {
    //         // Send message to content script instead of background
    //         chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //             chrome.tabs.sendMessage(tabs[0].id, {
    //                 action: 'updateFromPopup',  // Match the action in scrumHelper.js
    //                 data: {
    //                     githubUsername: elements.githubUsername.value,
    //                     projectName: elements.projectName.value,
    //                     startDate: elements.startDate.value,
    //                     endDate: elements.endDate.value,
    //                     showOpenLabel: elements.showOpenLabel.checked,
    //                     showClosedLabel: elements.showOpenLabel.checked,
    //                     userReason: elements.userReason.value,
    //                     gsoc: state.gsoc
    //                 }
    //             });
    //         });
    //     } catch (error) {
    //         console.error('Error:', error);
    //     }
    // });

});