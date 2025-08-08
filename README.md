# Camera Link Scanner

A web app that uses OCR to detect and open links from camera input. Point your camera at any text containing URLs and tap the detected links to open them in your browser.

## Features

- Real-time camera feed
- OCR text recognition using Tesseract.js
- Automatic URL detection and highlighting
- Touch-friendly interface for mobile devices
- Front/back camera switching
- Auto-scanning every 3 seconds
- Secure link opening with confirmation

## Usage

1. Open `index.html` in a web browser
2. Allow camera permissions when prompted
3. Point the camera at text containing URLs
4. Tap "Scan for Links" or wait for auto-scan
5. Tap the green highlighted areas to open detected links

## Browser Requirements

- Modern browser with camera support (Chrome, Firefox, Safari)
- HTTPS connection (required for camera access)
- JavaScript enabled

## Local Development

For local testing with camera access, serve the files over HTTPS:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server -p 8000

# Then access via: https://localhost:8000
```

## How It Works

1. **Camera Access**: Uses `getUserMedia()` to access device camera
2. **OCR Processing**: Tesseract.js processes video frames to extract text
3. **URL Detection**: Regex patterns identify URLs in the extracted text
4. **Visual Overlay**: Interactive markers highlight detected links
5. **Link Opening**: Confirmed links open in new browser tabs

## Supported URL Formats

- `https://example.com`
- `http://example.com`
- `www.example.com`
- `example.com`
- URLs with paths, parameters, and fragments

## Performance Tips

- Ensure good lighting for better OCR accuracy
- Hold camera steady during scanning
- Point camera directly at text for best results
- Use back camera for better quality when available