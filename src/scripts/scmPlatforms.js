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

const SCM_PROVIDER_IDS = Object.freeze(Object.keys(SCM_PROVIDER_REGISTRY));

function getScmProvider(platformId) {
	const provider = SCM_PROVIDER_REGISTRY[platformId];
	if (provider) {
		return provider;
	}

	console.warn(`Unknown SCM platform "${platformId}", falling back to GitHub.`);
	return SCM_PROVIDER_REGISTRY[SCM_PLATFORMS.GITHUB];
}

function getScmUsernameStorageKey(platformId) {
	return `${getScmProvider(platformId).platformId}Username`;
}

if (typeof window !== 'undefined') {
	window.scmProviders = Object.freeze({
		platforms: SCM_PLATFORMS,
		registry: SCM_PROVIDER_REGISTRY,
		providerIds: SCM_PROVIDER_IDS,
		getProvider: getScmProvider,
		getUsernameStorageKey: getScmUsernameStorageKey,
	});
}
