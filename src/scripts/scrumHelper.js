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
	let projectName = '';
	let lastWeekArray = [];
	let nextWeekArray = [];
	let reviewedPrsArray = [];
	let commitsArray = [];
	let githubIssuesData = null;
	let lastWeekContribution = false;
	let yesterdayContribution = false;
	let githubPrsReviewData = null;
	let githubUserData = null;
	let githubPrsReviewDataProcessed = {};
	let githubCommitsData = {};
	let showOpenLabel = true;
	let showClosedLabel = true;
	let userReason = '';

	let pr_merged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	let pr_unmerged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

	let issue_closed_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	let issue_opened_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

	// let linkStyle = '';
	function getChromeData() {
		console.log("Getting Chrome data for context:", outputTarget);
		chrome.storage.local.get(
			[
				'githubUsername',
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
				'cacheInput'
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
				if (items.githubUsername) {
					githubUsername = items.githubUsername;
					console.log("About to fetch GitHub data for:", githubUsername);
					fetchGithubData();
				} else {
					if (outputTarget === 'popup') {
						console.log("No username found - popup context");
						// Show error in popup
						const generateBtn = document.getElementById('generateReport');
						if (generateBtn) {
							generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
							generateBtn.disabled = false;
						}
						Materialize.toast('Please enter your GitHub username', 3000);
					} else {
						console.log("No username found - email context");
						console.warn('No GitHub username found in storage');
					}
				}
				if (items.projectName) {
					projectName = items.projectName;
				}
				if (items.cacheInput) {
					cacheInput = items.cacheInput;
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
					log('Restored cache from storage');
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

				if (cache.subject && scrumSubject) {
					scrumSubject.value = cache.subject;
					scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
				}
				resolve(true);
			});
		});
	}

	async function fetchGithubIssues() {
		const cacheKey = `${githubUsername}-${startingDate}-${endingDate}`;

		if (githubCache.fetching || (githubCache.cacheKey === cacheKey && githubCache.data)) {
			log('Fetch already in progress or data already fetched. Skipping fetch.');
			return githubCache.data;
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
		}

		const currentTTL = await getCacheTTL();
		githubCache.ttl = currentTTL;
		log(`Caching for ${currentTTL / (60 * 1000)} minutes`);

		const now = Date.now();
		const isCacheFresh = (now - githubCache.timestamp) < githubCache.ttl;
		const isCacheKeyMatch = githubCache.cacheKey === cacheKey;

		if (githubCache.data && isCacheFresh && isCacheKeyMatch) {
			log('Using cached data - cache is fresh and key matches');
			return githubCache.data;
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
			// Add longer delay between requests to avoid rate limiting
			await new Promise(res => setTimeout(res, 1000));

			// Fetch issues first
			const issuesRes = await fetch(issueUrl);
			if (!issuesRes.ok) {
				if (issuesRes.status === 403) {
					throw new Error('GitHub API rate limit exceeded. Please wait a few minutes before trying again.');
				}
				throw new Error(`Error fetching Github issues: ${issuesRes.status} ${issuesRes.statusText}`);
			}
			githubIssuesData = await issuesRes.json();

			// Add delay between requests
			await new Promise(res => setTimeout(res, 1000));

			// Fetch PR reviews
			const prRes = await fetch(prUrl);
			if (!prRes.ok) {
				if (prRes.status === 403) {
					throw new Error('GitHub API rate limit exceeded. Please wait a few minutes before trying again.');
				}
				throw new Error(`Error fetching Github PR review data: ${prRes.status} ${prRes.statusText}`);
			}
			githubPrsReviewData = await prRes.json();

			// Add delay between requests
			await new Promise(res => setTimeout(res, 1000));

			// Fetch user data
			const userRes = await fetch(userUrl);
			if (!userRes.ok) {
				if (userRes.status === 403) {
					throw new Error('GitHub API rate limit exceeded. Please wait a few minutes before trying again.');
				}
				throw new Error(`Error fetching Github userdata: ${userRes.status} ${userRes.statusText}`);
			}
			githubUserData = await userRes.json();

			// Cache the data
			const data = { githubIssuesData, githubPrsReviewData, githubUserData, githubCommitsData };
			githubCache.data = data;
			githubCache.timestamp = Date.now();

			await saveToStorage(githubCache.data);

			// Resolve queued calls
			githubCache.queue.forEach(({ resolve }) => resolve(data));
			githubCache.queue = [];

			return data;
		} catch (err) {
			logError('Fetch Failed:', err);
			// Reject queued calls on error
			githubCache.queue.forEach(({ reject }) => reject(err));
			githubCache.queue = [];
			throw err;
		} finally {
			githubCache.fetching = false;
		}
	}

	async function fetchCommitsForOpenPRs() {
		if (!githubIssuesData?.items) {
			logError('No GitHub issues data available for fetching commits');
			return;
		}

		log('Starting to fetch commits for open PRs');
		githubCommitsData = {};
		const openPRs = githubIssuesData.items.filter(item =>
			item.pull_request && item.state === 'open'
		);

		log(`Found ${openPRs.length} open PRs to fetch commits for`);

		for (const pr of openPRs) {
			const repoUrl = pr.repository_url;
			const repoName = repoUrl.substr(repoUrl.lastIndexOf('/') + 1);
			const commitsUrl = `https://api.github.com/repos/fossasia/${repoName}/pulls/${pr.number}/commits`;

			log(`Fetching commits for PR #${pr.number} in ${repoName}`);

			try {
				// Add delay to avoid rate limiting
				await new Promise(res => setTimeout(res, 1000));

				const commitsRes = await fetch(commitsUrl);
				if (!commitsRes.ok) {
					if (commitsRes.status === 403) {
						logError(`Rate limit exceeded while fetching commits for PR #${pr.number} in ${repoName}`);
						continue;
					}
					logError(`Failed to fetch commits for PR #${pr.number} in ${repoName}: ${commitsRes.status} ${commitsRes.statusText}`);
					continue;
				}

				const commits = await commitsRes.json();
				if (!Array.isArray(commits)) {
					logError(`Invalid commits data for PR #${pr.number} in ${repoName}`);
					continue;
				}

				log(`Found ${commits.length} commits for PR #${pr.number} in ${repoName}`);

				// Filter commits by author and date range
				const filteredCommits = commits.filter(commit => {
					const commitDate = new Date(commit.commit.author.date);
					const startDate = new Date(startingDate);
					const endDate = new Date(endingDate);
					const isAuthorMatch = commit.author?.login === githubUsername;
					const isDateInRange = commitDate >= startDate && commitDate <= endDate;

					if (isAuthorMatch && isDateInRange) {
						log(`Found matching commit: ${commit.commit.message.split('\n')[0]} (${commitDate.toLocaleDateString()})`);
					}

					return isAuthorMatch && isDateInRange;
				});

				log(`Filtered to ${filteredCommits.length} commits within date range for PR #${pr.number}`);

				if (filteredCommits.length > 0) {
					if (!githubCommitsData[repoName]) {
						githubCommitsData[repoName] = {};
					}
					githubCommitsData[repoName][pr.number] = filteredCommits;
					log(`Stored ${filteredCommits.length} commits for PR #${pr.number} in ${repoName}`);
				}
			} catch (err) {
				logError(`Error fetching commits for PR #${pr.number} in ${repoName}:`, err);
			}
		}

		log('Finished fetching commits for open PRs');
		log('Commits data structure:', githubCommitsData);
	}

	async function fetchGithubData() {
		log('Fetching Github data');
		try {
			const data = await fetchGithubIssues();
			if (data) {
				// Process all data together
				await processAllData(data);
			}
		} catch (err) {
			logError('Error fetching GitHub data:', err);
		}
	}

	async function processAllData(data) {
		log('Processing all GitHub data');
		try {
			// Process initial data
			processGithubData(data);

			// Fetch commits
			await fetchCommitsForOpenPRs();

			// Process PR reviews
			await processPrReviews();

			// Write the complete report
			writeGithubIssuesPrs();
		} catch (err) {
			logError('Error processing GitHub data:', err);
		}
	}

	async function processPrReviews() {
		log('Processing PR reviews');
		if (!githubPrsReviewData?.items) {
			logError('No PR review data available');
			return;
		}

		reviewedPrsArray = [];
		githubPrsReviewDataProcessed = {};

		for (let i = 0; i < githubPrsReviewData.items.length; i++) {
			let item = githubPrsReviewData.items[i];
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
		log('Finished processing PR reviews');
	}

	function processGithubData(data) {
		log('Processing Github data');
		githubIssuesData = data.githubIssuesData;
		githubPrsReviewData = data.githubPrsReviewData;
		githubUserData = data.githubUserData;
		githubCommitsData = data.githubCommitsData || {}; // Ensure commits data is restored

		log('GitHub data set:', {
			issues: githubIssuesData?.items?.length || 0,
			prs: githubPrsReviewData?.items?.length || 0,
			user: githubUserData?.login,
			commits: Object.keys(githubCommitsData).length // Add commits count to logging
		});

		lastWeekArray = [];
		nextWeekArray = [];
		reviewedPrsArray = [];
		commitsArray = []; // Reset commits array
		githubPrsReviewDataProcessed = {};

		// Update subject
		if (!githubCache.subject && scrumSubject) {
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
			// Generate content with consistent formatting
			let lastWeekUl = '<ul style="margin: 10px 0;">';
			for (let i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
			for (let i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
			for (let i = 0; i < commitsArray.length; i++) lastWeekUl += commitsArray[i];
			lastWeekUl += '</ul>';

			let nextWeekUl = '<ul style="margin: 10px 0;">';
			for (let i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
			nextWeekUl += '</ul>';

			let weekOrDay = lastWeekContribution ? 'last week' : (yesterdayContribution ? 'yesterday' : 'the period');
			let weekOrDay2 = lastWeekContribution ? 'this week' : 'today';

			// Create the complete content with consistent spacing
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

			// Update the UI
			if (outputTarget === 'popup') {
				const scrumReport = document.getElementById('scrumReport');
				if (scrumReport) {
					log("Updating scrum report content");
					scrumReport.innerHTML = content;

					// Reset generate button
					const generateBtn = document.getElementById('generateReport');
					if (generateBtn) {
						generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
						generateBtn.disabled = false;
					}
				} else {
					logError('Scrum report div not found');
				}
			} else {
				const elements = window.emailClientAdapter.getEditorElements();
				if (!elements || !elements.body) {
					console.error('Email client editor not found');
					return;
				}
				window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
				hasInjectedContent = true;
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

				const subject = `[Scrum] ${name} - ${project} - ${dateCode} - False`;
				log('Generated subject:', subject);
				githubCache.subject = subject;
				saveToStorage(githubCache.data, subject);

				if (scrumSubject && scrumSubject.value !== subject) {
					scrumSubject.value = subject;
					scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
				}
			});
		} catch (err) {
			console.err('Error while setting subject: ', err);
		}
	}

	function writeGithubIssuesPrs() {
		let items = githubIssuesData.items;
		if (!items) {
			logError('No Github issues data available');
			return;
		}

		log('Starting to process GitHub data for scrum report');
		log('Commits data available:', githubCommitsData);

		// Reset arrays
		lastWeekArray = [];
		nextWeekArray = [];
		commitsArray = [];
		reviewedPrsArray = [];

		// Process all sections in a single pass
		const processAllSections = () => {
			// Process issues and PRs
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
					if (item.state === 'closed') {
						li = `<li><i>(${project})</i> - Made Issue (#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_button}</li>`;
					} else if (item.state === 'open') {
						li = `<li><i>(${project})</i> - Made Issue (#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
					}
				}
				lastWeekArray.push(li);
			}

			// Process commits
			const commitsByRepo = {};
			for (const repoName in githubCommitsData) {
				for (const prNumber in githubCommitsData[repoName]) {
					const commits = githubCommitsData[repoName][prNumber];
					if (!commitsByRepo[repoName]) {
						commitsByRepo[repoName] = [];
					}
					commitsByRepo[repoName].push({
						prNumber,
						commits
					});
				}
			}

			// Add commits section
			for (const repoName in commitsByRepo) {
				let repoLi = `<li><i>(${repoName})</i> - Made Commits in PRs:`;
				repoLi += '<ul style="margin-left: 20px;">';

				commitsByRepo[repoName].forEach(({ prNumber, commits }) => {
					commits.forEach(commit => {
						const prUrl = `https://github.com/fossasia/${repoName}/pull/${prNumber}`;
						const commitMessage = commit.commit.message.split('\n')[0];
						repoLi += `<li style="margin: 5px 0;">Commit: ${commitMessage} - <a href='${prUrl}' target='_blank'>PR #${prNumber}</a></li>`;
					});
				});

				repoLi += '</ul></li>';
				commitsArray.push(repoLi);
			}

			// Process PR reviews
			if (githubPrsReviewData?.items) {
				for (let i = 0; i < githubPrsReviewData.items.length; i++) {
					let item = githubPrsReviewData.items[i];
					if (item.user.login == githubUsername || !item.pull_request) continue;

					let html_url = item.html_url;
					let repository_url = item.repository_url;
					let project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
					let title = item.title;
					let number = item.number;

					let li = '';
					if (item.state === 'closed') {
						li = `<li><i>(${project})</i> - Reviewed PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
					} else if (item.state === 'open') {
						li = `<li><i>(${project})</i> - Reviewed PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_unmerged_button}</li>`;
					}
					reviewedPrsArray.push(li);
				}
			}
		};

		// Process all sections at once
		processAllSections();
		log('Finished processing all sections');
		writeScrumBody();
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

// Modify the generate report button click handler
document.getElementById('generateReport')?.addEventListener('click', async function () {
	const button = this;
	button.disabled = true;
	button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';

	try {
		await fetchGithubData();
	} catch (error) {
		console.error('Error generating report:', error);
		Materialize.toast(error.message || 'Error generating report. Please try again.', 3000);
	} finally {
		button.disabled = false;
		button.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
	}
});