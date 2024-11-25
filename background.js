chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openGifViewer",
    title: "在 GIF Viewer 中打开",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openGifViewer") {
    openGifViewer(info.srcUrl);
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'findGifs' }, response => {
    if (response && response.gifUrl) {
      openGifViewer(response.gifUrl);
    } else {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: '当前页面未找到GIF图片'
      });
    }
  });
});

function openGifViewer(url) {
  if (!url) return;
  const viewerUrl = chrome.runtime.getURL('viewer.html') + 
    `?url=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: viewerUrl });
} 