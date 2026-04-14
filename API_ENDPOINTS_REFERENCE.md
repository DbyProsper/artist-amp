# Frontend API Calls Reference

## 🔗 API Base Configuration

### URLs
| Purpose | URL | Source |
|---------|-----|--------|
| **Primary API** | Configured via `VITE_API_BASE_URL` env var | `src/config/api.ts` |
| **Default (Local)** | `http://127.0.0.1:8000` | Fallback if env not set |
| **AI Backend** | `https://clinical-created-agent-ray.trycloudflare.com` | `src/lib/api.ts` (hardcoded) |
| **Cloud Run (NEW)** | `VITE_API_BASE_URL` or `https://musicinsta-api-asyfiq555a-uc.a.run.app` | `src/lib/api.ts` |

### Current .env Setting
```
VITE_API_BASE_URL="https://musicinsta-ai-973497466485.us-central1.run.app"
```

---

## 📞 All API Endpoints Called by Frontend

### 1. **generateMusic()** 
**Function**: `src/lib/api.ts:168`  
**Endpoint**: `/generate` (POST)  
**Base URL**: `API_BASE` (Primary API)  
**Request Body**: `{ prompt: string }`  
**Returns**: `{ success, audio_url, audio_base64, cover_url, lyrics, ... }`  
**Used By**: OnlineStudioPage.tsx (Music Generation Tab)

---

### 2. **generateBeats()**
**Function**: `src/lib/api.ts:177`  
**Endpoint**: `/beats` (POST)  
**Base URL**: `AI_BASE_URL` (AI Backend - Cloudflare)  
**Request Body**: `{ prompt: string }`  
**Returns**: `{ success, audio_base64, improved_prompt, plan, ... }`  
**Used By**: 
- StudioPage.tsx (Creation Mode - main generation)
- OnlineStudioPage.tsx (Beats Tab)

---

### 3. **generateSmart()**
**Function**: `src/lib/api.ts:186`  
**Endpoint**: `/generate-smart` (POST)  
**Base URL**: `AI_BASE_URL` (AI Backend - Cloudflare)  
**Request Body**: `{ prompt: string }`  
**Returns**: `{ success, audio_base64, improved_prompt, ... }`  
**Used By**: OnlineStudioPage.tsx (Beats Tab - Smart AI mode)

---

### 4. **generateGeminiAudio()**
**Function**: `src/lib/api.ts:195`  
**Endpoint**: `/generate-gemini-audio` (POST)  
**Base URL**: `AI_BASE_URL` (AI Backend - Cloudflare)  
**Request Body**: `{ prompt: string }`  
**Returns**: `{ success, audio_base64, ... }`  
**Used By**: OnlineStudioPage.tsx (Beats Tab - Gemini AI mode)

---

### 5. **generateLyrics()**
**Function**: `src/lib/api.ts:204`  
**Endpoint**: `/lyrics/generate` (POST)  
**Base URL**: `API_BASE` (Primary API)  
**Request Body**: `{ prompt: string, model: string }`  
**Returns**: `{ success, lyrics, data, ... }`  
**Used By**: OnlineStudioPage.tsx (Lyrics Tab)

---

### 6. **generateCover()**
**Function**: `src/lib/api.ts:213`  
**Endpoint**: `/cover` (POST)  
**Base URL**: `API_BASE` (Primary API)  
**Request Body**: `{ prompt: string }`  
**Returns**: `{ success, cover_url, ... }`  
**Used By**: OnlineStudioPage.tsx (Cover Art Tab)

---

### 7. **generateSong()**
**Function**: `src/lib/api.ts:222`  
**Endpoint**: `/generate-song` (POST)  
**Base URL**: `CLOUD_RUN_BASE_URL` (Cloud Run)  
**Request Body**: `{ prompt: string }`  
**Returns**: `{ success, audio_url, cover_url, lyrics, ... }`  
**Used By**: OnlineStudioPage.tsx (Music Tab)

---

### 8. **generateMerch()**
**Function**: `src/lib/api.ts:231`  
**Endpoint**: `/generate-merch` (POST)  
**Base URL**: `CLOUD_RUN_BASE_URL` (Cloud Run)  
**Request Body**: `{ prompt: string, product_type: string }`  
**Returns**: `{ success, cover_url, ... }`  
**Used By**: 
- OnlineStudioPage.tsx (Merch Tab)
- StudioPage.tsx (Merch generation - future)

