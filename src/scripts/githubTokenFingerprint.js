/**
 * GitHub Token Fingerprint Utility
 *
 * Provides consistent token fingerprinting across popup and content scripts.
 * Uses SHA-256 for non-reversible hashing while keeping tokens out of direct storage.
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

// Export for both module and global contexts
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { getGithubTokenFingerprint };
} else {
	window.getGithubTokenFingerprint = getGithubTokenFingerprint;
}
