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

function allIncluded(outputTarget = 'email') {
	// Always re-instantiate gitlabHelper for gitlab platform to ensure fresh cache after refresh
	if (platform === 'gitlab' || (typeof platform === 'undefined' && window.GitLabHelper)) {
		gitlabHelper = new window.GitLabHelper();
	}
	if (scrumGenerationInProgress) {
		return;
	}
	scrumGenerationInProgress = true;
	console.log('allIncluded called with outputTarget:', outputTarget);

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
	let onlyPRs = false;
	let onlyRevPRs = false;

	const pr_open_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';
	const pr_closed_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color:rgb(210, 20, 39);border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--red">closed</div>';
	const pr_merged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">merged</div>';
	const pr_draft_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #808080;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--gray">draft</div>';

	const issue_closed_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #d73a49;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--red">closed</div>';
	const issue_opened_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';
	const issue_closed_completed_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	const issue_closed_notplanned_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #808080;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--gray">closed</div>';

	function getChromeData() {
		console.log('[DEBUG] getChromeData called for outputTarget:', outputTarget);
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
				'onlyPRs',
				'onlyRevPRs',
			],
			(items) => {
				console.log('[DEBUG] Storage items received:', items);
				platform = items.platform || 'github';

				// Load platform-specific username
				const platformUsernameKey = `${platform}Username`;
				platformUsername = items[platformUsernameKey] || '';
				platformUsernameLocal = platformUsername;
				console.log(`[DEBUG] platform: ${platform}, platformUsername: ${platformUsername}`);

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
						githubToken: items.githubToken,
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
				onlyPRs = items.onlyPRs === true;
				onlyRevPRs = items.onlyRevPRs === true;
				console.log('[SCRUM-DEBUG] loaded flags:', { onlyIssues, onlyPRs, onlyRevPRs });
				// Enforce mutual exclusivity between onlyIssues and onlyPRs to avoid filtering out everything
				if (onlyIssues && onlyPRs) {
					console.warn('[SCRUM-HELPER]: Detected both onlyIssues and onlyPRs enabled; normalizing to onlyIssues.');
					onlyPRs = false;
				}
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
							console.log('[DEBUG] No username found - popup context');
							const scrumReport = document.getElementById('scrumReport');
							const generateBtn = document.getElementById('generateReport');
							if (scrumReport) {
								scrumReport.innerHTML =
									'<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Please enter your username to generate a report.</div>';
							}
							if (generateBtn) {
								generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
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
										const project = projects.find((p) => p.id === item.project_id);
										const repoName = project ? project.name : 'unknown';

										return {
											...item,
											repository_url: `https://gitlab.com/api/v4/projects/${item.project_id}`,
											html_url:
												type === 'issue'
													? item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : '')
													: item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : ''),
											number: item.iid,
											title: item.title,
											state: type === 'issue' && item.state === 'opened' ? 'open' : item.state,
											project: repoName,
											pull_request: type === 'mr',
										};
									}
									const mappedIssues = (data.issues || []).map((issue) => mapGitLabItem(issue, data.projects, 'issue'));
									const mappedMRs = (data.mergeRequests || data.mrs || []).map((mr) =>
										mapGitLabItem(mr, data.projects, 'mr'),
									);
									const mappedData = {
										githubIssuesData: { items: mappedIssues },
										githubPrsReviewData: { items: mappedMRs },
										githubUserData: data.user || {},
									};
									githubUserData = mappedData.githubUserData;

									const name =
										githubUserData?.name || githubUserData?.username || platformUsernameLocal || platformUsername;
									const project = projectName;
									const curDate = new Date();
									const year = curDate.getFullYear().toString();
									let date = curDate.getDate();
									let month = curDate.getMonth() + 1;
									if (month < 10) month = '0' + month;
									if (date < 10) date = '0' + date;
									const dateCode = year.toString() + month.toString() + date.toString();
									const subject = `[Scrum]${project ? ' - ' + project : ''} - ${dateCode}`;
									subjectForEmail = subject;

									await processGithubData(mappedData, true, subjectForEmail);
									scrumGenerationInProgress = false;
								} catch (err) {
									console.error('GitLab fetch failed:', err);
									if (outputTarget === 'popup') {
										if (generateBtn) {
											generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
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
							gitlabHelper
								.fetchGitLabData(platformUsernameLocal, startingDate, endingDate)
								.then((data) => {
									function mapGitLabItem(item, projects, type) {
										const project = projects.find((p) => p.id === item.project_id);
										const repoName = project ? project.name : 'unknown';
										return {
											...item,
											repository_url: `https://gitlab.com/api/v4/projects/${item.project_id}`,
											html_url:
												type === 'issue'
													? item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : '')
													: item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : ''),
											number: item.iid,
											title: item.title,
											state: type === 'issue' && item.state === 'opened' ? 'open' : item.state,
											project: repoName,
											pull_request: type === 'mr',
										};
									}
									const mappedIssues = (data.issues || []).map((issue) => mapGitLabItem(issue, data.projects, 'issue'));
									const mappedMRs = (data.mergeRequests || data.mrs || []).map((mr) =>
										mapGitLabItem(mr, data.projects, 'mr'),
									);
									const mappedData = {
										githubIssuesData: { items: mappedIssues },
										githubPrsReviewData: { items: mappedMRs },
										githubUserData: data.user || {},
									};
									processGithubData(mappedData);
									scrumGenerationInProgress = false;
								})
								.catch((err) => {
									console.error('GitLab fetch failed:', err);
									if (outputTarget === 'popup') {
										if (generateBtn) {
											generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
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
								scrumReport.innerHTML =
									'<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Please enter your username to generate a report.</div>';
							}
							if (generateBtn) {
								generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
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
							scrumReport.innerHTML =
								'<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Unknown platform selected.</div>';
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
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		return yesterday.toISOString().split('T')[0];
	}
	function getToday() {
		const today = new Date();
		return today.toISOString().split('T')[0];
	}

	// Global cache object
	const githubCache = {
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
			chrome.storage.local.get(['cacheInput'], (result) => {
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
		};
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
		return getCacheTTL().then((currentTTL) => {
			return new Promise((resolve) => {
				chrome.storage.local.get('githubCache', (result) => {
					const cache = result.githubCache;
					if (!cache) {
						log('No cache found in storage');
						resolve(false);
						return;
					}
					const isCacheExpired = Date.now() - cache.timestamp > currentTTL;
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
		});
	}

	async function fetchGithubData() {
		// Always load latest repo filter settings from storage
		const filterSettings = await new Promise((resolve) => {
			chrome.storage.local.get(['useRepoFilter', 'selectedRepos'], resolve);
		});
		useRepoFilter = filterSettings.useRepoFilter || false;
		selectedRepos = Array.isArray(filterSettings.selectedRepos) ? filterSettings.selectedRepos : [];

		// Get the correct date range for cache key
		let startDateForCache;
		let endDateForCache;
		if (yesterdayContribution) {
			const today = new Date();
			const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
			startDateForCache = yesterday.toISOString().split('T')[0];
			endDateForCache = today.toISOString().split('T')[0]; // Use yesterday for start and today for end
		} else if (startingDate && endingDate) {
			startDateForCache = startingDate;
			endDateForCache = endingDate;
		} else {
			// Default to last 7 days if no date range is set
			const today = new Date();
			const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
			startDateForCache = lastWeek.toISOString().split('T')[0];
			endDateForCache = today.toISOString().split('T')[0];
		}

		const cacheKey = `${platformUsernameLocal}-${startDateForCache}-${endDateForCache}-${orgName || 'all'}`;

		if (githubCache.fetching || (githubCache.cacheKey === cacheKey && githubCache.data)) {
			log('Fetch already in progress or data already fetched. Skipping fetch.');
			return;
		}

		log('Fetching Github data:', {
			username: platformUsernameLocal,
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
		const isCacheFresh = now - githubCache.timestamp < githubCache.ttl;
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

		if (!isCacheKeyMatch) {
			log('Cache key mismatch - fetching new Data');
			githubCache.data = null;
		} else if (!isCacheFresh) {
			log('Cache is stale - fetching new data');
		}

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
			Accept: 'application/vnd.github.v3+json',
		};

		if (githubToken) {
			log('Making authenticated requests.');
			headers.Authorization = `token ${githubToken}`;
		} else {
			log('Making public requests');
		}

		console.log('[SCRUM-HELPER] orgName before API query:', orgName);
		console.log('[SCRUM-HELPER] orgName type:', typeof orgName);
		console.log('[SCRUM-HELPER] orgName length:', orgName ? orgName.length : 0);
		const orgPart = orgName && orgName.trim() ? `+org%3A${orgName}` : '';
		console.log('[SCRUM-HELPER] orgPart for API:', orgPart);
		console.log('[SCRUM-HELPER] orgPart length:', orgPart.length);

		let issueUrl;
		let prUrl;
		let userUrl;

		if (useRepoFilter && selectedRepos && selectedRepos.length > 0) {
			log('Using repo filter for api calls:', selectedRepos);

			try {
				await fetchReposIfNeeded();
			} catch (err) {
				logError('Failed to fetch repo data for filtering:', err);
			}

			const repoQueries = selectedRepos
				.filter((repo) => repo !== null)
				.map((repo) => {
					if (typeof repo === 'object' && repo.fullName) {
						const cleanName = repo.fullName.startsWith('/') ? repo.fullName.substring(1) : repo.fullName;
						return `repo:${cleanName}`;
					}

					if (repo.includes('/')) {
						const cleanName = repo.startsWith('/') ? repo.substring(1) : repo;
						return `repo:${cleanName}`;
					}

					const fullRepoInfo = githubCache.repoData?.find((r) => r.name === repo);
					if (fullRepoInfo && fullRepoInfo.fullName) {
						return `repo:${fullRepoInfo.fullName}`;
					}
					logError(`Missing owner for repo ${repo} - search may fail`);
					return `repo:${repo}`;
				});

			const orgQuery = orgPart ? `+${orgPart}` : '';
			issueUrl = `https://api.github.com/search/issues?q=author%3A${platformUsernameLocal}+${repoQueries}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}&per_page=100`;
			prUrl = `https://api.github.com/search/issues?q=commenter%3A${platformUsernameLocal}+${repoQueries}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}&per_page=100`;
			userUrl = `https://api.github.com/users/${platformUsernameLocal}`;
			log('Repository-filtered URLs:', { issueUrl, prUrl });
		} else {
			loadFromStorage('Using org wide search');
			const orgQuery = orgPart ? `+${orgPart}` : '';
			issueUrl = `https://api.github.com/search/issues?q=author%3A${platformUsernameLocal}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}&per_page=100`;
			prUrl = `https://api.github.com/search/issues?q=commenter%3A${platformUsernameLocal}${orgQuery}+updated%3A${startDateForCache}..${endDateForCache}&per_page=100`;
			userUrl = `https://api.github.com/users/${platformUsernameLocal}`;
		}

		try {
			await new Promise((res) => setTimeout(res, 500));

			log('Validating GitHub user existence for:', platformUsernameLocal);
			const userCheckRes = await fetch(userUrl, { headers });

			if (userCheckRes.status === 404) {
    const errorMsg = `GitHub user "${platformUsernameLocal}" not found (404). Please check the username and try again.`;
    logError(errorMsg);
    if (outputTarget === 'popup') {
        Materialize.toast && Materialize.toast(errorMsg, 4000);

        const btn = document.getElementById('generateReport');
        if (btn) {
            btn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
            btn.disabled = false;
        }
    }
    throw new Error(errorMsg);
}

			if (userCheckRes.status === 401 || userCheckRes.status === 403) {
				showInvalidTokenMessage();
				githubCache.fetching = false;
				return;
			}

			if (!userCheckRes.ok) {
    const errorMsg = `Error validating GitHub user: ${userCheckRes.status} ${userCheckRes.statusText}`;
    logError(errorMsg);

    if (outputTarget === 'popup') {
        const btn = document.getElementById('generateReport');
        if (btn) {
            btn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
            btn.disabled = false;
        }
    }

    throw new Error(errorMsg);
}

			const [issuesRes, prRes, userRes] = await Promise.all([
				fetch(issueUrl, { headers }),
				fetch(prUrl, { headers }),
				userCheckRes, // Reuse the already validated user response
			]);
        if (!userCheckRes.ok && outputTarget === 'popup') {
            const scrumReport = document.getElementById('scrumReport');
            const generateBtn = document.getElementById('generateReport');

            if (scrumReport) {
                scrumReport.textContent = 'GitHub user not found or API error occurred.';
            }

            if (generateBtn) {
                generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
                generateBtn.disabled = false;
            }

            return;
        }


			if (issuesRes.status === 401 || prRes.status === 401 || issuesRes.status === 403 || prRes.status === 403) {
				showInvalidTokenMessage();
				githubCache.fetching = false;
				return;
			}

			if (issuesRes.status === 422 || prRes.status === 422) {
				const errorMsg = `Invalid search query or date range. Please verify your date range format and try again.`;
				logError(errorMsg);
				if (outputTarget === 'popup') {
					Materialize.toast && Materialize.toast(errorMsg, 4000);
				}
				throw new Error(errorMsg);
			}

			if (!issuesRes.ok) {
				const errorMsg = `Error fetching GitHub issues: ${issuesRes.status} ${issuesRes.statusText}`;
				logError(errorMsg);
				if (outputTarget === 'popup') {
					Materialize.toast && Materialize.toast(errorMsg, 4000);
				}
				throw new Error(errorMsg);
			}
			if (!prRes.ok) {
				const errorMsg = `Error fetching GitHub PR review data: ${prRes.status} ${prRes.statusText}`;
				logError(errorMsg);
				if (outputTarget === 'popup') {
					Materialize.toast && Materialize.toast(errorMsg, 4000);
				}
				throw new Error(errorMsg);
			}
			if (!userRes.ok) {
				const errorMsg = `Error fetching GitHub user data: ${userRes.status} ${userRes.statusText}`;
				logError(errorMsg);
				throw new Error(errorMsg);
			}

			githubIssuesData = await issuesRes.json();
			githubPrsReviewData = await prRes.json();
			githubUserData = await userRes.json();

			if (githubIssuesData && githubIssuesData.items) {
				log('Fetched githubIssuesData:', githubIssuesData.items.length, 'items');
				// Collect only open PRs for commit fetching
				const openPRs = githubIssuesData.items.filter((item) => item.pull_request && item.state === 'open');
				log(
					'Open PRs for commit fetching:',
					openPRs.map((pr) => pr.number),
				);
				// Fetch commits for open PRs (batch) if showCommits is enabled
				if (openPRs.length && githubToken && showCommits) {
					let startDateForCommits;
					let endDateForCommits;
					if (yesterdayContribution) {
						const today = new Date();
						const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
						startDateForCommits = yesterday.toISOString().split('T')[0];
						endDateForCommits = today.toISOString().split('T')[0]; // Use yesterday for start and today for end
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
					log('Commit map returned from fetchCommitsForOpenPRs:', commitMap);
					// Attach commits to PR objects
					openPRs.forEach((pr) => {
						pr._allCommits = commitMap[pr.number] || [];
						log(`Attached ${pr._allCommits.length} commits to PR #${pr.number}`);
						if (pr._allCommits.length > 0) {
							log(
								`Commits for PR #${pr.number}:`,
								pr._allCommits.map((c) => `${c.messageHeadline} (${c.committedDate})`),
							);
						}
					});
				}
			}

			// Cache the data
			githubCache.data = { githubIssuesData, githubPrsReviewData, githubUserData };
			githubCache.timestamp = Date.now();

			await saveToStorage(githubCache.data);
			processGithubData(githubCache.data);

			githubCache.queue.forEach(({ resolve }) => {
				resolve();
			});
			githubCache.queue = [];
		} catch (err) {
			logError('Fetch Failed:', err);
			// Reject queued calls on error
			githubCache.queue.forEach(({ reject }) => {
				reject(err);
			});
			githubCache.queue = [];
			githubCache.fetching = false;

			if (outputTarget === 'popup') {
    const scrumReport = document.getElementById('scrumReport');
    const generateBtn = document.getElementById('generateReport');

    if (scrumReport) {
        scrumReport.innerHTML = `<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">
            ${err.message || 'An error occurred while generating the report.'}
        </div>`;
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
		log(
			'fetchCommitsForOpenPRs called with PRs:',
			prs.map((pr) => pr.number),
			'startDate:',
			startDate,
			'endDate:',
			endDate,
		);
		if (!prs.length) return {};
		const since = new Date(startDate + 'T00:00:00Z').toISOString();
		const until = new Date(endDate + 'T23:59:59Z').toISOString();
		const queries = prs
			.map((pr, idx) => {
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
			})
			.join('\n');
		const query = `query { ${queries} }`;
		log('GraphQL query for commits:', query);
		const res = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(githubToken ? { Authorization: `bearer ${githubToken}` } : {}),
			},
			body: JSON.stringify({ query }),
		});
		log('fetchCommitsForOpenPRs response status:', res.status);
		const data = await res.json();
		log('fetchCommitsForOpenPRs response data:', data);
		const commitMap = {};
		prs.forEach((pr, idx) => {
			const prData = data.data && data.data[`pr${idx}`] && data.data[`pr${idx}`].pullRequest;
			if (prData && prData.commits && prData.commits.nodes) {
				const allCommits = prData.commits.nodes.map((n) => n.commit);
				log(`PR #${pr.number} allCommits:`, allCommits);
				const filteredCommits = allCommits.filter((commit) => {
					const commitDate = new Date(commit.committedDate);
					const sinceDate = new Date(since);
					const untilDate = new Date(until);
					const isInRange = commitDate >= sinceDate && commitDate <= untilDate;
					log(`PR #${pr.number} commit "${commit.messageHeadline}" (${commit.committedDate}) - in range: ${isInRange}`);
					return isInRange;
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
		const repoCacheKey = `repos-${platformUsernameLocal}-${orgName}-${startDateForCache}-${endDateForCache}`;

		const now = Date.now();
		const isRepoCacheFresh = now - githubCache.repoTimeStamp < githubCache.ttl;
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
			const repos = await fetchUserRepositories(platformUsernameLocal, githubToken, orgName);

			githubCache.repoData = repos;
			githubCache.repoTimeStamp = now;

			chrome.storage.local.set({
				repoCache: {
					data: repos,
					cacheKey: repoCacheKey,
					timestamp: now,
				},
			});

			githubCache.repoQueue.forEach(({ resolve }) => {
				resolve(repos);
			});
			githubCache.repoQueue = [];

			log(`Successfuly cached ${repos.length} repositories`);
			return repos;
		} catch (err) {
			logError('Failed to fetch reppos:', err);
			githubCache.repoQueue.forEach(({ reject }) => {
				reject(err);
			});
			githubCache.repoQueue = [];

			throw err;
		} finally {
			githubCache.repoFetching = false;
		}
	}

	async function verifyCacheStatus() {
		log('Cache Status: ', {
			hasCachedData: !!githubCache.data,
			cacheAge: githubCache.timestamp
				? `${((Date.now() - githubCache.timestamp) / 1000 / 60).toFixed(1)} minutes`
				: `no cache`,
			cacheKey: githubCache.cacheKey,
			isFetching: githubCache.fetching,
			queueLength: githubCache.queue.length,
		});
		const storageData = await new Promise((resolve) => {
			chrome.storage.local.get('githubCache', resolve);
		});
		log('Storage Status:', {
			hasStoredData: !!storageData.githubCache,
			storedCacheKey: storageData.githubCache?.cacheKey,
			storageAge: storageData.githubCache?.timestamp
				? `${((Date.now() - storageData.githubCache.timestamp) / 1000 / 60).toFixed(1)} minutes`
				: 'no data',
		});
	}
	verifyCacheStatus();

	function showInvalidTokenMessage() {
		if (outputTarget === 'popup') {
			const reportDiv = document.getElementById('scrumReport');
			if (reportDiv) {
				reportDiv.innerHTML =
					'<div class="error-message" style="color: #dc2626; font-weight: bold; padding: 10px;">Invalid or expired GitHub token. Please check your token in the settings and try again.</div>';
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

		let filteredData = data;
		// Always apply repo filter if it's enabled and repos are selected.
		if (useRepoFilter && selectedRepos && selectedRepos.length > 0) {
			log('[SCRUM-HELPER]: Filtering data by selected repos:', selectedRepos);
			filteredData = filterDataByRepos(data, selectedRepos);
		}

		githubIssuesData = filteredData.githubIssuesData;
		githubPrsReviewData = filteredData.githubPrsReviewData;
		githubUserData = filteredData.githubUserData;

		log('GitHub data set:', {
			issues: githubIssuesData?.items?.length || 0,
			prs: githubPrsReviewData?.items?.length || 0,
			user: githubUserData?.login,
			filtered: useRepoFilter,
		});

		lastWeekArray = [];
		nextWeekArray = [];
		reviewedPrsArray = [];
		githubPrsReviewDataProcessed = {};
		issuesDataProcessed = false;
		prsReviewDataProcessed = false;
		if (!githubCache.subject && scrumSubject) {
			scrumSubjectLoaded();
		}
		log('[SCRUM-DEBUG] Processing issues for main activity:', githubIssuesData?.items);
		if (platform === 'github') {
			await writeGithubIssuesPrs(githubIssuesData?.items || []);
		} else if (platform === 'gitlab') {
			await writeGithubIssuesPrs(githubIssuesData?.items || []);
			await writeGithubIssuesPrs(githubPrsReviewData?.items || []);
		}
		await writeGithubPrsReviews();
		log('[DEBUG] Both data processing functions completed, generating scrum body');
		if (subjectForEmail) {
			// Synchronized subject and body injection for email
			let lastWeekUl = '<ul>';
			for (let i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
			for (let i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
			lastWeekUl += '</ul>';
			let nextWeekUl = '<ul>';
			for (let i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
			nextWeekUl += '</ul>';
			const weekOrDay = yesterdayContribution ? 'yesterday' : 'the period';
			const weekOrDay2 = 'today';
			let content;
			if (yesterdayContribution) {
				content = `<b>1. What did I do ${weekOrDay}?</b><br>${lastWeekUl}<br><b>2. What do I plan to do ${weekOrDay2}?</b><br>${nextWeekUl}<br><b>3. What is blocking me from making progress?</b><br>${userReason}`;
			} else {
				content = `<b>1. What did I do from ${formatDate(startingDate)} to ${formatDate(endingDate)}?</b><br>${lastWeekUl}<br><b>2. What do I plan to do ${weekOrDay2}?</b><br>${nextWeekUl}<br><b>3. What is blocking me from making progress?</b><br>${userReason}`;
			}
			// Wait for both subject and body to be available, then inject both
			let injected = false;
			const interval = setInterval(() => {
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

		const weekOrDay = yesterdayContribution ? 'yesterday' : 'the period';
		const weekOrDay2 = 'today';

		let content;
		if (yesterdayContribution) {
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
				log('Found popup div, updating content');
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
						log('MutationObserver found the editor body. Injecting scrum content.');
						window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
						hasInjectedContent = true;
						scrumGenerationInProgress = false;
					}
				}
			});

			observer.observe(document.body, {
				childList: true,
				subtree: true,
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
				const name = githubUserData?.name || githubUserData?.username || platformUsernameLocal || platformUsername;
				const project = projectName;
				const curDate = new Date();
				const year = curDate.getFullYear().toString();
				let date = curDate.getDate();
				let month = curDate.getMonth();
				month++;
				if (month < 10) month = '0' + month;
				if (date < 10) date = '0' + date;
				const dateCode = year.toString() + month.toString() + date.toString();

				const subject = `[Scrum]${project ? ' - ' + project : ''} - ${dateCode}`;
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
		const isAnyFilterActive = onlyIssues || onlyPRs || onlyRevPRs;
		if (isAnyFilterActive && !onlyRevPRs) {
			log('Filters active but onlyRevPRs not checked, skipping PR reviews.');
			reviewedPrsArray = [];
			prsReviewDataProcessed = true;
			return;
		}

		const items = githubPrsReviewData.items;
		log('Processing PR reviews:', {
			hasItems: !!items,
			itemCount: items?.length,
			firstItem: items?.[0],
		});
		if (!items) {
			logError('No Github PR review data available');
			return;
		}
		reviewedPrsArray = [];
		githubPrsReviewDataProcessed = {};
		let i;

		// Get the date range for filtering
		let startDate;
		let endDate;
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

		log('Filtering PR reviews by date range:', { startDate, endDate, startDateTime, endDateTime });

		for (i = 0; i < items.length; i++) {
			const item = items[i];
			log(
				`Processing PR #${item.number} - state: ${item.state}, updated_at: ${item.updated_at}, created_at: ${item.created_at}, merged_at: ${item.pull_request?.merged_at}`,
			);

			// For GitHub: item.user.login, for GitLab: item.author?.username
			let isAuthoredByUser = false;
			if (platform === 'github') {
				isAuthoredByUser = item.user && item.user.login === platformUsernameLocal;
			} else if (platform === 'gitlab') {
				isAuthoredByUser = item.author && item.author.username === platformUsername;
			}

			if (isAuthoredByUser || !item.pull_request) continue;

			// Check if the PR was actually reviewed/commented on within the date range
			const itemDate = new Date(item.updated_at || item.created_at);
			log(`PR #${item.number} - itemDate: ${itemDate}, startDateTime: ${startDateTime}, endDateTime: ${endDateTime}`);
			if (itemDate < startDateTime || itemDate > endDateTime) {
				log(`Skipping PR #${item.number} - updated at ${itemDate} outside date range ${startDate} to ${endDate}`);
				continue;
			}

			// Additional check: Skip PRs that were merged before the date range
			if (item.state === 'closed' && item.pull_request && item.pull_request.merged_at) {
				const mergedDate = new Date(item.pull_request.merged_at);
				if (mergedDate < startDateTime) {
					log(
						`Skipping merged PR #${item.number} - merged at ${mergedDate} before date range ${startDate} to ${endDate}`,
					);
					continue;
				}
			}

			// For closed PRs, ensure they were merged within the date range
			if (item.state === 'closed' && item.pull_request) {
				if (!item.pull_request.merged_at) {
					log(`Skipping closed PR #${item.number} - not merged`);
					continue;
				}
				const mergedDate = new Date(item.pull_request.merged_at);
				if (mergedDate < startDateTime || mergedDate > endDateTime) {
					log(
						`Skipping closed PR #${item.number} - merged at ${mergedDate} outside date range ${startDate} to ${endDate}`,
					);
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
					log(`Skipping PR #${item.number} - created before date range and not updated recently enough`);
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
					log(`Skipping PR #${item.number} - not created or updated yesterday`);
					continue;
				}

				// For yesterday filter, be extra strict about merged PRs
				if (item.state === 'closed' && item.pull_request && item.pull_request.merged_at) {
					const mergedDate = new Date(item.pull_request.merged_at);
					const wasMergedYesterday = mergedDate >= yesterday && mergedDate <= today;
					if (!wasMergedYesterday) {
						log(`Skipping merged PR #${item.number} - not merged yesterday`);
						continue;
					}
				}
			}

			const repository_url = item.repository_url;
			if (!repository_url) {
				logError('repository_url is undefined for item:', item);
				continue;
			}
			const project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
			const title = item.title;
			const number = item.number;
			const html_url = item.html_url;
			if (!githubPrsReviewDataProcessed[project]) {
				// first pr in this repo
				githubPrsReviewDataProcessed[project] = [];
			}
			const obj = {
				number: number,
				html_url: html_url,
				title: title,
				state: item.state,
			};
			githubPrsReviewDataProcessed[project].push(obj);
		}
		for (const repo in githubPrsReviewDataProcessed) {
			let repoLi = '<li> <i>(' + repo + ')</i> - Reviewed ';
			if (githubPrsReviewDataProcessed[repo].length > 1) repoLi += 'PRs - ';
			else {
				repoLi += 'PR - ';
			}
			if (githubPrsReviewDataProcessed[repo].length <= 1) {
				for (const pr in githubPrsReviewDataProcessed[repo]) {
					const pr_arr = githubPrsReviewDataProcessed[repo][pr];
					let prText = '';
					prText +=
						"<a href='" +
						pr_arr.html_url +
						"' target='_blank' rel='noopener noreferrer'>#" +
						pr_arr.number +
						'</a> (' +
						pr_arr.title +
						') ';
					if (showOpenLabel && pr_arr.state === 'open') prText += issue_opened_button;
					// Do not show closed label for reviewed PRs
					prText += '&nbsp;&nbsp;';
					repoLi += prText;
				}
			} else {
				repoLi += '<ul>';
				for (const pr1 in githubPrsReviewDataProcessed[repo]) {
					const pr_arr1 = githubPrsReviewDataProcessed[repo][pr1];
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

	const sessionMergedStatusCache = {};

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

	async function writeGithubIssuesPrs(items) {
		const isAnyFilterActive = onlyIssues || onlyPRs || onlyRevPRs;
		if (!items) {
			return;
		}
		if (!items.length) {
			return;
		}
		const headers = { Accept: 'application/vnd.github.v3+json' };
		if (githubToken) headers.Authorization = `token ${githubToken}`;
		let useMergedStatus = false;
		let fallbackToSimple = false;

		// Get the correct date range for days calculation
		let startDateForRange;
		let endDateForRange;
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

		const daysRange = getDaysBetween(startDateForRange, endDateForRange);

		if (githubToken) {
			useMergedStatus = true;
		} else if (daysRange <= 7) {
			useMergedStatus = true;
		}

		const prsToCheck = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.pull_request && item.state === 'closed' && useMergedStatus && !fallbackToSimple) {
				const repository_url = item.repository_url;
				if (!repository_url) {
					logError('repository_url is undefined for item:', item);
					continue;
				}
				const repoParts = repository_url.split('/');
				const owner = repoParts[repoParts.length - 2];
				const repo = repoParts[repoParts.length - 1];
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
					Materialize.toast(
						'API limit exceeded. Please use a GitHub token for full status. Showing only open/closed PRs.',
						5000,
					);
				}
			} else {
				// Use REST API for each PR, cache results
				for (const pr of prsToCheck) {
					const merged = await fetchPrMergedStatusREST(pr.owner, pr.repo, pr.number, headers);
					mergedStatusResults[`${pr.owner}/${pr.repo}#${pr.number}`] = merged;
				}
			}
		}

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			log('[SCRUM-DEBUG] Processing item:', item);
			// For GitLab, treat all items in the MRs array as MRs
			const isMR = !!item.pull_request; // works for both GitHub and mapped GitLab data

			if (isAnyFilterActive) {
				if (isMR && !onlyPRs) {
					log('[SCRUM-DEBUG] Filters active, skipping PR because onlyPRs is not checked:', item.number);
					continue;
				}
				if (!isMR && !onlyIssues) {
					log('[SCRUM-DEBUG] Filters active, skipping Issue because onlyIssues is not checked:', item.number);
					continue;
				}
			}

			log('[SCRUM-DEBUG] isMR:', isMR, 'platform:', platform, 'item:', item);
			const html_url = item.html_url;
			const repository_url = item.repository_url;
			// Use project name for GitLab, repo extraction for GitHub
			const project =
				platform === 'gitlab' && item.project
					? item.project
					: repository_url
						? repository_url.substr(repository_url.lastIndexOf('/') + 1)
						: '';
			const title = item.title;
			const number = item.number;
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
				let startDateFilter;
				let endDateFilter;
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
				today.setHours(0, 0, 0, 0);
				const itemCreatedDate = new Date(item.created_at);
				itemCreatedDate.setHours(0, 0, 0, 0);
				const isCreatedToday = today.getTime() === itemCreatedDate.getTime();

				const isNewPR = prCreatedDate >= startDateFilter && prCreatedDate <= endDateFilter;
				const prUpdatedDate = new Date(item.updated_at);
				const isUpdatedInRange = prUpdatedDate >= startDateFilter && prUpdatedDate <= endDateFilter;

				// Check if PR has commits in the date range
				const hasCommitsInRange = item._allCommits && item._allCommits.length > 0;

				if (platform === 'github') {
					// For existing PRs (not new), they must be open AND have commits in the date range
					if (!isNewPR) {
						if (item.state !== 'open') {
							log(`[PR DEBUG] Skipping PR #${number} - existing PR but not open`);
							continue;
						}
						if (!hasCommitsInRange) {
							log(`[PR DEBUG] Skipping PR #${number} - existing PR but no commits in date range`);
							continue;
						}
					}
					prAction = isNewPR ? 'Made PR' : 'Updated PR';
					log(`[PR DEBUG] Including PR #${number} as ${prAction}`);

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
						log(`[PR DEBUG] Rendering commits for existing draft PR #${number}:`, item._allCommits);
						li += '<ul>';
						item._allCommits.forEach((commit) => {
							li += `<li style=\"list-style: disc; color: #666;\"><span style=\"color:#2563eb;\">${commit.messageHeadline}</span><span style=\"color:#666; font-size: 11px;\"> (${new Date(commit.committedDate).toLocaleString()})</span></li>`;
						});
						li += '</ul>';
					}
					li += `</li>`;
				} else if (item.state === 'open' || item.state === 'opened') {
					li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_open_button : ''}`;

					if (showCommits && item._allCommits && item._allCommits.length && !isNewPR) {
						log(`[PR DEBUG] Rendering commits for existing PR #${number}:`, item._allCommits);
						li += '<ul>';
						item._allCommits.forEach((commit) => {
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
						const repoParts = repository_url.split('/');
						const owner = repoParts[repoParts.length - 2];
						const repo = repoParts[repoParts.length - 1];
						merged = mergedStatusResults[`${owner}/${repo}#${number}`];
					}
					if (merged === true) {
						li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_merged_button : ''}</li>`;
					} else {
						// Always show closed label for merged === false or merged === null/undefined
						li = `<li><i>(${project})</i> - ${prAction} <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>(#${number})</a> - <a href='${html_url}' target='_blank' rel='noopener noreferrer' contenteditable='false'>${title}</a>${showOpenLabel ? ' ' + pr_closed_button : ''}</li>`;
					}
				}
				log('[SCRUM-DEBUG] Added PR/MR to lastWeekArray:', li, item);
				lastWeekArray.push(li);
				continue; // Prevent issue logic from overwriting PR li
			} else {
				// Only process as issue if not a PR
				if (item.state === 'open' && item.body?.toUpperCase().indexOf('YES') > 0) {
					const li2 =
						'<li><i>(' +
						project +
						')</i> - Work on Issue(#' +
						number +
						") - <a href='" +
						html_url +
						"' target='_blank' rel='noopener noreferrer'>" +
						title +
						'</a>' +
						(showOpenLabel ? ' ' + issue_opened_button : '') +
						'&nbsp;&nbsp;</li>';
					nextWeekArray.push(li2);
				}

				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const itemCreatedDate = new Date(item.created_at);
				itemCreatedDate.setHours(0, 0, 0, 0);
				const isCreatedToday = today.getTime() === itemCreatedDate.getTime();
				const issueActionText = isCreatedToday ? 'Opened Issue' : 'Updated Issue';
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

				log('[SCRUM-DEBUG] Added issue to lastWeekArray:', li, item);
				lastWeekArray.push(li);
			}
		}
		log('[SCRUM-DEBUG] Final lastWeekArray:', lastWeekArray);
		issuesDataProcessed = true;
	}

	const intervalBody = setInterval(() => {
		if (!window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.body) return;

		clearInterval(intervalBody);
		scrumBody = elements.body;
	}, 500);

	const intervalSubject = setInterval(() => {
		const userData = platform === 'gitlab' ? githubUserData || platformUsername : githubUserData;
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
	}, 500);

	// check for github safe writing
	const intervalWriteGithubIssues = setInterval(() => {
		if (outputTarget === 'popup') {
			return;
		}
		const username = platform === 'gitlab' ? platformUsername : platformUsernameLocal;
		if (scrumBody && username && githubIssuesData && githubPrsReviewData) {
			clearInterval(intervalWriteGithubIssues);
			clearInterval(intervalWriteGithubPrs);
			writeGithubIssuesPrs();
		}
	}, 500);
	const intervalWriteGithubPrs = setInterval(() => {
		if (outputTarget === 'popup') {
			return;
		}

		const username = platform === 'gitlab' ? platformUsername : platformUsernameLocal;
		if (scrumBody && username && githubPrsReviewData && githubIssuesData) {
			clearInterval(intervalWriteGithubPrs);
			clearInterval(intervalWriteGithubIssues);
			writeGithubPrsReviews();
		}
	}, 500);

	if (!refreshButton_Placed) {
		const intervalWriteButton = setInterval(() => {
			if (document.getElementsByClassName('F0XO1GC-x-b').length === 3 && scrumBody && enableToggle) {
				refreshButton_Placed = true;
				clearInterval(intervalWriteButton);
				const td = document.createElement('td');
				const button = document.createElement('button');
				button.style = 'background-image:none;background-color:#3F51B5;';
				button.setAttribute('class', 'F0XO1GC-n-a F0XO1GC-G-a');
				button.title = 'Rewrite your SCRUM using updated settings!';
				button.id = 'refreshButton';
				const elemText = document.createTextNode('↻ Rewrite SCRUM!');
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

	await new Promise((resolve) => {
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

	await new Promise((resolve) => {
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
	await new Promise((resolve) => {
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
	$('button>span:contains(New conversation)')
		.parent('button')
		.click(() => {
			allIncluded();
		});
}

window.generateScrumReport = () => {
	allIncluded('popup');
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'forceRefresh') {
		chrome.storage.local.get(['platform'], async (result) => {
			const platform = result.platform || 'github';
			if (platform === 'gitlab') {
				forceGitlabDataRefresh()
					.then((result) => sendResponse(result))
					.catch((err) => {
						console.error('Force refresh failed:', err);
						sendResponse({ success: false, error: err.message });
					});
			} else {
				forceGithubDataRefresh()
					.then((result) => sendResponse(result))
					.catch((err) => {
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
${prs
	.map(
		(pr, i) => `	repo${i}: repository(owner: \"${pr.owner}\", name: \"${pr.repo}\") {
		pr${i}: pullRequest(number: ${pr.number}) { merged }
	}`,
	)
	.join('\n')}
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
		Accept: 'application/vnd.github.v3+json',
	};

	if (token) {
		headers.Authorization = `token ${token}`;
	}

	if (!username) {
		throw new Error('GitHub username is required');
	}

	console.log('Fetching repos for username:', username, 'org:', org);

	try {
		let dateRange = '';
		try {
			const storageData = await new Promise((resolve) => {
				chrome.storage.local.get(['startingDate', 'endingDate', 'yesterdayContribution'], resolve);
			});

			let startDate;
			let endDate;
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
			console.log(`Using date range for repo search: ${startDate} to ${endDate}`);
		} catch (err) {
			console.warn('Could not determine date range, using last 30 days:', err);
			const today = new Date();
			const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
			const startDate = thirtyDaysAgo.toISOString().split('T')[0];
			const endDate = today.toISOString().split('T')[0];
		}
		const orgPart = org && org !== 'all' ? `+org:${org}` : '';
		const issuesUrl = `https://api.github.com/search/issues?q=author:${username}${orgPart}${dateRange}&per_page=100`;
		const commentsUrl = `https://api.github.com/search/issues?q=commenter:${username}${orgPart}${dateRange.replace('created:', 'updated:')}&per_page=100`;

		console.log('Search URLs:', { issuesUrl, commentsUrl });

		const [issuesRes, commentsRes] = await Promise.all([
			fetch(issuesUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) })),
			fetch(commentsUrl, { headers }).catch(() => ({ ok: false, json: () => ({ items: [] }) })),
		]);

		const repoSet = new Set();

		const processRepoItems = (items) => {
			items?.forEach((item) => {
				if (item.repository_url) {
					const urlParts = item.repository_url.split('/');
					const repoFullName = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
					const repoName = `${urlParts[urlParts.length - 1]}`;
					repoSet.add(repoFullName);
				}
			});
		};

		if (issuesRes.ok) {
			const issuesData = await issuesRes.json();
			processRepoItems(issuesData.items);
			console.log(`Found ${issuesData.items?.length || 0} issues/PRs authored by user in date range`);
		}

		if (commentsRes.ok) {
			const commentsData = await commentsRes.json();
			processRepoItems(commentsData.items);
			console.log(`Found ${commentsData.items?.length || 0} issues/PRs with user comments in date range`);
		}

		const repoNames = Array.from(repoSet);
		console.log(`Found ${repoNames.length} unique repositories with contributions in the selected date range`);

		if (repoNames.length === 0) {
			console.log(`No repositories with contrbutions found in the selected date range`);
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

		const repoQueries = repoNames
			.slice(0, 50)
			.map((repoFullName, i) => {
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
			})
			.join('\n');

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
				logError('GraphQL errors fetching repos:', graphQLData.errors);
				return [];
			}

			const repos = Object.values(graphQLData.data)
				.filter((repo) => repo !== null)
				.map((repo) => ({
					name: repo.name,
					fullName: repo.nameWithOwner,
					description: repo.description,
					language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
					updatedAt: repo.pushedAt,
					stars: repo.stargazerCount,
				}));

			return repos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
		} catch (err) {}
	} catch (err) {}
}

function filterDataByRepos(data, selectedRepos) {
	if (!selectedRepos || selectedRepos.length === 0) {
		return data;
	}

	const filteredData = {
		...data,
		githubIssuesData: {
			...data.githubIssuesData,
			items:
				data.githubIssuesData?.items?.filter((item) => {
					const urlParts = item.repository_url?.split('/');
					const fullName = urlParts ? `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}` : '';
					return selectedRepos.includes(fullName);
				}) || [],
		},
		githubPrsReviewData: {
			...data.githubPrsReviewData,
			items:
				data.githubPrsReviewData?.items?.filter((item) => {
					const urlParts = item.repository_url?.split('/');
					const fullName = urlParts ? `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}` : '';
					return selectedRepos.includes(fullName);
				}) || [],
		},
	};
	return filteredData;
}
window.fetchUserRepositories = fetchUserRepositories;
