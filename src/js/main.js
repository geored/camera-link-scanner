class CameraLinkScanner {
    constructor() {
        this.cameraManager = new CameraManager();
        this.linkManager = new LinkManager();
        this.uiController = new UIController();
        this.performanceMonitor = new PerformanceMonitor();
        this.providerManager = new ProviderManager();
        this.urlExtractor = new URLExtractor();
        
        this.regionSelector = new RegionSelector((region) => {
            this.processRegion(region);
        });
        
        this.lastScanTime = 0;
        this.scanCooldown = 1500;
        this.isProcessing = false;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Starting app initialization...');
            
            this.setupEventListeners();
            await this.cameraManager.initCamera();
            
            this.uiController.showSuccess('Camera ready');
            this.uiController.enableControls();
            
            console.log('App initialization complete');
        } catch (error) {
            console.error('App initialization failed:', error);
            this.uiController.showError(`Initialization failed: ${error.message}`);
        }
    }
    
    setupEventListeners() {
        document.getElementById('scanBtn').addEventListener('click', () => {
            this.performScan();
        });
        
        document.getElementById('toggleCamera').addEventListener('click', () => {
            this.switchCamera();
        });
        
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    async performScan() {
        if (this.isProcessing) {
            console.log('Scan already in progress');
            return;
        }
        
        const now = Date.now();
        if (now - this.lastScanTime < this.scanCooldown) {
            const remaining = Math.ceil((this.scanCooldown - (now - this.lastScanTime)) / 1000);
            this.uiController.showError(`Please wait ${remaining}s before scanning again`);
            return;
        }
        
        try {
            this.isProcessing = true;
            this.uiController.setScanning(true);
            this.performanceMonitor.startScan();
            
            const imageData = this.cameraManager.captureFrame();
            const text = await this.providerManager.processImage(imageData);
            
            const urls = this.urlExtractor.extractURLs(text);
            const newLinks = this.linkManager.addLinks(urls);
            
            this.performanceMonitor.endScan(true, urls.length);
            this.lastScanTime = now;
            
            if (urls.length > 0) {
                console.log(`Found ${urls.length} URLs:`, urls);
            } else {
                this.uiController.showSuccess('No links detected in image');
            }
            
        } catch (error) {
            console.error('Scan failed:', error);
            this.performanceMonitor.endScan(false);
            this.uiController.showError(`Scan failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.uiController.setScanning(false);
        }
    }
    
    async processRegion(region) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.uiController.setScanning(true);
            this.performanceMonitor.startScan();
            
            const imageData = this.cameraManager.captureRegion(
                region.x, region.y, region.width, region.height
            );
            
            const text = await this.providerManager.processImage(imageData, region);
            const urls = this.urlExtractor.extractURLs(text);
            const newLinks = this.linkManager.addLinks(urls);
            
            this.performanceMonitor.endScan(true, urls.length);
            
            if (urls.length > 0) {
                console.log(`Found ${urls.length} URLs in region:`, urls);
            } else {
                this.uiController.showSuccess('No links detected in selected region');
            }
            
        } catch (error) {
            console.error('Region processing failed:', error);
            this.performanceMonitor.endScan(false);
            this.uiController.showError(`Region scan failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.uiController.setScanning(false);
        }
    }
    
    async switchCamera() {
        try {
            this.uiController.disableControls();
            this.uiController.showLoading('Switching camera...');
            
            await this.cameraManager.switchCamera();
            
            this.uiController.showSuccess('Camera switched');
            this.uiController.enableControls();
        } catch (error) {
            console.error('Camera switch failed:', error);
            this.uiController.showError('Camera switch failed');
            this.uiController.enableControls();
        }
    }
    
    cleanup() {
        if (this.cameraManager) {
            this.cameraManager.stopCamera();
        }
    }
    
    getStatus() {
        return {
            camera: !!this.cameraManager.currentStream,
            processing: this.isProcessing,
            provider: this.providerManager.getCurrentProvider(),
            linksCount: this.linkManager.getDisplayedLinksCount(),
            performance: this.performanceMonitor.getPerformanceStats()
        };
    }
}

// Global references for backward compatibility
let linkManager;
let scanner;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    scanner = new CameraLinkScanner();
    linkManager = scanner.linkManager; // For backward compatibility with HTML onclick handlers
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraLinkScanner;
}