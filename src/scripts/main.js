/* global $,Materialize */
var enableToggleElement = document.getElementById('enable');
var githubUsernameElement = document.getElementById('githubUsername');
var projectNameElement = document.getElementById('projectName');
var lastWeekContributionElement = document.getElementById('lastWeekContribution');
var startingDateElement = document.getElementById('startingDate');
var endingDateElement = document.getElementById('endingDate');
var showOpenLabelElement = document.getElementById('showOpenLabel');
var userReasonElement = document.getElementById('userReason');
var previewButtonElement = document.getElementById('previewScrum');
var copyPreviewElement = document.getElementById('copyPreview');

var gsoc = 0; // 0 means Codeheat, 1 means GSoC

function handleBodyOnLoad() {
	chrome.storage.local.get(
		[
			'githubUsername',
			'projectName',
			'enableToggle',
			'startingDate',
			'endingDate',
			'showOpenLabel',
			'showClosedLabel',
			'userReason',
			'lastWeekContribution',
			'gsoc',
		],
		(items) => {
			if (items.githubUsername) githubUsernameElement.value = items.githubUsername;
			if (items.projectName) projectNameElement.value = items.projectName;
			if (items.enableToggle) {
				enableToggleElement.checked = items.enableToggle;
			} else if (items.enableToggle !== false) {
				enableToggleElement.checked = true;
				handleEnableChange();
			}
			if (items.endingDate) endingDateElement.value = items.endingDate;
			if (items.startingDate) startingDateElement.value = items.startingDate;
			if (items.showOpenLabel) {
				showOpenLabelElement.checked = items.showOpenLabel;
			} else if (items.showOpenLabel !== false) {
				showOpenLabelElement.checked = true;
				handleOpenLabelChange();
			}
			if (items.userReason) userReasonElement.value = items.userReason;
			if (items.lastWeekContribution) {
				lastWeekContributionElement.checked = items.lastWeekContribution;
				handleLastWeekContributionChange();
			} else if (items.lastWeekContribution !== false) {
				lastWeekContributionElement.checked = true;
				handleLastWeekContributionChange();
			}
			if (items.gsoc == 1) {
				handleGsocClick();
			} else {
				handleCodeheatClick();
			}
		}
	);
}

function handleEnableChange() {
	chrome.storage.local.set({ enableToggle: enableToggleElement.checked });
}

function handleStartingDateChange() {
	chrome.storage.local.set({ startingDate: startingDateElement.value });
}

function handleEndingDateChange() {
	chrome.storage.local.set({ endingDate: endingDateElement.value });
}

function handleLastWeekContributionChange() {
	var value = lastWeekContributionElement.checked;
	if (value) {
		startingDateElement.disabled = true;
		endingDateElement.disabled = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getLastWeek();
		handleEndingDateChange();
		handleStartingDateChange();
	} else {
		startingDateElement.disabled = false;
		endingDateElement.disabled = false;
	}
	chrome.storage.local.set({ lastWeekContribution: value });
}

function getLastWeek() {
	var today = new Date();
	var daysBack = gsoc === 0 ? 7 : 1;
	var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBack);
	return formatDate(lastWeek);
}

function getToday() {
	return formatDate(new Date());
}

function formatDate(date) {
	return (
		('0000' + date.getFullYear()).slice(-4) +
		'-' +
		('00' + (date.getMonth() + 1)).slice(-2) +
		'-' +
		('00' + date.getDate()).slice(-2)
	);
}

function handleGithubUsernameChange() {
	chrome.storage.local.set({ githubUsername: githubUsernameElement.value });
}

function handleProjectNameChange() {
	chrome.storage.local.set({ projectName: projectNameElement.value });
}

function handleOpenLabelChange() {
	var value = showOpenLabelElement.checked;
	chrome.storage.local.set({ showOpenLabel: value, showClosedLabel: value });
}

function handleUserReasonChange() {
	chrome.storage.local.set({ userReason: userReasonElement.value });
}

function handleCodeheatClick() {
	gsoc = 0;
	$('#codeheatTab').addClass('active');
	$('.tabs').tabs();
	$('#noDays').text('7 days');
	chrome.storage.local.set({ gsoc: 0 });
	handleLastWeekContributionChange();
}

