class LinkManager {
    constructor() {
        this.linksList = document.getElementById('linksList');
        this.linksPanel = document.getElementById('linksPanel');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        
        this.detectedLinks = [];
        this.linkHistory = [];
        this.maxHistorySize = 50;
        this.displayLimit = 5;
        
        this.loadLinkHistory();
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        this.clearHistoryBtn.addEventListener('click', () => {
            this.clearHistory();
        });
    }

    loadLinkHistory() {
        try {
            const saved = localStorage.getItem('cameraLinkHistory');
            if (saved) {
                this.linkHistory = JSON.parse(saved);
                console.log(`Loaded ${this.linkHistory.length} links from history`);
            }
        } catch (error) {
            console.error('Error loading link history:', error);
            this.linkHistory = [];
        }
    }

    saveLinkHistory() {
        try {
            localStorage.setItem('cameraLinkHistory', JSON.stringify(this.linkHistory));
        } catch (error) {
            console.error('Error saving link history:', error);
        }
    }

    addLinks(links) {
        if (!Array.isArray(links) || links.length === 0) return;

        const newLinks = [];
        const timestamp = new Date().toLocaleTimeString();

        links.forEach(url => {
            if (!this.linkHistory.some(item => item.url === url)) {
                const linkItem = { url, timestamp, id: Date.now() + Math.random() };
                this.linkHistory.unshift(linkItem);
                newLinks.push(linkItem);
            }
        });

        if (this.linkHistory.length > this.maxHistorySize) {
            this.linkHistory = this.linkHistory.slice(0, this.maxHistorySize);
        }

        if (newLinks.length > 0) {
            this.saveLinkHistory();
            this.updateDisplay();
            this.showPanel();
        }

        return newLinks;
    }

    removeLink(linkId) {
        this.linkHistory = this.linkHistory.filter(item => item.id !== linkId);
        this.saveLinkHistory();
        this.updateDisplay();
        
        if (this.linkHistory.length === 0) {
            this.hidePanel();
        }
    }

    clearHistory() {
        this.linkHistory = [];
        this.detectedLinks = [];
        this.saveLinkHistory();
        this.updateDisplay();
        this.hidePanel();
        console.log('Link history cleared');
    }

    updateDisplay() {
        if (!this.linksList) return;

        this.linksList.innerHTML = '';
        
        const displayLinks = this.linkHistory.slice(0, this.displayLimit);
        
        displayLinks.forEach((linkItem, index) => {
            const linkDiv = document.createElement('div');
            linkDiv.className = 'link-item';
            
            if (this.detectedLinks.includes(linkItem.url)) {
                linkDiv.classList.add('new-link');
            }
            
            linkDiv.innerHTML = `
                <div class="link-number">${index + 1}</div>
                <div class="link-content" onclick="window.open('${linkItem.url}', '_blank')">
                    <div class="link-url">${linkItem.url}</div>
                    <div class="link-time">${linkItem.timestamp}</div>
                </div>
                <button class="remove-link" onclick="event.stopPropagation(); linkManager.removeLink('${linkItem.id}')">×</button>
            `;
            
            this.linksList.appendChild(linkDiv);
        });

        setTimeout(() => {
            document.querySelectorAll('.link-item.new-link').forEach(item => {
                item.classList.remove('new-link');
            });
        }, 2000);
    }

    showPanel() {
        if (this.linksPanel) {
            this.linksPanel.classList.add('show');
        }
    }

    hidePanel() {
        if (this.linksPanel) {
            this.linksPanel.classList.remove('show');
        }
    }

    getDisplayedLinksCount() {
        return Math.min(this.linkHistory.length, this.displayLimit);
    }

    getAllLinks() {
        return [...this.linkHistory];
    }
}