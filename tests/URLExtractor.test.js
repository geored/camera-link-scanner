// Test file for URLExtractor utility

describe('URLExtractor', () => {
    let urlExtractor;

    beforeEach(() => {
        // Load the URLExtractor class
        require('../src/utils/URLExtractor.js');
        urlExtractor = new URLExtractor();
    });

    describe('extractURLs', () => {
        test('should extract basic HTTP URLs', () => {
            const text = 'Visit https://www.example.com for more info';
            const urls = urlExtractor.extractURLs(text);
            expect(urls).toContain('https://www.example.com');
        });

        test('should extract URLs without protocol', () => {
            const text = 'Check out www.google.com and facebook.com';
            const urls = urlExtractor.extractURLs(text);
            expect(urls).toContain('https://www.google.com');
            expect(urls).toContain('https://facebook.com');
        });

        test('should extract Czech domain URLs', () => {
            const text = 'Visit www.koureni-zabiji.cz for Czech content';
            const urls = urlExtractor.extractURLs(text);
            expect(urls).toContain('https://www.koureni-zabiji.cz');
        });

        test('should handle Unicode characters in domains', () => {
            const text = 'Check out měst.cz and příklad.com';
            const urls = urlExtractor.extractURLs(text);
            expect(urls.length).toBeGreaterThan(0);
        });

        test('should return empty array for invalid input', () => {
            expect(urlExtractor.extractURLs(null)).toEqual([]);
            expect(urlExtractor.extractURLs(undefined)).toEqual([]);
            expect(urlExtractor.extractURLs('')).toEqual([]);
        });

        test('should remove duplicates', () => {
            const text = 'Visit https://example.com and https://example.com again';
            const urls = urlExtractor.extractURLs(text);
            expect(urls.filter(url => url === 'https://example.com')).toHaveLength(1);
        });
    });

    describe('cleanURL', () => {
        test('should add https protocol to www URLs', () => {
            const cleaned = urlExtractor.cleanURL('www.example.com');
            expect(cleaned).toBe('https://www.example.com');
        });

        test('should add https protocol to domain-only URLs', () => {
            const cleaned = urlExtractor.cleanURL('example.com');
            expect(cleaned).toBe('https://example.com');
        });

        test('should preserve existing protocol', () => {
            const cleaned = urlExtractor.cleanURL('https://example.com');
            expect(cleaned).toBe('https://example.com');
        });

        test('should handle null input', () => {
            expect(urlExtractor.cleanURL(null)).toBeNull();
            expect(urlExtractor.cleanURL('')).toBeNull();
        });
    });

    describe('isValidURL', () => {
        test('should validate correct URLs', () => {
            expect(urlExtractor.isValidURL('https://www.example.com')).toBe(true);
            expect(urlExtractor.isValidURL('https://google.com')).toBe(true);
            expect(urlExtractor.isValidURL('https://subdomain.example.com')).toBe(true);
        });

        test('should reject invalid URLs', () => {
            expect(urlExtractor.isValidURL('not-a-url')).toBe(false);
            expect(urlExtractor.isValidURL('http://localhost')).toBe(false);
            expect(urlExtractor.isValidURL('https://example')).toBe(false);
        });

        test('should reject blacklisted domains', () => {
            expect(urlExtractor.isValidURL('https://example.com')).toBe(false);
            expect(urlExtractor.isValidURL('https://localhost')).toBe(false);
            expect(urlExtractor.isValidURL('https://127.0.0.1')).toBe(false);
        });
    });

    describe('getDomain', () => {
        test('should extract domain from URL', () => {
            expect(urlExtractor.getDomain('https://www.example.com/path')).toBe('www.example.com');
            expect(urlExtractor.getDomain('https://subdomain.example.com')).toBe('subdomain.example.com');
        });

        test('should return null for invalid URLs', () => {
            expect(urlExtractor.getDomain('not-a-url')).toBeNull();
        });
    });
});