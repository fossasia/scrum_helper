chrome.action.onClicked.addListener(async (tab) => {
    try {
        if (!chrome.sidePanel) {
            console.warn("Side panel API not available.");
            return;
        }

        const tabId = tab?.id;
        const windowId = tab?.windowId ?? (await chrome.windows.getCurrent()).id;

        if (tabId) {
            await chrome.sidePanel.setOptions({
                tabId,
                path: "popup.html",
                enabled: true,
            });
            await chrome.sidePanel.open({ tabId });
            return;
        }

        await chrome.sidePanel.setOptions({
            windowId,
            path: "popup.html",
            enabled: true,
        });
        await chrome.sidePanel.open({ windowId });
    } catch (error) {
        console.error("Failed to open side panel:", error);
    }
});