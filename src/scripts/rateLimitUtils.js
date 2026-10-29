/**
 * Utilities for extracting and formatting rate limit reset headers across platforms (GitHub, GitLab, Codeberg).
 */

/**
 * Extracts the rate limit reset Date from response headers.
 * Supports:
 * - x-ratelimit-reset (GitHub, Codeberg/Gitea/Forgejo: UTC epoch seconds)
 * - RateLimit-Reset / ratelimit-reset (GitLab / IETF standard)
 * - Retry-After (seconds relative to current time)
 *
 * @param {Response|Headers|Object} headersOrRes - Fetch Response or headers object/instance
 * @param {number} [now=Date.now()] - Current epoch timestamp in milliseconds
 * @returns {Date|null} Reset time as a Date object, or null if not found/invalid
 */
function getRateLimitResetTime(headersOrRes, now = Date.now()) {
	if (!headersOrRes) return null;

	const headers = headersOrRes.headers || headersOrRes;

	// Helper to get a header value from either a Headers instance or plain object
	function getHeader(name) {
		if (typeof headers.get === 'function') return headers.get(name);
		if (typeof headers === 'object') return headers[name] ?? null;
		return null;
	}

	// GitHub secondary rate limits send Retry-After with a shorter wait than
	// x-ratelimit-reset. Prefer Retry-After when present so the countdown
	// reflects the actual minimum wait, not the primary-limit window.
	const retryAfterVal = getHeader('retry-after') || getHeader('Retry-After');
	if (retryAfterVal !== null && retryAfterVal !== undefined && retryAfterVal !== '') {
		const seconds = parseInt(retryAfterVal, 10);
		if (!Number.isNaN(seconds) && seconds > 0) {
			const retryDate = new Date(now + seconds * 1000);
			if (!Number.isNaN(retryDate.getTime())) return retryDate;
		}
	}

	// Primary rate-limit reset header (epoch seconds from GitHub/GitLab/Codeberg)
	const resetVal =
		getHeader('x-ratelimit-reset') ||
		getHeader('ratelimit-reset') ||
		getHeader('RateLimit-Reset') ||
		getHeader('X-RateLimit-Reset');

	if (resetVal !== null && resetVal !== undefined && resetVal !== '') {
		const parsed = parseInt(resetVal, 10);
		if (!Number.isNaN(parsed) && parsed > 0) {
			// Epoch seconds (~1.7e9) vs epoch ms (~1.7e12)
			const resetMs = parsed < 10000000000 ? parsed * 1000 : parsed;
			if (Number.isFinite(resetMs)) {
				const resetDate = new Date(resetMs);
				if (!Number.isNaN(resetDate.getTime())) return resetDate;
			}
		}
	}

	return null;
}

/**
 * Formats a rate limit reset date into a human-readable countdown string.
 * Example outputs:
 * - "in 14 minutes (at 3:45 AM)"
 * - "in 1 minute (at 3:45 AM)"
 * - "in less than a minute"
 * - "in 1 hour (at 4:30 PM)"
 * - "in 1 hour and 15 minutes (at 4:45 PM)"
 * - "shortly" (if the time is already past)
 *
 * @param {Date|number|string} resetDate - The reset Date or epoch timestamp
 * @param {number} [now=Date.now()] - Current epoch timestamp in milliseconds
 * @returns {string} Human-readable countdown string
 */
