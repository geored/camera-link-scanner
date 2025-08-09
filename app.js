class CameraLinkScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.overlay = document.getElementById('overlay');
        this.status = document.getElementById('status');
        this.scanBtn = document.getElementById('scanBtn');
        this.toggleCameraBtn = document.getElementById('toggleCamera');
        this.linksList = document.getElementById('linksList');
        this.linksPanel = document.getElementById('linksPanel');
        this.performanceInfo = document.getElementById('performanceInfo');
        
        this.currentStream = null;
        this.facingMode = 'environment'; // Start with back camera
        this.isScanning = false;
        this.worker = null;
        this.aiVision = new AIVisionProcessor();
        this.currentProvider = 'google';
        this.detectedLinks = []; // Current scan links
        this.linkHistory = []; // Persistent link memory
        this.maxHistorySize = 50; // Keep up to 50 links in memory
        this.displayLimit = 5; // Show only 5 most recent
        this.lastScanTime = 0;
        this.scanCooldown = 1500; // 1.5 seconds between scans
        this.processingCanvas = null;
        this.processingCtx = null;
        this.isProcessing = false;
        this.scanRegions = [];
        this.lastImageData = null;
        
        this.loadLinkHistory();
        
        this.init();
        this.updateLinksDisplay();
    }
    
    async init() {
        try {
            // Initialize AI vision system
            this.aiVision.loadApiKeys();
            this.currentProvider = localStorage.getItem('ai_preferred_provider') || 'google';
            
            // Initialize Tesseract as fallback
            await this.initTesseract();
            await this.startCamera();
            this.setupEventListeners();
            this.setupAIConfig();
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Error: ' + error.message, 'error');
        }
    }
    
    async initTesseract() {
        this.updateStatus('Loading OCR engine...', 'loading');
        // Use optimized worker setup
        this.worker = await Tesseract.createWorker('eng');
        
        // Preload additional optimizations
        await this.worker.loadLanguage('eng');
        await this.worker.initialize('eng');
        await this.worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:/?#[]@!$&\'()*+,;=%-_~',
            tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
            preserve_interword_spaces: '1',
            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
            tessedit_char_blacklist: '|\\`^{}"<>[]',
            load_system_dawg: '0',
            load_freq_dawg: '0',
            tessedit_enable_doc_dict: '0',
            classify_enable_learning: '0',
            textord_really_old_xheight: '1',
            textord_min_linesize: '2.5'
        });
        
        // Initialize processing canvas
        this.processingCanvas = document.createElement('canvas');
        this.processingCtx = this.processingCanvas.getContext('2d');
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
        
        // Add clear history button listener
        const clearHistoryBtn = document.getElementById('clearHistory');
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Clear all link history?')) {
                this.clearHistory();
            }
        });
        
        // Add config toggle listener
        const configToggle = document.getElementById('configToggle');
        const aiConfig = document.getElementById('aiConfig');
        configToggle.addEventListener('click', () => {
            aiConfig.classList.toggle('show');
        });
        
        // Smart auto-scan with region detection
        setInterval(() => {
            const now = Date.now();
            if (!this.isScanning && (now - this.lastScanTime) > this.scanCooldown) {
                this.smartScan();
            }
        }, 800); // More frequent checks
        
        // Add motion detection for faster scanning
        this.setupMotionDetection();
    }
    
    async toggleCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }
    
    async scanForLinks() {
        if (this.isScanning || this.isProcessing) return;
        
        this.isScanning = true;
        this.isProcessing = true;
        this.lastScanTime = Date.now();
        this.scanBtn.disabled = true;
        this.updateStatus(`Scanning with ${this.currentProvider.toUpperCase()}...`, 'loading');
        
        try {
            const processedImage = this.preprocessImage();
            let scanResult;
            
            if (this.currentProvider === 'tesseract') {
                // Use existing Tesseract implementation
                scanResult = await this.performOCR(processedImage);
                if (scanResult) {
                    this.detectAndDisplayLinks(scanResult.text, scanResult.words, processedImage.scale);
                }
            } else {
                // Use AI vision processing
                scanResult = await this.aiVision.processImage(processedImage.canvas, this.currentProvider);
                if (scanResult && scanResult.urls) {
                    this.processAIResults(scanResult);
                }
            }
            
        } catch (error) {
            console.error('AI Vision error:', error);
            this.updateStatus(`${this.currentProvider.toUpperCase()} failed: ${error.message}`, 'error');
            
            // Fallback to Tesseract if AI fails
            if (this.currentProvider !== 'tesseract') {
                this.updateStatus('Falling back to Tesseract...', 'loading');
                try {
                    const processedImage = this.preprocessImage();
                    const fallbackResult = await this.performOCR(processedImage);
                    if (fallbackResult) {
                        this.detectAndDisplayLinks(fallbackResult.text, fallbackResult.words, processedImage.scale);
                    }
                } catch (fallbackError) {
                    this.updateStatus('All recognition methods failed', 'error');
                }
            }
        } finally {
            this.isScanning = false;
            this.isProcessing = false;
            this.scanBtn.disabled = false;
            if (this.detectedLinks.length === 0) {
                this.updateStatus('No links detected - Point camera at text with URLs', 'ready');
            }
        }
    }
    
    preprocessImage() {
        const scale = 0.6; // Better balance between speed and accuracy
        const width = this.video.videoWidth * scale;
        const height = this.video.videoHeight * scale;
        
        this.processingCanvas.width = width;
        this.processingCanvas.height = height;
        
        const ctx = this.processingCtx;
        
        // Draw original image
        ctx.drawImage(this.video, 0, 0, width, height);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Apply image enhancement for better OCR
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale with better contrast
            const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Enhance contrast and brightness
            let enhanced = gray;
            enhanced = Math.min(255, Math.max(0, (enhanced - 128) * 1.3 + 128)); // Contrast
            enhanced = Math.min(255, enhanced + 20); // Brightness
            
            // Apply threshold for better text recognition
            enhanced = enhanced > 120 ? 255 : enhanced < 80 ? 0 : enhanced;
            
            data[i] = enhanced;
            data[i + 1] = enhanced;
            data[i + 2] = enhanced;
        }
        
        // Put enhanced image back
        ctx.putImageData(imageData, 0, 0);
        
        return {
            canvas: this.processingCanvas,
            scale: scale,
            width: width,
            height: height
        };
    }
    
    async performOCR(processedImage) {
        try {
            // Use optimized recognition with region-based processing
            const startTime = performance.now();
            
            const { data } = await this.worker.recognize(processedImage.canvas, {
                rectangle: { top: 0, left: 0, width: processedImage.width, height: processedImage.height }
            });
            
            const processingTime = performance.now() - startTime;
            console.log(`OCR processed in ${processingTime.toFixed(0)}ms`);
            
            // Update performance info
            this.updatePerformanceInfo(processingTime, data.confidence);
            
            // Filter and sort words by confidence
            const filteredWords = data.words
                .filter(word => word.confidence > 65)
                .sort((a, b) => b.confidence - a.confidence);
            
            return {
                text: data.text,
                words: filteredWords,
                confidence: data.confidence,
                processingTime: processingTime
            };
        } catch (error) {
            console.error('OCR processing error:', error);
            return null;
        }
    }
    
    setupMotionDetection() {
        let lastFrameData = null;
        let motionDetected = false;
        
        setInterval(() => {
            if (this.isScanning || !this.video.videoWidth) return;
            
            // Create small canvas for motion detection
            const motionCanvas = document.createElement('canvas');
            const motionCtx = motionCanvas.getContext('2d');
            motionCanvas.width = 160;
            motionCanvas.height = 120;
            
            motionCtx.drawImage(this.video, 0, 0, 160, 120);
            const currentFrameData = motionCtx.getImageData(0, 0, 160, 120).data;
            
            if (lastFrameData) {
                let diffSum = 0;
                for (let i = 0; i < currentFrameData.length; i += 4) {
                    const diff = Math.abs(currentFrameData[i] - lastFrameData[i]);
                    diffSum += diff;
                }
                
                const avgDiff = diffSum / (currentFrameData.length / 4);
                motionDetected = avgDiff > 10; // Motion threshold
                
                // If motion detected and camera is stable, scan faster
                if (motionDetected && this.scanCooldown > 1000) {
                    this.scanCooldown = 1000;
                } else if (!motionDetected) {
                    this.scanCooldown = 2000;
                }
            }
            
            lastFrameData = currentFrameData;
        }, 200);
    }
    
    async smartScan() {
        // Use region-based scanning for better performance
        if (this.detectTextRegions()) {
            await this.scanForLinks();
        }
    }
    
    detectTextRegions() {
        try {
            // Quick edge detection to find text-like regions
            const detectionCanvas = document.createElement('canvas');
            const detectionCtx = detectionCanvas.getContext('2d');
            detectionCanvas.width = 200;
            detectionCanvas.height = 150;
            
            detectionCtx.drawImage(this.video, 0, 0, 200, 150);
            const imageData = detectionCtx.getImageData(0, 0, 200, 150);
            const data = imageData.data;
            
            let edgeCount = 0;
            for (let i = 0; i < data.length - 4; i += 4) {
                const curr = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const next = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
                if (Math.abs(curr - next) > 30) edgeCount++;
            }
            
            // If we detect enough edges (likely text), proceed with scan
            return edgeCount > 50;
        } catch (error) {
            return true; // Fallback to always scan if detection fails
        }
    }
    
    processAIResults(result) {
        // Clear previous markers
        this.overlay.innerHTML = '';
        this.detectedLinks = [];
        
        if (result.urls && result.urls.length > 0) {
            result.urls.forEach(urlObj => {
                const url = typeof urlObj === 'string' ? urlObj : urlObj.url;
                if (this.aiVision.isValidUrl(url)) {
                    this.detectedLinks.push(url);
                    this.addToHistory(url);
                }
            });
            
            // Update the links display
            this.updateLinksDisplay();
            
            // Update performance info
            this.updatePerformanceInfo(result.processingTime, result.confidence);
            
            if (this.linkHistory.length > 0) {
                this.updateStatus(`Found ${this.detectedLinks.length} new, ${this.linkHistory.length} total links`, 'ready');
                this.linksPanel.classList.add('show');
            }
        }
    }
    
    setupAIConfig() {
        // Provider selection
        const providerBtns = document.querySelectorAll('.provider-btn');
        providerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.dataset.provider;
                this.switchProvider(provider);
                
                // Update UI
                providerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show/hide config sections
                document.getElementById('googleConfig').style.display = provider === 'google' ? 'block' : 'none';
                document.getElementById('openaiConfig').style.display = provider === 'openai' ? 'block' : 'none';
                document.getElementById('tesseractConfig').style.display = provider === 'tesseract' ? 'block' : 'none';
            });
        });
        
        // API key inputs
        const googleKeyInput = document.getElementById('googleApiKey');
        const openaiKeyInput = document.getElementById('openaiApiKey');
        
        googleKeyInput.addEventListener('input', (e) => {
            this.aiVision.setApiKey('google', e.target.value);
        });
        
        openaiKeyInput.addEventListener('input', (e) => {
            this.aiVision.setApiKey('openai', e.target.value);
        });
        
        // Load saved keys
        googleKeyInput.value = localStorage.getItem('ai_google_key') || '';
        openaiKeyInput.value = localStorage.getItem('ai_openai_key') || '';
        
        // Set initial provider UI
        this.switchProvider(this.currentProvider);
    }
    
    switchProvider(provider) {
        this.currentProvider = provider;
        this.aiVision.setPreferredProvider(provider);
        
        // Update status
        this.updateStatus(`Switched to ${provider.toUpperCase()} vision`, 'ready');
        
        // Close config panel
        setTimeout(() => {
            document.getElementById('aiConfig').classList.remove('show');
        }, 1000);
    }
    
    updatePerformanceInfo(processingTime, confidence) {
        const avgConfidence = confidence ? confidence.toFixed(0) : 'N/A';
        const timeColor = processingTime < 1000 ? '#00ff00' : processingTime < 2000 ? '#ffaa00' : '#ff0000';
        
        this.performanceInfo.innerHTML = `
            <div>${this.currentProvider.toUpperCase()}: <span style="color: ${timeColor}">${processingTime.toFixed(0)}ms</span></div>
            <div>Conf: <span style="color: #00ff00">${avgConfidence}%</span></div>
        `;
    }
    
    detectAndDisplayLinks(text, words, canvasScale = 1) {
        // Clear previous markers
        this.overlay.innerHTML = '';
        this.detectedLinks = [];
        
        // Ultra-precise URL regex patterns
        const urlPatterns = [
            // Full HTTP/HTTPS URLs
            /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?/gi,
            // www domains
            /www\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)++[a-zA-Z]{2,6}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            // Domain.com patterns
            /(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)++(?:com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|museum|[a-z]{2})(?:\/[^\s<>"{}|\\^`\[\]]*)?\b/gi,
            // Social media and common patterns
            /(?:youtube\.com|youtu\.be|twitter\.com|facebook\.com|instagram\.com|linkedin\.com|github\.com|reddit\.com)\/[^\s<>"{}|\\^`\[\]]*/gi,
            // IP addresses with ports
            /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::[0-9]+)?(?:\/[^\s]*)?/gi
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
            
            // Add to persistent history (avoid duplicates)
            this.addToHistory(url);
            
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
        });
        
        // Update the links display
        this.updateLinksDisplay();
        
        if (this.linkHistory.length > 0) {
            this.updateStatus(`${this.detectedLinks.length} new, ${this.linkHistory.length} total links`, 'ready');
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
        const urlLower = url.toLowerCase();
        const urlParts = urlLower.split(/[\/.:#?&=]/).filter(part => part.length > 2);
        
        return words.filter(word => {
            const wordText = word.text.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Skip if confidence is too low
            if (word.confidence < 75) return false;
            
            // Direct match
            if (urlLower.includes(wordText) || wordText.length > 3 && urlLower.includes(wordText)) {
                return true;
            }
            
            // Partial match with URL parts
            return urlParts.some(part => {
                if (part.length < 3) return false;
                
                // Exact match
                if (part === wordText) return true;
                
                // Substring match (both directions)
                if (part.length > 4 && wordText.length > 4) {
                    return part.includes(wordText) || wordText.includes(part);
                }
                
                return false;
            });
        });
    }
    
    isValidUrl(url) {
        // Enhanced URL validation
        const cleanUrl = url.toLowerCase().trim();
        
        // Check minimum length
        if (cleanUrl.length < 4) return false;
        
        // Remove protocol for validation
        const withoutProtocol = cleanUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
        
        // Must have valid TLD
        const validTLDs = /\.(com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|museum|[a-z]{2})(?:\/|$)/;
        if (!validTLDs.test(withoutProtocol)) return false;
        
        // Must have valid domain structure
        const domainParts = withoutProtocol.split('/')[0].split('.');
        if (domainParts.length < 2) return false;
        
        // Each domain part should be valid
        for (const part of domainParts) {
            if (part.length === 0 || part.startsWith('-') || part.endsWith('-')) return false;
            if (!/^[a-zA-Z0-9-]+$/.test(part)) return false;
        }
        
        // Exclude common false positives
        const falsePositives = ['example.com', 'test.com', 'localhost', 'domain.com', 'website.com'];
        if (falsePositives.some(fp => withoutProtocol.startsWith(fp))) return false;
        
        // Must not be just punctuation
        if (!/[a-zA-Z0-9]/.test(withoutProtocol)) return false;
        
        return true;
    }
    
    addToHistory(url) {
        const formattedUrl = this.formatUrl(url);
        
        // Remove if already exists (move to top)
        this.linkHistory = this.linkHistory.filter(item => item.url !== formattedUrl);
        
        // Add to beginning with timestamp
        this.linkHistory.unshift({
            url: formattedUrl,
            timestamp: Date.now(),
            isNew: true
        });
        
        // Limit history size
        if (this.linkHistory.length > this.maxHistorySize) {
            this.linkHistory = this.linkHistory.slice(0, this.maxHistorySize);
        }
        
        // Save to localStorage
        this.saveLinkHistory();
    }
    
    updateLinksDisplay() {
        this.linksList.innerHTML = '';
        
        if (this.linkHistory.length === 0) {
            this.linksPanel.classList.remove('show');
            return;
        }
        
        // Show only the most recent links up to display limit
        const recentLinks = this.linkHistory.slice(0, this.displayLimit);
        
        recentLinks.forEach((linkItem, index) => {
            const listElement = document.createElement('div');
            listElement.className = `link-item ${linkItem.isNew ? 'new-link' : ''}`;
            
            const timeAgo = this.getTimeAgo(linkItem.timestamp);
            
            listElement.innerHTML = `
                <span class="link-number">${index + 1}</span>
                <div class="link-content">
                    <span class="link-url">${this.truncateUrl(linkItem.url)}</span>
                    <span class="link-time">${timeAgo}</span>
                </div>
                <button class="remove-link" data-url="${linkItem.url}">×</button>
            `;
            
            // Add click handler for link
            listElement.querySelector('.link-content').addEventListener('click', () => {
                this.openLink(linkItem.url);
                this.markAsUsed(linkItem.url);
            });
            
            // Add remove handler
            listElement.querySelector('.remove-link').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFromHistory(linkItem.url);
            });
            
            this.linksList.appendChild(listElement);
            
            // Clear new flag after a moment
            if (linkItem.isNew) {
                setTimeout(() => {
                    linkItem.isNew = false;
                    listElement.classList.remove('new-link');
                }, 2000);
            }
        });
        
        this.linksPanel.classList.add('show');
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
        
        try {
            window.open(formattedUrl, '_blank', 'noopener,noreferrer');
            this.updateStatus(`Opened: ${this.truncateUrl(formattedUrl)}`, 'ready');
            
            // Add haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        } catch (error) {
            console.error('Error opening link:', error);
            this.updateStatus('Failed to open link', 'error');
        }
    }
    
    markAsUsed(url) {
        const linkItem = this.linkHistory.find(item => item.url === url);
        if (linkItem) {
            linkItem.lastUsed = Date.now();
            this.saveLinkHistory();
        }
    }
    
    removeFromHistory(url) {
        this.linkHistory = this.linkHistory.filter(item => item.url !== url);
        this.saveLinkHistory();
        this.updateLinksDisplay();
        
        // Add haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(30);
        }
    }
    
    clearHistory() {
        this.linkHistory = [];
        this.saveLinkHistory();
        this.updateLinksDisplay();
    }
    
    loadLinkHistory() {
        try {
            const saved = localStorage.getItem('linkHistory');
            if (saved) {
                this.linkHistory = JSON.parse(saved);
                // Clean old links (older than 7 days)
                const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                this.linkHistory = this.linkHistory.filter(item => item.timestamp > weekAgo);
            }
        } catch (error) {
            console.error('Failed to load link history:', error);
            this.linkHistory = [];
        }
    }
    
    saveLinkHistory() {
        try {
            localStorage.setItem('linkHistory', JSON.stringify(this.linkHistory));
        } catch (error) {
            console.error('Failed to save link history:', error);
        }
    }
    
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
        return `${Math.floor(diff / 86400000)}d`;
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