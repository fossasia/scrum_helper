// Function for saving and calling SCM providers
(function () {
  const providers = {};

  // For saving platform and its related provider
  function registerProvider(platform, provider) {
    if (!platform || !provider) return;
    providers[platform] = provider;
  }

  // For finding the provider to work by using these save platform
  function getProvider(platform) {
    return providers[platform] || null;
  }

  window.platformRegistry = {
    registerProvider,
    getProvider,
  };
})();
