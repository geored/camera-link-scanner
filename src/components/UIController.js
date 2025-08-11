class UIController {
    constructor() {
        this.status = document.getElementById('status');
        this.scanBtn = document.getElementById('scanBtn');
        this.toggleCameraBtn = document.getElementById('toggleCamera');
        this.configToggle = document.getElementById('configToggle');
        this.aiConfig = document.getElementById('aiConfig');
        
        this.isScanning = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.configToggle.addEventListener('click', () => {
            this.toggleAIConfig();
        });

        document.addEventListener('click', (event) => {
            if (!this.aiConfig.contains(event.target) && 
                !this.configToggle.contains(event.target)) {
                this.hideAIConfig();
            }
        });
    }

    updateStatus(message, className = '') {
        if (this.status) {
            this.status.textContent = message;
            this.status.className = `status ${className}`;
        }
    }

    setScanButtonState(enabled, text = null) {
        if (this.scanBtn) {
            this.scanBtn.disabled = !enabled;
            if (text) {
                this.scanBtn.textContent = text;
            }
        }
    }

    setScanning(scanning) {
        this.isScanning = scanning;
        
        if (scanning) {
            this.setScanButtonState(false, 'Scanning...');
            this.updateStatus('Processing image...', 'loading');
        } else {
            this.setScanButtonState(true, 'Scan');
            this.updateStatus('Camera ready', 'ready');
        }
    }

    toggleAIConfig() {
        if (this.aiConfig) {
            this.aiConfig.classList.toggle('show');
        }
    }

    hideAIConfig() {
        if (this.aiConfig) {
            this.aiConfig.classList.remove('show');
        }
    }

    showError(message) {
        this.updateStatus(message, 'error');
        console.error(message);
    }

    showSuccess(message) {
        this.updateStatus(message, 'ready');
        console.log(message);
    }

    showLoading(message = 'Loading...') {
        this.updateStatus(message, 'loading');
    }

    enableControls() {
        this.setScanButtonState(true);
        if (this.toggleCameraBtn) {
            this.toggleCameraBtn.disabled = false;
        }
    }

    disableControls() {
        this.setScanButtonState(false);
        if (this.toggleCameraBtn) {
            this.toggleCameraBtn.disabled = true;
        }
    }

    getCameraButtonText() {
        return this.toggleCameraBtn ? this.toggleCameraBtn.textContent : '';
    }

    setCameraButtonText(text) {
        if (this.toggleCameraBtn) {
            this.toggleCameraBtn.textContent = text;
        }
    }
}