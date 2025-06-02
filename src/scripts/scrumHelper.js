var enableToggle = true;

// Settings and template management
const DEFAULT_SETTINGS = {
	sections: {
		tasks: true,
		prs: true,
		reviewed: true,
		blockers: true
	},
	filters: {
		openOnly: false,
		excludeDrafts: false
	}
};

// Load settings from storage
function loadSettings() {
	return new Promise((resolve) => {
		chrome.storage.local.get(['scrumSettings', 'scrumTemplates'], (result) => {
			const settings = result.scrumSettings || DEFAULT_SETTINGS;
			const templates = result.scrumTemplates || {};
			resolve({ settings, templates });
		});
	});
}

// Save settings to storage
function saveSettings(settings) {
	return new Promise((resolve) => {
		chrome.storage.local.set({ scrumSettings: settings }, resolve);
	});
}

// Save template
function saveTemplate(name, settings) {
	return new Promise((resolve) => {
		chrome.storage.local.get(['scrumTemplates'], (result) => {
			const templates = result.scrumTemplates || {};
			templates[name] = settings;
			chrome.storage.local.set({ scrumTemplates: templates }, resolve);
		});
	});
}

// Load template
function loadTemplate(name) {
	return new Promise((resolve) => {
		chrome.storage.local.get(['scrumTemplates'], (result) => {
			const templates = result.scrumTemplates || {};
			resolve(templates[name]);
		});
	});
}

// Delete template
function deleteTemplate(name) {
	return new Promise((resolve) => {
		chrome.storage.local.get(['scrumTemplates'], (result) => {
			const templates = result.scrumTemplates || {};
			delete templates[name];
			chrome.storage.local.set({ scrumTemplates: templates }, resolve);
		});
	});
}

// Filter GitHub data based on settings
function filterGithubData(data, settings) {
	if (!data || !data.items) return data;

	let filteredItems = data.items;

	if (settings.filters.openOnly) {
		filteredItems = filteredItems.filter(item => item.state === 'open');
	}

	if (settings.filters.excludeDrafts) {
		filteredItems = filteredItems.filter(item => !item.draft);
	}

	return { ...data, items: filteredItems };
}

