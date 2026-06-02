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
