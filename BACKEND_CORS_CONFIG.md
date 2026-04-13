# Backend CORS Configuration Guide

## Current Status
The FastAPI backend has CORS middleware configured in `backend/main.py`, but requires proper environment-based configuration for production deployment.

## Current Configuration (Development)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex="http://.*",
)
```

## Issues to Address
1. **Redundant Configuration**: `allow_origins=["*"]` and `allow_origin_regex` are both set
2. **Security**: Allowing all origins (`["*"]`) is insecure for production
3. **Credentials**: Setting `allow_credentials=True` with `allow_origins=["*"]` violates CORS spec
4. **Frontend Origin**: Need to whitelist the actual frontend deployment URL

## Solution

### For Development
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### For Production (Environment-based)
```python
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
FRONTEND_URLS = [url.strip() for url in FRONTEND_URL.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Environment Variables to Set
On your backend deployment (Cloud Run, etc.):
```
FRONTEND_URL=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

## Implementation Steps

### 1. Update `backend/main.py`
```python
import os
from fastapi.middleware.cors import CORSMiddleware

# Read CORS origins from environment
FRONTEND_URLS = os.getenv("FRONTEND_URL", "http://localhost:3000,http://localhost:5173").split(",")
FRONTEND_URLS = [url.strip() for url in FRONTEND_URLS]

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### 2. Set Environment Variables on Cloud Run
```bash
gcloud run deploy musicinsta-api \
  --set-env-vars="FRONTEND_URL=https://your-frontend.com,https://www.your-frontend.com" \
  --region=us-central1
```

### 3. Update Frontend `.env`
The frontend at `c:\Users\samth\Programming stuff\artist-amp\.env` already has:
```
VITE_API_BASE_URL="https://musicinsta-ai-973497466485.us-central1.run.app"
```

Verify this URL matches your deployed backend.

## Testing CORS
```bash
# Test from frontend origin
curl -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://your-backend-url/generate/music
```

Should return headers:
- `Access-Control-Allow-Origin: https://your-frontend.com`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: *`

## Endpoints Requiring CORS
- `POST /generate/music` - Music generation
- `POST /generate/beat` - Beat generation
- `POST /generate/lyrics` - Lyrics generation
- `POST /generate/cover` - Cover art generation
- `GET /health` - Health check
- `POST /generate-music`, `/generate-lyrics`, etc. (alternate formats)

## Common Issues & Solutions

### Issue: "No 'Access-Control-Allow-Origin' header"
**Cause**: Frontend origin not in allowed list
**Solution**: Add your frontend URL to `FRONTEND_URL` environment variable

### Issue: CORS fails but same-origin works
**Cause**: Browser treating as cross-origin (different protocol/port)
**Solution**: Ensure `allow_credentials=True` and origin matches exactly (https vs http, with/without www)

### Issue: Preflight requests (OPTIONS) failing
**Cause**: OPTIONS method not allowed
**Solution**: Ensure `allow_methods=["*"]` or explicitly include "OPTIONS"

## Next Steps
1. Deploy updated backend with CORS configuration
2. Set `FRONTEND_URL` environment variable to your frontend domain
3. Test endpoints from browser console
4. Monitor backend logs for CORS issues

## References
- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