function allIncluded(outputTarget = 'email') {
	console.log('allIncluded called with outputTarget:', outputTarget);
	console.log('Current window context:', window.location.href);
	/* global $*/
	var scrumBody = null;
	var scrumSubject = null;
	var startingDate = '';
	var endingDate = '';
	var githubUsername = '';
	var projectName = '';
	var lastWeekArray = [];
	var nextWeekArray = [];
	var reviewedPrsArray = [];
	var githubIssuesData = null;
	var lastWeekContribution = false;
	var githubPrsReviewData = null;
	var githubUserData = null;
	var githubPrsReviewDataProcessed = {};
	var showOpenLabel = true;
	var showClosedLabel = true;
	var userReason = '';
	var gsoc = 0; //0 means codeheat. 1 means gsoc

	var pr_merged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	var pr_unmerged_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

	var issue_closed_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #6f42c1;border-radius: 3px;line-height: 12px;margin-bottom: 2px;" class="State State--purple">closed</div>';
	var issue_opened_button =
		'<div style="vertical-align:middle;display: inline-block;padding: 0px 4px;font-size:9px;font-weight: 600;color: #fff;text-align: center;background-color: #2cbe4e;border-radius: 3px;line-height: 12px;margin-bottom: 2px;"  class="State State--green">open</div>';

	// var linkStyle = '';
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
				'userReason',
				'gsoc',
			],
			(items) => {
				console.log("Storage items received:", items);
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
			},
		);
	}
	getChromeData();

	function handleLastWeekContributionChange() {
		endingDate = getToday();
		startingDate = getLastWeek();
	}
	function getLastWeek() {
		var today = new Date();
		var noDays_to_goback = gsoc == 0 ? 7 : 1;
		var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
		var lastWeekMonth = lastWeek.getMonth() + 1;
		var lastWeekDay = lastWeek.getDate();
		var lastWeekYear = lastWeek.getFullYear();
		var lastWeekDisplayPadded =
			('0000' + lastWeekYear.toString()).slice(-4) +
			'-' +
			('00' + lastWeekMonth.toString()).slice(-2) +
			'-' +
			('00' + lastWeekDay.toString()).slice(-2);
		return lastWeekDisplayPadded;
	}
	function getToday() {
		var today = new Date();
		var Week = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		var WeekMonth = Week.getMonth() + 1;
		var WeekDay = Week.getDate();
		var WeekYear = Week.getFullYear();
		var WeekDisplayPadded =
			('0000' + WeekYear.toString()).slice(-4) +
			'-' +
			('00' + WeekMonth.toString()).slice(-2) +
			'-' +
			('00' + WeekDay.toString()).slice(-2);
		return WeekDisplayPadded;
	}
	// fetch github data
	function fetchGithubData() {
		var issueUrl = 'https://api.github.com/search/issues?q=author%3A' +
			githubUsername +
			'+org%3Afossasia+created%3A' +
			startingDate +
			'..' +
			endingDate +
			'&per_page=100';

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: issueUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitHub data:', {
					status: xhr.status,
					textStatus: textStatus,
					error: errorThrown
				});
			},
			success: (data) => {
				githubIssuesData = data;
				writeGithubIssuesPrs();
			},
		});

		// PR reviews fetch
		var prUrl = 'https://api.github.com/search/issues?q=commenter%3A' +
			githubUsername +
			'+org%3Afossasia+updated%3A' +
			startingDate +
			'..' +
			endingDate +
			'&per_page=100';

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: prUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching PR reviews:', {
					status: xhr.status,
					textStatus: textStatus,
					error: errorThrown
				});
			},
			success: (data) => {
				githubPrsReviewData = data;
				writeGithubPrsReviews();
			},
		});
		// fetch github user data
		var userUrl = 'https://api.github.com/users/' + githubUsername;
		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: userUrl,
			error: (xhr, textStatus, errorThrown) => {
				// error
			},
			success: (data) => {
				githubUserData = data;
			},
		});
	}

	function formatDate(dateString) {
		const date = new Date(dateString);
		const options = { day: '2-digit', month: 'short', year: 'numeric' };
		return date.toLocaleDateString('en-US', options);
	}

	//load initial text in scrum body
	function writeScrumBody() {
		if (!enableToggle) return;

		loadSettings().then(({ settings }) => {
			setTimeout(() => {
				// Generate content based on enabled sections
				var lastWeekUl = '<ul>';
				var i;

				if (settings.sections.tasks || settings.sections.prs) {
					for (i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
				}

				if (settings.sections.reviewed) {
					for (i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
				}

				lastWeekUl += '</ul>';

				var nextWeekUl = '<ul>';
				for (i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
				nextWeekUl += '</ul>';

				// Determine the time period text based on whether it's custom dates or default
				var timePeriodText;
				if (lastWeekContribution) {
					timePeriodText = gsoc == 1 ? 'yesterday' : 'last week';
				} else {
					timePeriodText = `from ${formatDate(startingDate)} to ${formatDate(endingDate)}`;
				}

				// Create content with enabled sections
				let content = '';

				content += `<b>1. What did I do ${timePeriodText}?</b><br>${lastWeekUl}<br>`;
				content += `<b>2. What I plan to do this week?</b><br>${nextWeekUl}<br>`;

				if (settings.sections.blockers) {
					content += `<b>3. What is stopping me from doing my work?</b><br>${userReason}`;
				}

				// Update the scrum report
				if (outputTarget === 'popup') {
					const reportElement = document.getElementById('scrumReport');
					if (reportElement) {
						reportElement.innerHTML = content;
					}
				} else {
					const elements = window.emailClientAdapter.getEditorElements();
					if (!elements || !elements.body) {
						console.error('Email client editor not found');
						return;
					}
					window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
				}
			}, 100);
		});
	}

	function getProject() {
		if (projectName != '') return projectName;

		var project = '<project name>';
		var url = window.location.href;
		var projectUrl = url.substr(url.lastIndexOf('/') + 1);
		if (projectUrl === 'susiai') project = 'SUSI.AI';
		else if (projectUrl === 'open-event') project = 'Open Event';
		return project;
	}
	function scrumSubjectLoaded() {
		if (!enableToggle) return;
		setTimeout(() => {
			var name = githubUserData.name || githubUsername;
			var project = getProject();
			var curDate = new Date();
			var year = curDate.getFullYear().toString();
			var date = curDate.getDate();
			var month = curDate.getMonth();
			month++;
			if (month < 10) month = '0' + month;
			if (date < 10) date = '0' + date;
			var dateCode = year.toString() + month.toString() + date.toString();
			scrumSubject.value = '[Scrum] ' + name + ' - ' + project + ' - ' + dateCode + ' - False';
			scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
		});
	}

	function writeGithubPrsReviews() {
		if (!githubPrsReviewData) return;

		// Load settings before processing reviews
		loadSettings().then(({ settings }) => {
			if (settings.sections.reviewed) {
				const filteredData = filterGithubData(githubPrsReviewData, settings);
				var items = filteredData.items;

				reviewedPrsArray = [];
				githubPrsReviewDataProcessed = {};

				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					console.log(`Review item ${i + 1}/${items.length}:`, {
						number: item.number,
						author: item.user.login,
						type: item.pull_request ? "PR" : "Issue",
						state: item.state,
						title: item.title
					});

					if (item.user.login === githubUsername) {
						continue;
					}

					var repository_url = item.repository_url;
					var project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
					var title = item.title;
					var number = item.number;
					var html_url = item.html_url;

					if (!githubPrsReviewDataProcessed[project]) {
						githubPrsReviewDataProcessed[project] = [];
					}

					var obj = {
						number: number,
						html_url: html_url,
						title: title,
						state: item.state,
					};
					githubPrsReviewDataProcessed[project].push(obj);
				}

				for (var repo in githubPrsReviewDataProcessed) {
					var repoLi = '<li><i>(' + repo + ')</i> - Reviewed ';
					if (githubPrsReviewDataProcessed[repo].length > 1) {
						repoLi += 'PRs - ';
					} else {
						repoLi += 'PR - ';
					}

					if (githubPrsReviewDataProcessed[repo].length <= 1) {
						for (var pr in githubPrsReviewDataProcessed[repo]) {
							var pr_arr = githubPrsReviewDataProcessed[repo][pr];
							var prText = '';
							prText += `<a href='${pr_arr.html_url}' target='_blank'>#${pr_arr.number}</a> (${pr_arr.title}) `;
							if (pr_arr.state === 'open') {
								prText += issue_opened_button;
							} else {
								prText += issue_closed_button;
							}
							prText += '&nbsp;&nbsp;';
							repoLi += prText;
						}
					} else {
						repoLi += '<ul>';
						for (var pr1 in githubPrsReviewDataProcessed[repo]) {
							var pr_arr1 = githubPrsReviewDataProcessed[repo][pr1];
							var prText1 = '';
							prText1 += `<li><a href='${pr_arr1.html_url}' target='_blank'>#${pr_arr1.number}</a> (${pr_arr1.title}) `;
							if (pr_arr1.state === 'open') {
								prText1 += issue_opened_button;
							} else {
								prText1 += issue_closed_button;
							}
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
		});
	}
	function writeGithubIssuesPrs() {
		if (!githubIssuesData) return;

		// Load settings before processing data
		loadSettings().then(({ settings }) => {
			const filteredData = filterGithubData(githubIssuesData, settings);
			lastWeekArray = []; // Reset the array before processing

			// Process issues and PRs based on section toggles
			if (settings.sections.tasks || settings.sections.prs) {
				filteredData.items.forEach((item) => {
					const isPR = 'pull_request' in item;
					if ((isPR && settings.sections.prs) || (!isPR && settings.sections.tasks)) {
						var html_url = item.html_url;
						var repository_url = item.repository_url;
						var project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
						var title = item.title;
						var number = item.number;
						var li = '';

						if (item.pull_request) {
							if (item.state === 'closed') {
								li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_merged_button}</li>`;
							} else if (item.state === 'open') {
								li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}'>${title}</a> ${pr_unmerged_button}</li>`;
							}
						} else {
							if (item.state === 'open' && item.body && item.body.toUpperCase().indexOf('YES') > 0) {
								var li2 = `<li><i>(${project})</i> - Work on Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
								nextWeekArray.push(li2);
							}
							if (item.state === 'open') {
								li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
							} else if (item.state === 'closed') {
								li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_closed_button}</li>`;
							}
						}
						if (li) {
							lastWeekArray.push(li);
						}
					}
				});
			}

			// Now process PR reviews
			writeGithubPrsReviews();
		});
	}
	var intervalBody = setInterval(() => {
		if (!window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.body) return;

		clearInterval(intervalBody);
		scrumBody = elements.body;
		writeScrumBody();
	}, 500);

	var intervalSubject = setInterval(() => {
		if (!githubUserData || !window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.subject) return;

		clearInterval(intervalSubject);
		scrumSubject = elements.subject;
		scrumSubjectLoaded();
	}, 500);

	//check for github safe writing for both issues/prs and pr reviews
	var intervalWriteGithub = setInterval(() => {
		if (scrumBody && githubUsername && githubIssuesData && githubPrsReviewData) {
			clearInterval(intervalWriteGithub);
			// First process the PRs and issues
			writeGithubIssuesPrs();
			// writeGithubPrsReviews will be called from within writeGithubIssuesPrs after it's done
		}
	}, 500);
}
allIncluded('email');
$('button>span:contains(New conversation)').parent('button').click(() => {
	allIncluded();
});

window.generateScrumReport = function () {
	allIncluded('popup');
};

$('button>span:contains(New conversation)')
	.parent('button')
	.click(() => {
		allIncluded();
	});