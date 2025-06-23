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

document.addEventListener('DOMContentLoaded', function () {
    // Dark mode setup
    const darkModeToggle = document.querySelector('img[alt="Night Mode"]');
    const settingsIcon = document.getElementById('settingsIcon');
    const body = document.body;
    const homeButton = document.getElementById('homeButton');
    const scrumHelperHeading = document.getElementById('scrumHelperHeading');
    const settingsToggle = document.getElementById('settingsToggle');
    const reportSection = document.getElementById('reportSection');
    const settingsSection = document.getElementById('settingsSection');

    let isSettingsVisible = false;
    const githubTokenInput = document.getElementById('githubToken');
    const toggleTokenBtn = document.getElementById('toggleTokenVisibility');
    const tokenEyeIcon = document.getElementById('tokenEyeIcon');
    let tokenVisible = false;

    const orgInput = document.getElementById('orgInput');
    const setOrgBtn = document.getElementById('setOrgBtn');

    chrome.storage.local.get(['darkMode'], function (result) {
        if (result.darkMode) {
            body.classList.add('dark-mode');
            darkModeToggle.src = 'icons/light-mode.png';
            if (settingsIcon) {
                settingsIcon.src = 'icons/settings-night.png'; // Changed from settings-night.png
            }
        }
    });

    toggleTokenBtn.addEventListener('click', function () {
        tokenVisible = !tokenVisible;
        githubTokenInput.type = tokenVisible ? 'text' : 'password';

        tokenEyeIcon.classList.add('eye-animating');
        setTimeout(() => tokenEyeIcon.classList.remove('eye-animating'), 400);
        tokenEyeIcon.className = tokenVisible ? 'fa fa-eye-slash text-gray-600' : 'fa fa-eye text-gray-600';

        githubTokenInput.classList.add('token-animating');
        setTimeout(() => githubTokenInput.classList.remove('token-animating'), 300);
    });

    darkModeToggle.addEventListener('click', function () {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        chrome.storage.local.set({ darkMode: isDarkMode });
        this.src = isDarkMode ? 'icons/light-mode.png' : 'icons/night-mode.png';
        const settingsIcon = document.getElementById('settingsIcon');
        if (settingsIcon) {
            settingsIcon.src = isDarkMode ? 'icons/settings-night.png' : 'icons/settings-light.png';
        }
        renderTokenPreview();
    });

    function renderTokenPreview() {
        tokenPreview.innerHTML = '';
        const value = githubTokenInput.value;
        const isDark = document.body.classList.contains('dark-mode');
        for (let i = 0; i < value.length; i++) {
            const charBox = document.createElement('span');
            charBox.className = 'token-preview-char' + (isDark ? ' dark-mode' : '');
            if (tokenVisible) {
                charBox.textContent = value[i];
            } else {
                const dot = document.createElement('span');
                dot.className = 'token-preview-dot' + (isDark ? ' dark-mode' : '');
                charBox.appendChild(dot);
            }
            tokenPreview.appendChild(charBox);
            setTimeout(() => charBox.classList.add('flip'), 10 + i * 30);
        }
    }

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
            'githubToken',
            'projectName',
            'settingsToggle',
        ];

        const radios = document.querySelectorAll('input[name="timeframe"]');
        const customDateContainer = document.getElementById('customDateContainer');

        elementsToToggle.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !enableToggle;
                if (!enableToggle) {
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
            if (label) {
                if (!enableToggle) {
                    label.style.opacity = '0.5';
                    label.style.pointerEvents = 'none';
                } else {
                    label.style.opacity = '1';
                    label.style.pointerEvents = 'auto';
                }
            }
        });


        if (customDateContainer) {
            if (!enableToggle) {
                customDateContainer.style.opacity = '0.5';
                customDateContainer.style.pointerEvents = 'none';
            } else {
                customDateContainer.style.opacity = '1';
                customDateContainer.style.pointerEvents = 'auto';
            }
        }

        const scrumReport = document.getElementById('scrumReport');
        if (scrumReport) {
            scrumReport.contentEditable = enableToggle;
            if (!enableToggle) {
                scrumReport.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Extension is disabled. Enable it from the options to generate scrum reports.</p>';
            } else {
                const disabledMessage = '<p style="text-align: center; color: #999; padding: 20px;">Extension is disabled. Enable it from the options to generate scrum reports.</p>';
                if (scrumReport.innerHTML === disabledMessage) {
                    scrumReport.innerHTML = '';
                }
            }
        }
    }

    chrome.storage.local.get(['enableToggle'], (items) => {
        const enableToggle = items.enableToggle !== false;
        updateContentState(enableToggle);
        if (!enableToggle) {
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

        generateBtn.addEventListener('click', function () {
            this.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
            this.disabled = true;
            window.generateScrumReport();
        });

        copyBtn.addEventListener('click', function () {
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

    function showReportView() {
        isSettingsVisible = false;
        reportSection.classList.remove('hidden');
        settingsSection.classList.add('hidden');
        settingsToggle.classList.remove('active');
        console.log('Switched to report view');
    }

    function showSettingsView() {
        isSettingsVisible = true;
        reportSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
        settingsToggle.classList.add('active');
        console.log('Switched to settings view');
    }

    if (settingsToggle) {
        settingsToggle.addEventListener('click', function () {
            if (isSettingsVisible) {
                showReportView();
            } else {
                showSettingsView();
            }
        });
    }

    if (homeButton) {
        homeButton.addEventListener('click', showReportView);
    }
    if (scrumHelperHeading) {
        scrumHelperHeading.addEventListener('click', showReportView);
    }

    showReportView();

    // Load org from storage or default
    chrome.storage.local.get(['orgName'], function (result) {
        orgInput.value = result.orgName || '';
    });

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    let lastInvalidOrg = '';
    // Validate and set org as user types
    const handleOrgInput = debounce(function () {
        let org = orgInput.value.trim().toLowerCase();
        if (!org) {
            org = 'fossasia';
        }
        console.log('[Org Check] Checking organization:', org);
        fetch(`https://api.github.com/orgs/${org}`)
            .then(res => {
                console.log('[Org Check] Response status for', org, ':', res.status);
                if (res.status === 404) {
                    console.log('[Org Check] Organisation not found on GitHub:', org);
                    // Remove any existing toast with the same id
                    const oldToast = document.getElementById('invalid-org-toast');
                    if (oldToast) oldToast.parentNode.removeChild(oldToast);
                    // Create a new toast div
                    const toastDiv = document.createElement('div');
                    toastDiv.id = 'invalid-org-toast';
                    toastDiv.className = 'toast';
                    toastDiv.style.background = '#dc2626';
                    toastDiv.style.color = '#fff';
                    toastDiv.style.fontWeight = 'bold';
                    toastDiv.style.padding = '12px 24px';
                    toastDiv.style.borderRadius = '8px';
                    toastDiv.style.position = 'fixed';
                    toastDiv.style.top = '24px';
                    toastDiv.style.left = '50%';
                    toastDiv.style.transform = 'translateX(-50%)';
                    toastDiv.style.zIndex = '9999';
                    toastDiv.innerText = 'Organisation not found on GitHub.';
                    document.body.appendChild(toastDiv);
                    setTimeout(() => {
                        if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                    }, 3000);
                    // Do NOT update storage or fetch data for invalid org
                    return;
                }
                // Remove any existing toast with the same id (for valid orgs)
                const oldToast = document.getElementById('invalid-org-toast');
                if (oldToast) oldToast.parentNode.removeChild(oldToast);
                console.log('[Org Check] Organisation exists on GitHub:', org);
                // Valid org: update storage and fetch data
                chrome.storage.local.set({ orgName: org }, function () {
                    if (window.generateScrumReport) window.generateScrumReport();
                });
            })
            .catch((err) => {
                console.log('[Org Check] Error validating organisation:', org, err);
                // Remove any existing toast with the same id
                const oldToast = document.getElementById('invalid-org-toast');
                if (oldToast) oldToast.parentNode.removeChild(oldToast);
                // Create a new toast div
                const toastDiv = document.createElement('div');
                toastDiv.id = 'invalid-org-toast';
                toastDiv.className = 'toast';
                toastDiv.style.background = '#dc2626';
                toastDiv.style.color = '#fff';
                toastDiv.style.fontWeight = 'bold';
                toastDiv.style.padding = '12px 24px';
                toastDiv.style.borderRadius = '8px';
                toastDiv.style.position = 'fixed';
                toastDiv.style.top = '24px';
                toastDiv.style.left = '50%';
                toastDiv.style.transform = 'translateX(-50%)';
                toastDiv.style.zIndex = '9999';
                toastDiv.innerText = 'Error validating organisation.';
                document.body.appendChild(toastDiv);
                setTimeout(() => {
                    if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                }, 3000);
                // Do NOT update storage or fetch data for invalid org
            });
    }, 600);

    orgInput.addEventListener('input', handleOrgInput);

});

// Tooltip bubble 
document.querySelectorAll('.tooltip-container').forEach(container => {
    const bubble = container.querySelector('.tooltip-bubble');
    if (!bubble) return;

    function positionTooltip() {
        const icon = container.querySelector('.question-icon') || container;
        const rect = icon.getBoundingClientRect();
        const bubbleRect = bubble.getBoundingClientRect();
        const padding = 8;

        let top = rect.top + window.scrollY;
        let left = rect.right + padding + window.scrollX;

        if (left + bubbleRect.width > window.innerWidth - 10) {
            left = rect.left - bubbleRect.width - padding + window.scrollX;
        }
        if (left < 8) left = 8;
        if (top + bubbleRect.height > window.innerHeight - 10) {
            top = rect.top - bubbleRect.height - padding + window.scrollY;
        }
        if (top < 8) top = 8;

        bubble.style.left = left + 'px';
        bubble.style.top = top + 'px';
    }

    container.addEventListener('mouseenter', positionTooltip);
    container.addEventListener('focusin', positionTooltip);
    container.addEventListener('mousemove', positionTooltip);
    container.addEventListener('mouseleave', () => {
        bubble.style.left = '';
        bubble.style.top = '';
    });
    container.addEventListener('focusout', () => {
        bubble.style.left = '';
        bubble.style.top = '';
    });
});

// Radio button click handlers with toggle functionality
document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
    radio.addEventListener('click', function () {
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

// refresh cache button
document.getElementById('refreshCache').addEventListener('click', async function () {
    const button = this;
    const originalText = button.innerHTML;

    button.classList.add('loading');
    button.innerHTML = '<i class="fa fa-refresh fa-spin"></i><span>Refreshing...</span>';
    button.disabled = true;

    try {
        // Clear local cache
        await new Promise(resolve => {
            chrome.storage.local.remove('githubCache', resolve);
        });

        // Clear the scrum report
        const scrumReport = document.getElementById('scrumReport');
        if (scrumReport) {
            scrumReport.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Cache cleared successfully. Click "Generate Report" to fetch fresh data.</p>';
        }

        button.innerHTML = '<i class="fa fa-check"></i><span>Cache Cleared!</span>';
        button.classList.remove('loading');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Cache clear failed:', error);
        button.innerHTML = '<i class="fa fa-exclamation-triangle"></i><span>Failed to clear cache</span>';
        button.classList.remove('loading');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
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
    });
}

const cacheInput = document.getElementById('cacheInput');
if (cacheInput) {
    chrome.storage.local.get(['cacheInput'], function (result) {
        if (result.cacheInput) {
            cacheInput.value = result.cacheInput;
        } else {
            cacheInput.value = 10;
        }
    });

    cacheInput.addEventListener('blur', function () {
        let ttlValue = parseInt(this.value);
        if (isNaN(ttlValue) || ttlValue <= 0 || this.value.trim() === '') {
            ttlValue = 10;
            this.value = ttlValue;
            this.style.borderColor = '#ef4444';
        } else if (ttlValue > 1440) {
            ttlValue = 1440;
            this.value = ttlValue;
            this.style.borderColor = '#f59e0b';
        } else {
            this.style.borderColor = '#10b981';
        }

        chrome.storage.local.set({ cacheInput: ttlValue }, function () {
            console.log('Cache TTL saved:', ttlValue, 'minutes');
        });
    });

}
