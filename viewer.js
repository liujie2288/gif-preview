let gifData = null;
let currentFrameIndex = 0;
let isPlaying = false;
let playInterval = null;

// 添加播放器相关变量
let playerCanvas = null;
let playerCtx = null;
let playbackSpeed = 1;
let baseDelay = 100;

document.addEventListener('DOMContentLoaded', () => {
  // 初始化播放器
  playerCanvas = document.getElementById('playerCanvas');
  playerCtx = playerCanvas.getContext('2d');
  
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

  // 播放速度控制
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

  // 初始化控制栏位置
  initControlsPosition();
  
  // 添加控制区拖动功能
  initDraggableControls();
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
  });
}

function createFrameElement(frameData, index) {
    const frameDiv = document.createElement('div');
    frameDiv.className = 'frame-item';
    frameDiv.id = `frame-${index}`;
    
    // 修改点击事件处理
    frameDiv.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        
        // 更新当前帧索引
        currentFrameIndex = index;
        
        // 更新播放器显示
        updatePlayer();
        
        // 如果正在播放，暂停播放
        if (isPlaying) {
            const playBtn = document.getElementById('playerPlay');
            const pauseBtn = document.getElementById('playerPause');
            isPlaying = false;
            if (playInterval) {
                clearInterval(playInterval);
            }
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'inline-flex';
        }
        
        // 高亮当前帧
        updateFrameHighlight();
    });
    
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
    // 清除现有的定时器
    if (playInterval) {
        clearTimeout(playInterval);
        playInterval = null;
    }
    
    const play = () => {
        if (!isPlaying) return;
        
        // 更新当前帧
        if (currentFrameIndex >= gifData.frames.length - 1) {
            currentFrameIndex = 0;
        } else {
            currentFrameIndex++;
        }
        
        updatePlayer();
        
        // 获取当前帧的延迟时间
        const currentDelay = gifData.frames[currentFrameIndex].delay || baseDelay;
        // 根据播放速度调整延迟时间
        const adjustedDelay = Math.max(20, currentDelay / playbackSpeed); // 设置最小延迟为20ms
        
        // 设置下一帧的定时器
        playInterval = setTimeout(play, adjustedDelay);
    };
    
    // 立即开始播放
    play();
}

// 添加下载帧的功能
function downloadFrame(canvas, index) {
  const link = document.createElement('a');
  link.download = `frame-${index + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
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

// 优化帧高亮和滚动
function updateFrameHighlight() {
    document.querySelectorAll('.frame-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const currentFrame = document.getElementById(`frame-${currentFrameIndex}`);
    if (currentFrame) {
        currentFrame.classList.add('active');
        // 平滑滚动到当前帧，确保在视野中居中
        currentFrame.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
}

// 修改初始化控制栏位置的函数
function initControlsPosition() {
    const controls = document.querySelector('.player-controls');
    const playerContainer = document.querySelector('.player-container');
    
    if (controls && playerContainer) {
        // 重置之前可能设置的样式
        controls.style.transform = 'translateX(-50%)';
        controls.style.left = '50%';
        controls.style.bottom = '20px';
        
        // 清除可能存在的绝对位置
        controls.style.position = 'absolute';
    }
}

function initDraggableControls() {
    const controls = document.querySelector('.player-controls');
    const dragHandle = document.querySelector('.drag-handle');
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialBottom;

    dragHandle.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);

    function startDragging(e) {
        e.preventDefault();
        
        const controls = document.querySelector('.player-controls');
        isDragging = true;
        
        // 获取当前控件的位置
        const rect = controls.getBoundingClientRect();
        
        // 如果控件还在初始位置（居中）
        if (controls.style.transform === 'translateX(-50%)') {
            // 计算实际的左边距
            const left = rect.left;
            const bottom = window.innerHeight - rect.bottom;
            
            // 移除居中定位，切换到绝对定位
            controls.style.transform = 'none';
            controls.style.left = `${left}px`;
            controls.style.bottom = `${bottom}px`;
            
            // 更新初始位置
            initialLeft = left;
            initialBottom = bottom;
        } else {
            initialLeft = parseInt(controls.style.left);
            initialBottom = parseInt(controls.style.bottom);
        }
        
        // 记录起始鼠标位置
        startX = e.clientX;
        startY = e.clientY;
        
        // 添加拖动时的视觉反馈
        dragHandle.style.background = 'rgba(255, 255, 255, 0.5)';
    }

    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        // 计算移动距离
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // 计算新位置
        let newLeft = initialLeft + deltaX;
        let newBottom = initialBottom - deltaY;
        
        // 限制范围
        const maxLeft = window.innerWidth - controls.offsetWidth;
        const maxBottom = window.innerHeight - controls.offsetHeight;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newBottom = Math.max(0, Math.min(newBottom, maxBottom));
        
        // 应用新位置
        controls.style.left = `${newLeft}px`;
        controls.style.bottom = `${newBottom}px`;
    }

    function stopDragging() {
        if (isDragging) {
            isDragging = false;
            dragHandle.style.background = 'rgba(255, 255, 255, 0.3)';
        }
    }
} 