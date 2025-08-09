class TransformersOCRProcessor {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.processor = null;
        this.model = null;
    }

    async loadModel() {
        if (this.isLoaded || this.isLoading) return;
        
        this.isLoading = true;
        console.log('Loading Transformers.js TrOCR model...');
        
        try {
            console.log('Attempting to load Transformers.js...');
            
            // Try multiple CDN sources for better reliability
            const cdnSources = [
                'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js',
                'https://unpkg.com/@xenova/transformers@2.17.1/dist/transformers.min.js',
                'https://cdn.skypack.dev/@xenova/transformers@2.17.1'
            ];
            
            let transformers = null;
            let loadError = null;
            
            for (const cdnUrl of cdnSources) {
                try {
                    console.log('Trying CDN:', cdnUrl);
                    transformers = await import(cdnUrl);
                    console.log('Successfully loaded from:', cdnUrl);
                    break;
                } catch (err) {
                    console.warn('Failed to load from:', cdnUrl, err);
                    loadError = err;
                    continue;
                }
            }
            
            if (!transformers) {
                throw new Error(`Failed to load Transformers.js from all CDNs. Last error: ${loadError?.message}`);
            }
            
            // Load TrOCR model for text recognition
            console.log('Loading TrOCR model...');
            this.processor = await transformers.pipeline('image-to-text', 'Xenova/trocr-base-printed', {
                revision: 'main',
                quantized: true // Use quantized version for better performance
            });
            
            this.isLoaded = true;
            this.isLoading = false;
            console.log('Transformers.js TrOCR model loaded successfully');
            
        } catch (error) {
            console.error('Failed to load Transformers.js model:', error);
            this.isLoading = false;
            throw new Error(`TrOCR unavailable: ${error.message}. Try Azure or Ollama instead.`);
        }
    }

    async processImage(canvas) {
        if (!this.isLoaded) {
            await this.loadModel();
        }

        const startTime = performance.now();
        
        try {
            console.log('Transformers OCR: Processing image...');
            
            // Convert canvas to image data
            const imageData = this.canvasToImageData(canvas);
            
            // Run TrOCR inference
            const result = await this.processor(imageData);
            const processingTime = performance.now() - startTime;
            
            // Extract text from result
            let text = '';
            if (Array.isArray(result)) {
                text = result.map(r => r.generated_text || r.text || '').join(' ');
            } else if (result.generated_text) {
                text = result.generated_text;
            } else if (result.text) {
                text = result.text;
            }
            
            console.log('Transformers OCR: Detected text:', text);
            console.log('Transformers OCR: Processing time:', processingTime.toFixed(0) + 'ms');
            
            return {
                text: text,
                confidence: 95, // TrOCR typically has high confidence
                processingTime: processingTime,
                provider: 'transformers'
            };
            
        } catch (error) {
            console.error('Transformers OCR processing error:', error);
            throw error;
        }
    }

    canvasToImageData(canvas) {
        // Convert canvas to ImageData format expected by Transformers.js
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Create a new canvas for processing if needed
        const processCanvas = document.createElement('canvas');
        const processCtx = processCanvas.getContext('2d');
        
        // Resize to optimal size for TrOCR (384x384 is good)
        const targetSize = 384;
        const scale = Math.min(targetSize / canvas.width, targetSize / canvas.height);
        
        processCanvas.width = canvas.width * scale;
        processCanvas.height = canvas.height * scale;
        
        processCtx.drawImage(canvas, 0, 0, processCanvas.width, processCanvas.height);
        
        return processCanvas;
    }

    // Alternative method using blob for Transformers.js
    async canvasToBlob(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        });
    }
}

// Export for use in main app
window.TransformersOCRProcessor = TransformersOCRProcessor;