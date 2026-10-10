let pendingDownloads = {};

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) return;

  let domain = "webpage";
  try {
    domain = new URL(tab.url).hostname.replace(/^www\./, "");
  } catch (e) {}

  const sessionId = "ss_" + Date.now();
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const defaultFilename = `${domain}_screenshot_${timestamp}`;

  // Start 3-second auto-download timer
  pendingDownloads[sessionId] = setTimeout(() => {
    executeDownload(dataUrl, defaultFilename);
    delete pendingDownloads[sessionId];
  }, 3000);

  // Send to content script
  chrome.tabs.sendMessage(tab.id, { action: "SHOW_THUMBNAIL", dataUrl, defaultFilename, sessionId }, () => {
    if (chrome.runtime.lastError) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        chrome.tabs.sendMessage(tab.id, { action: "SHOW_THUMBNAIL", dataUrl, defaultFilename, sessionId });
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "CANCEL_AUTO_DOWNLOAD") {
    if (pendingDownloads[message.sessionId]) {
      clearTimeout(pendingDownloads[message.sessionId]);
      delete pendingDownloads[message.sessionId];
    }
  }

  if (message.action === "MANUAL_DOWNLOAD") {
    if (pendingDownloads[message.sessionId]) {
      clearTimeout(pendingDownloads[message.sessionId]);
      delete pendingDownloads[message.sessionId];
    }
    executeDownload(message.dataUrl, message.filename, message.suffix);
  }
});

function executeDownload(dataUrl, customName, suffix = "") {
  let cleanName = customName ? customName.trim().replace(/[/\\?%*:|"<>]/g, '_') : 'screenshot';
  if (!cleanName.toLowerCase().endsWith('.png')) {
    cleanName += suffix ? `_${suffix}.png` : '.png';
  } else if (suffix) {
    cleanName = cleanName.replace(/\.png$/i, `_${suffix}.png`);
  }

  chrome.downloads.download({
    url: dataUrl,
    filename: cleanName,
    saveAs: false
  });
}