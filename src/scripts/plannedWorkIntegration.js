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
    // Create modal instance
    if (typeof window.IssueSelectionModal !== 'undefined') {
        issueSelectionModal = new window.IssueSelectionModal();
    }
    
    // Set up button event listener
    const selectButton = document.getElementById('selectPlannedWork');
    if (selectButton) {
        selectButton.addEventListener('click', openPlannedWorkModal);
    }
    
    // Load existing selections on startup
    loadSelectedPlannedWork();
}

/**
 * Open the planned work selection modal
 */
async function openPlannedWorkModal() {
    if (!issueSelectionModal) {
        alert('Issue selection modal not available. Please refresh the extension.');
        return;
    }
    
    try {
        await issueSelectionModal.open((selectedItems) => {
            selectedPlannedWork = selectedItems;
            updateSelectedItemsDisplay();
            saveSelectedPlannedWork();
        });
    } catch (error) {
        console.error('Failed to open planned work modal:', error);
        alert('Failed to open planned work selection. Please check your GitHub token in settings.');
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
    document.addEventListener('DOMContentLoaded', initPlannedWork);
} else {
    initPlannedWork();
}

// Make functions available globally for the scrum generation
window.generatePlannedWorkHTML = generatePlannedWorkHTML;
window.openPlannedWorkModal = openPlannedWorkModal;
window.clearSelectedPlannedWork = clearSelectedPlannedWork;