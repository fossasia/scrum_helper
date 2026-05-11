const SCM_PLATFORMS = Object.freeze({
	GITHUB: 'github',
	GITLAB: 'gitlab',
});

const SCM_PROVIDER_REGISTRY = Object.freeze({
	[SCM_PLATFORMS.GITHUB]: Object.freeze({
		platformId: SCM_PLATFORMS.GITHUB,
		displayName: 'GitHub',
		iconClass: 'fab fa-github',
		usernameLabelI18nKey: 'githubUsernameLabel',
		visibleSettingsSection: 'github',
	}),
	[SCM_PLATFORMS.GITLAB]: Object.freeze({
		platformId: SCM_PLATFORMS.GITLAB,
		displayName: 'GitLab',
		iconClass: 'fab fa-gitlab',
		usernameLabelI18nKey: 'gitlabUsernameLabel',
		visibleSettingsSection: 'gitlab',
	}),
});

const SCM_PROVIDER_IDS = Object.freeze([SCM_PLATFORMS.GITHUB, SCM_PLATFORMS.GITLAB]);

function getScmProvider(platformId) {
	return SCM_PROVIDER_REGISTRY[platformId] || SCM_PROVIDER_REGISTRY[SCM_PLATFORMS.GITHUB];
}

function getScmUsernameStorageKey(platformId) {
	return `${getScmProvider(platformId).platformId}Username`;
}

if (typeof window !== 'undefined') {
	window.SCM_PLATFORMS = SCM_PLATFORMS;
	window.SCM_PROVIDER_REGISTRY = SCM_PROVIDER_REGISTRY;
	window.SCM_PROVIDER_IDS = SCM_PROVIDER_IDS;
	window.getScmProvider = getScmProvider;
	window.getScmUsernameStorageKey = getScmUsernameStorageKey;
}
