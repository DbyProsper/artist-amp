# Artist-Amp Studio Page: FL Studio-Inspired Refactor

## 🎯 Overview

Transformed the Artist-Amp UI from a multi-tab interface into a modern, minimal, FL Studio-inspired **two-state interface**:

1. **CREATION MODE** - Simple, focused input UI
2. **STUDIO MODE** - Powerful DAW-like output interface

---

## 🏗️ Architecture

### Two-State Interface Flow

```
User lands on /studio
        ↓
CREATION MODE (Initial)
  - BPM slider
  - Prompt input box
  - Genre presets
  - Mood presets  
  - Language presets
        ↓ (User clicks Create Track)
API Call to generateBeats()
        ↓ (Success response)
STUDIO MODE (Post-generation)
  - Audio player (center)
  - Content tabs (Lyrics, Cover, Merch)
  - Control sidebar (BPM, Mood, Language editors)
  - Download & Save buttons
```

---

## 📦 Component Structure

### New Components (src/components/studio/)

#### 1. **PromptBox.tsx**
**Purpose:** Chat-style prompt input for song descriptions

**Features:**
- Large, focused textarea (3 rows)
- Real-time character counter (max 120 chars)
- Auto-focus on mount
- Animated progress bar (fills as user types)
- Color feedback (warning at <20 chars remaining)
- Ctrl/Cmd + Enter to submit
- Visual feedback (glassmorphism on focus)
- Placeholder: "Describe your song idea in a few words..."

**Events:**
- `onChange(value)` - Character limited input updates
- `onSubmit()` - Generate track trigger

---

#### 2. **BPMSlider.tsx** (Existing - Enhanced)
**Updated to support two-state interface**

**Genre-based BPM ranges:**
- Amapiano: 108-115 (default 112)
- Gqom: 125-130 (default 127)
- Trap: 130-160 (default 140)
- R&B: 60-95 (default 75)
- Afrobeats: 95-110 (default 105)
- House: 120-130 (default 128)
- Hip-Hop: 85-115 (default 95)

**Features:**
- Dynamic range based on selected genre
- Genre description display
- Percentage-based visual progress
- Drag detection for user interaction
- Smooth animations

---

#### 3. **PresetButtons.tsx** (Existing - Integrated)
**8 music genre presets with auto-fill**

**Presets Array:**
1. Amapiano (Soulful) - 112 BPM, mood: soulful
2. Amapiano (Club Energy) - 115 BPM, mood: energetic
3. Gqom (Deep House) - 127 BPM, mood: hypnotic
4. Trap (Hard-Hitting) - 140 BPM, mood: aggressive
5. Afrobeats (Groove) - 105 BPM, mood: uplifting
6. R&B (Smooth) - 75 BPM, mood: romantic
7. House (Dance) - 128 BPM, mood: euphoric
8. Hip-Hop (Boom Bap) - 95 BPM, mood: analytical

**Event:** `onPresetSelect(preset)` - Sets genre, BPM, mood, and optional prompt template

---

#### 4. **MoodPresets.tsx** (NEW)
**5 selectable mood options**

**Moods:**
- Chill (Headphones icon) - Relaxed vibes
- Emotional (Heart icon) - Deep feelings
- Club (Zap icon) - Dance floor
- Dark (Skull icon) - Intense mood
- Spiritual (Sparkles icon) - Transcendent

**Features:**
- Single selection (radio-style)
- Gradient backgrounds per mood
- Hover descriptions
- Staggered animations (delay-based)
- Icon indicators

**Event:** `onSelect(moodId)` - Update mood state

---

#### 5. **LanguagePresets.tsx** (NEW)
**6 South African languages + English**

**Languages:**
- English (SA) 🇿🇦 - Default
- isiZulu 🗣️
- isiXhosa 🗣️
- Sesotho 🗣️
- Afrikaans 🇿🇦
- Tsotsitaal 🔥 (South African slang)

**Features:**
- Single selection
- Native language labels
- Emoji icons for visual distinction
- Grid layout (3 columns)

**Event:** `onSelect(languageId)` - Update language state

---

#### 6. **AudioPlayer.tsx** (NEW)
**Full-featured media player**

**Components:**
- Play/Pause button (center)
- Progress bar with scrubbing
- Time display (current/total)
- Volume control (with slider popup)
- Download button
- Title + genre + BPM display

**Features:**
- Real-time time updates
- Smooth progress animation
- Volume control (0-1 range, 0.1 steps)
- Keyboard support (can be extended)
- Responsive layout
- Graceful error handling
- Auto-load duration metadata

**Props:**
```tsx
interface AudioPlayerProps {
  src: string;          // Audio URL or base64
  title: string;        // Song title
  genre?: string;       // Genre display
  bpm?: number;         // BPM display
  duration?: number;    // Optional duration override
  onDownload?: () => void;
  isLoading?: boolean;
}
```

---

#### 7. **StudioView.tsx** (NEW)
**Post-generation interface with DAW-like layout**

**Three-column Grid:**

