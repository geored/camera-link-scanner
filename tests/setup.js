// Jest setup file for DOM testing

// Mock DOM elements that are commonly used
Object.defineProperty(window, 'navigator', {
    writable: true,
    value: {
        mediaDevices: {
            getUserMedia: jest.fn()
        },
        serviceWorker: {
            register: jest.fn()
        }
    }
});

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock Tesseract
global.Tesseract = {
    recognize: jest.fn().mockResolvedValue({
        data: { text: 'Mock OCR result' }
    })
};

// Mock URL constructor for URL validation tests
global.URL = class URL {
    constructor(url) {
        if (!url || typeof url !== 'string') {
            throw new TypeError('Invalid URL');
        }
        
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(url)) {
            throw new TypeError('Invalid URL');
        }
        
        this.href = url;
        this.hostname = url.split('/')[2] || '';
        this.pathname = '/' + url.split('/').slice(3).join('/');
        this.hash = '';
    }
};

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now())
};

// Setup DOM environment
beforeEach(() => {
    document.body.innerHTML = `
        <div class="container">
            <video id="video" autoplay muted playsinline></video>
            <div id="overlay" class="overlay"></div>
            <div id="selectionOverlay" class="selection-overlay">
                <div id="selectionInstructions" class="selection-instructions"></div>
                <div id="selectionBox" class="selection-box"></div>
            </div>
            <div id="status" class="status">Initializing camera...</div>
            <div id="performanceInfo" class="performance-info">OCR: Ready</div>
            <button id="configToggle" class="config-toggle">⚙️ AI Config</button>
            <div id="aiConfig" class="ai-config">
                <div class="ai-provider-select">
                    <button class="provider-btn active" data-provider="free-ocr">⚡ Free OCR</button>
                    <button class="provider-btn" data-provider="azure">Azure Vision</button>
                </div>
            </div>
            <div id="linksPanel" class="links-panel">
                <div class="links-header">
                    <span>📱 Link History</span>
                    <button id="clearHistory" class="clear-history">Clear</button>
                </div>
                <div id="linksList"></div>
            </div>
            <div class="region-controls">
                <button id="selectRegionBtn" class="region-btn">📱 Select Region</button>
                <button id="cancelRegionBtn" class="region-btn" style="display: none;">❌ Cancel</button>
            </div>
            <div class="controls">
                <button id="scanBtn" disabled>Scan</button>
                <button id="toggleCamera">Camera</button>
            </div>
        </div>
    `;
});

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});