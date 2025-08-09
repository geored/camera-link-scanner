class FreeOCRProcessor {
    constructor() {
        this.isConfigured = true; // No setup needed
        this.apiUrl = 'https://api.ocr.space/parse/image';
        this.apiKey = 'helloworld'; // Free demo key
    }

    async processImage(canvas) {
        const startTime = performance.now();
        
        try {
            console.log('Free OCR: Processing image...');
            
            // Convert canvas to blob
            const blob = await this.canvasToBlob(canvas);
            
            // Call OCR.space free API
            const result = await this.callOCRSpaceAPI(blob);
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
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png', 0.95);
        });
    }
}

// Export for use in main app
window.FreeOCRProcessor = FreeOCRProcessor;