---

### 9. **generateMusicFromAudio()**
**Function**: `src/lib/api.ts:240`  
**Endpoint**: `/music/generate` (POST)  
**Base URL**: `CLOUD_RUN_BASE_URL` (Cloud Run)  
**Request Body**: `FormData { file, prompt, model }`  
**Returns**: `{ success, audio_url, audio_base64, ... }`  
**Used By**: OnlineStudioPage.tsx (Mixing & Mastering Tab)

---

### 10. **generateImageFromUpload()**
**Function**: `src/lib/api.ts:290`  
**Endpoint**: `/image/generate` (POST)  
**Base URL**: `CLOUD_RUN_BASE_URL` (Cloud Run)  
**Request Body**: `FormData { file, prompt, model }`  
**Returns**: `{ success, cover_url, image_url, ... }`  
**Used By**: OnlineStudioPage.tsx (Mixing & Mastering Tab)

---

### 11. **enhanceAudio()**
**Function**: `src/lib/api.ts:340`  
**Endpoint**: `/audio/enhance` (POST)  
**Base URL**: `CLOUD_RUN_BASE_URL` (Cloud Run)  
**Request Body**: `FormData { file, type }`  
**Returns**: `{ success, audio_url, audio_base64, ... }`  
**Used By**: OnlineStudioPage.tsx (Mixing & Mastering Tab)

---

### 12. **chatWithAI()**
**Function**: `src/lib/api.ts:367`  
**Endpoint**: `/chat` (POST)  
**Base URL**: `CLOUD_RUN_BASE_URL` (Cloud Run)  
**Request Body**: `{ message, model, conversation_history? }`  
**Returns**: `{ success, response, message, ... }`  
**Used By**: OnlineStudioPage.tsx (AI Chat Tab)

---

## 🔀 Base URL Resolution

### How Base URLs Are Selected

#### For Standard Endpoints (generateMusic, generateLyrics, generateCover)
```
Uses: API_BASE
= import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
```

#### For AI Endpoints (generateBeats, generateSmart, generateGeminiAudio)
```
Uses: AI_BASE_URL (hardcoded)
= 'https://clinical-created-agent-ray.trycloudflare.com'
```

#### For Cloud Run Endpoints (generateSong, generateMerch, generateMusicFromAudio, generateImageFromUpload, enhanceAudio, chatWithAI)
```
Uses: CLOUD_RUN_BASE_URL
= import.meta.env.VITE_API_BASE_URL || 'https://musicinsta-api-asyfiq555a-uc.a.run.app'
```

---

## 🎯 Current Configuration

### .env File
```
VITE_API_BASE_URL="https://musicinsta-ai-973497466485.us-central1.run.app"
```

### Effective URLs
| Endpoint Type | Base URL | Full Endpoint |
|--------------|----------|---|
| Standard | API_BASE | `https://musicinsta-ai-973497466485.us-central1.run.app/lyrics/generate` |
| AI Backend | AI_BASE_URL | `https://clinical-created-agent-ray.trycloudflare.com/beats` |
| Cloud Run | CLOUD_RUN_BASE_URL | `https://musicinsta-ai-973497466485.us-central1.run.app/generate-song` |

---

## 📊 Endpoint Summary Table

| Function | Method | Endpoint | Base URL | Purpose |
|----------|--------|----------|----------|---------|
| `generateMusic` | POST | `/generate` | `API_BASE` | General music generation |
| `generateBeats` | POST | `/beats` | `AI_BASE` | Beat generation (FF Studio AI) |
| `generateSmart` | POST | `/generate-smart` | `AI_BASE` | Smart AI beat generation |
| `generateGeminiAudio` | POST | `/generate-gemini-audio` | `AI_BASE` | Gemini-based audio generation |
| `generateLyrics` | POST | `/lyrics/generate` | `API_BASE` | Lyric generation |
| `generateCover` | POST | `/cover` | `API_BASE` | Album cover generation |
| `generateSong` | POST | `/generate-song` | `CLOUD_RUN` | Full song generation (Cloud Run) |
| `generateMerch` | POST | `/generate-merch` | `CLOUD_RUN` | Merchandise design generation |
| `generateMusicFromAudio` | POST | `/music/generate` | `CLOUD_RUN` | Music from audio file |
| `generateImageFromUpload` | POST | `/image/generate` | `CLOUD_RUN` | Image from uploaded file |
| `enhanceAudio` | POST | `/audio/enhance` | `CLOUD_RUN` | Audio enhancement (denoise, etc) |
| `chatWithAI` | POST | `/chat` | `CLOUD_RUN` | AI chat functionality |

