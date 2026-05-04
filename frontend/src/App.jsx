import { useState } from 'react'
import './App.css'

const languages = [
  { name: 'Telugu', code: 'te' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Kannada', code: 'kn' },
  { name: 'Malayalam', code: 'ml' },
  { name: 'Bengali', code: 'bn' },
  { name: 'Marathi', code: 'mr' },
  { name: 'Gujarati', code: 'gu' },
  { name: 'Spanish', code: 'es' },
  { name: 'French', code: 'fr' },
  { name: 'German', code: 'de' },
];

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [originalTranscript, setOriginalTranscript] = useState('')
  const [teluguTranscript, setTeluguTranscript] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [targetLang, setTargetLang] = useState('te')
  const [isSlow, setIsSlow] = useState(false)

  const handleProcess = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL.')
      return
    }

    setLoading(true)
    setProgress(0)
    setStatus('Initializing...')
    setError('')
    setOriginalTranscript('')
    setTeluguTranscript('')
    setVideoTitle('')

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/process';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, target_lang: targetLang }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to process URL')
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.error) throw new Error(data.error);
              
              if (data.progress !== undefined) setProgress(data.progress);
              if (data.status) setStatus(data.status);
              if (data.original) setOriginalTranscript(data.original);
              if (data.translated) setTeluguTranscript(data.translated);
              if (data.title) setVideoTitle(data.title);
            } catch (e) {
              console.error("Error parsing stream line:", e);
              if (e.message.includes('Failed to process video')) throw e;
            }
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
  }

  const [audioLoading, setAudioLoading] = useState(false)

  const handleListen = async (text, lang) => {
    try {
      setAudioLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/process', '/tts') : 'http://localhost:8000/api/tts';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          lang: lang === 'en-US' ? 'en' : targetLang,
          slow: isSlow 
        }) 
      });
      
      if (!response.ok) throw new Error('Failed to generate audio');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (e) {
      console.error(e);
      alert('Failed to generate speech audio.');
    } finally {
      setAudioLoading(false)
    }
  }

  const handlePrint = (title, text) => {
    const printWindow = window.open('', '', 'height=600,width=800')
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { 
              margin: 0; 
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              padding: 50px; 
              margin: 0;
              color: #1a202c;
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            h2 { 
              margin: 0;
              font-size: 24px;
              color: #2d3748;
            }
            .content { 
              white-space: pre-wrap; 
              line-height: 1.7; 
              font-size: 16px;
              color: #4a5568;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${title}</h2>
          </div>
          <div class="content">${text}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    
    // Wait for content to load and then print
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      // printWindow.close() // Optional: close after printing
    }
    
    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (printWindow) {
        printWindow.focus()
        printWindow.print()
      }
    }, 500)
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Transcript Converter</h1>
        <p>Convert audio transcripts to Telugu instantly</p>
      </header>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="progress-container">
              <svg className="progress-svg" viewBox="0 0 100 100">
                <circle className="progress-circle-bg" cx="50" cy="50" r="45" />
                <circle 
                  className="progress-circle-fg" 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  style={{ strokeDashoffset: 282.7 - (282.7 * progress) / 100 }}
                />
              </svg>
              <div className="progress-text">{progress}%</div>
            </div>
            <p className="loading-status">{status}</p>
            <div className="progress-bar-wrapper">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <section className="input-section card">
          <label htmlFor="url-input" className="input-label">URL Paste</label>
          <div className="input-wrapper">
            <input
              id="url-input"
              type="url"
              placeholder="Paste your audio/video URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="url-input"
            />
            <select 
              className="lang-select" 
              value={targetLang} 
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={loading}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
            <div className="speed-toggle">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isSlow} 
                  onChange={(e) => setIsSlow(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
              <span className="speed-label">{isSlow ? 'Slow Speed' : 'Normal Speed'}</span>
            </div>
            <button 
              className="process-btn" 
              onClick={handleProcess}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Process'}
            </button>
          </div>
          {error && <p className="error-message">{error}</p>}
        </section>

        <section className="results-section">
          {/* Content Transcript Column */}
          <div className="result-column card">
            <div className="column-header">
              <h2>Content Transcript</h2>
            </div>
            <div className="text-area-wrapper">
              <textarea
                className="result-textarea"
                readOnly
                placeholder="Your transcript will appear here..."
                value={originalTranscript}
              />
            </div>
            <div className="action-buttons">
              <button 
                className="action-btn" 
                onClick={() => handleCopy(originalTranscript)}
                disabled={!originalTranscript}
              >
                Copy
              </button>
              <button 
                className="action-btn" 
                onClick={() => handleListen(originalTranscript, 'en-US')}
                disabled={!originalTranscript || audioLoading}
              >
                {audioLoading ? 'Loading...' : 'Listen'}
              </button>
              <button 
                className="action-btn" 
                onClick={() => handlePrint(videoTitle || 'Content Transcript', originalTranscript)}
                disabled={!originalTranscript}
              >
                Print
              </button>
            </div>
          </div>

          {/* Telugu Translation Column */}
          <div className="result-column card highlight-card">
            <div className="column-header highlight-header">
              <h2>Convert transcript to {languages.find(l => l.code === targetLang)?.name.toLowerCase() || 'selected language'}</h2>
            </div>
            <div className="text-area-wrapper">
              <textarea
                className="result-textarea"
                readOnly
                placeholder="Telugu translation will appear here..."
                value={teluguTranscript}
              />
            </div>
            <div className="action-buttons">
              <button 
                className="action-btn" 
                onClick={() => handleCopy(teluguTranscript)}
                disabled={!teluguTranscript}
              >
                Copy
              </button>
              <button 
                className="action-btn" 
                onClick={() => handleListen(teluguTranscript, 'te-IN')}
                disabled={!teluguTranscript || audioLoading}
              >
                {audioLoading ? 'Loading...' : 'Listen'}
              </button>
              <button 
                className="action-btn" 
                onClick={() => handlePrint(videoTitle || 'Telugu Translation', teluguTranscript)}
                disabled={!teluguTranscript}
              >
                Print
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
