(function (global) {
  const SCRUM_HELPER_CONFIG = Object.freeze({
    DEFAULT_PLATFORM: "github",
    DEFAULT_DISPLAY_MODE: "sidePanel",
    DEFAULT_CACHE_TTL_MINUTES: 10,
    API_BASE_URLS: Object.freeze({
      GITHUB: "https://api.github.com",
      GITHUB_GRAPHQL: "https://api.github.com/graphql",
      GITLAB: "https://gitlab.com/api/v4",
    }),
    // this key section will move into storageManager.js later
    STORAGE_KEYS: Object.freeze({
      ACTIVE_PLATFORM: "platform",
      DISPLAY_MODE: "displayMode",
      CACHE_INPUT: "cacheInput",
      GITHUB_TOKEN: "githubToken",
      GITLAB_TOKEN: "gitlabToken",
      GITLAB_BASE_URL: "gitlabBaseUrl",
      GITHUB_CACHE: "githubCache",
      GITLAB_CACHE: "gitlabCache",
    }),
  });

  global.SCRUM_HELPER_CONFIG = SCRUM_HELPER_CONFIG;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = SCRUM_HELPER_CONFIG;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
