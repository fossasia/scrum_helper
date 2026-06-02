/* global chrome, browser */

// Token validation and warning timeouts
let showCommitsWarningTimeout;

/**
 * Shows a warning for missing GitHub token when trying to show commits
 * @param {Object} options - Configuration options
 * @param {boolean} options.animate - Whether to animate the warning
 * @param {number} options.durationMs - How long to show the warning in milliseconds
 */
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

/**
 * Validates GitHub token when trying to enable "show commits" feature
 * @param {Object} options - Configuration options
 * @param {boolean} options.showWarning - Whether to show warning if token is missing
 * @param {boolean} options.animateWarning - Whether to animate the warning
 * @param {number} options.warningDurationMs - How long to show warning in milliseconds
 * @param {boolean} options.persistState - Whether to persist the state to storage
 */
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
