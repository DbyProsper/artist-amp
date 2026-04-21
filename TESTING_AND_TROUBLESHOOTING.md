# Testing & Troubleshooting Guide

## 🧪 Testing the Backend Integration

### 1. Health Check

First, verify the backend is online:

```bash
# Test production backend
curl -i https://musicinsta-api-973497466485.us-central1.run.app/health

# Test local backend
curl -i http://localhost:8000/health
```

Expected response:
```json
HTTP/1.1 200 OK

{
  "status": "healthy",
  "timestamp": "2026-04-21T12:00:00Z"
}
```

### 2. Music Generation Test

```bash
# Test music endpoint
curl -X POST http://localhost:8000/music/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "upbeat amapiano with energetic drums",
    "genre": "amapiano",
    "mood": "energetic",
    "language": "en",
    "bpm": 112,
    "user_tier": "free"
  }'
```

Wait 45-60 seconds for response:

```json
{
  "success": true,
  "data": {
    "audio_url": "https://storage.googleapis.com/musicinsta-media/audio/songs/abc123.mp3?X-Goog-Algorithm=GOOG4-RSA-SHA256&...",
    "storage": "google-cloud-storage",
    "model": "lyria-3-clip-preview",
    "size": 2457600
  }
}
```

### 3. Image Generation Test

```bash
curl -X POST http://localhost:8000/image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "sunset landscape with mountains",
    "image_type": "cover",
    "user_tier": "free"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "image_url": "https://storage.googleapis.com/musicinsta-media/images/covers/xyz789.png?X-Goog-Algorithm=...",
    "storage": "google-cloud-storage",
    "model": "image-generation-006"
  }
}
```

### 4. Lyrics Generation Test

```bash
curl -X POST http://localhost:8000/lyrics/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "love story about two musicians meeting",
    "mood": "romantic",
    "genre": "pop",
    "language": "en"
  }'
```

Response:
```json
{
  "success": true,
  "lyrics": "Verse 1: Met you on a summer day...",
  "model": "gemini-2.5-pro"
}
```

### 5. Complete Song Test (Longest - 90-150 seconds)

```bash
curl -X POST http://localhost:8000/song/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "epic orchestral theme for action movie",
    "genre": "orchestral",
    "mood": "heroic",
    "language": "en",
    "bpm": 140,
    "user_tier": "free"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "audio": {
      "url": "https://storage.googleapis.com/musicinsta-media/audio/songs/song123.mp3?...",
      "storage": "google-cloud-storage",
      "model": "lyria-3-clip-preview",
      "size": 4915200
    },
    "lyrics": {
      "text": "Verse 1: The hero rises...",
      "model": "gemini-2.5-pro"
    },
    "image": {
      "url": "https://storage.googleapis.com/musicinsta-media/images/covers/cover123.png?...",
      "storage": "google-cloud-storage",
      "model": "image-generation-006"
    }
  }
}
```

---

## 🔍 Debugging Common Issues

### Issue: "Request timeout after 120 seconds"

**Cause:** Music generation took longer than expected

**Solutions:**
1. Wait for the timeout and try again (transient backend issue)
2. Check backend is healthy: `curl http://localhost:8000/health`
3. Try with free tier instead of premium (lower quality = faster)
4. Check network connectivity
5. Increase frontend timeout in `src/config/api.ts` if consistently slow

### Issue: "Network error" or "Connection refused"

**Cause:** Backend is not running or URL is incorrect

**Checklist:**
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Check backend logs
tail -f logs/backend.log  # or your logging setup

# 3. Verify frontend has correct URL
echo $VITE_API_BASE_URL  # should be http://localhost:8000

# 4. Check firewall isn't blocking port 8000
netstat -an | grep 8000

# 5. Try localhost instead of 127.0.0.1
curl http://localhost:8000/health
```

### Issue: Audio won't play (silent browser)

**Cause 1: GCS signed URL expired (valid for 7 days)**
- Solution: Request a fresh URL from backend

**Cause 2: Browser doesn't support MP3**
```html
<!-- Provide multiple formats -->
<audio controls>
  <source src="..." type="audio/mpeg">
  <source src="..." type="audio/wav">
  Your browser doesn't support audio
</audio>
```

**Cause 3: CORS error (shouldn't happen)**
- Verify you're using the FULL URL from backend
- Check `crossOrigin="anonymous"` attribute
- GCS signed URLs should work without CORS setup

### Issue: "API error: HTTP 500"

**Cause:** Backend processing error

**Check:**
```bash
# Get detailed error from backend logs
curl -v http://localhost:8000/music/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","genre":"pop","mood":"happy","user_tier":"free"}'

# Check response body for error details
```

Common causes:
- Invalid genre/mood values
- Prompt is empty
- Backend missing dependencies (AudioCraft, spacy, etc.)
- GPU/memory issues on backend

### Issue: "HTTP 422 - Unprocessable Entity"

**Cause:** Invalid request format

**Check request format:**
```bash
# Verify JSON is valid
echo '{"prompt":"test","genre":"pop"}' | jq .

