# Artist Amp Backend - Quick API Reference

## Base URL
```
http://127.0.0.1:8000
```

## Endpoints

### 1. Health Check
```
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "service": "artist-amp-backend",
  "version": "1.0.0"
}
```

### 2. Generate Lyrics
```
POST /generate-lyrics
```
**Request:**
```json
{
  "prompt": "love song about summer",
  "genre": "pop",
  "mood": "happy"
}
```
**Response (200 OK):**
```json
{
  "status": "success",
  "file": "W1tJbnRyb10KWWVhaCwgbG92ZSBzb25n..."
}
```
**Response (Error):**
```json
{
  "status": "error",
  "detail": "Lyrics generation failed: [reason]"
}
```

### 3. Generate Cover Art
```
POST /generate-cover
```
**Request:**
```json
{
  "prompt": "abstract colorful geometric",
  "genre": "electronic"
}
```
**Response (200 OK):**
```json
{
  "status": "success",
  "file": "outputs/cover_20260327_180345.png"
}
```

### 4. Generate Music
```
POST /generate-music
```
**Request:**
```json
{
  "prompt": "upbeat electronic dance music",
  "genre": "electronic",
  "mood": "energetic",
  "duration": 8
}
```
**Response (200 OK):**
```json
{
  "status": "success",
  "file": "outputs/music_20260327_180345.wav"
}
```
**Response (503 - AudioCraft not available):**
```json
{
  "detail": "Music generation model not available. Please ensure AudioCraft is properly installed."
}
```

### 5. Generate Beat  
```
POST /generate-beat
```
**Request:**
```json
{
  "prompt": "hip-hop beat",
  "duration": 8
}
```
**Response:** Same as music endpoint

## Request/Response Details

### Common Request Parameters

| Parameter | Type | Required | Range/Options | Default |
|-----------|------|----------|---|---------|
| `prompt` | string | Yes | 1-500 chars | - |
| `genre` | string | No | electronic, hip-hop, pop, rock, jazz, ambient, classical, folk | electronic |
| `mood` | string | No | happy, sad, energetic, calm, romantic, aggressive | uplifted |
| `duration` | integer | No | 1-30 seconds | 8 |

### Response Formats

**Success (200):**
```json
{
  "status": "success",
  "file": "path/to/file.ext",
  "message": "Optional message"  
}
```

**Error (4xx/5xx):**
```json
{
  "status": "error",
  "detail": "Error description"
}
```

## cURL Examples

### Health Check
```bash
curl -X GET http://127.0.0.1:8000/health
```

### Generate Lyrics
```bash
curl -X POST http://127.0.0.1:8000/generate-lyrics \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "breakup song",
    "genre": "pop",
    "mood": "sad"
  }'
```

### Generate Cover Art
```bash
curl -X POST http://127.0.0.1:8000/generate-cover \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "neon city lights",
    "genre": "synthwave"
  }'
```

### Generate Music
```bash
curl -X POST http://127.0.0.1:8000/generate-music \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "calm ambient meditation",
    "duration": 8
  }'
```

## JavaScript/Fetch Examples

### Lyrics
```javascript
const response = await fetch('http://127.0.0.1:8000/generate-lyrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'motivational rap',
    genre: 'hip-hop',
    mood: 'powerful'
  })
});
const data = await response.json();
console.log(data.file); // Base64 encoded lyrics
```

### Cover Art
```javascript
const response = await fetch('http://127.0.0.1:8000/generate-cover', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'futuristic space',
    genre: 'sci-fi'
  })
});
const data = await response.json();
console.log(data.file); // File path to PNG
```

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Use the generated file/data |
| 400 | Bad Request | Check request format and parameters |
| 422 | Validation Error | Review parameter constraints |
| 500 | Server Error | Check server logs |
| 503 | Service Unavailable | AudioCraft not available (music/beat only) |

## File Handling

### Lyrics Files (Base64)
- Returned as base64-encoded text
- Decode to get actual lyrics content
- Can be displayed directly or saved

### Cover Art Files (PNG)
- Stored in `outputs/` directory
- Accessible via `http://127.0.0.1:8000/outputs/cover_*.png`
- Files cleaned up automatically (keeps 50 latest)

### Music Files (WAV)
- Stored in `outputs/` directory
- Playable audio format (16-bit, 16kHz)
- Can be streamed or downloaded

## Error Handling

All endpoints return structured error responses:

```json
{
  "status": "error",
  "detail": "Descriptive error message"
}
```

Common errors:
- **Empty prompt**: Provide non-empty prompt (1-500 chars)
- **Invalid genre**: Use from: electronic, hip-hop, pop, rock, jazz, ambient, classical, folk
- **Duration out of range**: Use 1-30 seconds
- **AudioCraft not available**: Install with `pip install audiocraft`

## Testing

### Swagger UI (Interactive)
Visit: http://127.0.0.1:8000/docs

- Try out each endpoint
- Automatic request/response documentation
- See example values

### ReDoc (Read-only)
Visit: http://127.0.0.1:8000/redoc

## Rate Limiting

Currently **no rate limiting**. Production deployments should add:
- Per-IP rate limits
- Per-user rate limits (with authentication)
- Request queue system

## Timeout Recommendations

Expect response times:
- Health: < 10ms
- Lyrics: < 100ms
- Cover Art: 200-300ms
- Music: 10-30 seconds (depends on length & system)

Set HTTP timeouts accordingly (recommended 60 seconds minimum for music).

## CORS Headers

All responses include CORS headers allowing:
- All origins (`*`)
- All methods (POST, GET, etc.)
- All headers
- Credentials support

## Version Information

- API Version: 1.0.0
- FastAPI: 0.106.0
- Python: 3.10+

## Support

- **API Docs**: http://127.0.0.1:8000/docs
- **Server Health**: http://127.0.0.1:8000/health
- **Error Logs**: Check server console output

---

**Quick Start:**
```
1. Start backend: python -m uvicorn main:app --host 127.0.0.1 --port 8000
2. Visit: http://127.0.0.1:8000/docs  
3. Try out any endpoint
4. Use in your application
```
