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
        const prompt = `You are an expert OCR system. Carefully examine this image and extract ALL visible text with perfect accuracy.

PRIORITY: Look for web URLs, domains, and web addresses including:
- URLs starting with http:// or https://
- Domains starting with www.
- Any text ending with .com, .org, .net, .cz, .io, .ai, etc.
- Email addresses
- Domain names with hyphens like "koureni-zabiji.cz"

INSTRUCTIONS:
1. Scan the entire image systematically
2. Extract every piece of text you can see, especially URLs
3. Pay special attention to URLs with Czech domains (.cz)
4. Include partial URLs and domain names
5. Preserve exact spelling, including hyphens and dots
6. Return all text found, with URLs clearly listed

Be extremely thorough. Even if text is small, blurry, or partially visible, try to read it.`;

        const response = await fetch(`${this.endpoint}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: prompt,
                images: [base64Image],
                stream: false,
                options: {
                    temperature: 0.0, // Very low temperature for maximum accuracy
                    top_p: 0.8,
                    repeat_penalty: 1.0,
                    num_predict: 512, // Allow longer responses
                    stop: [] // Don't stop early
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
        // Create high-resolution canvas for Ollama
        const highResCanvas = this.enhanceImageForOllama(canvas);
        
        // Convert to high-quality base64 (without data:image/png;base64, prefix)
        const dataURL = highResCanvas.toDataURL('image/png', 1.0); // Max quality
        return dataURL.split(',')[1];
    }

    enhanceImageForOllama(canvas) {
        // LLaVA works better with larger, high-contrast images
        const targetSize = 1024; // Ollama vision models prefer 1024x1024 or larger
        const aspectRatio = canvas.width / canvas.height;
        
        let newWidth, newHeight;
        if (aspectRatio > 1) {
            newWidth = targetSize;
            newHeight = Math.round(targetSize / aspectRatio);
        } else {
            newHeight = targetSize;
            newWidth = Math.round(targetSize * aspectRatio);
        }
        
        // Create enhanced canvas
        const enhancedCanvas = document.createElement('canvas');
        const ctx = enhancedCanvas.getContext('2d', { willReadFrequently: true });
        
        enhancedCanvas.width = newWidth;
        enhancedCanvas.height = newHeight;
        
        // Use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw original image scaled up
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        // Apply contrast and sharpening for better text recognition
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Enhance contrast for text
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale for better text contrast
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply strong contrast enhancement
            let enhanced = gray;
            enhanced = (enhanced - 128) * 1.5 + 128; // Increase contrast
            enhanced = Math.min(255, Math.max(0, enhanced));
            
            // Apply slight sharpening
            enhanced = enhanced > 120 ? Math.min(255, enhanced + 20) : Math.max(0, enhanced - 20);
            
            data[i] = enhanced;     // R
            data[i + 1] = enhanced; // G  
            data[i + 2] = enhanced; // B
            // Alpha unchanged
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        console.log(`Ollama: Enhanced image from ${canvas.width}x${canvas.height} to ${newWidth}x${newHeight}`);
        return enhancedCanvas;
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