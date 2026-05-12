const SCM_PLATFORMS = Object.freeze({
	GITHUB: 'github',
	GITLAB: 'gitlab',
});

if (typeof window !== 'undefined') {
	window.scmPlatforms = SCM_PLATFORMS;
}
