var enableToggle = true;
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
	let todayReviewedPrsArray = [];
	var githubIssuesData = null;
	var lastWeekContribution = false;
	var githubPrsReviewData = null;
	var githubUserData = null;
	var githubPrsReviewDataProcessed = {};
	let todayReviewsProcessed = {};
	let previousReviewsProcessed = {};
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
				}  else {
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

		setTimeout(() => {
			// Generate content first
			var lastWeekUl = '<ul>';
			var i;
			for (i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
			for (i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
			lastWeekUl += '</ul>';

			var nextWeekUl = '<ul>';
			for (i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
			for (i = 0; i < todayReviewedPrsArray.length; i++) nextWeekUl += todayReviewedPrsArray[i];
			nextWeekUl += '</ul>';

			var weekOrDay = gsoc == 1 ? 'yesterday' : 'last week';
			var weekOrDay2 = gsoc == 1 ? 'today' : 'this week';

			// Create the complete content
			let content;
        if (lastWeekContribution == true) {
            content = `<b>1. What did I do ${weekOrDay}?</b><br>
${lastWeekUl}<br>
<b>2. What I plan to do ${weekOrDay2}?</b><br>
${nextWeekUl}<br>
<b>3. What is stopping me from doing my work?</b><br>
${userReason}`;
        } else {
            content = `<b>1. What did I do from ${formatDate(startingDate)} to ${formatDate(endingDate)}?</b><br>
${lastWeekUl}<br>
<b>2. What I plan to do ${weekOrDay2}?</b><br>
${nextWeekUl}<br>
<b>3. What is stopping me from doing my work?</b><br>
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
		var items = githubPrsReviewData.items;
		let today = new Date().toISOString().split('T')[0];
		githubPrsReviewDataProcessed = {};
		
		let todayReviewsProcessed = {};
		let previousReviewsProcessed = {};
		reviewedPrsArray = [];
		todayReviewedPrsArray = [];

		
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
			let itemDate = new Date(item.updated_at).toISOString().split('T')[0];

			var obj = {
				number: number,
				html_url: html_url,
				title: title,
				state: item.state,
			};

			if(itemDate === today) {
				if(!todayReviewsProcessed[project]) {
					todayReviewsProcessed[project] = [];
				}
				todayReviewsProcessed[project].push(obj);
			} else {
				if(!previousReviewsProcessed[project]) {
					previousReviewsProcessed[project] = [];
				}
				previousReviewsProcessed[project].push(obj);
			}
		}
		for (let repo in previousReviewsProcessed) {
			let repoLi = formatReviewsList(repo, previousReviewsProcessed[repo]);
			reviewedPrsArray.push(repoLi);
		}
		for( let repo in todayReviewsProcessed) {
			let repoLi = formatReviewsList(repo, todayReviewsProcessed[repo]);
			todayReviewedPrsArray.push(repoLi);
		} 
		writeScrumBody(); 
	}
	function formatReviewsList(repo, reviews) {
		let repoLi = `<li><i> ${repo} </i> - Reviewed`;
		if(reviews.length > 1) {
			repoLi += `PRs - `;
		} else {
			repoLi += `PR - `;
		}

		if(reviews.length <= 1) {
			for(let pr in reviews) {
				let pr_arr = reviews[pr];
				let prText = ``;
				prText += `<a href='${pr_arr.html_url}' target='_blank'>#${pr_arr.number}</a> (${pr_arr.title}) `;
				prText += pr_arr.state === 'open' ? issue_opened_button : issue_closed_button;
				prText += '&nbsp;&nbsp;';
				repoLi += prText;
			}
		} else {
			repoLi += `<ul>`;
			for(let pr in reviews) {
				let pr_arr = reviews[pr];
				let prText = ``;
				prText += `<li><a href='${pr_arr.html_url}' target='_blank'>#${pr_arr.number}</a> (${pr_arr.title}) `;
				prText += pr_arr.state === 'open' ? issue_opened_button : issue_closed_button;
				prText += '&nbsp;&nbsp;</li>';
				repoLi += prText;
			}
			repoLi += `</ul>`;
		}
		repoLi += `</li>`;
		return repoLi;
	}
	function writeGithubIssuesPrs() {
		var data = githubIssuesData;
		var items = data.items;
		let today = new Date().toISOString().split('T');
		
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
			let itemDate = new Date(item.created_at).toISOString().split('T')[0];
			
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
				// 
				if(itemDate === today ){
					nextWeekArray.push(li);
				} else {
					lastWeekArray.push(li);
				}
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

		clearInterval(intervalSubject);
		scrumSubject = elements.subject;
		scrumSubjectLoaded();
	}, 500);

	//check for github safe writing for both issues/prs and pr reviews
	var intervalWriteGithub = setInterval(() => {
		if (scrumBody && githubUsername && githubIssuesData && githubPrsReviewData) {
			clearInterval(intervalWriteGithub);
			writeGithubIssuesPrs();
			writeGithubPrsReviews();
		}
	}, 500);
}
allIncluded('email'); 
$('button>span:contains(New conversation)').parent('button').click(() => {
    allIncluded(); 
});

window.generateScrumReport = function() {
    allIncluded('popup');
};

$('button>span:contains(New conversation)')
	.parent('button')
	.click(() => {
		allIncluded();
	});