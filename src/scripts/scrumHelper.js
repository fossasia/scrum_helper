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

let orgName = '';

function allIncluded(outputTarget = 'email') {
    if (scrumGenerationInProgress) {
        console.warn('[SCRUM-HELPER]: Scrum generation already in progress, aborting new call.');
        return;
    }
    scrumGenerationInProgress = true;
    console.log('allIncluded called with outputTarget:', outputTarget);
    console.log('Current window context:', window.location.href);
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

    function getChromeData() {
        console.log("Getting Chrome data for context:", outputTarget);
        chrome.storage.local.get(
            [
                'githubUsername',
                'githubToken',
                'projectName',
                'enableToggle',
                'startingDate',
                'endingDate',
                'showOpenLabel',
                'lastWeekContribution',
                'yesterdayContribution',
                'userReason',
                'githubCache',
                'cacheInput',
                'orgName',
                'selectedRepos',
                'useRepoFilter',
                'showCommits',
            ],
            (items) => {
                console.log("Storage items received:", items);

                if (outputTarget === 'popup') {
                    const usernameFromDOM = document.getElementById('githubUsername')?.value;
                    const projectFromDOM = document.getElementById('projectName')?.value;
                    const reasonFromDOM = document.getElementById('userReason')?.value;
                    const tokenFromDOM = document.getElementById('githubToken')?.value;

                    items.githubUsername = usernameFromDOM || items.githubUsername;
                    items.projectName = projectFromDOM || items.projectName;
                    items.userReason = reasonFromDOM || items.userReason;
                    items.githubToken = tokenFromDOM || items.githubToken;

                    chrome.storage.local.set({
                        githubUsername: items.githubUsername,
                        projectName: items.projectName,
                        userReason: items.userReason,
                        githubToken: items.githubToken
                    });
                }

                githubUsername = items.githubUsername;
                projectName = items.projectName;
                userReason = items.userReason || 'No Blocker at the moment';
                githubToken = items.githubToken;
                lastWeekContribution = items.lastWeekContribution;
                yesterdayContribution = items.yesterdayContribution;

                if (!items.enableToggle) {
                    enableToggle = items.enableToggle;
                }

                if (items.lastWeekContribution) {
                    handleLastWeekContributionChange();
                } else if (items.yesterdayContribution) {
                    handleYesterdayContributionChange();
                } else if (items.startingDate && items.endingDate) {
                    startingDate = items.startingDate;
                    endingDate = items.endingDate;
                } else {
                    handleLastWeekContributionChange(); //when no date is stored i.e on fresh unpack - default to last week.
                    if (outputTarget === 'popup') {
                        chrome.storage.local.set({ lastWeekContribution: true, yesterdayContribution: false });
                    }
                }

                if (githubUsername) {
                    console.log("About to fetch GitHub data for:", githubUsername);
                    fetchGithubData();
                } else {
                    if (outputTarget === 'popup') {
                        console.log("No username found - popup context");
                        // Show error in popup
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
                        console.warn('No GitHub username found in storage');
                        scrumGenerationInProgress = false;
                    }
                    return;
                }
                if (items.cacheInput) {
                    cacheInput = items.cacheInput;
                }

                if (!items.showOpenLabel) {
                    showOpenLabel = false;
                    pr_unmerged_button = '';
                    issue_opened_button = '';
                    pr_merged_button = '';
                    issue_closed_button = '';
                }
                if (items.userReason) {
                    userReason = items.userReason;
                }
                if (items.showCommits !== undefined) {
                    showCommits = items.showCommits;
                } else {
                    showCommits = false; //default value
                }
                if (items.githubCache) {
                    githubCache.data = items.githubCache.data;
                    githubCache.cacheKey = items.githubCache.cacheKey;
                    githubCache.timestamp = items.githubCache.timestamp;
                    log('Restored cache from storage');
                }
                if (typeof items.orgName !== 'undefined') {
                    orgName = items.orgName || '';
                    console.log('[SCRUM-HELPER] orgName set to:', orgName);
                }
                if (items.selectedRepos) {
                    selectedRepos = items.selectedRepos;
                }
                if (items.useRepoFilter) {
                    useRepoFilter = items.useRepoFilter;
                }
            },
        );
    }
    getChromeData();

    function handleLastWeekContributionChange() {
        endingDate = getToday();
        startingDate = getLastWeek();
    }
    function handleYesterdayContributionChange() {
        endingDate = getToday();
        startingDate = getYesterday();
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
    function getToday() {
        let today = new Date();
        let Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let WeekMonth = Week.getMonth() + 1;
        let WeekDay = Week.getDate();
        let WeekYear = Week.getFullYear();
        let WeekDisplayPadded =
            ('0000' + WeekYear.toString()).slice(-4) +
            '-' +
            ('00' + WeekMonth.toString()).slice(-2) +
            '-' +
            ('00' + WeekDay.toString()).slice(-2);
        return WeekDisplayPadded;
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
        log(`Saving data to storage:`, {
            cacheKey: githubCache.cacheKey,
            timestamp: githubCache.timestamp,
            hasSubject: !!subject,
        });

        return new Promise((resolve) => {
            chrome.storage.local.set({ githubCache: cacheData }, () => {
                if (chrome.runtime.lastError) {
                    logError('Storage save failed: ', chrome.runtime.lastError);
                    resolve(false);
                } else {
                    log('Cache saved successfuly');
                    githubCache.data = data;
                    githubCache.subject = subject;
                    resolve(true);
                }
            });
        });
    }

    function loadFromStorage() {
        log('Loading cache from storage');
        return new Promise(async (resolve) => {
            const currentTTL = await getCacheTTL();
            chrome.storage.local.get('githubCache', (result) => {
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
                log('Found valid cache:', {
                    cacheKey: cache.cacheKey,
                    age: `${((Date.now() - cache.timestamp) / 1000 / 60).toFixed(1)} minutes`,
                });

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
        const cacheKey = `${githubUsername}-${startingDate}-${endingDate}-${orgName || 'all'}`;

        if (githubCache.fetching || (githubCache.cacheKey === cacheKey && githubCache.data)) {
            log('Fetch already in progress or data already fetched. Skipping fetch.');
            return;
        }

        log('Fetching Github data:', {
            username: githubUsername,
            startDate: startingDate,
            endDate: endingDate,
        });

        log('CacheKey in cache:', githubCache.cacheKey);
        log('Incoming cacheKey:', cacheKey);
        log('Has data:', !!githubCache.data);

        // Check if we need to load from storage
        if (!githubCache.data && !githubCache.fetching) {
            await loadFromStorage();
        };

        const currentTTL = await getCacheTTL();
        githubCache.ttl = currentTTL;
        log(`Caching for ${currentTTL / (60 * 1000)} minutes`);

        const now = Date.now();
        const isCacheFresh = (now - githubCache.timestamp) < githubCache.ttl;
        const isCacheKeyMatch = githubCache.cacheKey === cacheKey;
        const needsToken = !!githubToken;
        const cacheUsedToken = !!githubCache.usedToken;

        if (githubCache.data && isCacheFresh && isCacheKeyMatch) {
            if (needsToken && !cacheUsedToken) {
                log('Cache was fetched without token, but user now has a token. Invalidating cache.');
                githubCache.data = null;
            } else {
                log('Using cached data - cache is fresh and key matches');
                processGithubData(githubCache.data);
                return Promise.resolve();
            }
        }
        // if cache key does not match our cache is stale, fetch new data
        if (!isCacheKeyMatch) {
            log('Cache key mismatch - fetching new Data');
            githubCache.data = null;
        } else if (!isCacheFresh) {
            log('Cache is stale - fetching new data');
        }

        // if fetching is in progress, queue the calls and return a promise resolved when done
        if (githubCache.fetching) {
            log('Fetch in progress, queuing requests');
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
            log('Making authenticated requests.');
            headers['Authorization'] = `token ${githubToken}`;

        } else {
            log('Making public requests');
        }

        console.log('[SCRUM-HELPER] orgName before API query:', orgName);
        console.log('[SCRUM-HELPER] orgName type:', typeof orgName);
        console.log('[SCRUM-HELPER] orgName length:', orgName ? orgName.length : 0);
        let orgPart = orgName && orgName.trim() ? `+org%3A${orgName}` : '';
        console.log('[SCRUM-HELPER] orgPart for API:', orgPart);
        console.log('[SCRUM-HELPER] orgPart length:', orgPart.length);

        let issueUrl, prUrl, userUrl;

        if (useRepoFilter && selectedRepos && selectedRepos.length > 0) {
            log('Using repo filter for api calls:', selectedRepos);

            try {
                await fetchReposIfNeeded();
            } catch (err) {
                logError('Failed to fetch repo data for filtering:', err);
            }

            const repoQueries = selectedRepos.map(repo => `repo:${orgName}/${repo}`).join('+');

            issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+${repoQueries}+${orgPart}+updated%3A${startingDate}..${endingDate}&per_page=100`;
            prUrl = `https://api.github.com/search/issues?q=commenter%3A${githubUsername}+${repoQueries}+${orgPart}+updated%3A${startingDate}..${endingDate}&per_page=100`;
            userUrl = `https://api.github.com/users/${githubUsername}`;
            log('Repository-filtered URLs:', { issueUrl, prUrl });
        } else {
            loadFromStorage('Using org wide search');
            issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+${orgPart}+updated%3A${startingDate}..${endingDate}&per_page=100`;
            prUrl = `https://api.github.com/search/issues?q=commenter%3A${githubUsername}+${orgPart}+updated%3A${startingDate}..${endingDate}&per_page=100`;
            userUrl = `https://api.github.com/users/${githubUsername}`;
        }

        try {
            // throttling 500ms to avoid burst
            await new Promise(res => setTimeout(res, 500));

            const [issuesRes, prRes, userRes] = await Promise.all([
                fetch(issueUrl, { headers }),
                fetch(prUrl, { headers }),
                fetch(userUrl, { headers }),
            ]);

            if (issuesRes.status === 401 || prRes.status === 401 || userRes.status === 401 ||
                issuesRes.status === 403 || prRes.status === 403 || userRes.status === 403) {
                showInvalidTokenMessage();
                return;
            }

            if (issuesRes.status === 404 || prRes.status === 404) {
                if (outputTarget === 'popup') {
                    Materialize.toast && Materialize.toast('Organization not found on GitHub', 3000);
                }
                throw new Error('Organization not found');
            }

            if (!issuesRes.ok) throw new Error(`Error fetching Github issues: ${issuesRes.status} ${issuesRes.statusText}`);
            if (!prRes.ok) throw new Error(`Error fetching Github PR review data: ${prRes.status} ${prRes.statusText}`);
            if (!userRes.ok) throw new Error(`Error fetching Github userdata: ${userRes.status} ${userRes.statusText}`);

            githubIssuesData = await issuesRes.json();
            githubPrsReviewData = await prRes.json();
            githubUserData = await userRes.json();

            if (githubIssuesData && githubIssuesData.items) {
                log('Fetched githubIssuesData:', githubIssuesData.items.length, 'items');
                // Collect open PRs
                const openPRs = githubIssuesData.items.filter(
                    item => item.pull_request && item.state === 'open'
                );
                log('Open PRs for commit fetching:', openPRs.map(pr => pr.number));
                // Fetch commits for open PRs (batch)
                if (openPRs.length && githubToken) {
                    const commitMap = await fetchCommitsForOpenPRs(openPRs, githubToken, startingDate, endingDate);
                    log('Commit map returned from fetchCommitsForOpenPRs:', commitMap);
                    // Attach commits to PR objects
                    openPRs.forEach(pr => {
                        pr._allCommits = commitMap[pr.number] || [];
                        log(`Attached ${pr._allCommits.length} commits to PR #${pr.number}`);
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
        log('fetchCommitsForOpenPRs called with PRs:', prs.map(pr => pr.number), 'startDate:', startDate, 'endDate:', endDate);
        if (!prs.length) return {};
        const since = new Date(startDate).toISOString();
        const until = new Date(endDate + 'T23:59:59').toISOString();
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
        log('GraphQL query for commits:', query);
        const res = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(githubToken ? { Authorization: `bearer ${githubToken}` } : {})
            },
            body: JSON.stringify({ query })
        });
        log('fetchCommitsForOpenPRs response status:', res.status);
        const data = await res.json();
        log('fetchCommitsForOpenPRs response data:', data);
        let commitMap = {};
        prs.forEach((pr, idx) => {
            const prData = data.data && data.data[`pr${idx}`] && data.data[`pr${idx}`].pullRequest;
            if (prData && prData.commits && prData.commits.nodes) {
                const allCommits = prData.commits.nodes.map(n => n.commit);
                log(`PR #${pr.number} allCommits:`, allCommits);
                const filteredCommits = allCommits.filter(commit => {
                    const commitDate = new Date(commit.committedDate);
                    const sinceDate = new Date(since);
                    const untilDate = new Date(until);
                    return commitDate >= sinceDate && commitDate <= untilDate;
                });
                log(`PR #${pr.number} filteredCommits:`, filteredCommits);
                commitMap[pr.number] = filteredCommits;
            } else {
                log(`No commits found for PR #${pr.number}`);
            }
        });
        return commitMap;
    }

    async function fetchReposIfNeeded() {
        if (!useRepoFilter) {
            log('Repo fiter disabled, skipping fetch');
            return [];
        }
        const repoCacheKey = `repos-${githubUsername}-${orgName}-${startingDate}-${endingDate}`;

        const now = Date.now();
        const isRepoCacheFresh = (now - githubCache.repoTimeStamp) < githubCache.ttl;
        const isRepoCacheKeyMatch = githubCache.repoCacheKey === repoCacheKey;

        if (githubCache.repoData && isRepoCacheFresh && isRepoCacheKeyMatch) {
            log('Using cached repo data');
            return githubCache.repoData;
        }

        if (githubCache.repoFetching) {
            log('Repo fetch is in progress, queuing request');
            return new Promise((resolve, reject) => {
                githubCache.repoQueue.push({ resolve, reject });
            });
        }

        githubCache.repoFetching = true;
        githubCache.repoCacheKey = repoCacheKey;

        try {
            log('Fetching repos automatically');
            const repos = await fetchUserRepositories(githubUsername, githubToken, orgName);

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

            log(`Successfuly cached ${repos.length} repositories`);
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
        log('Cache Status: ', {
            hasCachedData: !!githubCache.data,
            cacheAge: githubCache.timestamp ? `${((Date.now() - githubCache.timestamp) / 1000 / 60).toFixed(1)} minutes` : `no cache`,
            cacheKey: githubCache.cacheKey,
            isFetching: githubCache.fetching,
            queueLength: githubCache.queue.length
        });
        const storageData = await new Promise(resolve => {
            chrome.storage.local.get('githubCache', resolve);
        });
        log('Storage Status:', {
            hasStoredData: !!storageData.githubCache,
            storedCacheKey: storageData.githubCache?.cacheKey,
            storageAge: storageData.githubCache?.timestamp ?
                `${((Date.now() - storageData.githubCache.timestamp) / 1000 / 60).toFixed(1)} minutes` :
                'no data'
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
        log('Processing Github data');

        githubIssuesData = data.githubIssuesData;
        githubPrsReviewData = data.githubPrsReviewData;
        githubUserData = data.githubUserData;

        log('GitHub data set:', {
            issues: githubIssuesData?.items?.length || 0,
            prs: githubPrsReviewData?.items?.length || 0,
            user: githubUserData?.login,
            filtered: useRepoFilter
        });

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
        log('Both data processing functions completed, generating scrum body');
        writeScrumBody();
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    //load initial text in scrum body
    function writeScrumBody() {
        if (!enableToggle || (outputTarget === 'email' && hasInjectedContent)) return;

        if (outputTarget === 'email') {
            if (!window.emailClientAdapter) {
                console.error('Email client adapter not found');
                return;
            }
            if (!window.emailClientAdapter.isNewConversation()) {
                console.log('Not a new conversation, skipping scrum helper');
                return;
            }
        }

        setTimeout(() => {
            // Generate content first
            let lastWeekUl = '<ul>';
            let i;
            for (i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
            for (i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
            lastWeekUl += '</ul>';

            let nextWeekUl = '<ul>';
            for (i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
            nextWeekUl += '</ul>';

            let weekOrDay = lastWeekContribution ? 'last week' : (yesterdayContribution ? 'yesterday' : 'the period');
            let weekOrDay2 = lastWeekContribution ? 'this week' : 'today';

            // Create the complete content
            let content;
            if (lastWeekContribution == true || yesterdayContribution == true) {
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
                    log("found div, updating content");
                    scrumReport.innerHTML = content;

                    // Reset generate button
                    const generateBtn = document.getElementById('generateReport');
                    if (generateBtn) {
                        generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                        generateBtn.disabled = false;
                    }
                    scrumGenerationInProgress = false;
                } else {
                    logError('Scrum report div not found');
                    scrumGenerationInProgress = false;
                }
            } else {
                const elements = window.emailClientAdapter.getEditorElements();
                if (!elements || !elements.body) {
                    console.error('Email client editor not found');
                    return;
                }
                window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
                hasInjectedContent = true;
                scrumGenerationInProgress = false;
            }
        }, 500);
    }

    //load initial scrum subject
    function scrumSubjectLoaded() {
        try {
            if (!enableToggle || hasInjectedContent) return;
            if (!scrumSubject) {
                console.error('Subject element not found');
                return;
            }
            setTimeout(() => {
                let name = githubUserData.name || githubUsername;
                let project = projectName || '<project name>';
                let curDate = new Date();
                let year = curDate.getFullYear().toString();
                let date = curDate.getDate();
                let month = curDate.getMonth();
                month++;
                if (month < 10) month = '0' + month;
                if (date < 10) date = '0' + date;
                let dateCode = year.toString() + month.toString() + date.toString();

                const subject = `[Scrum] ${name} - ${project} - ${dateCode}`;
                log('Generated subject:', subject);
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

    function writeGithubPrsReviews() {
        let items = githubPrsReviewData.items;
        log('Processing PR reviews:', {
            hasItems: !!items,
            itemCount: items?.length,
            firstItem: items?.[0]
        });
        if (!items) {
            logError('No Github PR review data available');
            return;
        }
        reviewedPrsArray = [];
        githubPrsReviewDataProcessed = {};
        let i;
        for (i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.user.login == githubUsername || !item.pull_request) continue;
            let repository_url = item.repository_url;
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
                '<li> \
			<i>(' +
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
                        "<a href='" + pr_arr.html_url + "' target='_blank'>#" + pr_arr.number + '</a> (' + pr_arr.title + ') ';
                    if (pr_arr.state === 'open') prText += issue_opened_button;
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
                        "' target='_blank'>#" +
                        pr_arr1.number +
                        '</a> (' +
                        pr_arr1.title +
                        ') ';
                    if (pr_arr1.state === 'open') prText1 += issue_opened_button;
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
        if (outputTarget === 'email') {
            triggerScrumGeneration();
        }
    }

    function triggerScrumGeneration() {
        if (issuesDataProcessed && prsReviewDataProcessed) {
            log('Both data sets processed, generating scrum body.');
            writeScrumBody();
        } else {
            log('Waiting for all data to be processed before generating scrum.', {
                issues: issuesDataProcessed,
                reviews: prsReviewDataProcessed,
            });
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

    async function writeGithubIssuesPrs() {
        let items = githubIssuesData.items;
        lastWeekArray = [];
        nextWeekArray = [];
        if (!items) {
            logError('No Github issues data available');
            return;
        }
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (githubToken) headers['Authorization'] = `token ${githubToken}`;
        let useMergedStatus = false;
        let fallbackToSimple = false;
        let daysRange = getDaysBetween(startingDate, endingDate);
        if (githubToken) {
            useMergedStatus = true;
        } else if (daysRange <= 7) {
            useMergedStatus = true;
        }

        let prsToCheck = [];
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item.pull_request && item.state === 'closed' && useMergedStatus && !fallbackToSimple) {
                let repository_url = item.repository_url;
                let repoParts = repository_url.split('/');
                let owner = repoParts[repoParts.length - 2];
                let repo = repoParts[repoParts.length - 1];
                prsToCheck.push({ owner, repo, number: item.number, idx: i });
            }
        }

        let mergedStatusResults = {};
        if (githubToken) {
            // Use GraphQL batching for all cases
            if (prsToCheck.length > 0) {
                mergedStatusResults = await fetchPrsMergedStatusBatch(prsToCheck, headers);
            }
        } else if (useMergedStatus) {
            if (prsToCheck.length > 30) {
                fallbackToSimple = true;
                if (typeof Materialize !== 'undefined' && Materialize.toast) {
                    Materialize.toast('API limit exceeded. Please use a GitHub token for full status. Showing only open/closed PRs.', 5000);
                }
            } else {
                // Use REST API for each PR, cache results
                for (let pr of prsToCheck) {
                    let merged = await fetchPrMergedStatusREST(pr.owner, pr.repo, pr.number, headers);
                    mergedStatusResults[`${pr.owner}/${pr.repo}#${pr.number}`] = merged;
                }
            }
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
                const prCreatedDate = new Date(item.created_at);
                const startDate = new Date(startingDate);
                const endDate = new Date(endingDate + 'T23:59:59');
                const isNewPR = prCreatedDate >= startDate && prCreatedDate <= endDate;

                if (!isNewPR) {
                    const hasCommitsInRange = showCommits && item._allCommits && item._allCommits.length > 0;

                    if (!hasCommitsInRange) {
                        continue; //skip these prs - created outside daterange with no commits
                    } else {}
                } else {}
                const prAction = isNewPR ? 'Made PR' : 'Existing PR';
                if (isDraft) {
                    li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_draft_button}</li>`;
                } else if (item.state === 'open') {
                    li = `<li><i>(${project})</i> - ${prAction} (#${number}) - <a href='${html_url}'>${title}</a> ${pr_open_button}`;
                    if (showCommits && item._allCommits && item._allCommits.length && !isNewPR) {
                        log(`[PR DEBUG] Rendering commits for existing PR #${number}:`, item._allCommits);
                        item._allCommits.forEach(commit => {
                            li += `<li style=\"list-style: disc; margin: 0 0 0 20px; padding: 0; color: #666;\"><span style=\"color:#2563eb;\">${commit.messageHeadline}</span><span style=\"color:#666; font-size: 11px;\"> (${new Date(commit.committedDate).toLocaleString()})</span></li>`;
                        });
                    }
                    li += `</li>`;
                } else if (item.state === 'closed') {
                    let merged = null;
                    if ((githubToken || (useMergedStatus && !fallbackToSimple)) && mergedStatusResults) {
                        let repoParts = repository_url.split('/');
                        let owner = repoParts[repoParts.length - 2];
                        let repo = repoParts[repoParts.length - 1];
                        merged = mergedStatusResults[`${owner}/${repo}#${number}`];
                    }
                    if (merged === true) {
                        li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
                    } else {
                        li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_closed_button}</li>`;
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
                        "' target='_blank'>" +
                        title +
                        '</a> ' +
                        issue_opened_button +
                        '&nbsp;&nbsp;</li>';
                    nextWeekArray.push(li2);
                }
                if (item.state === 'open') {
                    li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
                } else if (item.state === 'closed') {
                    // Always show closed label for closed issues
                    li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_button}</li>`;
                } else {
                    li =
                        '<li><i>(' +
                        project +
                        ')</i> - Opened Issue(#' +
                        number +
                        ") - <a href='" +
                        html_url +
                        "' target='_blank'>" +
                        title +
                        '</a> </li>';
                }
                lastWeekArray.push(li);
            }
            issuesDataProcessed = true;
            if (outputTarget === 'email') {
                triggerScrumGeneration();
            }
        }

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
                console.log('Not a new conversation, skipping subject interval');
                clearInterval(intervalSubject);
                return;
            }

            clearInterval(intervalSubject);
            scrumSubject = elements.subject;

            setTimeout(() => {
                scrumSubjectLoaded();
            }, 500);
        }, 500);

        //check for github safe writing
        let intervalWriteGithubIssues = setInterval(async () => {
            try {
                if (outputTarget === 'popup') {
                    return;
                } else {
                    if (scrumBody && githubUsername && githubIssuesData && githubPrsReviewData) {
                        clearInterval(intervalWriteGithubIssues);
                        clearInterval(intervalWriteGithubPrs);
                        writeGithubIssuesPrs();
                    }
                }
            } catch (err) {
                logError('Interval writeGithubIssuesPrs error:', err);
            }
        }, 500);
        let intervalWriteGithubPrs = setInterval(() => {
            if (outputTarget === 'popup') {
                return;
            } else {
                if (scrumBody && githubUsername && githubPrsReviewData && githubIssuesData) {
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

if (window.location.protocol.startsWith('http')) {
    allIncluded('email');
    $('button>span:contains(New conversation)').parent('button').click(() => {
        allIncluded();
    });
}

window.generateScrumReport = function () {
    allIncluded('popup');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'forceRefresh') {
        forceGithubDataRefresh()
            .then(result => sendResponse(result)).catch(err => {
                console.error('Force refresh failed:', err);
                sendResponse({ success: false, error: err.message });
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

    console.log('Fetching repos for username:', username, 'org:', org);

    try {
        let dateRange = '';
        try {
            const storageData = await new Promise(resolve => {
                chrome.storage.local.get(['startingDate', 'endingDate', 'lastWeekContribution', 'yesterdayContribution'], resolve);
            });

            let startDate, endDate;
            if (storageData.lastWeekContribution) {
                const today = new Date();
                const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                startDate = lastWeek.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
            } else if (storageData.yesterdayContribution) {
                const today = new Date();
                const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
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
            console.log(`Using date range for repo search: ${startDate} to ${endDate}`);
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

        console.log('Search URLs:', { issuesUrl, commentsUrl });

        const [issuesRes, commentsRes] = await Promise.all([
            fetch(issuesUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) })),
            fetch(commentsUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) }))
        ]);

        let repoSet = new Set();

        if (issuesRes.ok) {
            const issuesData = await issuesRes.json();
            issuesData.items?.forEach(item => {
                if (item.repository_url) {
                    const repoName = item.repository_url.split('/').pop();
                    repoSet.add(repoName);
                }
            });
            console.log(`Found ${issuesData.items?.length || 0} issues/PRs authored by user in date range`);
        }

        if (commentsRes.ok) {
            const commentsData = await commentsRes.json();
            commentsData.items?.forEach(item => {
                if (item.repository_url) {
                    const repoName = item.repository_url.split('/').pop();
                    repoSet.add(repoName);
                }
            })
            console.log(`Found ${commentsData.items?.length || 0} issues/PRs with user comments in date range`);
        }

        const repoNames = Array.from(repoSet);
        console.log(`Found ${repoNames.length} unique repositories with contributions in the selected date range`);

        if (repoNames.length === 0) {
            console.log(`No repositories with contrbutions found in the selected date range`);
            return [];
        }

        const repoPromises = repoNames.slice(0, 50).map(async (repoName) => {
            try {
                let repoUrl;
                if (org && org !== 'all' ) {
                    repoUrl = `https://api.github.com/repos/${org}/${repoName}`;
                } else {
                    let repoApiUrl = null;
                    for(const itemArr of [issuesRes.ok ? (await issuesRes.json()).items : [], commentsRes.ok ? (await commentsRes.json()).items : []]) {
                        const found = itemArr.find(item => items.repository_url && items.repository_url.endswith('/' + repoName));
                        if(found){
                            repoApirUrl = found.repository_urll
                            break;
                        }
                    }
                    repoUrl = repoApiUrl || `https://api.github.com/repos/${repoName}`;
                }
                const repoRes = await fetch(repoUrl, { headers });
                if (repoRes.ok) {
                    const repo = await repoRes.json();
                    return {
                        name: repo.name,
                        fullName: repo.full_name,
                        description: repo.description,
                        language: repo.language,
                        updatedAt: repo.updated_at,
                        stars: repo.stargazers_count
                    };
                }
                return null;
            } catch (err) {
                console.warn(`Dailed to fetch details for repo ${repoName}: `, err);
                return {
                    name: repoName,
                    fullName: `${org}/${repoName}`,
                    description: 'Repostory details unavailable',
                    language: null,
                    updatedAt: new Date().toISOString(),
                    stars: 0
                };
            }
        });

        const repos = (await Promise.all(repoPromises)).filter(repo => repo !== null);
        console.log(`Successfully fetched details for ${repos.length} repositories with contributions in the selected date range`);
        return repos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (err) {
        logError('Failed to fetch repositories:', err);
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
                const repoName = item.repository_url?.substr(item.repository_url.lastIndexOf('/') + 1);
                return selectedRepos.includes(repoName);
            }) || []
        },
        githubPrsReviewData: {
            ...data.githubPrsReviewData,
            items: data.githubPrsReviewData?.items?.filter(item => {
                const repoName = item.repository_url?.substr(item.repository_url.lastIndexOf('/') + 1);
                return selectedRepos.includes(repoName);
            }) || []
        }
    };
    return filteredData;
}
window.fetchUserRepositories = fetchUserRepositories;