# Common mistakes:
# - Missing required fields: prompt, genre, mood, user_tier
# - Typo in field names
# - Invalid enum values (genre/mood not in allowed list)
```

### Issue: Frontend shows "Invalid JSON response from API"

**Cause:** Backend returned invalid JSON

**Solutions:**
1. Check backend logs for crash
2. Verify response is actually JSON: `curl http://localhost:8000/health | jq .`
3. Try hitting endpoint directly with curl to see raw response
4. Check for network proxies/middleware modifying response

### Issue: Cold Start Delay (first request takes 30+ seconds)

**Cause:** Cloud Run function warming up

**This is normal:**
- First request to production after inactivity can take 10-30 seconds
- Subsequent requests are fast (usually < 60s)

**Solution:**
- Show user feedback: "Warming up backend... please wait"
- Implement health check on app load to pre-warm

---

## 📋 Frontend Testing Checklist

### Setup
- [ ] `.env` file has `VITE_API_BASE_URL` set correctly
- [ ] Backend is running and accessible
- [ ] Health check passes: `curl http://localhost:8000/health`

### API Layer
- [ ] Timeouts are correct (30s/120s/300s)
- [ ] Response normalization works for all endpoints
- [ ] Error responses are handled properly
- [ ] User tier parameter is passed to music/song endpoints

### Music Generation
- [ ] Simple prompt works
- [ ] Genre parameter is respected
- [ ] Mood parameter is respected
- [ ] BPM parameter works
- [ ] Loading state shows while generating
- [ ] Generated audio URL is valid (opens in browser)
- [ ] Audio plays without CORS errors

### Image Generation
- [ ] Cover generation works
- [ ] Merchandise generation works
- [ ] Poster generation works
- [ ] Generated image displays
- [ ] Genre parameter is optional

### Lyrics Generation
- [ ] Lyrics generation works
- [ ] Returns text string
- [ ] Display in textarea/pre element

### Complete Song
- [ ] Generates music + lyrics + cover
- [ ] All three components are returned
- [ ] Takes 90-150 seconds (show loading state)
- [ ] All normalized fields work

### Error Handling
- [ ] Timeout error shows "Request timeout"
- [ ] Network error shows helpful message
- [ ] Invalid prompt shows validation error
- [ ] Backend error shows API error message
- [ ] User can retry after error

### History/Persistence
- [ ] Generated items saved to history
- [ ] History persists on page reload
- [ ] History limited to 50 items
- [ ] Can re-play from history
- [ ] Can delete from history

### Audio Playback
- [ ] HTML audio element works
- [ ] No CORS errors in console
- [ ] Play/pause controls work
- [ ] Can download audio
- [ ] Works in all browsers (Chrome, Firefox, Safari, Edge)

---

## 🚀 Testing in Different Environments

### Local Development
```bash
# 1. Start backend
cd backend
python main.py
# Backend should be at http://localhost:8000

# 2. Set frontend to local
# .env.local or create it:
VITE_API_BASE_URL="http://localhost:8000"

# 3. Start frontend
npm run dev
# Frontend at http://localhost:5173
```

### Production Testing
```bash
# Frontend already points to production in .env
VITE_API_BASE_URL="https://musicinsta-api-973497466485.us-central1.run.app"

# Test with:
npm run build
npm run preview
# Or deploy to production
```

---

## 📊 Performance Checklist

### Request Timeouts
- Music endpoint: 120 seconds ✅
- Song endpoint: 300 seconds ✅
- Image endpoint: 30 seconds ✅
- Lyrics endpoint: 30 seconds ✅

### Response Times
- Health check: < 1 second
- Lyrics: 5-10 seconds
- Image: 30-45 seconds
- Music: 45-60 seconds
- Complete song: 90-150 seconds

### Network
- GCS signed URLs: Direct CDN download (fast)
- No backend proxying of files
- No CORS preflight needed
- Audio format: MP3 (compatible with all browsers)

---

## 🐛 Debug Logging

### Enable API Logging

The API layer logs all requests/responses. Check browser console:

```typescript
// In src/lib/api.ts (already present)
console.log(`[API] ${method} ${endpoint}`, body);
console.log(`[API] Response:`, json);
```

**To see logs:**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for `[API]` logs
4. Check response structure and timing

### Common Log Patterns

```
[API] POST /music/generate {prompt: "...", genre: "...", ...}
[API] Response: {success: true, data: {audio_url: "..."}}
// ✅ Success - audio_url is ready

[API] POST /music/generate {prompt: "...", ...}
// [Wait 60 seconds]
[API] Response: {success: false, error: "Request timeout after 120 seconds"}
// ⏱️ Timeout - try again

[API] POST /music/generate {prompt: "...", ...}
[API] Response: {success: false, error: "Network error"}
// ❌ Network issue - check backend
```

---

## 📞 Support Resources

### Backend Documentation
See `BACKEND_INTEGRATION_GUIDE.md` for detailed API reference

### Example Code
See `API_INTEGRATION_EXAMPLES.tsx` for working examples

### API Configuration
See `src/config/api.ts` for timeout settings and user tier defaults

### Issue Escalation
1. Check this guide first
2. Review API logs in browser console
3. Test backend directly with curl
4. Check backend logs
5. Try with local backend first (easier to debug)
