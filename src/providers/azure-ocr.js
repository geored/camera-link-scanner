class AzureOCRProcessor {
    constructor() {
        this.apiKey = null;
        this.endpoint = null;
        this.isConfigured = false;
    }

    setApiKey(apiKey, endpoint = null) {
        this.apiKey = apiKey;
        this.endpoint = endpoint || 'https://your-resource-name.cognitiveservices.azure.com';
        this.isConfigured = !!apiKey;
        
        // Save to localStorage
        if (apiKey) {
            localStorage.setItem('azure_api_key', apiKey);
            if (endpoint) {
                localStorage.setItem('azure_endpoint', endpoint);
            }
        }
    }

    loadApiKey() {
        const savedKey = localStorage.getItem('azure_api_key');
        const savedEndpoint = localStorage.getItem('azure_endpoint');
        if (savedKey) {
            this.setApiKey(savedKey, savedEndpoint);
        }
    }

    async processImage(canvas) {
        if (!this.isConfigured) {
            throw new Error('Azure API key not configured');
        }

        const startTime = performance.now();
        
        try {
            console.log('Azure OCR: Processing image...');
            
            // Convert canvas to blob
            const blob = await this.canvasToBlob(canvas);
            
            // Call Azure Computer Vision OCR API
            const result = await this.callAzureOCR(blob);
            const processingTime = performance.now() - startTime;
            
            // Extract text from Azure response
            const text = this.extractTextFromAzureResponse(result);
            
            console.log('Azure OCR: Detected text:', text);
            console.log('Azure OCR: Processing time:', processingTime.toFixed(0) + 'ms');
            
            return {
                text: text,
                confidence: this.calculateAverageConfidence(result),
                processingTime: processingTime,
                provider: 'azure'
            };
            
        } catch (error) {
            console.error('Azure OCR processing error:', error);
            throw error;
        }
    }

    async callAzureOCR(imageBlob) {
        const url = `${this.endpoint}/vision/v3.2/ocr?language=unk&detectOrientation=true`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Content-Type': 'application/octet-stream'
            },
            body: imageBlob
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure OCR API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    }

    extractTextFromAzureResponse(result) {
        let text = '';
        
        if (result.regions) {
            for (const region of result.regions) {
                for (const line of region.lines) {
                    const lineText = line.words.map(word => word.text).join(' ');
                    text += lineText + ' ';
                }
            }
        }
        
        return text.trim();
    }

    calculateAverageConfidence(result) {
        let totalConfidence = 0;
        let wordCount = 0;
        
        if (result.regions) {
            for (const region of result.regions) {
                for (const line of region.lines) {
                    for (const word of line.words) {
                        if (word.confidence) {
                            totalConfidence += word.confidence;
                            wordCount++;
                        }
                    }
                }
            }
        }
        
        return wordCount > 0 ? (totalConfidence / wordCount) * 100 : 85;
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
window.AzureOCRProcessor = AzureOCRProcessor;