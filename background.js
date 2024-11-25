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

// 添加对 openViewer 消息的处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openViewer') {
    openGifViewer(new URL(request.url).searchParams.get('url'));
    return true;
  }
  
  if (request.action === 'checkGifHeader') {
    checkGifHeader(request.url)
      .then(isGif => sendResponse({ isGif }))
      .catch(error => {
        console.error('Error checking GIF header:', error);
        sendResponse({ isGif: false });
      });
    return true;
  }
});

function openGifViewer(url) {
  if (!url) return;
  const viewerUrl = chrome.runtime.getURL('viewer.html') + 
    `?url=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: viewerUrl });
}

async function checkGifHeader(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer.slice(0, 6));
    
    const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
    const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    
    const isGif87a = gif87a.every((byte, i) => uint8Array[i] === byte);
    const isGif89a = gif89a.every((byte, i) => uint8Array[i] === byte);
    
    return isGif87a || isGif89a;
  } catch (error) {
    console.error('Error fetching GIF:', error);
    return false;
  }
} 