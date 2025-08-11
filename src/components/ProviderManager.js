class ProviderManager {
    constructor() {
        this.providers = {
            'tesseract': null,
            'enhanced': null,
            'free-ocr': null,
            'azure': null,
            'google': null,
            'openai': null,
            'ollama': null,
            'transformers': null
        };
        
        this.currentProvider = 'free-ocr';
        this.setupProviders();
        this.setupEventListeners();
    }

    setupProviders() {
        try {
            this.providers['enhanced'] = new EnhancedOCRProcessor();
            this.providers['free-ocr'] = new FreeOCRProcessor();
            this.providers['azure'] = new AzureOCRProcessor();
            this.providers['google'] = new AIVisionProcessor();
            this.providers['openai'] = new AIVisionProcessor();
            this.providers['ollama'] = new OllamaOCRProcessor();
            this.providers['transformers'] = new TransformersOCRProcessor();
        } catch (error) {
            console.error('Error setting up providers:', error);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchProvider(btn.dataset.provider);
            });
        });
    }

    switchProvider(providerName) {
        if (!this.providers.hasOwnProperty(providerName)) {
            console.error('Unknown provider:', providerName);
            return;
        }

        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-provider="${providerName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        document.querySelectorAll('[id$="Config"]').forEach(config => {
            config.style.display = 'none';
        });

        const configElement = document.getElementById(`${providerName.replace('-', '')}Config`);
        if (configElement) {
            configElement.style.display = 'block';
        }

        this.currentProvider = providerName;
        console.log('Switched to provider:', providerName);
    }

    async processImage(imageData, region = null) {
        const provider = this.providers[this.currentProvider];
        
        if (!provider) {
            throw new Error(`Provider ${this.currentProvider} not available`);
        }

        console.log(`Processing with ${this.currentProvider} provider`);

        switch (this.currentProvider) {
            case 'tesseract':
                return await this.processTesseract(imageData, region);
            case 'enhanced':
                return await provider.processImage(imageData, region);
            case 'free-ocr':
                return await provider.processImage(imageData);
            case 'azure':
                return await provider.processImage(imageData);
            case 'google':
                return await provider.processImageGoogle(imageData);
            case 'openai':
                return await provider.processImageOpenAI(imageData);
            case 'ollama':
                return await provider.processImage(imageData);
            case 'transformers':
                return await provider.processImage(imageData);
            default:
                throw new Error(`Unknown provider: ${this.currentProvider}`);
        }
    }

    async processTesseract(imageData, region = null) {
        if (!window.Tesseract) {
            throw new Error('Tesseract not loaded');
        }

        try {
            console.log('Processing with Tesseract...');
            
            const { data: { text } } = await window.Tesseract.recognize(
                imageData,
                'eng',
                {
                    logger: m => console.log(m)
                }
            );

            return text;
        } catch (error) {
            console.error('Tesseract processing failed:', error);
            throw error;
        }
    }

    getCurrentProvider() {
        return this.currentProvider;
    }

    getProviderInfo() {
        const providerNames = {
            'tesseract': 'Tesseract OCR',
            'enhanced': 'Enhanced OCR',
            'free-ocr': 'Free OCR',
            'azure': 'Azure Vision',
            'google': 'Google Vision',
            'openai': 'GPT-4 Vision',
            'ollama': 'Ollama Local',
            'transformers': 'Transformers'
        };

        return {
            current: this.currentProvider,
            name: providerNames[this.currentProvider] || 'Unknown',
            available: Object.keys(this.providers).filter(key => this.providers[key] !== null)
        };
    }
}