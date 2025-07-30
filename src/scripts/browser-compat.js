// Browser compatibility layer for Chrome/Firefox differences

// Detect browser
const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage;
const isChrome = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage;

// Unified API wrapper
const browserAPI = {
    // Storage API
    storage: {
        local: {
            get: (keys, callback) => {
                if (isFirefox) {
                    return browser.storage.local.get(keys).then(callback).catch(err => {
                        console.error('Firefox storage.get error:', err);
                        callback({});
                    });
                } else {
                    return chrome.storage.local.get(keys, callback);
                }
            },
            set: (items, callback) => {
                if (isFirefox) {
                    return browser.storage.local.set(items).then(() => {
                        if (callback) callback();
                    }).catch(err => {
                        console.error('Firefox storage.set error:', err);
                        if (callback) callback();
                    });
                } else {
                    return chrome.storage.local.set(items, callback);
                }
            },
            remove: (keys, callback) => {
                if (isFirefox) {
                    return browser.storage.local.remove(keys).then(() => {
                        if (callback) callback();
                    }).catch(err => {
                        console.error('Firefox storage.remove error:', err);
                        if (callback) callback();
                    });
                } else {
                    return chrome.storage.local.remove(keys, callback);
                }
            },
            onChanged: {
                addListener: (callback) => {
                    if (isFirefox) {
                        return browser.storage.onChanged.addListener(callback);
                    } else {
                        return chrome.storage.onChanged.addListener(callback);
                    }
                }
            }
        }
    },
    
    // Runtime API
    runtime: {
        onMessage: {
            addListener: (callback) => {
                if (isFirefox) {
                    return browser.runtime.onMessage.addListener(callback);
                } else {
                    return chrome.runtime.onMessage.addListener(callback);
                }
            }
        },
        lastError: isFirefox ? null : chrome.runtime.lastError,
        sendMessage: (message, callback) => {
            if (isFirefox) {
                if (callback) {
                    // Firefox with callback (convert Promise to callback)
                    return browser.runtime.sendMessage(message).then(callback).catch(err => {
                        console.error('Firefox sendMessage error:', err);
                        callback(null, err);
                    });
                } else {
                    // Firefox without callback (return Promise)
                    return browser.runtime.sendMessage(message);
                }
            } else {
                // Chrome always uses callback pattern
                return chrome.runtime.sendMessage(message, callback);
            }
        }
    },
    
    // i18n API
    i18n: {
        getMessage: (messageName, substitutions) => {
            if (isFirefox) {
                return browser.i18n.getMessage(messageName, substitutions);
            } else {
                return chrome.i18n.getMessage(messageName, substitutions);
            }
        }
    },
    
    // Helper function for Promise-based sendMessage
    sendMessagePromise: (message) => {
        if (isFirefox) {
            return browser.runtime.sendMessage(message);
        } else {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                });
            });
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = browserAPI;
} else {
    window.browserAPI = browserAPI;
} 
