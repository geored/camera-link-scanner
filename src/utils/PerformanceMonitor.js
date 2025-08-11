class PerformanceMonitor {
    constructor() {
        this.performanceInfo = document.getElementById('performanceInfo');
        this.scanTimes = [];
        this.maxSamples = 10;
    }

    startScan() {
        this.scanStartTime = performance.now();
        this.updateStatus('Processing...', 'loading');
    }

    endScan(success = true, linkCount = 0) {
        if (!this.scanStartTime) return;
        
        const scanTime = performance.now() - this.scanStartTime;
        this.scanTimes.push(scanTime);
        
        if (this.scanTimes.length > this.maxSamples) {
            this.scanTimes.shift();
        }
        
        const avgTime = this.getAverageTime();
        
        if (success) {
            const status = linkCount > 0 
                ? `Found ${linkCount} link${linkCount > 1 ? 's' : ''}`
                : 'No links found';
            this.updateStatus(`${status} (${Math.round(avgTime)}ms)`, 'ready');
        } else {
            this.updateStatus(`Scan failed (${Math.round(scanTime)}ms)`, 'error');
        }
        
        this.scanStartTime = null;
    }

    updateStatus(text, className = 'ready') {
        if (this.performanceInfo) {
            this.performanceInfo.textContent = text;
            this.performanceInfo.className = `performance-info ${className}`;
        }
    }

    getAverageTime() {
        if (this.scanTimes.length === 0) return 0;
        const sum = this.scanTimes.reduce((a, b) => a + b, 0);
        return sum / this.scanTimes.length;
    }

    getPerformanceStats() {
        return {
            avgScanTime: this.getAverageTime(),
            totalScans: this.scanTimes.length,
            lastScanTime: this.scanTimes[this.scanTimes.length - 1] || 0
        };
    }

    reset() {
        this.scanTimes = [];
        this.updateStatus('OCR: Ready', 'ready');
    }
}