/**
 * GitHub token fingerprint helper shared by popup and scrum scripts.
 */
async function getGithubTokenFingerprint(token) {
	const normalizedToken = token?.trim();
	if (!normalizedToken) {
		return 'noauth';
	}

	const inputBytes = new TextEncoder().encode(normalizedToken);
	const digest = await crypto.subtle.digest('SHA-256', inputBytes);
	const bytes = new Uint8Array(digest).slice(0, 12);
	const hex = Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');

	return `tok-${hex}`;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { getGithubTokenFingerprint };
} else {
	window.getGithubTokenFingerprint = getGithubTokenFingerprint;
}
