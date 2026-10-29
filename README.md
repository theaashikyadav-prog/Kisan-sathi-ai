# Kisan Sathi AI (किसान साथी AI) 🌾
> **किसान की समस्या, समाधान की सही राह**

Kisan Sathi AI is an advanced, production-oriented agricultural assistance platform built specifically for Indian and Bundelkhand farmers. It combines multimodal artificial intelligence (powered by Google Gemini 3.8 Flash), live APMC market data, agro-meteorological advisory, Hindi voice narration, and an installable Android Progressive Web App (PWA) with native Capacitor Android packaging.

---

## 📱 1. Official Assets & Branding

- **App Logo**: Official circular Kisan Sathi AI emblem featuring the farmer, sun, tractor, and AI circuit leaf.
- **Home Banner**: Preserved official 16:9 home interface banner ("अपनी फसल की फोटो भेजें") rendered in complete aspect ratio with `object-contain`.
- **Primary CTA**: *"अपनी फसल की फोटो भेजें"* (Take/upload crop photo for instant AI diagnosis).

---

## 🛠️ 2. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Web Speech API (Hindi TTS), WebRTC Camera.
- **Full-Stack Server**: Express.js server (`server.ts`) running Vite middleware in dev and static SPA in production.
- **AI Engine**: `@google/genai` TypeScript SDK (server-side only) calling `gemini-3.8-flash` for multimodal crop pathology and conversational agro-guidance.
- **Android & Mobile**: Capacitor Android configuration (`capacitor.config.ts`), native `android/` directory with `build.gradle`, `AndroidManifest.xml`, `MainActivity.java`, and Google Mobile Ads SDK (AdMob).
- **PWA**: `vite-plugin-pwa`, `manifest.webmanifest`, service worker caching, standalone display, and in-app install prompts for Android & iOS.
- **Project Packaging**: Live streaming ZIP generator (`/api/download-project-zip`) utilizing Node.js `archiver`.

---

## 🚀 3. Verified Working Features

1. **AI Crop Doctor (फसल डॉक्टर - AI रोग पहचान)**:
   - Live camera viewfinder (`getUserMedia`) and file picker.
   - Quick 1-click diseased leaf samples (Yellow rust wheat, early blight tomato, wilt gram).
   - Multimodal visual analysis detecting crop, pest, disease, and nutrient deficiency.
   - Qualitative confidence and severity classification (कम / मध्यम / गंभीर / अत्यंत गंभीर).
   - Step-by-step **Organic Remedies** (देसी जीवामृत, नीमास्त्र, खट्टी छाछ-हींग, राख भुरकाव).
   - **Chemical Remedies** with precise dosage per acre/liter and protective warnings.
   - Hindi Text-to-Speech audio readout for rural farmers.
   - 1-click WhatsApp report sharing.

2. **Live Mandi Rates (मंडी भाव)**:
   - APMC mandi rates for Wheat (गेहूं), Gram (चना), Mustard (सरसों), Soybean (सोयाबीन), Paddy (धान), Potato (आलू), Onion (प्याज), Garlic (लहसुन), Tomato (टमाटर).
   - Search by crop, filter by state, modal/min/max prices, daily arrival volume, and price trend indicators.

3. **Agro Weather Forecast (मौसम एवं कृषि सलाह)**:
   - Temperature, humidity, wind speed, rain probability, 5-day forecast.
   - Dedicated **Spraying Advisory** (कीटनाशक छिड़काव अनुकूलता) evaluating wind and rain safety.

4. **Farmer Knowledge Centre (कृषि ज्ञान केंद्र)**:
   - In-depth articles in Hindi covering Organic Farming (जीवामृत), Pest Control (नीमास्त्र), Seed Treatment (FIR विधि), Irrigation (ड्रिप/फव्वारा), and Soil Health.
   - Bookmarking, search, and voice narration.

5. **Government Schemes & Helplines (सरकारी योजनाएं एवं हेल्पलाइन)**:
   - Details for PM-KISAN, PM Fasal Bima (PMFBY), Kisan Credit Card (KCC), PM-KUSUM Solar Pump, and Soil Health Card.
   - One-tap calling for Kisan Call Centre (`1800-180-1551`), PMFBY Helpline (`14447`), and Regional KVKs.

6. **Authenticated Admin Console (प्रबंधक डैशबोर्ड)**:
   - Protected by PIN (`kisanadmin2026`).
   - Server metrics, uptime, error logs, and active package verification.
   - Edit announcement ticker and publish new articles.
   - Natural Language App Change Simulator: Propose changes in natural Hindi/English, inspect security and component risk analysis, and audit approve/rollback.

7. **Monetization (Google Mobile Ads AdMob)**:
   - Official test banner unit ID: `ca-app-pub-3940256099942544/6300978111`.
   - Native `play-services-ads:23.0.0` dependency configured in `android/app/build.gradle`.

8. **Direct Source Project ZIP**:
   - Download the complete project archive with all source code, assets, and Android files directly from the app header button or `GET /api/download-project-zip`.

---

## 📦 4. Android APK Build & Toolchain Status

### Build Environment Status:
The cloud workspace is a Node.js/Linux container without the Android SDK, Java Development Kit (`javac`), or Gradle installed. Therefore, an APK file cannot be directly built within this cloud container.

### How to Build the Real Android APK on your Machine:
The complete native Android project has been generated in the `android/` directory and is included in the project ZIP download.

To build the APK:
1. Download the complete project ZIP via the **"प्रोजेक्ट ZIP"** button in the header.
2. Unzip the project on your machine.
3. Ensure **Node.js 20+** and **Android Studio (Giraffe / Hedgehog / Iguana / Ladybug)** are installed.
4. Run:
   ```bash
   npm install
   npm run build
   npx cap sync android
   ```
5. Build the APK via command line:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   *The generated APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`.*
6. Or open the `android` folder in **Android Studio** and click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 🔒 5. Backend Configuration & Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# GEMINI_API_KEY: Required for multimodal crop analysis and AI farming chat
GEMINI_API_KEY="your_gemini_api_key_here"

# APP_URL: Deployment host URL
APP_URL="http://localhost:3000"

# PORT: Server port (defaults to 3000)
PORT=3000
```

---

## 🧪 6. Running the Application

### Development:
```bash
npm run dev
```
Runs Express full-stack server on `http://localhost:3000` with Vite middlewares.

### Production Build:
```bash
npm run build
npm start
```
