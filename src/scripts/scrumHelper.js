console.log('Script loaded, adapter exists:', !!window.emailClientAdapter);
var enableToggle = true;
var gitlabProjectIdToName = {};
function allIncluded(outputTarget = 'email') {
	console.log('allIncluded called with outputTarget:', outputTarget);
	console.log('Current window context:', window.location.href);
	/* global $*/
	var scrumBody = null;
	var scrumSubject = null;
	var startingDate = '';
	var endingDate = '';
	var githubUsername = '';
	var gitlabUsername = '';
	var projectName = '';
	var platform = 'github';
	var lastWeekArray = [];
	var nextWeekArray = [];
	var reviewedPrsArray = [];
	var githubIssuesData = null;
	var gitlabIssuesData = null;
	var lastWeekContribution = false;
	let yesterdayContribution = false;
	var githubPrsReviewData = null;
	var gitlabPrsReviewData = null;
	var githubUserData = null;
	var gitlabUserData = null;
	var githubPrsReviewDataProcessed = {};
	var gitlabPrsReviewDataProcessed = {};
	var showOpenLabel = true;
	var showClosedLabel = true;
	var userReason = '';

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
				'gitlabUsername',
				'projectName',
				'enableToggle',
				'startingDate',
				'endingDate',
				'showOpenLabel',
				'showClosedLabel',
				'lastWeekContribution',
				'yesterdayContribution',
				'userReason',
				'platform',
			],
			(items) => {
				console.log("Storage items received:", items);

				if (items.platform) {
					platform = items.platform;
				}

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

				if (platform === 'github') {
					if (items.githubUsername) {
						githubUsername = items.githubUsername;
						console.log("About to fetch GitHub data for:", githubUsername);
						fetchGithubData();
					} else {
						if (outputTarget === 'popup') {
							console.log("No GitHub username found - popup context");
							const generateBtn = document.getElementById('generateReport');
							if (generateBtn) {
								generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
								generateBtn.disabled = false;
							}
							Materialize.toast('Please enter your GitHub username', 3000);
						} else {
							console.log("No GitHub username found - email context");
							console.warn('No GitHub username found in storage');
						}
					}
				} else {
					if (items.gitlabUsername) {
						gitlabUsername = items.gitlabUsername;
						console.log("About to fetch GitLab data for:", gitlabUsername);
						fetchGitlabData();
					} else {
						if (outputTarget === 'popup') {
							console.log("No GitLab username found - popup context");
							const generateBtn = document.getElementById('generateReport');
							if (generateBtn) {
								generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
								generateBtn.disabled = false;
							}
							Materialize.toast('Please enter your GitLab username', 3000);
						} else {
							console.log("No GitLab username found - email context");
							console.warn('No GitLab username found in storage');
						}
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
	function handleYesterdayContributionChange() {
		endingDate = getToday();
		startingDate = getYesterday();
	}
	function getLastWeek() {
		var today = new Date();
		var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
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
	function getYesterday() {
		let today = new Date();
		let yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
		let yesterdayMonth = yesterday.getMonth() + 1;
		let yesterdayWeekDay = yesterday.getDate();
		let yesterdayYear = yesterday.getFullYear();
		let yesterdayPadded =
			('0000' + yesterdayYear.toString()).slice(-4) +
			'-' +
			('00' + yesterdayMonth.toString()).slice(-2) +
			'-' +
			('00' + yesterdayWeekDay.toString()).slice(-2);
		return yesterdayPadded;
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
			var lastWeekUl = '<ul>';
			var i;
			for (i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
			for (i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
			lastWeekUl += '</ul>';

			var nextWeekUl = '<ul>';
			for (i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
			nextWeekUl += '</ul>';

			var weekOrDay = lastWeekContribution ? 'last week' : (yesterdayContribution ? 'yesterday' : 'the period');
			var weekOrDay2 = lastWeekContribution ? 'this week' : 'today';

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
					console.log("found div, updating content");
					scrumReport.innerHTML = content;

					// Reset generate button
					const generateBtn = document.getElementById('generateReport');
					if (generateBtn) {
						generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
						generateBtn.disabled = false;
					}
				}
			} else {

				const elements = window.emailClientAdapter.getEditorElements();
				if (!elements || !elements.body) {
					console.error('Email client editor not found');
					return;
				}
				window.emailClientAdapter.injectContent(elements.body, content, elements.eventTypes.contentChange);
			}
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
		try {


			if (!enableToggle) return;
			if (!scrumSubject) {
				console.error('Subject element not found');
				return;
			}
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
		} catch (err) {
			console.err('Error while setting subject: ', err);
		}
	}

	function writeGithubPrsReviews() {
		var items = githubPrsReviewData.items;

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
	function writeGithubIssuesPrs() {
		var data = githubIssuesData;
		var items = data.items;

		lastWeekArray = [];
		nextWeekArray = [];

		for (var i = 0; i < items.length; i++) {
			var item = items[i];
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
			} else {
			}
		}
		writeScrumBody();
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

	//check for github safe writing for both issues/prs and pr reviews
	var intervalWriteGithub = setInterval(() => {
		if (scrumBody && githubUsername && githubIssuesData && githubPrsReviewData) {
			clearInterval(intervalWriteGithub);
			writeGithubIssuesPrs();
			writeGithubPrsReviews();
		}
	}, 500);

	// Helper functions for ISO date range
	function getStartOfDayISO(dateString) {
		return dateString + 'T00:00:00Z';
	}
	function getEndOfDayISO(dateString) {
		return dateString + 'T23:59:59Z';
	}

	function fetchGitlabData() {
		// First get user's activities directly
		var issuesUrl = `https://gitlab.com/api/v4/issues?author_username=${gitlabUsername}&created_after=${getStartOfDayISO(startingDate)}&created_before=${getEndOfDayISO(endingDate)}&per_page=100&scope=all`;
		console.log('[GitLab] Fetching all issues:', issuesUrl);

		// Fetch all issues created by the user
		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: issuesUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitLab issues:', {
					status: xhr.status,
					textStatus: textStatus,
					error: errorThrown
				});
				Materialize.toast('Error fetching GitLab issues. Please check your username.', 3000);
			},
			success: (issues) => {
				console.log('[GitLab] Issues fetched:', issues);
				gitlabIssuesData = issues;
				writeGitlabIssuesPrs();
			}
		});

		// Fetch all merge requests created by the user
		var mrsUrl = `https://gitlab.com/api/v4/merge_requests?author_username=${gitlabUsername}&created_after=${getStartOfDayISO(startingDate)}&created_before=${getEndOfDayISO(endingDate)}&per_page=100&scope=all`;
		console.log('[GitLab] Fetching all MRs:', mrsUrl);

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: mrsUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitLab MRs:', {
					status: xhr.status,
					textStatus: textStatus,
					error: errorThrown
				});
				Materialize.toast('Error fetching GitLab merge requests.', 3000);
			},
			success: (mrs) => {
				console.log('[GitLab] MRs fetched:', mrs);
				gitlabPrsReviewData = mrs;
				writeGitlabPrsReviews();
			}
		});

		// Fetch GitLab user data
		var userUrl = `https://gitlab.com/api/v4/users?username=${gitlabUsername}`;
		console.log('[GitLab] Fetching user data:', userUrl);
		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: userUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitLab user data:', {
					status: xhr.status,
					textStatus: textStatus,
					error: errorThrown
				});
			},
			success: (data) => {
				if (data && data.length > 0) {
					gitlabUserData = data[0];
					console.log('[GitLab] User data:', gitlabUserData);
				}
			},
		});
	}

	function getProjectName(item) {
		// Get the project name from the full path
		if (item.references?.full) {
			return item.references.full.split('/').pop();
		}
		if (item.project?.path_with_namespace) {
			return item.project.path_with_namespace.split('/').pop();
		}
		if (item.project?.name) {
			return item.project.name;
		}
		return 'Unknown Project';
	}

	function writeGitlabIssuesPrs() {
		if (!gitlabIssuesData) return;

		lastWeekArray = [];
		nextWeekArray = [];

		for (var i = 0; i < gitlabIssuesData.length; i++) {
			var item = gitlabIssuesData[i];
			var web_url = item.web_url;
			var project = getProjectName(item);
			var title = item.title;
			var iid = item.iid;
			var li = '';

			if (item.state === 'closed') {
				li = `<li><i>(${project})</i> - Opened Issue(#${iid}) - <a href='${web_url}'>${title}</a> ${issue_closed_button}</li>`;
			} else if (item.state === 'opened') {
				li = `<li><i>(${project})</i> - Opened Issue(#${iid}) - <a href='${web_url}'>${title}</a> ${issue_opened_button}</li>`;
			}

			if (li) {
				lastWeekArray.push(li);
			}
		}
		console.log('[GitLab] Scrum lastWeekArray (issues):', lastWeekArray);
		writeScrumBody();
	}

	function writeGitlabPrsReviews() {
		if (!gitlabPrsReviewData) return;

		reviewedPrsArray = [];
		gitlabPrsReviewDataProcessed = {};

		for (var i = 0; i < gitlabPrsReviewData.length; i++) {
			var item = gitlabPrsReviewData[i];
			var web_url = item.web_url;
			var project = getProjectName(item);
			var title = item.title;
			var iid = item.iid;

			if (!gitlabPrsReviewDataProcessed[project]) {
				gitlabPrsReviewDataProcessed[project] = [];
			}

			var obj = {
				number: iid,
				html_url: web_url,
				title: title,
				state: item.state
			};
			gitlabPrsReviewDataProcessed[project].push(obj);
		}

		for (var repo in gitlabPrsReviewDataProcessed) {
			var repoLi = '<li><i>(' + repo + ')</i> - Created ';
			if (gitlabPrsReviewDataProcessed[repo].length > 1) {
				repoLi += 'MRs - ';
			} else {
				repoLi += 'MR - ';
			}
			if (gitlabPrsReviewDataProcessed[repo].length <= 1) {
				for (var pr in gitlabPrsReviewDataProcessed[repo]) {
					var pr_arr = gitlabPrsReviewDataProcessed[repo][pr];
					var prText = '';
					prText += `<a href='${pr_arr.html_url}' target='_blank'>#${pr_arr.number}</a> (${pr_arr.title}) `;
					if (pr_arr.state === 'opened') {
						prText += issue_opened_button;
					} else {
						prText += issue_closed_button;
					}
					prText += '&nbsp;&nbsp;';
					repoLi += prText;
				}
			} else {
				repoLi += '<ul>';
				for (var pr1 in gitlabPrsReviewDataProcessed[repo]) {
					var pr_arr1 = gitlabPrsReviewDataProcessed[repo][pr1];
					var prText1 = '';
					prText1 += `<li><a href='${pr_arr1.html_url}' target='_blank'>#${pr_arr1.number}</a> (${pr_arr1.title}) `;
					if (pr_arr1.state === 'opened') {
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
		console.log('[GitLab] Scrum reviewedPrsArray (MRs):', reviewedPrsArray);
		writeScrumBody();
	}
}
allIncluded('email');
$('button>span:contains(New conversation)').parent('button').click(() => {
	allIncluded();
});

window.generateScrumReport = function () {
	allIncluded('popup');
};