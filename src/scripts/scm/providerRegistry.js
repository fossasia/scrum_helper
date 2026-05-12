const scmProviderRegistry = {};

function registerScmProvider(provider) {
	if (!provider || !provider.id) {
		return;
	}

	scmProviderRegistry[provider.id] = Object.freeze({ ...provider });
}

function getScmProvider(platformId) {
	const provider = scmProviderRegistry[platformId];
	if (provider) {
		return provider;
	}

	console.warn(`Unknown SCM platform "${platformId}", falling back to GitHub.`);
	return scmProviderRegistry[window.scmPlatforms.GITHUB];
}

function getScmProviders() {
	return Object.freeze(Object.values(scmProviderRegistry));
}

function getScmProviderIds() {
	return Object.freeze(Object.keys(scmProviderRegistry));
}

if (typeof window !== 'undefined') {
	window.scmProviders = Object.freeze({
		platforms: window.scmPlatforms,
		get registry() {
			return Object.freeze({ ...scmProviderRegistry });
		},
		get providerIds() {
			return getScmProviderIds();
		},
		register: registerScmProvider,
		getProvider: getScmProvider,
		getProviders: getScmProviders,
		getProviderIds: getScmProviderIds,
	});
}
