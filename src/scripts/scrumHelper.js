
const DEBUG = false;

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


let refreshButton_Placed = false;
let enableToggle = true;
let hasInjectedContent = false;
let scrumGenerationInProgress = false;

let orgName = '';
let platform = 'github';
let platformUsername = '';
let gitlabHelper = null;

function logError(message, data) {
    console.error(message, data);
}

function allIncluded(outputTarget = 'email') {
    // Always re-instantiate gitlabHelper for gitlab platform to ensure fresh cache after refresh
    if (platform === 'gitlab' || (typeof platform === 'undefined' && window.GitLabHelper)) {
        gitlabHelper = new window.GitLabHelper();
    }
    if (scrumGenerationInProgress) {
        return;
    }
    scrumGenerationInProgress = true;

    debugLog('allIncluded called with outputTarget:', outputTarget);


    let scrumBody = null;
    let scrumSubject = null;
    let startingDate = '';
    let endingDate = '';
    let platformUsernameLocal = '';
    let githubToken = '';
    let projectName = '';
    let lastWeekArray = [];
    let nextWeekArray = [];
    let reviewedPrsArray = [];
    let githubIssuesData = null;
    let yesterdayContribution = false;
    let githubPrsReviewData = null;
    let githubUserData = null;
    let githubPrsReviewDataProcessed = {};
    let issuesDataProcessed = false;
    let prsReviewDataProcessed = false;
    let showOpenLabel = true;
    let showCommits = false;
    let userReason = '';
    let subjectForEmail = null;
    let onlyIssues = false;

    let pr_open_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';
    let pr_closed_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color:rgb(210, 20, 39);border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--red">closed</div>';
    let pr_merged_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">merged</div>';
    let pr_draft_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #808080;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--gray">draft</div>';

    let issue_closed_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #d73a49;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--red">closed</div>';
    let issue_opened_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';
    let issue_closed_completed_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
    let issue_closed_notplanned_button =
        '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #808080;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--gray">closed</div>';

    function getChromeData() {

        debugLog("[DEBUG] getChromeData called for outputTarget:", outputTarget);

        chrome.storage.local.get(
            [
                'platform',
                'githubUsername',
                'gitlabUsername',
                'githubToken',
                'projectName',
                'enableToggle',
                'startingDate',
                'endingDate',
                'showOpenLabel',
                'yesterdayContribution',
                'userReason',
                'githubCache',
                'cacheInput',
                'orgName',
                'selectedRepos',
                'useRepoFilter',
                'showCommits',
                'onlyIssues',
            ],
            (items) => {
                platform = items.platform || 'github';

                // Load platform-specific username
                const platformUsernameKey = `${platform}Username`;
                platformUsername = items[platformUsernameKey] || '';
                platformUsernameLocal = platformUsername;

                if (outputTarget === 'popup') {
                    const usernameFromDOM = document.getElementById('platformUsername')?.value;
                    const projectFromDOM = document.getElementById('projectName')?.value;
                    const tokenFromDOM = document.getElementById('githubToken')?.value;

                    // Save to platform-specific storage
                    if (usernameFromDOM) {
                        chrome.storage.local.set({ [platformUsernameKey]: usernameFromDOM });
                        platformUsername = usernameFromDOM;
                        platformUsernameLocal = usernameFromDOM;
                    }

                    items.projectName = projectFromDOM || items.projectName;
                    items.githubToken = tokenFromDOM || items.githubToken;
                    chrome.storage.local.set({
                        projectName: items.projectName,
                        githubToken: items.githubToken
                    });
                }
                projectName = items.projectName;

                userReason = 'No Blocker at the moment';
                chrome.storage.local.remove(['userReason']);
                githubToken = items.githubToken;
                yesterdayContribution = items.yesterdayContribution;
                if (typeof items.enableToggle !== 'undefined') {
                    enableToggle = items.enableToggle;
                }

                onlyIssues = items.onlyIssues === true;
                showCommits = items.showCommits || false;
                showOpenLabel = items.showOpenLabel !== false; // Default to true if not explicitly set to false
                orgName = items.orgName || '';

                if (items.yesterdayContribution) {
                    handleYesterdayContributionChange();
                } else if (items.startingDate && items.endingDate) {
                    startingDate = items.startingDate;
                    endingDate = items.endingDate;
                } else {


                    handleYesterdayContributionChange();


                    if (outputTarget === 'popup') {
                        chrome.storage.local.set({ yesterdayContribution: true });
                    }
                }

                if (platform === 'github') {
                    if (platformUsernameLocal) {

                        fetchGithubData();
                    } else {
                        if (outputTarget === 'popup') {
                            const scrumReport = document.getElementById('scrumReport');
                            const generateBtn = document.getElementById('generateReport');
                            if (scrumReport) {
                                scrumReport.innerHTML = '<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Please enter your username to generate a report.</div>';
                            }
                            if (generateBtn) {
                                generateBtn.innerHTML = '<i class=\"fa fa-refresh\"></i> Generate Report';
                                generateBtn.disabled = false;
                            }
                            scrumGenerationInProgress = false;
                        } else {
                            console.warn('[DEBUG] No username found in storage');
                            scrumGenerationInProgress = false;
                        }
                        return;
                    }
                } else if (platform === 'gitlab') {
                    if (!gitlabHelper) gitlabHelper = new window.GitLabHelper();
                    if (platformUsernameLocal) {
                        const generateBtn = document.getElementById('generateReport');
                        if (generateBtn && outputTarget === 'popup') {
                            generateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
                            generateBtn.disabled = true;
                        }

                        if (outputTarget === 'email') {
                            (async () => {
                                try {
                                    const data = await gitlabHelper.fetchGitLabData(platformUsernameLocal, startingDate, endingDate);


                                    function mapGitLabItem(item, projects, type) {
                                        const project = projects.find(p => p.id === item.project_id);
                                        const repoName = project ? project.name : 'unknown';

                                        return {
                                            ...item,
                                            repository_url: `https://gitlab.com/api/v4/projects/${item.project_id}`,
                                            html_url: type === 'issue'
                                                ? (item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : ''))
                                                : (item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : '')),
                                            number: item.iid,
                                            title: item.title,
                                            state: (type === 'issue' && item.state === 'opened') ? 'open' : item.state,
                                            project: repoName,
                                            pull_request: type === 'mr',
                                        };
                                    }
                                    const mappedIssues = (data.issues || []).map(issue => mapGitLabItem(issue, data.projects, 'issue'));
                                    const mappedMRs = (data.mergeRequests || data.mrs || []).map(mr => mapGitLabItem(mr, data.projects, 'mr'));
                                    const mappedData = {
                                        githubIssuesData: { items: mappedIssues },
                                        githubPrsReviewData: { items: mappedMRs },
                                        githubUserData: data.user || {},
                                    };
                                    githubUserData = mappedData.githubUserData;

                                    let name = githubUserData?.name || githubUserData?.username || platformUsernameLocal || platformUsername;
                                    let project = projectName;
                                    let curDate = new Date();
                                    let year = curDate.getFullYear().toString();
                                    let date = curDate.getDate();
                                    let month = curDate.getMonth() + 1;
                                    if (month < 10) month = '0' + month;
                                    if (date < 10) date = '0' + date;
                                    let dateCode = year.toString() + month.toString() + date.toString();
                                    const subject = `[Scrum]${project ? ' - ' + project : ''} - ${dateCode}`;
                                    subjectForEmail = subject;


                                    await processGithubData(mappedData, true, subjectForEmail);
                                    scrumGenerationInProgress = false;
                                } catch (err) {
                                    console.error('GitLab fetch failed:', err);
                                    if (outputTarget === 'popup') {
                                        if (generateBtn) {
                                            generateBtn.innerHTML = '<i class=\"fa fa-refresh\"></i> Generate Report';
                                            generateBtn.disabled = false;
                                        }
                                        const scrumReport = document.getElementById('scrumReport');
                                        if (scrumReport) {
                                            scrumReport.innerHTML = `<div class=\"error-message\" style=\"color: #dc2626; font-weight: bold; padding: 10px;\">${err.message || 'An error occurred while fetching GitLab data.'}</div>`;
                                        }
                                    }
                                    scrumGenerationInProgress = false;
                                }
                            })();
                        } else {

                            gitlabHelper.fetchGitLabData(platformUsernameLocal, startingDate, endingDate)
                                .then(data => {
                                    function mapGitLabItem(item, projects, type) {
                                        const project = projects.find(p => p.id === item.project_id);
                                        const repoName = project ? project.name : 'unknown';
                                        return {
                                            ...item,
                                            repository_url: `https://gitlab.com/api/v4/projects/${item.project_id}`,
                                            html_url: type === 'issue'
                                                ? (item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : ''))
                                                : (item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : '')),
                                            number: item.iid,
                                            title: item.title,
                                            state: (type === 'issue' && item.state === 'opened') ? 'open' : item.state,
                                            project: repoName,
                                            pull_request: type === 'mr',
                                        };
                                    }
                                    const mappedIssues = (data.issues || []).map(issue => mapGitLabItem(issue, data.projects, 'issue'));
                                    const mappedMRs = (data.mergeRequests || data.mrs || []).map(mr => mapGitLabItem(mr, data.projects, 'mr'));
                                    const mappedData = {
                                        githubIssuesData: { items: mappedIssues },
                                        githubPrsReviewData: { items: mappedMRs },
                                        githubUserData: data.user || {},
                                    };
                                    processGithubData(mappedData);
                                    scrumGenerationInProgress = false;
                                })
                                .catch(err => {
                                    console.error('GitLab fetch failed:', err);
                                    if (outputTarget === 'popup') {
                                        if (generateBtn) {
                                            generateBtn.innerHTML = '<i class=\"fa fa-refresh\"></i> Generate Report';
                                            generateBtn.disabled = false;
                                        }
                                        const scrumReport = document.getElementById('scrumReport');
                                        if (scrumReport) {
                                            scrumReport.innerHTML = `<div class=\"error-message\" style=\"color: #dc2626; font-weight: bold; padding: 10px;\">${err.message || 'An error occurred while fetching GitLab data.'}</div>`;
                                        }
                                    }
                                    scrumGenerationInProgress = false;
                                });
                        }
                        // --- FIX END ---
                    } else {
                        if (outputTarget === 'popup') {
                            const scrumReport = document.getElementById('scrumReport');
                            const generateBtn = document.getElementById('generateReport');
                            if (scrumReport) {
                                scrumReport.innerHTML = '<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Please enter your username to generate a report.</div>';
                            }
                            if (generateBtn) {
                                generateBtn.innerHTML = '<i class=\"fa fa-refresh\"></i> Generate Report';
                                generateBtn.disabled = false;
                            }
                        }
                        scrumGenerationInProgress = false;
                    }
                } else {
                    // Unknown platform
                    if (outputTarget === 'popup') {
                        const scrumReport = document.getElementById('scrumReport');
                        if (scrumReport) {
                            scrumReport.innerHTML = '<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Unknown platform selected.</div>';
                        }
                    }
                    scrumGenerationInProgress = false;
                }
            },
        );
    }
    getChromeData();



    function handleYesterdayContributionChange() {
        endingDate = getToday();
        startingDate = getYesterday();
    }

    function getYesterday() {
        let today = new Date();
        let yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
    function getToday() {
        let today = new Date();
        return today.toISOString().split('T')[0];
    }

    // Global cache object
    let githubCache = {
        data: null,
        cacheKey: null,
        timestamp: 0,
        ttl: 10 * 60 * 1000, // cache valid for 10 mins
        fetching: false,
        queue: [],
        errors: {},
        errorTTL: 60 * 1000, // 1 min error cache 
        subject: null,
        repoData: null,
        repoCacheKey: null,
        repoTimeStamp: 0,
        repoFetching: false,
        repoQueue: [],
    };

    async function getCacheTTL() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['cacheInput'], function (result) {
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
            usedToken: !!githubToken,
        }
       

        return new Promise((resolve) => {
            chrome.storage.local.set({ githubCache: cacheData }, () => {
                if (chrome.runtime.lastError) {
                    logError('Storage save failed: ', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    githubCache.data = data;
                    githubCache.subject = subject;
                    resolve(true);
                }
            });
        });
    }

    function loadFromStorage() {
        return new Promise(async (resolve) => {
            const currentTTL = await getCacheTTL();
            chrome.storage.local.get('githubCache', (result) => {
                const cache = result.githubCache;
                if (!cache) {
                    resolve(false);
                    return;
                }
                const isCacheExpired = (Date.now() - cache.timestamp) > currentTTL;
                if (isCacheExpired) {
                    resolve(false);
                    return;
                }
                

                githubCache.data = cache.data;
                githubCache.cacheKey = cache.cacheKey;
                githubCache.timestamp = cache.timestamp;
                githubCache.subject = cache.subject;
                githubCache.usedToken = cache.usedToken || false;

                if (cache.subject && scrumSubject) {
                    scrumSubject.value = cache.subject;
                    scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
                }
                resolve(true);
            });
        });
    }

    async function fetchGithubData() {
        // Always load latest repo filter settings from storage
        const filterSettings = await new Promise(resolve => {
            chrome.storage.local.get(['useRepoFilter', 'selectedRepos'], resolve);
        });
        useRepoFilter = filterSettings.useRepoFilter || false;
        selectedRepos = Array.isArray(filterSettings.selectedRepos) ? filterSettings.selectedRepos : [];

        // Get the correct date range for cache key
        let startDateForCache, endDateForCache;
        if (yesterdayContribution) {
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            startDateForCache = yesterday.toISOString().split('T')[0];
            endDateForCache = today.toISOString().split('T')[0]; // Use yesterday for start and today for end
        } else if (startingDate && endingDate) {
            startDateForCache = startingDate;
            endDateForCache = endingDate;
            // Validate date range - start must be before or equal to end
            if (new Date(startDateForCache) > new Date(endDateForCache)) {
                logError('Invalid date range: start date is after end date. Swapping dates.');
                const temp = startDateForCache;
                startDateForCache = endDateForCache;
                endDateForCache = temp;
            }
        } else {
            // Default to last 7 days if no date range is set
            const today = new Date();
            const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
            startDateForCache = lastWeek.toISOString().split('T')[0];
            endDateForCache = today.toISOString().split('T')[0];
        }
        
        // Validate username is not empty
        if (!platformUsernameLocal || platformUsernameLocal.trim() === '') {
            const errorMsg = 'GitHub username is required. Please enter your username.';
            logError(errorMsg);
            if (outputTarget === 'popup') {
                const reportDiv = document.getElementById('scrumReport');
                if (reportDiv) {
                    reportDiv.innerHTML = `<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">${errorMsg}</div>`;
                }
            }
            throw new Error(errorMsg);
        }

        const cacheKey = `${platformUsernameLocal}-${startDateForCache}-${endDateForCache}-${orgName || 'all'}`;

        if (githubCache.fetching || (githubCache.cacheKey === cacheKey && githubCache.data)) {
            return;
        }

     ;

        // Check if we need to load from storage
        if (!githubCache.data && !githubCache.fetching) {
            await loadFromStorage();
        };

        const currentTTL = await getCacheTTL();
        githubCache.ttl = currentTTL;

        const now = Date.now();
        const isCacheFresh = (now - githubCache.timestamp) < githubCache.ttl;
        const isCacheKeyMatch = githubCache.cacheKey === cacheKey;
        const needsToken = !!githubToken;
        const cacheUsedToken = !!githubCache.usedToken;

        if (githubCache.data && isCacheFresh && isCacheKeyMatch) {
            if (needsToken && !cacheUsedToken) {
                githubCache.data = null;
            } else {
                processGithubData(githubCache.data);
                return Promise.resolve();
            }
        }
        // if cache key does not match our cache is stale, fetch new data
        if (!isCacheKeyMatch) {
            githubCache.data = null;
        } else if (!isCacheFresh) {
        }

        // if fetching is in progress, queue the calls and return a promise resolved when done
        if (githubCache.fetching) {
            return new Promise((resolve, reject) => {
                githubCache.queue.push({ resolve, reject });
            });
        }

        githubCache.fetching = true;
        githubCache.cacheKey = cacheKey;
        githubCache.usedToken = !!githubToken;

        const headers = {
            'Accept': 'application/vnd.github.v3+json',
        };

        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        } else {
           // if (DEBUG) console.log('Making public requests');
        }

        let orgPart = orgName && orgName.trim() ? `+org%3A${orgName}` : '';

        let issueUrl, prUrl, userUrl;

        if (useRepoFilter && selectedRepos && selectedRepos.length > 0) {

            try {
                await fetchReposIfNeeded();
            } catch (err) {
                logError('Failed to fetch repo data for filtering:', err);
            }

            const repoQueries = selectedRepos
                .filter(repo => repo !== null)
                .map(repo => {
                    if (typeof repo === 'object' && repo.fullName) {
                        // FIXED: Remove leading slash if present
                        const cleanName = repo.fullName.startsWith('/') ? repo.fullName.substring(1) : repo.fullName;
                        return `repo:${cleanName}`;
                    } else if (repo.includes('/')) {
                        // FIXED: Remove leading slash if present
                        const cleanName = repo.startsWith('/') ? repo.substring(1) : repo;
                        return `repo:${cleanName}`;
                    } else {
                        const fullRepoInfo = githubCache.repoData?.find(r => r.name === repo);
                        if (fullRepoInfo && fullRepoInfo.fullName) {
                            return `repo:${fullRepoInfo.fullName}`;
                        }
                        logError(`Missing owner for repo ${repo} - search may fail`);
                        return `repo:${repo}`;
                    }
                }).join('+');

            // Validate repo queries are not empty
            if (!repoQueries || repoQueries.trim() === '') {
                logError('Repository filter is enabled but no valid repositories found');
                throw new Error('Repository filter is enabled but no valid repositories selected. Please check your repository filter settings.');
            }
            
            const orgQuery = orgPart ? `+${orgPart}` : '';
            const encodedUsername = encodeURIComponent(platformUsernameLocal);
            // GitHub API requires 'is:issue' or 'is:pull-request' in the query
            // We need both issues and PRs, so we make separate queries and combine results
            const authorBaseQuery = `author%3A${encodedUsername}+${repoQueries}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}`;
            const commenterBaseQuery = `commenter%3A${encodedUsername}+${repoQueries}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}`;
            // Store URLs for both issues and PRs - we'll fetch all 4 and combine
            issueUrl = `https://api.github.com/search/issues?q=${authorBaseQuery}+is%3Aissue&per_page=100`;
            const prAuthorUrl = `https://api.github.com/search/issues?q=${authorBaseQuery}+is%3Apr&per_page=100`;
            prUrl = `https://api.github.com/search/issues?q=${commenterBaseQuery}+is%3Aissue&per_page=100`;
            const prCommenterUrl = `https://api.github.com/search/issues?q=${commenterBaseQuery}+is%3Apr&per_page=100`;
            userUrl = `https://api.github.com/users/${encodedUsername}`;
        } else {
            loadFromStorage('Using org wide search');
            const orgQuery = orgPart ? `+${orgPart}` : '';
            const encodedUsername = encodeURIComponent(platformUsernameLocal);
            // GitHub API requires 'is:issue' or 'is:pull-request' in the query
            // Make separate queries for issues and PRs, then combine
            const authorBaseQuery = `author%3A${encodedUsername}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}`;
            const commenterBaseQuery = `commenter%3A${encodedUsername}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}`;
            issueUrl = `https://api.github.com/search/issues?q=${authorBaseQuery}+is%3Aissue&per_page=100`;
            const prAuthorUrl = `https://api.github.com/search/issues?q=${authorBaseQuery}+is%3Apr&per_page=100`;
            prUrl = `https://api.github.com/search/issues?q=${commenterBaseQuery}+is%3Aissue&per_page=100`;
            const prCommenterUrl = `https://api.github.com/search/issues?q=${commenterBaseQuery}+is%3Apr&per_page=100`;
            userUrl = `https://api.github.com/users/${encodedUsername}`;
        }
        
        // Log the URLs for debugging

        try {
            // throttling 500ms to avoid burst
            await new Promise(res => setTimeout(res, 500));

            // Build PR URLs from issue URLs by replacing is:issue with is:pr
            const prAuthorUrl = issueUrl.replace('+is%3Aissue', '+is%3Apr');
            const prCommenterUrl = prUrl.replace('+is%3Aissue', '+is%3Apr');
            
            // Fetch all 4 queries: issues authored, PRs authored, issues commented, PRs commented
            const [issuesAuthRes, prsAuthRes, issuesCommentRes, prsCommentRes, userRes] = await Promise.all([
                fetch(issueUrl, { headers }),
                fetch(prAuthorUrl, { headers }),
                fetch(prUrl, { headers }),
                fetch(prCommenterUrl, { headers }),
                fetch(userUrl, { headers }),
            ]);

            // Check for auth errors
            if (issuesAuthRes.status === 401 || prsAuthRes.status === 401 || issuesCommentRes.status === 401 || 
                prsCommentRes.status === 401 || userRes.status === 401 ||
                issuesAuthRes.status === 403 || prsAuthRes.status === 403 || issuesCommentRes.status === 403 || 
                prsCommentRes.status === 403 || userRes.status === 403) {
                showInvalidTokenMessage();
                return;
            }

            if (issuesAuthRes.status === 404 || prsAuthRes.status === 404 || issuesCommentRes.status === 404 || prsCommentRes.status === 404) {
                if (outputTarget === 'popup') {
                    Materialize.toast && Materialize.toast('Organization not found on GitHub', 3000);
                }
                throw new Error('Organization not found');
            }

            // Handle errors and combine results
            let issuesAuthData = { items: [] };
            let prsAuthData = { items: [] };
            let issuesCommentData = { items: [] };
            let prsCommentData = { items: [] };

            if (!issuesAuthRes.ok) {
                const errorBody = await issuesAuthRes.text();
                let errorMsg = `Error fetching Github issues (auth): ${issuesAuthRes.status} ${issuesAuthRes.statusText}`;
                try {
                    const errorJson = JSON.parse(errorBody);
                    if (errorJson.message) errorMsg += ` - ${errorJson.message}`;
                } catch (e) {
                    errorMsg += ` - ${errorBody}`;
                }
                logError('GitHub API Error:', { status: issuesAuthRes.status, url: issueUrl, error: errorMsg });
            } else {
                issuesAuthData = await issuesAuthRes.json();
            }

            if (!prsAuthRes.ok) {
                logError('Error fetching PRs (auth):', prsAuthRes.status, prsAuthRes.statusText);
            } else {
                prsAuthData = await prsAuthRes.json();
            }

            if (!issuesCommentRes.ok) {
                logError('Error fetching issues (commenter):', issuesCommentRes.status, issuesCommentRes.statusText);
            } else {
                issuesCommentData = await issuesCommentRes.json();
            }

            if (!prsCommentRes.ok) {
                const errorBody = await prsCommentRes.text();
                let errorMsg = `Error fetching Github PR review data: ${prsCommentRes.status} ${prsCommentRes.statusText}`;
                try {
                    const errorJson = JSON.parse(errorBody);
                    if (errorJson.message) errorMsg += ` - ${errorJson.message}`;
                } catch (e) {
                    errorMsg += ` - ${errorBody}`;
                }
                logError('GitHub API Error:', { status: prsCommentRes.status, url: prCommenterUrl, error: errorMsg });
            } else {
                prsCommentData = await prsCommentRes.json();
            }

            if (!userRes.ok) throw new Error(`Error fetching Github userdata: ${userRes.status} ${userRes.statusText}`);

            // Combine issues and PRs from author search
            const combinedAuthItems = [...(issuesAuthData.items || []), ...(prsAuthData.items || [])];
            // Combine issues and PRs from commenter search  
            const combinedCommentItems = [...(issuesCommentData.items || []), ...(prsCommentData.items || [])];

            githubIssuesData = { items: combinedAuthItems, total_count: combinedAuthItems.length };
            githubPrsReviewData = { items: combinedCommentItems, total_count: combinedCommentItems.length };
            githubUserData = await userRes.json();

            if (githubIssuesData && githubIssuesData.items) {
                // Collect only open PRs for commit fetching
                const openPRs = githubIssuesData.items.filter(
                    item => item.pull_request && item.state === 'open'
                );
                // Fetch commits for open PRs (batch) if showCommits is enabled
                if (openPRs.length && githubToken && showCommits) {
                // Get the correct date range for commit fetching
                let startDateForCommits, endDateForCommits;
                if (yesterdayContribution) {
                    const today = new Date();
                    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                    startDateForCommits = yesterday.toISOString().split('T')[0];
                    endDateForCommits = yesterday.toISOString().split('T')[0]; // Use yesterday for start and end
                } else if (startingDate && endingDate) {
                    startDateForCommits = startingDate;
                    endDateForCommits = endingDate;
                } else {
                    // Default to last 7 days if no date range is set
                    const today = new Date();
                    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                    startDateForCommits = lastWeek.toISOString().split('T')[0];
                    endDateForCommits = today.toISOString().split('T')[0];
                }

                    const commitMap = await fetchCommitsForOpenPRs(openPRs, githubToken, startDateForCommits, endDateForCommits);
                    // Attach commits to PR objects
                    openPRs.forEach(pr => {
                        pr._allCommits = commitMap[pr.number] || [];
                        if (pr._allCommits.length > 0) {
                         //   if (DEBUG) console.log(`Commits for PR #${pr.number}:`, pr._allCommits.map(c => `${c.messageHeadline} (${c.committedDate})`));
                        }
                    });
                }
            }

            // Cache the data
            githubCache.data = { githubIssuesData, githubPrsReviewData, githubUserData };
            githubCache.timestamp = Date.now();

            await saveToStorage(githubCache.data);
            processGithubData(githubCache.data);

            githubCache.queue.forEach(({ resolve }) => resolve());
            githubCache.queue = [];
        } catch (err) {
            logError('Fetch Failed:', err);
            // Reject queued calls on error
            githubCache.queue.forEach(({ reject }) => reject(err));
            githubCache.queue = [];
            githubCache.fetching = false;

            if (outputTarget === 'popup') {
                const generateBtn = document.getElementById('generateReport');
                if (scrumReport) {
                    let errorMsg = 'An error occurred while generating the report.';
                    if (err) {
                        if (typeof err === 'string') errorMsg = err;
                        else if (err.message) errorMsg = err.message;
                        else errorMsg = JSON.stringify(err)
                    }
                    scrumReport.innerHTML = `<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">${err.message || 'An error occurred while generating the report.'}</div>`;
                    generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                    generateBtn.disabled = false;
                }
                if (generateBtn) {
                    generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                    generateBtn.disabled = false;
                }
            }
            scrumGenerationInProgress = false;
            throw err;
        } finally {
            githubCache.fetching = false;
        }
    }

    async function fetchCommitsForOpenPRs(prs, githubToken, startDate, endDate) {
        if (!prs.length) return {};
        const since = new Date(startDate + 'T00:00:00Z').toISOString();
        const until = new Date(endDate + 'T23:59:59Z').toISOString();
        let queries = prs.map((pr, idx) => {
            const repoParts = pr.repository_url.split('/');
            const owner = repoParts[repoParts.length - 2];
            const repo = repoParts[repoParts.length - 1];
            return `
			pr${idx}: repository(owner: "${owner}", name: "${repo}") {
				pullRequest(number: ${pr.number}) {
					commits(first: 100) {
						nodes {
							commit {
								messageHeadline
								committedDate
								url
								author {
									name
									user { login }
								}
							}
						}
					}
				}

			}`;
        }).join('\n');
        const query = `query { ${queries} }`;
        const res = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(githubToken ? { Authorization: `bearer ${githubToken}` } : {})
            },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        let commitMap = {};
        prs.forEach((pr, idx) => {
            const prData = data.data && data.data[`pr${idx}`] && data.data[`pr${idx}`].pullRequest;
            if (prData && prData.commits && prData.commits.nodes) {
                const allCommits = prData.commits.nodes.map(n => n.commit);
                const filteredCommits = allCommits.filter(commit => {
                    const commitDate = new Date(commit.committedDate);
                    const sinceDate = new Date(since);
                    const untilDate = new Date(until);
                    const isInRange = commitDate >= sinceDate && commitDate <= untilDate;
                    return isInRange;
                });
                commitMap[pr.number] = filteredCommits;
            } else {
      //          console.log(`No commits found for PR #${pr.number}`);
            }
        });
        return commitMap;
    }

    async function fetchReposIfNeeded() {
        if (!useRepoFilter) {
            return [];
        }
        const repoCacheKey = `repos-${platformUsernameLocal}-${orgName}-${startDateForCache}-${endDateForCache}`;

        const now = Date.now();
        const isRepoCacheFresh = (now - githubCache.repoTimeStamp) < githubCache.ttl;
        const isRepoCacheKeyMatch = githubCache.repoCacheKey === repoCacheKey;

        if (githubCache.repoData && isRepoCacheFresh && isRepoCacheKeyMatch) {
            return githubCache.repoData;
        }

        if (githubCache.repoFetching) {
            return new Promise((resolve, reject) => {
                githubCache.repoQueue.push({ resolve, reject });
            });
        }

        githubCache.repoFetching = true;
        githubCache.repoCacheKey = repoCacheKey;

        try {
            const repos = await fetchUserRepositories(platformUsernameLocal, githubToken, orgName);

            githubCache.repoData = repos;
            githubCache.repoTimeStamp = now;

            chrome.storage.local.set({
                repoCache: {
                    data: repos,
                    cacheKey: repoCacheKey,
                    timestamp: now
                }
            });

            githubCache.repoQueue.forEach(({ resolve }) => resolve(repos));
            githubCache.repoQueue = [];

            return repos;
        } catch (err) {
            logError('Failed to fetch reppos:', err);
            githubCache.repoQueue.forEach(({ reject }) => reject(err));
            githubCache.repoQueue = [];

            throw err;
        } finally {
            githubCache.repoFetching = false;
        }
    }

    async function verifyCacheStatus() {
        const storageData = await new Promise(resolve => {
            chrome.storage.local.get('githubCache', resolve);
        });
    }
    verifyCacheStatus();

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
            } else {
                alert('Invalid or expired GitHub token. Please check your token in the extension popup and try again.');
            }
        }
    }


    async function processGithubData(data) {

        let filteredData = data;
        // Always apply repo filter if it's enabled and repos are selected.
        if (useRepoFilter && selectedRepos && selectedRepos.length > 0) {
            filteredData = filterDataByRepos(data, selectedRepos);
        }

        // Store mergedPrOnly setting for later use in processing functions
        // We'll filter after merged status is determined, not here, because
        // GitHub Search API may not include pull_request.merged_at in search results
        const mergedPrSettings = await new Promise((resolve) => {
            chrome.storage.sync.get(["mergedPrOnly"], resolve);
        });
        const mergedPrOnly = Boolean(githubToken && mergedPrSettings.mergedPrOnly === true);
        // Store in a way that processing functions can access it
        window._mergedPrOnlyFilter = mergedPrOnly;
     

        githubIssuesData = filteredData.githubIssuesData;
        githubPrsReviewData = filteredData.githubPrsReviewData;
        githubUserData = filteredData.githubUserData;

       

        lastWeekArray = [];
        nextWeekArray = [];
        reviewedPrsArray = [];
        githubPrsReviewDataProcessed = {};
        issuesDataProcessed = false;
        prsReviewDataProcessed = false;
        if (!githubCache.subject && scrumSubject) {
            scrumSubjectLoaded();
        }
        if (platform === 'github') {
            await writeGithubIssuesPrs(githubIssuesData?.items || []);
        } else if (platform === 'gitlab') {
            await writeGithubIssuesPrs(githubIssuesData?.items || []);
            await writeGithubIssuesPrs(githubPrsReviewData?.items || []);
        }
        await writeGithubPrsReviews();
        if (subjectForEmail) {
            // Synchronized subject and body injection for email
            let lastWeekUl = '<ul>';
            for (let i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
            for (let i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
            lastWeekUl += '</ul>';
            let nextWeekUl = '<ul>';
            for (let i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
            nextWeekUl += '</ul>';
            let weekOrDay = yesterdayContribution ? 'yesterday' : 'the period';
            let weekOrDay2 = 'today';
            let content;
            if (yesterdayContribution == true) {
                content = `<b>1. What did I do ${weekOrDay}?</b><br>${lastWeekUl}<br><b>2. What do I plan to do ${weekOrDay2}?</b><br>${nextWeekUl}<br><b>3. What is blocking me from making progress?</b><br>${userReason}`;
            } else {
                content = `<b>1. What did I do from ${formatDate(startingDate)} to ${formatDate(endingDate)}?</b><br>${lastWeekUl}<br><b>2. What do I plan to do ${weekOrDay2}?</b><br>${nextWeekUl}<br><b>3. What is blocking me from making progress?</b><br>${userReason}`;
            }
            // Wait for both subject and body to be available, then inject both
            let injected = false;
            let interval = setInterval(() => {
                const elements = window.emailClientAdapter?.getEditorElements();
                if (elements && elements.subject && elements.body && !injected) {
                    elements.subject.value = subjectForEmail;
                    elements.subject.dispatchEvent(new Event('input', { bubbles: true }));
                    window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
                    injected = true;
                    clearInterval(interval);
                }
            }, 200);
            setTimeout(() => {
                if (!injected) clearInterval(interval);
            }, 30000);
        } else {
            writeScrumBody();
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function writeScrumBody() {
        if (!enableToggle) {
            scrumGenerationInProgress = false;
            return;
        }

        let lastWeekUl = '<ul>';
        for (let i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
        for (let i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
        lastWeekUl += '</ul>';

        let nextWeekUl = '<ul>';
        for (let i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
        nextWeekUl += '</ul>';

        let weekOrDay = yesterdayContribution ? 'yesterday' : 'the period';
        let weekOrDay2 = 'today';

        let content;
        if (yesterdayContribution == true) {
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

        if (outputTarget === 'popup') {
            const scrumReport = document.getElementById('scrumReport');
            if (scrumReport) {
                scrumReport.innerHTML = content;

                const generateBtn = document.getElementById('generateReport');
                if (generateBtn) {
                    generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                    generateBtn.disabled = false;
                }
            } else {
                logError('Scrum report div not found in popup');
            }
            scrumGenerationInProgress = false;
        } else if (outputTarget === 'email') {
            if (hasInjectedContent) {
                scrumGenerationInProgress = false;
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                if (!window.emailClientAdapter) {
                    obs.disconnect();
                    return;
                }
                if (window.emailClientAdapter.isNewConversation()) {
                    const elements = window.emailClientAdapter.getEditorElements();
                    if (elements && elements.body) {
                        obs.disconnect();
                        window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
                        hasInjectedContent = true;
                        scrumGenerationInProgress = false;
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                if (!hasInjectedContent && scrumGenerationInProgress) {
                    logError('Injection timed out after 30 seconds. The compose window might not have loaded.');
                    scrumGenerationInProgress = false;
                }
            }, 30000);
        }
    }

    //load initial scrum subject
    function scrumSubjectLoaded() {
        try {
            if (!enableToggle) return;
            if (!scrumSubject) {
                console.error('Subject element not found');
                return;
            }
            setTimeout(() => {
                let name = githubUserData?.name || githubUserData?.username || platformUsernameLocal || platformUsername;
                let project = projectName;
                let curDate = new Date();
                let year = curDate.getFullYear().toString();
                let date = curDate.getDate();
                let month = curDate.getMonth();
                month++;
                if (month < 10) month = '0' + month;
                if (date < 10) date = '0' + date;
                let dateCode = year.toString() + month.toString() + date.toString();

                const subject = `[Scrum]${project ? ' - ' + project : ''} - ${dateCode}`;
                githubCache.subject = subject;
                saveToStorage(githubCache.data, subject);

                if (scrumSubject && scrumSubject.value !== subject) {
                    scrumSubject.value = subject;
                    scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        } catch (err) {
            console.error('Error while setting subject: ', err);
        }
    }

async function writeGithubPrsReviews() {
    if(onlyIssues){
        log(' "Only Issues" is checked, skipping PR reviews.')
        reviewedPrsArray = [];
        prsReviewDataProcessed = true;
        return;
    }
    let items = githubPrsReviewData.items;
    if (!items) {
        logError('No Github PR review data available');
        return;
    }

    reviewedPrsArray = [];
    githubPrsReviewDataProcessed = {};
    let i;

    // Get the date range for filtering
    let startDate, endDate;
    if (yesterdayContribution) {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0]; // Use yesterday for start and today for end
    } else if (startingDate && endingDate) {
        startDate = startingDate;
        endDate = endingDate;
    } else {
        // Default to last 7 days if no date range is set
        const today = new Date();
        const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    }

    const startDateTime = new Date(startDate + 'T00:00:00Z');
    const endDateTime = new Date(endDate + 'T23:59:59Z');


    // Apply merged PR filter - use same logic as writeGithubIssuesPrs
    const mergedPrOnly = window._mergedPrOnlyFilter === true;

    if (mergedPrOnly) {
        const originalLength = items.length;
        items = items.filter(item => item.pull_request && item.merged_at);
    }

    for (i = 0; i < items.length; i++) {
        let item = items[i];

        // For GitHub: item.user.login, for GitLab: item.author?.username
        let isAuthoredByUser = false;
        if (platform === 'github') {
            isAuthoredByUser = item.user && item.user.login === platformUsernameLocal;
        } else if (platform === 'gitlab') {
            isAuthoredByUser = item.author && (item.author.username === platformUsername);
        }

        if (isAuthoredByUser || !item.pull_request) continue;

        // Check if the PR was actually reviewed/commented on within the date range
        let itemDate = new Date(item.updated_at || item.created_at);
        if (itemDate < startDateTime || itemDate > endDateTime) {
            continue;
        }

        // Additional check: Skip PRs that were merged before the date range
        if (item.state === 'closed' && item.pull_request && item.pull_request.merged_at) {
            const mergedDate = new Date(item.pull_request.merged_at);
            if (mergedDate < startDateTime) {
                continue;
            }
        }

        // For closed PRs, ensure they were merged within the date range
        if (item.state === 'closed' && item.pull_request) {
            if (!item.pull_request.merged_at) {
                continue;
            }
            const mergedDate = new Date(item.pull_request.merged_at);
            if (mergedDate < startDateTime || mergedDate > endDateTime) {
                continue;
            }
        }

        // Additional conservative check: For PRs that were created before the date range,
        // only include them if they were updated very recently (within the last day of the range)
        const createdDate = new Date(item.created_at);
        if (createdDate < startDateTime) {
            // If PR was created before the date range, only include if it was updated in the last day
            const lastDayOfRange = new Date(endDateTime);
            lastDayOfRange.setDate(lastDayOfRange.getDate() - 1);
            if (itemDate < lastDayOfRange) {
                continue;
            }
        }

        // Extra conservative check: For "yesterday" filter, be very strict
        if (yesterdayContribution) {
            // For yesterday filter, only include PRs that were either:
            // 1. Created yesterday, OR
            // 2. Updated yesterday AND the user actually commented yesterday
            const yesterday = new Date(startDate + 'T00:00:00Z');
            const today = new Date(endDate + 'T23:59:59Z');

            const wasCreatedYesterday = createdDate >= yesterday && createdDate <= today;
            const wasUpdatedYesterday = itemDate >= yesterday && itemDate <= today;

            if (!wasCreatedYesterday && !wasUpdatedYesterday) {
                continue;
            }

            // For yesterday filter, be extra strict about merged PRs
            if (item.state === 'closed' && item.pull_request && item.pull_request.merged_at) {
                const mergedDate = new Date(item.pull_request.merged_at);
                const wasMergedYesterday = mergedDate >= yesterday && mergedDate <= today;
                if (!wasMergedYesterday) {
                    continue;
                }
            }
        }

        let repository_url = item.repository_url;
        if (!repository_url) {
            logError('repository_url is undefined for item:', item);
            continue;
        }
        let project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
        let title = item.title;
        let number = item.number;
        let html_url = item.html_url;
        if (!githubPrsReviewDataProcessed[project]) {
            // first pr in this repo
            githubPrsReviewDataProcessed[project] = [];
        }
        let obj = {
            number: number,
            html_url: html_url,
            title: title,
            state: item.state,
        };
        githubPrsReviewDataProcessed[project].push(obj);
    }
    for (let repo in githubPrsReviewDataProcessed) {
        let repoLi =
            '<li> <i>(' +
            repo +
            ')</i> - Reviewed ';
        if (githubPrsReviewDataProcessed[repo].length > 1) repoLi += 'PRs - ';
        else {
            repoLi += 'PR - ';
        }
        if (githubPrsReviewDataProcessed[repo].length <= 1) {
            for (let pr in githubPrsReviewDataProcessed[repo]) {
                let pr_arr = githubPrsReviewDataProcessed[repo][pr];
                let prText = '';
                prText +=
                    "<a href='" + pr_arr.html_url + "' target='_blank' rel='noopener noreferrer'>#" + pr_arr.number + '</a> (' + pr_arr.title + ') ';
                if (showOpenLabel && pr_arr.state === 'open') prText += issue_opened_button;
                // Do not show closed label for reviewed PRs
                prText += '&nbsp;&nbsp;';
                repoLi += prText;
            }
        } else {
            repoLi += '<ul>';
            for (let pr1 in githubPrsReviewDataProcessed[repo]) {
                let pr_arr1 = githubPrsReviewDataProcessed[repo][pr1];
                let prText1 = '';
                prText1 +=
                    "<li><a href='" +
                    pr_arr1.html_url +
                    "' target='_blank' rel='noopener noreferrer'>#" +
                    pr_arr1.number +
                    '</a> (' +
                    pr_arr1.title +
                    ') ';
                if (showOpenLabel && pr_arr1.state === 'open') prText1 += issue_opened_button;
                // Do not show closed label for reviewed PRs
                prText1 += '&nbsp;&nbsp;</li>';
                repoLi += prText1;
            }
            repoLi += '</ul>';
        }
        repoLi += '</li>';
        reviewedPrsArray.push(repoLi);
    }
    prsReviewDataProcessed = true;
}

    function triggerScrumGeneration() {
        if (issuesDataProcessed && prsReviewDataProcessed) {


            writeScrumBody();
        } else {


        }
    }

    function getDaysBetween(start, end) {
        const d1 = new Date(start);
        const d2 = new Date(end);
        return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    }

    let sessionMergedStatusCache = {};

    async function fetchPrMergedStatusREST(owner, repo, number, headers) {
        const cacheKey = `${owner}/${repo}#${number}`;
        if (sessionMergedStatusCache[cacheKey] !== undefined) {
            return sessionMergedStatusCache[cacheKey];
        }
        const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
        try {
            const res = await fetch(url, { headers });
            if (!res.ok) return null;
            const data = await res.json();
            const merged = !!data.merged_at;
            sessionMergedStatusCache[cacheKey] = merged;
            return merged;
        } catch (e) {
            return null;
        }
    }

    /**
     * Filters pull requests to show only merged ones when mergedOnly is true.
     * This function is called at the earliest safe point after data is retrieved
     * but before processing, ensuring PRs are still structured objects.
     * 
     * @param {Array} items - Array of issues/PRs from GitHub API
     * @param {boolean} mergedOnly - If true, filter to show only merged PRs
     * @returns {Array} Filtered array of items
     */
    function filterMergedPullRequests(items, mergedOnly) {
        if (!mergedOnly || !items) return items;

        return items.filter(item => {
            // Keep all non-PRs (issues) - they don't have pull_request property
            if (!item.pull_request) {
                return true;
            }
            
            // For PRs, check if they are merged
            // GitHub Search API may include pull_request.merged_at if the PR is merged
            // If merged_at exists and is not null, the PR is merged
            const mergedAt = item.pull_request?.merged_at;
            return mergedAt !== null && mergedAt !== undefined;
        });
    }

    async function writeGithubIssuesPrs(items) {

        if (!items) {

            return;
        }
        if (!items.length) {

            return;
        }

        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;
        let useMergedStatus = false;
        let fallbackToSimple = false;

        // Get the correct date range for days calculation
        let startDateForRange, endDateForRange;
        if (yesterdayContribution) {
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            startDateForRange = yesterday.toISOString().split('T')[0];
            endDateForRange = today.toISOString().split('T')[0]; // Use yesterday for start and today for end
        } else if (startingDate && endingDate) {
            startDateForRange = startingDate;
            endDateForRange = endingDate;
        } else {
            // Default to last 7 days if no date range is set
            const today = new Date();
            const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
            startDateForRange = lastWeek.toISOString().split('T')[0];
            endDateForRange = today.toISOString().split('T')[0];
        }

        let daysRange = getDaysBetween(startDateForRange, endDateForRange);

        if (githubToken) {
            useMergedStatus = true;
        } else if (daysRange <= 7) {
            useMergedStatus = true;
        }

        // Check if merged PR filter is enabled - if so, we need to check ALL closed PRs
        const mergedPrOnly = window._mergedPrOnlyFilter === true;
        
        let prsToCheck = [];
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            // If merged filter is enabled, check ALL closed PRs (not just when useMergedStatus is true)
            // Otherwise, only check when useMergedStatus is enabled
            const shouldCheck = mergedPrOnly 
                ? (item.pull_request && item.state === 'closed')
                : (item.pull_request && item.state === 'closed' && useMergedStatus && !fallbackToSimple);
                
            if (shouldCheck) {
                let repository_url = item.repository_url;
                if (!repository_url) {
                    logError('repository_url is undefined for item:', item);
                    continue;
                }
                let repoParts = repository_url.split('/');
                let owner = repoParts[repoParts.length - 2];
                let repo = repoParts[repoParts.length - 1];
                prsToCheck.push({ owner, repo, number: item.number, idx: i });
            }
        }

        let mergedStatusResults = {};
        // If merged filter is enabled, we MUST check merged status for all closed PRs
        // Otherwise, only check if useMergedStatus is enabled
        const needsMergedStatus = mergedPrOnly || (useMergedStatus && !fallbackToSimple);
        
        if (needsMergedStatus && prsToCheck.length > 0) {
            if (githubToken) {
                // Use GraphQL batching for all cases when we have a token
                mergedStatusResults = await fetchPrsMergedStatusBatch(prsToCheck, headers);
            } else {
                // Without token, use REST API but warn if too many
                if (prsToCheck.length > 30) {
                    if (!mergedPrOnly) {
                        fallbackToSimple = true;
                        if (typeof Materialize !== 'undefined' && Materialize.toast) {
                            Materialize.toast('API limit exceeded. Please use a GitHub token for full status. Showing only open/closed PRs.', 5000);
                        }
                    } else {
                        // If merged filter is enabled, we MUST check status - warn user
                        if (typeof Materialize !== 'undefined' && Materialize.toast) {
                            Materialize.toast('Many PRs to check. A GitHub token is recommended for accurate merged PR filtering.', 5000);
                        }
                        // Still try to check, but limit to 30
                        const limitedPRs = prsToCheck.slice(0, 30);
                        for (let pr of limitedPRs) {
                            let merged = await fetchPrMergedStatusREST(pr.owner, pr.repo, pr.number, headers);
                            mergedStatusResults[`${pr.owner}/${pr.repo}#${pr.number}`] = merged;
                        }
                    }
                } else {
                    // Use REST API for each PR, cache results
                    for (let pr of prsToCheck) {
                        let merged = await fetchPrMergedStatusREST(pr.owner, pr.repo, pr.number, headers);
                        mergedStatusResults[`${pr.owner}/${pr.repo}#${pr.number}`] = merged;
                    }
                }
            }
        }

        // Apply merged PR filter AFTER merged status is determined
        // This is the earliest safe point where we can reliably determine if a PR is merged
        if (mergedPrOnly) {
            items = items.filter(item => {
                if (!item.pull_request) return true;

                // Check merged status from API results first
                let merged = null;
                if (mergedStatusResults) {
                    let repoParts = item.repository_url.split('/');
                    let owner = repoParts[repoParts.length - 2];
                    let repo = repoParts[repoParts.length - 1];
                    merged = mergedStatusResults[`${owner}/${repo}#${item.number}`];
                }

                // If we have a definitive answer from API, use it
                if (merged === true) return true;
                if (merged === false) return false;

                // Fallback: check if merged_at exists in the item data
                if (item.pull_request.merged_at !== null && item.pull_request.merged_at !== undefined) {
                    return true;
                }

                // If we can't determine merged status, exclude to be safe
                return false;
            });
        }

        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            // For GitLab, treat all items in the MRs array as MRs
            let isMR = !!item.pull_request; // works for both GitHub and mapped GitLab data
            let html_url = item.html_url;
            let repository_url = item.repository_url;
            // Use project name for GitLab, repo extraction for GitHub
            let project = (platform === 'gitlab' && item.project) ? item.project : (repository_url ? repository_url.substr(repository_url.lastIndexOf('/') + 1) : '');
            let title = item.title;
            let number = item.number;
            let li = '';

            let isDraft = false;
            if (isMR && typeof item.draft !== 'undefined') {
                isDraft = item.draft;
            }

            if (isMR) {
                // Platform-specific label
                let prAction = '';

                const prCreatedDate = new Date(item.created_at);

                // Get the correct date range for filtering
                let startDateFilter, endDateFilter;
                if (yesterdayContribution) {
                    const today = new Date();
                    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                    startDateFilter = new Date(yesterday.toISOString().split('T')[0] + 'T00:00:00Z');
                    endDateFilter = new Date(today.toISOString().split('T')[0] + 'T23:59:59Z'); // Use yesterday for start and today for end
                } else if (startingDate && endingDate) {
                    startDateFilter = new Date(startingDate + 'T00:00:00Z');
                    endDateFilter = new Date(endingDate + 'T23:59:59Z');
                } else {
                    // Default to last 7 days if no date range is set
                    const today = new Date();
                    const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                    startDateFilter = new Date(lastWeek.toISOString().split('T')[0] + 'T00:00:00Z');
                    endDateFilter = new Date(today.toISOString().split('T')[0] + 'T23:59:59Z');
                }
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const itemCreatedDate = new Date(item.created_at);
                itemCreatedDate.setHours(0,0,0,0);
                const isCreatedToday = today.getTime() === itemCreatedDate.getTime();

                const isNewPR = prCreatedDate >= startDateFilter && prCreatedDate << endDateFilter;
                const prUpdatedDate = new Date(item.updated_at);
                const isUpdatedInRange = prUpdatedDate >= startDateFilter && prUpdatedDate <= endDateFilter;

                // Check if PR has commits in the date range
                const hasCommitsInRange = item._allCommits && item._allCommits.length > 0;


                if (platform === 'github') {
                    // For existing PRs (not new), they must be open AND have commits in the date range
                    if (!isNewPR) {
                        if (item.state !== 'open') {
                            continue;
                        }
                        if (!hasCommitsInRange) {
                            continue;
                        }
                    }
                    prAction = isNewPR ? 'Made PR' : 'Updated PR';
                    if (isCreatedToday && item.State === 'open') {
                        prAction = 'Made PR';
                    } else {
                        prAction = 'Updated PR';
                    }
                } else if (platform === 'gitlab') {
                    prAction = isNewPR ? 'Made Merge Request' : 'Updated Merge Request';
                    if (isCreatedToday && item.State === 'open') {
                        prAction = 'Made Merge Request';
                    } else {
                        prAction = 'Updated Merge Request';
                    }
                }

                if (isDraft) {

                    li = `<li><i>(${project})</i> - Made PR <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_draft_button : ''}`;
                    if (showCommits && item._allCommits && item._allCommits.length && !isNewPR) {
                        li += '<ul>';
                        item._allCommits.forEach(commit => {
                            li += `<li style=\"list-style: disc; color: #666;\"><span style=\"color:#2563eb;\">${commit.messageHeadline}</span><span style=\"color:#666; font-size: 11px;\"> (${new Date(commit.committedDate).toLocaleString()})</span></li>`;
                        });
                        li += '</ul>';
                    }
                    li += `</li>`;
                } else if (item.state === 'open' || item.state === 'opened') {
                    li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_open_button : ''}`;

                    if (showCommits && item._allCommits && item._allCommits.length && !isNewPR) {
                        li += '<ul>';
                        item._allCommits.forEach(commit => {
                            li += `<li style=\"list-style: disc; color: #666;\"><span style=\"color:#2563eb;\">${commit.messageHeadline}</span><span style=\"color:#666; font-size: 11px;\"> (${new Date(commit.committedDate).toLocaleString()})</span></li>`;
                        });
                        li += '</ul>';
                    }
                    li += `</li>`;
                } else if (platform === 'gitlab' && item.state === 'closed') {
                    li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_closed_button : ''}</li>`;
                } else {
                    let merged = null;
                    if ((githubToken || (useMergedStatus && !fallbackToSimple)) && mergedStatusResults) {
                        let repoParts = repository_url.split('/');
                        let owner = repoParts[repoParts.length - 2];
                        let repo = repoParts[repoParts.length - 1];
                        merged = mergedStatusResults[`${owner}/${repo}#${number}`];
                    }
                    if (merged === true) {

                        li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_merged_button : ''}</li>`;
                    } else {
                        // Always show closed label for merged === false or merged === null/undefined
                        li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_closed_button : ''}</li>`;
                    }
                }
                lastWeekArray.push(li);
                continue; // Prevent issue logic from overwriting PR li
            } else {
                // Only process as issue if not a PR
                if (item.state === 'open' && item.body?.toUpperCase().indexOf('YES') > 0) {
                    let li2 =
                        '<li><i>(' +
                        project +
                        ')</i> - Work on Issue(#' +
                        number +
                        ") - <a href='" +
                        html_url +
                        "' target='_blank' rel='noopener noreferrer'>" +
                        title +
                        '</a>' + (showOpenLabel ? ' ' + issue_opened_button : '') +
                        '&nbsp;&nbsp;</li>';
                    nextWeekArray.push(li2);
                }

                const today = new Date();
                today.setHours(0,0,0,0);
                const itemCreatedDate = new Date(item.created_at);
                itemCreatedDate.setHours(0,0,0,0);
                const isCreatedToday = today.getTime() === itemCreatedDate.getTime();
                const issueActionText = isCreatedToday ? 'Opened Issue' : 'Updated Issue'
                if (item.state === 'open') {
                    li = `<li><i>(${project})</i> - ${issueActionText}(#${number}) - <a href='${html_url}'>${title}</a>${showOpenLabel ? ' ' + issue_opened_button : ''}</li>`;

                } else if (item.state === 'closed') {


                    // Use state_reason to distinguish closure reason
                    if (item.state_reason === 'completed') {
                        li = `<li><i>(${project})</i> - ${issueActionText}(#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_completed_button}</li>`;
                    } else if (item.state_reason === 'not_planned') {
                        li = `<li><i>(${project})</i> - ${issueActionText}(#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_notplanned_button}</li>`;
                    } else {
                        li = `<li><i>(${project})</i> - ${issueActionText}(#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_button}</li>`;
                    }


                } else {
                    // Fallback for unexpected state
                    li = `<li><i>(${project})</i> - ${issueActionText}(#${number}) - <a href='${html_url}'>${title}</a></li>`;
                }

                lastWeekArray.push(li);
            }
        }
        issuesDataProcessed = true;

    }


    let intervalBody = setInterval(() => {
        if (!window.emailClientAdapter) return;

        const elements = window.emailClientAdapter.getEditorElements();
        if (!elements || !elements.body) return;

        clearInterval(intervalBody);
        scrumBody = elements.body;
    }, 500);


    let intervalSubject = setInterval(() => {
        const userData = platform === 'gitlab' ? (githubUserData || platformUsername) : githubUserData;
        if (!userData || !window.emailClientAdapter) return;


        const elements = window.emailClientAdapter.getEditorElements();
        if (!elements || !elements.subject) return;

        if (outputTarget === 'email' && !window.emailClientAdapter.isNewConversation()) {
            clearInterval(intervalSubject);
            return;
        }

        clearInterval(intervalSubject);
        scrumSubject = elements.subject;

        setTimeout(() => {
            scrumSubjectLoaded();
        }, 500);
    }, 500);


    // check for github safe writing
    let intervalWriteGithubIssues = setInterval(() => {
        if (outputTarget === 'popup') {
            return;
        } else {
            const username = platform === 'gitlab' ? platformUsername : platformUsernameLocal;
            if (scrumBody && username && githubIssuesData && githubPrsReviewData) {
                clearInterval(intervalWriteGithubIssues);
                clearInterval(intervalWriteGithubPrs);
                writeGithubIssuesPrs();
            }
        }
    }, 500);
    let intervalWriteGithubPrs = setInterval(() => {
        if (outputTarget === 'popup') {
            return;
        } else {
            const username = platform === 'gitlab' ? platformUsername : platformUsernameLocal;
            if (scrumBody && username && githubPrsReviewData && githubIssuesData) {
                clearInterval(intervalWriteGithubPrs);
                clearInterval(intervalWriteGithubIssues);
                writeGithubPrsReviews();
            }
        }
    }, 500);

    if (!refreshButton_Placed) {
        let intervalWriteButton = setInterval(() => {
            if (document.getElementsByClassName('F0XO1GC-x-b').length == 3 && scrumBody && enableToggle) {
                refreshButton_Placed = true;
                clearInterval(intervalWriteButton);
                let td = document.createElement('td');
                let button = document.createElement('button');
                button.style = 'background-image:none;background-color:#3F51B5;';
                button.setAttribute('class', 'F0XO1GC-n-a F0XO1GC-G-a');
                button.title = 'Rewrite your SCRUM using updated settings!';
                button.id = 'refreshButton';
                let elemText = document.createTextNode('↻ Rewrite SCRUM!');
                button.appendChild(elemText);
                td.appendChild(button);
                document.getElementsByClassName('F0XO1GC-x-b')[0].children[0].children[0].appendChild(td);
                document.getElementById('refreshButton').addEventListener('click', handleRefresh);
            }
        }, 1000);
    }

    function handleRefresh() {
        hasInjectedContent = false; // Reset the flag before refresh
        allIncluded();
    }
}





async function forceGithubDataRefresh() {
    let showCommits = false;

    await new Promise(resolve => {
        chrome.storage.local.get('showCommits', (result) => {
            if (result.showCommits !== undefined) {
                showCommits = result.showCommits;
            }
            resolve();
        });
    });

    if (typeof githubCache !== 'undefined') {
        githubCache.data = null;
        githubCache.cacheKey = null;
        githubCache.timestamp = 0;
        githubCache.subject = null;
        githubCache.fetching = false;
        githubCache.queue = [];
    }

    await new Promise(resolve => {
        chrome.storage.local.remove('githubCache', resolve);
    });

    chrome.storage.local.set({ showCommits: showCommits });

    hasInjectedContent = false;

    return { success: true };
}

async function forceGitlabDataRefresh() {
    // Clear in-memory cache if gitlabHelper is loaded
    if (window.GitLabHelper && gitlabHelper instanceof window.GitLabHelper) {
        gitlabHelper.cache.data = null;
        gitlabHelper.cache.cacheKey = null;
        gitlabHelper.cache.timestamp = 0;
        gitlabHelper.cache.fetching = false;
        gitlabHelper.cache.queue = [];
    }
    await new Promise(resolve => {
        chrome.storage.local.remove('gitlabCache', resolve);
    });
    hasInjectedContent = false;
    // Re-instantiate gitlabHelper to ensure a fresh instance for next API call
    if (window.GitLabHelper) {
        gitlabHelper = new window.GitLabHelper();
    }
    return { success: true };
}


if (window.location.protocol.startsWith('http')) {
    allIncluded('email');
    $('button>span:contains(New conversation)').parent('button').click(() => {
        allIncluded();
    });
}

window.generateScrumReport = function () {
    allIncluded('popup');
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'forceRefresh') {
        chrome.storage.local.get(['platform'], async (result) => {
            const platform = result.platform || 'github';
            if (platform === 'gitlab') {
                forceGitlabDataRefresh()
                    .then(result => sendResponse(result)).catch(err => {
                        console.error('Force refresh failed:', err);
                        sendResponse({ success: false, error: err.message });
                    });
            } else {
                forceGithubDataRefresh()
                    .then(result => sendResponse(result)).catch(err => {
                        console.error('Force refresh failed:', err);
                        sendResponse({ success: false, error: err.message });
                    });
            }
        });
        return true;
    }
});

