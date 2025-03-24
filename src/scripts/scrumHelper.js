let refreshButton_Placed = false;
let enableToggle = true;
function allIncluded() {
	/* global $*/
	let scrumBody = null;
	let scrumSubject = null;
	let startingDate = '';
	let endingDate = '';
	let githubUsername = '';
	let projectName = '';
	const lastWeekArray = [];
	const nextWeekArray = [];
	const reviewedPrsArray = [];
	let githubIssuesData = null;
	let lastWeekContribution = false;
	let githubPrsReviewData = null;
	let githubPrCommitsData = null;
	let githubUserData = null;
	const githubPrsReviewDataProccessed = {};
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

	const linkStyle = '';
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
				if (items.projectName) {
					projectName = items.projectName;
				}
				if (items.endingDate && !lastWeekContribution) {
					endingDate = items.endingDate;
				}
				if (items.startingDate && !lastWeekContribution) {
					startingDate = items.startingDate;
				}
				if (items.projectName) {
					projectName = items.projectName;
				}
				if (items.githubUsername) {
					githubUsername = items.githubUsername;
					fetchGithubData();
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
		const today = new Date();
		const noDays_to_goback = gsoc === 0 ? 7 : 1;
		const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - noDays_to_goback);

		const lastWeekYear = lastWeek.getFullYear().toString().padStart(4, '0');
		const lastWeekMonth = (lastWeek.getMonth() + 1).toString().padStart(2, '0');
		const lastWeekDay = lastWeek.getDate().toString().padStart(2, '0');

		return `${lastWeekYear}-${lastWeekMonth}-${lastWeekDay}`;
	}

	function getToday() {
		const today = new Date();

		const WeekYear = today.getFullYear().toString().padStart(4, '0');
		const WeekMonth = (today.getMonth() + 1).toString().padStart(2, '0');
		const WeekDay = today.getDate().toString().padStart(2, '0');

		return `${WeekYear}-${WeekMonth}-${WeekDay}`;
	}

	// fetch github data
	function fetchGithubData() {
		const issueUrl = `https://api.github.com/search/issues?q=author%3A${githubUsername}+org%3Afossasia+created%3A${startingDate}..${endingDate}&per_page=100`;

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: issueUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitHub issues:', textStatus, errorThrown);
			},
			success: (data) => {
				githubIssuesData = data;
			},
		});

		// fetch GitHub PRs review data
		const prUrl = `https://api.github.com/search/issues?q=commenter%3A${githubUsername}+org%3Afossasia+updated%3A${startingDate}..${endingDate}&per_page=100`;

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: prUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitHub PR reviews:', textStatus, errorThrown);
			},
			success: (data) => {
				githubPrsReviewData = data;
			},
		});

		// fetch GitHub user data
		const userUrl = `https://api.github.com/users/${githubUsername}`;

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: userUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching GitHub user data:', textStatus, errorThrown);
			},
			success: (data) => {
				githubUserData = data;
			},
		});

		// function to fetch commits in fossasia repos
		const commitsUrl = `https://api.github.com/repos/fossasia/${projectName}/commits?author=${githubUsername}&since=${startingDate}T00:00:00Z&until=${endingDate}T23:59:59Z&per_page=100`;

		$.ajax({
			dataType: 'json',
			type: 'GET',
			url: commitsUrl,
			error: (xhr, textStatus, errorThrown) => {
				console.error('Error fetching commits from fossasia repos:', textStatus, errorThrown);
			},
			success: (data) => {
				githubPrCommitsData = data;
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
			let lastWeekUl = '<ul>';
			let i;
			for (i = 0; i < lastWeekArray.length; i++) lastWeekUl += lastWeekArray[i];
			for (i = 0; i < reviewedPrsArray.length; i++) lastWeekUl += reviewedPrsArray[i];
			lastWeekUl += '</ul>';

			let nextWeekUl = '<ul>';
			for (i = 0; i < nextWeekArray.length; i++) nextWeekUl += nextWeekArray[i];
			nextWeekUl += '</ul>';

			const weekOrDay = gsoc === 1 ? 'yesterday' : 'last week';
			const weekOrDay2 = gsoc === 1 ? 'today' : 'this week';

			// Create the complete content
			let content;
			if (lastWeekContribution === true) {
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
		if (projectName !== '') return projectName;

		let project = '<project name>';
		const url = window.location.href;
		const projectUrl = url.substr(url.lastIndexOf('/') + 1);
		if (projectUrl === 'susiai') project = 'SUSI.AI';
		else if (projectUrl === 'open-event') project = 'Open Event';
		return project;
	}
	//load initial scrum subject
	function scrumSubjectLoaded() {
		if (!enableToggle) return;
		setTimeout(() => {
			//to apply this after google has autofilled
			const name = githubUserData.name || githubUsername;
			const project = getProject();
			const curDate = new Date();
			const year = curDate.getFullYear().toString();
			let date = curDate.getDate();
			let month = curDate.getMonth();
			month++;
			if (month < 10) month = `0${month}`;
			if (date < 10) date = `0${date}`;
			const dateCode = year.toString() + month.toString() + date.toString();
			scrumSubject.value = `[Scrum] ${name} - ${project} - ${dateCode} - False`;
			scrumSubject.dispatchEvent(new Event('input', { bubbles: true }));
		});
	}

	// write PRs Reviewed
	function writeGithubPrsReviews() {
		const items = githubPrsReviewData.items;
		const githubPrsReviewDataProccessed = {};
		const reviewedPrsArray = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.user.login === githubUsername || !item.pull_request) continue;

			const repository_url = item.repository_url;
			const project = repository_url.substring(repository_url.lastIndexOf('/') + 1);
			const title = item.title;
			const number = item.number;
			const html_url = item.html_url;

			if (!githubPrsReviewDataProccessed[project]) {
				githubPrsReviewDataProccessed[project] = [];
			}

			githubPrsReviewDataProccessed[project].push({ number, html_url, title, state: item.state });
		}

		for (const repo in githubPrsReviewDataProccessed) {
			let repoLi = `<li><i>(${repo})</i> - Reviewed `;
			const prs = githubPrsReviewDataProccessed[repo];

			repoLi += prs.length > 1 ? 'PRs - ' : 'PR - ';

			if (prs.length === 1) {
				const pr = prs[0];
				const prText = `<a href='${pr.html_url}' target='_blank'>#${pr.number}</a> (${pr.title}) ${pr.state === 'open' ? issue_opened_button : issue_closed_button}`;
				repoLi += `${prText}&nbsp;&nbsp;`;
			} else {
				repoLi += '<ul>';
				for (const pr of prs) {
					const prText = `<li><a href='${pr.html_url}' target='_blank'>#${pr.number}</a> (${pr.title}) ${pr.state === 'open' ? issue_opened_button : issue_closed_button}&nbsp;&nbsp;</li>`;
					repoLi += prText;
				}
				repoLi += '</ul>';
			}
			repoLi += '</li>';
			reviewedPrsArray.push(repoLi);
		}
		writeScrumBody();
	}

	// write github commits
	function writeGithubCommits() {
		if (!Array.isArray(githubPrCommitsData)) {
			console.error('Invalid githubPrCommitsData: expected an array', githubPrCommitsData);
			return;
		}
		const item = githubPrCommitsData;
		for (let i = 0; i < item.length; i++) {
			const htmlUrl = item[i].html_url;
			const urlParts = htmlUrl.split('/');
			const project = urlParts[4];
			const commit = item[i].commit;
			const commitMessage = commit.message;
			const commitHash = item[i].sha;
			const prMatch = commitMessage.match(/\(#(\d+)\)/);
			let prMessage;
			if (prMatch) {
				const prNumber = prMatch[1];
				prMessage = ` under PR (<a href='https://github.com/fossasia/${project}/pulls/${prNumber}'>#${prNumber}</a>)`; // Append PR reference
			}
			const li = `<li><i>(${project})</i> - Made commit (<a href='${htmlUrl}' target='_blank'>${commitHash}</a>) - ${commitMessage} &nbsp<u>${prMessage}</u></li>`;
			lastWeekArray.push(li);
		}
		writeScrumBody();
	}

	//write issues and Prs from github
	function writeGithubIssuesPrs() {
		const data = githubIssuesData;
		const items = data.items;
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const html_url = item.html_url;
			const repository_url = item.repository_url;
			const project = repository_url.substr(repository_url.lastIndexOf('/') + 1);
			const title = item.title;
			const number = item.number;
			let li = '';
			if (item.pull_request) {
				// is a pull request
				if (item.state === 'closed') {
					// is closed PR
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}' style='${linkStyle}' target='_blank'>${title}</a> ${pr_merged_button}&nbsp;&nbsp;</li>`;
				} else if (item.state === 'open') {
					// is open PR
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}' target='_blank'>${title}</a> ${pr_unmerged_button}&nbsp;&nbsp;</li>`;
				} else {
					// else
					li = `<li><i>(${project})</i> - Made PR (#${number}) - <a href='${html_url}' target='_blank'>${title}</a> &nbsp;&nbsp;</li>`;
				}
			} else {
				// is a issue
				if (item.state === 'open' && item.body.toUpperCase().indexOf('YES') > 0) {
					//probably the author wants to work on this issue!
					const li2 = `<li><i>(${project})</i> - Work on Issue(#${number}) - <a href='${html_url}' target='_blank'>${title}</a> ${issue_opened_button}&nbsp;&nbsp;</li>`;
					nextWeekArray.push(li2);
				}
				if (item.state === 'open') {
					li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}' target='_blank'>${title}</a> ${issue_opened_button}&nbsp;&nbsp;</li>`;
				} else if (item.state === 'closed') {
					li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}' target='_blank'>${title}</a> ${issue_closed_button}&nbsp;&nbsp;</li>`;
				} else {
					li = `<li><i>(${project})</i> - Opened Issue(#${number}) - <a href='${html_url}' target='_blank'>${title}</a> </li>`;
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
	const intervalBody = setInterval(() => {
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
	const intervalSubject = setInterval(() => {
		if (!githubUserData || !window.emailClientAdapter) return;

		const elements = window.emailClientAdapter.getEditorElements();
		if (!elements || !elements.subject) return;

		clearInterval(intervalSubject);
		scrumSubject = elements.subject;
		scrumSubjectLoaded();
	}, 500);

	//check for github safe writing
	const intervalWriteGithub = setInterval(() => {
		if (scrumBody && githubUsername && githubIssuesData) {
			clearInterval(intervalWriteGithub);
			writeGithubIssuesPrs();
		}
	}, 500);
	const intervalWriteGithubCommits = setInterval(() => {
		if (scrumBody && githubUsername && githubPrCommitsData) {
			clearInterval(intervalWriteGithubCommits);
			writeGithubCommits();
		}
	}, 500);
	//check for github prs reviews safe writing
	const intervalWriteGithubReviews = setInterval(() => {
		if (scrumBody && githubUsername && githubPrsReviewData) {
			clearInterval(intervalWriteGithubReviews);
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
		allIncluded();
	}
}
allIncluded();

$('button>span:contains(New conversation)')
	.parent('button')
	.click(() => {
		allIncluded();
	});