**Left Column (2/3 width):**
- Audio player (top)
- Content tabs (bottom):
  - **Lyrics Tab** - Display generated lyrics with copy button
  - **Cover Art Tab** - Album cover image with download
  - **Merch Tab** - Front/back merchandise designs

**Right Column (1/3 width - Sidebar):**
- BPM slider (editable)
- Mood selector (editable)
- Language selector (editable)
- Save to Library button

**Header Controls:**
- Back button → returns to Creation Mode
- Regenerate button → regenerates with current params
- Error alert (if generation fails)

**Features:**
- Smooth fade-in animations
- Click-to-copy for lyrics
- Download buttons for all media
- Responsive grid → stacks on mobile
- Loading states for regenerate/save operations
- Full error handling

---

#### 8. **StudioPage.tsx** (NEW)
**Main page implementing two-state interface**

**STATE STRUCTURE:**
```tsx
// Creation Mode
const [prompt, setPrompt] = useState('');
const [selectedGenre, setSelectedGenre] = useState('amapiano');
const [selectedMood, setSelectedMood] = useState('chill');
const [selectedLanguage, setSelectedLanguage] = useState('english');
const [bpm, setBpm] = useState(112);
const [isGenerating, setIsGenerating] = useState(false);
const [creationError, setCreationError] = useState('');

// Studio Mode
const [isStudioMode, setIsStudioMode] = useState(false);
const [studioData, setStudioData] = useState<StudioViewData | null>(null);
const [isRegenerating, setIsRegenerating] = useState(false);
const [studioError, setStudioError] = useState('');
const [isSaving, setIsSaving] = useState(false);
```

**KEY HANDLERS:**

1. **handleGenerateTrack()**
   - Validates prompt length > 0
   - Builds full prompt with metadata
   - Calls `generateBeats()` API
   - Extracts audio base64
   - Populates `studioData` with results
   - Transitions to Studio Mode
   - Auto-plays audio
   - Shows success toast

2. **handleRegenerate()**
   - Calls API with updated parameters (BPM, Mood, Language)
   - Updates only audio URL in `studioData`
   - Preserves other metadata
   - Shows success/error toast

3. **handleSaveTrack()**
   - Mock implementation (ready for SongService integration)
   - Shows saving spinner
   - Triggers success toast

4. **handleDownloadTrack()**
   - Fetches audio blob
   - Creates download link
   - Triggers browser download with proper filename

5. **handleBackToCreation()**
   - Clears all studio state
   - Returns to Creation Mode
   - Resets form for next creation

**CREATION MODE UI:**
```
Welcome Header (centered)
    ↓
BPM Slider (top control)
    ↓
PromptBox (large, centered input)
    ↓
PresetButtons (genre presets)
    ↓
MoodPresets (5 moods in grid)
    ↓
LanguagePresets (6 languages in grid)
    ↓
Error Display (if any)
```

**STUDIO MODE UI (Animated transition via AnimatePresence):**
- Sticky header with back/regenerate buttons
- Two-column layout:
  - Main: Player + tabs
  - Sidebar: Controls + Save button

---

## 🎨 Design System

### Visual Hierarchy
- **Creation Mode**: Minimal, welcoming, focuses on prompt input
- **Studio Mode**: Powerful controls, media-rich, DAW-inspired

### Color & Gradient Usage
- Primary colors for active states (genre, preset, mood)
- Glassmorphism backgrounds (backdrop-blur-xl)
- Soft shadows for depth
- Smooth transitions between states

### Typography
- Large, bold headers
- Monospace for BPM/time displays
- Consistent sizing hierarchy

### Spacing
- 8px base unit + multiples
- Generous padding in creation mode (breathing room)
- Compact controls in studio mode (efficiency)

### Animations
- Framer Motion for transitions
- `AnimatePresence` for mode switching
- Staggered animations for preset items
- Smooth progress bar updates
- Scale transforms on hover/tap

---

## 🔌 API Integration

