

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
            return JSON.parse(stored);
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
                        const config = items[this.STORAGE_KEY];
                        resolve(config || this.DEFAULT_CONFIG);
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
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));

            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ [this.STORAGE_KEY]: config });
            }
        } catch (error) {
            console.error('[ScrumReportConfig] Error saving configuration:', error);
        }
    }


    static isSectionEnabled(section) {
        const config = this.getConfig() || this.DEFAULT_CONFIG;
        return config[section] !== false;
    }


    static getEnabledSections() {
        return this.getConfig() || this.DEFAULT_CONFIG;
    }

 
    static toggleSection(section, enabled) {
        const config = this.getConfig() || { ...this.DEFAULT_CONFIG };
        config[section] = enabled;
        this.saveConfig(config);
    }

 
    static resetToDefaults() {
        this.saveConfig({ ...this.DEFAULT_CONFIG });
    }

 
    static getTemplateConfig(templateName = 'default') {
        const config = this.getConfig() || this.DEFAULT_CONFIG;

  
        return config;
    }


    static isValid(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Check that it has expected keys
        const expectedKeys = Object.values(this.SECTIONS);
        const configKeys = Object.keys(config);

        return expectedKeys.every(key => key in config) &&
               configKeys.every(key => expectedKeys.includes(key));
    }
}

// Initialize on script load
ScrumReportConfigManager.init();
