chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openGifViewer",
    title: "在 GIF Viewer 中打开",
    contexts: ["image"]
  });
});

async function isGifImage(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
    const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    
    const isGif87a = gif87a.every((byte, i) => uint8Array[i] === byte);
    const isGif89a = gif89a.every((byte, i) => uint8Array[i] === byte);
    
    return isGif87a || isGif89a;
  } catch (error) {
    console.error('Error checking GIF format:', error);
    return false;
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "openGifViewer") {
    try {
      const isGif = await isGifImage(info.srcUrl);
      if (isGif) {
        const viewerUrl = chrome.runtime.getURL('viewer.html') + 
          `?url=${encodeURIComponent(info.srcUrl)}`;
        chrome.tabs.create({ url: viewerUrl });
      } else {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: '该图片不是 GIF 格式'
        });
      }
    } catch (error) {
      console.error('Error checking image type:', error);
      chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: '检查图片格式时出错'
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openViewer') {
    chrome.tabs.create({ url: message.url });
  }
}); 