function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    }
}
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

function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const message = browserAPI.i18n.getMessage(key);
        if (message) {
            // Use innerHTML to support simple formatting like <b> in tooltips
            if (el.classList.contains('tooltip-bubble') || el.classList.contains('cache-info')) {
                el.innerHTML = message;
            } else {
                el.textContent = message;
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const message = browserAPI.i18n.getMessage(key);
        if (message) {
            el.placeholder = message;
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const message = browserAPI.i18n.getMessage(key);
        if (message) {
            el.title = message;
        }
    });
}


document.addEventListener('DOMContentLoaded', function () {
    // Apply translations as soon as the DOM is ready
    applyI18n();

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

    function checkTokenForFilter() {
        const useRepoFilter = document.getElementById('useRepoFilter');
        const githubTokenInput = document.getElementById('githubToken');
        const tokenWarning = document.getElementById('tokenWarningForFilter');
        const repoFilterContainer = document.getElementById('repoFilterContainer');


        if (!useRepoFilter || !githubTokenInput || !tokenWarning || !repoFilterContainer) {

            return;
        }
        const isFilterEnabled = useRepoFilter.checked;
        const hasToken = githubTokenInput.value.trim() != '';

        if (isFilterEnabled && !hasToken) {
            useRepoFilter.checked = false;
            repoFilterContainer.classList.add('hidden');
            if (typeof hideDropdown === 'function') {
                hideDropdown();
            }
            browserAPI.storage.local.set({ useRepoFilter: false });
        }
        tokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
        setTimeout(() => {
            tokenWarning.classList.add('hidden');
        }, 4000)

    }



    browserAPI.storage.local.get(['darkMode'], function (result) {
        if (result.darkMode) {
            body.classList.add('dark-mode');
            darkModeToggle.src = 'icons/light-mode.png';
            if (settingsIcon) {
                settingsIcon.src = 'icons/settings-night.png';
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

    githubTokenInput.addEventListener('input', checkTokenForFilter);

    darkModeToggle.addEventListener('click', function () {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        browserAPI.storage.local.set({ darkMode: isDarkMode });
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
                scrumReport.innerHTML = `<p style="text-align: center; color: #999; padding: 20px;">${browserAPI.i18n.getMessage('extensionDisabledMessage')}</p>`;
            } else {
                const disabledMessage = `<p style="text-align: center; color: #999; padding: 20px;">${browserAPI.i18n.getMessage('extensionDisabledMessage')}</p>`;
                if (scrumReport.innerHTML === disabledMessage) {
                    scrumReport.innerHTML = '';
                }
            }
        }
    }

    browserAPI.storage.local.get(['enableToggle'], (items) => {
        console.log('[DEBUG] Storage items received:', items);
        const enableToggle = items.enableToggle !== false;
        console.log('[DEBUG] enableToggle calculated:', enableToggle);

        // If enableToggle is undefined (first install), set it to true by default
        if (typeof items.enableToggle === 'undefined') {
            console.log('[DEBUG] Setting default enableToggle to true');
            browserAPI.storage.local.set({ enableToggle: true });
        }

        console.log('[DEBUG] Calling updateContentState with:', enableToggle);
        updateContentState(enableToggle);
        if (!enableToggle) {
            console.log('[DEBUG] Extension disabled, returning early');
            return;
        }

        console.log('[DEBUG] Extension enabled, initializing popup');
        initializePopup();
        checkTokenForFilter();
    })

    browserAPI.storage.onChanged.addListener((changes, namespace) => {
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
        if (changes.startingDate || changes.endingDate) {
            console.log('[POPUP-DEBUG] Date changed in storage, triggering repo fetch.', {
                startingDate: changes.startingDate?.newValue,
                endingDate: changes.endingDate?.newValue
            });
            if (window.triggerRepoFetchIfEnabled) {
                window.triggerRepoFetchIfEnabled();
            }
        }
    });

    function initializePopup() {
        // Migration: Handle existing users with old platformUsername storage
        browserAPI.storage.local.get(['platform', 'platformUsername'], function (result) {
            if (result.platformUsername && result.platform) {
                // Migrate old platformUsername to platform-specific storage
                const platformUsernameKey = `${result.platform}Username`;
                browserAPI.storage.local.set({ [platformUsernameKey]: result.platformUsername });
                // Remove the old key
                browserAPI.storage.local.remove(['platformUsername']);
                console.log(`[MIGRATION] Migrated platformUsername to ${platformUsernameKey}`);
            }
        });

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

        browserAPI.storage.local.get([
            'projectName', 'orgName', 'userReason', 'showOpenLabel', 'showCommits', 'githubToken', 'cacheInput',
            'enableToggle', 'lastWeekContribution', 'yesterdayContribution', 'startingDate', 'endingDate', 'selectedTimeframe', 'platform', 'githubUsername', 'gitlabUsername'
        ], function (result) {
            if (result.projectName) projectNameInput.value = result.projectName;
            if (result.orgName) orgInput.value = result.orgName;
            if (result.userReason) userReasonInput.value = result.userReason;
            if (typeof result.showOpenLabel !== 'undefined') {
                showOpenLabelCheckbox.checked = result.showOpenLabel;
            } else {
                showOpenLabelCheckbox.checked = true; // Default to true for new users
            }
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

            // Load platform-specific username
            const platform = result.platform || 'github';
            const platformUsernameKey = `${platform}Username`;
            platformUsername.value = result[platformUsernameKey] || '';
        });

        // Button setup
        const generateBtn = document.getElementById('generateReport');
        const copyBtn = document.getElementById('copyReport');

        generateBtn.addEventListener('click', function () {

            browserAPI.storage.local.get(['platform'], function (result) {
                const platform = result.platform || 'github';
                const platformUsernameKey = `${platform}Username`;

                browserAPI.storage.local.set({
                    platform: platformSelect.value,
                    [platformUsernameKey]: platformUsername.value
                }, () => {
                    let org = orgInput.value.trim().toLowerCase();
                    browserAPI.storage.local.set({ orgName: org }, () => {
                        // Reload platform from storage before generating report
                        browserAPI.storage.local.get(['platform'], function (res) {
                            platformSelect.value = res.platform || 'github';
                            updatePlatformUI(platformSelect.value);
                            generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
                            generateBtn.disabled = true;
                            window.generateScrumReport && window.generateScrumReport();
                        });
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
                this.innerHTML = `<i class="fa fa-check"></i> ${browserAPI.i18n.getMessage('copiedButton')}`;
                setTimeout(() => {
                    this.innerHTML = `<i class="fa fa-copy"></i> ${browserAPI.i18n.getMessage('copyReportButton')}`;
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

            browserAPI.storage.local.set({
                lastWeekContribution: false,
                yesterdayContribution: false,
                selectedTimeframe: null
            });
        });

        browserAPI.storage.local.get([
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

                browserAPI.storage.local.set({
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
            browserAPI.storage.local.set({ projectName: projectNameInput.value });
        });
        orgInput.addEventListener('input', function () {
            browserAPI.storage.local.set({ orgName: orgInput.value.trim().toLowerCase() });
        });
        userReasonInput.addEventListener('input', function () {
            browserAPI.storage.local.set({ userReason: userReasonInput.value });
        });
        showOpenLabelCheckbox.addEventListener('change', function () {
            browserAPI.storage.local.set({ showOpenLabel: showOpenLabelCheckbox.checked });
        });
        showCommitsCheckbox.addEventListener('change', function () {
            browserAPI.storage.local.set({ showCommits: showCommitsCheckbox.checked });
        });
        githubTokenInput.addEventListener('input', function () {
            browserAPI.storage.local.set({ githubToken: githubTokenInput.value });
        });
        cacheInput.addEventListener('input', function () {
            browserAPI.storage.local.set({ cacheInput: cacheInput.value });
        });
        if (enableToggleSwitch) {
            console.log('[DEBUG] Setting up enable toggle switch event listener');
            enableToggleSwitch.addEventListener('change', function () {
                console.log('[DEBUG] Enable toggle changed to:', enableToggleSwitch.checked);
                browserAPI.storage.local.set({ enableToggle: enableToggleSwitch.checked });
            });
        }
        lastWeekRadio.addEventListener('change', function () {
            browserAPI.storage.local.set({ lastWeekContribution: lastWeekRadio.checked });
        });
        yesterdayRadio.addEventListener('change', function () {
            browserAPI.storage.local.set({ yesterdayContribution: yesterdayRadio.checked });
        });
        startingDateInput.addEventListener('input', function () {
            browserAPI.storage.local.set({ startingDate: startingDateInput.value });
        });
        endingDateInput.addEventListener('input', function () {
            browserAPI.storage.local.set({ endingDate: endingDateInput.value });
        });

        // Save username to storage on input
        platformUsername.addEventListener('input', function () {
            browserAPI.storage.local.get(['platform'], function (result) {
                const platform = result.platform || 'github';
                const platformUsernameKey = `${platform}Username`;
                browserAPI.storage.local.set({ [platformUsernameKey]: platformUsername.value });
            });
        });


    }

    function showReportView() {
        isSettingsVisible = false;
        reportSection.classList.remove('hidden');
        settingsSection.classList.add('hidden');
        settingsToggle.classList.remove('active');

    }

    function showSettingsView() {
        isSettingsVisible = true;
        reportSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
        settingsToggle.classList.add('active');

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

    browserAPI.storage.local.get(['orgName'], function (result) {
        orgInput.value = result.orgName || '';
    });


    // Debug function to test storage
    window.testStorage = function () {
        browserAPI.storage.local.get(['enableToggle'], function (result) {
            console.log('[TEST] Current enableToggle value:', result.enableToggle);
        });
    };



    //report filter
    const repoSearch = document.getElementById('repoSearch');
    const repoDropdown = document.getElementById('repoDropdown');
    const selectedReposDiv = document.getElementById('selectedRepos');
    const repoTags = document.getElementById('repoTags');
    const repoPlaceholder = document.getElementById('repoPlaceholder');
    const repoCount = document.getElementById('repoCount');
    const repoStatus = document.getElementById('repoStatus');
    const useRepoFilter = document.getElementById('useRepoFilter');
    const repoFilterContainer = document.getElementById('repoFilterContainer');

    if (repoSearch && useRepoFilter && repoFilterContainer) {
        repoSearch.addEventListener('click', function () {
            if (!useRepoFilter.checked) {
                useRepoFilter.checked = true;
                repoFilterContainer.classList.remove('hidden');
                browserAPI.storage.local.set({ useRepoFilter: true });
            }
        })
    }

    if (!repoSearch || !useRepoFilter) {
        console.log('Repository, filter elements not found in DOM');
    }
    else {
        let availableRepos = [];
        let selectedRepos = [];
        let highlightedIndex = -1;

        async function triggerRepoFetchIfEnabled() {
            // --- PLATFORM CHECK: Only run for GitHub ---
            let platform = 'github';
            try {
                const items = await new Promise(resolve => {
                    browserAPI.storage.local.get(['platform'], resolve);
                });
                platform = items.platform || 'github';
            } catch (e) { }
            if (platform !== 'github') {
                // Do not run repo fetch for non-GitHub platforms
                if (repoStatus) repoStatus.textContent = 'Repository filtering is only available for GitHub.';
                return;
            }
            if (!useRepoFilter.checked) {
                return;
            }

            if (repoStatus) {
                repoStatus.textContent = browserAPI.i18n.getMessage('repoRefetching');
            }

            try {
                const cacheData = await new Promise(resolve => {
                    browserAPI.storage.local.get(['repoCache'], resolve);
                });
                const items = await new Promise(resolve => {
                    browserAPI.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
                });

                const platform = items.platform || 'github';
                const platformUsernameKey = `${platform}Username`;
                const username = items[platformUsernameKey];

                if (!username) {
                    if (repoStatus) {

                        repoStatus.textContent = 'Username required';

                    }
                    return;
                }

                if (window.fetchUserRepositories) {
                    const repos = await window.fetchUserRepositories(
                        username,
                        items.githubToken,
                        items.orgName || ''
                    );

                    availableRepos = repos;

                    if (repoStatus) {
                        repoStatus.textContent = browserAPI.i18n.getMessage('repoLoaded', [repos.length]);
                    }

                    const repoCacheKey = `repos-${username}-${items.orgName || ''}`;
                    browserAPI.storage.local.set({
                        repoCache: {
                            data: repos,
                            cacheKey: repoCacheKey,
                            timestamp: Date.now()
                        }
                    });

                    if (document.activeElement === repoSearch) {
                        filterAndDisplayRepos(repoSearch.value.toLowerCase());
                    } else if (repoSearch.value) {
                        filterAndDisplayRepos(repoSearch.value.toLowerCase());
                    } else {
                        filterAndDisplayRepos('');
                    }
                }
            } catch (err) {

                if (repoStatus) {
                    repoStatus.textContent = `${browserAPI.i18n.getMessage('errorLabel')}: ${err.message || browserAPI.i18n.getMessage('repoRefetchFailed')}`;
                }
            }
        }

        window.triggerRepoFetchIfEnabled = triggerRepoFetchIfEnabled;

        browserAPI.storage.local.get(['selectedRepos', 'useRepoFilter'], (items) => {
            if (items.selectedRepos) {
                selectedRepos = items.selectedRepos;
                updateRepoDisplay();
            }
            if (items.useRepoFilter) {
                useRepoFilter.checked = items.useRepoFilter;
                repoFilterContainer.classList.toggle('hidden', !items.useRepoFilter);
            }
        });

        useRepoFilter.addEventListener('change', debounce(async () => {
            // --- PLATFORM CHECK: Only run for GitHub ---
            let platform = 'github';
            try {
                const items = await new Promise(resolve => {
                    browserAPI.storage.local.get(['platform'], resolve);
                });
                platform = items.platform || 'github';
            } catch (e) { }
            if (platform !== 'github') {
                repoFilterContainer.classList.add('hidden');
                useRepoFilter.checked = false;
                if (repoStatus) repoStatus.textContent = 'Repository filtering is only available for GitHub.';
                return;
            }
            const enabled = useRepoFilter.checked;
            const hasToken = githubTokenInput.value.trim() !== '';
            repoFilterContainer.classList.toggle('hidden', !enabled);

            if (enabled && !hasToken) {
                useRepoFilter.checked = false;
                repoFilterContainer.classList.add('hidden'); // Explicitly hide the container
                hideDropdown();
                const tokenWarning = document.getElementById('tokenWarningForFilter');
                if (tokenWarning) {
                    tokenWarning.classList.remove('hidden');
                    tokenWarning.classList.add('shake-animation');
                    setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
                    setTimeout(() => {
                        tokenWarning.classList.add('hidden');
                    }, 3000);
                }
                return;
            }
            repoFilterContainer.classList.toggle('hidden', !enabled);

            browserAPI.storage.local.set({
                useRepoFilter: enabled,
                githubCache: null, //forces refresh
            });
            checkTokenForFilter();
            if (enabled) {
                repoStatus.textContent = 'Loading repos automatically..';

                try {
                    const cacheData = await new Promise(resolve => {
                        browserAPI.storage.local.get(['repoCache'], resolve);
                    });
                    const items = await new Promise(resolve => {

                        browserAPI.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve);
                    });

                    const platform = items.platform || 'github';
                    const platformUsernameKey = `${platform}Username`;
                    const username = items[platformUsernameKey];

                    if (!username) {

                        repoStatus.textContent = 'Github Username required';

                        return;
                    }

                    const repoCacheKey = `repos-${username}-${items.orgName || ''}`;

                    const now = Date.now();
                    const cacheAge = cacheData.repoCache?.timestamp ? now - cacheData.repoCache.timestamp : Infinity;
                    const cacheTTL = 10 * 60 * 1000; // 10 minutes 

                    if (cacheData.repoCache &&
                        cacheData.repoCache.cacheKey === repoCacheKey &&
                        cacheAge < cacheTTL) {

                        console.log('Using cached repositories');
                        availableRepos = cacheData.repoCache.data;
                        repoStatus.textContent = browserAPI.i18n.getMessage('repoLoaded', [availableRepos.length]);

                        if (document.activeElement === repoSearch) {
                            filterAndDisplayRepos(repoSearch.value.toLowerCase());
                        }
                        return;
                    }

                    if (window.fetchUserRepositories) {
                        const repos = await window.fetchUserRepositories(

                            username,

                            items.githubToken,
                            items.orgName || '',
                        );
                        availableRepos = repos;
                        repoStatus.textContent = browserAPI.i18n.getMessage('repoLoaded', [repos.length]);

                        browserAPI.storage.local.set({
                            repoCache: {
                                data: repos,
                                cacheKey: repoCacheKey,
                                timestamp: now
                            }
                        });

                        if (document.activeElement === repoSearch) {
                            filterAndDisplayRepos(repoSearch.value.toLowerCase());
                        }
                    }
                } catch (err) {


                    console.error('Auto load repos failed', err);

                    if (err.message?.includes('401')) {
                        repoStatus.textContent = browserAPI.i18n.getMessage('repoTokenPrivate');
                    } else if (err.message?.includes('username')) {
                        repoStatus.textContent = browserAPI.i18n.getMessage('githubUsernamePlaceholder');
                    } else {
                        repoStatus.textContent = `${browserAPI.i18n.getMessage('errorLabel')}: ${err.message || browserAPI.i18n.getMessage('repoLoadFailed')}`;
                    }
                }
            } else {
                selectedRepos = [];
                updateRepoDisplay();
                browserAPI.storage.local.set({ selectedRepos: [] });
                repoStatus.textContent = '';
            }
        }, 300));

        repoSearch.addEventListener('keydown', (e) => {
            const items = repoDropdown.querySelectorAll('.repository-dropdown-item');

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
                    updateHighlight(items);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    highlightedIndex = Math.max(highlightedIndex - 1, 0);
                    updateHighlight(items);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (highlightedIndex >= 0 && items[highlightedIndex]) {
                        fnSelectedRepos(items[highlightedIndex].dataset.repoName);
                    }
                    break;
                case 'Escape':
                    hideDropdown();
                    break;
            }
        });

        repoSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterAndDisplayRepos(query);
        })
        let programmaticFocus = false;
        repoSearch.addEventListener('focus', function () {
            if (programmaticFocus) {
                programmaticFocus = false;
                return;
            }
            if (repoSearch.value) {
                filterAndDisplayRepos(repoSearch.value.toLowerCase());
            } else if (availableRepos.length > 0) {
                filterAndDisplayRepos('');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#repoSearch') && !e.target.closest('#repoDropdown')) {
                hideDropdown();
            }
        });

        function debugRepoFetch() {
            browserAPI.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], (items) => {
                const platform = items.platform || 'github';
                const platformUsernameKey = `${platform}Username`;
                const username = items[platformUsernameKey];
                console.log('Current settings:', {
                    username: username,
                    hasToken: !!items.githubToken,
                    org: items.orgName || ''
                });
            });
        }
        debugRepoFetch();
        async function loadRepos() {
            // --- PLATFORM CHECK: Only run for GitHub ---
            let platform = 'github';
            try {
                const items = await new Promise(resolve => {
                    browserAPI.storage.local.get(['platform'], resolve);
                });
                platform = items.platform || 'github';
            } catch (e) { }
            if (platform !== 'github') {
                if (repoStatus) repoStatus.textContent = 'Repository loading is only available for GitHub.';
                return;
            }
            console.log('window.fetchUserRepositories exists:', !!window.fetchUserRepositories);
            console.log('Available functions:', Object.keys(window).filter(key => key.includes('fetch')));

            if (!window.fetchUserRepositories) {
                repoStatus.textContent = 'Repository fetching not available';
                return;
            }

            browserAPI.storage.local.get(['platform', 'githubUsername', 'githubToken'], (items) => {
                const platform = items.platform || 'github';
                const platformUsernameKey = `${platform}Username`;
                const username = items[platformUsernameKey];
                console.log('Storage data for repo fetch:', {
                    hasUsername: !!username,
                    hasToken: !!items.githubToken,
                    username: username
                });


                if (!username) {
                    repoStatus.textContent = 'Username required';

                    return;
                }

                performRepoFetch();
            });
        }

        async function performRepoFetch() {
            // --- PLATFORM CHECK: Only run for GitHub ---
            let platform = 'github';
            try {
                const items = await new Promise(resolve => {
                    browserAPI.storage.local.get(['platform'], resolve);
                });
                platform = items.platform || 'github';
            } catch (e) { }
            if (platform !== 'github') {
                if (repoStatus) repoStatus.textContent = 'Repository fetching is only available for GitHub.';
                return;
            }
            console.log('[POPUP-DEBUG] performRepoFetch called.');
            repoStatus.textContent = browserAPI.i18n.getMessage('repoLoading');
            repoSearch.classList.add('repository-search-loading');

            try {
                const cacheData = await new Promise(resolve => {
                    browserAPI.storage.local.get(['repoCache'], resolve);
                });
                const storageItems = await new Promise(resolve => {

                    browserAPI.storage.local.get(['platform', 'githubUsername', 'githubToken', 'orgName'], resolve)

                })
                const platform = storageItems.platform || 'github';
                const platformUsernameKey = `${platform}Username`;
                const username = storageItems[platformUsernameKey];
                const repoCacheKey = `repos-${username}-${storageItems.orgName || ''}`;
                const now = Date.now();
                const cacheAge = cacheData.repoCache?.timestamp ? now - cacheData.repoCache.timestamp : Infinity;
                const cacheTTL = 10 * 60 * 1000; // 10 minutes

                console.log('[POPUP-DEBUG] Repo cache check:', {
                    key: repoCacheKey,
                    cacheKeyInCache: cacheData.repoCache?.cacheKey,
                    isMatch: cacheData.repoCache?.cacheKey === repoCacheKey,
                    age: cacheAge,
                    isFresh: cacheAge < cacheTTL
                });

                if (cacheData.repoCache &&
                    cacheData.repoCache.cacheKey === repoCacheKey &&
                    cacheAge < cacheTTL) {

                    console.log('[POPUP-DEBUG] Using cached repositories in manual fetch');
                    availableRepos = cacheData.repoCache.data;
                    repoStatus.textContent = browserAPI.i18n.getMessage('repoLoaded', [availableRepos.length]);

                    if (document.activeElement === repoSearch) {
                        filterAndDisplayRepos(repoSearch.value.toLowerCase());
                    }
                    return;
                }
                console.log('[POPUP-DEBUG] No valid cache. Fetching from network.');
                availableRepos = await window.fetchUserRepositories(

                    username,

                    storageItems.githubToken,
                    storageItems.orgName || ''
                );
                repoStatus.textContent = browserAPI.i18n.getMessage('repoLoaded', [availableRepos.length]);
                console.log(`[POPUP-DEBUG] Fetched and loaded ${availableRepos.length} repos.`);

                browserAPI.storage.local.set({
                    repoCache: {
                        data: availableRepos,
                        cacheKey: repoCacheKey,
                        timestamp: now
                    }
                });

                if (document.activeElement === repoSearch) {
                    filterAndDisplayRepos(repoSearch.value.toLowerCase());
                }
            } catch (err) {
                console.error(`Failed to load repos:`, err);

                if (err.message && err.message.includes('401')) {
                    repoStatus.textContent = browserAPI.i18n.getMessage('repoTokenPrivate');
                } else if (err.message && err.message.includes('username')) {
                    repoStatus.textContent = browserAPI.i18n.getMessage('githubUsernamePlaceholder');
                } else {
                    repoStatus.textContent = `${browserAPI.i18n.getMessage('errorLabel')}: ${err.message || browserAPI.i18n.getMessage('repoLoadFailed')}`;
                }
            } finally {
                repoSearch.classList.remove('repository-search-loading');
            }
        }

        function filterAndDisplayRepos(query) {
            if (availableRepos.length === 0) {
                repoDropdown.innerHTML = `<div class="p-3 text-center text-gray-500 text-sm">${browserAPI.i18n.getMessage('repoLoading')}</div>`;
                showDropdown();
                return;
            }

            const filtered = availableRepos.filter(repo =>
                !selectedRepos.includes(repo.fullName) && (repo.name.toLowerCase().includes(query) || repo.description?.toLowerCase().includes(query))
            );

            if (filtered.length === 0) {
                repoDropdown.innerHTML = `<div class="p-3 text-center text-gray-500 text-sm" style="padding-left: 10px; ">${browserAPI.i18n.getMessage('repoNotFound')}</div>`;
            } else {
                repoDropdown.innerHTML = filtered.slice(0, 10).map(repo => `
                    <div class="repository-dropdown-item" data-repo-name="${repo.fullName}">
                        <div class="repo-name">
                            <span>${repo.name}</span>
                            ${repo.language ? `<span class="repo-language">${repo.language}</span>` : ''}
                            ${repo.stars ? `<span class="repo-stars"><i class="fa fa-star"></i> ${repo.stars}</span>` : ''}
                        </div>
                        <div class="repo-info">
                            ${repo.description ? `<span class="repo-desc">${repo.description.substring(0, 50)}${repo.description.length > 50 ? '...' : ''}</span>` : ''}
                        </div>
                    </div>
                `).join('');

                repoDropdown.querySelectorAll('.repository-dropdown-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        fnSelectedRepos(item.dataset.repoName);
                    });
                });
            }
            highlightedIndex = -1;
            showDropdown();
        }

        function fnSelectedRepos(repoFullName) {
            if (!selectedRepos.includes(repoFullName)) {
                selectedRepos.push(repoFullName);
                updateRepoDisplay();
                saveRepoSelection();
            }

            repoSearch.value = '';
            filterAndDisplayRepos('');
            programmaticFocus = true;
            repoSearch.focus();
        }

        function removeRepo(repoFullName) {
            selectedRepos = selectedRepos.filter(name => name !== repoFullName);
            updateRepoDisplay();
            saveRepoSelection();

            if (repoSearch.value) {
                filterAndDisplayRepos(repoSearch.value.toLowerCase());
            }
        }

        function updateRepoDisplay() {
            if (selectedRepos.length === 0) {
                repoTags.innerHTML = `<span class="text-xs text-gray-500 select-none" id="repoPlaceholder">${browserAPI.i18n.getMessage('repoPlaceholder')}</span>`;
                repoCount.textContent = browserAPI.i18n.getMessage('repoCountNone');
            } else {
                repoTags.innerHTML = selectedRepos.map(repoFullName => {
                    const repoName = repoFullName.split('/')[1] || repoFullName;
                    return `
                        <span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full" style="margin:5px;">
                            ${repoName}
                            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800 remove-repo-btn cursor-pointer" data-repo-name="${repoFullName}">
                                <i class="fa fa-times"></i>
                            </button>
                        </span>
                    `;
                }).join(' ');
                repoTags.querySelectorAll('.remove-repo-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const repoFullName = btn.dataset.repoName;
                        removeRepo(repoFullName);
                    });
                });
                repoCount.textContent = browserAPI.i18n.getMessage('repoCount', [selectedRepos.length]);
            }
        }

        function saveRepoSelection() {
            const cleanedRepos = selectedRepos.filter(repo => repo !== null);
            browserAPI.storage.local.set({
                selectedRepos: cleanedRepos,
                githubCache: null
            });
        }

        function showDropdown() {
            repoDropdown.classList.remove('hidden');
        }

        function hideDropdown() {
            repoDropdown.classList.add('hidden');
            highlightedIndex = -1;
        }

        function updateHighlight(items) {
            items.forEach((item, index) => {
                item.classList.toggle('highlighted', index === highlightedIndex);
            });

            if (highlightedIndex >= 0 && items[highlightedIndex]) {
                items[highlightedIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        window.removeRepo = removeRepo;


        browserAPI.storage.local.get(['platform', 'githubUsername'], (items) => {
            const platform = items.platform || 'github';
            const platformUsernameKey = `${platform}Username`;
            const username = items[platformUsernameKey];
            if (username && useRepoFilter.checked && availableRepos.length === 0) {

                setTimeout(() => loadRepos(), 1000);
            }
        })
    }
});


// Auto-update orgName in storage on input change
orgInput.addEventListener('input', function () {
    let org = orgInput.value.trim().toLowerCase();
    // Allow empty org to fetch all GitHub activities
    browserAPI.storage.local.set({ orgName: org }, function () {
        browserAPI.storage.local.remove('githubCache'); // Clear cache on org change
    });
});

// Add click event for setOrgBtn to set org
setOrgBtn.addEventListener('click', function () {
    let org = orgInput.value.trim().toLowerCase();


    console.log('[Org Check] Checking organization:', org);
    if (!org) {
        // If org is empty, clear orgName in storage but don't auto-generate report
        browserAPI.storage.local.set({ orgName: '' }, function () {
            console.log('[Org Check] Organization cleared from storage');
            const scrumReport = document.getElementById('scrumReport');
            if (scrumReport) {
                scrumReport.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${browserAPI.i18n.getMessage('orgClearedMessage')}</p>`;
            }
            browserAPI.storage.local.remove(['githubCache', 'repoCache']);
            triggerRepoFetchIfEnabled();
            setOrgBtn.disabled = false;
            setOrgBtn.innerHTML = originalText;
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
                toastDiv.innerText = browserAPI.i18n.getMessage('orgNotFoundMessage');
                document.body.appendChild(toastDiv);
                setTimeout(() => {
                    if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                }, 3000);
                return;
            }
            const oldToast = document.getElementById('invalid-org-toast');
            if (oldToast) oldToast.parentNode.removeChild(oldToast);


            browserAPI.storage.local.set({ orgName: org }, function () {
                // always clear the scrum report and show org changed message
                const scrumReport = document.getElementById('scrumReport');
                if (scrumReport) {
                    scrumReport.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${browserAPI.i18n.getMessage('orgChangedMessage')}</p>`;
                }
                // Clear the githubCache for previous org
                browserAPI.storage.local.remove('githubCache');
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
                toastDiv.innerText = browserAPI.i18n.getMessage('orgSetMessage');
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
            toastDiv.innerText = browserAPI.i18n.getMessage('orgValidationErrorMessage');
            document.body.appendChild(toastDiv);
            setTimeout(() => {
                if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
            }, 3000);
        });
});

let cacheInput = document.getElementById('cacheInput');
if (cacheInput) {
    browserAPI.storage.local.get(['cacheInput'], function (result) {
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

        browserAPI.storage.local.set({ cacheInput: ttlValue }, function () {
            console.log('Cache TTL saved:', ttlValue, 'minutes');
        });
    });
}


// Restore platform from storage or default to github
browserAPI.storage.local.get(['platform'], function (result) {
    const platform = result.platform || 'github';
    platformSelect.value = platform;
    updatePlatformUI(platform);
});

// Update UI for platform
function updatePlatformUI(platform) {
    // Hide GitHub-specific settings for GitLab using the 'hidden' class
    const orgSection = document.querySelector('.orgSection');
    if (orgSection) {
        if (platform === 'gitlab') {
            orgSection.classList.add('hidden');
        } else {
            orgSection.classList.remove('hidden');
        }
    }
    // Hide all githubOnlySection elements for GitLab
    const githubOnlySections = document.querySelectorAll('.githubOnlySection');
    githubOnlySections.forEach(el => {
        if (platform === 'gitlab') {
            el.classList.add('hidden');
        } else {
            el.classList.remove('hidden');
        }
    });
    // (Optional) You can update the label/placeholder here if you want
    // Do NOT clear the username field here, only do it on actual platform change
}

// On platform change
platformSelect.addEventListener('change', function () {
    const platform = platformSelect.value;
    browserAPI.storage.local.set({ platform });
    // Save current username for current platform before switching
    const platformUsername = document.getElementById('platformUsername');
    if (platformUsername) {
        const currentPlatform = platformSelect.value === 'github' ? 'gitlab' : 'github'; // Get the platform we're switching from
        const currentUsername = platformUsername.value;
        if (currentUsername.trim()) {
            browserAPI.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
        }
    }

    // Load username for the new platform
    browserAPI.storage.local.get([`${platform}Username`], function (result) {
        if (platformUsername) {
            platformUsername.value = result[`${platform}Username`] || '';
        }
    });

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
        dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
    } else {
        dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
    }

    // Save current username for current platform before switching
    const platformUsername = document.getElementById('platformUsername');
    if (platformUsername) {
        const currentPlatform = platformSelectHidden.value;
        const currentUsername = platformUsername.value;
        if (currentUsername.trim()) {
            browserAPI.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
        }
    }

    platformSelectHidden.value = value;
    browserAPI.storage.local.set({ platform: value });

    // Load username for the new platform
    browserAPI.storage.local.get([`${value}Username`], function (result) {
        if (platformUsername) {
            platformUsername.value = result[`${value}Username`] || '';
        }
    });

    updatePlatformUI(value);
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

        // Save current username for current platform before switching
        if (newPlatform !== currentPlatform) {
            const platformUsername = document.getElementById('platformUsername');
            if (platformUsername) {
                const currentUsername = platformUsername.value;
                if (currentUsername.trim()) {
                    browserAPI.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
                }
            }
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

            // Save current username for current platform before switching
            if (newPlatform !== currentPlatform) {
                const platformUsername = document.getElementById('platformUsername');
                if (platformUsername) {
                    const currentUsername = platformUsername.value;
                    if (currentUsername.trim()) {
                        browserAPI.storage.local.set({ [`${currentPlatform}Username`]: currentUsername });
                    }
                }
            }

            setPlatformDropdown(newPlatform);
            customDropdown.classList.remove('open');
            dropdownList.classList.add('hidden');
            dropdownBtn.focus();
        }
    });
});

// On load, restore platform from storage
browserAPI.storage.local.get(['platform'], function (result) {
    const platform = result.platform || 'github';
    // Just update the UI without clearing username when restoring from storage
    if (platform === 'gitlab') {
        dropdownSelected.innerHTML = '<i class="fab fa-gitlab mr-2"></i> GitLab';
    } else {
        dropdownSelected.innerHTML = '<i class="fab fa-github mr-2"></i> GitHub';
    }
    platformSelectHidden.value = platform;
    updatePlatformUI(platform);
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

            browserAPI.storage.local.set({
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
    button.innerHTML = `<i class="fa fa-refresh fa-spin"></i><span>${browserAPI.i18n.getMessage('refreshingButton')}</span>`;
    button.disabled = true;

    try {
        // Determine platform
        let platform = 'github';
        try {
            const items = await new Promise(resolve => {
                browserAPI.storage.local.get(['platform'], resolve);
            });
            platform = items.platform || 'github';
        } catch (e) { }

        // Clear all caches
        const keysToRemove = ['githubCache', 'repoCache', 'gitlabCache'];
        await new Promise(resolve => {
            browserAPI.storage.local.remove(keysToRemove, resolve);
        });

        // Clear the scrum report
        const scrumReport = document.getElementById('scrumReport');
        if (scrumReport) {
            scrumReport.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${browserAPI.i18n.getMessage('cacheClearedMessage')}</p>`;
        }

        if (typeof availableRepos !== 'undefined') {
            availableRepos = [];
        }

        const repoStatus = document.getElementById('repoStatus');
        if (repoStatus) {
            repoStatus.textContent = '';
        }

        button.innerHTML = `<i class="fa fa-check"></i><span>${browserAPI.i18n.getMessage('cacheClearedButton')}</span>`;
        button.classList.remove('loading');

        // Do NOT trigger report generation automatically

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Cache clear failed:', error);
        button.innerHTML = `<i class="fa fa-exclamation-triangle"></i><span>${browserAPI.i18n.getMessage('cacheClearFailed')}</span>`;
        button.classList.remove('loading');

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    }
});

const handleOrgInput = debounce(function () {
    let org = orgInput.value.trim().toLowerCase();
    if (!org) {
        browserAPI.storage.local.set({ orgName: '' }, () => {
            console.log(`Org cleared, triggering repo fetch for all git`);
            browserAPI.storage.local.remove(['githubCache', 'repoCache']);
            triggerRepoFetchIfEnabled();
        })
        return;
    }
    console.log('[Org Check] Checking organization:', org);
    fetch(`https://api.github.com/orgs/${org}`)
        .then(res => {
            console.log('[Org Check] Response status for', org, ':', res.status);
            if (res.status === 404) {
                console.log('[Org Check] Organization not found on GitHub:', org);
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
                toastDiv.innerText = browserAPI.i18n.getMessage('orgNotFoundMessage');
                document.body.appendChild(toastDiv);
                setTimeout(() => {
                    if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
                }, 3000);
                return;
            }
            const oldToast = document.getElementById('invalid-org-toast');
            if (oldToast) oldToast.parentNode.removeChild(oldToast);
            console.log('[Org Check] Organisation exists on GitHub:', org);
            browserAPI.storage.local.set({ orgName: org }, function () {
                // if (window.generateScrumReport) window.generateScrumReport();
                triggerRepoFetchIfEnabled();
            });
        })
        .catch((err) => {
            console.log('[Org Check] Error validating organisation:', org, err);
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
            toastDiv.innerText = browserAPI.i18n.getMessage('orgValidationErrorMessage');
            document.body.appendChild(toastDiv);
            setTimeout(() => {
                if (toastDiv.parentNode) toastDiv.parentNode.removeChild(toastDiv);
            }, 3000);
        });
}, 3000);

let lastInvalidOrg = '';
orgInput.addEventListener('input', handleOrgInput);

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

    browserAPI.storage.local.set({
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

        triggerRepoFetchIfEnabled();
    });

}

async function triggerRepoFetchIfEnabled() {
    if (window.triggerRepoFetchIfEnabled) {
        await window.triggerRepoFetchIfEnabled();
    }
}
