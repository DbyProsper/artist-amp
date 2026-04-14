# API Layer Quick Reference

## Import Functions
```typescript
import { 
  generateMusic,
  generateSong,
  generateLyrics,
  generateBeats,
  generateImage,
  generateMerch,
  enhanceAudio,
  chatWithAI,
  generateMusicFromAudio,
  generateImageFromUpload 
} from '@/lib/api';
```

## Quick Examples

### Generate Music
```typescript
const result = await generateMusic('upbeat electronic dance music');
if (result.success) {
  console.log('Audio URL:', result.audio_url);
} else {
  console.error(result.error);
}
```

### Generate Complete Song
```typescript
const result = await generateSong('sad piano ballad about missing home');
if (result.success) {
  console.log('Audio:', result.audio_url);
  console.log('Lyrics:', result.lyrics);
}
```

### Generate Lyrics
```typescript
const result = await generateLyrics('love song with jazz influences');
if (result.success) {
  console.log('Lyrics:', result.lyrics);
}
```

### Generate Beats
```typescript
const result = await generateBeats('trap beat with fast hi-hats, 140 BPM');
if (result.success) {
  console.log('Beat:', result.audio_url);
  console.log('Duration:', result.data?.duration);
}
```

### Generate Images
```typescript
// Album cover
const cover = await generateImage('cyberpunk album artwork', 'album-cover');

// Merchandise design
const merch = await generateMerch('band logo for indie rock group', 'tshirt');

// General image
const img = await generateImage('sunset over mountains');
```

### File-Based Generation
```typescript
// From audio file
const result = await generateMusicFromAudio(
  audioFile,
  'make it more electronic'
);

// From image file
const result = await generateImageFromUpload(
  imageFile,
  'convert this to a painting style'
);
```

### Enhance Audio
```typescript
const result = await enhanceAudio(audioFile, 'denoise');
// Types: denoise, normalize, compress, etc.
```

### Chat with AI
```typescript
const result = await chatWithAI('What makes a good song?');
console.log('Response:', result.message || result.data);

// With conversation history
const history = [
  { role: 'user', content: 'Tell me about music theory' },
  { role: 'assistant', content: 'Music theory is...' }
];
const result = await chatWithAI('Can you explain chords?', 'gemini', history);
```

## Response Structure
```typescript
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  
  // Convenience fields
  audio_url?: string;
  audio_base64?: string;
  lyrics?: string;
  cover_url?: string;
}
```

## Error Handling
```typescript
const result = await generateMusic('prompt');

if (!result.success) {
  // Error cases:
  // - Request timeout
  // - Network error
  // - Invalid JSON response
  // - API returned failure
  // - HTTP error (4xx, 5xx)
  
  const errorMsg = result.error || 'Unknown error';
  console.error('API Error:', errorMsg);
  
  // User feedback
  toast.error(errorMsg, {
    description: 'Please try again or contact support'
  });
}
```

## Environment
Set in `.env`:
```
VITE_API_BASE_URL=https://your-backend-url
```

## Key Points
- ✅ All requests include `Authorization` header via middleware if needed
- ✅ 30-second timeout for AI generation
- ✅ Supports FormData for file uploads
- ✅ Backward compatible response field mapping
- ✅ No SSL/certificate issues with proper setup
