console.log('Content script loaded');

// 添加检查 GIF 文件头的函数
async function isGifImage(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    // GIF 文件头标识
    const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
    const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    
    // 检查前6个字节是否匹配 GIF 文件头
    const isGif87a = gif87a.every((byte, i) => uint8Array[i] === byte);
    const isGif89a = gif89a.every((byte, i) => uint8Array[i] === byte);
    
    return isGif87a || isGif89a;
  } catch (error) {
    console.error('Error checking GIF format:', error);
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  
  if (request.action === 'findGifs') {
    findGifImages().then(gifUrl => {
      console.log('Sending GIF URL:', gifUrl);
      sendResponse({ gifUrl });
    });
    return true; // 保持消息通道开放
  }
});

// 修改查找 GIF 图片的函数
async function findGifImages() {
  const images = Array.from(document.getElementsByTagName('img'));
  console.log('Found images:', images.length);
  
  for (const img of images) {
    const src = img.src.toLowerCase();
    
    // 首先检查文件扩展名
    if (src.endsWith('.gif') || src.includes('.gif?')) {
      return img.src;
    }
    
    // 如果不是 .gif 扩展名，检查文件内容
    try {
      if (await isGifImage(img.src)) {
        return img.src;
      }
    } catch (error) {
      console.error('Error checking image:', error);
    }
  }
  
  return null;
}

// 修改鼠标悬停检测逻辑
document.addEventListener('mouseover', async (event) => {
  const target = event.target;
  if (target.tagName === 'IMG') {
    const imgSrc = target.src;
    
    // 检查是否为 GIF
    const isGif = imgSrc.toLowerCase().endsWith('.gif') || 
                  imgSrc.toLowerCase().includes('.gif?') ||
                  await isGifImage(imgSrc);
    
    if (isGif) {
      showGifIcon(target);
    }
  }
});

function showGifIcon(imgElement) {
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon.svg');
  icon.style.position = 'absolute';
  icon.style.width = '24px';
  icon.style.height = '24px';
  icon.style.cursor = 'pointer';
  icon.style.zIndex = '1000';
  
  document.body.appendChild(icon);
  
  const rect = imgElement.getBoundingClientRect();
  icon.style.top = `${rect.top + window.scrollY}px`;
  icon.style.left = `${rect.left + window.scrollX}px`;
  
  icon.addEventListener('click', () => {
    const viewerUrl = chrome.runtime.getURL('viewer.html') + 
      `?url=${encodeURIComponent(imgElement.src)}`;
    chrome.runtime.sendMessage({ action: 'openViewer', url: viewerUrl });
  });
  
  imgElement.addEventListener('mouseleave', () => {
    icon.remove();
  });
}

// 在现有代码中添加消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showNotification') {
    showNotification(message.message);
  }
});

// 添加显示提示的函数
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 3秒后自动移除提示
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
} 