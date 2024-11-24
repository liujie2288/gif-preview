let gifData = null;
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval = null;
let currentZoom = 1;
let zoomCanvas = null;
let zoomCtx = null;
let previewCanvas = null;
let previewCtx = null;
let isPreviewCollapsed = false;

// 添加播放器相关变量
let playerCanvas = null;
let playerCtx = null;
let playbackSpeed = 1;
let baseDelay = 100;

document.addEventListener('DOMContentLoaded', () => {
  // 初始化播放器
  playerCanvas = document.getElementById('playerCanvas');
  playerCtx = playerCanvas.getContext('2d');
  
  // 初始化缩放控制
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const zoomResetBtn = document.getElementById('zoomReset');
  const modalCloseBtn = document.getElementById('modalClose');
  
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => adjustZoom(1.2));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => adjustZoom(0.8));
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', resetZoom);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  // 添加帧控制按钮的事件监听
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const playBtn = document.getElementById('playerPlay');
  const pauseBtn = document.getElementById('playerPause');
  const progressBar = document.getElementById('progressBar');
  const playbackSpeedSelect = document.getElementById('playbackSpeed');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (gifData && currentFrameIndex > 0) {
        currentFrameIndex--;
        updatePlayer();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (gifData && currentFrameIndex < gifData.frames.length - 1) {
        currentFrameIndex++;
        updatePlayer();
      }
    });
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (gifData && !isPlaying) {
        isPlaying = true;
        playBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        playFrames();
      }
    });
  }
  
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      isPlaying = false;
      pauseBtn.style.display = 'none';
      if (playBtn) playBtn.style.display = 'inline-flex';
      if (playInterval) {
        clearInterval(playInterval);
      }
    });
  }

  // 播速度控制
  if (playbackSpeedSelect) {
    playbackSpeedSelect.addEventListener('change', (e) => {
      playbackSpeed = parseFloat(e.target.value);
      if (isPlaying) {
        playFrames();
      }
    });
  }
  
  // 进度条控制
  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!gifData) return;
      
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const frameIndex = Math.floor(percentage * gifData.frames.length);
      
      currentFrameIndex = Math.min(Math.max(0, frameIndex), gifData.frames.length - 1);
      updatePlayer();
    });

    // 进度条悬停效果
    progressBar.addEventListener('mousemove', (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const percentage = (x / width) * 100;
      
      const hoverElement = e.target.querySelector('.progress-hover');
      if (hoverElement) {
        hoverElement.style.width = `${percentage}%`;
      }
    });
  }

  // 在所有初始化完成后，加载 GIF
  const urlParams = new URLSearchParams(window.location.search);
  const gifUrl = urlParams.get('url');
  if (gifUrl) {
    loadGif(decodeURIComponent(gifUrl));
  }
});

async function loadGif(url) {
  const loadingContainer = document.getElementById('loadingContainer');
  const loadingText = loadingContainer.querySelector('.loading-text');
  
  try {
    loadingContainer.style.display = 'flex';
    loadingText.textContent = '正在下载 GIF 图片...';
    
    const parser = new GifParser();
    loadingText.textContent = '正在解析 GIF 帧...';
    const { frames } = await parser.parseGIF(url);
    
    loadingText.textContent = '正在渲染帧...';
    gifData = { frames };
    
    document.getElementById('playerTotalFrames').textContent = frames.length;
    
    renderAllFrames();
    currentFrameIndex = 0;
    updatePlayer();
    
    // 完成后隐藏加载提示
    loadingContainer.style.display = 'none';
  } catch (error) {
    console.error('加载 GIF 失败:', error);
    loadingText.textContent = '加载失败: ' + error.message;
    // 3秒后隐藏加载提示
    setTimeout(() => {
      loadingContainer.style.display = 'none';
    }, 3000);
    alert('加载 GIF 失败: ' + error.message);
  }
}

function renderAllFrames() {
  const container = document.getElementById('framesContainer');
  container.innerHTML = '';
  
  gifData.frames.forEach((frame, index) => {
    const frameDiv = createFrameElement(frame, index);
    container.appendChild(frameDiv);
    
    // 点击帧打开放大查看
    frameDiv.addEventListener('click', () => {
      openZoomView(frame, index);
    });
  });
}

