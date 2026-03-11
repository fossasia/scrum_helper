// Versioned storage for report configuration / templates.
// Intentionally side-effect free: it only exposes helpers on window.
(() => {
  const STORAGE_KEY = 'reportConfig';
  const VERSION = 1;
 
  const DEFAULT_REPORT_CONFIG = Object.freeze({
    version: VERSION,
    // A single default template for now (future-proofed for multi-template support).
    activeTemplateId: 'default',
    templates: {
      default: {
        id: 'default',
        name: 'Default',
        sections: {
          issues: true,
          prs: true,
          reviewedPrs: true,
          tasks: true,
          blockers: true,
        },
        filters: {
          onlyIssues: false,
          onlyPRs: false,
          onlyReviewedPRs: false,
        },
        display: {
          showOpenLabel: true,
          showCommits: false,
        },
      },
    },
  });
 
  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
 
  function deepMerge(base, patch) {
    if (!isObject(base) || !isObject(patch)) return patch;
    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (isObject(v) && isObject(base[k])) out[k] = deepMerge(base[k], v);
      else out[k] = v;
    }
    return out;
  }
 
  function storageGet(keys) {
    return new Promise((resolve) => chrome?.storage?.local?.get(keys, resolve));
  }
 
  function storageSet(obj) {
    return new Promise((resolve) => chrome?.storage?.local?.set(obj, resolve));
  }
 
  function getActiveTemplate(config) {
    const activeId = config?.activeTemplateId || 'default';
    const tpl = config?.templates?.[activeId];
    return tpl || config?.templates?.default || DEFAULT_REPORT_CONFIG.templates.default;
  }
 
  async function getReportConfig() {
    const stored = await storageGet([STORAGE_KEY]);
    const current = stored?.[STORAGE_KEY];
    if (!current || !isObject(current)) {
      return DEFAULT_REPORT_CONFIG;
    }
    // Ensure defaults exist for forward compatibility
    return deepMerge(DEFAULT_REPORT_CONFIG, current);
  }
 
  async function setReportConfig(patch) {
    const current = await getReportConfig();
    const merged = deepMerge(current, patch);
    await storageSet({ [STORAGE_KEY]: merged });
    return merged;
  }
 
  /**
   * One-time migration from existing scattered keys to reportConfig.
   * Safe to call multiple times (won't overwrite if reportConfig already exists).
   */
  async function migrateLegacyIfNeeded() {
    const { reportConfig } = await storageGet([STORAGE_KEY]);
    if (reportConfig && isObject(reportConfig)) return reportConfig;
 
    const legacy = await storageGet([
      'onlyIssues',
      'onlyPRs',
      'onlyRevPRs',
      'showOpenLabel',
      'showCommits',
    ]);
 
    const config = deepMerge(DEFAULT_REPORT_CONFIG, {
      templates: {
        default: {
          filters: {
            onlyIssues: legacy.onlyIssues === true,
            onlyPRs: legacy.onlyPRs === true,
            onlyReviewedPRs: legacy.onlyRevPRs === true,
          },
          display: {
            showOpenLabel: legacy.showOpenLabel !== false,
            showCommits: legacy.showCommits === true,
          },
        },
      },
    });
 
    await storageSet({ [STORAGE_KEY]: config });
    return config;
  }
 
  /**
   * Updates the active template based on legacy key updates.
   * This lets us keep existing behavior (legacy keys still used)
   * while also keeping reportConfig in sync for the next PR(s).
   */
  async function syncFromLegacyPatch(legacyPatch) {
    const config = await getReportConfig();
    const active = getActiveTemplate(config);
 
    const next = { ...active };
 
    if ('onlyIssues' in legacyPatch) next.filters = { ...next.filters, onlyIssues: legacyPatch.onlyIssues === true };
    if ('onlyPRs' in legacyPatch) next.filters = { ...next.filters, onlyPRs: legacyPatch.onlyPRs === true };
    if ('onlyRevPRs' in legacyPatch) next.filters = { ...next.filters, onlyReviewedPRs: legacyPatch.onlyRevPRs === true };
 
    if ('showOpenLabel' in legacyPatch) next.display = { ...next.display, showOpenLabel: legacyPatch.showOpenLabel !== false };
    if ('showCommits' in legacyPatch) next.display = { ...next.display, showCommits: legacyPatch.showCommits === true };
 
    const merged = deepMerge(config, {
      templates: { [active.id]: next },
    });
 
    await storageSet({ [STORAGE_KEY]: merged });
    return merged;
  }
 
  window.ReportConfigStorage = {
    STORAGE_KEY,
    VERSION,
    DEFAULT_REPORT_CONFIG,
    getReportConfig,
    setReportConfig,
    migrateLegacyIfNeeded,
    syncFromLegacyPatch,
  };
})();

