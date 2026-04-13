# FL Studio-Inspired Studio Refactor: Setup & Quick Start

## 📍 What Changed

Your old **multi-tab OnlineStudioPage** is now **two beautiful separate pages**:

### 1. NEW: StudioPage (/studio) 
- **Two-state interface**: Creation Mode → Studio Mode
- Minimal, focused UI for best creative experience
- Modern, FL Studio-inspired design
- Smooth animations & transitions

### 2. OLD: OnlineStudioPage (/studio-legacy)
- Still available if you want the old multi-tab interface
- No breaking changes to existing functionality

---

## 🎯 Quick Navigation

### To Use The New Studio
```
Visit: http://localhost:8082/studio
```

### To Use The Old Studio (if needed)
```
Visit: http://localhost:8082/studio-legacy
```

---

## 🧩 Component Reference

### Creation Mode Components

#### BPMSlider
- **Location**: `src/components/studio/BPMSlider.tsx`
- **Use**: Place at top of creation form
- **Props**: genre, bpm, onBPMChange, disabled
- **Shows**: "BPM: 112 • Private School Groove"

#### PromptBox
- **Location**: `src/components/studio/PromptBox.tsx`
- **Use**: Main input for song descriptions
- **Props**: value, onChange, onSubmit, loading, maxLength, disabled
- **Limits**: 120 characters max (configurable)

#### PresetButtons
- **Location**: `src/components/studio/PresetButtons.tsx`
- **Use**: Genre quick-select (8 presets)
- **Props**: onPresetSelect, disabled
- **Returns**: { genre, bpm, mood, name, icon, ... }

#### MoodPresets
- **Location**: `src/components/studio/MoodPresets.tsx`
- **Use**: Select a mood (single choice)
- **Props**: selected, onSelect, disabled
- **Options**: Chill, Emotional, Club, Dark, Spiritual

#### LanguagePresets
- **Location**: `src/components/studio/LanguagePresets.tsx`
- **Use**: Select language (single choice)
- **Props**: selected, onSelect, disabled
- **Options**: English (SA), isiZulu, isiXhosa, Sesotho, Afrikaans, Tsotsitaal

### Studio Mode Components

#### AudioPlayer
- **Location**: `src/components/studio/AudioPlayer.tsx`
- **Use**: Playback controls in Studio Mode
- **Props**: src, title, genre, bpm, onDownload, isLoading
- **Features**: Play/pause, progress, volume, time display, waveform visualization

#### StudioView
- **Location**: `src/components/studio/StudioView.tsx`
- **Use**: Full Studio Mode interface (player + sidebar controls)
- **Props**: data, callbacks for BPM/mood/language changes, regenerate, back, download
- **Displays**: Player, lyrics, cover, merch tabs, and control sidebar

---

## 🔧 Integration Points

### Adding to Your Navigation
Update your nav/sidebar to link to the new Studio:

```tsx
// Before
<Link to="/studio">Studio</Link>

// Still works! Now points to new two-state interface
```

### Updating API Calls
The `generateBeats()` call receives:

```tsx
const fullPrompt = `${prompt} // Genre: ${genre}, BPM: ${bpm}, Mood: ${mood}, Language: ${language}`;
```

Your backend should parse this and adjust generation accordingly.

---

## 🎨 Customizing the UI

### BPM Ranges
Edit in `BPMSlider.tsx`:
```tsx
const BPM_RANGES: Record<string, BPMConfig> = {
  amapiano: { min: 108, max: 115, default: 112, description: 'Private School Groove' },
  // ... modify ranges here
};
```

### Mood Options
Edit in `MoodPresets.tsx`:
```tsx
const MOOD_PRESETS: MoodPreset[] = [
  { id: 'chill', label: 'Chill', icon: <Headphones />, ... },
  // ... add/remove moods here
];
```

### Language Options
Edit in `LanguagePresets.tsx`:
```tsx
const LANGUAGE_PRESETS: LanguagePreset[] = [
  { id: 'english', label: 'English', nativeLabel: 'English (SA)', code: 'en-ZA' },
  // ... add/remove languages here
];
```

### Colors & Styling
All components use Tailwind CSS. Modify in:
- Gradient colors: `from-primary/5 to-accent/5`
- Borders: `border-primary/20`
- Backgrounds: `bg-background/40`

---

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

Output: `dist/` folder
- Tested & optimized
- All components bundled
- CSS optimized with Tailwind
- JavaScript minified

### Deploy the Dist Folder
```bash
# Your deployment platform
npm run build
# Deploy dist/ to your hosting
```

---

## 🐛 Troubleshooting

### Audio Not Playing?
1. Check browser console for CORS errors
2. Verify API returns valid base64 audio
3. Try different browser (some have auto-play restrictions)

### Preset Button Not Responding?
1. Check `onPresetSelect` prop is passed
2. Verify handler is defined in parent component
3. Check disabled state isn't blocking interaction

### UI Not Responsive on Mobile?
1. All components use responsive Tailwind classes
2. Check viewport meta tag in `index.html`
3. Test in Chrome DevTools device emulation

### State Not Updating?
1. Check console for React errors
2. Verify setter functions are being called
3. Check for stale closures in callbacks

---

## 📊 Performance Tips

1. **Audio pre-loading**: Player loads metadata automatically
2. **Lazy image loading**: Add `loading="lazy"` to cover images
3. **Optimize presets**: Memoize if >100 presets
4. **Debounce BPM**: Wrap `onBPMChange` in useCallback
5. **Code splitting**: Components are tree-shakeable

---

## 🔐 Security Notes

1. **API calls**: Use error handler for proper error messages
2. **File uploads**: Validate file size before upload
3. **XSS prevention**: All text is sanitized by React
4. **CORS**: Ensure API allows cross-origin requests

---

## 📚 Documentation Files

- **This file**: `SETUP_GUIDE.md` (quick start)
- **Detailed docs**: `STUDIO_REFACTOR_DOCS.md` (architecture, components, flow)

---

## 💬 Need Help?

### Common Tasks

**Q: How do I change the BPM range for a genre?**
A: Edit `BPM_RANGES` in `src/components/studio/BPMSlider.tsx`

**Q: How do I add a new mood?**
A: Add to `MOOD_PRESETS` in `src/components/studio/MoodPresets.tsx`

**Q: How do I add a new language?**
A: Add to `LANGUAGE_PRESETS` in `src/components/studio/LanguagePresets.tsx`

**Q: Can I customize the colors?**
A: Yes! Edit Tailwind class names in any component (e.g., `from-primary/5`)

**Q: How do I implement the Save button?**
A: In `StudioPage.tsx`, implement `handleSaveTrack()` using your SongService

---

## ✅ Testing Your Setup

1. Navigate to http://localhost:8082/studio
2. Try typing a prompt (click input box)
3. Click a preset button and watch form populate
4. Select a mood (single select)
5. Select a language (single select)
6. Click "Create Track" button
7. Wait for generation (should auto-play)
8. In Studio Mode, try:
   - Play/pause audio
   - Adjust BPM slider
   - Change mood/language
   - Click download button
   - Click back button

That's it! You now have a professional FL Studio-inspired studio interface. 🎉

