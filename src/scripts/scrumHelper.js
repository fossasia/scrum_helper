// const { cache } = require("react");
console.log("Script loaded", new Date().toISOString());

let refreshButton_Placed = false;
//# sourceURL=scrumHelper.js
let enableToggle = true;
function allIncluded() {
	/* global $*/
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
	let githubPrsReviewData = null;
	let githubUserData = null;
	let githubPrsReviewDataProccessed = {};
	let showOpenLabel = true;
	let showClosedLabel = true;
	let userReason = '';
	let gsoc = 0; //0 means codeheat. 1 means gsoc

	let pr_merged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	let pr_unmerged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

	let issue_closed_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	let issue_opened_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

	let linkStyle = '';
	function getChromeData() {
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
				'userReason',
				'gsoc',
				'githubCache',
			],
			(items) => {
				if (items.gsoc) {
					//gsoc
					gsoc = 1;
				} else {
					gsoc = 0; //codeheat
				}
				if (items.lastWeekContribution) {
					lastWeekContribution = true;
					handleLastWeekContributionChange();
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
				if (items.githubUsername) {
					githubUsername = items.githubUsername;
					fetchGithubData();
				} else {
					console.warn('No GitHub username found in storage');
				}
				if (items.projectName) {
					projectName = items.projectName;
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
	function getLastWeek() {
		let today = new Date();
		let noDays_to_goback = gsoc == 0 ? 7 : 1;
		let lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
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
	function log( ...args) {
		if(DEBUG) {
			console.log(`[SCRUM-HELPER]:`, ...args);
		}
	}
	function logError(...args) {
		if(DEBUG){
			console.error('[SCRUM-HELPER]:', ...args);
		}
	}
	// Global cache object
	let githubCache = {
		data: null,
		cacheKey: null,
		timestamp: 0,
		ttl: 10*60*1000, // cache valid for 10 mins
		fetching: false,
		queue: [],
		errors: {}, 
		errorTTL: 60*1000, // 1 min error cache 
		subject: null,
	};
	const MAX_CACHE_SIZE = 50 * 1024 * 1024; //50mb max cache

	function saveToStorage(data, subject = null) {
		if(data === githubCache.data && subject === githubCache.subject) {
			log('Skipping cache save - no changes');
			return Promise.resolve(true);
		}
		const cacheData = {
			data: data,
			cacheKey: githubCache.cacheKey,
			timestamp: githubCache.timestamp,
			subject: subject,
		}
		log(`Saving data to storage:`, {
			cacheKey: githubCache.cacheKey,
			timestamp:githubCache.timestamp,
			hasSubject: !!subject,
		});
		
		return new Promise((resolve) => {
			chrome.storage.local.set({ githubCache: cacheData }, () => {
				if(chrome.runtime.lastError) {
					logError('Storage save failed: ', chrome.runtime.lastError);
					resolve(false);
				} else {
					log('Cache saved successfuly');
					resolve(true);
				}
			});
		});
	}	
	
	function loadFromStorage() {
		log('Loading cache from storage');
		return new Promise((resolve) => {
			chrome.storage.local.get('githubCache', (result) => {
				if(chrome.runtime.lastError) {
					logError('Storage load failed:', chrome.runtime.lastError); 
					resolve(false);
					return;
				}

				const cache = result.githubCache;
				if (!cache) {
					log('No cache found in storage');
					resolve(false);
					return;
				}
				log('Found cache:', {
					cacheKey: cache.cacheKey,
					age: `${((Date.now() - cache.timestamp) / 1000 / 60).toFixed(1)} minutes` ,
				});

				githubCache.data = cache.data;
				githubCache.cacheKey = cache.cacheKey;
				githubCache.timestamp = cache.timestamp;
				githubCache.subject = cache.subject;

				// use cached subject element
				if(cache.subject && scrumSubject) {
					scrumSubject.value = cache.subject;
					scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
				}

				resolve(true);
			})
		})
	}
	
	function updateCache(data) {
		const cacheSize = new Blob([JSON.stringify(data)]).size;
		if(cacheSize > MAX_CACHE_SIZE) {
			console.wanr(`Cache data too large, not caching`);
			return;
		}
		githubCache.data = data;
		githubCache.timestamp = Date.now();
	}
	
	// fetch github data
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
	
		const now = Date.now();
		const isCacheFresh = (now - githubCache.timestamp) < githubCache.ttl;
		const isCacheKeyMatch = githubCache.cacheKey === cacheKey;

		if(githubCache.data && isCacheFresh & isCacheKeyMatch) {
			log('Using cached data - cache is fresh and key matches');
			processGithubData(githubCache.data);
			return Promise.resolve();
		}
		// if cache key does not match our cache is stale, fetch new data
		if(!isCacheKeyMatch) {
			log('Cache key mismatch - fetching new Data');
			githubCache.data = null;
		} else if(!isCacheFresh) {
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

		const issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+created%3A${startingDate}..${endingDate}&per_page=100`;
		const prUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+updated%3A${startingDate}..${endingDate}&per_page=100`;
		const userUrl = `https://api.github.com/users/${githubUsername}`;
		
		try {
			// throttling 500ms to avoid burst
			await new Promise(res => setTimeout(res, 500));

			const [issuesRes, prRes, userRes ] = await Promise.all([
				fetch(issueUrl),
				fetch(prUrl),
				fetch(userUrl),
			]);

			if(!issuesRes.ok) throw new Error(`Error fetching Github issues: ${issuesRes.status} ${issuesRes.statusText}`);
			if(!prRes.ok) throw new Error(`Error fetching Github PR review data: ${prRes.status} ${prRes.statusText}`);
			if(!userRes.ok) throw new Error(`Error fetching Github userdata: ${userRes.status} ${userRes.statusText}`);

			githubIssuesData = await issuesRes.json();
			githubPrsReviewData = await prRes.json();
			githubUserData = await userRes.json();

			// Cache the data
			githubCache.data = { githubIssuesData, githubPrsReviewData, githubUserData };
			githubCache.timestamp = Date.now();
			
			// updateCache({ githubIssuesData, githubPrsReviewData, githubUserData });
			await saveToStorage(githubCache.data); // Save to storage
			processGithubData(githubCache.data);

			// Resolve queued calls
			githubCache.queue.forEach(({ resolve }) => resolve());
			githubCache.queue = [];
		} catch(err) {
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

		lastWeekArray = [];
		nextWeekArray = [];
		reviewedPrsArray = [];
		githubPrsReviewDataProccessed = {};

		// Update subject
		if(!githubCache.subject) {
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
		if (!enableToggle) return;

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

			let weekOrDay = gsoc == 1 ? 'yesterday' : 'last week';
			let weekOrDay2 = gsoc == 1 ? 'today' : 'this week';

			// Create the complete content
			let content;
			if (lastWeekContribution == true) {
				content = `<b>1. What did I do ${weekOrDay}?</b>
						  <br>${lastWeekUl}<br><br>
						  <b>2. What I plan to do ${weekOrDay2}?</b>
						  <br>${nextWeekUl}<br><br>
						  <b>3. What is stopping me from doing my work?</b>
						  <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${userReason}</p>`;
			} else {
				content = `<b>1. What did I do from ${formatDate(startingDate)} to ${formatDate(endingDate)}?</b>
						  <br>${lastWeekUl}<br><br>
						  <b>2. What I plan to do ${weekOrDay2}?</b>
						  <br>${nextWeekUl}<br><br>
						  <b>3. What is stopping me from doing my work?</b>
						  <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${userReason}</p>`;
			}

			// Use the adapter to inject content
			const elements = window.emailClientAdapter.getEditorElements();
			if (!elements || !elements.body) {
				console.error('Email client editor not found');
				return;
			}

			window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
		});
	}

	// depriciate this
	// function getProject() {
	// 	if (projectName != '') return projectName;

	// 	let project = '<project name>';
	// 	let url = window.location.href;
	// 	let projectUrl = url.substr(url.lastIndexOf('/') + 1);
	// 	if (projectUrl === 'susiai') project = 'SUSI.AI';
	// 	else if (projectUrl === 'open-event') project = 'Open Event';
	// 	return project;
	// }

	//load initial scrum subject
	function scrumSubjectLoaded() {
		if (!enableToggle) return;
		setTimeout(() => {
			let name = githubUserData.name || githubUsername;
			// let project = getProject();
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
			// Save subject to cache
			githubCache.subject = subject;
			saveToStorage(githubCache.data, subject);

			if(scrumSubject && scrumSubject.value !== subject) {
				scrumSubject.value = subject;
				scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
			}
		});
	}

	// write PRs Reviewed
	function writeGithubPrsReviews() {
		items = githubPrsReviewData.items;
		if (!items) {
			logError('No Github PR review data available');
			return;
		}
		let i;
		for (i = 0; i < items.length; i++) {
			let item = items[i];
			if (item.user.login == githubUsername || !item.pull_request) continue;
			let repository_url = item.repository_url;
			let project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
			let title = item.title;
			let number = item.number;
			let html_url = item.html_url;
			if (!githubPrsReviewDataProccessed[project]) {
				// first pr in this repo
				githubPrsReviewDataProccessed[project] = [];
			}
			let obj = {
				number: number,
				html_url: html_url,
				title: title,
				state: item.state,
			};
			githubPrsReviewDataProccessed[project].push(obj);
		}
		for (let repo in githubPrsReviewDataProccessed) {
			let repoLi =
				'<li> \
		<i>(' +
				repo +
				')</i> - Reviewed ';
			if (githubPrsReviewDataProccessed[repo].length > 1) repoLi += 'PRs - ';
			else {
				repoLi += 'PR - ';
			}
			if (githubPrsReviewDataProccessed[repo].length <= 1) {
				for (let pr in githubPrsReviewDataProccessed[repo]) {
					let pr_arr = githubPrsReviewDataProccessed[repo][pr];
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
				for (let pr1 in githubPrsReviewDataProccessed[repo]) {
					let pr_arr1 = githubPrsReviewDataProccessed[repo][pr1];
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
		writeScrumBody();
	}
	//write issues and Prs from github
	function writeGithubIssuesPrs() {
		let items = githubIssuesData.items;
		if(!items){
			logError('No Github issues data available');
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
				// is a pull request
				if (item.state === 'closed') {
					// is closed PR
					li =
						'<li><i>(' +
						project +
						')</i> - Made PR (#' +
						number +
						") - <a href='" +
						html_url +
						"' style='" +
						linkStyle +
						"' target='_blank'>" +
						title +
						'</a> ' +
						pr_merged_button +
						'&nbsp;&nbsp;</li>';
				} else if (item.state === 'open') {
					// is open PR
					li =
						'<li><i>(' +
						project +
						')</i> - Made PR (#' +
						number +
						") - <a href='" +
						html_url +
						"' target='_blank'>" +
						title +
						'</a> ' +
						pr_unmerged_button +
						'&nbsp;&nbsp;</li>';
				} else {
					// else
					li =
						'<li><i>(' +
						project +
						')</i> - Made PR (#' +
						number +
						") - <a href='" +
						html_url +
						"' target='_blank'>" +
						title +
						'</a> &nbsp;&nbsp;</li>';
				}
			} else {
				// is a issue
				if (item.state === 'open' && item.body.toUpperCase().indexOf('YES') > 0) {
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
					li =
						'<li><i>(' +
						project +
						')</i> - Opened Issue(#' +
						number +
						") - <a href='" +
						html_url +
						"' target='_blank'>" +
						title +
						'</a> ' +
						issue_opened_button +
						'&nbsp;&nbsp;</li>';
				} else if (item.state === 'closed') {
					li =
						'<li><i>(' +
						project +
						')</i> - Opened Issue(#' +
						number +
						") - <a href='" +
						html_url +
						"' target='_blank'>" +
						title +
						'</a> ' +
						issue_closed_button +
						'&nbsp;&nbsp;</li>';
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

		clearInterval(intervalSubject);
		scrumSubject = elements.subject;
		if(!scrumSubject.value) {
			scrumSubjectLoaded();
		}
	}, 500);

	//check for github safe writing
	let intervalWriteGithub = setInterval(() => {
		if (scrumBody && githubUsername && githubIssuesData) {
			clearInterval(intervalWriteGithub);
			writeGithubIssuesPrs();
		}
	}, 500);
	//check for github prs reviews safe writing
	let intervalWriteGithubReviews = setInterval(() => {
		if (scrumBody && githubUsername && githubPrsReviewData) {
			clearInterval(intervalWriteGithubReviews);
			writeGithubPrsReviews();
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
		allIncluded();
	}
}
allIncluded();

$('button>span:contains(New conversation)')
	.parent('button')
	.click(() => {
		allIncluded();
	});
