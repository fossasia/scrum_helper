const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        console.log(`[SCRUM-HELPER]:`, ...args);
    }
}
function logError(...args) {
    if (DEBUG) {
        console.error('[SCRUM-HELPER]:', ...args);
    }
}

console.log('Script loaded, adapter exists:', !!window.emailClientAdapter);

let refreshButton_Placed = false;
let enableToggle = true;
let hasInjectedContent = false;
let scrumGenerationInProgress = false;
let orgName = 'fossasia';

// Unified storage API for Chrome/Firefox compatibility
const storage = chrome.storage || browser.storage;

function allIncluded(outputTarget = 'email') {
    if (scrumGenerationInProgress) {
        log('Scrum generation already in progress, aborting new call');
        return;
    }
    scrumGenerationInProgress = true;
    log('allIncluded called with outputTarget:', outputTarget);
    log('Current window context:', window.location.href);
    
    let scrumBody = null;
    let scrumSubject = null;
    let startingDate = '';
    let endingDate = '';
    let githubUsername = '';
    let githubToken = '';
    let projectName = '';
    let lastWeekArray = [];
    let nextWeekArray = [];
    let reviewedPrsArray = [];
    let githubIssuesData = null;
    let lastWeekContribution = false;
    let yesterdayContribution = false;
    let githubPrsReviewData = null;
    let githubUserData = null;
    let githubPrsReviewDataProcessed = {};
    let issuesDataProcessed = false;
    let prsReviewDataProcessed = false;
    let showOpenLabel = true;
    let showCommits = false;
    let userReason = '';

    // Button styles
    let pr_open_button = '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';
    let pr_closed_button = '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color:rgb(210, 20, 39);border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--red">closed</div>';
    let pr_merged_button = '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">merged</div>';
    let pr_draft_button = '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #808080;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--gray">draft</div>';
    let issue_closed_button = '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #d73a49;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--red">closed</div>';
    let issue_opened_button = '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

    function getBrowserData() {
        log("Getting browser data for context:", outputTarget);
        storage.local.get(
            [
                'githubUsername',
                'githubToken',
                'projectName',
                'enableToggle',
                'startingDate',
                'endingDate',
                'showOpenLabel',
                'showClosedLabel',
                'lastWeekContribution',
                'yesterdayContribution',
                'userReason',
                'showCommits',
                'githubCache',
                'cacheInput',
                'orgName'
            ],
            (items) => {
                log("Storage items received:", items);

                // Handle popup UI elements
                if (outputTarget === 'popup') {
                    const usernameFromDOM = document.getElementById('githubUsername')?.value;
                    const projectFromDOM = document.getElementById('projectName')?.value;
                    const reasonFromDOM = document.getElementById('userReason')?.value;
                    const tokenFromDOM = document.getElementById('githubToken')?.value;

                    items.githubUsername = usernameFromDOM || items.githubUsername;
                    items.projectName = projectFromDOM || items.projectName;
                    items.userReason = reasonFromDOM || items.userReason;
                    items.githubToken = tokenFromDOM || items.githubToken;

                    storage.local.set({
                        githubUsername: items.githubUsername,
                        projectName: items.projectName,
                        userReason: items.userReason,
                        githubToken: items.githubToken
                    });
                }

                // Set retrieved values
                githubUsername = items.githubUsername;
                projectName = items.projectName;
                userReason = items.userReason || 'No Blocker at the moment';
                githubToken = items.githubToken;
                lastWeekContribution = items.lastWeekContribution;
                yesterdayContribution = items.yesterdayContribution;

                // Handle feature toggles
                if (items.enableToggle !== undefined) enableToggle = items.enableToggle;
                if (items.cacheInput) cacheInput = items.cacheInput;
                if (items.showCommits !== undefined) showCommits = items.showCommits;
                if (items.orgName) orgName = items.orgName;
                if (items.showOpenLabel === false) {
                    showOpenLabel = false;
                    pr_open_button = '';
                    issue_opened_button = '';
                }

                // Handle date ranges
                if (items.lastWeekContribution) {
                    handleLastWeekContributionChange();
                } else if (items.yesterdayContribution) {
                    handleYesterdayContributionChange();
                } else if (items.startingDate && items.endingDate) {
                    startingDate = items.startingDate;
                    endingDate = items.endingDate;
                } else {
                    handleLastWeekContributionChange(); // Default to last week
                    if (outputTarget === 'popup') {
                        storage.local.set({ lastWeekContribution: true, yesterdayContribution: false });
                    }
                }

                // Fetch data if username exists
                if (githubUsername) {
                    log("About to fetch GitHub data for:", githubUsername);
                    fetchGithubData();
                } else {
                    handleMissingUsername();
                }
            }
        );
    }

    function handleMissingUsername() {
        if (outputTarget === 'popup') {
            log("No username found - popup context");
            const scrumReport = document.getElementById('scrumReport');
            const generateBtn = document.getElementById('generateReport');
            if (scrumReport) {
                scrumReport.innerHTML = '<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Please enter your GitHub username to generate a report.</div>';
            }
            if (generateBtn) {
                generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                generateBtn.disabled = false;
            }
            scrumGenerationInProgress = false;
        } else {
            log('No GitHub username found in storage');
            scrumGenerationInProgress = false;
        }
    }

    function handleLastWeekContributionChange() {
        endingDate = getToday();
        startingDate = getLastWeek();
    }

    function handleYesterdayContributionChange() {
        endingDate = getToday();
        startingDate = getYesterday();
    }

    function getLastWeek() {
        const today = new Date();
        const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        const lastWeekMonth = lastWeek.getMonth() + 1;
        const lastWeekDay = lastWeek.getDate();
        return `${lastWeek.getFullYear()}-${pad(lastWeekMonth)}-${pad(lastWeekDay)}`;
    }

    function getYesterday() {
        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const yesterdayMonth = yesterday.getMonth() + 1;
        const yesterdayDay = yesterday.getDate();
        return `${yesterday.getFullYear()}-${pad(yesterdayMonth)}-${pad(yesterdayDay)}`;
    }

    function getToday() {
        const today = new Date();
        return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

    // Global cache object
    let githubCache = {
        data: null,
        cacheKey: null,
        timestamp: 0,
        ttl: 10 * 60 * 1000, // cache valid for 10 mins
        fetching: false,
        queue: [],
        subject: null,
    };

    async function getCacheTTL() {
        return new Promise((resolve) => {
            storage.local.get(['cacheInput'], (result) => {
                const ttlMinutes = result.cacheInput || 10;
                resolve(ttlMinutes * 60 * 1000);
            });
        });
    }

    function saveToStorage(data, subject = null) {
        const cacheData = {
            data: data,
            cacheKey: githubCache.cacheKey,
            timestamp: githubCache.timestamp,
            subject: subject,
        }
        return new Promise((resolve) => {
            storage.local.set({ githubCache: cacheData }, () => {
                githubCache.data = data;
                githubCache.subject = subject;
                resolve(true);
            });
        });
    }

    function loadFromStorage() {
        return new Promise(async (resolve) => {
            const currentTTL = await getCacheTTL();
            storage.local.get('githubCache', (result) => {
                const cache = result.githubCache;
                if (!cache) {
                    log('No cache found in storage');
                    resolve(false);
                    return;
                }
                const isCacheExpired = (Date.now() - cache.timestamp) > currentTTL;
                if (isCacheExpired) {
                    log('Cached data is expired');
                    resolve(false);
                    return;
                }
                githubCache.data = cache.data;
                githubCache.cacheKey = cache.cacheKey;
                githubCache.timestamp = cache.timestamp;
                githubCache.subject = cache.subject;
                resolve(true);
            });
        });
    }

    async function fetchGithubData() {
        const cacheKey = `${githubUsername}-${orgName}-${startingDate}-${endingDate}`;
        if (githubCache.fetching || (githubCache.cacheKey === cacheKey && githubCache.data)) {
            log('Using existing data or ongoing fetch');
            return;
        }

        // Check cache status
        if (!githubCache.data && !githubCache.fetching) {
            await loadFromStorage();
        };

        const currentTTL = await getCacheTTL();
        githubCache.ttl = currentTTL;
        githubCache.cacheKey = cacheKey;

        const now = Date.now();
        const isCacheFresh = (now - githubCache.timestamp) < githubCache.ttl;
        const isCacheKeyMatch = githubCache.cacheKey === cacheKey;
        
        if (githubCache.data && isCacheFresh && isCacheKeyMatch) {
            log('Using cached data');
            processGithubData(githubCache.data);
            return;
        }

        if (!isCacheKeyMatch) githubCache.data = null;
        if (githubCache.fetching) return;

        githubCache.fetching = true;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            ...(githubToken && { 'Authorization': `token ${githubToken}` })
        };

        try {
            const issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3A${orgName}+updated%3A${startingDate}..${endingDate}&per_page=100`;
            const prUrl = `https://api.github.com/search/issues?q=commenter%3A${githubUsername}+org%3A${orgName}+updated%3A${startingDate}..${endingDate}&per_page=100`;
            const userUrl = `https://api.github.com/users/${githubUsername}`;

            // Throttle requests
            await new Promise(res => setTimeout(res, 500));

            const [issuesRes, prRes, userRes] = await Promise.all([
                fetch(issueUrl, { headers }),
                fetch(prUrl, { headers }),
                fetch(userUrl, { headers }),
            ]);

            // Handle API errors
            if (issuesRes.status === 401 || prRes.status === 401 || userRes.status === 401) {
                showInvalidTokenMessage();
                return;
            }

            if (!issuesRes.ok) throw new Error(`Error fetching issues: ${issuesRes.status}`);
            if (!prRes.ok) throw new Error(`Error fetching PRs: ${prRes.status}`);
            if (!userRes.ok) throw new Error(`Error fetching user: ${userRes.status}`);

            githubIssuesData = await issuesRes.json();
            githubPrsReviewData = await prRes.json();
            githubUserData = await userRes.json();

            // Cache the data
            githubCache.data = { githubIssuesData, githubPrsReviewData, githubUserData };
            githubCache.timestamp = Date.now();
            await saveToStorage(githubCache.data);

            processGithubData(githubCache.data);
        } catch (err) {
            logError('Fetch Failed:', err);
            showErrorMessage(err.message || 'An error occurred');
        } finally {
            githubCache.fetching = false;
        }
    }

    function showInvalidTokenMessage() {
        if (outputTarget === 'popup') {
            const reportDiv = document.getElementById('scrumReport');
            if (reportDiv) {
                reportDiv.innerHTML = '<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Invalid or expired GitHub token. Please check your token in the settings and try again.</div>';
                const generateBtn = document.getElementById('generateReport');
                if (generateBtn) {
                    generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                    generateBtn.disabled = false;
                }
            }
        }
    }

    function showErrorMessage(message) {
        if (outputTarget === 'popup') {
            const reportDiv = document.getElementById('scrumReport');
            if (reportDiv) {
                reportDiv.innerHTML = `<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">${message}</div>`;
                const generateBtn = document.getElementById('generateReport');
                if (generateBtn) {
                    generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                    generateBtn.disabled = false;
                }
            }
        }
    }

    async function processGithubData(data) {
        log('Processing Github data');
        githubIssuesData = data.githubIssuesData;
        githubPrsReviewData = data.githubPrsReviewData;
        githubUserData = data.githubUserData;

        lastWeekArray = [];
        nextWeekArray = [];
        reviewedPrsArray = [];
        githubPrsReviewDataProcessed = {};

        issuesDataProcessed = false;
        prsReviewDataProcessed = false;

        // Update subject
        if (!githubCache.subject && scrumSubject) {
            scrumSubjectLoaded();
        }
        
        await Promise.all([
            writeGithubIssuesPrs(),
            writeGithubPrsReviews(),
        ])
        
        log('Generating scrum body');
        writeScrumBody();
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function writeScrumBody() {
        if (!enableToggle || (outputTarget === 'email' && hasInjectedContent)) return;

        if (outputTarget === 'email') {
            if (!window.emailClientAdapter) {
                logError('Email client adapter not found');
                return;
            }
            if (!window.emailClientAdapter.isNewConversation()) {
                log('Not a new conversation, skipping scrum helper');
                return;
            }
        }

        setTimeout(() => {
            // Generate content
            let lastWeekUl = '<ul>';
            for (let i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
            for (let i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
            lastWeekUl += '</ul>';

            let nextWeekUl = '<ul>';
            for (let i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
            nextWeekUl += '</ul>';

            let weekOrDay = lastWeekContribution ? 'last week' : (yesterdayContribution ? 'yesterday' : 'the period');
            let weekOrDay2 = lastWeekContribution ? 'this week' : 'today';

            // Create the complete content
            let content;
            if (lastWeekContribution || yesterdayContribution) {
                content = `<b>1. What did I do ${weekOrDay}?</b><br>
${lastWeekUl}<br>
<b>2. What do I plan to do ${weekOrDay2}?</b><br>
${nextWeekUl}<br>
<b>3. What is blocking me from making progress?</b><br>
${userReason}`;
            } else {
                content = `<b>1. What did I do from ${formatDate(startingDate)} to ${formatDate(endingDate)}?</b><br>
${lastWeekUl}<br>
<b>2. What do I plan to do ${weekOrDay2}?</b><br>
${nextWeekUl}<br>
<b>3. What is blocking me from making progress?</b><br>
${userReason}`;
            }

            // Inject into UI
            if (outputTarget === 'popup') {
                const scrumReport = document.getElementById('scrumReport');
                if (scrumReport) {
                    scrumReport.innerHTML = content;
                    const generateBtn = document.getElementById('generateReport');
                    if (generateBtn) {
                        generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                        generateBtn.disabled = false;
                    }
                }
            } else {
                const elements = window.emailClientAdapter.getEditorElements();
                if (elements && elements.body) {
                    window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
                    hasInjectedContent = true;
                }
            }
            
            scrumGenerationInProgress = false;
        }, 500);
    }

    function scrumSubjectLoaded() {
        try {
            if (!enableToggle || hasInjectedContent) return;
            if (!scrumSubject) {
                logError('Subject element not found');
                return;
            }
            setTimeout(() => {
                let name = githubUserData.name || githubUsername;
                let project = projectName || '<project name>';
                let curDate = new Date();
                let dateCode = `${curDate.getFullYear()}${pad(curDate.getMonth() + 1)}${pad(curDate.getDate())}`;

                const subject = `[Scrum] ${name} - ${project} - ${dateCode}`;
                githubCache.subject = subject;
                saveToStorage(githubCache.data, subject);

                if (scrumSubject && scrumSubject.value !== subject) {
                    scrumSubject.value = subject;
                    scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        } catch (err) {
            logError('Error setting subject:', err);
        }
    }

    function writeGithubPrsReviews() {
        let items = githubPrsReviewData.items;
        if (!items) {
            logError('No Github PR review data available');
            return;
        }
        reviewedPrsArray = [];
        githubPrsReviewDataProcessed = {};
        
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.user.login === githubUsername || !item.pull_request) continue;
            let repository_url = item.repository_url;
            let project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
            let title = item.title;
            let number = item.number;
            let html_url = item.html_url;
            
            if (!githubPrsReviewDataProcessed[project]) {
                githubPrsReviewDataProcessed[project] = [];
            }
            
            githubPrsReviewDataProcessed[project].push({
                number: number,
                html_url: html_url,
                title: title,
                state: item.state,
            });
        }
        
        for (let repo in githubPrsReviewDataProcessed) {
            let repoLi = `<li><i>(${repo})</i> - Reviewed `;
            if (githubPrsReviewDataProcessed[repo].length > 1) repoLi += 'PRs - ';
            else repoLi += 'PR - ';
            
            if (githubPrsReviewDataProcessed[repo].length <= 1) {
                for (let pr in githubPrsReviewDataProcessed[repo]) {
                    let pr_arr = githubPrsReviewDataProcessed[repo][pr];
                    let prText = `<a href='${pr_arr.html_url}' target='_blank'>#${pr_arr.number}</a> (${pr_arr.title}) `;
                    if (pr_arr.state === 'open') prText += issue_opened_button;
                    else prText += issue_closed_button;
                    repoLi += prText;
                }
            } else {
                repoLi += '<ul>';
                for (let pr1 in githubPrsReviewDataProcessed[repo]) {
                    let pr_arr1 = githubPrsReviewDataProcessed[repo][pr1];
                    let prText1 = `<li><a href='${pr_arr1.html_url}' target='_blank'>#${pr_arr1.number}</a> (${pr_arr1.title}) `;
                    if (pr_arr1.state === 'open') prText1 += issue_opened_button;
                    else prText1 += issue_closed_button;
                    prText1 += '</li>';
                    repoLi += prText1;
                }
                repoLi += '</ul>';
            }
            repoLi += '</li>';
            reviewedPrsArray.push(repoLi);
        }

        prsReviewDataProcessed = true;
        if (issuesDataProcessed && outputTarget === 'email') {
            writeScrumBody();
        }
    }

    function writeGithubIssuesPrs() {
        let items = githubIssuesData.items;
        lastWeekArray = [];
        nextWeekArray = [];
        if (!items) {
            logError('No Github issues data available');
            return;
        }
        
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            let html_url = item.html_url;
            let repository_url = item.repository_url;
            let project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
            let title = item.title;
            let number = item.number;
            let li = '';
            let isDraft = false;
            
            if (item.pull_request && typeof item.draft !== 'undefined') {
                isDraft = item.draft;
            }
            
            if (item.pull_request) {
                if (isDraft) {
                    li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_draft_button}</li>`;
                } else if (item.state === 'open') {
                    li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_open_button}</li>`;
                } else if (item.state === 'closed') {
                    li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_closed_button}</li>`;
                }
                lastWeekArray.push(li);
            } else {
                // Handle issues
                if (item.state === 'open' && item.body?.toUpperCase().indexOf('YES') > 0) {
                    let li2 = `<li><i>(${project})</i> - Work on Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
                    nextWeekArray.push(li2);
                }
                
                if (item.state === 'open') {
                    li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
                } else if (item.state === 'closed') {
                    li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_button}</li>`;
                } else {
                    li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a></li>`;
                }
                lastWeekArray.push(li);
            }
        }
        
        issuesDataProcessed = true;
        if (prsReviewDataProcessed && outputTarget === 'email') {
            writeScrumBody();
        }
    }

    // Initialize email UI elements
    let intervalBody = setInterval(() => {
        if (!window.emailClientAdapter) return;
        const elements = window.emailClientAdapter.getEditorElements();
        if (!elements || !elements.body) return;
        clearInterval(intervalBody);
        scrumBody = elements.body;
    }, 500);

    let intervalSubject = setInterval(() => {
        if (!githubUserData || !window.emailClientAdapter) return;
        const elements = window.emailClientAdapter.getEditorElements();
        if (!elements || !elements.subject) return;

        if (outputTarget === 'email' && !window.emailClientAdapter.isNewConversation()) {
            clearInterval(intervalSubject);
            return;
        }

        clearInterval(intervalSubject);
        scrumSubject = elements.subject;
        setTimeout(scrumSubjectLoaded, 500);
    }, 500);

    // Initialize
    getBrowserData();
}

// Cache refresh function
async function forceGithubDataRefresh() {
    let showCommits = false;
    await new Promise(resolve => {
        storage.local.get('showCommits', (result) => {
            if (result.showCommits !== undefined) showCommits = result.showCommits;
            resolve();
        });
    });

    // Reset cache
    if (typeof githubCache !== 'undefined') {
        githubCache.data = null;
        githubCache.cacheKey = null;
        githubCache.timestamp = 0;
        githubCache.subject = null;
    }

    await new Promise(resolve => storage.local.remove('githubCache', resolve));
    storage.local.set({ showCommits });
    hasInjectedContent = false;
    return { success: true };
}

// Initialize based on context
if (window.location.protocol.startsWith('http')) {
    allIncluded('email');
    // Gmail-specific handler
    const newConvBtn = document.querySelector('button>span:contains(New conversation)');
    if (newConvBtn) newConvBtn.parentElement.addEventListener('click', () => allIncluded());
}

window.generateScrumReport = function () {
    allIncluded('popup');
}

// Message handling for cache refresh
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'forceRefresh') {
        forceGithubDataRefresh()
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Indicates async response
    }
});

// Initialize for email clients
if (window.emailClientAdapter) {
    window.emailClientAdapter.onNewCompose(() => {
        hasInjectedContent = false;
        allIncluded('email');
    });
}