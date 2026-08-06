window.chrome = {
    storage: {
        local: {
            get: (keys, callback) => {
                const result = {};

                if (!keys) {
                    if (typeof callback === "function") {
                        callback({});
                    }
                    return Promise.resolve({});
                }

                if (typeof keys === "string") {
                    keys = [keys];
                }

                if (Array.isArray(keys)) {
                    keys.forEach((key) => {
                        result[key] = localStorage.getItem(key);
                    });
                } else {
                    Object.keys(keys).forEach((key) => {
                        result[key] = localStorage.getItem(key) || keys[key];
                    });
                }

                if (typeof callback === "function") {
                    callback(result);
                }

                return Promise.resolve(result);
            },

            set: (data, callback) => {
                Object.keys(data).forEach((key) => {
                    localStorage.setItem(key, data[key]);
                });

                if (typeof callback === "function") {
                    callback();
                }

                return Promise.resolve();
            },

            remove: (keys, callback) => {
                if (typeof keys === "string") {
                    keys = [keys];
                }

                keys.forEach((key) => {
                    localStorage.removeItem(key);
                });

                if (typeof callback === "function") {
                    callback();
                }

                return Promise.resolve();
            },
        },

        // ADD THIS
        onChanged: {
            addListener: function (callback) {
                console.log("storage change listener registered");
            }
        }
    },

    runtime: {
        id: "electron-extension",

        lastError: null,

        onMessage: {
            addListener: function (callback) {
                console.log("runtime message listener registered");
            }
        },

        sendMessage: function () {
            return Promise.resolve();
        }
    },

    i18n: {
        getMessage: (key) => {
            return key;
        },
    },
};

// Firefox extension compatibility
window.browser = window.chrome;