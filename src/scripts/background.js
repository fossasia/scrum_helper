chrome.action.onClicked.addListener((tab) => {
  try {
    if (!chrome.sidePanel?.open) {
      console.warn("Side panel API not available.");
      return;
    }

    const tabId = typeof tab?.id === "number" ? tab.id : undefined;
    if (tabId == null) {
      console.warn("No tabId available; cannot open side panel.");
      return;
    }

    chrome.sidePanel.open({ tabId }).catch((error) => {
      console.error("Failed to open side panel:", error);
    });
  } catch (error) {
    console.error("Failed to open side panel:", error);
  }
});