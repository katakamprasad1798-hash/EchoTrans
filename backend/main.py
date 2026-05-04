from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from deep_translator import GoogleTranslator
import re
import os

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ProcessRequest(BaseModel):
    url: str
    target_lang: str = 'te'

def extract_video_id(url):
    """Extracts the YouTube video ID from a URL."""
    # Match standard url format, youtu.be, or shorts
    match = re.search(r'(?:v=|youtu\.be/|shorts/|embed/|v/)([^&?/\s]{11})', url)
    if match:
        return match.group(1)
        
    # Just in case the URL itself is just an 11 char ID
    if len(url.strip()) == 11 and re.match(r'^[a-zA-Z0-9_-]{11}$', url.strip()):
        return url.strip()
        
    return None

def get_video_title(video_id):
    """Fetches the video title using basic HTTP request to avoid extra dependencies."""
    import urllib.request
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        # Use proxies for title fetch too if available
        proxy_url = os.environ.get('PROXY_URL')
        if proxy_url:
            handler = urllib.request.ProxyHandler({'http': proxy_url, 'https': proxy_url})
            opener = urllib.request.build_opener(handler)
            urllib.request.install_opener(opener)
            
        with urllib.request.urlopen(url) as response:
            html = response.read().decode('utf-8')
            match = re.search(r'<title>(.*?)</title>', html)
            if match:
                title = match.group(1).replace(" - YouTube", "")
                # Handle HTML entities like &#39;
                import html as html_parser
                return html_parser.unescape(title)
    except Exception:
        pass
    return "YouTube Video"

@app.post("/process")
async def process_video(request: ProcessRequest):
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL. Please provide a valid YouTube link.")

    import json
    from fastapi.responses import StreamingResponse
    import asyncio

    async def event_generator():
        try:
            # Step 1: Fetching transcript
            yield json.dumps({"status": "Fetching transcript...", "progress": 10}) + "\n"
            await asyncio.sleep(0.1) # Brief pause to allow UI update
            
            # Setup proxies and cookies
            proxy_url = os.environ.get('PROXY_URL')
            proxies = None
            if proxy_url:
                try:
                    from youtube_transcript_api.proxies import ProxyConfig
                    proxies = ProxyConfig.from_url(proxy_url)
                except Exception:
                    # Fallback if ProxyConfig is not in that location
                    proxies = {"http": proxy_url, "https": proxy_url}
            
            # Create a session for cookies if needed
            import requests
            session = requests.Session()
            cookie_path = os.path.join(os.path.dirname(__file__), "cookies.txt")
            if os.path.exists(cookie_path):
                try:
                    import http.cookiejar
                    cj = http.cookiejar.MozillaCookieJar(cookie_path)
                    cj.load(ignore_discard=True, ignore_expires=True)
                    session.cookies.update(cj)
                except Exception as e:
                    print(f"Error loading cookies: {e}")

            # Initialize API instance with workarounds
            api = YouTubeTranscriptApi(proxy_config=proxies, http_client=session)
            
            try:
                transcript_list = api.list(video_id)
                
                try:
                    transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-IN'])
                except Exception:
                    transcript = next(iter(transcript_list))
                    
                fetched_transcript = transcript.fetch()
            except Exception as e:
                # Fallback to direct get if list fails (some versions have get_transcript on instance)
                if hasattr(api, 'get_transcript'):
                    fetched_transcript = api.get_transcript(video_id)
                else:
                    raise e
            
            original_text = " ".join([s.text for s in fetched_transcript])
            
            yield json.dumps({"status": "Transcript fetched. Preparing translation...", "progress": 30}) + "\n"
            
            # Step 2: Translation
            max_chunk = 2000
            chunks = [original_text[i:i+max_chunk] for i in range(0, len(original_text), max_chunk)]
            num_chunks = len(chunks)
            translated_text = ""
            translator = GoogleTranslator(source='auto', target=request.target_lang)
            
            for i, chunk in enumerate(chunks):
                progress = 30 + int(((i + 1) / num_chunks) * 60)
                yield json.dumps({"status": f"Translating chunk {i+1} of {num_chunks}...", "progress": progress}) + "\n"
                
                try:
                    translated_text += translator.translate(chunk) + " "
                    await asyncio.sleep(1) # Delay as before
                except Exception as e:
                    print(f"Translation error on chunk: {e}")
                    await asyncio.sleep(3)
                    translated_text += translator.translate(chunk) + " "
            
            # Step 3: Final Response
            video_title = get_video_title(video_id)
            yield json.dumps({
                "status": "Complete!", 
                "progress": 100, 
                "original": original_text, 
                "translated": translated_text.strip(),
                "title": video_title
            }) + "\n"
            
        except Exception as e:
            error_msg = str(e)
            detail = f"Failed to process video: {error_msg}"
            if "TranscriptsDisabled" in error_msg:
                detail = "The video creator has disabled subtitles/transcripts for this video."
            elif "NoTranscriptFound" in error_msg:
                detail = "No transcripts could be found for this video."
            elif "VideoUnavailable" in error_msg:
                detail = "This video is unavailable or private."
            
            yield json.dumps({"error": detail, "progress": 0}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")
from fastapi.responses import StreamingResponse
from gtts import gTTS
from io import BytesIO

class TTSRequest(BaseModel):
    text: str
    lang: str
    slow: bool = False

@app.post("/tts")
async def generate_tts(request: TTSRequest):
    try:
        # Generate TTS audio
        # Take up to 4500 characters to prevent excessive processing time
        tts = gTTS(text=request.text[:4500], lang=request.lang, slow=request.slow)
        fp = BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return StreamingResponse(fp, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS Generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
