if (typeof browser === "undefined") {
    window.browser = typeof chrome !== "undefined" ? chrome : {};
    // Create global browser reference
    if (typeof chrome !== "undefined") {
        var browser = chrome;
    }
}