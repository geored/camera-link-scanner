class CameraLinkScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.overlay = document.getElementById('overlay');
        this.status = document.getElementById('status');
        this.scanBtn = document.getElementById('scanBtn');
        this.toggleCameraBtn = document.getElementById('toggleCamera');
        this.linksList = document.getElementById('linksList');
        this.linksPanel = document.getElementById('linksPanel');
        
        this.currentStream = null;
        this.facingMode = 'environment'; // Start with back camera
        this.isScanning = false;
        this.worker = null;
        this.detectedLinks = [];
        this.lastScanTime = 0;
        this.scanCooldown = 2000; // 2 seconds between scans
        
        this.init();
    }
    
    async init() {
        try {
            await this.initTesseract();
            await this.startCamera();
            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Error: ' + error.message, 'error');
        }
    }
    
    async initTesseract() {
        this.updateStatus('Loading OCR engine...', 'loading');
        this.worker = await Tesseract.createWorker('eng');
        await this.worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:/?#[]@!$&\'()*+,;=%-_~',
            tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
            preserve_interword_spaces: '1'
        });
    }
    
    async startCamera() {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            
            this.updateStatus('Starting camera...', 'loading');
            
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            this.video.onloadedmetadata = () => {
                this.updateStatus('Camera ready - Point at text with links', 'ready');
                this.scanBtn.disabled = false;
            };
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('Camera access denied or unavailable', 'error');
        }
    }
    
    setupEventListeners() {
        this.scanBtn.addEventListener('click', () => this.scanForLinks());
        this.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
        
        // Auto-scan with throttling
        setInterval(() => {
            const now = Date.now();
            if (!this.isScanning && (now - this.lastScanTime) > this.scanCooldown) {
                this.scanForLinks();
            }
        }, 1000);
    }
    
    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }
    
    async scanForLinks() {
        if (this.isScanning || !this.worker) return;
        
        this.isScanning = true;
        this.lastScanTime = Date.now();
        this.scanBtn.disabled = true;
        this.updateStatus('Scanning for links...', 'loading');
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Reduce canvas size for faster processing
            const scale = 0.5;
            canvas.width = this.video.videoWidth * scale;
            canvas.height = this.video.videoHeight * scale;
            
            // Enhance image for better OCR
            ctx.filter = 'contrast(1.2) brightness(1.1)';
            ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
            
            const { data } = await this.worker.recognize(canvas);
            const text = data.text;
            
            this.detectAndDisplayLinks(text, data.words, scale);
            
        } catch (error) {
            console.error('OCR error:', error);
            this.updateStatus('Scan failed: ' + error.message, 'error');
        } finally {
            this.isScanning = false;
            this.scanBtn.disabled = false;
            if (this.detectedLinks.length === 0) {
                this.updateStatus('No links detected - Point camera at text with URLs', 'ready');
            }
        }
    }
    
    detectAndDisplayLinks(text, words, canvasScale = 1) {
        // Clear previous markers and list
        this.overlay.innerHTML = '';
        this.linksList.innerHTML = '';
        this.detectedLinks = [];
        
        // Enhanced URL regex patterns
        const urlPatterns = [
            /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
            /www\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            /[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi
        ];
        
        const foundUrls = new Set();
        
        urlPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(url => {
                    // Clean up the URL
                    url = url.replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
                    if (url.length > 4 && this.isValidUrl(url)) {
                        foundUrls.add(url);
                    }
                });
            }
        });
        
        if (foundUrls.size === 0) {
            return;
        }
        
        const videoRect = this.video.getBoundingClientRect();
        const scaleX = videoRect.width / (this.video.videoWidth * canvasScale);
        const scaleY = videoRect.height / (this.video.videoHeight * canvasScale);
        
        foundUrls.forEach((url, index) => {
            this.detectedLinks.push(url);
            
            // Find words that are part of this URL
            const urlWords = this.findUrlWords(url, words);
            
            if (urlWords.length > 0) {
                // Create small precise markers
                urlWords.forEach(word => {
                    const marker = this.createPreciseMarker(
                        word.bbox.x0 * scaleX,
                        word.bbox.y0 * scaleY,
                        (word.bbox.x1 - word.bbox.x0) * scaleX,
                        (word.bbox.y1 - word.bbox.y0) * scaleY
                    );
                    this.overlay.appendChild(marker);
                });
            }
            
            // Add to links list
            this.addToLinksList(url, index);
        });
        
        if (this.detectedLinks.length > 0) {
            this.updateStatus(`Found ${this.detectedLinks.length} link(s) - Select from list`, 'ready');
            this.linksPanel.classList.add('show');
        } else {
            this.linksPanel.classList.remove('show');
        }
    }
    
    createPreciseMarker(x, y, width, height) {
        const marker = document.createElement('div');
        marker.className = 'precise-marker';
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        marker.style.width = `${width}px`;
        marker.style.height = `${height}px`;
        
        return marker;
    }
    
    findUrlWords(url, words) {
        const urlParts = url.toLowerCase().split(/[\/.:]/);
        return words.filter(word => {
            const wordText = word.text.toLowerCase();
            return urlParts.some(part => 
                part.length > 2 && (wordText.includes(part) || part.includes(wordText))
            ) && word.confidence > 60;
        });
    }
    
    isValidUrl(url) {
        // Check if it looks like a valid URL
        const hasValidTLD = /\.[a-zA-Z]{2,}/.test(url);
        const hasValidFormat = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}/.test(url.replace(/^https?:\/\//, '').replace(/^www\./, ''));
        const notTooShort = url.length >= 4;
        const notCommonWords = !['com.', 'org.', 'net.', 'edu.'].some(word => url.toLowerCase() === word);
        
        return hasValidTLD && hasValidFormat && notTooShort && notCommonWords;
    }
    
    addToLinksList(url, index) {
        const listItem = document.createElement('div');
        listItem.className = 'link-item';
        listItem.innerHTML = `
            <span class="link-number">${index + 1}</span>
            <span class="link-url">${this.truncateUrl(url)}</span>
        `;
        
        listItem.addEventListener('click', () => this.openLink(url));
        this.linksList.appendChild(listItem);
    }
    
    truncateUrl(url) {
        if (url.length <= 30) return url;
        return url.substring(0, 27) + '...';
    }
    
    formatUrl(url) {
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return url.startsWith('www.') ? `https://${url}` : `https://${url}`;
        }
        return url;
    }
    
    openLink(url) {
        const formattedUrl = this.formatUrl(url);
        
        // Confirm before opening
        if (confirm(`Open link?\n${formattedUrl}`)) {
            try {
                window.open(formattedUrl, '_blank', 'noopener,noreferrer');
                this.updateStatus(`Opened: ${formattedUrl}`, 'ready');
            } catch (error) {
                console.error('Error opening link:', error);
                this.updateStatus('Failed to open link', 'error');
            }
        }
    }
    
    updateStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CameraLinkScanner();
});

// Handle orientation changes on mobile
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        location.reload();
    }, 500);
});