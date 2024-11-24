class GifParser {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.frames = [];
    this.width = 0;
    this.height = 0;
  }

  async parseGIF(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.width = img.width;
        this.height = img.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // 使用 parseGIF 函数解析 GIF
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        
        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = new Uint8Array(xhr.response);
            let currentFrame = null;
            let globalColorTable = null;
            
            parseGIF(new Stream(data), {
              hdr: (header) => {
                this.width = header.width;
                this.height = header.height;
                if (header.gct) {
                  globalColorTable = header.gct;
                }
              },
              gce: (gce) => {
                currentFrame = {
                  delay: gce.delayTime * 10, // 转换为毫秒
                  disposalMethod: gce.disposalMethod,
                  transparencyIndex: gce.transparencyGiven ? gce.transparencyIndex : null
                };
              },
              img: (img) => {
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = this.width;
                frameCanvas.height = this.height;
                const frameCtx = frameCanvas.getContext('2d');
                
                // 使用颜色表将索引转换为 RGBA 数据
                const colorTable = img.lct || globalColorTable;
                const pixels = new Uint8ClampedArray(img.width * img.height * 4);
                
                for (let i = 0; i < img.pixels.length; i++) {
                  const index = img.pixels[i];
                  const color = colorTable[index];
                  const pos = i * 4;
                  
                  if (currentFrame && currentFrame.transparencyIndex === index) {
                    pixels[pos] = 0;
                    pixels[pos + 1] = 0;
                    pixels[pos + 2] = 0;
                    pixels[pos + 3] = 0;
                  } else {
                    pixels[pos] = color[0];     // R
                    pixels[pos + 1] = color[1]; // G
                    pixels[pos + 2] = color[2]; // B
                    pixels[pos + 3] = 255;      // A
                  }
                }
                
                // 创建图像数据
                const imageData = new ImageData(pixels, img.width, img.height);
                
                // 如果不是第一帧，复制前一帧的内容
                if (this.frames.length > 0) {
                  const lastFrame = this.frames[this.frames.length - 1];
                  frameCtx.putImageData(lastFrame.imageData, 0, 0);
                }
                
                // 绘制当前帧
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(imageData, 0, 0);
                
                frameCtx.drawImage(tempCanvas, img.leftPos, img.topPos);
                
                // 保存帧信息
                this.frames.push({
                  imageData: frameCtx.getImageData(0, 0, this.width, this.height),
                  width: this.width,
                  height: this.height,
                  delay: currentFrame ? currentFrame.delay : 100,
                  disposalMethod: currentFrame ? currentFrame.disposalMethod : 0
                });
              },
              eof: () => {
                resolve({ frames: this.frames });
              }
            });
          } else {
            reject(new Error('Failed to load GIF'));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error'));
        };
        
        xhr.send();
      };
      
      img.onerror = (e) => {
        console.error('Image load error:', e);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }
} 