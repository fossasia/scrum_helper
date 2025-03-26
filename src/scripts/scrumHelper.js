var refreshButton_Placed = false;
var enableToggle = true;
function allIncluded() {
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
	var githubPrsReviewDataProccessed = {};
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

	var linkStyle = '';

	function getChromeData() {
		chrome.storage.local.get(
			[
                'githubUsername',
                'projectName',
                'toggleDot',
                'toggleInput',
                'toggleContainer',
                'lastWeekContribution',
                'yesterday',
                'startingDate',
                'endingDate',
                'checkbox',
                'userReason',
                'scrumReport',
                'copyButton',
                'fetchButton',
                'customSelect',
            ],
			(items) => {
				if (items.lastWeekContribution) {
					lastWeekContribution = true;
					handleLastWeekContributionChange();
				}
                if (items.yesterday){
                    yesterday = true;
                    handleYesterdayChange();
                }
				if (!items.enableToggle) {
					enableToggle = items.enableToggle;
				}
				if (items.endingDate && !lastWeekContribution && !yesterday) {
					endingDate = items.endingDate;
				}
				if (items.startingDate && !lastWeekContribution && !yesterday) {
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
			},
		);
	}
	getChromeData();

	function handleLastWeekContributionChange() {
		endingDate = getToday();
		startingDate = getLastWeek();
	}
    function handleYesterdayChange() {
        endingDate = getToday();
        startingDate = getYesterday();
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
    function getYesterday() {
        var today = new Date();
        var noDays_to_goback = 1;
        var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);
        var yesterdayMonth = yesterday.getMonth() + 1;
        var yesterdayDay = yesterday.getDate();
        var yesterdayYear = yesterday.getFullYear();
        var yesterdayDisplayPadded = ('0000' + yesterdayYear.toString()).slice(-4)+ '-' + ('00' + yesterdayMonth.toString()).slice(-2) + '-' + ('00' + yesterdayDay.toString()).slice(-2);
        return yesterdayDisplayPadded;
    }
	// fetch github data
	function fetchGithubData() {
		var issueUrl =
			'https://api.github.com/search/issues?q=author%3A' +
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
				// error
			},
			success: (data) => {
				githubIssuesData = data;
			},
		});
		// fetch github prs review data
		var prUrl =
			'https://api.github.com/search/issues?q=commenter%3A' +
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
				// error
			},
			success: (data) => {
				githubPrsReviewData = data;
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

	
	chrome.runtime.onMessage.addEventListener((request, sender, sendResponse) => {
		if(request.action === 'generateScrumReport'){
			const {
				gihtubUsername,
				projectName,
				startingDate,
				endingDate,
				emailClient,
				userReason
			} = request.data;
			
			const scrumReport = generateScrumReport();
			// modify this logic
			if(window.location.href.includes(emailClient)) {
				injectScrumReport(scrumReport);
			}
			
			sendResponse({ scrumReport: scrumReport });
		}
		return true;
	});

	function generateScrumReport() {
		// Move your existing report generation logic here
		// Return the generated report text
	}
	
	function injectScrumReport(report) {
		// Your existing injection logic, modified to work with selected client
		// This logic is in emailClientAdapter, better would be to use it from there only, so I'll have to export the function there and import it here.
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
			nextWeekUl += '</ul>';

			var weekOrDay = gsoc == 1 ? 'yesterday' : 'last week';
			var weekOrDay2 = gsoc == 1 ? 'today' : 'this week';

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

	function getProject() {
		if (projectName != '') return projectName;

		var project = '<project name>';
		var url = window.location.href;
		var projectUrl = url.substr(url.lastIndexOf('/') + 1);
		if (projectUrl === 'susiai') project = 'SUSI.AI';
		else if (projectUrl === 'open-event') project = 'Open Event';
		return project;
	}
	//load initial scrum subject
	function scrumSubjectLoaded() {
		if (!enableToggle) return;
		setTimeout(() => {
			//to apply this after google has autofilled
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

	// write PRs Reviewed
	function writeGithubPrsReviews() {
		var items = githubPrsReviewData.items;
		var i;
		for (i = 0; i < items.length; i++) {
			var item = items[i];
			if (item.user.login == githubUsername || !item.pull_request) continue;
			var repository_url = item.repository_url;
			var project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
			var title = item.title;
			var number = item.number;
			var html_url = item.html_url;
			if (!githubPrsReviewDataProccessed[project]) {
				// first pr in this repo
				githubPrsReviewDataProccessed[project] = [];
			}
			var obj = {
				number: number,
				html_url: html_url,
				title: title,
				state: item.state,
			};
			githubPrsReviewDataProccessed[project].push(obj);
		}
		for (var repo in githubPrsReviewDataProccessed) {
			var repoLi =
				'<li> \
		<i>(' +
				repo +
				')</i> - Reviewed ';
			if (githubPrsReviewDataProccessed[repo].length > 1) repoLi += 'PRs - ';
			else {
				repoLi += 'PR - ';
			}
			if (githubPrsReviewDataProccessed[repo].length <= 1) {
				for (var pr in githubPrsReviewDataProccessed[repo]) {
					var pr_arr = githubPrsReviewDataProccessed[repo][pr];
					var prText = '';
					prText +=
						"<a href='" + pr_arr.html_url + "' target='_blank'>#" + pr_arr.number + '</a> (' + pr_arr.title + ') ';
					if (pr_arr.state === 'open') prText += issue_opened_button;
					else prText += issue_closed_button;
					prText += '&nbsp;&nbsp;';
					repoLi += prText;
				}
			} else {
				repoLi += '<ul>';
				for (var pr1 in githubPrsReviewDataProccessed[repo]) {
					var pr_arr1 = githubPrsReviewDataProccessed[repo][pr1];
					var prText1 = '';
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
		var data = githubIssuesData;
		var items = data.items;
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var html_url = item.html_url;
			var repository_url = item.repository_url;
			var project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
			var title = item.title;
			var number = item.number;
			var li = '';
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
					var li2 =
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
	//check for scrum body loaded
	// var intervalBody = setInterval(function(){
	// 	var bodies = [
	// 		document.getElementById("p-b-0"),
	// 		document.getElementById("p-b-1"),
	// 		document.getElementById("p-b-2"),
	// 		document.querySelector("c-wiz [aria-label='Compose a message'][role=textbox]")];
	// 	for (var body of bodies) {
	// 		if (!body)
	// 			continue;
	// 		clearInterval(intervalBody);
	// 		scrumBody=body;
	// 		writeScrumBody();
	// 	}
	// },500);
	var intervalBody = setInterval(() => {
		if (!window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.body) return;

		clearInterval(intervalBody);
		scrumBody = elements.body;
		writeScrumBody();
	}, 500);

	//check for subject loaded
	// var intervalSubject = setInterval(function(){
	// 	if (!githubUserData)
	// 		return;
	// 	var subjects = [
	// 		document.getElementById("p-s-0"),
	// 		document.getElementById("p-s-1"),
	// 		document.getElementById("p-s-2"),
	// 		document.querySelector("c-wiz input[aria-label=Subject]")];
	// 	for (var subject of subjects) {
	// 		if (!subject)
	// 			continue;
	// 		clearInterval(intervalSubject);
	// 		scrumSubject=subject;
	// 		scrumSubjectLoaded();
	// 	}
	// },500);
	var intervalSubject = setInterval(() => {
		if (!githubUserData || !window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.subject) return;

		clearInterval(intervalSubject);
		scrumSubject = elements.subject;
		scrumSubjectLoaded();
	}, 500);

	//check for github safe writing
	var intervalWriteGithub = setInterval(() => {
		if (scrumBody && githubUsername && githubIssuesData) {
			clearInterval(intervalWriteGithub);
			writeGithubIssuesPrs();
		}
	}, 500);
	//check for github prs reviews safe writing
	var intervalWriteGithubReviews = setInterval(() => {
		if (scrumBody && githubUsername && githubPrsReviewData) {
			clearInterval(intervalWriteGithubReviews);
			writeGithubPrsReviews();
		}
	}, 500);
	if (!refreshButton_Placed) {
		var intervalWriteButton = setInterval(() => {
			if (document.getElementsByClassName('F0XO1GC-x-b').length == 3 && scrumBody && enableToggle) {
				refreshButton_Placed = true;
				clearInterval(intervalWriteButton);
				var td = document.createElement('td');
				var button = document.createElement('button');
				button.style = 'background-image:none;background-color:#3F51B5;';
				button.setAttribute('class', 'F0XO1GC-n-a F0XO1GC-G-a');
				button.title = 'Rewrite your SCRUM using updated settings!';
				button.id = 'refreshButton';
				var elemText = document.createTextNode('↻ Rewrite SCRUM!');
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
