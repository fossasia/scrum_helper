// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateStandaloneReport") {
    // Forward the message to the active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({content: "No active tab found. Please open a supported page."});
      }
    });
    return true; // Keep the message channel open for the async response
  }
});
