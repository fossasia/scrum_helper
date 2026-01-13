/**
 * Planned Work Integration for Scrum Helper
 * Connects the Issue Selection Modal with the main scrum generation
 */

let issueSelectionModal = null;
let selectedPlannedWork = [];

/**
 * Initialize planned work functionality
 */
function initPlannedWork() {
    console.log('🔧 Starting initPlannedWork...');
    
    try {
        // Create modal instance
        if (typeof window.IssueSelectionModal !== 'undefined') {
            issueSelectionModal = new window.IssueSelectionModal();
            console.log('✅ Issue selection modal created successfully');
        } else {
            console.warn('⚠️  IssueSelectionModal class not found, retrying...');
            setTimeout(initPlannedWork, 1000); // Retry after 1 second
            return;
        }
        
        // Set up button event listener
        const selectButton = document.getElementById('selectPlannedWork');
        if (selectButton) {
            console.log('✅ Found Select Planned Work button, adding click listener');
            
            // Remove any existing listeners
            selectButton.replaceWith(selectButton.cloneNode(true));
            const newButton = document.getElementById('selectPlannedWork');
            
            // Add the click listener
            newButton.addEventListener('click', (e) => {
                console.log('🎯 SELECT PLANNED WORK BUTTON CLICKED!');
                e.preventDefault();
                e.stopPropagation();
                openPlannedWorkModal();
            });
            
            console.log('✅ Click listener added to button');
        } else {
            console.warn('⚠️  selectPlannedWork button not found, retrying...');
            setTimeout(initPlannedWork, 500); // Retry after 500ms
            return;
        }
        
        // Load existing selections on startup
        loadSelectedPlannedWork();
        console.log('✅ Planned work initialization complete');
        
    } catch (error) {
        console.error('❌ Error in initPlannedWork:', error);
        setTimeout(initPlannedWork, 2000); // Retry after error
    }
}

/**
 * Open the planned work selection modal
 */
async function openPlannedWorkModal() {
    console.log('🚀 Opening planned work modal...');
    
    if (!issueSelectionModal) {
        console.error('❌ Issue selection modal not initialized');
        alert('Issue selection modal not available. Please refresh the extension.');
        return;
    }
    
    try {
        // Check if GitHub token is available
        console.log('🔑 Checking for GitHub token...');
        const result = await chrome.storage.sync.get(['githubToken']);
        if (!result.githubToken) {
            console.warn('⚠️  No GitHub token found');
            alert('GitHub token not configured. Please set up your GitHub token in the extension settings first.');
            return;
        }
        
        console.log('✅ GitHub token available, opening modal...');
        await issueSelectionModal.open((selectedItems) => {
            console.log('✅ Selection completed:', selectedItems.length, 'items');
            selectedPlannedWork = selectedItems;
            updateSelectedItemsDisplay();
            saveSelectedPlannedWork();
        });
    } catch (error) {
        console.error('❌ Failed to open planned work modal:', error);
        alert(`Failed to open planned work selection: ${error.message}\n\nPlease check your GitHub token in settings.`);
    }
}

/**
 * Update the display of selected items count
 */
function updateSelectedItemsDisplay() {
    const countElement = document.getElementById('selectedItemsCount');
    if (countElement) {
        const count = selectedPlannedWork.length;
        countElement.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
        
        // Change color based on whether items are selected
        if (count > 0) {
            countElement.className = 'text-xs text-green-600 font-medium self-center';
        } else {
            countElement.className = 'text-xs text-gray-600 self-center';
        }
    }
}

/**
 * Generate HTML for planned work items
 */
function generatePlannedWorkHTML() {
    if (selectedPlannedWork.length === 0) {
        return '<li>No planned work selected. <button onclick="openPlannedWorkModal()" style="color: #007cba; text-decoration: underline; background: none; border: none; cursor: pointer;">Select from GitHub</button></li>';
    }
    
    return selectedPlannedWork.map(item => {
        const emoji = item.type === 'pull_request' ? '🔄' : '📝';
        const notes = item.notes ? ` - ${item.notes}` : '';
        return `<li>${emoji} <a href="${item.url}" target="_blank" style="color: #007cba; text-decoration: none;">#${item.number} ${item.title}</a> (${item.repository.name})${notes}</li>`;
    }).join('');
}

/**
 * Save selected planned work to chrome storage
 */
async function saveSelectedPlannedWork() {
    try {
        await chrome.storage.local.set({ selectedPlannedWork: selectedPlannedWork });
    } catch (error) {
        console.warn('Failed to save selected planned work:', error);
    }
}

/**
 * Load selected planned work from chrome storage
 */
async function loadSelectedPlannedWork() {
    try {
        const result = await chrome.storage.local.get(['selectedPlannedWork']);
        if (result.selectedPlannedWork) {
            selectedPlannedWork = result.selectedPlannedWork;
            updateSelectedItemsDisplay();
        }
    } catch (error) {
        console.warn('Failed to load selected planned work:', error);
    }
}

/**
 * Clear selected planned work
 */
function clearSelectedPlannedWork() {
    selectedPlannedWork = [];
    updateSelectedItemsDisplay();
    saveSelectedPlannedWork();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    console.log('DOM still loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', initPlannedWork);
} else {
    console.log('DOM already loaded, initializing immediately');
    initPlannedWork();
}

// Also try to initialize after a short delay to ensure popup is fully rendered
setTimeout(() => {
    console.log('Attempting delayed initialization...');
    initPlannedWork();
}, 2000);

// Make functions available globally for the scrum generation
window.generatePlannedWorkHTML = generatePlannedWorkHTML;
window.openPlannedWorkModal = openPlannedWorkModal;
window.clearSelectedPlannedWork = clearSelectedPlannedWork;

// Add global test function for debugging
window.testPlannedWorkButton = function() {
    console.log('Testing planned work button click...');
    const button = document.getElementById('selectPlannedWork');
    if (button) {
        console.log('Button found, triggering click...');
        openPlannedWorkModal();
    } else {
        console.log('Button NOT found!');
    }
};