console.log('Content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  
  if (request.action === 'findGifs') {
    const images = Array.from(document.getElementsByTagName('img'));
    console.log('Found images:', images.length);
    
    const gifImages = images.filter(img => {
      const src = img.src.toLowerCase();
      return src.endsWith('.gif') || src.includes('.gif?');
    });
    
    console.log('Found GIF images:', gifImages);
    
    if (gifImages.length > 0) {
      console.log('Sending GIF URL:', gifImages[0].src);
      sendResponse({ gifUrl: gifImages[0].src });
    } else {
      console.log('No GIF images found');
      sendResponse({ gifUrl: null });
    }
  }
  return true;
}); 