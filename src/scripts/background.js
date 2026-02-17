const openByTabId = new Map();

chrome.tabs?.onRemoved?.addListener((tabId) => {
  openByTabId.delete(tabId);
});

// Apply the display mode (popup vs sidePanel)
function applyDisplayMode(mode) {
  if (mode === "popup") {
    chrome.action.setPopup({ popup: "popup.html" });
  } else {
    // sidePanel mode: clear popup so onClicked fires
    chrome.action.setPopup({ popup: "" });
  }
}

// Initialize display mode on startup
chrome.storage.local.get({ displayMode: "sidePanel" }, (result) => {
  applyDisplayMode(result.displayMode);
});

// Listen for changes to displayMode
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.displayMode) {
    applyDisplayMode(changes.displayMode.newValue);
  }
});

chrome.action.onClicked.addListener((tab) => {
  try {
    if (!chrome.sidePanel?.open) {
      console.warn("Side panel API not available.");
      return;
    }

    const tabId = typeof tab?.id === "number" ? tab.id : undefined;
    if (tabId == null) {
      console.warn("No tabId available; cannot toggle side panel.");
      return;
    }

    const isOpen = openByTabId.get(tabId) === true;

    if (isOpen) {
      if (typeof chrome.sidePanel.close === "function") {
        chrome.sidePanel.close({ tabId }).catch((error) => {
          console.error("Failed to close side panel:", error);
        });
      } else if (typeof chrome.sidePanel.setOptions === "function") {
        chrome.sidePanel.setOptions({ tabId, enabled: false }).catch((error) => {
          console.error("Failed to disable side panel:", error);
        });
      }
      openByTabId.set(tabId, false);
      return;
    }

    // Fire-and-forget
    if (typeof chrome.sidePanel.setOptions === "function") {
      chrome.sidePanel
        .setOptions({ tabId, enabled: true, path: "popup.html" })
        .catch((error) => console.error("Failed to enable side panel:", error));
    }

    chrome.sidePanel
      .open({ tabId })
      .then(() => openByTabId.set(tabId, true))
      .catch((error) => {
        openByTabId.set(tabId, false);
        console.error("Failed to open side panel:", error);
      });
  } catch (error) {
    console.error("Failed to toggle side panel:", error);
  }
});