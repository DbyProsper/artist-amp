# Artist Amp Backend

AI Music Generation Backend powered by FastAPI and MusicGen.

## Project Structure

```
backend/
├── main.py                 # FastAPI entry point with CORS configuration
├── requirements.txt        # Python dependencies
├── routes/                 # API endpoint definitions
│   ├── health.py          # Health check endpoints
│   ├── generation.py       # Music and beat generation
│   └── content_generation.py  # Lyrics and cover art generation
├── services/              # Business logic layer
│   ├── music_service.py   # MusicGen integration
│   ├── lyrics_service.py  # Lyrics generation
│   └── cover_service.py   # Cover art generation
├── models/                # Pydantic schemas
│   └── schemas.py         # Request/response models
├── utils/                 # Utility functions
│   └── file_handler.py    # File operations and cleanup
└── outputs/               # Generated files directory
```

## Features

- **Music Generation**: Generate full compositions using MusicGen
- **Beat Generation**: Generate instrumental-only beats
- **Lyrics Generation**: Template-based lyric generation
- **Cover Art Generation**: Procedural cover art generation with PIL
- **CORS Enabled**: Fully compatible with frontend at any origin
- **Error Handling**: Comprehensive error handling and logging
- **Auto Cleanup**: Automatic file cleanup to manage disk space

## Installation

### Prerequisites
- Python 3.10+
- pip or conda
- 4GB+ RAM (8GB+ recommended for GPU)
- CUDA 11.8+ (optional, for GPU acceleration)

### Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Important Notes on Dependencies

- **AudioCraft**: The package is preinstalled without its full dependencies to avoid conflicts
- **Torch**: Includes CUDA support by default. For CPU-only, modify requirements.txt
- **GPU Support**: Automatically detected; uses CUDA if available, falls back to CPU

## Running the Server

### Development Mode
```bash
python main.py
```

The server will start at `http://127.0.0.1:8000`

### With Uvicorn (Production)
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

### API Documentation
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## API Endpoints

### Health Check
- **GET** `/health` - Server health status
- **GET** `/` - Service information

### Music Generation
- **POST** `/generate/music` - Generate full music composition
  - Body: `{"prompt": "string", "genre": "string", "mood": "string", "duration": 1-30}`
  - Returns: `{"status": "success", "file": "relative/path.wav"}`

- **POST** `/generate/beat` - Generate instrumental beat
  - Body: `{"prompt": "string", "duration": 1-30}`
  - Returns: Same as music endpoint

### Content Generation
- **POST** `/generate/lyrics` - Generate lyrics
  - Body: `{"prompt": "string", "genre": "string", "mood": "string"}`
  - Returns: `{"status": "success", "file": "base64_encoded_lyrics"}`

- **POST** `/generate/cover` - Generate cover art
  - Body: `{"prompt": "string", "genre": "string"}`
  - Returns: `{"status": "success", "file": "relative/path.png"}`

### Error Responses
```json
{
  "status": "error",
  "detail": "Error message describing what went wrong"
}
```

## Usage Examples

### cURL - Generate Music
```bash
curl -X POST "http://127.0.0.1:8000/generate/music" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "upbeat electronic dance music with heavy bass",
    "genre": "electronic",
    "mood": "energetic",
    "duration": 8
  }'
```

### cURL - Generate Lyrics
```bash
curl -X POST "http://127.0.0.1:8000/generate/lyrics" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "love song about a summer romance",
    "genre": "pop",
    "mood": "romantic"
  }'
```

### cURL - Generate Cover Art
```bash
curl -X POST "http://127.0.0.1:8000/generate/cover" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "colorful abstract geometric patterns",
    "genre": "electronic"
  }'
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://127.0.0.1:8000/generate/music', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'calm ambient music for meditation',
    genre: 'ambient',
    mood: 'peaceful',
    duration: 8
  })
});
const data = await response.json();
console.log(data);
```

## Troubleshooting

### "Failed to fetch" errors
1. Ensure backend is running: `python main.py`
2. Check backend is accessible: `curl http://127.0.0.1:8000/health`
3. Verify CORS is enabled (should be visible in response headers)

### Model not loading
```
⚠ Music service initialized but model not loaded
```
- Ensure AudioCraft is installed: `pip install audiocraft`
- Check internet connection (model may need to download)
- Try restarting the server

### Out of memory errors
- Reduce duration in requests
- Use CPU instead of GPU (comment out CUDA in code)
- Restart the server to clear memory

### File generation errors
- Ensure `outputs/` directory is writable
- Check disk space availability
- Verify Pillow is installed for image generation

## Performance Tuning

### CPU Usage
- Music generation: ~2-5 minutes per 8-second composition
- Lyrics generation: <1 second
- Cover art generation: <1 second

### GPU Usage (CUDA)
- Music generation: ~10-30 seconds per 8-second composition
- Automatic device detection in services

### Optimization Tips
- Use smaller Duration values for faster generation
- Run on GPU for significant speedup
- Use async requests to handle multiple generations
- Implement request queuing for production

## Environment Variables (Optional)

```bash
# Force CPU (set to 1 to disable CUDA even if available)
DISABLE_CUDA=0

# Output directory cleanup
MAX_OUTPUT_FILES=50
CLEANUP_INTERVAL=60  # seconds

# Server configuration
HOST=127.0.0.1
PORT=8000
```

## Frontend Integration

The frontend expects:
- Backend URL: `http://127.0.0.1:8000`
- Response format: `{"status": "success/error", "file": "...", "message": "..."}`
- CORS headers properly set (automatic)

Frontend API calls should simply make POST requests to the endpoints listed above.

## Development

### Running Tests
```bash
pytest test/
pytest --asyncio-mode=auto  # For async tests
```

### Code Structure
- **Services**: Core generation logic, isolated and testable
- **Routes**: HTTP endpoints and request handling
- **Models**: Pydantic schemas for validation
- **Utils**: Shared utilities and file operations

## Production Deployment

For production deployment:
1. Remove `reload=False` from main.py
2. Use multiple workers: `uvicorn main:app --workers 4`
3. Add authentication to endpoints
4. Implement request rate limiting
5. Add database for job tracking
6. Use reverse proxy (nginx) for load balancing
7. Implement caching for repeated requests
8. Add comprehensive logging and monitoring

## License

Part of the Artist Amp platform.
