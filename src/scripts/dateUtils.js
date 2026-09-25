/**
 * Formats a Date object into a 'YYYY-MM-DD' local date string.
 * @param {Date} date
 * @returns {string} Formatted date string, or empty string if invalid.
 */
function formatLocalDate(date) {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return '';
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

if (typeof window !== 'undefined') {
	window.formatLocalDate = formatLocalDate;
}

if (typeof module !== 'undefined' && module.exports) {
	module.exports = { formatLocalDate };
}
