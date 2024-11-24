let gifData = null;
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval = null;

document.getElementById('analyze').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      alert('无法获取当前标签页');
      return;
    }

    // 先注入 content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // 然后发送消息
    chrome.tabs.sendMessage(tab.id, { action: 'findGifs' }, response => {
      console.log('Response from content script:', response);
      
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        alert('无法与页面通信，请确保页面已完全加载');
        return;
      }

      if (response && response.gifUrl) {
        loadGif(response.gifUrl);
      } else {
        alert('当前页面未找到 GIF 图片');
      }
    });
  } catch (error) {
    console.error('Error in analyze click handler:', error);
    alert('发生错误：' + error.message);
  }
});

document.getElementById('prev').addEventListener('click', () => {
  if (gifData && currentFrameIndex > 0) {
    currentFrameIndex--;
    renderFrame();
  }
});

document.getElementById('next').addEventListener('click', () => {
  if (gifData && currentFrameIndex < gifData.frames.length - 1) {
    currentFrameIndex++;
    renderFrame();
  }
});

document.getElementById('play').addEventListener('click', () => {
  if (gifData && !isPlaying) {
    isPlaying = true;
    playFrames();
  }
});

document.getElementById('pause').addEventListener('click', () => {
  isPlaying = false;
  if (playInterval) {
    clearInterval(playInterval);
  }
});

async function loadGif(url) {
  try {
    // 打开新标签页显示帧分析结果
    const viewerUrl = chrome.runtime.getURL('viewer.html') + `?url=${encodeURIComponent(url)}`;
    await chrome.tabs.create({ url: viewerUrl });
    
    // 关闭弹出窗口
    window.close();
  } catch (error) {
    console.error('加载 GIF 失败:', error);
    alert('加载 GIF 失败: ' + error.message);
  }
}

function renderFrame() {
  if (!gifData) return;
  
  const frame = gifData.frames[currentFrameIndex];
  const canvas = document.getElementById('currentFrame');
  const ctx = canvas.getContext('2d');
  
  // 设置主画布尺寸
  canvas.width = frame.width;
  canvas.height = frame.height;
  
  // 直接将 ImageData 绘制到主画布
  ctx.putImageData(frame.imageData, 0, 0);
  
  document.getElementById('currentFrameNum').textContent = currentFrameIndex + 1;
}

function playFrames() {
  if (playInterval) {
    clearInterval(playInterval);
  }
  
  playInterval = setInterval(() => {
    if (!isPlaying) return;
    
    if (currentFrameIndex >= gifData.frames.length - 1) {
      currentFrameIndex = 0;
    } else {
      currentFrameIndex++;
    }
    
    renderFrame();
  }, 100); // 可以根据实际需求调整播放速度
} 