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
        this.selectionOverlay = document.getElementById('selectionOverlay');
        this.selectionBox = document.getElementById('selectionBox');
        this.selectRegionBtn = document.getElementById('selectRegionBtn');
        this.cancelRegionBtn = document.getElementById('cancelRegionBtn');
        
        this.currentStream = null;
        this.facingMode = 'environment'; // Start with back camera
        this.isScanning = false;
        this.worker = null;
        this.aiVision = new AIVisionProcessor();
        this.enhancedOCR = new EnhancedOCRProcessor();
        this.transformersOCR = new TransformersOCRProcessor();
        this.azureOCR = new AzureOCRProcessor();
        this.ollamaOCR = new OllamaOCRProcessor();
        this.currentProvider = 'tesseract';
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
            console.log('Starting app initialization...');
            
            // Initialize AI vision system
            console.log('Initializing AI vision...');
            this.aiVision.loadApiKeys();
            this.azureOCR.loadApiKey();
            this.ollamaOCR.loadConfig();
            this.currentProvider = localStorage.getItem('ai_preferred_provider') || 'tesseract';
            
            // Setup event listeners first
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            this.setupAIConfig();
            
            // Initialize Tesseract as fallback
            console.log('Initializing Tesseract...');
            await this.initTesseract();
            
            // Start camera last
            console.log('Starting camera...');
            await this.startCamera();
            
            console.log('App initialization complete');
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
        
        // Initialize processing canvas with performance optimization
        this.processingCanvas = document.createElement('canvas');
        this.processingCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true });
    }
    
    async startCamera() {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            
            this.updateStatus('Starting camera...', 'loading');
            console.log('Requesting camera access...');
            
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            console.log('Camera stream assigned to video element');
            
            this.video.onloadedmetadata = () => {
                console.log('Video metadata loaded, camera ready');
                this.updateStatus(`Camera ready - Using ${this.currentProvider.toUpperCase()}`, 'ready');
                this.scanBtn.disabled = false;
            };
            
            // Add error handler for video element
            this.video.onerror = (e) => {
                console.error('Video element error:', e);
                this.updateStatus('Video playback error', 'error');
            };
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus(`Camera error: ${error.message}`, 'error');
            
            // Try fallback constraints
            if (error.name === 'OverconstrainedError') {
                console.log('Trying fallback camera constraints...');
                try {
                    const fallbackConstraints = { video: true };
                    this.currentStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                    this.video.srcObject = this.currentStream;
                    this.updateStatus('Camera ready (fallback mode)', 'ready');
                    this.scanBtn.disabled = false;
                } catch (fallbackError) {
                    console.error('Fallback camera error:', fallbackError);
                    this.updateStatus('Camera access failed', 'error');
                }
            }
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
        
        // Region selection event listeners
        this.selectRegionBtn.addEventListener('click', () => this.startRegionSelection());
        this.cancelRegionBtn.addEventListener('click', () => this.cancelRegionSelection());
        
        // Smart auto-scan with region detection
        setInterval(() => {
            const now = Date.now();
            if (!this.isScanning && (now - this.lastScanTime) > this.scanCooldown) {
                this.smartScan();
            }
        }, 800); // More frequent checks
        
        // Add motion detection for faster scanning
        this.setupMotionDetection();
        
        // Setup region selection interaction
        this.setupRegionSelection();
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
            } else if (this.currentProvider === 'enhanced') {
                // Use Enhanced OCR processing
                scanResult = await this.enhancedOCR.processImage(processedImage.canvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'enhanced'
                    });
                }
            } else if (this.currentProvider === 'transformers') {
                // Use Transformers.js TrOCR
                scanResult = await this.transformersOCR.processImage(processedImage.canvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'transformers'
                    });
                }
            } else if (this.currentProvider === 'azure') {
                // Use Azure Computer Vision
                scanResult = await this.azureOCR.processImage(processedImage.canvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'azure'
                    });
                }
            } else if (this.currentProvider === 'ollama') {
                // Use Ollama local vision model
                scanResult = await this.ollamaOCR.processImage(processedImage.canvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'ollama'
                    });
                }
            } else {
                // Use AI vision processing (Google/OpenAI)
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
        
        console.log('Processing AI results:', result);
        
        // Update performance info regardless of whether URLs were found
        this.updatePerformanceInfo(result.processingTime, result.confidence);
        
        if (result.urls && result.urls.length > 0) {
            result.urls.forEach(urlObj => {
                const url = typeof urlObj === 'string' ? urlObj : urlObj.url;
                if (this.aiVision.isValidUrl(url)) {
                    this.detectedLinks.push(url);
                    this.addToHistory(url);
                }
            });
            
            console.log('Detected links:', this.detectedLinks);
            
            // Update the links display
            this.updateLinksDisplay();
            
            if (this.linkHistory.length > 0) {
                this.updateStatus(`Found ${this.detectedLinks.length} new, ${this.linkHistory.length} total links`, 'ready');
                this.linksPanel.classList.add('show');
            } else {
                this.updateStatus('No links detected in current scan', 'ready');
            }
        } else {
            // No URLs found, but API call was successful
            console.log('No URLs detected in image');
            this.updateStatus('No links detected - Point camera at text with URLs', 'ready');
            this.updateLinksDisplay(); // This will show existing history if any
        }
    }
    
    setupAIConfig() {
        try {
            // Provider selection
            const providerBtns = document.querySelectorAll('.provider-btn');
            if (providerBtns.length === 0) {
                console.warn('Provider buttons not found, AI config not available');
                return;
            }
            
            providerBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const provider = btn.dataset.provider;
                    this.switchProvider(provider);
                    
                    // Update UI
                    providerBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Show/hide config sections
                    const googleConfig = document.getElementById('googleConfig');
                    const openaiConfig = document.getElementById('openaiConfig');
                    const enhancedConfig = document.getElementById('enhancedConfig');
                    const tesseractConfig = document.getElementById('tesseractConfig');
                    const transformersConfig = document.getElementById('transformersConfig');
                    const azureConfig = document.getElementById('azureConfig');
                    const ollamaConfig = document.getElementById('ollamaConfig');
                    
                    // Hide all configs first
                    [googleConfig, openaiConfig, enhancedConfig, tesseractConfig, transformersConfig, azureConfig, ollamaConfig].forEach(config => {
                        if (config) config.style.display = 'none';
                    });
                    
                    // Show selected config
                    if (googleConfig && provider === 'google') googleConfig.style.display = 'block';
                    if (openaiConfig && provider === 'openai') openaiConfig.style.display = 'block';
                    if (enhancedConfig && provider === 'enhanced') enhancedConfig.style.display = 'block';
                    if (tesseractConfig && provider === 'tesseract') tesseractConfig.style.display = 'block';
                    if (transformersConfig && provider === 'transformers') transformersConfig.style.display = 'block';
                    if (azureConfig && provider === 'azure') azureConfig.style.display = 'block';
                    if (ollamaConfig && provider === 'ollama') ollamaConfig.style.display = 'block';
                });
            });
            
            // API key inputs
            const googleKeyInput = document.getElementById('googleApiKey');
            const openaiKeyInput = document.getElementById('openaiApiKey');
            const azureKeyInput = document.getElementById('azureApiKey');
            const azureEndpointInput = document.getElementById('azureEndpoint');
            const ollamaEndpointInput = document.getElementById('ollamaEndpoint');
            const ollamaModelInput = document.getElementById('ollamaModel');
            
            if (googleKeyInput) {
                googleKeyInput.addEventListener('input', (e) => {
                    this.aiVision.setApiKey('google', e.target.value);
                });
                googleKeyInput.value = localStorage.getItem('ai_google_key') || '';
            }
            
            if (openaiKeyInput) {
                openaiKeyInput.addEventListener('input', (e) => {
                    this.aiVision.setApiKey('openai', e.target.value);
                });
                openaiKeyInput.value = localStorage.getItem('ai_openai_key') || '';
            }
            
            if (azureKeyInput) {
                azureKeyInput.addEventListener('input', (e) => {
                    const endpoint = azureEndpointInput ? azureEndpointInput.value : null;
                    this.azureOCR.setApiKey(e.target.value, endpoint);
                });
                azureKeyInput.value = localStorage.getItem('azure_api_key') || '';
            }
            
            if (azureEndpointInput) {
                azureEndpointInput.addEventListener('input', (e) => {
                    const apiKey = azureKeyInput ? azureKeyInput.value : '';
                    this.azureOCR.setApiKey(apiKey, e.target.value);
                });
                azureEndpointInput.value = localStorage.getItem('azure_endpoint') || '';
            }
            
            if (ollamaEndpointInput) {
                ollamaEndpointInput.addEventListener('input', (e) => {
                    const model = ollamaModelInput ? ollamaModelInput.value : 'llava:7b';
                    this.ollamaOCR.setConfig(e.target.value, model);
                });
                ollamaEndpointInput.value = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434';
            }
            
            if (ollamaModelInput) {
                ollamaModelInput.addEventListener('input', (e) => {
                    const endpoint = ollamaEndpointInput ? ollamaEndpointInput.value : 'http://localhost:11434';
                    this.ollamaOCR.setConfig(endpoint, e.target.value);
                });
                ollamaModelInput.value = localStorage.getItem('ollama_model') || 'llava:7b';
            }
            
            // Set initial provider UI
            this.setInitialProvider();
        } catch (error) {
            console.error('Error setting up AI config:', error);
        }
    }
    
    setInitialProvider() {
        const providerBtns = document.querySelectorAll('.provider-btn');
        providerBtns.forEach(btn => {
            if (btn.dataset.provider === this.currentProvider) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show correct config section
        const configs = ['googleConfig', 'openaiConfig', 'enhancedConfig', 'tesseractConfig', 'transformersConfig', 'azureConfig', 'ollamaConfig'];
        configs.forEach(configId => {
            const config = document.getElementById(configId);
            if (config) {
                const provider = configId.replace('Config', '');
                config.style.display = this.currentProvider === provider ? 'block' : 'none';
            }
        });
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
        
        console.log('OCR detected text:', text);
        console.log('OCR confidence:', words ? words.map(w => `${w.text}(${w.confidence})`).join(' ') : 'N/A');
        
        // Enhanced URL regex patterns for better detection
        const urlPatterns = [
            // Full HTTP/HTTPS URLs
            /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
            // www domains (enhanced)
            /www\.[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            // Domain.extension patterns (enhanced for Czech domains)
            /[a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:cz|com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|museum|[a-z]{2,4})(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            // OCR-friendly patterns with spaces
            /[a-zA-Z0-9-]+\s*\.\s*[a-zA-Z0-9-]+\s*\.\s*[a-zA-Z]{2,4}/gi,
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
                    url = url.replace(/\s+/g, ''); // Remove spaces (common OCR issue)
                    url = url.toLowerCase(); // Normalize case
                    
                    console.log('Regular OCR found potential URL:', url);
                    
                    if (url.length > 4 && this.isValidUrlImproved(url)) {
                        foundUrls.add(url);
                        console.log('Regular OCR valid URL added:', url);
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
    
    extractUrlsFromText(text) {
        console.log('Extracting URLs from text:', text);
        
        const urlPatterns = [
            // Full HTTP/HTTPS URLs
            /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
            // www domains (enhanced for Czech domains)
            /www\.[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            // Domain.extension patterns (enhanced for Czech .cz domains)
            /[a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:cz|com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|museum|[a-z]{2,4})(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            // Specific patterns for fragmented text (common in OCR)
            /[a-zA-Z0-9-]+\s*\.\s*[a-zA-Z0-9-]+\s*\.\s*[a-zA-Z]{2,4}/gi,
            // Pattern for "koureni-zabiji.cz" type domains
            /[a-zA-Z0-9-]+\s*[\.-]\s*[a-zA-Z0-9-]+\s*[\.-]\s*[a-zA-Z]{2,4}/gi
        ];

        const foundUrls = new Set();
        
        urlPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(url => {
                    // Clean up the URL
                    url = url.replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
                    url = url.replace(/\s+/g, ''); // Remove spaces (common OCR issue)
                    url = url.toLowerCase(); // Normalize case
                    
                    console.log('Found potential URL:', url);
                    
                    if (this.isValidUrlImproved(url)) {
                        foundUrls.add(url);
                        console.log('Valid URL added:', url);
                    }
                });
            }
        });

        console.log('Final URLs found:', Array.from(foundUrls));
        return Array.from(foundUrls).map(url => ({ url, confidence: 90 }));
    }
    
    isValidUrlImproved(url) {
        const cleanUrl = url.toLowerCase().trim();
        console.log('Validating URL:', cleanUrl);
        
        if (cleanUrl.length < 4) {
            console.log('URL too short');
            return false;
        }
        
        // Enhanced TLD validation including Czech domains
        const validTLDs = /\.(cz|com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|museum|[a-z]{2,4})(\.|\/|$)/;
        if (!validTLDs.test(cleanUrl)) {
            console.log('Invalid TLD');
            return false;
        }
        
        // Check for valid domain structure
        const withoutProtocol = cleanUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
        const domainPart = withoutProtocol.split('/')[0];
        
        // Must have at least one dot
        if (!domainPart.includes('.')) {
            console.log('No dot in domain');
            return false;
        }
        
        // Split by dots to check domain parts
        const parts = domainPart.split('.');
        if (parts.length < 2) {
            console.log('Less than 2 domain parts');
            return false;
        }
        
        // Each part should be valid
        for (const part of parts) {
            if (part.length === 0) {
                console.log('Empty domain part');
                return false;
            }
            // Allow hyphens in domain names (like koureni-zabiji)
            if (!/^[a-zA-Z0-9-]+$/.test(part)) {
                console.log('Invalid characters in domain part:', part);
                return false;
            }
        }
        
        console.log('URL is valid');
        return true;
    }

    isValidUrl(url) {
        const cleanUrl = url.toLowerCase().trim();
        if (cleanUrl.length < 4) return false;
        
        const validTLDs = /\.(com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|[a-z]{2})(\.|\/|$)/;
        return validTLDs.test(cleanUrl);
    }
    
    updateStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }
    
    // Region Selection Methods
    setupRegionSelection() {
        this.isSelecting = false;
        this.startPoint = null;
        this.selectedRegion = null;
        
        // Touch and mouse events for selection
        this.selectionOverlay.addEventListener('mousedown', this.handleSelectionStart.bind(this));
        this.selectionOverlay.addEventListener('mousemove', this.handleSelectionMove.bind(this));
        this.selectionOverlay.addEventListener('mouseup', this.handleSelectionEnd.bind(this));
        
        // Touch events for mobile
        this.selectionOverlay.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.selectionOverlay.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.selectionOverlay.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Cancel selection when clicking outside
        this.selectionOverlay.addEventListener('click', (e) => {
            if (e.target === this.selectionOverlay) {
                this.cancelRegionSelection();
            }
        });
    }
    
    startRegionSelection() {
        this.selectionOverlay.style.display = 'block';
        this.selectRegionBtn.style.display = 'none';
        this.cancelRegionBtn.style.display = 'block';
        this.updateStatus('Select text region by dragging', 'loading');
    }
    
    cancelRegionSelection() {
        this.selectionOverlay.style.display = 'none';
        this.selectionBox.style.display = 'none';
        this.selectRegionBtn.style.display = 'block';
        this.cancelRegionBtn.style.display = 'none';
        this.isSelecting = false;
        this.startPoint = null;
        this.selectedRegion = null;
        this.updateStatus('Region selection cancelled', 'ready');
    }
    
    handleSelectionStart(e) {
        e.preventDefault();
        this.isSelecting = true;
        const rect = this.selectionOverlay.getBoundingClientRect();
        this.startPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = this.startPoint.x + 'px';
        this.selectionBox.style.top = this.startPoint.y + 'px';
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
    }
    
    handleSelectionMove(e) {
        if (!this.isSelecting || !this.startPoint) return;
        e.preventDefault();
        
        const rect = this.selectionOverlay.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.updateSelectionBox(currentPoint);
    }
    
    handleSelectionEnd(e) {
        if (!this.isSelecting || !this.startPoint) return;
        e.preventDefault();
        
        const rect = this.selectionOverlay.getBoundingClientRect();
        const endPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.completeSelection(endPoint);
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleSelectionStart(mouseEvent);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isSelecting) return;
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleSelectionMove(mouseEvent);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (!this.isSelecting) return;
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleSelectionEnd(mouseEvent);
    }
    
    updateSelectionBox(currentPoint) {
        const left = Math.min(this.startPoint.x, currentPoint.x);
        const top = Math.min(this.startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }
    
    completeSelection(endPoint) {
        const videoRect = this.video.getBoundingClientRect();
        const overlayRect = this.selectionOverlay.getBoundingClientRect();
        
        // Calculate selection bounds relative to video
        const left = Math.min(this.startPoint.x, endPoint.x);
        const top = Math.min(this.startPoint.y, endPoint.y);
        const width = Math.abs(endPoint.x - this.startPoint.x);
        const height = Math.abs(endPoint.y - this.startPoint.y);
        
        // Ensure minimum selection size
        if (width < 50 || height < 20) {
            this.updateStatus('Selection too small, try again', 'error');
            this.selectionBox.style.display = 'none';
            this.isSelecting = false;
            return;
        }
        
        // Convert overlay coordinates to video coordinates
        const scaleX = this.video.videoWidth / videoRect.width;
        const scaleY = this.video.videoHeight / videoRect.height;
        
        this.selectedRegion = {
            x: left * scaleX,
            y: top * scaleY,
            width: width * scaleX,
            height: height * scaleY
        };
        
        this.isSelecting = false;
        this.updateStatus('Region selected - scanning...', 'loading');
        
        // Hide selection UI and scan the selected region
        setTimeout(() => {
            this.cancelRegionSelection();
            this.scanSelectedRegion();
        }, 500);
    }
    
    async scanSelectedRegion() {
        if (!this.selectedRegion || this.isScanning) return;
        
        this.isScanning = true;
        this.isProcessing = true;
        this.lastScanTime = Date.now();
        this.scanBtn.disabled = true;
        
        try {
            // Crop the image to selected region
            const croppedCanvas = this.cropVideoRegion(this.selectedRegion);
            
            let scanResult;
            if (this.currentProvider === 'tesseract') {
                scanResult = await this.performRegionOCR(croppedCanvas);
                if (scanResult) {
                    this.detectAndDisplayLinksFromRegion(scanResult.text, this.selectedRegion);
                }
            } else if (this.currentProvider === 'enhanced') {
                scanResult = await this.enhancedOCR.processImage(croppedCanvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'enhanced'
                    });
                }
            } else if (this.currentProvider === 'transformers') {
                scanResult = await this.transformersOCR.processImage(croppedCanvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'transformers'
                    });
                }
            } else if (this.currentProvider === 'azure') {
                scanResult = await this.azureOCR.processImage(croppedCanvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'azure'
                    });
                }
            } else if (this.currentProvider === 'ollama') {
                scanResult = await this.ollamaOCR.processImage(croppedCanvas);
                if (scanResult) {
                    const urls = this.extractUrlsFromText(scanResult.text);
                    this.processAIResults({
                        urls: urls,
                        processingTime: scanResult.processingTime,
                        confidence: scanResult.confidence,
                        provider: 'ollama'
                    });
                }
            } else {
                scanResult = await this.aiVision.processImage(croppedCanvas, this.currentProvider);
                if (scanResult && scanResult.urls) {
                    this.processAIResults(scanResult);
                }
            }
            
        } catch (error) {
            console.error('Region scan error:', error);
            this.updateStatus(`Region scan failed: ${error.message}`, 'error');
        } finally {
            this.isScanning = false;
            this.isProcessing = false;
            this.scanBtn.disabled = false;
            this.selectedRegion = null;
        }
    }
    
    cropVideoRegion(region) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = region.width;
        canvas.height = region.height;
        
        // Draw the cropped region from video
        ctx.drawImage(
            this.video,
            region.x, region.y, region.width, region.height,
            0, 0, canvas.width, canvas.height
        );
        
        return canvas;
    }
    
    async performRegionOCR(canvas) {
        try {
            const startTime = performance.now();
            
            const { data } = await this.worker.recognize(canvas);
            const processingTime = performance.now() - startTime;
            
            console.log(`Region OCR processed in ${processingTime.toFixed(0)}ms`);
            this.updatePerformanceInfo(processingTime, data.confidence);
            
            return {
                text: data.text,
                confidence: data.confidence,
                processingTime: processingTime
            };
        } catch (error) {
            console.error('Region OCR processing error:', error);
            return null;
        }
    }
    
    detectAndDisplayLinksFromRegion(text, region) {
        this.overlay.innerHTML = '';
        this.detectedLinks = [];
        
        const urlPatterns = [
            /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
            /www\.[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi,
            /[a-zA-Z0-9][a-zA-Z0-9.-]*\.(?:com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|museum|[a-z]{2})(?:\/[^\s<>"{}|\\^`\[\]]*)?/gi
        ];
        
        const foundUrls = new Set();
        
        urlPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(url => {
                    url = url.replace(/[.,;!?]+$/, '');
                    if (url.length > 4 && this.isValidUrl(url)) {
                        foundUrls.add(url);
                    }
                });
            }
        });
        
        if (foundUrls.size === 0) {
            this.updateStatus('No links found in selected region', 'ready');
            return;
        }
        
        const videoRect = this.video.getBoundingClientRect();
        const scaleX = videoRect.width / this.video.videoWidth;
        const scaleY = videoRect.height / this.video.videoHeight;
        
        foundUrls.forEach((url) => {
            this.detectedLinks.push(url);
            this.addToHistory(url);
            
            // Create marker for the selected region
            const marker = this.createPreciseMarker(
                region.x * scaleX,
                region.y * scaleY,
                region.width * scaleX,
                region.height * scaleY
            );
            this.overlay.appendChild(marker);
        });
        
        this.updateLinksDisplay();
        
        if (this.linkHistory.length > 0) {
            this.updateStatus(`Found ${this.detectedLinks.length} link(s) in region`, 'ready');
            this.linksPanel.classList.add('show');
        }
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