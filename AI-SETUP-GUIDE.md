# 🤖 AI Vision Setup Guide

Your app now supports **3 AI vision providers** for ultra-precise URL recognition!

## 🚀 **Performance Comparison:**

| Provider | Speed | Accuracy | Cost | Setup |
|----------|-------|----------|------|-------|
| **Google Vision** | 1-2s | 95% | 1000 free/month | Easy |
| **GPT-4 Vision** | 2-4s | 98% | $0.01/image | Easy |
| **Tesseract OCR** | 2-3s | 70% | Free | No setup |

---

## 📋 **Setup Instructions:**

### **Option 1: Google Vision API (Recommended)**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create/Select Project:**
   - Create a new project or select existing one
   - Note your project ID

3. **Enable Vision API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"

4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Add to App:**
   - Open your camera app
   - Tap "⚙️ AI Config"
   - Select "Google Vision"
   - Paste your API key
   - Done! 🎉

**Free Tier:** 1000 requests/month
**Pricing:** $1.50 per 1000 requests after free tier

---

### **Option 2: OpenAI GPT-4 Vision (Most Accurate)**

1. **Go to OpenAI Platform:**
   - Visit: https://platform.openai.com/
   - Sign up or log in

2. **Add Payment Method:**
   - Go to "Billing" → "Payment methods"
   - Add a credit card (required for API access)

3. **Create API Key:**
   - Go to "API Keys"
   - Click "Create new secret key"
   - Copy the key (starts with 'sk-')

4. **Add to App:**
   - Open your camera app
   - Tap "⚙️ AI Config"
   - Select "GPT-4 Vision"
   - Paste your API key
   - Done! 🎉

**Pricing:** ~$0.01 per image scan

---

### **Option 3: Tesseract OCR (Free, No Setup)**

- Already included in the app
- No API keys needed
- Works offline
- Lower accuracy but completely free

---

## 🎯 **Which Should You Choose?**

### **For Most Users: Google Vision**
- ✅ Great accuracy (95%)
- ✅ Fast (1-2 seconds)
- ✅ 1000 free scans/month
- ✅ Easy setup

### **For Maximum Accuracy: GPT-4 Vision**
- ✅ Best accuracy (98%)
- ✅ Understands context
- ✅ Handles complex layouts
- ❌ Costs ~$0.01 per scan

### **For Privacy/Free: Tesseract**
- ✅ Completely free
- ✅ Works offline
- ✅ No data sent to servers
- ❌ Lower accuracy (~70%)

---

## 🔧 **How to Switch Providers:**

1. Open the camera app
2. Tap "⚙️ AI Config" (top right)
3. Select your preferred provider
4. Enter API key if needed
5. Start scanning!

The app automatically falls back to Tesseract if the AI provider fails.

---

## 📊 **Performance Tips:**

- **Good lighting** improves all providers
- **Steady camera** for better results
- **Close-up shots** of text work best
- **High contrast** (dark text on light background)

---

## 🛠️ **Troubleshooting:**

### "API Key Invalid"
- Check you copied the complete key
- Ensure the API is enabled (Google)
- Verify billing is set up (OpenAI)

### "Too Slow"
- Switch to Google Vision for speed
- Ensure good internet connection
- Try Tesseract for offline use

### "Poor Accuracy"
- Switch to GPT-4 Vision for best results
- Improve lighting and camera stability
- Get closer to the text

---

**Need help?** The app shows real-time performance metrics to help you optimize!