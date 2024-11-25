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
  // 先移除可能存在的旧图标
  removeExistingIcon();
  
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon.svg');
  icon.style.position = 'absolute';
  icon.style.width = '24px';
  icon.style.height = '24px';
  icon.style.cursor = 'pointer';
  icon.style.zIndex = '1000';
  
  // 创建一个容器来包裹图标
  const iconContainer = document.createElement('div');
  iconContainer.style.position = 'absolute';
  iconContainer.style.zIndex = '1000';
  iconContainer.appendChild(icon);
  
  document.body.appendChild(iconContainer);
  
  // 获取图片元素的位置和尺寸
  const rect = imgElement.getBoundingClientRect();
  
  // 更新图标位置
  function updateIconPosition() {
    const rect = imgElement.getBoundingClientRect();
    iconContainer.style.top = `${rect.top + window.scrollY}px`;
    iconContainer.style.left = `${rect.left + window.scrollX}px`;
  }
  
  // 初始化位置
  updateIconPosition();
  
  // 监听滚动事件以更新位置
  window.addEventListener('scroll', updateIconPosition);
  window.addEventListener('resize', updateIconPosition);
  
  icon.addEventListener('click', () => {
    const viewerUrl = chrome.runtime.getURL('viewer.html') + 
      `?url=${encodeURIComponent(imgElement.src)}`;
    chrome.runtime.sendMessage({ action: 'openViewer', url: viewerUrl });
  });
  
  // 处理鼠标移出事件
  function handleMouseMove(e) {
    const iconRect = iconContainer.getBoundingClientRect();
    const imgRect = imgElement.getBoundingClientRect();
    
    // 检查鼠标是否在图片或图标区域内
    const isOverIcon = e.clientX >= iconRect.left && e.clientX <= iconRect.right &&
                      e.clientY >= iconRect.top && e.clientY <= iconRect.bottom;
    const isOverImage = e.clientX >= imgRect.left && e.clientX <= imgRect.right &&
                       e.clientY >= imgRect.top && e.clientY <= imgRect.bottom;
    
    // 如果鼠标既不在图片上也不在图标上，则移除图标
    if (!isOverIcon && !isOverImage) {
      removeIcon();
    }
  }
  
  function removeIcon() {
    window.removeEventListener('scroll', updateIconPosition);
    window.removeEventListener('resize', updateIconPosition);
    window.removeEventListener('mousemove', handleMouseMove);
    iconContainer.remove();
  }
  
  // 添加全局鼠标移动事件监听
  window.addEventListener('mousemove', handleMouseMove);
}

// 辅助函数：移除页面上可能存在的旧图标
function removeExistingIcon() {
  const existingIcons = document.querySelectorAll('img[src*="icon.svg"]');
  existingIcons.forEach(icon => {
    const container = icon.parentElement;
    if (container) {
      container.remove();
    }
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