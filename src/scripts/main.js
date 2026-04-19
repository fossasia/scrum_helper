const platformUsernameElement = document.getElementById('platformUsername');
const githubTokenElement = document.getElementById('githubToken');
const gitlabTokenElement = document.getElementById('gitlabToken');
const cacheInputElement = document.getElementById('cacheInput');
const projectNameElement = document.getElementById('projectName');
const yesterdayContributionElement = document.getElementById('yesterdayContribution');
const startingDateElement = document.getElementById('startingDate');
const endingDateElement = document.getElementById('endingDate');
const showOpenLabelElement = document.getElementById('showOpenLabel');

const userReasonElement = null;

const showCommitsElement = document.getElementById('showCommits');

function handleBodyOnLoad() {
	// Migration: Handle existing users with old platformUsername storage
	browser.storage.local.get(['platform', 'platformUsername']).then((result) => {
		if (result.platformUsername && result.platform) {
			// Migrate old platformUsername to platform-specific storage
			const platformUsernameKey = `${result.platform}Username`;
			browser.storage.local.set({ [platformUsernameKey]: result.platformUsername });
			// Remove the old key
			browser.storage.local.remove(['platformUsername']);
			console.log(`[MIGRATION] Migrated platformUsername to ${platformUsernameKey}`);
		}
	});

	browser.storage.local
		.get([
			'platform',
			'githubUsername',
			'gitlabUsername',
			'projectName',
			'startingDate',
			'endingDate',
			'showOpenLabel',
			'userReason',
			'yesterdayContribution',
			'cacheInput',
			'githubToken',
			'gitlabToken',
			'showCommits',
		])
		.then((items) => {
			// Load platform-specific username
			const platform = items.platform || 'github';
			const platformUsernameKey = `${platform}Username`;
			if (platformUsernameElement && items[platformUsernameKey]) {
				platformUsernameElement.value = items[platformUsernameKey];
			}

			if (items.githubToken && githubTokenElement) {
				githubTokenElement.value = items.githubToken;
			}
			if (items.gitlabToken && gitlabTokenElement) {
				gitlabTokenElement.value = items.gitlabToken;
			}
			if (items.projectName && projectNameElement) {
				projectNameElement.value = items.projectName;
			}
			if (items.cacheInput && cacheInputElement) {
				cacheInputElement.value = items.cacheInput;
			}
			if (items.endingDate && endingDateElement) {
				endingDateElement.value = items.endingDate;
			}
			if (items.startingDate && startingDateElement) {
				startingDateElement.value = items.startingDate;
			}
			if (showOpenLabelElement) {
				if (items.showOpenLabel) {
					showOpenLabelElement.checked = items.showOpenLabel;
				} else if (items.showOpenLabel !== false) {
					// undefined
					showOpenLabelElement.checked = true;
					handleOpenLabelChange();
				}
			}

			if (yesterdayContributionElement) {
				if (items.yesterdayContribution) {
					yesterdayContributionElement.checked = items.yesterdayContribution;
					handleYesterdayContributionChange();
				} else if (items.yesterdayContribution !== false) {
					yesterdayContributionElement.checked = true;
					handleYesterdayContributionChange();
				}
			}
			if (showCommitsElement) {
				if (items.showCommits) {
					showCommitsElement.checked = items.showCommits;
				} else {
					showCommitsElement.checked = false;
					handleShowCommitsChange();
				}
			}
		});
}

document.getElementById('refreshCache').addEventListener('click', async (e) => {
	const button = e.currentTarget;
	button.classList.add('loading');
	button.disabled = true;

	setTimeout(() => {
		button.classList.remove('loading');
		button.disabled = false;
	}, 500);
});

function handleStartingDateChange() {
	if (!startingDateElement) return;
	const value = startingDateElement.value;
	browser.storage.local.set({ startingDate: value });
}
function handleEndingDateChange() {
	if (!endingDateElement) return;
	const value = endingDateElement.value;
	browser.storage.local.set({ endingDate: value });
}

