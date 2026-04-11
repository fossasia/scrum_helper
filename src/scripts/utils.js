(function (globalScope) {
	function formatDateToIsoDay(date) {
		const year = String(date.getFullYear());
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
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

	function normalizeGitLabState(state, type) {
		if (type === 'issue') {
			return state === 'opened' ? 'open' : state;
		}

		if (type === 'mr') {
			if (state === 'opened') {
				return 'open';
			}
			if (state === 'merged' || state === 'closed') {
				return 'closed';
			}
		}

		return state;
	}

	function mapGitLabItem(item, projects = [], type, apiBaseUrl = 'https://gitlab.com/api/v4') {
		const project = projects.find((projectItem) => projectItem.id === item.project_id);
		const repoName = project ? project.name : 'unknown';
		const normalizedApiBase = apiBaseUrl.replace(/\/+$/, '');
		const normalizedState = normalizeGitLabState(item.state, type);
		const pullRequestData = type === 'mr' ? { merged_at: item.merged_at || null } : false;

		return {
			...item,
			repository_url: `${normalizedApiBase}/projects/${item.project_id}`,
			html_url:
				type === 'issue'
					? item.web_url || (project ? `${project.web_url}/-/issues/${item.iid}` : '')
					: item.web_url || (project ? `${project.web_url}/-/merge_requests/${item.iid}` : ''),
			number: item.iid,
			title: item.title,
			state: normalizedState,
			project: repoName,
			pull_request: pullRequestData,
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
