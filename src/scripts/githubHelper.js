/* global chrome, browser */

// Token validation and warning timeouts
let showCommitsWarningTimeout;

function showTokenWarningForShowCommits({ animate = false, durationMs = 4000 } = {}) {
	const tokenWarning = document.getElementById('tokenWarningForShowCommits');
	if (!tokenWarning) {
		return;
	}

	tokenWarning.classList.remove('hidden');
	if (animate) {
		tokenWarning.classList.add('shake-animation');
		setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
	}

	if (showCommitsWarningTimeout) {
		clearTimeout(showCommitsWarningTimeout);
	}
	showCommitsWarningTimeout = setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, durationMs);
}

function checkTokenForShowCommits({
	showWarning = false,
	animateWarning = false,
	warningDurationMs = 4000,
	persistState = false,
} = {}) {
	const showCommits = document.getElementById('showCommits');
	const githubTokenInput = document.getElementById('githubToken');

	if (!showCommits || !githubTokenInput) {
		return;
	}

	const isShowCommitsEnabled = showCommits.checked;
	const hasToken = githubTokenInput.value.trim() !== '';

	if (isShowCommitsEnabled && !hasToken) {
		showCommits.checked = false;
		if (showWarning) {
			showTokenWarningForShowCommits({
				animate: animateWarning,
				durationMs: warningDurationMs,
			});
		}
		// Always persist correction of invalid state
		browser.storage.local.set({ showCommits: false });
		return;
	}

	const tokenWarning = document.getElementById('tokenWarningForShowCommits');
	if (tokenWarning) {
		if (showCommitsWarningTimeout) {
			clearTimeout(showCommitsWarningTimeout);
			showCommitsWarningTimeout = null;
		}
		tokenWarning.classList.add('hidden');
	}
	if (persistState) {
		browser.storage.local.set({ showCommits: showCommits.checked });
	}
}

// Token validation and warning timeouts for merged PRs
let mergedPRsWarningTimeout;

function showTokenWarningForMergedPRs({ animate = false, durationMs = 4000 } = {}) {
	const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
	if (!tokenWarning) {
		return;
	}

	tokenWarning.classList.remove('hidden');
	if (animate) {
		tokenWarning.classList.add('shake-animation');
		setTimeout(() => tokenWarning.classList.remove('shake-animation'), 620);
	}

	if (mergedPRsWarningTimeout) {
		clearTimeout(mergedPRsWarningTimeout);
	}
	mergedPRsWarningTimeout = setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, durationMs);
}

function checkTokenForMergedPRs({
	showWarning = false,
	animateWarning = false,
	warningDurationMs = 4000,
	persistState = false,
} = {}) {
	const mergedPRsCheckbox = document.getElementById('onlyMergedPRs');
	const githubTokenInput = document.getElementById('githubToken');

	if (!mergedPRsCheckbox || !githubTokenInput) {
		return;
	}

	const isMergedPRsEnabled = mergedPRsCheckbox.checked;
	const hasToken = githubTokenInput.value.trim() !== '';

	if (isMergedPRsEnabled && !hasToken) {
		mergedPRsCheckbox.checked = false;
		if (showWarning) {
			showTokenWarningForMergedPRs({
				animate: animateWarning,
				durationMs: warningDurationMs,
			});
		}
		chrome?.storage.local.set({ onlyMergedPRs: false });
		return;
	}

	const tokenWarning = document.getElementById('tokenWarningForMergedPRs');
	if (tokenWarning) {
		if (mergedPRsWarningTimeout) {
			clearTimeout(mergedPRsWarningTimeout);
			mergedPRsWarningTimeout = null;
		}
		tokenWarning.classList.add('hidden');
	}
	if (persistState) {
		chrome?.storage.local.set({ onlyMergedPRs: mergedPRsCheckbox.checked });
	}
}

//  Validates GitHub token for enabling the repo filter and shows a short warning

function checkTokenForFilter() {
	const useRepoFilter = document.getElementById('useRepoFilter');
	const githubTokenInput = document.getElementById('githubToken');
	const tokenWarning = document.getElementById('tokenWarningForFilter');
	const repoFilterContainer = document.getElementById('repoFilterContainer');

	if (!useRepoFilter || !githubTokenInput || !tokenWarning || !repoFilterContainer) {
		return;
	}
	const isFilterEnabled = useRepoFilter.checked;
	const hasToken = githubTokenInput.value.trim() !== '';

	if (isFilterEnabled && !hasToken) {
		useRepoFilter.checked = false;
		repoFilterContainer.classList.add('hidden');
		if (typeof hideDropdown === 'function') {
			hideDropdown();
		}
		browser.storage.local.set({ useRepoFilter: false });
	}
	tokenWarning.classList.toggle('hidden', !isFilterEnabled || hasToken);
	setTimeout(() => {
		tokenWarning.classList.add('hidden');
	}, 4000);
}
