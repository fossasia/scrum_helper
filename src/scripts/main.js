/* global $,Materialize*/
var enableToggleElement = document.getElementById('enable');
var githubUsernameElement = document.getElementById('githubUsername');
var projectNameElement = document.getElementById('projectName');
var lastWeekContributionElement = document.getElementById('lastWeekContribution');
var startingDateElement = document.getElementById('startingDate');
var endingDateElement = document.getElementById('endingDate');
var showOpenLabelElement = document.getElementById('showOpenLabel');
var userReasonElement = document.getElementById('userReason');
var gsoc = 0; //0 means gsoc. 1 means gsoc
function handleBodyOnLoad() {
	// prefill name
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
			if (items.githubUsername) {
				githubUsernameElement.value = items.githubUsername;
			}
			if (items.projectName) {
				projectNameElement.value = items.projectName;
			}
			if (items.enableToggle) {
				enableToggleElement.checked = items.enableToggle;
			} else if (items.enableToggle !== false) {
				// undefined
				enableToggleElement.checked = true;
				handleEnableChange();
			}
			if (items.endingDate) {
				endingDateElement.value = items.endingDate;
			}
			if (items.startingDate) {
				startingDateElement.value = items.startingDate;
			}
			if (items.showOpenLabel) {
				showOpenLabelElement.checked = items.showOpenLabel;
			} else if (items.showOpenLabel !== false) {
				// undefined
				showOpenLabelElement.checked = true;
				handleOpenLabelChange();
			}
			if (items.userReason) {
				userReasonElement.value = items.userReason;
			}
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
		},
	);
}
function handleEnableChange() {
	var value = enableToggleElement.checked;
	chrome.storage.local.set({ enableToggle: value });
}
function handleStartingDateChange() {
	var value = startingDateElement.value;
	chrome.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	var value = endingDateElement.value;
	chrome.storage.local.set({ endingDate: value });
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

function handleGithubUsernameChange() {
	var value = githubUsernameElement.value;
	chrome.storage.local.set({ githubUsername: value });
}
function handleProjectNameChange() {
	var value = projectNameElement.value;
	chrome.storage.local.set({ projectName: value });
}
function handleOpenLabelChange() {
	var value = showOpenLabelElement.checked;
	chrome.storage.local.set({ showOpenLabel: value });
	chrome.storage.local.set({ showClosedLabel: value });
}
function handleUserReasonChange() {
	var value = userReasonElement.value;
	chrome.storage.local.set({ userReason: value });
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



document.getElementById("openModal").addEventListener("click", () => {
	fetchGitHubDataAndRender();
});



document.getElementById("closeModal").addEventListener("click", () => {
	// Hide modal & re-enable scroll
	document.getElementById("scrumModal").style.display = "none";
	document.body.style.overflow = "";
});

document.getElementById("copyScrum").addEventListener("click", () => {
	const contentEl = document.getElementById("scrumContent");
	const html = contentEl.innerHTML;
	const text = contentEl.innerText;

	// Create ClipboardItem with both text and HTML formats
	const blobHTML = new Blob([html], { type: "text/html" });
	const blobText = new Blob([text], { type: "text/plain" });

	const clipboardItem = new ClipboardItem({
		"text/html": blobHTML,
		"text/plain": blobText
	});

	navigator.clipboard.write([clipboardItem]).then(() => {
		const toast = document.getElementById("toast");
		toast.textContent = " Scrum copied in rich format!";
		toast.classList.add("show");
		toast.style.display = "block";

		setTimeout(() => {
			toast.classList.remove("show");
			toast.style.display = "none";
		}, 3000);
	}).catch((err) => {
		alert(" Copy failed. Please allow clipboard permissions.");
		console.error(err);
	});
});


function fetchGitHubDataAndRender() {
	document.getElementById("scrumContent").innerHTML = "Generating your scrum preview...";

	chrome.storage.local.get(
		['githubUsername', 'startingDate', 'endingDate', 'userReason', 'gsoc'],
		(items) => {
			const githubUsername = items.githubUsername || '[GitHubUsername]';
			const startingDate = items.startingDate;
			const endingDate = items.endingDate;
			const userReason = items.userReason || 'No blockers';
			const gsoc = items.gsoc || 0;

			const weekOrDay = gsoc == 1 ? 'yesterday' : 'last week';
			const weekOrDay2 = gsoc == 1 ? 'today' : 'this week';

			const issueUrl = `https://api.github.com/search/issues?q=author:${githubUsername}+org:fossasia+created:${startingDate}..${endingDate}&per_page=100`;
			const reviewUrl = `https://api.github.com/search/issues?q=commenter:${githubUsername}+org:fossasia+updated:${startingDate}..${endingDate}&per_page=100`;

			Promise.all([
				fetch(issueUrl).then(res => res.json()),
				fetch(reviewUrl).then(res => res.json())
			])
				.then(([issuesData, reviewData]) => {
					const pastWork = [];
					const plannedWork = [];

					// Process Issues and PRs
					issuesData.items.forEach((item) => {
						const repo = item.repository_url.split('/').pop();
						const title = item.title;
						const url = item.html_url;
						const number = item.number;

						if (item.pull_request) {
							pastWork.push(
  `<span class="label">Made PR</span> <a href="${url}" target="_blank">#${number}</a> in ${repo}: ${title}`
);

						} else {
							pastWork.push(
  `<span class="label">Opened Issue</span> <a href="${url}" target="_blank">#${number}</a> in <b>${repo}</b>: ${title}`
);

							//  Add to next week plan if body includes "YES"
							if (item.state === "open" && item.body?.toUpperCase().includes("YES")) {
							plannedWork.push(
  `<span class="label">Plan to work on Issue</span> <a href="${url}" target="_blank">#${number}</a> in <b>${repo}</b>: ${title}`
);

							}
						}
					});

					// Process PR Reviews
					reviewData.items.forEach((item) => {
						if (item.user.login !== githubUsername && item.pull_request) {
							const repo = item.repository_url.split('/').pop();
							pastWork.push(
  `<span class="label">Reviewed PR</span> <a href="${item.html_url}" target="_blank">#${item.number}</a> in <b>${repo}</b>: ${item.title}`
);

						}
					});

					// Format final scrum
					const scrum = `
<b>1. What did I do ${weekOrDay}?</b><br>
<ul><li>${pastWork.join('</li><li>')}</li></ul>

<b>2. What I plan to do ${weekOrDay2}?</b><br>
<ul><li>${plannedWork.length ? plannedWork.join('</li><li>') : '[Add your plans here]'}</li></ul>

<b>3. What is stopping me from doing my work?</b><br>
<p>${userReason}</p>
`;

					document.getElementById("scrumContent").innerHTML = scrum;
					document.getElementById("scrumModal").style.display = "flex";
					document.body.style.overflow = "hidden";
				})
				.catch((error) => {
					console.error(" GitHub fetch failed:", error);
					alert("Error fetching GitHub data. Please check your GitHub username or try again.");
				});
		}
	);
}





enableToggleElement.addEventListener('change', handleEnableChange);
githubUsernameElement.addEventListener('keyup', handleGithubUsernameChange);
projectNameElement.addEventListener('keyup', handleProjectNameChange);
startingDateElement.addEventListener('change', handleStartingDateChange);
endingDateElement.addEventListener('change', handleEndingDateChange);
lastWeekContributionElement.addEventListener('change', handleLastWeekContributionChange);
showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
userReasonElement.addEventListener('keyup', handleUserReasonChange);
document.addEventListener('DOMContentLoaded', handleBodyOnLoad);
document.getElementById('codeheatTab').addEventListener('click', handleCodeheatClick);
document.getElementById('gsocTab').addEventListener('click', handleGsocClick);
