/**
 * Issue Selection Modal for Planned Work Selection
 * Part of the planned work selection feature (#161)
 */

class IssueSelectionModal {
    constructor() {
        this.isOpen = false;
        this.selectedItems = new Set();
        this.allItems = [];
        this.filteredItems = [];
        this.notes = new Map(); // Store notes for each item
        this.githubApi = new window.GitHubApiHelper();
        this.onSelectionComplete = null;
        
        this.init();
    }

    /**
     * Initialize the modal
     */
    init() {
        this.createModalHTML();
        this.attachEventListeners();
        this.loadStoredSelections();
    }

    /**
     * Create the modal HTML structure
     */
    createModalHTML() {
        const modalHTML = `
            <div id="issue-selection-modal" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3>Select Planned Work Items</h3>
                        <button class="close-btn" id="close-modal-btn">&times;</button>
                    </div>
                    
                    <div class="modal-content">
                        <!-- Search and Filter Section -->
                        <div class="search-filter-section">
                            <div class="search-container">
                                <input type="text" id="search-input" placeholder="Search issues and PRs..." />
                                <button id="refresh-btn" title="Refresh from GitHub">🔄</button>
                            </div>
                            
                            <div class="filter-container">
                                <select id="repo-filter">
                                    <option value="">All Repositories</option>
                                </select>
                                
                                <select id="type-filter">
                                    <option value="">All Types</option>
                                    <option value="issue">Issues</option>
                                    <option value="pull_request">Pull Requests</option>
                                </select>
                                
                                <select id="label-filter">
                                    <option value="">All Labels</option>
                                </select>
                            </div>
                        </div>

                        <!-- Loading State -->
                        <div id="loading-state" class="loading-state" style="display: none;">
                            <div class="spinner"></div>
                            <p>Loading your issues and pull requests...</p>
                        </div>

                        <!-- Error State -->
                        <div id="error-state" class="error-state" style="display: none;">
                            <p class="error-message"></p>
                            <button id="retry-btn">Retry</button>
                        </div>

                        <!-- Items List -->
                        <div id="items-container" class="items-container">
                            <div class="items-header">
                                <label class="select-all-container">
                                    <input type="checkbox" id="select-all-checkbox">
                                    <span>Select All Visible Items</span>
                                </label>
                                <span class="items-count">0 items</span>
                            </div>
                            
                            <div id="items-list" class="items-list"></div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <div class="selection-summary">
                            <span id="selection-count">0 selected</span>
                        </div>
                        <div class="modal-actions">
                            <button id="clear-selection-btn" class="secondary-btn">Clear Selection</button>
                            <button id="cancel-btn" class="secondary-btn">Cancel</button>
                            <button id="apply-selection-btn" class="primary-btn">Apply Selection</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inject modal into the page
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        this.addModalStyles();
    }

    /**
     * Add CSS styles for the modal
     */
    addModalStyles() {
        const styles = `
            <style id="issue-modal-styles">
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-container {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                }

                .modal-header {
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #333;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                }

                .close-btn:hover {
                    background-color: #f5f5f5;
                }

                .modal-content {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .search-filter-section {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e0e0e0;
                    background-color: #f9f9f9;
                }

                .search-container {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                .search-container input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .search-container button {
                    padding: 8px 12px;
                    background: #007cba;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .filter-container {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .filter-container select {
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 13px;
                    background: white;
                }

                .loading-state, .error-state {
                    padding: 40px 24px;
                    text-align: center;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007cba;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .error-message {
                    color: #d32f2f;
                    margin-bottom: 16px;
                }

                .items-container {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .items-header {
                    padding: 16px 24px 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e0e0e0;
                }

                .select-all-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .items-count {
                    font-size: 13px;
                    color: #666;
                }

                .items-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px 0;
                }

                .item {
                    padding: 12px 24px;
                    border-bottom: 1px solid #f0f0f0;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    transition: background-color 0.2s;
                }

                .item:hover {
                    background-color: #f9f9f9;
                }

                .item.selected {
                    background-color: #e3f2fd;
                    border-left: 3px solid #007cba;
                }

                .item-checkbox {
                    margin-top: 2px;
                }

                .item-content {
                    flex: 1;
                    min-width: 0;
                }

                .item-title {
                    font-weight: 500;
                    color: #333;
                    margin-bottom: 4px;
                    word-break: break-word;
                }

                .item-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 8px;
                }

                .item-badge {
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .badge-issue {
                    background-color: #d73a49;
                    color: white;
                }

                .badge-pr {
                    background-color: #28a745;
                    color: white;
                }

                .badge-repo {
                    background-color: #f1f8ff;
                    color: #0366d6;
                    border: 1px solid #c8e1ff;
                }

                .item-labels {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                    margin-top: 4px;
                }

                .label-badge {
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 10px;
                    background-color: #f1f8ff;
                    color: #0366d6;
                    border: 1px solid #c8e1ff;
                }

                .item-notes {
                    margin-top: 8px;
                }

                .notes-input {
                    width: 100%;
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 13px;
                    resize: vertical;
                    min-height: 60px;
                }

                .modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .selection-summary {
                    font-size: 14px;
                    color: #666;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                }

                .primary-btn, .secondary-btn {
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                    border: 1px solid;
                    transition: background-color 0.2s;
                }

                .primary-btn {
                    background-color: #007cba;
                    color: white;
                    border-color: #007cba;
                }

                .primary-btn:hover {
                    background-color: #005a8b;
                }

                .secondary-btn {
                    background-color: white;
                    color: #333;
                    border-color: #ddd;
                }

                .secondary-btn:hover {
                    background-color: #f5f5f5;
                }

                .primary-btn:disabled {
                    background-color: #ccc;
                    border-color: #ccc;
                    cursor: not-allowed;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Modal controls
        document.getElementById('close-modal-btn').addEventListener('click', () => this.close());
        document.getElementById('cancel-btn').addEventListener('click', () => this.close());
        document.getElementById('apply-selection-btn').addEventListener('click', () => this.applySelection());
        document.getElementById('clear-selection-btn').addEventListener('click', () => this.clearSelection());

        // Search and filters
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('repo-filter').addEventListener('change', (e) => this.handleFilter());
        document.getElementById('type-filter').addEventListener('change', (e) => this.handleFilter());
        document.getElementById('label-filter').addEventListener('change', (e) => this.handleFilter());

        // Refresh button
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
        document.getElementById('retry-btn').addEventListener('click', () => this.refreshData());

        // Select all
        document.getElementById('select-all-checkbox').addEventListener('change', (e) => this.handleSelectAll(e.target.checked));

        // Close on overlay click
        document.getElementById('issue-selection-modal').addEventListener('click', (e) => {
            if (e.target.id === 'issue-selection-modal') {
                this.close();
            }
        });
    }

    /**
     * Open the modal
     */
    async open(onSelectionComplete = null) {
        this.onSelectionComplete = onSelectionComplete;
        this.isOpen = true;
        document.getElementById('issue-selection-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Load data if not already loaded
        if (this.allItems.length === 0) {
            await this.refreshData();
        } else {
            this.renderItems();
        }
    }

    /**
     * Close the modal
     */
    close() {
        this.isOpen = false;
        document.getElementById('issue-selection-modal').style.display = 'none';
        document.body.style.overflow = '';
        this.saveSelections();
    }

    /**
     * Refresh data from GitHub API
     */
    async refreshData() {
        this.showLoading();
        
        try {
            // Get token from storage
const result = await chrome.storage.local.get(['githubToken']);
            if (!result.githubToken) {
                throw new Error('GitHub token not configured. Please set up your GitHub token in the extension settings.');
            }

            this.githubApi.setToken(result.githubToken);
            
            // Fetch recent activity
            this.allItems = await this.githubApi.getRecentActivity();
            
            this.populateFilters();
            this.handleFilter();
            this.hideLoading();
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('loading-state').style.display = 'flex';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('items-container').style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('items-container').style.display = 'flex';
    }

    /**
     * Show error state
     */
    showError(message) {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('items-container').style.display = 'none';
        document.getElementById('error-state').style.display = 'flex';
        document.querySelector('.error-message').textContent = message;
    }

    /**
     * Populate filter dropdowns
     */
    populateFilters() {
        // Repository filter
        const repos = [...new Set(this.allItems.map(item => item.repository.full_name))].sort();
        const repoFilter = document.getElementById('repo-filter');
        repoFilter.innerHTML = '<option value="">All Repositories</option>';
        repos.forEach(repo => {
            repoFilter.innerHTML += `<option value="${repo}">${repo}</option>`;
        });

        // Label filter
        const allLabels = new Set();
        this.allItems.forEach(item => {
            item.labels.forEach(label => allLabels.add(label.name));
        });
        const labelFilter = document.getElementById('label-filter');
        labelFilter.innerHTML = '<option value="">All Labels</option>';
        [...allLabels].sort().forEach(label => {
            labelFilter.innerHTML += `<option value="${label}">${label}</option>`;
        });
    }

    /**
     * Handle search input
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.handleFilter();
    }

    /**
     * Handle filtering
     */
    handleFilter() {
        const repoFilter = document.getElementById('repo-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const labelFilter = document.getElementById('label-filter').value;
        const searchTerm = this.searchTerm || '';

        this.filteredItems = this.allItems.filter(item => {
            // Repository filter
            if (repoFilter && item.repository.full_name !== repoFilter) {
                return false;
            }

            // Type filter
            if (typeFilter && item.type !== typeFilter) {
                return false;
            }

            // Label filter
            if (labelFilter && !item.labels.some(label => label.name === labelFilter)) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const searchableText = `${item.title} ${item.repository.full_name} ${item.labels.map(l => l.name).join(' ')}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            return true;
        });

        this.renderItems();
    }

    /**
     * Render items list
     */
    renderItems() {
        const itemsList = document.getElementById('items-list');
        const itemsCount = document.querySelector('.items-count');
        
        itemsCount.textContent = `${this.filteredItems.length} items`;

        if (this.filteredItems.length === 0) {
            itemsList.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">No items found matching your filters.</div>';
            return;
        }

        itemsList.innerHTML = this.filteredItems.map(item => this.renderItem(item)).join('');

        // Attach item-specific event listeners
        this.attachItemListeners();
        this.updateSelectionCount();
        this.updateSelectAllState();
    }

    /**
     * Render individual item
     */
    renderItem(item) {
        const isSelected = this.selectedItems.has(item.id);
        const notes = this.notes.get(item.id) || '';
        const updatedDate = new Date(item.updated_at).toLocaleDateString();
        
        return `
            <div class="item ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
                <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''}>
                <div class="item-content">
                    <div class="item-title">
                        <a href="${item.url}" target="_blank" style="text-decoration: none; color: inherit;">
                            #${item.number} ${item.title}
                        </a>
                    </div>
                    <div class="item-meta">
                        <span class="item-badge badge-${item.type === 'pull_request' ? 'pr' : 'issue'}">
                            ${item.type === 'pull_request' ? 'PR' : 'Issue'}
                        </span>
                        <span class="item-badge badge-repo">${item.repository.full_name}</span>
                        <span>Updated ${updatedDate}</span>
                        <span>by ${item.author}</span>
                    </div>
                    ${item.labels.length > 0 ? `
                        <div class="item-labels">
                            ${item.labels.map(label => `<span class="label-badge">${label.name}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="item-notes" style="display: ${isSelected ? 'block' : 'none'};">
                        <textarea 
                            class="notes-input" 
                            placeholder="Add notes for this item (optional)..."
                            data-item-id="${item.id}"
                        >${notes}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach item-specific event listeners
     */
    attachItemListeners() {
        // Checkbox change handlers
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = parseInt(e.target.closest('.item').dataset.itemId);
                this.toggleItem(itemId, e.target.checked);
            });
        });

        // Notes input handlers
        document.querySelectorAll('.notes-input').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const itemId = parseInt(e.target.dataset.itemId);
                this.notes.set(itemId, e.target.value);
            });
        });
    }

    /**
     * Toggle item selection
     */
    toggleItem(itemId, selected) {
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        const notesElement = itemElement.querySelector('.item-notes');

        if (selected) {
            this.selectedItems.add(itemId);
            itemElement.classList.add('selected');
            notesElement.style.display = 'block';
        } else {
            this.selectedItems.delete(itemId);
            itemElement.classList.remove('selected');
            notesElement.style.display = 'none';
        }

        this.updateSelectionCount();
        this.updateSelectAllState();
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(selectAll) {
        this.filteredItems.forEach(item => {
            const checkbox = document.querySelector(`[data-item-id="${item.id}"] .item-checkbox`);
            if (checkbox && checkbox.checked !== selectAll) {
                checkbox.checked = selectAll;
                this.toggleItem(item.id, selectAll);
            }
        });
    }

    /**
     * Update select all checkbox state
     */
    updateSelectAllState() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        const visibleItems = this.filteredItems;
        const selectedVisible = visibleItems.filter(item => this.selectedItems.has(item.id));

        if (selectedVisible.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (selectedVisible.length === visibleItems.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        }
    }

    /**
     * Update selection count display
     */
    updateSelectionCount() {
        const count = this.selectedItems.size;
        document.getElementById('selection-count').textContent = `${count} selected`;
        document.getElementById('apply-selection-btn').disabled = count === 0;
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedItems.clear();
        this.notes.clear();
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.querySelectorAll('.item').forEach(item => {
            item.classList.remove('selected');
            const notesElement = item.querySelector('.item-notes');
            if (notesElement) {
                notesElement.style.display = 'none';
            }
        });
        this.updateSelectionCount();
        this.updateSelectAllState();
    }

    /**
     * Apply selection and close modal
     */
    applySelection() {
        const selectedData = this.getSelectedItemsWithNotes();
        
        if (this.onSelectionComplete) {
            this.onSelectionComplete(selectedData);
        }
        
        this.close();
    }

    /**
     * Get selected items with their notes
     */
    getSelectedItemsWithNotes() {
        return this.allItems
            .filter(item => this.selectedItems.has(item.id))
            .map(item => ({
                ...item,
                notes: this.notes.get(item.id) || ''
            }));
    }

    /**
     * Load stored selections from chrome storage
     */
    async loadStoredSelections() {
        try {
            const result = await chrome.storage.local.get(['selectedPlannedWork', 'plannedWorkNotes']);
            if (result.selectedPlannedWork) {
                this.selectedItems = new Set(result.selectedPlannedWork);
            }
            if (result.plannedWorkNotes) {
                this.notes = new Map(result.plannedWorkNotes);
            }
        } catch (error) {
            console.warn('Failed to load stored selections:', error);
        }
    }

    /**
     * Save selections to chrome storage
     */
    async saveSelections() {
        try {
            await chrome.storage.local.set({
                selectedPlannedWork: Array.from(this.selectedItems),
                plannedWorkNotes: Array.from(this.notes.entries())
            });
        } catch (error) {
            console.warn('Failed to save selections:', error);
        }
    }
}

// Make IssueSelectionModal available globally
window.IssueSelectionModal = IssueSelectionModal;