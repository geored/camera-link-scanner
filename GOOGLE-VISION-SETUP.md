# 📋 Google Vision API Setup Guide

Follow these **exact steps** to get Google Vision API working with your Camera Link Scanner app.

## 🚀 **Step-by-Step Setup:**

### **Step 1: Go to Google Cloud Console**
1. Open your browser and go to: **https://console.cloud.google.com/**
2. Sign in with your Google account (Gmail account works)

### **Step 2: Create a New Project**
1. **Click the project dropdown** at the top (next to "Google Cloud")
2. **Click "NEW PROJECT"** button
3. **Enter project details:**
   - **Project name:** `camera-link-scanner` (or any name you prefer)
   - **Organization:** Leave as default
   - **Location:** Leave as default
4. **Click "CREATE"**
5. **Wait for project creation** (takes 10-30 seconds)
6. **Select your new project** from the dropdown

### **Step 3: Enable Vision API**
1. **In the left sidebar**, click **"APIs & Services"** → **"Library"**
   - If you don't see the sidebar, click the ☰ menu button
2. **In the search box**, type: `Cloud Vision API`
3. **Click on "Cloud Vision API"** from the results
4. **Click the blue "ENABLE" button**
5. **Wait for API to be enabled** (takes 5-10 seconds)

### **Step 4: Create API Credentials**
1. **Go to:** **"APIs & Services"** → **"Credentials"** (left sidebar)
2. **Click "+ CREATE CREDENTIALS"** at the top
3. **Select "API key"** from the dropdown
4. **Your API key will be generated** - it looks like: `AIzaSyD...`
5. **Click "COPY"** to copy the key
6. **IMPORTANT:** Click "RESTRICT KEY" for security

### **Step 5: Restrict API Key (Security)**
1. **In the "API restrictions" section:**
   - **Select "Restrict key"**
   - **Check "Cloud Vision API"**
2. **In the "Application restrictions" section:**
   - **Select "HTTP referrers (web sites)"**
   - **Click "ADD AN ITEM"**
   - **Add:** `https://YOUR_USERNAME.github.io/*`
   - **Example:** `https://geored.github.io/*`
3. **Click "SAVE"**

### **Step 6: Add API Key to Your App**
1. **Open your camera app:** https://geored.github.io/camera-link-scanner
2. **Tap "⚙️ AI Config"** (top right)
3. **Click "Google Vision"** button
4. **Paste your API key** in the input field
5. **The key is automatically saved** in your browser

### **Step 7: Test the Setup**
1. **Point camera at text with URLs**
2. **Tap "Scan for Links"**
3. **You should see:** `GOOGLE: 1-2s` in performance monitor
4. **Much more accurate URL detection!**

---

## 📊 **Free Tier Details:**

- **🆓 Free Quota:** 1,000 requests per month
- **💰 After Free Tier:** $1.50 per 1,000 requests
- **📈 Usage Monitoring:** Check in Google Cloud Console → APIs & Services → Quotas

---

## 🛠️ **Troubleshooting:**

### **"API key invalid" Error:**
1. **Check you copied the complete key** (starts with `AIzaSy...`)
2. **Ensure Cloud Vision API is enabled** (Step 3)
3. **Wait 2-3 minutes** after creating the key
4. **Check API restrictions** (Step 5)

### **"Quota exceeded" Error:**
1. **Check your usage:** Google Cloud Console → APIs & Services → Quotas
2. **Either wait until next month** or **enable billing**

### **"Permission denied" Error:**
1. **Check HTTP referrer restrictions** (Step 5)
2. **Make sure you added:** `https://YOUR_USERNAME.github.io/*`
3. **Try removing restrictions temporarily** for testing

### **Still not working?**
1. **Try the key without restrictions** first
2. **Check browser console** (F12) for detailed errors
3. **Verify the API is enabled** in Google Cloud Console

---

## 🔐 **Security Best Practices:**

✅ **DO:**
- Restrict API key to Cloud Vision API only
- Add HTTP referrer restrictions
- Monitor usage regularly

❌ **DON'T:**
- Share your API key publicly
- Use the key in other applications
- Leave key unrestricted

---

## 💡 **Pro Tips:**

1. **Bookmark Google Cloud Console** for easy access
2. **Set up billing alerts** to monitor costs
3. **Test with a few images first** to verify it works
4. **Compare accuracy** with Tesseract to see the improvement

---

**Need help?** Check the Google Cloud Vision API documentation or contact support through the console.