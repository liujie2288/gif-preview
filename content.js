console.log('Content script loaded');

// 添加检查 GIF 文件头的函数
async function isGifImage(url) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkGifHeader',
      url: url
    });
    return response.isGif;
  } catch (error) {
    console.error('Error checking GIF:', error);
    return url.toLowerCase().endsWith('.gif') || url.toLowerCase().includes('.gif?');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  
  if (request.action === 'findGifs') {
    findGifImages().then(gifUrl => {
      console.log('Sending GIF URL:', gifUrl);
      sendResponse({ gifUrl });
    });
    return true;
  }
  
  if (request.action === 'showNotification') {
    showNotification(request.message);
  }
});

async function findGifImages() {
  const images = Array.from(document.getElementsByTagName('img'));
  console.log('Found images:', images.length);
  
  for (const img of images) {
    const src = img.src.toLowerCase();
    
    if (src.endsWith('.gif') || src.includes('.gif?')) {
      return img.src;
    }
    
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

// 添加鼠标悬停检测逻辑
document.addEventListener('mouseover', async (event) => {
  const target = event.target;
  if (target.tagName === 'IMG') {
    const imgSrc = target.src;
    
    const isGif = imgSrc.toLowerCase().endsWith('.gif') || 
                  imgSrc.toLowerCase().includes('.gif?') ||
                  await isGifImage(imgSrc);
                  
    if (isGif) {
      showGifIcon(target);
    }
  }
});

function showGifIcon(imgElement) {
  removeExistingIcon();
  
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon.svg');
  icon.style.cssText = `
    position: absolute;
    width: 24px;
    height: 24px;
    cursor: pointer;
    z-index: 1000;
  `;
  
  const iconContainer = document.createElement('div');
  iconContainer.style.cssText = `
    position: absolute;
    z-index: 1000;
  `;
  iconContainer.appendChild(icon);
  
  document.body.appendChild(iconContainer);
  
  function updateIconPosition() {
    const rect = imgElement.getBoundingClientRect();
    iconContainer.style.top = `${rect.top + window.scrollY}px`;
    iconContainer.style.left = `${rect.left + window.scrollX}px`;
  }
  
  updateIconPosition();
  
  window.addEventListener('scroll', updateIconPosition);
  window.addEventListener('resize', updateIconPosition);
  
  icon.addEventListener('click', () => {
    const viewerUrl = chrome.runtime.getURL('viewer.html') + 
      `?url=${encodeURIComponent(imgElement.src)}`;
    chrome.runtime.sendMessage({ action: 'openViewer', url: viewerUrl });
  });
  
  function handleMouseMove(e) {
    const iconRect = iconContainer.getBoundingClientRect();
    const imgRect = imgElement.getBoundingClientRect();
    
    const isOverIcon = e.clientX >= iconRect.left && e.clientX <= iconRect.right &&
                      e.clientY >= iconRect.top && e.clientY <= iconRect.bottom;
    const isOverImage = e.clientX >= imgRect.left && e.clientX <= imgRect.right &&
                       e.clientY >= imgRect.top && e.clientY <= imgRect.bottom;
    
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
  
  window.addEventListener('mousemove', handleMouseMove);
}

function removeExistingIcon() {
  const existingIcons = document.querySelectorAll('img[src*="icon.svg"]');
  existingIcons.forEach(icon => {
    const container = icon.parentElement;
    if (container) {
      container.remove();
    }
  });
}

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
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
} 