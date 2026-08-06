const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 500,
        height: 800,

        webPreferences: {
            preload: path.join(__dirname, "chrome-api.js"),
            contextIsolation: false,
            nodeIntegration: true,
        },
    });

    win.loadFile(
        path.join(__dirname, "../src/popup.html")
    );

    win.webContents.on("did-finish-load", () => {
        win.webContents.executeJavaScript(`
            window.chrome = {
                runtime: {
                    id: "electron-extension",
                    lastError: null,

                    onMessage: {
                        addListener: function(){}
                    },

                    sendMessage: function(){}
                },

                storage: {
                    local: {
                        get: function(keys, callback) {
                            let result = {};

                            keys.forEach(function(key) {
                                result[key] = localStorage.getItem(key);
                            });

                            callback(result);
                        },

                        set: function(data, callback) {
                            Object.keys(data).forEach(function(key) {
                                localStorage.setItem(key, data[key]);
                            });

                            if (callback) callback();
                        },

                        remove: function(keys, callback) {
                            keys.forEach(function(key) {
                                localStorage.removeItem(key);
                            });

                            if (callback) callback();
                        }
                    }
                },

                i18n: {
                    getMessage: function(key) {
                        return key;
                    }
                }
            };
        `);
    });

    win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();
});