function createFrameElement(frameData, index) {
    const frameDiv = document.createElement('div');
    frameDiv.className = 'frame-item';
    frameDiv.id = `frame-${index}`;
    
    // 添加帧号
    const frameNumber = document.createElement('div');
    frameNumber.className = 'frame-number';
    frameNumber.textContent = `#${index + 1}`;
    frameDiv.appendChild(frameNumber);
    
    // Canvas 部分保持不变
    const canvas = document.createElement('canvas');
    canvas.width = frameData.width;
    canvas.height = frameData.height;
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;  // 保持像素清晰
    ctx.putImageData(frameData.imageData, 0, 0);
    
    // 添加帧信息区域
    const infoDiv = document.createElement('div');
    infoDiv.className = 'frame-info';
    
    // 添加尺寸信息
    const sizeInfo = document.createElement('div');
    sizeInfo.className = 'frame-info-item';
    sizeInfo.innerHTML = `
        <span class="frame-info-label">尺寸</span>
        <span class="frame-info-value">${frameData.width}×${frameData.height}</span>
    `;
    infoDiv.appendChild(sizeInfo);
    
    // 添加延迟信息
    const delayInfo = document.createElement('div');
    delayInfo.className = 'frame-info-item';
    delayInfo.innerHTML = `
        <span class="frame-info-label">延迟</span>
        <span class="frame-info-value">${frameData.delay}ms</span>
    `;
    infoDiv.appendChild(delayInfo);
    
    frameDiv.appendChild(infoDiv);
    
    // 下载按钮保持不变
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-button';
    downloadBtn.textContent = '下载此帧';
    downloadBtn.onclick = (e) => {
      e.stopPropagation();
      downloadFrame(canvas, index);
    };
    
    frameDiv.appendChild(canvas);
    frameDiv.appendChild(downloadBtn);
    
    return frameDiv;
}

