class RegionSelector {
    constructor(onRegionSelected) {
        this.selectionOverlay = document.getElementById('selectionOverlay');
        this.selectionBox = document.getElementById('selectionBox');
        this.selectRegionBtn = document.getElementById('selectRegionBtn');
        this.cancelRegionBtn = document.getElementById('cancelRegionBtn');
        
        this.onRegionSelected = onRegionSelected;
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.selectRegionBtn.addEventListener('click', () => {
            this.startSelection();
        });

        this.cancelRegionBtn.addEventListener('click', () => {
            this.cancelSelection();
        });

        this.selectionOverlay.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.selectionOverlay.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.selectionOverlay.addEventListener('mouseup', this.handleMouseUp.bind(this));

        this.selectionOverlay.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.selectionOverlay.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.selectionOverlay.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    startSelection() {
        this.selectionOverlay.style.display = 'block';
        this.selectRegionBtn.style.display = 'none';
        this.cancelRegionBtn.style.display = 'block';
        console.log('Region selection started');
    }

    cancelSelection() {
        this.selectionOverlay.style.display = 'none';
        this.selectionBox.style.display = 'none';
        this.selectRegionBtn.style.display = 'block';
        this.cancelRegionBtn.style.display = 'none';
        this.isSelecting = false;
        console.log('Region selection cancelled');
    }

    handleMouseDown(event) {
        this.isSelecting = true;
        const rect = this.selectionOverlay.getBoundingClientRect();
        this.startX = event.clientX - rect.left;
        this.startY = event.clientY - rect.top;
        this.currentX = this.startX;
        this.currentY = this.startY;
        
        this.selectionBox.style.display = 'block';
        this.updateSelectionBox();
    }

    handleMouseMove(event) {
        if (!this.isSelecting) return;
        
        const rect = this.selectionOverlay.getBoundingClientRect();
        this.currentX = event.clientX - rect.left;
        this.currentY = event.clientY - rect.top;
        
        this.updateSelectionBox();
    }

    handleMouseUp(event) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this.completeSelection();
    }

    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        this.handleMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.isSelecting) return;
        
        const touch = event.touches[0];
        this.handleMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    }

    handleTouchEnd(event) {
        event.preventDefault();
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this.completeSelection();
    }

    updateSelectionBox() {
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }

    completeSelection() {
        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        if (width > 10 && height > 10) {
            const region = { x: left, y: top, width, height };
            console.log('Region selected:', region);
            
            if (this.onRegionSelected) {
                this.onRegionSelected(region);
            }
        }
        
        this.cancelSelection();
    }

    isActive() {
        return this.selectionOverlay.style.display === 'block';
    }
}