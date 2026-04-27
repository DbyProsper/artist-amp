# Studio Integration - Testing Guide

## Quick Start

1. **Ensure dev server is running**
   ```bash
   cd "c:\Users\samth\Programming stuff\artist-amp"
   npm run dev
   # Server running at http://localhost:8081
   ```

2. **Navigate to studio**
   ```
   http://localhost:8081/studio
   ```

3. **Login** (if not already authenticated)
   - Use any test account or create new account

4. **Once logged in**, you should see the 7-tab interface

## Manual Testing Checklist

### ✅ Page Load
- [ ] Page loads at `/studio` without errors
- [ ] No errors in browser console (React Router warnings OK)
- [ ] Header shows with back button and user name
- [ ] All 7 tabs visible with emoji indicators

### 📝 Lyrics Tab
- [ ] Tab switches to lyrics generator
- [ ] Genre dropdown visible with options
- [ ] Mood selector visible
- [ ] Preset buttons appear (genre-based)
- [ ] Textarea for custom prompt appears
- [ ] "Generate Lyrics" button is clickable
- [ ] Loading state shows (spinner + "Generating..." text)
- [ ] After generation: Lyrics display in card
- [ ] Download/save buttons appear

**Test Generation**:
```
Genre: Amapiano
Mood: Energetic
Preset: "Party Vibes" (or custom prompt)
Expected: Lyrics text with creative content
```

### 🎵 Beats Tab
- [ ] Tab switches to beats generator
- [ ] Genre dropdown visible
- [ ] **BPM Slider visible** (60-180 range) ← Key test
- [ ] Mood selector visible
- [ ] Preset buttons appear
- [ ] "Generate Beat" button clickable
- [ ] Audio player appears after generation
- [ ] Play/pause controls work
- [ ] Download button appears

**Test Generation**:
```
Genre: Trap
BPM: 140 (test slider)
Mood: Aggressive
Expected: Audio file playable
```

### 🎶 Song Tab
- [ ] Tab switches to song generator
- [ ] All controls visible (genre, mood, language, BPM)
- [ ] "Generate Song" button clickable
- [ ] After generation: **3 sections visible**:
  1. Audio player (for music track)
  2. Image display (for cover art)
  3. Text display (for lyrics)
- [ ] Each section has download/save option

**Test Generation**:
```
Genre: Afrobeats
BPM: 110
Expected: Audio + Cover Image + Lyrics (all 3)
```

### 🖼️ Cover Tab
- [ ] Tab switches to cover art generator
- [ ] Genre-based presets visible
- [ ] No BPM control (disabled as expected) ✓
- [ ] Mood selector (optional)
- [ ] "Generate Cover" button clickable
- [ ] Image displays after generation
- [ ] Download button works

**Test Generation**:
```
Genre: R&B
Expected: Album cover art image
```

### 📢 Poster Tab
- [ ] Tab switches to poster generator
- [ ] Category selector visible (concert, festival, etc.)
- [ ] Category-specific presets appear
- [ ] "Generate Poster" button clickable
- [ ] Poster image displays after generation
- [ ] Download button works

**Test Generation**:
```
Category: Concert
Expected: Event poster image
```

### 🛍️ Merch Tab
- [ ] Tab switches to merch generator
- [ ] **6 merch types visible**: T-shirt, Golf Shirt, Hoodie, Crop Top, Cap, Long Sleeve
- [ ] Type-specific presets appear when selecting each type
- [ ] "Generate Design" button clickable
- [ ] Merch design image displays
- [ ] Download button works

**Test Generation**:
```
Type: T-shirt
Expected: T-shirt design mockup
```

### 💬 Chat Tab
- [ ] Tab switches to chat interface
- [ ] **Text input box visible** at bottom ← Key requirement
- [ ] Message list visible (empty initially)
- [ ] Ctrl+Enter sends message (or button click)
- [ ] Sent message appears in chat
- [ ] AI response appears below
- [ ] **Refresh page** → Chat history still present (localStorage working)
- [ ] Can create new conversation
- [ ] Can rename conversations
- [ ] Can delete conversations