---

## 🛠️ Error Handling

### Timeout Configuration
- Default timeout: **30 seconds** (`DEFAULT_TIMEOUT_MS = 30000`)
- All API calls use `fetchWithTimeout()` wrapper
- AbortController handles timeout cleanup

### Error Response Format
```typescript
{
  success: false,
  error: "Error message here" | "Network error" | "Request timeout"
}
```

### Common Error Messages
- "Prompt cannot be empty" - Empty prompt validation
- "Request timeout" - Request exceeded 30s timeout
- "SSL error: secure connection issue" - SSL/certificate error (ngrok)
- "Network error or SSL issue" - Generic network failure
- "Invalid JSON response from API" - Non-JSON response
- "API returned failure" - API success=false

---

## 🔐 Headers Sent

### All Requests
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

### File Upload Requests
- Uses `FormData` (no Content-Type header - browser sets it automatically with boundary)

---

## 📍 Component-to-Endpoint Mapping

### StudioPage.tsx (NEW two-state interface)
- **generateBeats()** - Main generation on "Create Track" button

### OnlineStudioPage.tsx (Legacy multi-tab interface)
- **generateBeats()** - Beats tab
- **generateSmart()** - Beats tab (Smart AI mode)
- **generateGeminiAudio()** - Beats tab (Gemini mode)
- **generateLyrics()** - Lyrics tab
- **generateCover()** - Cover Art tab
- **generateSong()** - Music tab
- **generateMerch()** - Merch tab
- **generateMusicFromAudio()** - Mixing & Mastering tab
- **generateImageFromUpload()** - Mixing & Mastering tab
- **enhanceAudio()** - Mixing & Mastering tab
- **chatWithAI()** - AI Chat tab

---

## ⚙️ Environment Variables

### Set in .env
```
# Current production Cloud Run endpoint
VITE_API_BASE_URL="https://musicinsta-ai-973497466485.us-central1.run.app"

# Alternative: Local development
# VITE_API_BASE_URL="http://127.0.0.1:8000"

# Alternative: ngrok tunnel (for mobile testing)
# VITE_API_BASE_URL="https://your-ngrok-id.ngrok.io"
```

### Not Settable (hardcoded)
```
AI_BASE_URL="https://clinical-created-agent-ray.trycloudflare.com"
```

---

## 🔍 How to Trace a Request

1. **Identify which component makes the call**
   - StudioPage.tsx → `generateBeats()`
   - OnlineStudioPage.tsx → multiple functions

2. **Check which base URL is used**
   - Open `src/lib/api.ts`
   - Look at the function's `callApi()` or `callCloudRunApi()` call

3. **Find the effective endpoint**
   - Base URL + path = full URL
   - Example: `https://musicinsta-ai-973497466485.us-central1.run.app` + `/generate-song` = 
   - `https://musicinsta-ai-973497466485.us-central1.run.app/generate-song`

4. **Monitor in browser DevTools**
   - Open Network tab
   - Look for your endpoint
   - Check request/response headers and body

---

## 🚀 Testing a Single Endpoint

### Using curl (Linux/Mac)
```bash
curl -X POST https://musicinsta-ai-973497466485.us-central1.run.app/generate-song \
  -H "Content-Type: application/json" \
  -d '{"prompt":"sad amapiano love song"}'
```

### Using PowerShell (Windows)
```powershell
$url = "https://musicinsta-ai-973497466485.us-central1.run.app/generate-song"
$body = @{ prompt = "sad amapiano love song" } | ConvertTo-Json
Invoke-WebRequest -Uri $url -Method Post -Body $body -ContentType "application/json"
```

### From Browser Console
```javascript
fetch('https://musicinsta-ai-973497466485.us-central1.run.app/generate-song', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'sad amapiano' })
})
.then(r => r.json())
.then(data => console.log(data))
```

---

## ✅ Verification Checklist

- [ ] All endpoints are reachable (no 404s)
- [ ] CORS is enabled on all APIs
- [ ] Authentication headers are included (if required)
- [ ] Timeout handling works (long-running operations)
- [ ] Error responses are properly formatted
- [ ] File upload endpoints accept FormData
- [ ] Base URLs are correctly configured in .env

