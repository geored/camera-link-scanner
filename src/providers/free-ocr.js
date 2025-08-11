class FreeOCRProcessor {
    constructor() {
        this.isConfigured = true; // No setup needed
        this.apiUrl = 'https://api.ocr.space/parse/image';
        this.apiKey = 'helloworld'; // Free demo key
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.rateLimitWindow = 600000; // 10 minutes in milliseconds
        this.maxRequests = 10;
    }

    async processImage(canvas) {
        const startTime = performance.now();
        
        // Check rate limit
        const now = Date.now();
        if (now - this.lastRequestTime > this.rateLimitWindow) {
            // Reset counter if window has passed
            this.requestCount = 0;
        }
        
        if (this.requestCount >= this.maxRequests) {
            const waitTime = Math.ceil((this.rateLimitWindow - (now - this.lastRequestTime)) / 1000 / 60);
            throw new Error(`Rate limit exceeded. Please wait ${waitTime} minutes before using Free OCR again. Try Azure Vision (5K free/month) or region selection to reduce API calls.`);
        }
        
        try {
            console.log('Free OCR: Processing image...');
            console.log(`Free OCR: Request ${this.requestCount + 1}/${this.maxRequests} in current window`);
            
            // Convert canvas to blob
            const blob = await this.canvasToBlob(canvas);
            
            // Call OCR.space free API
            const result = await this.callOCRSpaceAPI(blob);
            
            // Update rate limit tracking
            this.requestCount++;
            this.lastRequestTime = Date.now();
            
            const processingTime = performance.now() - startTime;
            
            // Extract text from response
            const text = this.extractTextFromResponse(result);
            
            console.log('Free OCR: Detected text:', text);
            console.log('Free OCR: Processing time:', processingTime.toFixed(0) + 'ms');
            
            return {
                text: text,
                confidence: 85,
                processingTime: processingTime,
                provider: 'free-ocr'
            };
            
        } catch (error) {
            console.error('Free OCR processing error:', error);
            throw error;
        }
    }

    async callOCRSpaceAPI(imageBlob) {
        console.log('Free OCR: Calling OCR.space API...');
        
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        formData.append('apikey', this.apiKey);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('iscreatesearchablepdf', 'false');
        formData.append('issearchablepdfhidetextlayer', 'false');
        formData.append('OCREngine', '2'); // Use OCR Engine 2 for better accuracy
        formData.append('scale', 'true'); // Auto-scale image
        formData.append('isTable', 'false'); // Not a table

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OCR.space API error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('Free OCR: API response:', data);
            
            if (data.IsErroredOnProcessing) {
                const errorMsg = data.ErrorMessage?.join(', ') || 'Unknown error';
                throw new Error(`OCR processing error: ${errorMsg}`);
            }

            if (!data.ParsedResults || data.ParsedResults.length === 0) {
                console.warn('Free OCR: No text detected in image');
                return { ParsedResults: [{ ParsedText: '' }] };
            }

            return data;
        } catch (error) {
            console.error('Free OCR: API call failed:', error);
            throw error;
        }
    }

    extractTextFromResponse(result) {
        let text = '';
        
        if (result.ParsedResults && result.ParsedResults.length > 0) {
            text = result.ParsedResults[0].ParsedText || '';
        }
        
        return text.trim();
    }

    async canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            try {
                // Check if canvas has toBlob method
                if (typeof canvas.toBlob === 'function') {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create blob from canvas'));
                        }
                    }, 'image/png', 0.95);
                } else {
                    // Fallback: use toDataURL and convert to blob
                    const dataUrl = canvas.toDataURL('image/png', 0.95);
                    const blob = this.dataURLToBlob(dataUrl);
                    resolve(blob);
                }
            } catch (error) {
                reject(new Error(`Canvas conversion failed: ${error.message}`));
            }
        });
    }

    dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
}

// Export for use in main app
window.FreeOCRProcessor = FreeOCRProcessor;