function highlightCurrentFrame() {
  if (!gifData) return;
  
  // 移除所有高亮
  document.querySelectorAll('.frame-item').forEach(item => {
    item.style.border = '1px solid #ccc';
  });
  
  // 高亮当前帧
  const currentFrame = document.getElementById(`frame-${currentFrameIndex}`);
  if (currentFrame) {
    currentFrame.style.border = '3px solid #4285f4';
    currentFrame.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // 更新播放器信息 - 移除对不存在元素的引用
  updatePlayer();
}

function playFrames() {
  if (playInterval) {
    clearInterval(playInterval);
  }
  
  const play = () => {
    if (!isPlaying) return;
    
    if (currentFrameIndex >= gifData.frames.length - 1) {
      currentFrameIndex = 0;
    } else {
      currentFrameIndex++;
    }
    
    updatePlayer();
    
    const delay = (gifData.frames[currentFrameIndex].delay || baseDelay) / playbackSpeed;
    setTimeout(play, delay);
  };
  
  play();
}

// 添加下载帧的功能
function downloadFrame(canvas, index) {
  const link = document.createElement('a');
  link.download = `frame-${index + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function openZoomView(frame, index) {
  const modal = document.getElementById('zoomModal');
  zoomCanvas = document.getElementById('zoomCanvas');
  zoomCtx = zoomCanvas.getContext('2d');
  
  // 设置初始大小为原始尺寸
  currentZoom = 1;
  zoomCanvas.width = frame.width;
  zoomCanvas.height = frame.height;
  
  // 保存原始图像数据用于缩放
  gifData.originalImageData = frame.imageData;
  
  // 绘制图像
  zoomCtx.imageSmoothingEnabled = false;
  zoomCtx.putImageData(frame.imageData, 0, 0);
  
  modal.classList.add('active');
  
  // 添加滚轮事件监听
  zoomCanvas.addEventListener('wheel', handleZoomWheel);
  // 添加键盘快捷键
  document.addEventListener('keydown', handleZoomKeyboard);
}

function closeModal() {
  const modal = document.getElementById('zoomModal');
  modal.classList.remove('active');
  document.removeEventListener('keydown', handleZoomKeyboard);
  // 移除滚轮事件监听
  zoomCanvas.removeEventListener('wheel', handleZoomWheel);
}

function adjustZoom(factor) {
  currentZoom *= factor;
  
  // 限制最大和最小缩放
  currentZoom = Math.min(Math.max(currentZoom, 0.1), 10);
  
  const frame = gifData.frames[currentFrameIndex];
  const newWidth = Math.round(frame.width * currentZoom);
  const newHeight = Math.round(frame.height * currentZoom);
  
  // 创建临时画布进行缩放
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  // 设置源画布尺寸为原始尺寸
  tempCanvas.width = frame.width;
  tempCanvas.height = frame.height;
  tempCtx.putImageData(gifData.originalImageData, 0, 0);
  
  // 设置目标画布尺寸为缩放后的尺寸
  zoomCanvas.width = newWidth;
  zoomCanvas.height = newHeight;
  
  // 清除画布
  zoomCtx.clearRect(0, 0, newWidth, newHeight);
  
  // 使用 drawImage 进行缩放
  zoomCtx.imageSmoothingEnabled = false;  // 保持像素清晰
  zoomCtx.drawImage(tempCanvas, 0, 0, frame.width, frame.height, 0, 0, newWidth, newHeight);
  
  // 更新缩放信息显示
  const zoomInfo = document.createElement('div');
  zoomInfo.style.position = 'absolute';
  zoomInfo.style.bottom = '60px';
  zoomInfo.style.right = '20px';
  zoomInfo.style.background = 'rgba(0, 0, 0, 0.7)';
  zoomInfo.style.color = 'white';
  zoomInfo.style.padding = '5px 10px';
  zoomInfo.style.borderRadius = '4px';
  zoomInfo.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
  
  // 移除旧的缩放信息
  const oldZoomInfo = document.querySelector('.zoom-info');
  if (oldZoomInfo) {
    oldZoomInfo.remove();
  }
  
  zoomInfo.className = 'zoom-info';
  document.querySelector('.modal-content').appendChild(zoomInfo);
}

function resetZoom() {
  currentZoom = 1;
  const frame = gifData.frames[currentFrameIndex];
  
  zoomCanvas.width = frame.width;
  zoomCanvas.height = frame.height;
  
  zoomCtx.imageSmoothingEnabled = false;
  zoomCtx.putImageData(gifData.originalImageData, 0, 0);
  
  // 更新缩放信息显示
  const zoomInfo = document.querySelector('.zoom-info');
  if (zoomInfo) {
    zoomInfo.textContent = '缩放: 100%';
  }
}

function handleZoomKeyboard(e) {
  switch(e.key) {
    case 'Escape':
      closeModal();
      break;
    case '+':
    case '=':
      adjustZoom(1.2);
      break;
    case '-':
      adjustZoom(0.8);
      break;
    case '0':
      resetZoom();
      break;
  }
}

// 添加滚轮缩放处理函数
function handleZoomWheel(e) {
    e.preventDefault();
    
    const modalContent = document.querySelector('.modal-content');
    const rect = zoomCanvas.getBoundingClientRect();
    
    // 获取鼠标在画布上的实际位置
    const mouseX = (e.clientX - rect.left) / currentZoom;
    const mouseY = (e.clientY - rect.top) / currentZoom;
    
    // 根据滚轮方向决定缩放方向
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = currentZoom * zoomFactor;
    
    // 限制缩放范围
    if (newZoom >= 0.1 && newZoom <= 10) {
        currentZoom = newZoom;
        
        const frame = gifData.frames[currentFrameIndex];
        const newWidth = Math.round(frame.width * currentZoom);
        const newHeight = Math.round(frame.height * currentZoom);
        
        // 创建临时画布
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = frame.width;
        tempCanvas.height = frame.height;
        tempCtx.putImageData(gifData.originalImageData, 0, 0);
        
        // 设置新的画布尺寸
        zoomCanvas.width = newWidth;
        zoomCanvas.height = newHeight;
        
        // 保持像素清晰
        zoomCtx.imageSmoothingEnabled = false;
        
        // 计算新的视口中心点
        const viewportCenterX = mouseX * currentZoom - e.clientX + rect.left;
        const viewportCenterY = mouseY * currentZoom - e.clientY + rect.top;
        
        // 绘制缩放后的图像
        zoomCtx.drawImage(tempCanvas, 0, 0, frame.width, frame.height, 0, 0, newWidth, newHeight);
        
        // 调整滚动位置，使鼠标位置保持在同一个图像点上
        modalContent.scrollLeft = viewportCenterX;
        modalContent.scrollTop = viewportCenterY;
        
        // 更新缩放信息显示
        updateZoomInfo();
    }
}

// 添加更新缩放信息的函数
function updateZoomInfo() {
    const zoomInfo = document.createElement('div');
    zoomInfo.style.position = 'absolute';
    zoomInfo.style.bottom = '60px';
    zoomInfo.style.right = '20px';
    zoomInfo.style.background = 'rgba(0, 0, 0, 0.7)';
    zoomInfo.style.color = 'white';
    zoomInfo.style.padding = '5px 10px';
    zoomInfo.style.borderRadius = '4px';
    zoomInfo.textContent = `缩放: ${Math.round(currentZoom * 100)}%`;
    
    // 移除旧的缩放信息
    const oldZoomInfo = document.querySelector('.zoom-info');
    if (oldZoomInfo) {
        oldZoomInfo.remove();
    }
    
    zoomInfo.className = 'zoom-info';
    document.querySelector('.modal-content').appendChild(zoomInfo);
}

// 添加预览区折叠功能
function togglePreview() {
  const container = document.getElementById('previewContainer');
  const toggle = document.getElementById('previewToggle');
  const framesContainer = document.getElementById('framesContainer');
  
  isPreviewCollapsed = !isPreviewCollapsed;
  
  if (isPreviewCollapsed) {
    container.classList.add('collapsed');
    toggle.textContent = '展开';
    framesContainer.style.marginRight = '60px';
  } else {
    container.classList.remove('collapsed');
    toggle.textContent = '收起';
    framesContainer.style.marginRight = '340px';
  }
}

// 添加预览更新函数
function updatePreview() {
  if (!gifData || !previewCanvas) return;
  
  const frame = gifData.frames[currentFrameIndex];
  
  // 设置预览画布尺寸
  previewCanvas.width = frame.width;
  previewCanvas.height = frame.height;
  
  // 绘制当前帧
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.putImageData(frame.imageData, 0, 0);
  
  // 更新预览信息
  document.getElementById('previewFrameNum').textContent = currentFrameIndex + 1;
  document.getElementById('previewTotalFrames').textContent = gifData.frames.length;
  document.getElementById('previewSize').textContent = `${frame.width}x${frame.height}`;
  document.getElementById('previewDelay').textContent = `${frame.delay}ms`;
}

function updatePlayer() {
  if (!gifData || !playerCanvas) return;
  
  const frame = gifData.frames[currentFrameIndex];
  
  // 绘制当前帧
  playerCanvas.width = frame.width;
  playerCanvas.height = frame.height;
  playerCtx.imageSmoothingEnabled = false;
  playerCtx.putImageData(frame.imageData, 0, 0);
  
  // 更新高亮显示
  updateFrameHighlight();
  
  // 更新进度条
  const progressFill = document.getElementById('progressFill');
  if (progressFill) {
    const progress = (currentFrameIndex / (gifData.frames.length - 1)) * 100;
    progressFill.style.width = `${progress}%`;
  }
  
  // 更新播放器信息 - 添加元素存在性检查
  const elements = {
    playerCurrentFrame: document.getElementById('playerCurrentFrame'),
    playerTotalFrames: document.getElementById('playerTotalFrames'),
    playerSize: document.getElementById('playerSize'),
    playerDelay: document.getElementById('playerDelay')
  };
  
  if (elements.playerCurrentFrame) {
    elements.playerCurrentFrame.textContent = currentFrameIndex + 1;
  }
  if (elements.playerTotalFrames) {
    elements.playerTotalFrames.textContent = gifData.frames.length;
  }
  if (elements.playerSize) {
    elements.playerSize.textContent = `${frame.width}×${frame.height}`;
  }
  if (elements.playerDelay) {
    elements.playerDelay.textContent = `${frame.delay}ms`;
  }
}

function updateFrameHighlight() {
    // 移除所有帧的高亮
    document.querySelectorAll('.frame-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 添加当前帧的高亮
    const currentFrame = document.getElementById(`frame-${currentFrameIndex}`);
    if (currentFrame) {
        currentFrame.classList.add('active');
        // 平滑滚动到当前帧
        currentFrame.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest'
        });
    }
} 