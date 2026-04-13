# Complete Backend CORS Configuration Guide

## Overview
This guide provides step-by-step instructions to properly configure CORS on the deployed FastAPI backend to communicate securely with your frontend.

## Current Backend Location
- **URL**: https://musicinsta-ai-973497466485.us-central1.run.app
- **Framework**: FastAPI
- **Deployment**: Google Cloud Run

## Problem Statement
The backend currently allows all origins (`allow_origins=["*"]`) which:
1. ❌ Violates CORS spec when `allow_credentials=True`
2. ❌ Is insecure for production
3. ❌ Can cause credential/authentication issues
4. ✅ Works for development but needs fixing for production

## Solution: Environment-Based CORS Configuration

### Step 1: Update Backend Code

Edit `backend/main.py` and replace the CORS configuration section:

**Current (Development Only)**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex="http://.*",
)
```

**New (Environment-Based)**:
```python
import os

# Get frontend URLs from environment variable
FRONTEND_URLS = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000,http://localhost:5173"  # development defaults
).split(",")

# Clean up whitespace
FRONTEND_URLS = [url.strip() for url in FRONTEND_URLS if url.strip()]

logger.info(f"Configured CORS for origins: {FRONTEND_URLS}")

# Configure CORS with explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_origin_regex=None,  # Remove regex, use explicit origins only
)
```

### Step 2: Determine Your Frontend URL

Your frontend is currently at or will be deployed to:
- **Example**: `https://artist-amp.your-domain.com`
- **Or**: `https://your-netlify-site.netlify.app`
- **Or**: `https://your-vercel-site.vercel.app`

### Step 3: Deploy Updated Backend

#### Option A: Google Cloud Run (Recommended)

```bash
# From your backend directory
cd backend

# Deploy with CORS configuration
gcloud run deploy musicinsta-api-cors-fixed \
  --source . \
  --region us-central1 \
  --platform managed \
  --set-env-vars="FRONTEND_URL=https://your-frontend-domain.com,https://www.your-frontend-domain.com" \
  --memory 1GB \
  --timeout 300
```

Or update existing deployment:
```bash
gcloud run deploy musicinsta-ai-973497466485 \
  --update-env-vars="FRONTEND_URL=https://your-frontend-domain.com" \
  --region us-central1
```

#### Option B: Manual Cloud Run Console
1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select your service: `musicinsta-ai-973497466485`
3. Click **Edit & Deploy New Revision**
4. Go to **Runtime settings** (bottom of form)
5. Add environment variable:
   - Key: `FRONTEND_URL`
   - Value: `https://your-frontend-domain.com,https://www.your-frontend-domain.com`
6. Click **Deploy**

### Step 4: Test CORS Configuration

#### Test 1: Browser Console
```javascript
// In browser console on your frontend
fetch('https://musicinsta-ai-973497466485.us-central1.run.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

#### Test 2: Check CORS Headers
```bash
curl -i -H "Origin: https://your-frontend-domain.com" \
  https://musicinsta-ai-973497466485.us-central1.run.app/health
```

Look for headers:
```
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
```

#### Test 3: Preflight Request
```bash
curl -X OPTIONS -i \
  -H "Origin: https://your-frontend-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://musicinsta-ai-973497466485.us-central1.run.app/generate/music
```

### Step 5: Update Frontend Configuration

Update `frontend/.env`:
```
VITE_API_BASE_URL=https://musicinsta-ai-973497466485.us-central1.run.app
```

This is already configured in your `.env` file.

## Troubleshooting

### Issue: "No 'Access-Control-Allow-Origin' header is present"

**Cause**: Frontend domain not in `FRONTEND_URL` environment variable

**Fix**:
```bash
# Check current environment
gcloud run services describe musicinsta-ai-973497466485 --region us-central1

# Update environment
gcloud run deploy musicinsta-ai-973497466485 \
  --update-env-vars="FRONTEND_URL=https://your-actual-frontend-domain.com" \
  --region us-central1
```

### Issue: Backend returns 500 error on OPTIONS request

**Cause**: Preflight request not properly handled

**Fix**: Ensure OPTIONS method is included in `allow_methods`:
```python
allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Include OPTIONS
```

### Issue: Credentials not being sent

**Cause**: Missing `allow_credentials=True` or incorrect headers

**Fix**: 
1. Ensure backend has `allow_credentials=True`
2. Frontend fetch requests must include:
   ```javascript
   fetch(url, {
     method: 'POST',
     credentials: 'include',  // This is important!
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(data)
   })
   ```

### Issue: CORS works in Postman but not in browser

**Cause**: Browser enforces stricter CORS rules

**Fix**:
1. Check browser console for exact error message
2. Verify origin matches exactly (case-sensitive)
3. Check for protocol difference (http vs https)
4. Check for port differences (localhost:3000 vs localhost:3001)

## Endpoints That Need CORS

All these endpoints will work after configuration:

```
POST /generate/music
POST /generate/beat  
POST /generate/lyrics
POST /generate/cover
POST /generate-music (alternate format)
POST /generate-beat (alternate format)
POST /generate-lyrics (alternate format)
POST /generate-cover (alternate format)
GET /health
GET /docs (API documentation)
GET /redoc (API documentation)
```

## Environment Variable Examples

**For Local Development**:
```
FRONTEND_URL=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000
```

**For Single Frontend Domain**:
```
FRONTEND_URL=https://artist-amp.com
```

**For Multiple Subdomains**:
```
FRONTEND_URL=https://app.artist-amp.com,https://www.artist-amp.com,https://artist-amp.com
```

**For Development + Production**:
```
FRONTEND_URL=http://localhost:3000,https://artist-amp.com
```

## Best Practices

1. ✅ **Always use HTTPS in production**, never HTTP
2. ✅ **Include both with and without www** if needed:
   ```
   FRONTEND_URL=https://artist-amp.com,https://www.artist-amp.com
   ```
3. ✅ **Log CORS configuration** in startup (we did this in code)
4. ✅ **Test preflight requests** before going to production
5. ✅ **Monitor** Cloud Run logs for CORS-related errors:
   ```bash
   gcloud run logs read musicinsta-ai-973497466485 --region us-central1 --limit 50
   ```

## Reference Implementation (Your Frontend)

Your frontend at `src/config/api.ts` reads:
```typescript
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
```

This correctly loads from `.env`:
```
VITE_API_BASE_URL=https://musicinsta-ai-973497466485.us-central1.run.app
```

## Next Steps After Deployment

1. ✅ Deploy backend with CORS fix
2. ✅ Set `FRONTEND_URL` environment variable to your frontend domain
3. ✅ Test endpoints from browser
4. ✅ Verify no CORS errors in console
5. ✅ Monitor logs for any issues
6. ✅ Test all generation endpoints (music, lyrics, cover, etc.)

## Support

If CORS still fails after these steps:
1. Check backend logs: `gcloud run logs read musicinsta-ai-973497466485 --region us-central1 --limit 100`
2. Verify environment variable is set: `gcloud run services describe musicinsta-ai-973497466485 --region us-central1`
3. Check frontend domain exactly matches `FRONTEND_URL` (case-sensitive, https/http)
4. Look for typos in domain names

---

**Complete Guide Last Updated**: April 13, 2026
