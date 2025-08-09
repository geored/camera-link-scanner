class EnhancedOCRProcessor {
    constructor() {
        this.worker = null;
        this.isLoaded = false;
        this.isLoading = false;
    }

    async loadModel() {
        if (this.isLoaded || this.isLoading) return;
        
        this.isLoading = true;
        console.log('Enhanced OCR: Initializing Tesseract with better settings...');
        
        try {
            this.worker = await Tesseract.createWorker('eng');
            
            // Enhanced OCR parameters for better accuracy
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:/?#[]@!$&\'()*+,;=%-_~',
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                preserve_interword_spaces: '1',
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                // Better text detection
                textord_really_old_xheight: '1',
                textord_min_linesize: '1.25',
                classify_enable_learning: '0',
                classify_enable_adaptive_matcher: '1',
                // Improve character recognition
                segment_penalty_dict_frequent_word: '1',
                segment_penalty_dict_case_ok: '1',
                segment_penalty_dict_case_bad: '1.3125',
                // Language model improvements
                language_model_penalty_non_freq_dict_word: '0.1',
                language_model_penalty_non_dict_word: '0.15'
            });
            
            this.isLoaded = true;
            this.isLoading = false;
            console.log('Enhanced OCR: Ready');
            
        } catch (error) {
            console.error('Enhanced OCR initialization failed:', error);
            this.isLoading = false;
            throw error;
        }
    }

    async processImage(canvas) {
        if (!this.isLoaded) {
            await this.loadModel();
        }

        const startTime = performance.now();
        
        try {
            console.log('Enhanced OCR: Processing image...');
            
            // Apply multiple image enhancement techniques
            const enhancedCanvas = await this.enhanceImageForOCR(canvas);
            
            // Run OCR with enhanced image
            const { data } = await this.worker.recognize(enhancedCanvas);
            const processingTime = performance.now() - startTime;
            
            console.log('Enhanced OCR: Detected text:', data.text);
            console.log('Enhanced OCR: Processing time:', processingTime.toFixed(0) + 'ms');
            
            return {
                text: data.text,
                confidence: data.confidence || 85,
                processingTime: processingTime,
                provider: 'enhanced'
            };
            
        } catch (error) {
            console.error('Enhanced OCR processing error:', error);
            throw error;
        }
    }

    async enhanceImageForOCR(canvas) {
        console.log('Enhanced OCR: Applying image enhancements...');
        
        // Create enhanced canvas
        const enhancedCanvas = document.createElement('canvas');
        const ctx = enhancedCanvas.getContext('2d');
        
        // Scale up for better recognition
        const scale = 2;
        enhancedCanvas.width = canvas.width * scale;
        enhancedCanvas.height = canvas.height * scale;
        
        // Step 1: Initial upscaling with smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, enhancedCanvas.width, enhancedCanvas.height);
        
        // Step 2: Apply multiple enhancement filters
        const imageData = ctx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
        const enhanced = this.applyEnhancementFilters(imageData);
        ctx.putImageData(enhanced, 0, 0);
        
        // Step 3: Apply sharpening
        const sharpened = this.applySharpeningFilter(ctx, enhancedCanvas.width, enhancedCanvas.height);
        ctx.putImageData(sharpened, 0, 0);
        
        return enhancedCanvas;
    }

    applyEnhancementFilters(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Create output image data
        const enhanced = new ImageData(width, height);
        const output = enhanced.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale with better weights
            let gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Apply contrast enhancement
            gray = this.enhanceContrast(gray);
            
            // Apply gamma correction
            gray = this.applyGammaCorrection(gray, 1.2);
            
            // Apply adaptive threshold for text
            const threshold = this.calculateAdaptiveThreshold(data, i, width, height);
            gray = this.applyThreshold(gray, threshold);
            
            output[i] = gray;     // R
            output[i + 1] = gray; // G
            output[i + 2] = gray; // B
            output[i + 3] = 255;  // A
        }
        
        return enhanced;
    }

    enhanceContrast(value) {
        // Apply S-curve contrast enhancement
        const normalized = value / 255.0;
        const enhanced = Math.pow(normalized, 0.8) * 255;
        return Math.min(255, Math.max(0, Math.round(enhanced)));
    }

    applyGammaCorrection(value, gamma) {
        const normalized = value / 255.0;
        const corrected = Math.pow(normalized, 1.0 / gamma) * 255;
        return Math.min(255, Math.max(0, Math.round(corrected)));
    }

    calculateAdaptiveThreshold(data, index, width, height) {
        const x = (index / 4) % width;
        const y = Math.floor((index / 4) / width);
        
        // Calculate local mean in neighborhood
        const radius = 15;
        let sum = 0;
        let count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = (ny * width + nx) * 4;
                    const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
                    sum += gray;
                    count++;
                }
            }
        }
        
        const mean = count > 0 ? sum / count : 128;
        return mean - 10; // Slight bias towards text (darker areas)
    }

    applyThreshold(value, threshold) {
        return value > threshold ? 255 : 0;
    }

    applySharpeningFilter(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const output = new ImageData(width, height);
        const result = output.data;
        
        // Sharpening kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const weight = kernel[(ky + 1) * 3 + (kx + 1)];
                        
                        r += data[idx] * weight;
                        g += data[idx + 1] * weight;
                        b += data[idx + 2] * weight;
                    }
                }
                
                const outIdx = (y * width + x) * 4;
                result[outIdx] = Math.min(255, Math.max(0, r));
                result[outIdx + 1] = Math.min(255, Math.max(0, g));
                result[outIdx + 2] = Math.min(255, Math.max(0, b));
                result[outIdx + 3] = 255;
            }
        }
        
        // Copy edges
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                result[i] = data[i];
                result[i + 1] = data[i + 1];
                result[i + 2] = data[i + 2];
                result[i + 3] = 255;
            }
        }
        
        return output;
    }
}

// Export for use in main app
window.EnhancedOCRProcessor = EnhancedOCRProcessor;