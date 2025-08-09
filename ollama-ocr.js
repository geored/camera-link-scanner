class OllamaOCRProcessor {
    constructor() {
        this.endpoint = 'http://localhost:11434';
        this.model = 'llava:7b'; // Default model
        this.isAvailable = false;
    }

    setConfig(endpoint = 'http://localhost:11434', model = 'llava:7b') {
        this.endpoint = endpoint;
        this.model = model;
        
        // Save to localStorage
        localStorage.setItem('ollama_endpoint', endpoint);
        localStorage.setItem('ollama_model', model);
    }

    loadConfig() {
        const savedEndpoint = localStorage.getItem('ollama_endpoint');
        const savedModel = localStorage.getItem('ollama_model');
        if (savedEndpoint) this.endpoint = savedEndpoint;
        if (savedModel) this.model = savedModel;
    }

    async checkAvailability() {
        try {
            const response = await fetch(`${this.endpoint}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isAvailable = data.models && data.models.some(m => m.name.includes('llava'));
                console.log('Ollama availability:', this.isAvailable);
                console.log('Available models:', data.models?.map(m => m.name));
                return this.isAvailable;
            }
        } catch (error) {
            console.log('Ollama CORS/connection error:', error.message);
            this.isAvailable = false;
            
            // Provide helpful CORS troubleshooting
            if (error.message.includes('fetch')) {
                console.error('CORS Issue: Restart Ollama with: OLLAMA_ORIGINS=https://geored.github.io ollama serve');
            }
        }
        return false;
    }

    async processImage(canvas) {
        if (!await this.checkAvailability()) {
            throw new Error('Ollama CORS error. Restart Ollama with: OLLAMA_ORIGINS=https://geored.github.io ollama serve\nThen ensure you have: ollama pull llava:7b');
        }

        const startTime = performance.now();
        
        try {
            console.log('Ollama OCR: Processing image...');
            
            // Convert canvas to base64
            const base64Image = this.canvasToBase64(canvas);
            
            // Call Ollama vision model
            const result = await this.callOllamaVision(base64Image);
            const processingTime = performance.now() - startTime;
            
            console.log('Ollama OCR: Detected text:', result.text);
            console.log('Ollama OCR: Processing time:', processingTime.toFixed(0) + 'ms');
            
            return {
                text: result.text,
                confidence: 90, // Ollama models typically have good confidence
                processingTime: processingTime,
                provider: 'ollama'
            };
            
        } catch (error) {
            console.error('Ollama OCR processing error:', error);
            throw error;
        }
    }

    async callOllamaVision(base64Image) {
        const prompt = `Analyze this image and extract all text, especially URLs and web addresses. 
        Focus on finding complete URLs like "www.example.com" or "https://example.com". 
        Return only the text you see, preserving the exact formatting and spelling.
        If you see any URLs or web addresses, make sure to include them completely.`;

        const response = await fetch(`${this.endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: prompt,
                images: [base64Image],
                stream: false,
                options: {
                    temperature: 0.1, // Low temperature for accurate text extraction
                    top_p: 0.9
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return {
            text: data.response || '',
            confidence: 90
        };
    }

    canvasToBase64(canvas) {
        // Convert canvas to base64 (without data:image/png;base64, prefix)
        const dataURL = canvas.toDataURL('image/png');
        return dataURL.split(',')[1];
    }

    // Helper method to install Ollama models
    async pullModel(modelName = 'llava:7b') {
        try {
            const response = await fetch(`${this.endpoint}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName })
            });
            
            if (response.ok) {
                console.log(`Started pulling ${modelName}. This may take a while...`);
                return true;
            }
        } catch (error) {
            console.error('Failed to pull model:', error);
        }
        return false;
    }
}

// Export for use in main app
window.OllamaOCRProcessor = OllamaOCRProcessor;