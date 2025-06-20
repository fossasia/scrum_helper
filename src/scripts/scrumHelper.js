// REMINDER: To avoid GitHub API 403 errors, use a personal access token (PAT) for authenticated requests.
// Example usage in fetch:
// const headers = { 'Authorization': 'token YOUR_PERSONAL_ACCESS_TOKEN' };
// fetch(url, { headers });
// DO NOT hardcode your token in code you commit or share.
console.log('Script loaded, adapter exists:', !!window.emailClientAdapter);
let refreshButton_Placed = false;
let enableToggle = true;
let hasInjectedContent = false;
let userPrCommitsData = null; // Will hold { [pr_number]: [commit objects] }
let userPrCommitsArray = [];
let userPrCommitsProcessed = false;
let allOpenUserPrs = [];
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
	let githubIssuesData = null;
	let lastWeekContribution = false;
	let yesterdayContribution = false;
	let githubPrsReviewData = null;
	let githubUserData = null;
	let githubPrsReviewDataProcessed = {};
	let issuesDataProcessed = false;
	let prsReviewDataProcessed = false;
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

	// Toast utility for API limit
	function showApiLimitToast() {
		// Remove any existing toast
		const oldToast = document.getElementById('api-limit-toast');
		if (oldToast) oldToast.remove();
		// Create toast
		const toast = document.createElement('div');
		toast.id = 'api-limit-toast';
		toast.style.position = 'fixed';
		toast.style.top = '0';
		toast.style.left = '0';
		toast.style.width = '100%';
		toast.style.background = '#f87171';
		toast.style.color = '#fff';
		toast.style.padding = '6px 0';
		toast.style.borderRadius = '0 0 8px 8px';
		toast.style.fontSize = '1em';
		toast.style.zIndex = '9999';
		toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
		toast.style.display = 'flex';
		toast.style.alignItems = 'center';
		toast.style.justifyContent = 'center';
		toast.innerHTML = `<span><b>GitHub API limit exceeded.</b></span><button style='margin-left:12px;background:none;border:none;color:#fff;font-size:1.2em;cursor:pointer;' onclick='this.parentNode.remove()'>&times;</button>`;
		document.body.appendChild(toast);
		setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
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

		if (githubCache.data && isCacheFresh & isCacheKeyMatch) {
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

			if (issuesRes.status === 403 || prRes.status === 403 || userRes.status === 403) {
				showApiLimitToast();
				throw new Error('GitHub API rate limit exceeded (403)');
			}

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

		// Find all open PRs authored by the user (regardless of creation date)
		const openUserPrs = (data.githubIssuesData.items || []).filter(item => item.pull_request && item.state === 'open' && item.user.login === githubUsername);
		// Try to load from cache first
		if (data.userPrCommitsData) {
			processUserPrCommits(data.userPrCommitsData);
		} else if (openUserPrs.length > 0) {
			fetchUserPrCommits(openUserPrs);
		} else {
			userPrCommitsProcessed = true;
			triggerScrumGeneration();
		}

		// For the commit section, fetch all open PRs authored by the user (not time-limited)
		fetchAllOpenUserPrs();
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
			// Insert user PR commits section here
			if (userPrCommitsArray.length > 0) {
				lastWeekUl += '<li>Commits made:<ul>';
				for (let j = 0; j < userPrCommitsArray.length; j++) lastWeekUl += userPrCommitsArray[j];
				lastWeekUl += '</ul></li>';
			}
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
			console.err('Error while setting subject: ', err);
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
					else prText += issue_closed_button;

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
					else prText1 += issue_closed_button;

					prText1 += '&nbsp;&nbsp;</li>';
					repoLi += prText1;
				}
				repoLi += '</ul>';
			}
			repoLi += '</li>';
			reviewedPrsArray.push(repoLi);
		}

		prsReviewDataProcessed = true;
		triggerScrumGeneration();
	}

	function triggerScrumGeneration() {
		if (issuesDataProcessed && prsReviewDataProcessed && userPrCommitsProcessed) {
			log('All data sets processed, generating scrum body.');
			writeScrumBody();
		} else {
			log('Waiting for all data to be processed before generating scrum.', {
				issues: issuesDataProcessed,
				reviews: prsReviewDataProcessed,
				commits: userPrCommitsProcessed
			});
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

			if (item.pull_request) {
				if (item.state === 'closed') {
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
				} else if (item.state === 'open') {
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_unmerged_button}</li>`;
				}
			} else {
				// is a issue
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
		issuesDataProcessed = true;
		triggerScrumGeneration();
	}

	async function fetchUserPrCommits(openPrs) {
		userPrCommitsData = {};
		const batchSize = 5; // GitHub rate limit safety
		const delay = 1000; // 1s between batches
		let batch = [];
		for (let i = 0; i < openPrs.length; i++) {
			const pr = openPrs[i];
			const repoUrlParts = pr.repository_url.split('/');
			const owner = repoUrlParts[repoUrlParts.length - 2];
			const repo = repoUrlParts[repoUrlParts.length - 1];
			const prNumber = pr.number;
			const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`;
			batch.push({ pr, commitsUrl });
			if (batch.length === batchSize || i === openPrs.length - 1) {
				await Promise.all(batch.map(async ({ pr, commitsUrl }) => {
					try {
						const res = await fetch(commitsUrl);
						if (res.status === 403) {
							showApiLimitToast();
							throw new Error('GitHub API rate limit exceeded (403)');
						}
						if (!res.ok) throw new Error(`Error fetching commits for PR #${pr.number}: ${res.status}`);
						const commits = await res.json();
						// Filter commits by user and by date range
						const userCommits = commits.filter(c => {
							if (!c.author || c.author.login !== githubUsername) return false;
							const commitDate = new Date(c.commit.author.date);
							const start = new Date(startingDate);
							const end = new Date(endingDate);
							// Inclusive range
							return commitDate >= start && commitDate <= end;
						});
						if (userCommits.length > 0) {
							userPrCommitsData[pr.number] = { pr, commits: userCommits };
						}
					} catch (err) {
						logError('Failed to fetch commits for PR', pr.number, err);
					}
				}));
				batch = [];
				if (i !== openPrs.length - 1) await new Promise(res => setTimeout(res, delay));
			}
		}
		githubCache.data.userPrCommitsData = userPrCommitsData;
		await saveToStorage(githubCache.data);
		processUserPrCommits(userPrCommitsData);
	}

	function processUserPrCommits(data) {
		userPrCommitsArray = [];
		if (!data || Object.keys(data).length === 0) {
			userPrCommitsProcessed = true;
			triggerScrumGeneration();
			return;
		}
		for (const prNum in data) {
			const { pr, commits } = data[prNum];
			let prSection = `<li><i>(${pr.repository_url.substr(pr.repository_url.lastIndexOf('/') + 1)})</i> - Commits on PR <a href='${pr.html_url}' target='_blank'>#${pr.number}</a> (${pr.title})<ul>`;
			for (const commit of commits) {
				prSection += `<li><a href='${commit.html_url}' target='_blank'>${commit.commit.message.split('\n')[0]}</a></li>`;
			}
			prSection += '</ul></li>';
			userPrCommitsArray.push(prSection);
		}
		userPrCommitsProcessed = true;
		triggerScrumGeneration();
	}

	let intervalBody = setInterval(() => {
		if (!window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.body) return;

		clearInterval(intervalBody);
		scrumBody = elements.body;
		// writeScrumBody(); // This call is premature and causes the issue.
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

	// Add a function to fetch all open PRs authored by the user (not time-limited)
	async function fetchAllOpenUserPrs() {
		const openPrsUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+is%3Apr+is%3Aopen+org%3Afossasia&per_page=100`;
		try {
			const res = await fetch(openPrsUrl);
			if (!res.ok) throw new Error(`Error fetching all open PRs: ${res.status}`);
			const data = await res.json();
			allOpenUserPrs = data.items || [];
			// After fetching, proceed to fetch commits for these PRs
			fetchUserPrCommits(allOpenUserPrs);
		} catch (err) {
			logError('Failed to fetch all open PRs', err);
			allOpenUserPrs = [];
			userPrCommitsProcessed = true;
			triggerScrumGeneration();
		}
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