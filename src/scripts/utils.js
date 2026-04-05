(function (globalScope) {
	function formatDateToIsoDay(date) {
		return date.toISOString().split('T')[0];
	}

	function getTodayDateString(now = new Date()) {
		return formatDateToIsoDay(now);
	}

	function getYesterdayDateString(now = new Date()) {
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		return formatDateToIsoDay(yesterday);
	}

	function getScrumDateCode(now = new Date()) {
		const year = String(now.getFullYear());
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}${month}${day}`;
	}

	function buildScrumSubject(projectName = '', now = new Date()) {
		const projectPart = projectName ? ` - ${projectName}` : '';
		return `[Scrum]${projectPart} - ${getScrumDateCode(now)}`;
	}

	function mapGitLabItem(item, projects = [], type) {
		const project = projects.find((projectItem) => projectItem.id === item.project_id);
		const repoName = project ? project.name : 'unknown';

		return {
			...item,
			repository_url: `https://gitlab.com/api/v4/projects/${item.project_id}`,
			html_url:
				type === 'issue'
					? item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : '')
					: item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : ''),
			number: item.iid,
			title: item.title,
			state: type === 'issue' && item.state === 'opened' ? 'open' : item.state,
			project: repoName,
			pull_request: type === 'mr',
		};
	}

	globalScope.scrumUtils = {
		...(globalScope.scrumUtils || {}),
		getTodayDateString,
		getYesterdayDateString,
		getScrumDateCode,
		buildScrumSubject,
		mapGitLabItem,
	};
})(typeof window !== 'undefined' ? window : globalThis);