function handleGsocClick() {
	gsoc = 1;
	$('#gsocTab').addClass('active');
	$('.tabs').tabs();
	$('#noDays').text('1 day');
	chrome.storage.local.set({ gsoc: 1 });
	handleLastWeekContributionChange();
}

// Preview Scrum logic
function handlePreviewClick() {
	var username = githubUsernameElement.value;
	var projectName = projectNameElement.value;
	var startDate = startingDateElement.value;
	var endDate = endingDateElement.value;
	var showLabels = showOpenLabelElement.checked;
	var reason = userReasonElement.value;

	if (!username) {
		Materialize.toast('Please enter your GitHub username', 3000);
		return;
	}

	$('#previewModal').modal('open');
	$('#previewContent').html('<p>Loading your GitHub data...</p>');

	fetchGitHubData(username, startDate, endDate)
		.then((data) => {
			var preview = generateScrumReport(data, projectName, showLabels, reason);
			$('#previewContent').html(preview);
		})
		.catch((error) => {
			$('#previewContent').html('<p>Error loading data: ' + error.message + '</p>');
		});
}

function fetchGitHubData(username, startDate, endDate) {
	var apiUrl = `https://api.github.com/search/issues?q=author:${username}+org:fossasia+updated:${startDate}..${endDate}`;
	return fetch(apiUrl)
		.then((response) => {
			if (!response.ok) throw new Error('GitHub API request failed');
			return response.json();
		})
		.then((data) => ({ items: data.items || [] }));
}

function generateScrumReport(data, projectName, showLabels, reason) {
	var items = data.items || [];
	var prs = items.filter((item) => item.pull_request);
	var issues = items.filter((item) => !item.pull_request);
	var html = `<div><strong>Project:</strong> ${projectName || 'N/A'}</div>`;
	html += '<div><strong>What did I do last week?</strong></div><ul>';

	if (prs.length > 0) {
		html += '<li>Worked on Pull Requests:<ul>';
		prs.forEach((pr) => {
			var status = pr.state === 'open' ? '<span class="label-open">[OPEN]</span>' : '<span class="label-closed">[CLOSED]</span>';
			html += `<li><a href="${pr.html_url}" target="_blank">${pr.title}</a> ${showLabels ? status : ''}</li>`;
		});
		html += '</ul></li>';
	}

	if (issues.length > 0) {
		html += '<li>Worked on Issues:<ul>';
		issues.forEach((issue) => {
			var status = issue.state === 'open' ? '<span class="label-open">[OPEN]</span>' : '<span class="label-closed">[CLOSED]</span>';
			html += `<li><a href="${issue.html_url}" target="_blank">${issue.title}</a> ${showLabels ? status : ''}</li>`;
		});
		html += '</ul></li>';
	}

	html += '</ul><div><strong>What am I going to do this week?</strong></div><ul>';
	html += '<li>Continue working on open PRs and issues</li></ul>';
	html += `<div><strong>What is stopping me?</strong></div><ul><li>${reason || 'Nothing'}</li></ul>`;

	return html;
}

function handleCopyPreview() {
	var previewText = document.getElementById('previewContent').innerText;
	var textarea = document.createElement('textarea');
	textarea.value = previewText;
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	document.body.removeChild(textarea);
	Materialize.toast('Copied to clipboard!', 2000);
}

function initializeModal() {
	$('.modal').modal();
}

document.addEventListener('DOMContentLoaded', function () {
	initializeModal();
	handleBodyOnLoad();
});

enableToggleElement.addEventListener('change', handleEnableChange);
githubUsernameElement.addEventListener('keyup', handleGithubUsernameChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
lastWeekContributionElement.addEventListener('change', handleLastWeekContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
userReasonElement.addEventListener('keyup', handleUserReasonChange);
document.getElementById('codeheatTab').addEventListener('click', handleCodeheatClick);
document.getElementById('gsocTab').addEventListener('click', handleGsocClick);
previewButtonElement.addEventListener('click', handlePreviewClick);
copyPreviewElement.addEventListener('click', handleCopyPreview);
