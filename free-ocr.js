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
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.png');
        formData.append('apikey', this.apiKey);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('iscreatesearchablepdf', 'false');
        formData.append('issearchablepdfhidetextlayer', 'false');

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`OCR.space API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.IsErroredOnProcessing) {
            throw new Error(`OCR processing error: ${data.ErrorMessage?.join(', ') || 'Unknown error'}`);
        }

        return data;
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