### generateBeats() Call
**Input:**
```tsx
const fullPrompt = `${prompt} // Genre: ${genre}, BPM: ${bpm}, Mood: ${mood}, Language: ${language}`;
const result = await generateBeats(fullPrompt);
```

**Expected Response:**
```json
{
  "success": true,
  "audio_base64": "...",
  "improved_prompt": "...",  // Optional, shows in lyrics tab
  "cover_url": "...",         // Optional, shows in cover tab
  "duration": 180             // Optional
}
```

### Error Handling
- Validates API response
- Displays user-friendly error messages
- Fallback to error state in both modes
- Toast notifications for feedback

---

## 📱 Responsive Design

### Breakpoints
- **Mobile** (<640px): Single column, full-width controls
- **Tablet** (640px-1024px): Stacked layout with adjusted spacing
- **Desktop** (>1024px): Three-column grid (Studio Mode) or centered Creation Mode

### Mobile-Optimized Features
- Touch-friendly button sizes (40px+ hitbox)
- Vertical preset grids
- Full-width input box
- Accessible font sizes

---

## 🔄 State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     StudioPage (Main)                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            CREATION MODE (isStudioMode=false)         │   │
│  │                                                       │   │
│  │  • BPM Slider                                         │   │
│  │  • PromptBox                                          │   │
│  │  • PresetButtons → handlePresetSelect()              │   │
│  │  • MoodPresets → setSelectedMood()                   │   │
│  │  • LanguagePresets → setSelectedLanguage()           │   │
│  │                                                       │   │
│  │  Generate Button → handleGenerateTrack()             │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                               │
│               │ API Call: generateBeats()                    │
│               │ Success → setStudioData()                    │
│               │           setIsStudioMode(true)              │
│               ↓                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            STUDIO MODE (isStudioMode=true)           │   │
│  │                                                       │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Left Column (2/3 width)                       │  │   │
│  │  │  • AudioPlayer (src, title, bpm, genre)       │  │   │
│  │  │  • Tabs: Lyrics | Cover | Merch              │  │   │
│  │  │    └─ Content from studioData               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Right Column (1/3 width - Sidebar)            │  │   │
│  │  │  • BPM Slider → setBpm()                      │  │   │
│  │  │  • MoodPresets → setSelectedMood()            │  │   │
│  │  │  • LanguagePresets → setSelectedLanguage()    │  │   │
│  │  │  • Regenerate → handleRegenerate()            │  │   │
│  │  │  • Save → handleSaveTrack()                   │  │   │
│  │  │  • Download → handleDownloadTrack()           │  │   │
│  │  │  • Back → handleBackToCreation()              │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

### Creation Mode
- [ ] BPM slider appears and is draggable
- [ ] BPM range updates when genre changes
- [ ] Prompt box accepts input (max 120 chars enforced)
- [ ] Character counter updates in real-time
- [ ] Preset buttons highlight on click and populate state
- [ ] Mood presets single-select works
- [ ] Language presets single-select works
- [ ] "Create Track" button triggers generation
- [ ] Loading spinner shows during generation
- [ ] Error messages display clearly

### Studio Mode
- [ ] Smooth transition animation from Creation → Studio
- [ ] Audio player loads and plays audio
- [ ] Play/pause button works
- [ ] Volume slider works
- [ ] Progress bar scrubbing works
- [ ] BPM slider updates values (sidebar)
- [ ] Mood selector updates values (sidebar)
- [ ] Language selector updates values (sidebar)
- [ ] Regenerate button calls API with new params
- [ ] Download button downloads audio file
- [ ] Back button returns to Creation Mode (clears state)
- [ ] Tabs switch between Lyrics/Cover/Merch
- [ ] Copy button copies lyrics text
- [ ] Error messages display in error alert

### Responsive
- [ ] Mobile view (375px) - all controls stack vertically
- [ ] Tablet view (768px) - layout adjusts gracefully
- [ ] Desktop view (1200px+) - three-column layout works
- [ ] Touch-friendly button sizes (40px+)
- [ ] Text is readable on all sizes

---

## 🚀 Future Enhancements

1. **Voice Input** - Microphone button for voice prompts
2. **Timeline Editor** - Visual track editing (canvas-based)
3. **Multi-track Layering** - Stack multiple generated tracks
4. **Effects Rack** - Post-generation audio effects
5. **Export Options** - MP3, WAV, STEM export
6. **Collaboration** - Share sessions with other creators
7. **History** - Undo/redo for parameter changes
8. **Automation** - Record parameter changes over time

---

## 📋 Files & Locations

```
src/
├── pages/
│   ├── StudioPage.tsx (NEW - Main two-state interface)
│   └── OnlineStudioPage.tsx (Legacy - still available at /studio-legacy)
├── components/
│   └── studio/
│       ├── PromptBox.tsx (NEW - Chat-style input)
│       ├── MoodPresets.tsx (NEW - 5 mood options)
│       ├── LanguagePresets.tsx (NEW - 6 SA languages)
│       ├── AudioPlayer.tsx (NEW - Full media player)
│       ├── StudioView.tsx (NEW - Post-generation view)
│       ├── BPMSlider.tsx (Existing - Enhanced)
│       ├── PresetButtons.tsx (Existing - Integrated)
│       └── MerchGenerator.tsx (Existing - Available)
└── lib/
    └── apiErrorHandler.ts (NEW - Error handling utility)
```

---

## 🔗 Routing

- `/studio` → **StudioPage** (New two-state interface)
- `/studio-legacy` → **OnlineStudioPage** (Old multi-tab interface)

---

## 💡 Design Inspiration

- **FL Studio** - Minimal, focused DAW interface
- **Linear.app** - Clean, modern web design
- **Notion** - Smooth transitions & animations
- **Modern AI Tools** - Glassmorphism, soft ux

---

## ⚡ Performance Notes

- All components use React hooks for state management
- Framer Motion handles animations efficiently
- Audio player uses native HTML5 `<audio>` element
- Lazy-loaded via AnimatePresence (only one mode rendered at a time)
- Base64 audio data prevents CORS issues
- Progress bar uses `transform` for smooth 60fps animations

