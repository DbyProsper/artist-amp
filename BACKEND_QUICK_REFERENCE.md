# Backend Integration - Quick Reference

## 🚀 Quick Start

### Environment Setup
```env
# .env (already configured for production)
VITE_API_BASE_URL=https://musicinsta-api-973497466485.us-central1.run.app

# .env.local (for local development)
VITE_API_BASE_URL=http://localhost:8000
```

### API Imports
```typescript
import {
  generateMusic,      // Create beats/instrumental
  generateSong,       // Create complete song (music+lyrics+cover)
  generateLyrics,     // Generate lyrics only
  generateImage,      // Generate images (cover/merch/poster)
  generateMerch,      // Shortcut for generateImage(type='merch')
  healthCheck,        // Verify backend is online
} from '@/lib/api';
```

## 📡 API Endpoints

### Music Generation
```typescript
const response = await generateMusic(prompt, {
  genre: 'amapiano',           // required
  mood: 'energetic',           // required
  language: 'en',              // optional, default: 'en'
  bpm: 112,                    // optional, default: 128
  user_tier: 'free',           // 'free' or 'premium'
});

// Returns: response.audio_url (GCS signed MP3 URL)
// Timeout: 120 seconds (45-60s typical)
```

### Complete Song (Music + Lyrics + Cover)
```typescript
const response = await generateSong(prompt, {
  genre: 'orchestral',
  mood: 'heroic',
  user_tier: 'free',
});

// Returns:
// - response.audio_url (MP3)
// - response.cover_url (PNG)
// - response.lyrics (text)
// Timeout: 300 seconds (90-150s typical)
```

### Lyrics Generation
```typescript
const response = await generateLyrics(prompt, {
  mood: 'romantic',     // optional
  genre: 'pop',         // optional
  language: 'en',       // optional
});

// Returns: response.lyrics (text)
// Timeout: 30 seconds
```

### Image Generation
```typescript
const response = await generateImage(prompt, {
  image_type: 'cover',      // 'cover' | 'merch' | 'poster'
  genre: 'pop',             // optional
  user_tier: 'free',
});

// Returns: response.cover_url (GCS signed PNG URL)
// Timeout: 30 seconds
```

### Merchandise Images
```typescript
const response = await generateMerch(prompt, {
  genre: 'pop',
  user_tier: 'free',
});

// Alias for: generateImage(prompt, { image_type: 'merch', ... })
```

### Health Check
```typescript
const response = await healthCheck();
// Returns: { success: true } if backend is online
// Timeout: 10 seconds
```

## ✅ Response Structure

All endpoints return:
```typescript
interface ApiResponse {
  success: boolean;          // true/false
  data?: {...};              // Raw backend response
  error?: string;            // Error message if failed
  audio_url?: string;        // Normalized audio URL
  cover_url?: string;        // Normalized image URL
  lyrics?: string;           // Normalized lyrics text
}
```

Usage:
```typescript
const response = await generateMusic(prompt, options);

if (response.success) {
  // Use normalized fields (work across all endpoints)
  const audioUrl = response.audio_url;    // MP3 URL
  const imageUrl = response.cover_url;    // PNG URL
  const lyrics = response.lyrics;         // Text
  
  // Or access raw data
  console.log(response.data);
} else {
  console.error(response.error);
}
```

## ⏱️ Timeouts

| Endpoint | Timeout | Typical Time |
|----------|---------|--------------|
| Music | 120s | 45-60s |
| Song | 300s | 90-150s |
| Image | 30s | 30-45s |
| Lyrics | 30s | 5-10s |
| Health | 10s | <1s |

Show loading UI while waiting:
```typescript
const [isGenerating, setIsGenerating] = useState(false);

const handleGenerate = async () => {
  setIsGenerating(true);
  try {
    const response = await generateMusic(prompt, options);
    // ...
  } finally {
    setIsGenerating(false);
  }
};

// Render:
{isGenerating && <Spinner />}
```

## 🎧 Audio Playback

GCS signed URLs are direct MP3 files - play directly:

