/**
 * Redact sensitive storage data for safe logging
 * Prevents exposure of authentication tokens and credentials in console logs
 * @param {Object} items - Storage data that may contain sensitive keys
 * @returns {Object} Safe copy with sensitive values redacted
 */
function logRedaction(items) {
	const spreadItems = { ...items };
	const sensitiveKeys = ['githubToken', 'gitlabToken'];
	sensitiveKeys.forEach((key) => {
		if (key in spreadItems) {
			spreadItems[key] = '[REDACTED]';
		}
	});
	return spreadItems;
}
