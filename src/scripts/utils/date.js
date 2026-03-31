(function attachDateUtils(globalScope) {
	function padDatePart(value) {
		return String(value).padStart(2, '0');
	}

	function formatLocalDate(date) {
		const year = date.getFullYear();
		const month = padDatePart(date.getMonth() + 1);
		const day = padDatePart(date.getDate());
		return `${year}-${month}-${day}`;
	}

	function createDateAtLocalTime(dateString, hours, minutes, seconds, milliseconds) {
		const [year, month, day] = dateString.split('-').map(Number);
		return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
	}

	function startOfLocalDay(dateString) {
		return createDateAtLocalTime(dateString, 0, 0, 0, 0);
	}

	function endOfLocalDay(dateString) {
		return createDateAtLocalTime(dateString, 23, 59, 59, 999);
	}

	globalScope.DateUtils = {
		formatLocalDate,
		startOfLocalDay,
		endOfLocalDay,
	};
})(window);
