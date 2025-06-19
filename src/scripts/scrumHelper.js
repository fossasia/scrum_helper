// GitLab support added

console.log('Script loaded, adapter exists:', !!window.emailClientAdapter);
let refreshButton_Placed = false;
let enableToggle = true;
let hasInjectedContent = false;
function allIncluded(outputTarget = 'email') {
  console.log('allIncluded called with outputTarget:', outputTarget);
  console.log('Current window context:', window.location.href);
  let scrumBody = null;
  let scrumSubject = null;
  let startingDate = '';
  let endingDate = '';
  let githubUsername = '';
  let gitlabUsername = '';
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
  let showOpenLabel = true;
  let showClosedLabel = true;
  let userReason = '';
  let cacheInputValue = 10; // Default cache TTL value

  // GitLab data variables
  let gitlabIssuesData = null;
  let gitlabMergeRequestsData = null;
  let gitlabCommentsData = null;
  let gitlabUserData = null;
  let gitlabPrsReviewDataProcessed = {};
  let gitlabProjects = [];
  let gitlabProjectNameCache = {};

  let pr_merged_button =
    '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
  let pr_unmerged_button =
    '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

  let issue_closed_button =
    '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
  let issue_opened_button =
    '<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

  // GitHub cache object
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
  };

  // GitLab cache object
  let gitlabCache = {
    data: null,
    cacheKey: null,
    timestamp: 0,
    ttl: 10 * 60 * 1000, // cache valid for 10 mins
    fetching: false,
    queue: [],
    errors: {},
    errorTTL: 60 * 1000, // 1 min error cache 
    subject: null,
  };

  function getChromeData() {
    console.log("Getting Chrome data for context:", outputTarget);
    chrome.storage.local.get(
      [
        'githubUsername',
        'gitlabUsername',
        'selectedPlatform',
        'projectName',
        'enableToggle',
        'startingDate',
        'endingDate',
        'showOpenLabel',
        'showClosedLabel',
        'lastWeekContribution',
        'yesterdayContribution',
        'userReason',
        'githubCache',
        'gitlabCache',
        'cacheInputValue'
      ],
      (items) => {
        console.log("Storage items received:", items);

        if (items.lastWeekContribution) {
          lastWeekContribution = true;
          handleLastWeekContributionChange();
        }
        if (items.yesterdayContribution) {
          yesterdayContribution = true;
          handleYesterdayContributionChange();
        }
        if (!items.enableToggle) {
          enableToggle = items.enableToggle;
        }
        if (items.endingDate && !lastWeekContribution) {
          endingDate = items.endingDate;
        }
        if (items.startingDate && !lastWeekContribution) {
          startingDate = items.startingDate;
        }
        if (items.endingDate && !yesterdayContribution) {
          endingDate = items.endingDate;
        }
        if (items.startingDate && !yesterdayContribution) {
          startingDate = items.startingDate;
        }

        // Handle platform-specific data fetching
        const selectedPlatform = items.selectedPlatform || 'github';

        if (selectedPlatform === 'github' && items.githubUsername) {
          githubUsername = items.githubUsername;
          console.log("About to fetch GitHub data for:", githubUsername);
          fetchGithubData();
        } else if (selectedPlatform === 'gitlab' && items.gitlabUsername) {
          gitlabUsername = items.gitlabUsername;
          console.log("About to fetch GitLab data for:", gitlabUsername);
          fetchGitLabData();
        } else {
          if (outputTarget === 'popup') {
            console.log("No username found - popup context");
            // Show error in popup
            const generateBtn = document.getElementById('generateReport');
            if (generateBtn) {
              generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
              generateBtn.disabled = false;
            }
            const platformName = selectedPlatform === 'github' ? 'GitHub' : 'GitLab';
            if (typeof Materialize !== 'undefined') {
              Materialize.toast(`Please enter your ${platformName} username`, 3000);
            } else {
              console.warn(`Please enter your ${platformName} username`);
            }
          } else {
            console.log("No username found - email context");
            console.warn(`No ${selectedPlatform} username found in storage`);
          }
        }
        if (items.projectName) {
          projectName = items.projectName;
        }
        if (items.cacheInputValue) {
          cacheInputValue = items.cacheInputValue;
        }
        if (!items.showOpenLabel) {
          showOpenLabel = false;
          pr_unmerged_button = '';
          issue_opened_button = '';
        }
        if (!items.showClosedLabel) {
          showClosedLabel = false;
          pr_merged_button = '';
          issue_closed_button = '';
        }
        if (items.userReason) {
          userReason = items.userReason;
        }
        if (!items.userReason) {
          userReason = 'No Blocker at the moment';
        }
        if (items.githubCache) {
          githubCache.data = items.githubCache.data;
          githubCache.cacheKey = items.githubCache.cacheKey;
          githubCache.timestamp = items.githubCache.timestamp;
          log('Restored GitHub cache from storage');
        }
        if (items.gitlabCache) {
          gitlabCache.data = items.gitlabCache.data;
          gitlabCache.cacheKey = items.gitlabCache.cacheKey;
          gitlabCache.timestamp = items.gitlabCache.timestamp;
          log('Restored GitLab cache from storage');
        }
      },
    );
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

  getChromeData();

  async function getCacheTTL() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['cacheInputValue'], function (result) {
        const ttlMinutes = result.cacheInputValue || 10;
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
          log('Cache saved successfully');
          githubCache.data = data;
          githubCache.subject = subject;
          resolve(true);
        }
      });
    });
  }

  function saveGitLabToStorage(data, subject = null) {
    const cacheData = {
      data: data,
      cacheKey: gitlabCache.cacheKey,
      timestamp: gitlabCache.timestamp,
      subject: subject,
    }
    log(`Saving GitLab data to storage:`, {
      cacheKey: gitlabCache.cacheKey,
      timestamp: gitlabCache.timestamp,
      hasSubject: !!subject,
    });

    return new Promise((resolve) => {
      chrome.storage.local.set({ gitlabCache: cacheData }, () => {
        if (chrome.runtime.lastError) {
          logError('GitLab storage save failed: ', chrome.runtime.lastError);
          resolve(false);
        } else {
          log('GitLab cache saved successfully');
          gitlabCache.data = data;
          gitlabCache.subject = subject;
          resolve(true);
        }
      });
    });
  }

  function loadFromStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['githubCache', 'gitlabCache'], (items) => {
        if (items.githubCache) {
          githubCache.data = items.githubCache.data;
          githubCache.cacheKey = items.githubCache.cacheKey;
          githubCache.timestamp = items.githubCache.timestamp;
          githubCache.subject = items.githubCache.subject;
          log('Restored GitHub cache from storage');
        }
        if (items.gitlabCache) {
          gitlabCache.data = items.gitlabCache.data;
          gitlabCache.cacheKey = items.gitlabCache.cacheKey;
          gitlabCache.timestamp = items.gitlabCache.timestamp;
          gitlabCache.subject = items.gitlabCache.subject;
          log('Restored GitLab cache from storage');
        }
        resolve();
      });
    });
  }

  async function fetchGithubData() {
    const cacheKey = `${githubUsername}-${startingDate}-${endingDate}`;

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

    if (githubCache.data && isCacheFresh && isCacheKeyMatch) {
      log('Using cached data - cache is fresh and key matches');
      processGithubData(githubCache.data);
      return Promise.resolve();
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

    let issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+created%3A${startingDate}..${endingDate}&per_page=100`;
    let prUrl = `https://api.github.com/search/issues?q=commenter%3A${githubUsername}+org%3Afossasia+updated%3A${startingDate}..${endingDate}&per_page=100`;
    let userUrl = `https://api.github.com/users/${githubUsername}`;

    try {
      // throttling 500ms to avoid burst
      await new Promise(res => setTimeout(res, 500));

      const [issuesRes, prRes, userRes] = await Promise.all([
        fetch(issueUrl),
        fetch(prUrl),
        fetch(userUrl),
      ]);

      if (!issuesRes.ok) throw new Error(`Error fetching Github issues: ${issuesRes.status} ${issuesRes.statusText}`);
      if (!prRes.ok) throw new Error(`Error fetching Github PR review data: ${prRes.status} ${prRes.statusText}`);
      if (!userRes.ok) throw new Error(`Error fetching Github userdata: ${userRes.status} ${userRes.statusText}`);

      githubIssuesData = await issuesRes.json();
      githubPrsReviewData = await prRes.json();
      githubUserData = await userRes.json();

      // Cache the data
      githubCache.data = { githubIssuesData, githubPrsReviewData, githubUserData };
      githubCache.timestamp = Date.now();

      await saveToStorage(githubCache.data);
      processGithubData(githubCache.data);

      // Resolve queued calls
      githubCache.queue.forEach(({ resolve }) => resolve());
      githubCache.queue = [];
    } catch (err) {
      logError('Fetch Failed:', err);
      // Reject queued calls on error
      githubCache.queue.forEach(({ reject }) => reject(err));
      githubCache.queue = [];
      githubCache.fetching = false;
      throw err;
    } finally {
      githubCache.fetching = false;
    }
  }

  async function fetchGitLabData() {
    const cacheKey = `${gitlabUsername}-${startingDate}-${endingDate}`;

    if (gitlabCache.fetching || (gitlabCache.cacheKey === cacheKey && gitlabCache.data)) {
      log('GitLab fetch already in progress or data already fetched. Skipping fetch.');
      return;
    }

    log('Fetching GitLab data:', {
      username: gitlabUsername,
      startDate: startingDate,
      endDate: endingDate,
    });

    log('GitLab CacheKey in cache:', gitlabCache.cacheKey);
    log('Incoming GitLab cacheKey:', cacheKey);
    log('Has GitLab data:', !!gitlabCache.data);

    // Check if we need to load from storage
    if (!gitlabCache.data && !gitlabCache.fetching) {
      await loadFromStorage();
    };

    const currentTTL = await getCacheTTL();
    gitlabCache.ttl = currentTTL;
    log(`GitLab caching for ${currentTTL / (60 * 1000)} minutes`);

    const now = Date.now();
    const isCacheFresh = (now - gitlabCache.timestamp) < gitlabCache.ttl;
    const isCacheKeyMatch = gitlabCache.cacheKey === cacheKey;

    if (gitlabCache.data && isCacheFresh && isCacheKeyMatch) {
      log('Using cached GitLab data - cache is fresh and key matches');
      processGitLabData(gitlabCache.data);
      return Promise.resolve();
    }
    // if cache key does not match our cache is stale, fetch new data
    if (!isCacheKeyMatch) {
      log('GitLab cache key mismatch - fetching new Data');
      gitlabCache.data = null;
    } else if (!isCacheFresh) {
      log('GitLab cache is stale - fetching new data');
    }

    // if fetching is in progress, queue the calls and return a promise resolved when done
    if (gitlabCache.fetching) {
      log('GitLab fetch in progress, queuing requests');
      return new Promise((resolve, reject) => {
        gitlabCache.queue.push({ resolve, reject });
      });
    }

    gitlabCache.fetching = true;
    gitlabCache.cacheKey = cacheKey;

    try {
      // Use the GitLabHelper class to fetch data
      const gitlabHelper = new GitLabHelper();
      const gitlabData = await gitlabHelper.fetchGitLabData(gitlabUsername, startingDate, endingDate);

      // Cache the data
      gitlabCache.data = gitlabData;
      gitlabCache.timestamp = Date.now();

      await saveGitLabToStorage(gitlabCache.data);
      processGitLabData(gitlabCache.data);

      // Resolve queued calls
      gitlabCache.queue.forEach(({ resolve }) => resolve());
      gitlabCache.queue = [];
    } catch (err) {
      logError('GitLab Fetch Failed:', err);
      // Reject queued calls on error
      gitlabCache.queue.forEach(({ reject }) => reject(err));
      gitlabCache.queue = [];
      gitlabCache.fetching = false;
      throw err;
    } finally {
      gitlabCache.fetching = false;
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

  function processGithubData(data) {
    log('Processing Github data');
    githubIssuesData = data.githubIssuesData;
    githubPrsReviewData = data.githubPrsReviewData;
    githubUserData = data.githubUserData;

    log('GitHub data set:', {
      issues: githubIssuesData?.items?.length || 0,
      prs: githubPrsReviewData?.items?.length || 0,
      user: githubUserData?.login
    });

    lastWeekArray = [];
    nextWeekArray = [];
    reviewedPrsArray = [];
    githubPrsReviewDataProcessed = {};

    // Update subject
    if (!githubCache.subject && scrumSubject) {
      scrumSubjectLoaded();
    }
  }

  function processGitLabData(data) {
    log('Processing GitLab data');
    gitlabIssuesData = data.issues;
    gitlabMergeRequestsData = data.mergeRequests;
    gitlabCommentsData = data.comments;
    gitlabUserData = data.user;
    gitlabProjects = data.projects || [];

    log('GitLab data set:', {
      issues: gitlabIssuesData?.length || 0,
      mergeRequests: gitlabMergeRequestsData?.length || 0,
      comments: gitlabCommentsData?.length || 0,
      user: gitlabUserData?.username
    });

    lastWeekArray = [];
    nextWeekArray = [];
    reviewedPrsArray = [];
    gitlabPrsReviewDataProcessed = {};

    // Update subject
    if (!gitlabCache.subject && scrumSubject) {
      scrumSubjectLoaded();
    }
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
        content = `<b>1. What did I do ${weekOrDay}?</b>
${lastWeekUl}<br>
<b>2. What do I plan to do ${weekOrDay2}?</b>
${nextWeekUl}<br>
<b>3. What is blocking me from making progress?</b><br>
${userReason}`;
      } else {
        content = `<b>1. What did I do during the period?</b>
${lastWeekUl}<br>
<b>2. What do I plan to do next?</b>
${nextWeekUl}<br>
<b>3. What is blocking me from making progress?</b><br>
${userReason}`;
      }

      if (outputTarget === 'popup') {
        const scrumReport = document.getElementById('scrumReport');
        if (scrumReport) {
          scrumReport.innerHTML = content;
        }
        const generateBtn = document.getElementById('generateReport');
        if (generateBtn) {
          generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
          generateBtn.disabled = false;
        }
      } else if (outputTarget === 'email' && scrumBody) {
        scrumBody.innerHTML = content;
        hasInjectedContent = true;
      }
    }, 100);
  }

  function scrumSubjectLoaded() {
    try {
      if (!enableToggle || hasInjectedContent) return;
      if (!scrumSubject) {
        console.error('Subject element not found');
        return;
      }
      setTimeout(() => {
        const selectedPlatform = chrome.storage.local.get(['selectedPlatform'], (result) => {
          const platform = result.selectedPlatform || 'github';
          let name, userData;

          if (platform === 'github') {
            name = githubUserData?.name || githubUsername;
            userData = githubUserData;
          } else {
            name = gitlabUserData?.name || gitlabUsername;
            userData = gitlabUserData;
          }

          let project = projectName || '<project name>';
          let curDate = new Date();
          let year = curDate.getFullYear().toString();
          let date = curDate.getDate();
          let month = curDate.getMonth();
          month++;
          if (month < 10) month = '0' + month;
          if (date < 10) date = '0' + date;
          let dateCode = year.toString() + month.toString() + date.toString();

          const subject = `[Scrum] ${name} - ${project} - ${dateCode} - False`;
          log('Generated subject:', subject);

          if (platform === 'github') {
            githubCache.subject = subject;
            saveToStorage(githubCache.data, subject);
          } else {
            gitlabCache.subject = subject;
            saveGitLabToStorage(gitlabCache.data, subject);
          }

          if (scrumSubject && scrumSubject.value !== subject) {
            scrumSubject.value = subject;
            scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
      });
    } catch (err) {
      console.err('Error while setting subject: ', err);
    }
  }

  function writeGithubPrsReviews() {
    let items = githubPrsReviewData.items;
    log('Processing PR reviews:', {
      hasItems: !!items,
      count: items?.length || 0
    });

    if (!items || items.length === 0) {
      log('No PR reviews found');
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

      if (item.pull_request) {
        if (item.state === 'closed') {
          li = `<li><i>(${project})</i> - Reviewed PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
        } else if (item.state === 'open') {
          li = `<li><i>(${project})</i> - Reviewed PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_unmerged_button}</li>`;
        }
      }
      reviewedPrsArray.push(li);
    }
    writeScrumBody();
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

      if (item.pull_request) {
        if (item.state === 'closed') {
          li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
        } else if (item.state === 'open') {
          li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_unmerged_button}</li>`;
        }
      } else {
        // is a issue
        if (item.state === 'open' && item.body?.toUpperCase().indexOf('YES') > 0) {
          //probably the author wants to work on this issue!
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
      }
      lastWeekArray.push(li);
    }
    writeScrumBody();
  }

  function writeGitLabMergeRequests() {
    let mergeRequests = gitlabMergeRequestsData;
    log('Processing GitLab merge requests:', {
      hasItems: !!mergeRequests,
      count: mergeRequests?.length || 0
    });

    if (!mergeRequests || mergeRequests.length === 0) {
      log('No GitLab merge requests found');
      return;
    }

    for (let i = 0; i < mergeRequests.length; i++) {
      let mr = mergeRequests[i];
      let project = getGitLabProjectName(mr.project_id);
      let title = mr.title || 'Untitled MR';
      let number = mr.iid || mr.id || '';
      let mrUrl = mr.web_url || '#';
      let mrState = mr.state || 'unknown';
      let li = '';
      if (mr.author && gitlabUsername && mr.author.username === gitlabUsername) {
        // User created this MR
        if (mrState === 'merged') {
          li = `<li data-gitlab-project-id='${mr.project_id}'><i>(${project})</i> - Made MR (#${number}) - <a href='${mrUrl}' target='_blank'>${title}</a> ${pr_merged_button}</li>`;
        } else if (mrState === 'opened') {
          li = `<li data-gitlab-project-id='${mr.project_id}'><i>(${project})</i> - Made MR (#${number}) - <a href='${mrUrl}' target='_blank'>${title}</a> ${pr_unmerged_button}</li>`;
        }
        lastWeekArray.push(li);
      } else {
        // User reviewed this MR
        if (mrState === 'merged') {
          li = `<li data-gitlab-project-id='${mr.project_id}'><i>(${project})</i> - Reviewed MR (#${number}) - <a href='${mrUrl}' target='_blank'>${title}</a> ${pr_merged_button}</li>`;
        } else if (mrState === 'opened') {
          li = `<li data-gitlab-project-id='${mr.project_id}'><i>(${project})</i> - Reviewed MR (#${number}) - <a href='${mrUrl}' target='_blank'>${title}</a> ${pr_unmerged_button}</li>`;
        }
        reviewedPrsArray.push(li);
      }
    }
    writeScrumBody();
  }

  function writeGitLabIssues() {
    let issues = gitlabIssuesData;
    log('Processing GitLab issues:', {
      hasItems: !!issues,
      count: issues?.length || 0
    });

    if (!issues || issues.length === 0) {
      log('No GitLab issues found');
      return;
    }

    for (let i = 0; i < issues.length; i++) {
      let issue = issues[i];
      let project = getGitLabProjectName(issue.project_id);
      let title = issue.title || 'Untitled Issue';
      let number = issue.iid || issue.id || '';
      let issueUrl = issue.web_url || '#';
      let issueState = issue.state || 'unknown';
      let li = '';
      if (issueState === 'opened') {
        li = `<li data-gitlab-project-id='${issue.project_id}'><i>(${project})</i> - Opened Issue(#${number}) - <a href='${issueUrl}' target='_blank'>${title}</a> ${issue_opened_button}</li>`;
      } else if (issueState === 'closed') {
        li = `<li data-gitlab-project-id='${issue.project_id}'><i>(${project})</i> - Opened Issue(#${number}) - <a href='${issueUrl}' target='_blank'>${title}</a> ${issue_closed_button}</li>`;
      } else {
        li = `<li data-gitlab-project-id='${issue.project_id}'><i>(${project})</i> - Opened Issue(#${number}) - <a href='${issueUrl}' target='_blank'>${title}</a></li>`;
      }
      lastWeekArray.push(li);
    }
    writeScrumBody();
  }

  function writeGitLabComments() {
    // Comments are not being fetched for GitLab, so this function is empty
    // This prevents errors when the interval tries to call this function
    return;
  }

  let intervalBody = setInterval(() => {
    if (!window.emailClientAdapter) return;

    const elements = window.emailClientAdapter.getEditorElements();
    if (!elements || !elements.body) return;

    clearInterval(intervalBody);
    scrumBody = elements.body;
    writeScrumBody();
  }, 500);

  let intervalSubject = setInterval(() => {
    const selectedPlatform = chrome.storage.local.get(['selectedPlatform'], (result) => {
      const platform = result.selectedPlatform || 'github';
      let userData;

      if (platform === 'github') {
        userData = githubUserData;
      } else {
        userData = gitlabUserData;
      }

      if (!userData || !window.emailClientAdapter) return;

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
    });
  }, 500);

  //check for github safe writing
  let intervalWriteGithubIssues = setInterval(() => {
    if (outputTarget === 'popup') {
      if (githubUsername && githubIssuesData) {
        clearInterval(intervalWriteGithubIssues);
        writeGithubIssuesPrs();
      }
    } else {
      if (scrumBody && githubUsername && githubIssuesData) {
        clearInterval(intervalWriteGithubIssues);
        writeGithubIssuesPrs();
      }
    }
  }, 500);
  let intervalWriteGithubPrs = setInterval(() => {
    if (outputTarget === 'popup') {
      if (githubUsername && githubPrsReviewData) {
        clearInterval(intervalWriteGithubPrs);
        writeGithubPrsReviews();
      }
    } else {
      if (scrumBody && githubUsername && githubPrsReviewData) {
        clearInterval(intervalWriteGithubPrs);
        writeGithubPrsReviews();
      }
    }
  }, 500);

  //check for gitlab safe writing
  let intervalWriteGitLabIssues = setInterval(() => {
    if (outputTarget === 'popup') {
      if (gitlabUsername && gitlabIssuesData) {
        clearInterval(intervalWriteGitLabIssues);
        writeGitLabIssues();
      }
    } else {
      if (scrumBody && gitlabUsername && gitlabIssuesData) {
        clearInterval(intervalWriteGitLabIssues);
        writeGitLabIssues();
      }
    }
  }, 500);

  let intervalWriteGitLabMergeRequests = setInterval(() => {
    if (outputTarget === 'popup') {
      if (gitlabUsername && gitlabMergeRequestsData) {
        clearInterval(intervalWriteGitLabMergeRequests);
        writeGitLabMergeRequests();
      }
    } else {
      if (scrumBody && gitlabUsername && gitlabMergeRequestsData) {
        clearInterval(intervalWriteGitLabMergeRequests);
        writeGitLabMergeRequests();
      }
    }
  }, 500);

  let intervalWriteGitLabComments = setInterval(() => {
    // Comments are not being fetched for GitLab, so this interval is disabled
    clearInterval(intervalWriteGitLabComments);
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

  function getGitLabProjectName(projectId) {
    if (!projectId) return 'Unknown Project';
    if (!gitlabProjects || !Array.isArray(gitlabProjects)) gitlabProjects = [];
    // 1. Try local projects array
    const project = gitlabProjects.find(p => p.id === projectId);
    if (project) return project.name;
    // 2. Try cache
    if (gitlabProjectNameCache[projectId]) return gitlabProjectNameCache[projectId];
    // 3. Fetch from GitLab API and cache
    const apiUrl = `https://gitlab.com/api/v4/projects/${projectId}`;
    fetch(apiUrl)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.name) {
          gitlabProjectNameCache[projectId] = data.name;
          // Update all displayed project names in the DOM if needed
          document.querySelectorAll(`li[data-gitlab-project-id='${projectId}'] i`).forEach(el => {
            el.textContent = `(${data.name})`;
          });
        }
      });
    return 'Loading...';
  }
}

// Only call allIncluded for email contexts, not popup contexts
allIncluded('email');

$('button>span:contains(New conversation)').parent('button').click(() => {
  allIncluded();
});

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

function log(...args) {
  console.log('[ScrumHelper]', ...args);
}

function logError(...args) {
  console.error('[ScrumHelper]', ...args);
} 
