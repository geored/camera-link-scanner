class AIVisionProcessor {
    constructor() {
        this.apiKeys = {
            google: '', // User will need to add their API key
            openai: ''  // User will need to add their API key
        };
        this.preferredProvider = 'google'; // google, openai, or local
        this.fallbackChain = ['google', 'openai', 'tesseract'];
        this.cache = new Map();
        this.maxCacheSize = 50;
    }

    // Google Vision API Implementation
    async processWithGoogleVision(imageData) {
        if (!this.apiKeys.google) {
            throw new Error('Google Vision API key not configured');
        }

        const startTime = performance.now();
        
        try {
            const base64Image = this.canvasToBase64(imageData);
            
            const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKeys.google}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requests: [{
                        image: {
                            content: base64Image
                        },
                        features: [{
                            type: 'TEXT_DETECTION',
                            maxResults: 50
                        }]
                    }]
                })
            });

            const result = await response.json();
            const processingTime = performance.now() - startTime;

            if (result.responses && result.responses[0].textAnnotations) {
                const detectedText = result.responses[0].textAnnotations[0].description;
                const boundingBoxes = result.responses[0].textAnnotations.slice(1);
                
                return {
                    text: detectedText,
                    words: this.parseGoogleVisionWords(boundingBoxes),
                    processingTime: processingTime,
                    provider: 'google',
                    confidence: 95
                };
            }
            
            throw new Error('No text detected');
            
        } catch (error) {
            console.error('Google Vision API error:', error);
            throw error;
        }
    }

    // OpenAI GPT-4 Vision Implementation
    async processWithOpenAIVision(imageData) {
        if (!this.apiKeys.openai) {
            throw new Error('OpenAI API key not configured');
        }

        const startTime = performance.now();
        
        try {
            const base64Image = this.canvasToBase64(imageData);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKeys.openai}`
                },
                body: JSON.stringify({
                    model: "gpt-4-vision-preview",
                    messages: [{
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Extract ALL URLs, links, and web addresses from this image. Return ONLY a JSON array of objects with 'url' and 'confidence' (0-100). Include partial URLs, domains, and any text that looks like a web address. Be very thorough."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }],
                    max_tokens: 1000,
                    temperature: 0.1
                })
            });

            const result = await response.json();
            const processingTime = performance.now() - startTime;

            if (result.choices && result.choices[0].message.content) {
                const content = result.choices[0].message.content;
                const urls = this.parseOpenAIResponse(content);
                
                return {
                    urls: urls,
                    processingTime: processingTime,
                    provider: 'openai',
                    confidence: 98
                };
            }
            
            throw new Error('No response from OpenAI');
            
        } catch (error) {
            console.error('OpenAI Vision API error:', error);
            throw error;
        }
    }

    // Local ONNX Model Implementation (placeholder for future)
    async processWithLocalModel(imageData) {
        // This would use a local ONNX model for privacy and speed
        // For now, we'll return a placeholder
        return {
            text: '',
            urls: [],
            processingTime: 500,
            provider: 'local',
            confidence: 85
        };
    }

    // Main processing function with fallback chain
    async processImage(imageData, provider = null) {
        const imageHash = this.hashImage(imageData);
        
        // Check cache first
        if (this.cache.has(imageHash)) {
            console.log('Using cached result');
            return this.cache.get(imageHash);
        }

        const providersToTry = provider ? [provider] : this.fallbackChain;
        
        for (const currentProvider of providersToTry) {
            try {
                let result;
                
                switch (currentProvider) {
                    case 'google':
                        result = await this.processWithGoogleVision(imageData);
                        result.urls = this.extractUrlsFromText(result.text);
                        break;
                        
                    case 'openai':
                        result = await this.processWithOpenAIVision(imageData);
                        break;
                        
                    case 'local':
                        result = await this.processWithLocalModel(imageData);
                        break;
                        
                    case 'tesseract':
                        // Fallback to existing Tesseract implementation
                        continue;
                        
                    default:
                        continue;
                }
                
                // Cache successful result
                this.cacheResult(imageHash, result);
                
                return result;
                
            } catch (error) {
                console.warn(`${currentProvider} failed:`, error.message);
                
                // If this was the last provider, throw the error
                if (currentProvider === providersToTry[providersToTry.length - 1]) {
                    throw new Error(`All AI providers failed. Last error: ${error.message}`);
                }
            }
        }
    }

    // Utility functions
    canvasToBase64(canvas) {
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    }

    hashImage(canvas) {
        // Simple hash for caching (you might want a more robust solution)
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, Math.min(50, canvas.width), Math.min(50, canvas.height));
        return btoa(String.fromCharCode(...imageData.data.slice(0, 100)));
    }

    cacheResult(hash, result) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(hash, result);
    }

    parseGoogleVisionWords(annotations) {
        return annotations.map(annotation => ({
            text: annotation.description,
            confidence: 90, // Google doesn't provide word-level confidence
            bbox: {
                x0: Math.min(...annotation.boundingPoly.vertices.map(v => v.x || 0)),
                y0: Math.min(...annotation.boundingPoly.vertices.map(v => v.y || 0)),
                x1: Math.max(...annotation.boundingPoly.vertices.map(v => v.x || 0)),
                y1: Math.max(...annotation.boundingPoly.vertices.map(v => v.y || 0))
            }
        }));
    }

    parseOpenAIResponse(content) {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            // Fallback: extract URLs using regex
            const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+|[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}[^\s<>"{}|\\^`\[\]]*/g;
            const matches = content.match(urlRegex) || [];
            return matches.map(url => ({ url: url.trim(), confidence: 95 }));
        }
    }

    extractUrlsFromText(text) {
        const urlPatterns = [
            /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
            /www\.[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}[^\s<>"{}|\\^`\[\]]*/gi,
            /[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}[^\s<>"{}|\\^`\[\]]*/gi
        ];

        const foundUrls = new Set();
        
        urlPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(url => {
                    url = url.replace(/[.,;!?]+$/, '');
                    if (this.isValidUrl(url)) {
                        foundUrls.add(url);
                    }
                });
            }
        });

        return Array.from(foundUrls).map(url => ({ url, confidence: 90 }));
    }

    isValidUrl(url) {
        const cleanUrl = url.toLowerCase().trim();
        if (cleanUrl.length < 4) return false;
        
        const validTLDs = /\.(com|org|net|edu|gov|mil|int|co|io|ai|app|dev|tech|info|biz|name|[a-z]{2})(\.|\/|$)/;
        return validTLDs.test(cleanUrl);
    }

    // Configuration methods
    setApiKey(provider, key) {
        this.apiKeys[provider] = key;
        localStorage.setItem(`ai_${provider}_key`, key);
    }

    loadApiKeys() {
        this.apiKeys.google = localStorage.getItem('ai_google_key') || '';
        this.apiKeys.openai = localStorage.getItem('ai_openai_key') || '';
    }

    setPreferredProvider(provider) {
        this.preferredProvider = provider;
        localStorage.setItem('ai_preferred_provider', provider);
    }
}

// Export for use in main app
window.AIVisionProcessor = AIVisionProcessor;