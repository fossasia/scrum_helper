window.scmProviders.register({
	id: window.scmPlatforms.GITLAB,
	displayName: 'GitLab',
	iconClass: 'fab fa-gitlab',
	usernameLabelI18nKey: 'gitlabUsernameLabel',
	visibleSettingsSection: 'gitlab',
	visibleSectionClass: 'gitlabOnlySection',
	storageKeys: Object.freeze({
		username: 'gitlabUsername',
	}),
});
