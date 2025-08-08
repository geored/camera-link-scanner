class CameraLinkScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.overlay = document.getElementById('overlay');
        this.status = document.getElementById('status');
        this.scanBtn = document.getElementById('scanBtn');
        this.toggleCameraBtn = document.getElementById('toggleCamera');
        
        this.currentStream = null;
        this.facingMode = 'environment'; // Start with back camera
        this.isScanning = false;
        this.worker = null;
        this.detectedLinks = [];
        
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
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:/?#[]@!$&\'()*+,;=%-_~'
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
        
        // Auto-scan every 3 seconds when not manually scanning
        setInterval(() => {
            if (!this.isScanning) {
                this.scanForLinks();
            }
        }, 3000);
    }
    
    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }
    
    async scanForLinks() {
        if (this.isScanning || !this.worker) return;
        
        this.isScanning = true;
        this.scanBtn.disabled = true;
        this.updateStatus('Scanning for links...', 'loading');
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            ctx.drawImage(this.video, 0, 0);
            
            const { data } = await this.worker.recognize(canvas);
            const text = data.text;
            
            this.detectAndDisplayLinks(text, data.words);
            
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
    
    detectAndDisplayLinks(text, words) {
        // Clear previous markers
        this.overlay.innerHTML = '';
        this.detectedLinks = [];
        
        // Enhanced URL regex pattern
        const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
        const matches = text.match(urlPattern);
        
        if (!matches) {
            return;
        }
        
        const videoRect = this.video.getBoundingClientRect();
        const scaleX = videoRect.width / this.video.videoWidth;
        const scaleY = videoRect.height / this.video.videoHeight;
        
        matches.forEach((url, index) => {
            // Find the word positions that match this URL
            const urlWords = words.filter(word => 
                url.toLowerCase().includes(word.text.toLowerCase()) || 
                word.text.toLowerCase().includes(url.toLowerCase())
            );
            
            if (urlWords.length > 0) {
                // Calculate bounding box for the entire URL
                const minX = Math.min(...urlWords.map(w => w.bbox.x0));
                const minY = Math.min(...urlWords.map(w => w.bbox.y0));
                const maxX = Math.max(...urlWords.map(w => w.bbox.x1));
                const maxY = Math.max(...urlWords.map(w => w.bbox.y1));
                
                const marker = this.createLinkMarker(
                    url,
                    minX * scaleX,
                    minY * scaleY,
                    (maxX - minX) * scaleX,
                    (maxY - minY) * scaleY
                );
                
                this.overlay.appendChild(marker);
                this.detectedLinks.push(url);
            }
        });
        
        if (this.detectedLinks.length > 0) {
            this.updateStatus(`Found ${this.detectedLinks.length} link(s) - Tap to open`, 'ready');
        }
    }
    
    createLinkMarker(url, x, y, width, height) {
        const marker = document.createElement('div');
        marker.className = 'link-marker';
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        marker.style.width = `${width}px`;
        marker.style.height = `${height}px`;
        
        const linkText = document.createElement('div');
        linkText.className = 'link-text';
        linkText.textContent = this.formatUrl(url);
        marker.appendChild(linkText);
        
        marker.addEventListener('click', () => this.openLink(url));
        
        return marker;
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