function capitalizeStorageKeyType(keyType) {
	return keyType.charAt(0).toUpperCase() + keyType.slice(1);
}

function getScmStorageKey(platformId, keyType) {
	const provider = window.scmProviders.getProvider(platformId);
	const key = provider.storageKeys?.[keyType];

	if (key) {
		return key;
	}

	return `${provider.id}${capitalizeStorageKeyType(keyType)}`;
}

if (typeof window !== 'undefined') {
	window.scmStorageKeys = Object.freeze({
		getStorageKey: getScmStorageKey,
	});
}
