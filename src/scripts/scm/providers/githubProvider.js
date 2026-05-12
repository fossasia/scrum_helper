window.scmProviders.register({
	id: window.scmPlatforms.GITHUB,
	displayName: 'GitHub',
	iconClass: 'fab fa-github',
	usernameLabelI18nKey: 'githubUsernameLabel',
	visibleSettingsSection: 'github',
	visibleSectionClass: 'githubOnlySection',
	storageKeys: Object.freeze({
		username: 'githubUsername',
	}),
});
