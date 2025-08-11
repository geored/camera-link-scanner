# Camera Link Scanner

A Progressive Web App (PWA) that uses OCR technology to detect and extract web links from camera input in real-time.

![Camera Link Scanner Demo](../assets/screenshots/demo.png)

## Features

- 📱 **Real-time OCR**: Instant link detection from camera feed
- 🌍 **Multi-language Support**: Supports Czech characters and international domains
- 🎯 **Region Selection**: Select specific areas for more accurate OCR
- 🔄 **Multiple OCR Providers**: 
  - Free OCR (OCR.space API)
  - Azure Computer Vision
  - Google Vision API
  - OpenAI GPT-4 Vision
  - Ollama Local AI
  - Enhanced Tesseract
  - Basic Tesseract
- 📚 **Link History**: Persistent storage of detected links
- 🎮 **Gaming UI**: Futuristic cyan-themed interface
- 📱 **PWA Support**: Install as mobile app
- 🔄 **Camera Switching**: Front/back camera toggle
- ⚡ **Fast Performance**: Optimized for mobile devices

## Demo

Visit the live demo: [https://geored.github.io/web-camera-linkopener](https://geored.github.io/web-camera-linkopener)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/geored/web-camera-linkopener.git
cd web-camera-linkopener
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### 4. Access via HTTPS (Required for Camera)

For camera access, you need HTTPS. Use one of these options:

**Option A: Local Development with HTTPS**
```bash
npm run dev -- --https
```

**Option B: Deploy to GitHub Pages**
```bash
npm run deploy
```

**Option C: Use ngrok for HTTPS tunnel**
```bash
# Install ngrok globally
npm install -g ngrok

# In terminal 1
npm run serve

# In terminal 2
ngrok http 8080
```

## Project Structure

```
camera-link-scanner/
├── src/
│   ├── components/          # Modular UI components
│   │   ├── CameraManager.js
│   │   ├── LinkManager.js
│   │   ├── RegionSelector.js
│   │   ├── UIController.js
│   │   └── ProviderManager.js
│   ├── providers/           # OCR service providers
│   │   ├── free-ocr.js
│   │   ├── azure-ocr.js
│   │   ├── ai-vision.js
│   │   └── ...
│   ├── utils/               # Utility functions
│   │   ├── URLExtractor.js
│   │   └── PerformanceMonitor.js
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── assets/
│   └── icons/               # PWA icons
├── docs/                    # Documentation
├── tests/                   # Test files
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
└── package.json           # Project configuration
```

## Usage

### Basic Scanning

1. **Grant Camera Permission**: Click "Allow" when prompted for camera access
2. **Point Camera**: Aim at text containing web links
3. **Scan**: Click the "Scan" button or use region selection
4. **Open Links**: Click detected links to open in new tab

### Region Selection

1. Click "📱 Select Region" button
2. Drag to select text area on camera feed
3. Links will be automatically detected from selected region
4. Click "❌ Cancel" to exit selection mode

### OCR Provider Configuration

1. Click "⚙️ AI Config" to open settings
2. Select your preferred OCR provider
3. Enter API keys if required (Azure, Google, OpenAI)
4. Each provider offers different accuracy and speed trade-offs

## API Keys Setup

### Azure Computer Vision (Recommended)
- 5,000 free requests/month
- High accuracy (95%)
- Fast response (1-2s)

1. Create [Azure Computer Vision resource](https://azure.microsoft.com/en-us/services/cognitive-services/computer-vision/)
2. Get API key and endpoint
3. Enter in AI Config panel

### Google Vision API
- 1,000 free requests/month
- High accuracy (95%)
- Fast response (1-2s)

1. Enable [Google Vision API](https://cloud.google.com/vision/docs/setup)
2. Create API key
3. Enter in AI Config panel

### OpenAI GPT-4 Vision
- Pay-per-use ($0.01 per image)
- Highest accuracy (98%)
- Slower response (2-4s)

1. Get [OpenAI API key](https://platform.openai.com/api-keys)
2. Enter in AI Config panel

### Ollama Local AI (Privacy-focused)
- Completely free and private
- Good accuracy (95%)
- Requires local setup

1. Install [Ollama](https://ollama.ai/)
2. Pull vision model: `ollama pull llava:7b`
3. Start with CORS: `OLLAMA_ORIGINS=https://geored.github.io ollama serve`

## Browser Support

- ✅ Chrome 80+ (recommended)
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ❌ Internet Explorer (not supported)

### Mobile Support

- ✅ iOS Safari 13+
- ✅ Chrome Mobile 80+
- ✅ Samsung Internet 10+
- ✅ Firefox Mobile 75+

## Performance

- **Scan Time**: 1-4 seconds depending on provider
- **Accuracy**: 70-98% depending on provider and image quality
- **Memory Usage**: ~50MB typical, ~200MB with Transformers.js
- **Battery Impact**: Moderate (camera usage)