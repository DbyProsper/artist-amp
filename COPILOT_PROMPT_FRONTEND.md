# COPILOT PROMPT — FRONTEND REWRITE
# Paste this entire file into GitHub Copilot Chat in VS Code.
# Select your existing frontend folder first so Copilot has workspace context.

---

## TASK
Completely rewrite the Audio Enhancement frontend UI and client-side logic.
Replace the existing inconsistent implementation with the version below.
Keep all existing routing, auth, and navigation wrappers intact — only replace
the audio enhancement page/component and its child components.

---

## REFERENCE: CURRENT UI (screenshot provided)
The existing UI has:
- Left sidebar: mastering presets (Balanced, Bass Boost, Vocal, Loud) with Preview buttons
- Center: "Dual Waveform Preview" panel with Original / Enhanced toggle tabs, two waveform
  display areas (Original = Active, Enhanced = Pending), and a playback bar at the bottom
- Right sidebar: Enhancement Settings (Intensity slider 68%, EQ Balance slider 42%),
  Current Preset display, Export & Save buttons, Status section
- Dark theme (#0d0d0d background, hot-pink accent #ff2d6b)

Keep the Original/Enhanced waveform comparison toggle — this is critical UX.
Keep the preset sidebar concept but wire it to the new settings model below.

---

## TARGET UI — implement this exactly

### Layout (3-column, dark theme)
```
┌─────────────────┬──────────────────────────────┬──────────────────┐
│  LEFT SIDEBAR   │       CENTER PANEL            │   RIGHT SIDEBAR  │
│  Mastering      │  Header: title + file info    │  Enhancement     │
│  Presets        │  Drop zone (if no file)       │  Settings        │
│                 │  Waveform (dual: orig/enh)    │  ─────────────── │
│  ─────────────  │  Playback controls            │  LUFS module     │
│  ACTIONS        │  Original | Enhanced tabs     │  EQ module       │
│  Share/Download │                               │  Stereo module   │
│                 │                               │  Noise module    │
│                 │                               │  ─────────────── │
│                 │                               │  Export & Save   │
└─────────────────┴──────────────────────────────┴──────────────────┘
```

### Color tokens (CSS variables, add to your global stylesheet)
```css
:root {
  --bg-primary:   #0d0d0d;
  --bg-secondary: #161616;
  --bg-tertiary:  #1e1e1e;
  --bg-module:    #111111;
  --accent:       #ff2d6b;
  --accent-dim:   rgba(255, 45, 107, 0.15);
  --accent-glow:  rgba(255, 45, 107, 0.08);
  --text-primary: #ffffff;
  --text-secondary: #888888;
  --text-tertiary:  #444444;
  --border:       rgba(255,255,255,0.07);
  --border-hover: rgba(255,255,255,0.14);
  --waveform-orig: #444444;
  --waveform-enh:  #ff2d6b;
  --module-radius: 10px;
}
```

### Typography
- Font: `'DM Mono', monospace` for values/labels; `'DM Sans', sans-serif` for headings/body
- Import both from Google Fonts
- All labels: 11px uppercase letter-spacing 0.08em color var(--text-secondary)
- All values: 13px font-weight 500 color var(--text-primary)

---

## COMPONENT STRUCTURE

```
AudioEnhancementPage/
├── PresetSidebar          (left)
├── CenterPanel
│   ├── FileDropZone       (shown when no file loaded)
│   ├── DualWaveform       (shown when file loaded)
│   │   ├── WaveformCanvas (original, always rendered)
│   │   ├── WaveformCanvas (enhanced, rendered after processing)
│   │   └── CompareToggle  (Original | Enhanced tab switcher)
│   └── PlaybackBar
└── SettingsPanel          (right)
    ├── StatusBadge
    ├── LUFSModule
    ├── EQModule
    ├── StereoModule
    ├── NoiseModule
    └── ExportActions
```

---

## SETTINGS STATE MODEL
```typescript
interface EnhancementSettings {
  targetLufs: number;        // default -14.0
  truePeak: number;          // default -1.0
  eq: {
    enabled: boolean;
    bands: Array<{
      freq: number;
      type: 'lowshelf' | 'peaking' | 'highshelf';
      gain: number;          // dB, -12 to +12
    }>;
  };
  stereoWidth: number;       // %, 0–200, default 120
  midGainDb: number;         // default 0
  sideGainDb: number;        // default 1.5
  noiseReduction: {
    enabled: boolean;
    reductionDb: number;     // 0–40, default 15
    sensitivity: number;     // 0–1, default 0.5
  };
}

const PRESET_MAP: Record<string, EnhancementSettings> = {
  balanced: { targetLufs: -14, truePeak: -1,   eq: { enabled: true, bands: [{freq:60,type:'lowshelf',gain:1},{freq:250,type:'peaking',gain:-1},{freq:1000,type:'peaking',gain:0},{freq:5000,type:'peaking',gain:2},{freq:16000,type:'highshelf',gain:1.5}] }, stereoWidth: 120, midGainDb: 0,   sideGainDb: 1.5, noiseReduction: { enabled: true, reductionDb: 15, sensitivity: 0.5 } },
  bass:     { targetLufs: -12, truePeak: -0.5, eq: { enabled: true, bands: [{freq:60,type:'lowshelf',gain:4},{freq:250,type:'peaking',gain:1},{freq:1000,type:'peaking',gain:0},{freq:5000,type:'peaking',gain:0},{freq:16000,type:'highshelf',gain:0.5}] }, stereoWidth: 110, midGainDb: 1,   sideGainDb: 0.5, noiseReduction: { enabled: true, reductionDb: 10, sensitivity: 0.4 } },
  vocal:    { targetLufs: -14, truePeak: -1,   eq: { enabled: true, bands: [{freq:60,type:'lowshelf',gain:-1},{freq:250,type:'peaking',gain:-2},{freq:1000,type:'peaking',gain:2},{freq:5000,type:'peaking',gain:3},{freq:16000,type:'highshelf',gain:1}]  }, stereoWidth: 100, midGainDb: 2,   sideGainDb: 0,   noiseReduction: { enabled: true, reductionDb: 20, sensitivity: 0.7 } },
  loud:     { targetLufs:  -9, truePeak: -0.3, eq: { enabled: true, bands: [{freq:60,type:'lowshelf',gain:2},{freq:250,type:'peaking',gain:-0.5},{freq:1000,type:'peaking',gain:0.5},{freq:5000,type:'peaking',gain:1.5},{freq:16000,type:'highshelf',gain:2}] }, stereoWidth: 140, midGainDb: 0,   sideGainDb: 2,   noiseReduction: { enabled: true, reductionDb: 8,  sensitivity: 0.3 } },
};
```

---

## DUAL WAVEFORM + COMPARE TOGGLE

This is the most critical feature. Implement exactly as follows:

```typescript
// DualWaveform component
// - originalBuffer: AudioBuffer | null
// - enhancedBuffer: AudioBuffer | null
// - activeView: 'original' | 'enhanced'
// - currentTime: number
// - duration: number
// - onSeek: (time: number) => void

// Two <canvas> elements stacked or tab-switched:
//   canvas#waveform-original  (always decoded on file load)
//   canvas#waveform-enhanced  (decoded after backend returns enhanced file)
//
// drawWaveform(canvas, audioBuffer, color):
//   Iterates sample data at canvas.width resolution
//   For each pixel x: finds min/max sample in that chunk
//   Draws vertical line from mid+min*mid to mid+max*mid
//   Use waveform color from CSS vars
//
// Playhead: a vertical line at (currentTime / duration) * canvasWidth
//   Updates on requestAnimationFrame while playing
//
// CompareToggle: two pill buttons "Original" | "Enhanced"
//   Clicking "Enhanced" before processing shows a skeleton/shimmer placeholder
//   Once enhanced audio is ready, switches canvas and enables playback of enhanced

// Playback: use Web Audio API
//   Store two AudioBuffers: originalBuffer, enhancedBuffer
//   Playing switches source based on activeView
//   Seeking: disconnect source, create new BufferSource, start at offset
```

---

## IN-BROWSER PROCESSING (Web Audio API)
Run this chain client-side when backend is unavailable or for preview:

```javascript
async function processAudioInBrowser(audioBuffer, settings) {
  const offCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const src = offCtx.createBufferSource();
  src.buffer = audioBuffer;

  let lastNode = src;

  // EQ: chain biquad filters
  if (settings.eq.enabled) {
    const typeMap = { lowshelf: 'lowshelf', peaking: 'peaking', highshelf: 'highshelf' };
    for (const band of settings.eq.bands) {
      const f = offCtx.createBiquadFilter();
      f.type = typeMap[band.type];
      f.frequency.value = band.freq;
      f.Q.value = 0.707;
      f.gain.value = band.gain;
      lastNode.connect(f);
      lastNode = f;
    }
  }

  // Stereo widening (M/S via ChannelSplitter/Merger)
  if (audioBuffer.numberOfChannels >= 2 && settings.stereoWidth !== 100) {
    const splitter = offCtx.createChannelSplitter(2);
    const merger = offCtx.createChannelMerger(2);
    const gL = offCtx.createGain();
    const gR = offCtx.createGain();
    const w = settings.stereoWidth / 100;
    gL.gain.value = Math.sqrt((1 + w) / 2);
    gR.gain.value = Math.sqrt((1 - w) / 2);
    lastNode.connect(splitter);
    splitter.connect(gL, 0); splitter.connect(gR, 1);
    gL.connect(merger, 0, 0); gR.connect(merger, 0, 1);
    lastNode = merger;
  }

  // LUFS gain (approximate)
  const gainNode = offCtx.createGain();
  // Measure RMS, compute delta to target, apply
  const data = audioBuffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  const rms = Math.sqrt(sum / data.length);
  const measuredLufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -40;
  const gainDb = settings.targetLufs - measuredLufs;
  gainNode.gain.value = Math.pow(10, gainDb / 20);
  lastNode.connect(gainNode);
  gainNode.connect(offCtx.destination);

  src.start(0);
  return offCtx.startRendering();
}
```

---

## BACKEND API INTEGRATION
The backend runs at the URL set in your .env as `VITE_ENHANCER_API_URL` (or `NEXT_PUBLIC_ENHANCER_API_URL`).

```typescript
// audioEnhancerApi.ts
const BASE = import.meta.env.VITE_ENHANCER_API_URL ?? 'http://localhost:8000';

export async function analyzeAudio(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/analyze`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Analyze failed ${res.status}`);
  return res.json() as Promise<{ lufs: number; peak_db: number; duration_sec: number; channels: number; sample_rate: number }>;
}

export async function enhanceAudio(file: File, settings: EnhancementSettings): Promise<Blob> {
  const form = new FormData();
  form.append('file', file);
  form.append('target_lufs',     String(settings.targetLufs));
  form.append('true_peak',       String(settings.truePeak));
  form.append('eq_enabled',      String(settings.eq.enabled));
  form.append('eq_60hz',         String(settings.eq.bands[0].gain));
  form.append('eq_250hz',        String(settings.eq.bands[1].gain));
  form.append('eq_1khz',         String(settings.eq.bands[2].gain));
  form.append('eq_5khz',         String(settings.eq.bands[3].gain));
  form.append('eq_16khz',        String(settings.eq.bands[4].gain));
  form.append('stereo_width',    String(settings.stereoWidth));
  form.append('mid_gain_db',     String(settings.midGainDb));
  form.append('side_gain_db',    String(settings.sideGainDb));
  form.append('nr_enabled',      String(settings.noiseReduction.enabled));
  form.append('nr_reduction_db', String(settings.noiseReduction.reductionDb));
  form.append('nr_sensitivity',  String(settings.noiseReduction.sensitivity));
  form.append('output_format',   'wav');
  const res = await fetch(`${BASE}/enhance`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Enhance failed ${res.status}`);
  return res.blob();
}
```

After `enhanceAudio()` resolves:
1. Convert the Blob to an ArrayBuffer
2. Decode with `audioContext.decodeAudioData(arrayBuffer)`
3. Store as `enhancedBuffer`
4. Draw the enhanced waveform on `canvas#waveform-enhanced`
5. Auto-switch the CompareToggle to "Enhanced"

