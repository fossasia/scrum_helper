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

    const platformSelect = document.getElementById('platformSelect');
    const usernameLabel = document.getElementById('usernameLabel');
    const platformUsername = document.getElementById('platformUsername');

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
        console.log('[DEBUG] updateContentState called with:', enableToggle);
        const elementsToToggle = [
            'startingDate',
            'endingDate',
            'userReason',
            'generateReport',
            'copyReport',
            'refreshCache',
            'showOpenLabel',
            'showCommits',
            'scrumReport',
            'githubUsername',
            'githubToken',
            'projectName',
            'platformUsername',
            'orgInput',
            'cacheInput',
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
        console.log('[DEBUG] Storage items received:', items);
        const enableToggle = items.enableToggle !== false;
        console.log('[DEBUG] enableToggle calculated:', enableToggle);

        // If enableToggle is undefined (first install), set it to true by default
        if (typeof items.enableToggle === 'undefined') {
            console.log('[DEBUG] Setting default enableToggle to true');
            chrome.storage.local.set({ enableToggle: true });
        }

        console.log('[DEBUG] Calling updateContentState with:', enableToggle);
        updateContentState(enableToggle);
        if (!enableToggle) {
            console.log('[DEBUG] Extension disabled, returning early');
            return;
        }

        console.log('[DEBUG] Extension enabled, initializing popup');
        initializePopup();
    })

    chrome.storage.onChanged.addListener((changes, namespace) => {
        console.log('[DEBUG] Storage changed:', changes, namespace);
        if (namespace === 'local' && changes.enableToggle) {
            console.log('[DEBUG] enableToggle changed to:', changes.enableToggle.newValue);
            updateContentState(changes.enableToggle.newValue);
            if (changes.enableToggle.newValue) {
                // re-initialize if enabled
                console.log('[DEBUG] Re-initializing popup due to enable toggle change');
                initializePopup();
            }
        }
    });

    function initializePopup() {
        // Restore all persistent fields immediately on DOMContentLoaded
        const projectNameInput = document.getElementById('projectName');
        const orgInput = document.getElementById('orgInput');
        const userReasonInput = document.getElementById('userReason');
        const showOpenLabelCheckbox = document.getElementById('showOpenLabel');
        const showCommitsCheckbox = document.getElementById('showCommits');
        const githubTokenInput = document.getElementById('githubToken');
        const cacheInput = document.getElementById('cacheInput');
        const enableToggleSwitch = document.getElementById('enable');
        const lastWeekRadio = document.getElementById('lastWeekContribution');
        const yesterdayRadio = document.getElementById('yesterdayContribution');
        const startingDateInput = document.getElementById('startingDate');
        const endingDateInput = document.getElementById('endingDate');
        const platformUsername = document.getElementById('platformUsername');

        chrome.storage.local.get([
            'projectName', 'orgName', 'userReason', 'showOpenLabel', 'showCommits', 'githubToken', 'cacheInput',
            'enableToggle', 'lastWeekContribution', 'yesterdayContribution', 'startingDate', 'endingDate', 'selectedTimeframe', 'platform', 'platformUsername'
        ], function (result) {
            if (result.projectName) projectNameInput.value = result.projectName;
            if (result.orgName) orgInput.value = result.orgName;
            if (result.userReason) userReasonInput.value = result.userReason;
            if (typeof result.showOpenLabel !== 'undefined') showOpenLabelCheckbox.checked = result.showOpenLabel;
            if (typeof result.showCommits !== 'undefined') showCommitsCheckbox.checked = result.showCommits;
            if (result.githubToken) githubTokenInput.value = result.githubToken;
            if (result.cacheInput) cacheInput.value = result.cacheInput;
            if (enableToggleSwitch) {
                if (typeof result.enableToggle !== 'undefined') {
                    enableToggleSwitch.checked = result.enableToggle;
                } else {
                    enableToggleSwitch.checked = true; // Default to enabled
                }
            }
            if (typeof result.lastWeekContribution !== 'undefined') lastWeekRadio.checked = result.lastWeekContribution;
            if (typeof result.yesterdayContribution !== 'undefined') yesterdayRadio.checked = result.yesterdayContribution;
            if (result.startingDate) startingDateInput.value = result.startingDate;
            if (result.endingDate) endingDateInput.value = result.endingDate;
            platformUsername.value = result.platformUsername || '';
        });

        // Button setup
        const generateBtn = document.getElementById('generateReport');
        const copyBtn = document.getElementById('copyReport');

        generateBtn.addEventListener('click', function () {
            chrome.storage.local.set({
                platform: platformSelect.value,
                platformUsername: platformUsername.value
            }, () => {
                let org = orgInput.value.trim().toLowerCase();
                chrome.storage.local.set({ orgName: org }, () => {
                    // Reload platform from storage before generating report
                    chrome.storage.local.get(['platform'], function (res) {
                        platformSelect.value = res.platform || 'github';
                        updatePlatformUI(platformSelect.value);
                        generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
                        generateBtn.disabled = true;
                        window.generateScrumReport && window.generateScrumReport();
                    });
                });
            });
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
            startDateInput.readOnly = false;
            endDateInput.readOnly = false;

            chrome.storage.local.set({
                lastWeekContribution: false,
                yesterdayContribution: false,
                selectedTimeframe: null
            });
        });

        chrome.storage.local.get([
            'selectedTimeframe',
            'lastWeekContribution',
            'yesterdayContribution',
            'startingDate',
            'endingDate',
        ], (items) => {
            console.log('Restoring state:', items);


            if (items.startingDate && items.endingDate && !items.lastWeekContribution && !items.yesterdayContribution) {
                const startDateInput = document.getElementById('startingDate');
                const endDateInput = document.getElementById('endingDate');

                if (startDateInput && endDateInput) {

                    startDateInput.value = items.startingDate;
                    endDateInput.value = items.endingDate;
                    startDateInput.readOnly = false;
                    endDateInput.readOnly = false;
                }
                document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
                    radio.checked = false;
                    radio.dataset.wasChecked = 'false';
                })
                return;
            }

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
                startDateInput.readOnly = endDateInput.readOnly = true;

                chrome.storage.local.set({
                    startingDate: startDateInput.value,
                    endingDate: endDateInput.value,
                    lastWeekContribution: items.selectedTimeframe === 'lastWeekContribution',
                    yesterdayContribution: items.selectedTimeframe === 'yesterdayContribution',
                    selectedTimeframe: items.selectedTimeframe
                });
            }
        });

        // Save all fields to storage on input/change
        projectNameInput.addEventListener('input', function () {
            chrome.storage.local.set({ projectName: projectNameInput.value });
        });
        orgInput.addEventListener('input', function () {
            chrome.storage.local.set({ orgName: orgInput.value.trim().toLowerCase() });
        });
        userReasonInput.addEventListener('input', function () {
            chrome.storage.local.set({ userReason: userReasonInput.value });
        });
        showOpenLabelCheckbox.addEventListener('change', function () {
            chrome.storage.local.set({ showOpenLabel: showOpenLabelCheckbox.checked });
        });
        showCommitsCheckbox.addEventListener('change', function () {
            chrome.storage.local.set({ showCommits: showCommitsCheckbox.checked });
        });
        githubTokenInput.addEventListener('input', function () {
            chrome.storage.local.set({ githubToken: githubTokenInput.value });
        });
        cacheInput.addEventListener('input', function () {
            chrome.storage.local.set({ cacheInput: cacheInput.value });
        });
        if (enableToggleSwitch) {
            console.log('[DEBUG] Setting up enable toggle switch event listener');
            enableToggleSwitch.addEventListener('change', function () {
                console.log('[DEBUG] Enable toggle changed to:', enableToggleSwitch.checked);
                chrome.storage.local.set({ enableToggle: enableToggleSwitch.checked });
            });
        }
        lastWeekRadio.addEventListener('change', function () {
            chrome.storage.local.set({ lastWeekContribution: lastWeekRadio.checked });
        });
        yesterdayRadio.addEventListener('change', function () {
            chrome.storage.local.set({ yesterdayContribution: yesterdayRadio.checked });
        });
        startingDateInput.addEventListener('input', function () {
            chrome.storage.local.set({ startingDate: startingDateInput.value });
        });
        endingDateInput.addEventListener('input', function () {
            chrome.storage.local.set({ endingDate: endingDateInput.value });
        });

        // Save username to storage on input
        platformUsername.addEventListener('input', function () {
            chrome.storage.local.set({ platformUsername: platformUsername.value });
        });

        // Platform change: clear username, update label/placeholder, clear storage
        // This is handled by the new dropdown system, so removing this old listener
        // platformSelect.addEventListener('change', function () {
        //     const platform = platformSelect.value;
        //     chrome.storage.local.set({ platform });
        //     updatePlatformUI(platform);
        //     platformUsername.value = '';
        //     chrome.storage.local.set({ platformUsername: '' });
        // });
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

    // Debug function to test storage
    window.testStorage = function () {
        chrome.storage.local.get(['enableToggle'], function (result) {
            console.log('[TEST] Current enableToggle value:', result.enableToggle);
        });
    };

    // Auto-update orgName in storage on input change
    orgInput.addEventListener('input', function () {
        let org = orgInput.value.trim().toLowerCase();
        // Allow empty org to fetch all GitHub activities
        chrome.storage.local.set({ orgName: org }, function () {
            chrome.storage.local.remove('githubCache'); // Clear cache on org change
        });
    });

    // Add click event for setOrgBtn to set org
    setOrgBtn.addEventListener('click', function () {
        let org = orgInput.value.trim().toLowerCase();
        // Do not default to any org, allow empty string
        // if (!org) {
        //     org = 'fossasia';
        // }
        console.log('[Org Check] Checking organization:', org);
        if (!org) {
            // If org is empty, clear orgName in storage but don't auto-generate report
            chrome.storage.local.set({ orgName: '' }, function () {
                console.log('[Org Check] Organization cleared from storage');
            });
            return;
        }

        setOrgBtn.disabled = true;
        const originalText = setOrgBtn.innerHTML;
        setOrgBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

        fetch(`https://api.github.com/orgs/${org}`)
            .then(res => {
                if (res.status === 404) {
                    setOrgBtn.disabled = false;
                    setOrgBtn.innerHTML = originalText;
                    const oldToast = document.getElementById('invalid-org-toast');
                    if (oldToast) oldToast.parentNode.removeChild(oldToast);
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
                    toastDiv.innerText = 'Organization not found on GitHub.';
                    document.body.appendChild(toastDiv);
                    setTimeout(() => {
                        if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                    }, 3000);
                    return;
                }
                const oldToast = document.getElementById('invalid-org-toast');
                if (oldToast) oldToast.parentNode.removeChild(oldToast);

                chrome.storage.local.set({ orgName: org }, function () {
                    // Always clear the scrum report and show org changed message
                    const scrumReport = document.getElementById('scrumReport');
                    if (scrumReport) {
                        scrumReport.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Organization changed. Click Generate button to fetch the GitHub activities.</p>';
                    }
                    // Clear the githubCache for previous org
                    chrome.storage.local.remove('githubCache');
                    setOrgBtn.disabled = false;
                    setOrgBtn.innerHTML = originalText;
                    // Always show green toast: org is set
                    const toastDiv = document.createElement('div');
                    toastDiv.id = 'invalid-org-toast';
                    toastDiv.className = 'toast';
                    toastDiv.style.background = '#10b981';
                    toastDiv.style.color = '#fff';
                    toastDiv.style.fontWeight = 'bold';
                    toastDiv.style.padding = '12px 24px';
                    toastDiv.style.borderRadius = '8px';
                    toastDiv.style.position = 'fixed';
                    toastDiv.style.top = '24px';
                    toastDiv.style.left = '50%';
                    toastDiv.style.transform = 'translateX(-50%)';
                    toastDiv.style.zIndex = '9999';
                    toastDiv.innerText = 'Organization is set.';
                    document.body.appendChild(toastDiv);
                    setTimeout(() => {
                        if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                    }, 2500);

                });
            })
            .catch((err) => {
                setOrgBtn.disabled = false;
                setOrgBtn.innerHTML = originalText;
                const oldToast = document.getElementById('invalid-org-toast');
                if (oldToast) oldToast.parentNode.removeChild(oldToast);
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
                toastDiv.innerText = 'Error validating organization.';
                document.body.appendChild(toastDiv);
                setTimeout(() => {
                    if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                }, 3000);
            });
    });

    let cacheInput = document.getElementById('cacheInput');
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

    // Restore platform from storage or default to github
    chrome.storage.local.get(['platform'], function (result) {
        const platform = result.platform || 'github';
        platformSelect.value = platform;
        updatePlatformUI(platform);
    });

    // Update UI for platform
    function updatePlatformUI(platform) {
        // Remove the updatePlatformUI function and all calls to it, as well as any code that changes the username label or placeholder based on platform.
    }

    // On platform change
    platformSelect.addEventListener('change', function () {
        const platform = platformSelect.value;
        chrome.storage.local.set({ platform });
        updatePlatformUI(platform);
    });

    // Custom platform dropdown logic
    const customDropdown = document.getElementById('customPlatformDropdown');
    const dropdownBtn = document.getElementById('platformDropdownBtn');
    const dropdownList = document.getElementById('platformDropdownList');
    const dropdownSelected = document.getElementById('platformDropdownSelected');
    const platformSelectHidden = document.getElementById('platformSelect');

    function setPlatformDropdown(value) {
        if (value === 'gitlab') {
            dropdownSelected.innerHTML = '<i class="fa fa-gitlab mr-2"></i> GitLab';
        } else {
            dropdownSelected.innerHTML = '<i class="fa fa-github mr-2"></i> GitHub';
        }
        platformSelectHidden.value = value;
        chrome.storage.local.set({ platform: value });
        updatePlatformUI(value);
        // Don't clear username when restoring platform from storage
        // Only clear when user actually changes platform
    }

    dropdownBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        customDropdown.classList.toggle('open');
        dropdownList.classList.toggle('hidden');
    });

    dropdownList.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', function (e) {
            const newPlatform = this.getAttribute('data-value');
            const currentPlatform = platformSelectHidden.value;

            // Only clear username if platform is actually changing
            if (newPlatform !== currentPlatform) {
                platformUsername.value = '';
                chrome.storage.local.set({ platformUsername: '' });
            }

            setPlatformDropdown(newPlatform);
            customDropdown.classList.remove('open');
            dropdownList.classList.add('hidden');
        });
    });

    document.addEventListener('click', function (e) {
        if (!customDropdown.contains(e.target)) {
            customDropdown.classList.remove('open');
            dropdownList.classList.add('hidden');
        }
    });

    // Keyboard navigation
    platformDropdownBtn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            customDropdown.classList.add('open');
            dropdownList.classList.remove('hidden');
            dropdownList.querySelector('li').focus();
        }
    });
    dropdownList.querySelectorAll('li').forEach((item, idx, arr) => {
        item.setAttribute('tabindex', '0');
        item.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                (arr[idx + 1] || arr[0]).focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                (arr[idx - 1] || arr[arr.length - 1]).focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const newPlatform = this.getAttribute('data-value');
                const currentPlatform = platformSelectHidden.value;

                // Only clear username if platform is actually changing
                if (newPlatform !== currentPlatform) {
                    platformUsername.value = '';
                    chrome.storage.local.set({ platformUsername: '' });
                }

                setPlatformDropdown(newPlatform);
                customDropdown.classList.remove('open');
                dropdownList.classList.add('hidden');
                dropdownBtn.focus();
            }
        });
    });

    // On load, restore platform from storage
    chrome.storage.local.get(['platform'], function (result) {
        const platform = result.platform || 'github';
        // Just update the UI without clearing username when restoring from storage
        if (platform === 'gitlab') {
            dropdownSelected.innerHTML = '<i class="fa fa-gitlab mr-2"></i> GitLab';
        } else {
            dropdownSelected.innerHTML = '<i class="fa fa-github mr-2"></i> GitHub';
        }
        platformSelectHidden.value = platform;
        updatePlatformUI(platform);
    });

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
            startDateInput.readOnly = false;
            endDateInput.readOnly = false;

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
        await forceGithubDataRefresh();

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

    startDateInput.readOnly = endDateInput.readOnly = true;

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

