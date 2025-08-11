class CameraManager {
    constructor() {
        this.video = document.getElementById('video');
        this.currentStream = null;
        this.facingMode = 'environment';
    }

    async initCamera() {
        try {
            console.log('Starting camera initialization...');
            
            if (this.currentStream) {
                this.stopCamera();
            }

            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            console.log('Requesting camera access with constraints:', constraints);
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            console.log('Camera access granted');
            return true;
        } catch (error) {
            console.error('Camera initialization failed:', error);
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }

    async switchCamera() {
        try {
            this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
            await this.initCamera();
            console.log(`Switched to ${this.facingMode} camera`);
        } catch (error) {
            console.error('Camera switch failed:', error);
            this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
            throw error;
        }
    }

    captureFrame() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    captureRegion(x, y, width, height) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        const scaleX = this.video.videoWidth / this.video.clientWidth;
        const scaleY = this.video.videoHeight / this.video.clientHeight;
        
        ctx.drawImage(
            this.video,
            x * scaleX, y * scaleY, width * scaleX, height * scaleY,
            0, 0, width, height
        );
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }
}