function formatRateLimitCountdown(resetDate, now = Date.now()) {
	if (!resetDate) return '';

	const targetDate = resetDate instanceof Date ? resetDate : new Date(resetDate);
	const targetMs = targetDate.getTime();
	if (Number.isNaN(targetMs)) return '';

	const diffMs = targetMs - now;
	if (diffMs <= 0) {
		return 'shortly';
	}

	let countdown = '';
	if (diffMs < 60 * 1000) {
		countdown = 'in less than a minute';
	} else if (diffMs < 60 * 60 * 1000) {
		const minutes = Math.ceil(diffMs / (60 * 1000));
		countdown = minutes === 1 ? 'in 1 minute' : `in ${minutes} minutes`;
	} else {
		const totalMinutes = Math.ceil(diffMs / (60 * 1000));
		const hours = Math.floor(totalMinutes / 60);
		const remainingMinutes = totalMinutes % 60;

		if (remainingMinutes === 0) {
			countdown = hours === 1 ? 'in 1 hour' : `in ${hours} hours`;
		} else {
			const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
			const minStr = remainingMinutes === 1 ? '1 minute' : `${remainingMinutes} minutes`;
			countdown = `in ${hourStr} and ${minStr}`;
		}
	}

	// Format local time (e.g., "at 3:45 AM")
	let timeStr = '';
	try {
		timeStr = targetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	} catch (e) {
		// Fallback if formatting fails in non-browser environment
		const hrs = targetDate.getHours();
		const mins = String(targetDate.getMinutes()).padStart(2, '0');
		timeStr = `${hrs}:${mins}`;
	}

	return timeStr ? `${countdown} (at ${timeStr})` : countdown;
}

/**
 * Returns a complete user-friendly rate limit message with dynamic countdown if available.
 *
 * @param {Date|number|string|null} resetDate - The reset Date or timestamp
 * @param {Object} [options={}]
 * @param {string} [options.platform='GitHub'] - Platform name ('GitHub', 'GitLab', 'Codeberg')
 * @param {'error'|'warning'} [options.type='error'] - Type of message
 * @param {number} [options.now=Date.now()] - Current epoch timestamp
 * @returns {string} Formatted user-facing message
 */
function getRateLimitMessage(resetDate, options = {}) {
	const platform = options.platform || 'GitHub';
	const type = options.type || 'error';
	const now = options.now || Date.now();

	const countdown = resetDate ? formatRateLimitCountdown(resetDate, now) : '';
	const i18n =
		typeof chrome !== 'undefined' && chrome?.i18n
			? chrome.i18n
			: typeof browser !== 'undefined' && browser?.i18n
				? browser.i18n
				: null;

	if (type === 'warning') {
		if (countdown) {
			const localized = i18n?.getMessage('rateLimitWarningWithReset', [countdown]);
			if (localized && localized !== 'rateLimitWarningWithReset') return localized;
			// No translation for the reset-specific key — append countdown to the
			// existing translated warning so non-English locales stay consistent.
			const baseWarning = i18n?.getMessage('rateLimitWarningMessage');
			if (baseWarning && baseWarning !== 'rateLimitWarningMessage')
				return `${baseWarning} Quota resets ${countdown}.`;
			return `Some data may be missing due to ${platform} rate limit. Quota resets ${countdown}. Please add or check your ${platform} token in settings.`;
		}
		const fallback = i18n?.getMessage('rateLimitWarningMessage');
		if (fallback && fallback !== 'rateLimitWarningMessage') return fallback;
		return `Some data may be missing due to ${platform} rate limit. Please add or check your ${platform} token in settings.`;
	}

	// type === 'error'
	if (countdown) {
		const localized = i18n?.getMessage('rateLimitErrorWithReset', [countdown]);
		if (localized && localized !== 'rateLimitErrorWithReset') return localized;
		// No translation for the reset-specific key — append countdown to the
		// existing translated error so non-English locales stay consistent.
		const baseError = i18n?.getMessage('rateLimitError');
		if (baseError && baseError !== 'rateLimitError')
			return `${baseError} Quota resets ${countdown}.`;
		return `${platform} API rate limit exceeded. Quota resets ${countdown}. Please add or check your ${platform} token in the Scrum Helper settings for a higher limit.`;
	}

	const fallback = i18n?.getMessage('rateLimitError');
	if (fallback && fallback !== 'rateLimitError') return fallback;
	return `${platform} API rate limit exceeded. Please try again later or add/check your ${platform} token in the Scrum Helper settings.`;
}

const rateLimitUtils = {
	getRateLimitResetTime,
	formatRateLimitCountdown,
	getRateLimitMessage,
};

if (typeof window !== 'undefined') {
	window.rateLimitUtils = rateLimitUtils;
}
if (typeof globalThis !== 'undefined') {
	globalThis.rateLimitUtils = rateLimitUtils;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = rateLimitUtils;
}