```typescript
// Simple HTML audio element
<audio src={response.audio_url} controls autoPlay />

// Custom player
const audio = new Audio(response.audio_url);
audio.play();

// React component
<audio src={audioUrl} controls className="w-full" />
```

No CORS setup needed - signed URLs bypass CORS!

## 🖼️ Image Display

PNG images from GCS work directly:

```typescript
<img src={response.cover_url} alt="Cover art" />
```

## 🔧 Error Handling

```typescript
try {
  const response = await generateMusic(prompt, options);
  
  if (!response.success) {
    // Specific error from backend
    console.error(response.error);
    // Possible errors:
    // - "Request timeout after 120 seconds"
    // - "Network error"
    // - "API error: ..."
  } else {
    // Success - use response.audio_url
  }
} catch (error) {
  // Uncaught error (shouldn't happen)
  console.error(error);
}
```

## 👤 User Tier Support

Always include `user_tier`:

```typescript
await generateMusic(prompt, {
  user_tier: user.tier === 'premium' ? 'premium' : 'free',
});
```

- **free**: Lower quality, faster generation, good for demos
- **premium**: Higher quality, may take longer, best results

## 💾 Persistence (History)

Save to localStorage:

```typescript
interface GeneratedItem {
  id: string;
  feature: 'beat' | 'lyrics' | 'song' | 'cover' | 'merch';
  prompt: string;
  audioUrl?: string;
  imageUrl?: string;
  lyrics?: string;
  createdAt: Date;
  metadata: {
    genre?: string;
    mood?: string;
    bpm?: number;
  };
}

// Save
const item: GeneratedItem = {
  id: Date.now().toString(),
  feature: 'beat',
  prompt: 'upbeat amapiano',
  audioUrl: response.audio_url,
  createdAt: new Date(),
  metadata: { genre: 'amapiano', mood: 'energetic' }
};

const history = JSON.parse(localStorage.getItem('studio_history') || '[]');
history.unshift(item);
localStorage.setItem('studio_history', JSON.stringify(history.slice(0, 50)));

// Load
const saved = JSON.parse(localStorage.getItem('studio_history') || '[]');
saved.forEach(item => item.createdAt = new Date(item.createdAt));
```

## 📊 Current Implementation Status

✅ Backend endpoints: All 5 configured and working
✅ Timeouts: Correct for each endpoint
✅ Response normalization: All formats handled
✅ GCS signed URLs: Direct playback (no CORS)
✅ User tier: Supported in music/song endpoints
✅ Error handling: Catches all failure cases
✅ StudioPage: Updated to use new API with user tier

## 🔗 Full Documentation

- **Backend Integration Guide**: `BACKEND_INTEGRATION_GUIDE.md`
- **Testing & Troubleshooting**: `TESTING_AND_TROUBLESHOOTING.md`
- **API Examples**: `API_INTEGRATION_EXAMPLES.tsx`
- **API Configuration**: `src/config/api.ts`
- **API Implementation**: `src/lib/api.ts`

## 🧪 Quick Test

```bash
# Test music generation
curl -X POST http://localhost:8000/music/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "upbeat amapiano",
    "genre": "amapiano",
    "mood": "energetic",
    "language": "en",
    "bpm": 112,
    "user_tier": "free"
  }'

# Wait 45-60 seconds for MP3 URL response
```

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Request timeout" | Music generation is slow. Wait or retry. |
| "Network error" | Backend not running. Check `/health` endpoint. |
| Audio won't play | URL may be expired (7 days max). Request fresh URL. |
| CORS error | Shouldn't happen with signed URLs. Check full URL is being used. |
| HTTP 500 error | Backend processing failed. Check backend logs. |
| HTTP 422 error | Invalid request format. Verify prompt, genre, mood, user_tier. |

See `TESTING_AND_TROUBLESHOOTING.md` for detailed troubleshooting.

---

**Status**: ✅ Ready for production use
**Last Updated**: April 21, 2026
**Backend**: https://musicinsta-api-973497466485.us-central1.run.app