---

## EXPORT / DOWNLOAD
```typescript
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// Call: downloadBlob(enhancedBlob, `${originalFilename}_enhanced.wav`)
```

---

## HANDLING LONG AUDIO (the bug fix)
The existing implementation broke on long files because it tried to load entire ArrayBuffers
synchronously and used a single-pass RMS. Fix with these rules:

1. Never call `audioContext.decodeAudioData` on the main thread synchronously.
   Always use `await audioContext.decodeAudioData(arrayBuffer)`.
2. For waveform drawing of files > 5 min: downsample to max 2000 points before drawing.
   ```javascript
   const POINTS = Math.min(2000, buffer.length);
   const step = Math.floor(buffer.length / POINTS);
   ```
3. For playback seek on long files: always use `BufferSource.start(0, offsetSeconds)`
   rather than adjusting `AudioContext.currentTime`.
4. Show a progress bar during `enhanceAudio()` fetch since large files take time.
   Use `XMLHttpRequest` with `onprogress` instead of `fetch` if you need upload progress,
   or just show an indeterminate spinner tied to `isProcessing` state.

---

## ENVIRONMENT VARIABLE
Add to `.env` (or `.env.local`):
```
VITE_ENHANCER_API_URL=http://localhost:8000
```
Or for Next.js:
```
NEXT_PUBLIC_ENHANCER_API_URL=http://localhost:8000
```

---

## WHAT NOT TO CHANGE
- Do not modify routing, auth, or any page outside the audio enhancement feature
- Do not remove the "Back to Studio" navigation
- Do not change the existing file upload entry point if it's shared with other features
- Keep the "Save to Library" button wired to whatever existing library saving logic exists
- Keep the "Free" / plan badge in the top right

---

## DELIVERABLES
1. Rewritten AudioEnhancementPage component
2. DualWaveform component with Original/Enhanced toggle
3. PlaybackBar component with seek support
4. PresetSidebar component wired to PRESET_MAP
5. SettingsPanel with LUFS, EQ, Stereo, Noise modules
6. audioEnhancerApi.ts (or .js) for backend calls
7. Updated CSS/styles with the color tokens above
8. No TypeScript errors, no console errors on file load or processing
