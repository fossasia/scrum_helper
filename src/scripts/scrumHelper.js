console.log('Script loaded, adapter exists:', !!window.emailClientAdapter);
let refreshButton_Placed = false;
let enableToggle = true;
let hasInjectedContent = false;
function allIncluded(outputTarget = 'email') {
	console.log('allIncluded called with outputTarget:', outputTarget);
	console.log('Current window context:', window.location.href);
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
	let commitsArray = []; // Array to store all commits
	let githubIssuesData = null;
	let lastWeekContribution = false;
	let githubPrsReviewData = null;
	let githubUserData = null;
	let githubPrsReviewDataProccessed = {};
	let prCommitsData = {}; // Store commits for each PR
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

	const DEBUG = false; // Set to false to disable debug logs

	function log(...args) {
		if (DEBUG) {
			console.log('[SCRUM-HELPER]:', ...args);
		}
	}

	function logError(...args) {
		// Always log errors regardless of DEBUG setting
		console.error('[SCRUM-HELPER]:', ...args);
	}

	function getChromeData() {
		if (DEBUG) {
			console.log("Getting Chrome data for context:", outputTarget);
		}
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
				if (DEBUG) {
					console.log("Storage items received");
				}
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
			dataTypes: data ? Object.keys(data) : []
		});

		return new Promise((resolve) => {
			chrome.storage.local.set({ githubCache: cacheData }, () => {
				if (chrome.runtime.lastError) {
					logError('Storage save failed: ', chrome.runtime.lastError);
					resolve(false);
				} else {
					log('Cache saved successfully');
					// Update local cache
					githubCache.data = data;
					githubCache.subject = subject;
					resolve(true);
				}
			});
		});
	}

	function loadFromStorage() {
		log('Loading cache from storage');
		return new Promise((resolve) => {
			chrome.storage.local.get('githubCache', (result) => {
				const cache = result.githubCache;
				if (!cache) {
					log('No cache found in storage');
					resolve(false);
					return;
				}
				const isCacheExpired = (Date.now() - cache.timestamp) > githubCache.ttl;
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
			})
		})
	}

	async function fetchGithubData() {
		const cacheKey = `${githubUsername}-${startingDate}-${endingDate}`;

		if (githubCache.fetching || (githubCache.cacheKey === cacheKey && githubCache.data)) {
			return;
		}

		log('Fetching Github data:', {
			username: githubUsername,
			dateRange: `${startingDate} to ${endingDate}`
		});

		// Check if we need to load from storage
		if (!githubCache.data && !githubCache.fetching) {
			await loadFromStorage();
		}

		const now = Date.now();
		const isCacheFresh = (now - githubCache.timestamp) < githubCache.ttl;
		const isCacheKeyMatch = githubCache.cacheKey === cacheKey;

		if (githubCache.data && isCacheFresh && isCacheKeyMatch) {
			processGithubData(githubCache.data);
			return Promise.resolve();
		}

		if (!isCacheKeyMatch) {
			githubCache.data = null;
		}

		// if fetching is in progress, queue the calls and return a promise resolved when done
		if (githubCache.fetching) {
			return new Promise((resolve, reject) => {
				githubCache.queue.push({ resolve, reject });
			});
		}

		githubCache.fetching = true;
		githubCache.cacheKey = cacheKey;

		let issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+created%3A${startingDate}..${endingDate}&per_page=100`;
		let prUrl = `https://api.github.com/search/issues?q=commenter%3A${githubUsername}+org%3Afossasia+updated%3A${startingDate}..${endingDate}&per_page=100`;
		let userUrl = `https://api.github.com/users/${githubUsername}`;
		let allPrsUrl = `https://api.github.com/search/issues?q=type:pr+author:${githubUsername}+org:fossasia&per_page=100`;

		try {
			// throttling 500ms to avoid burst
			await new Promise(res => setTimeout(res, 500));

			const [issuesRes, prRes, userRes, allPrsRes] = await Promise.all([
				fetch(issueUrl),
				fetch(prUrl),
				fetch(userUrl),
				fetch(allPrsUrl)
			]);

			if (!issuesRes.ok) throw new Error(`Error fetching Github issues: ${issuesRes.status} ${issuesRes.statusText}`);
			if (!prRes.ok) throw new Error(`Error fetching Github PR review data: ${prRes.status} ${prRes.statusText}`);
			if (!userRes.ok) throw new Error(`Error fetching Github userdata: ${userRes.status} ${userRes.statusText}`);
			if (!allPrsRes.ok) throw new Error(`Error fetching all PRs: ${allPrsRes.status} ${allPrsRes.statusText}`);

			const githubIssuesData = await issuesRes.json();
			const githubPrsReviewData = await prRes.json();
			const githubUserData = await userRes.json();
			const allPrsData = await allPrsRes.json();

			// Fetch commits for each PR
			const prCommits = await Promise.all(allPrsData.items.map(async pr => {
				const repository_url = pr.repository_url;
				const [owner, project] = repository_url.split('/').slice(-2);
				const commitsUrl = `https://api.github.com/repos/${owner}/${project}/pulls/${pr.number}/commits`;

				try {
					await new Promise(res => setTimeout(res, 100)); // Small delay to avoid rate limits
					const commitsRes = await fetch(commitsUrl);
					if (!commitsRes.ok) return null;
					const commits = await commitsRes.json();
					return {
						pr,
						commits: commits.filter(commit =>
							commit.author?.login === githubUsername &&
							new Date(commit.commit.author.date) >= new Date(startingDate) &&
							new Date(commit.commit.author.date) <= new Date(endingDate)
						)
					};
				} catch (err) {
					console.error(`Error fetching commits for PR #${pr.number}:`, err);
					return null;
				}
			}));

			// Filter out null results and empty commits
			const prCommitsData = prCommits
				.filter(data => data && data.commits.length > 0)
				.reduce((acc, { pr, commits }) => {
					const project = pr.repository_url.split('/').pop();
					if (!acc[project]) acc[project] = [];
					acc[project].push({
						pr_number: pr.number,
						pr_state: pr.state,
						commits: commits.map(c => ({
							sha: c.sha,
							message: c.commit.message,
							html_url: c.html_url,
							date: c.commit.author.date
						}))
					});
					return acc;
				}, {});

			// Update cache data
			githubCache.data = { githubIssuesData, githubPrsReviewData, githubUserData, prCommitsData };
			githubCache.timestamp = Date.now();

			// Save to storage before processing
			await saveToStorage(githubCache.data);

			// Process the data
			processGithubData(githubCache.data);

			// Resolve queued calls
			githubCache.queue.forEach(({ resolve }) => resolve());
			githubCache.queue = [];

			return githubCache.data;
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

	async function forceGithubDataRefresh() {
		const oldCacheKey = githubCache.cacheKey;
		githubCache = {
			data: null,
			cacheKey: oldCacheKey,
			timestamp: 0,
			ttl: 10 * 60 * 1000,
			fetching: false,
			queue: [],
			errors: {},
			errorTTL: 60 * 1000,
			subject: null
		};

		await new Promise(resolve => {
			chrome.storage.local.remove('githubCache', resolve);
		});

		try {
			await fetchGithubData();
			return { success: true, timestamp: Date.now() };
		} catch (err) {
			logError('Force refresh failed:', err);
			throw err;
		}
	}
	if (typeof window !== 'undefined') {
		window.forceGithubDataRefresh = forceGithubDataRefresh;
	}

	function processGithubData(data) {
		githubIssuesData = data.githubIssuesData;
		githubPrsReviewData = data.githubPrsReviewData;
		githubUserData = data.githubUserData;
		prCommitsData = data.prCommitsData || {};

		if (DEBUG) {
			const commitCount = Object.values(prCommitsData)
				.reduce((total, prs) => total + prs.reduce((count, pr) => count + pr.commits.length, 0), 0);

			log('Data processed:', {
				issues: githubIssuesData?.items?.length || 0,
				prs: githubPrsReviewData?.items?.length || 0,
				commits: commitCount
			});
		}

		lastWeekArray = [];
		nextWeekArray = [];
		reviewedPrsArray = [];
		commitsArray = [];
		githubPrsReviewDataProccessed = {};

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
			// Generate content first
			let lastWeekUl = '<ul>';
			let i;

			// Add PRs and Issues
			for (i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];

			// Add PR reviews
			for (i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];

			// Reset commits array to prevent duplicates
			commitsArray = [];

			// Add commits section only once
			if (Object.keys(prCommitsData).length > 0) {
				Object.entries(prCommitsData).forEach(([project, prs]) => {
					let commitSection = `<li><i>(${project})</i> - Commits made:</li><ul>`;

					// Group commits by PR
					prs.forEach(pr => {
						pr.commits.sort((a, b) => new Date(b.date) - new Date(a.date));
						pr.commits.forEach(commit => {
							const message = commit.message.split('\n')[0]; // First line only
							const sha = commit.sha.substring(0, 7);
							const prStatus = pr.pr_state === 'closed' ? ' [merged]' : ' [in review]';
							commitSection += `<li><a href='${commit.html_url}'><code>${sha}</code></a> - ${message} (PR #${pr.pr_number}${prStatus})</li>`;
						});
					});

					commitSection += '</ul>';
					commitsArray.push(commitSection);
				});

				// Add commits to the report only once
				lastWeekUl += commitsArray.join('');
			}

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
		// reviewedPrsArray = [];
		// githubPrsReviewDataProccessed = {};
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
	function writeGithubIssuesPrs() {
		let items = githubIssuesData.items;
		// lastWeekArray = [];
		// 	nextWeekArray = [];
		if (!items) {
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
				if (item.state === 'closed') {
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
				} else if (item.state === 'open') {
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_unmerged_button}</li>`;
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

	// Keep debugCache for development/testing but make it more concise
	function debugCache() {
		if (!DEBUG) return null;

		const now = Date.now();
		const cacheAge = githubCache.timestamp ? (now - githubCache.timestamp) / 1000 : 0;
		const ttlRemaining = githubCache.timestamp ? (githubCache.ttl - (now - githubCache.timestamp)) / 1000 : 0;

		const status = {
			hasCachedData: !!githubCache.data,
			cacheKey: githubCache.cacheKey,
			cacheAge: `${cacheAge.toFixed(1)} seconds`,
			ttlRemaining: `${ttlRemaining.toFixed(1)} seconds`,
			dataTypes: githubCache.data ? Object.keys(githubCache.data) : [],
			commitCount: githubCache.data?.prCommitsData ?
				Object.values(githubCache.data.prCommitsData)
					.reduce((total, prs) => total + prs.reduce((count, pr) => count + pr.commits.length, 0), 0)
				: 0
		};

		console.group('Cache Status');
		Object.entries(status).forEach(([key, value]) => {
			console.log(key + ':', value);
		});
		console.groupEnd();

		return status;
	}

	// Make it available globally for testing
	if (typeof window !== 'undefined') {
		window.debugCache = debugCache;
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