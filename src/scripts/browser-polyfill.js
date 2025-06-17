// scripts/browser-polyfill.js
if (typeof browser === "undefined") {
    window.browser = typeof chrome !== "undefined" ? chrome : {};
}