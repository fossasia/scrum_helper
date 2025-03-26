document.addEventListener('DOMContentLoaded', function() {

    // UI Elements
    const elements = {
        projectName: document.getElementById('projectNameInput'),
        githubUsername: document.getElementById('githubUsernameInput'),
        startDate: document.getElementById('startDate'),
        endDate: document.getElementById('endDate'),
        showOpenLabel: document.getElementById('checkbox'),
        userReason: document.getElementById('userReason'),
        fetchButton: document.getElementById('fetchButton'),
        copyButton: document.getElementById('copyButton'),
        toggleContainer: document.getElementById('toggleContainer'),
        toggleDot: document.getElementById('toggleDot'),
        toggleInput: document.getElementById('toggleInput'),
        customSelect: document.getElementById('customSelect'),
        dropdown: document.getElementById('dropdown'),
        selectedText: document.getElementById('selectedText'),
        selectedImage: document.getElementById('selectedImage'),
        options: document.querySelectorAll('.option')
    };

    // State Management
    let state = {
        enabled: true,
        projectName: '',
        githubUsername: '',
        startDate: '',
        endDate: '',
        showOpenLabel: true,
        showClosedLabel: true,
        userReason: 'No Blocker at the moment'
    };

    // Initialize state from storage and ScrumState
    chrome.storage.local.get([
        'scrumHelperEnabled',
        'projectName',
        'githubUsername',
        'startDate',
        'endDate',
        'showOpenLabel',
        'showClosedLabel',
        'userReason',
        'lastWeekContribution'
    ], function(data) {
        // Update ScrumState with stored data
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateState',
                data: {
                    gsoc: data.gsoc ? 1 : 0,
                    projectName: data.projectName || '',
                    githubUsername: data.githubUsername || '',
                    startingDate: data.startDate || '',
                    endingDate: data.endDate || '',
                    showOpenLabel: data.showOpenLabel !== false,
                    showClosedLabel: data.showClosedLabel !== false,
                    userReason: data.userReason || 'No Blocker at the moment',
                    lastWeekContribution: data.lastWeekContribution || false
                }
            });
        });
    });

    // Update UI based on state
    function updateUIFromState(data) {
        if (data.scrumHelperEnabled) {
            elements.toggleInput.checked = true;
            elements.toggleDot.style.transform = 'translateX(16px)';
            elements.toggleContainer.classList.add('bg-green-500');
            elements.toggleContainer.classList.remove('bg-gray-300');
        }

        elements.projectName.value = data.projectName || '';
        elements.githubUsername.value = data.githubUsername || '';
        elements.startDate.value = data.startingDate || '';
        elements.endDate.value = data.endingDate || '';
        elements.showOpenLabel.checked = data.showOpenLabel;
        elements.userReason.value = data.userReason;

        // Update program selection
        const option = document.querySelector(`[data-value="${data.gsoc ? 'gsoc' : 'codeheat'}"]`);
        if (option) {
            const text = option.querySelector('span').textContent;
            const img = option.querySelector('img');
            elements.selectedText.textContent = text;
            if (img) elements.selectedImage.src = img.src;
        }
    }

    // Listen for state changes from scrumHelper
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'stateUpdated') {
            updateUIFromState(request.data);
        }
    });

    // Event Handlers
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

    // Fetch Button Handler
    elements.fetchButton?.addEventListener('click', async function() {
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Fetching...</span>';
        try {
            // Send message to content script instead of background
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateFromPopup',  // Match the action in scrumHelper.js
                    data: {
                        githubUsername: elements.githubUsername.value,
                        projectName: elements.projectName.value,
                        startDate: elements.startDate.value,
                        endDate: elements.endDate.value,
                        showOpenLabel: elements.showOpenLabel.checked,
                        showClosedLabel: elements.showOpenLabel.checked,
                        userReason: elements.userReason.value,
                        gsoc: state.gsoc
                    }
                });
            });
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Save input changes
    const saveInput = (key, value) => {
        state[key] = value;
        chrome.storage.local.set({ [key]: value });
    };

    // Input change handlers
    elements.projectName?.addEventListener('change', (e) => saveInput('projectName', e.target.value));
    elements.githubUsername?.addEventListener('change', (e) => saveInput('githubUsername', e.target.value));
    elements.startDate?.addEventListener('change', (e) => saveInput('startDate', e.target.value));
    elements.endDate?.addEventListener('change', (e) => saveInput('endDate', e.target.value));
    elements.showOpenLabel?.addEventListener('change', (e) => saveInput('showOpenLabel', e.target.checked));
    elements.userReason?.addEventListener('change', (e) => saveInput('userReason', e.target.value));
});