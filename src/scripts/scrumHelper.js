let refreshButton_Placed = false;
let enableToggle = true;
function allIncluded(outputTarget = 'email') {

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
	let yesterdayContribution = false;
	let githubPrsReviewData = null;
	let githubUserData = null;
	let githubPrsReviewDataProcessed = {};
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
				'yesterdayContribution',
				'userReason',
			],
			(items) => {
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
				if (items.endingDate && !lastWeekContribution && !yesterdayContribution) {
					endingDate = items.endingDate;
				}
				if (items.startingDate && !lastWeekContribution && !yesterdayContribution) {
					startingDate = items.startingDate;
				}
				if (items.githubUsername) {
					githubUsername = items.githubUsername;
					fetchGithubData();
				} else {
					if (outputTarget === 'popup') {
						const generateBtn = document.getElementById('generateReport');
						if (generateBtn) {
							generateBtn.innerHTML = '<i class="fa fa-refresh"></i> Generate Report';
							generateBtn.disabled = false;
						}
						Materialize.toast('Please enter your GitHub username', 3000);
					} else {
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
	function getYesterday() {
		let today = new Date();
		let yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
		let yesterdayMonth = yesterday.getMonth() + 1;
		let yesterdayDay = yesterday.getDate();
		let yesterdayYear = yesterday.getFullYear();
		let yesterdayDisplayPadded = ('0000' + yesterdayYear.toString()).slice(-4) + '-' + ('00' + yesterdayMonth.toString()).slice(-2) + '-' + ('00' + yesterdayDay.toString()).slice(-2);
		return yesterdayDisplayPadded;
	}
	
	// fetch github data
	async function fetchGithubData() {
		try {
			const issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+created%3A${startingDate}..${endingDate}&per_page=100`;
			const prUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+updated%3A${startingDate}..${endingDate}&per_page=100`;
			const userUrl = `https://api.github.com/users/${githubUsername}`;

			// Fetch issues
			const issuesRes = await fetch(issueUrl);
			if (!issuesRes.ok) throw new Error(`Error fetching Github issues: ${issuesRes.status} ${issuesRes.statusText}`);
			githubIssuesData = await issuesRes.json();
			writeGithubIssuesPrs();

			// Fetch PR reviews
			const prRes = await fetch(prUrl);
			if(!prRes.ok) throw new Error(`Error fetching Github PR reviews: ${prRes.status} ${prRes.statusText}`);
			githubPrsReviewData = await prRes.json();
			writeGithubPrsReviews();

			// Fetch github user data
			const userRes = await fetch(userUrl);
			if(!userRes.ok) throw new Error(`Error fetching Github user data: ${userRes.status} ${userRes.statusText}`);
		} catch(err) {
			console.error(err);
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


			let weekOrDay;
			let weekOrDay2;
			const lastWeekRadio = document.getElementById('lastWeekContribution');
			const yesterdayRadio = document.getElementById('yesterdayContribution');

			if(lastWeekRadio && lastWeekRadio.checked) {
				weekOrDay = 'last week'
				weekOrDay2 = 'this week'
			} else if (yesterdayRadio && yesterdayRadio.checked) {
				weekOrDay = 'yesterday';
				weekOrDay2 = 'today';
			} else {
				weekOrDay2 = 'this week';
				lastWeekContribution = false;
			}

			// Create the complete content
			let content;
			if (lastWeekContribution) {
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

		let project = '<project name>';
		let url = window.location.href;
		let projectUrl = url.substr(url.lastIndexOf('/') + 1);
		if (projectUrl === 'susiai') project = 'SUSI.AI';
		else if (projectUrl === 'open-event') project = 'Open Event';
		return project;
	}
	function scrumSubjectLoaded() {
		if (!enableToggle) return;
		setTimeout(() => {
			let name = githubUserData.name || githubUsername;
			let project = getProject();
			let curDate = new Date();
			let year = curDate.getFullYear().toString();
			let date = curDate.getDate();
			let month = curDate.getMonth();
			month++;
			if (month < 10) month = '0' + month;
			if (date < 10) date = '0' + date;
			let dateCode = year.toString() + month.toString() + date.toString();
			scrumSubject.value = '[Scrum] ' + name + ' - ' + project + ' - ' + dateCode + ' - False';
			scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
		});
	}

	function writeGithubPrsReviews() {
		let items = githubPrsReviewData.items;

		reviewedPrsArray = [];
		githubPrsReviewDataProcessed = {};

		for (let i = 0; i < items.length; i++) {
			let item = items[i];
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

			let repository_url = item.repository_url;
			let project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
			let title = item.title;
			let number = item.number;
			let html_url = item.html_url;

			if (!githubPrsReviewDataProcessed[project]) {
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
			let repoLi = '<li><i>(' + repo + ')</i> - Reviewed ';
			if (githubPrsReviewDataProcessed[repo].length > 1) {
				repoLi += 'PRs - ';
			} else {
				repoLi += 'PR - ';
			}

			if (githubPrsReviewDataProcessed[repo].length <= 1) {
				for (let pr in githubPrsReviewDataProcessed[repo]) {
					let pr_arr = githubPrsReviewDataProcessed[repo][pr];
					let prText = '';
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
				for (let pr1 in githubPrsReviewDataProcessed[repo]) {
					let pr_arr1 = githubPrsReviewDataProcessed[repo][pr1];
					let prText1 = '';
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
		let data = githubIssuesData;
		let items = data.items;

		lastWeekArray = [];
		nextWeekArray = [];

		for (let i = 0; i < items.length; i++) {
			let item = items[i];
			console.log(`Processing item ${i + 1}/${items.length}:`, {
				number: item.number,
				title: item.title,
				state: item.state,
				isPR: !!item.pull_request,
				body: item.body ? item.body.substring(0, 100) + "..." : "no body"
			});

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
				if (item.state === 'open' && item.body && item.body.toUpperCase().indexOf('YES') > 0) {
					let li2 = `<li><i>(${project})</i> - Work on Issue(#${number}) - <a href='${html_url}'>${title}</a> ${issue_opened_button}</li>`;
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
		scrumSubjectLoaded();
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
		allIncluded('email');
	}
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