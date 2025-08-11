class URLExtractor {
    constructor() {
        this.urlPatterns = [
            /(?:https?:\/\/)?(?:www\.)?[\w\u00C0-\u017F][\w\u00C0-\u017F.-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
            /(?:https?:\/\/)?[\w\u00C0-\u017F][\w\u00C0-\u017F.-]*\.(?:com|org|net|edu|gov|mil|int|co|uk|de|fr|it|es|ru|cn|jp|au|ca|br|in|cz|sk)(?:\/[^\s]*)?/gi,
            /www\.[\w\u00C0-\u017F][\w\u00C0-\u017F.-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi
        ];
        
        this.blacklistedDomains = [
            'example.com',
            'localhost',
            '127.0.0.1',
            'test.com'
        ];
    }

    extractURLs(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        console.log('Extracting URLs from text:', text.substring(0, 200) + '...');
        
        const urls = new Set();
        
        this.urlPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleanUrl = this.cleanURL(match);
                    if (cleanUrl && this.isValidURL(cleanUrl)) {
                        urls.add(cleanUrl);
                    }
                });
            }
        });

        const urlArray = Array.from(urls);
        console.log('Extracted URLs:', urlArray);
        
        return urlArray;
    }

    cleanURL(url) {
        if (!url) return null;
        
        url = url.trim();
        
        url = url.replace(/[^\w\u00C0-\u017F.:\/\-?=&%#]+$/, '');
        url = url.replace(/^[^\w\u00C0-\u017F]+/, '');
        
        if (!url.match(/^https?:\/\//)) {
            if (url.startsWith('www.')) {
                url = 'https://' + url;
            } else if (url.includes('.')) {
                url = 'https://' + url;
            }
        }
        
        try {
            const urlObj = new URL(url);
            return urlObj.href;
        } catch (error) {
            console.log('Invalid URL format:', url);
            return null;
        }
    }

    isValidURL(url) {
        try {
            const urlObj = new URL(url);
            
            if (!urlObj.hostname.includes('.')) {
                return false;
            }
            
            if (this.blacklistedDomains.some(domain => 
                urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
            )) {
                return false;
            }
            
            if (urlObj.hostname.length < 4 || urlObj.hostname.length > 253) {
                return false;
            }
            
            const tld = urlObj.hostname.split('.').pop();
            if (tld.length < 2 || tld.length > 6) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    normalizeURL(url) {
        try {
            const urlObj = new URL(url);
            
            if (urlObj.pathname === '/') {
                urlObj.pathname = '';
            }
            
            urlObj.hash = '';
            
            return urlObj.href;
        } catch (error) {
            return url;
        }
    }

    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return null;
        }
    }

    isWellFormedURL(url) {
        return this.isValidURL(url) && url.includes('.');
    }
}