function handleYesterdayContributionChange() {
	if (!yesterdayContributionElement) return;
	const value = yesterdayContributionElement.checked;
	const labelElement = document.querySelector("label[for='yesterdayContribution']");

	if (value) {
		if (startingDateElement) startingDateElement.readOnly = true;
		if (endingDateElement) endingDateElement.readOnly = true;
		endingDateElement.value = getToday();
		startingDateElement.value = getYesterday();
		handleEndingDateChange();
		handleStartingDateChange();
		labelElement.classList.add('selectedLabel');
		labelElement.classList.remove('unselectedLabel');
	} else {
		startingDateElement.readOnly = false;
		endingDateElement.readOnly = false;
		labelElement.classList.add('unselectedLabel');
		labelElement.classList.remove('selectedLabel');
	}
	browser.storage.local.set({ yesterdayContribution: value });
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

function handlePlatformUsernameChange() {
	if (!platformUsernameElement) return;
	const value = platformUsernameElement.value;
	browser.storage.local.get(['platform']).then((result) => {
		const platform = result.platform || 'github';
		const platformUsernameKey = `${platform}Username`;
		browser.storage.local.set({ [platformUsernameKey]: value });
	});
}
function handleGithubTokenChange() {
	if (!githubTokenElement) return;
	const value = githubTokenElement.value;
	browser.storage.local.set({ githubToken: value });
}
function handleGitlabTokenChange() {
	if (!gitlabTokenElement) return;
	const value = gitlabTokenElement.value;
	browser.storage.local.set({ gitlabToken: value });
}
function handleProjectNameChange() {
	if (!projectNameElement) return;
	const value = projectNameElement.value;
	browser.storage.local.set({ projectName: value });
}
function handleCacheInputChange() {
	if (!cacheInputElement) return;
	const value = cacheInputElement.value;
	browser.storage.local.set({ cacheInput: value });
}
function handleOpenLabelChange() {
	if (!showOpenLabelElement) return;
	const value = showOpenLabelElement.checked;
	const labelElement = document.querySelector("label[for='showOpenLabel']");

	if (labelElement) {
		if (value) {
			labelElement.classList.add('selectedLabel');
			labelElement.classList.remove('unselectedLabel');
		} else {
			labelElement.classList.add('unselectedLabel');
			labelElement.classList.remove('selectedLabel');
		}
	}

	browser.storage.local.set({ showOpenLabel: value });
}

function handleShowCommitsChange() {
	if (!showCommitsElement) return;
	const value = showCommitsElement.checked;
	browser.storage.local.set({ showCommits: value });
}

if (platformUsernameElement) {
	platformUsernameElement.addEventListener('keyup', handlePlatformUsernameChange);
}
if (githubTokenElement) {
	githubTokenElement.addEventListener('keyup', handleGithubTokenChange);
}
if (gitlabTokenElement) {
	gitlabTokenElement.addEventListener('keyup', handleGitlabTokenChange);
}
if (cacheInputElement) {
	cacheInputElement.addEventListener('keyup', handleCacheInputChange);
}
if (projectNameElement) {
	projectNameElement.addEventListener('keyup', handleProjectNameChange);
}
if (startingDateElement) {
	startingDateElement.addEventListener('change', handleStartingDateChange);
}
if (showCommitsElement) {
	showCommitsElement.addEventListener('change', handleShowCommitsChange);
}
if (endingDateElement) {
	endingDateElement.addEventListener('change', handleEndingDateChange);
}
if (yesterdayContributionElement) {
	yesterdayContributionElement.addEventListener('change', handleYesterdayContributionChange);
}
if (showOpenLabelElement) {
	showOpenLabelElement.addEventListener('change', handleOpenLabelChange);
}

document.addEventListener('DOMContentLoaded', handleBodyOnLoad);
