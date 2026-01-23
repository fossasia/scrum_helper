

class ScrumReportConfigManager {
    
    static SECTIONS = {
        TASKS: 'tasks',
        BLOCKERS: 'blockers',
        PULL_REQUESTS: 'pullRequests',
        REVIEWED_PULL_REQUESTS: 'reviewedPullRequests',
        ISSUES: 'issues'
    };

    // Default configuration 
    static DEFAULT_CONFIG = {
        [this.SECTIONS.TASKS]: true,
        [this.SECTIONS.BLOCKERS]: true,
        [this.SECTIONS.PULL_REQUESTS]: true,
        [this.SECTIONS.REVIEWED_PULL_REQUESTS]: true,
        [this.SECTIONS.ISSUES]: true
    };

    
    static STORAGE_KEY = 'scrumReportConfig';

 
    static init() {
        const existing = this.getConfig();
        if (!existing) {
            this.saveConfig(this.DEFAULT_CONFIG);
        }
    }

 
    static getConfig() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                return null;
            }
            const parsed = JSON.parse(stored);
            const merged = { ...this.DEFAULT_CONFIG, ...parsed };
            return this.isValid(merged) ? merged : null;
        } catch (error) {
            console.error('[ScrumReportConfig] Error reading configuration:', error);
            return null;
        }
    }


    static getConfigAsync() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.get([this.STORAGE_KEY], (items) => {
                    try {
                        const config = this.isValid(items[this.STORAGE_KEY]) ? items[this.STORAGE_KEY] : null;
                        const resolved = config || this.getConfig() || this.DEFAULT_CONFIG;
                        try {
                            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(resolved));
                        } catch (error) {
                            console.error('[ScrumReportConfig] Error syncing to localStorage:', error);
                        }
                        resolve(resolved);
                    } catch (error) {
                        console.error('[ScrumReportConfig] Error reading configuration:', error);
                        resolve(this.DEFAULT_CONFIG);
                    }
                });
            } else {
               
                resolve(this.getConfig() || this.DEFAULT_CONFIG);
            }
        });
    }

   
    static saveConfig(config) {
        const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
        if (!this.isValid(mergedConfig)) {
            console.error('[ScrumReportConfig] Invalid configuration, falling back to defaults');
            config = { ...this.DEFAULT_CONFIG };
        } else {
            config = mergedConfig;
        }
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));

            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ [this.STORAGE_KEY]: config });
            }
        } catch (error) {
            console.error('[ScrumReportConfig] Error saving configuration:', error);
        }
    }


    static isSectionEnabled(section, config = null) {
        const resolvedConfig = config || this.getConfig() || this.DEFAULT_CONFIG;
        return resolvedConfig[section] !== false;
    }


    static getEnabledSections() {
        const config = this.getConfig() || this.DEFAULT_CONFIG;
        return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== false));
    }

 
    static toggleSection(section, enabled, options = {}) {
        const baseConfig = options.baseConfig ? { ...options.baseConfig } : (this.getConfig() || { ...this.DEFAULT_CONFIG });
        baseConfig[section] = !!enabled;

        if (options.persist === false) {
            return baseConfig;
        }

        this.saveConfig(baseConfig);
        return baseConfig;
    }

 
    static resetToDefaults() {
        this.saveConfig({ ...this.DEFAULT_CONFIG });
    }

 
    static getTemplateConfig() {
        return this.getConfig() || this.DEFAULT_CONFIG;
    }


    static isValid(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        const expectedKeys = Object.values(this.SECTIONS);
        return expectedKeys.every(key => typeof config[key] === 'boolean');
    }
}

// Initialize on script load
ScrumReportConfigManager.init();
