# VoxTranslate: Multilingual YouTube Transcript Assistant

VoxTranslate is a powerful full-stack web application designed to extract, translate, and synthesize speech from YouTube video transcripts. Whether you need to study a lecture in your native language or create a written record of a video, VoxTranslate provides a seamless, mobile-responsive experience.

## 🚀 Features

- **Instant Extraction:** Fetches transcripts directly from YouTube URLs.
- **Multilingual Translation:** Supports 11+ languages including Telugu, Hindi, Tamil, Spanish, French, and German.
- **Dynamic TTS (Text-to-Speech):** Listen to transcripts and translations with high-quality voice synthesis.
- **Adjustable Reading Speed:** Toggle between Normal and Slow speeds for better comprehension.
- **Mobile Responsive Design:** Premium UI optimized for both desktop and mobile devices.
- **One-Click Actions:** Easily Copy, Print, or Listen to any section of the transcript.
- **Real-Time Progress:** Streaming updates show you exactly where the processing stands (fetching, translating, etc.).

## 🛠️ Tech Stack

### Frontend
- **React 19**
- **Vite** (for lightning-fast development)
- **Capacitor** (ready for Android/iOS deployment)
- **Vanilla CSS** (custom premium design system)

### Backend
- **FastAPI** (High-performance Python framework)
- **YouTube Transcript API**
- **Deep Translator** (Google Translate integration)
- **gTTS** (Google Text-to-Speech)
- **Uvicorn** (ASGI server)

## 📦 Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
The backend will be running at `http://localhost:8000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be running at `http://localhost:5173`.

## 📱 Mobile Build (Android)
The project is Capacitor-ready. To build the Android app:
1. Ensure Android Studio and SDK are installed.
2. Run `npm run build` in the frontend folder.
3. Run `npx cap sync android`.
4. Open the `android` folder in Android Studio and build the APK.

## 📄 License
This project is open-source and available under the MIT License.

---
*Created with ❤️ by Antigravity*