async function fetchPrsMergedStatusBatch(prs, headers) {
    const results = {};
    if (prs.length === 0) return results;
    const query = `query {
${prs.map((pr, i) => `	repo${i}: repository(owner: \"${pr.owner}\", name: \"${pr.repo}\") {
		pr${i}: pullRequest(number: ${pr.number}) { merged }
	}`).join('\n')}
}`;

    try {
        const res = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });
        if (!res.ok) return results;
        const data = await res.json();
        prs.forEach((pr, i) => {
            const merged = data.data[`repo${i}`]?.[`pr${i}`]?.merged;
            results[`${pr.owner}/${pr.repo}#${pr.number}`] = merged;
        });
        return results;
    } catch (e) {
        return results;
    }

}

let selectedRepos = [];
let useRepoFilter = false;

async function fetchUserRepositories(username, token, org = '') {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
    };

    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    if (!username) {
        throw new Error('GitHub username is required');
    }
    try {
        let dateRange = '';
        try {
            const storageData = await new Promise(resolve => {
                chrome.storage.local.get(['startingDate', 'endingDate', 'yesterdayContribution'], resolve);
            });

            let startDate, endDate;
            if (storageData.yesterdayContribution) {
                const today = new Date();
                const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                startDate = yesterday.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
            } else if (storageData.startingDate && storageData.endingDate) {
                startDate = storageData.startingDate;
                endDate = storageData.endingDate;
            } else {
                const today = new Date();
                const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                startDate = lastWeek.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
            }

            dateRange = `+created:${startDate}..${endDate}`;
        } catch (err) {
            console.warn('Could not determine date range, using last 30 days:', err);
            const today = new Date();
            const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];
        }
        let orgPart = org && org !== 'all' ? `+org:${org}` : '';
        const issuesUrl = `https://api.github.com/search/issues?q=author:${username}${orgPart}${dateRange}&per_page=100`;
        const commentsUrl = `https://api.github.com/search/issues?q=commenter:${username}${orgPart}${dateRange.replace('created:', 'updated:')}&per_page=100`;


        const [issuesRes, commentsRes] = await Promise.all([
            fetch(issuesUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) })),
            fetch(commentsUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) }))
        ]);

        let repoSet = new Set();

        const processRepoItems = (items) => {
            items?.forEach(item => {
                if (item.repository_url) {
                    const urlParts = item.repository_url.split('/');
                    const repoFullName = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
                    const repoName = `${urlParts[urlParts.length - 1]}`
                    repoSet.add(repoFullName);
                }
            })
        }

        if (issuesRes.ok) {
            const issuesData = await issuesRes.json();
            processRepoItems(issuesData.items);
        }

        if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            processRepoItems(commentsData.items);
        }

        const repoNames = Array.from(repoSet);

        if (repoNames.length === 0) {
            return [];
        }

        const repoFields = `
            name
            nameWithOwner
            description
            pushedAt
            stargazerCount
            primaryLanguage {
                name
            }
        `;

        const repoQueries = repoNames.slice(0, 50).map((repoFullName, i) => {
            const parts = repoFullName.split('/');
            if (parts.length !== 2) return '';
            const owner = parts[0];
            const repo = parts[1];
            return `
                repo${i}: repository(owner: "${owner}", name: "${repo}") {
                    ... on Repository {
                        ${repoFields}
                    }
                }
            `;
        }).join('\n');

        const query = `query { ${repoQueries} }`;

        try {
            const res = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!res.ok) {
                throw new Error(`GraphQL request for repos failed: ${res.status}`);
            }

            const graphQLData = await res.json();

            if (graphQLData.errors) {
                logError("GraphQL errors fetching repos:", graphQLData.errors);
                return [];
            }

            const repos = Object.values(graphQLData.data)
                .filter(repo => repo !== null)
                .map(repo => ({
                    name: repo.name,
                    fullName: repo.nameWithOwner,
                    description: repo.description,
                    language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
                    updatedAt: repo.pushedAt,
                    stars: repo.stargazerCount
                }));

            return repos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        } catch (err) {

            throw err;
        }
    } catch (err) {


        throw err;
    }
}

function filterDataByRepos(data, selectedRepos) {
    if (!selectedRepos || selectedRepos.length === 0) {
        return data;
    }

    const filteredData = {
        ...data,
        githubIssuesData: {
            ...data.githubIssuesData,
            items: data.githubIssuesData?.items?.filter(item => {
                const urlParts = item.repository_url?.split('/');
                const fullName = urlParts ? `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}` : '';
                return selectedRepos.includes(fullName);
            }) || []
        },
        githubPrsReviewData: {
            ...data.githubPrsReviewData,
            items: data.githubPrsReviewData?.items?.filter(item => {
                const urlParts = item.repository_url?.split('/');
                const fullName = urlParts ? `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}` : '';
                return selectedRepos.includes(fullName);
            }) || []
        }
    };
    return filteredData;
}
window.fetchUserRepositories = fetchUserRepositories;
