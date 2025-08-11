class LinkManager {
    constructor() {
        this.linksList = document.getElementById('linksList');
        this.linksPanel = document.getElementById('linksPanel');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        
        this.detectedLinks = [];
        this.linkHistory = [];
        this.maxHistorySize = 50;
        this.displayLimit = 50; // Show all links
        
        this.loadLinkHistory();
        this.setupEventListeners();
        this.updateDisplay();
        
        // Show panel if there are existing links
        if (this.linkHistory.length > 0) {
            this.showPanel();
        }
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
                console.log(`LinkManager: Loaded ${this.linkHistory.length} links from history:`, this.linkHistory);
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
        if (!this.linksList) {
            console.warn('LinkManager: linksList element not found!');
            return;
        }

        console.log(`LinkManager: updateDisplay called with ${this.linkHistory.length} links`);
        this.linksList.innerHTML = '';
        
        const displayLinks = this.linkHistory.slice(0, this.displayLimit);
        console.log('LinkManager: Will display', displayLinks.length, 'links');
        
        displayLinks.forEach((linkItem, index) => {
            const linkDiv = document.createElement('div');
            linkDiv.className = 'link-item';
            
            if (this.detectedLinks.includes(linkItem.url)) {
                linkDiv.classList.add('new-link');
            }
            
            linkDiv.innerHTML = `
                <div class="link-number">${index + 1}</div>
                <div class="link-content">
                    <div class="link-url">${linkItem.url}</div>
                    <div class="link-time">${linkItem.timestamp}</div>
                </div>
                <button class="remove-link" data-link-id="${linkItem.id}">×</button>
            `;
            
            // Add event listeners
            const linkContent = linkDiv.querySelector('.link-content');
            linkContent.addEventListener('click', () => {
                window.open(linkItem.url, '_blank');
            });
            
            const removeBtn = linkDiv.querySelector('.remove-link');
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.removeLink(linkItem.id);
            });
            
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
            console.log('LinkManager: Showing panel');
            this.linksPanel.classList.add('show');
        } else {
            console.warn('LinkManager: linksPanel element not found!');
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