**Test Chat**:
```
Message: "Generate a hip hop beat"
Expected: AI responds with creative suggestions
After refresh: Message history persists
```

## Console Error Checks

### Should NOT see:
❌ `SyntaxError`
❌ `Cannot find module`
❌ `Undefined is not a function`
❌ `Expected 'return' or 'throw'`
❌ `chatWithAI is not exported`
❌ `enhanceAudio is not exported`

### Should see only:
⚠️ React Router Future Flag warnings (normal)
⚠️ Any backend API timeout warnings (expected if API slow)

## Backend Connectivity Tests

### Test Each Endpoint

1. **Lyrics Endpoint**
   - Open DevTools → Network tab
   - Generate lyrics
   - Check POST to `/lyrics/generate`
   - Status should be 200
   - Response should have `success: true, data: { lyrics: "..." }`

2. **Beats Endpoint**
   - Generate beat
   - Check POST to `/beats/generate`
   - Response should have `audio_url`
   - Audio player should load and play

3. **Song Endpoint**
   - Generate song
   - Check POST to `/song/generate`
   - Response should have:
     - `audio_url` (for music)
     - `cover_url` or `image_url` (for cover)
     - `lyrics` field (for text)

4. **Image Endpoint**
   - Generate cover: Check type=cover parameter
   - Generate poster: Check type=poster parameter
   - Generate merch: Check type=merch parameter
   - Response should have `image_url`

5. **Chat Endpoint**
   - Send message
   - Check POST to `/chat`
   - Response should have `message` field
   - Message should display in UI

## Performance Tests

- [ ] Page initial load time < 3 seconds
- [ ] Tab switching is instant (no reload)
- [ ] Loading indicators appear within 500ms of action
- [ ] Generation timeout messages appear if >60s
- [ ] No memory leaks (check DevTools Memory after 5 min usage)

## Responsive Design

Test on different screen sizes:
- [ ] Desktop (1920x1080) - All tabs visible
- [ ] Tablet (768x1024) - Tabs may wrap, still accessible
- [ ] Mobile (375x667) - Tabs in grid or scroll, readable

## Firebase Integration

- [ ] User profile loads (name/username visible in header)
- [ ] Real-time profile updates work (if profile changes elsewhere)
- [ ] Can generate as verified/admin user
- [ ] Generated content associates with user account

## Success Criteria

✅ **All 7 tabs accessible and functional**
✅ **No console errors**
✅ **All backend endpoints respond correctly**
✅ **Chat persists across page reloads**
✅ **Audio generation and playback works**
✅ **Image generation displays correctly**
✅ **BPM slider works in Beats/Song tabs**
✅ **Proper loading states show**
✅ **Download/save buttons functional**

## Troubleshooting

### Page shows "Please log in"
- [ ] Verify user is authenticated in Firebase
- [ ] Check browser console for auth errors
- [ ] Try signing out and back in

### Tabs don't switch
- [ ] Check console for JavaScript errors
- [ ] Verify Tabs component from shadcn/ui is installed
- [ ] Try hard refresh (Ctrl+Shift+R)

### Generation returns error
- [ ] Check Network tab for API response
- [ ] Verify `VITE_API_BASE_URL` is correct in .env
- [ ] Check backend is running and responding
- [ ] Look for timeout errors (may need to wait longer)

### Audio won't play
- [ ] Check audio URL in Network tab
- [ ] Verify CORS headers on audio file
- [ ] Try different audio format if available
- [ ] Check browser audio permissions

### Chat not persisting
- [ ] Check localStorage in DevTools (Application tab)
- [ ] Verify localStorage is not disabled
- [ ] Check browser storage quota
- [ ] Look for localStorage errors in console

## Reporting Issues

When reporting issues, include:
1. Browser console screenshot (Ctrl+Shift+I → Console)
2. Network tab showing API request/response
3. Exact steps to reproduce
4. Expected vs actual behavior
5. Browser version and OS
6. Device/screen size

---

**Happy Testing!** 🎵
