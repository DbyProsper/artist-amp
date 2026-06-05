# COPILOT PROMPT — FRONTEND COMPLETE REWRITE
# Audio Enhancement Engine — React 18 + TypeScript + Vite + Tailwind + Firebase
#
# HOW TO USE:
# 1. Open your frontend project root in VS Code
# 2. Open Copilot Chat (Ctrl+Shift+I)
# 3. Paste this entire file
# 4. Say: "Implement everything in this prompt exactly as written"
#
# SCOPE: Only touches the audio enhancement feature.
# Does NOT modify: routing setup, Firebase config, other pages, global layout,
# existing components outside this feature, tailwind.config, vite.config.

---

## OBJECTIVE

Completely replace the existing audio enhancement page and all its child components,
hooks, and API logic with the implementation below. Delete any existing files related
to audio enhancement (components, hooks, api calls, types) and replace them with this.
Do not leave dead code or duplicate logic.

---

## PACKAGE — one new dependency needed

WaveSurfer.js is already installed (wavesurfer.js 7.12.7). Use it for waveform rendering.
No other new packages needed — everything else uses existing stack.

---

## FILE STRUCTURE TO CREATE

```
src/
  features/
    audio-enhancement/
      AudioEnhancementPage.tsx       ← main page component
      components/
        PresetSidebar.tsx
        FileDropZone.tsx
        DualWaveform.tsx
        PlaybackBar.tsx
        SettingsPanel.tsx
        LUFSModule.tsx
        EQModule.tsx
        StereoModule.tsx
        NoiseModule.tsx
        ExportActions.tsx
        PremiumGateModal.tsx
      hooks/
        useAudioEnhancer.ts          ← Web Audio API processing
        useWaveform.ts               ← WaveSurfer instance management
        useEnhancerStore.ts          ← settings state (no external lib needed, useReducer)
      api/
        audioEnhancerApi.ts          ← fetch calls to backend
      types/
        enhancer.types.ts
      constants/
        presets.ts
```

Delete any old audio enhancement files not in this structure.

---

## TYPES — src/features/audio-enhancement/types/enhancer.types.ts

```typescript
export type PresetId = 'dsp' | 'mastered' | 'vocals' | 'vinyl' | 'custom';

export interface EQBand {
  freq: number;
  type: 'lowshelf' | 'peaking' | 'highshelf';
  gain: number; // dB, -12 to +12
}

export interface EnhancementSettings {
  targetLufs: number;       // default -14.0
  truePeak: number;         // default -1.0
  eq: {
    enabled: boolean;
    bands: EQBand[];        // always 5 bands: 60Hz, 250Hz, 1kHz, 5kHz, 16kHz
  };
  stereoWidth: number;      // %, 0–200, default 120
  midGainDb: number;
  sideGainDb: number;
  noiseReduction: {
    enabled: boolean;
    reductionDb: number;    // 0–40
    sensitivity: number;    // 0–1
  };
}

export interface AudioAnalysis {
  lufs: number | null;
  peak_db: number;
  duration_sec: number;
  sample_rate: number;
  channels: number;
}

export type ProcessingStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'previewing'
  | 'processing'
  | 'done'
  | 'error';

export interface EnhancerState {
  file: File | null;
  originalBuffer: AudioBuffer | null;
  enhancedBuffer: AudioBuffer | null;
  enhancedBlob: Blob | null;
  analysis: AudioAnalysis | null;
  settings: EnhancementSettings;
  activePreset: PresetId;
  activeView: 'original' | 'enhanced';
  status: ProcessingStatus;
  progress: number;         // 0–100
  progressLabel: string;
  error: string | null;
}
```

---

## PRESETS — src/features/audio-enhancement/constants/presets.ts

```typescript
import { EnhancementSettings, PresetId } from '../types/enhancer.types';

export const PRESET_LABELS: Record<PresetId, { name: string; description: string }> = {
  dsp:      { name: 'DSP Quality',    description: 'Optimised for streaming services — Spotify, Apple Music, YouTube' },
  mastered: { name: 'Mastered',       description: 'Industry-standard loudness and cleanliness for release' },
  vocals:   { name: 'Vocals',         description: 'Cleans and clarifies vocal recordings with presence and warmth' },
  vinyl:    { name: 'Vinyl Warmth',   description: 'Analog character with low-end richness and natural stereo feel' },
  custom:   { name: 'Custom',         description: 'Tweak every parameter manually' },
};

export const PRESETS: Record<PresetId, EnhancementSettings> = {
  dsp: {
    targetLufs: -14,
    truePeak: -1,
    eq: {
      enabled: true,
      bands: [
        { freq: 60,    type: 'lowshelf',  gain: 1.0  },
        { freq: 250,   type: 'peaking',   gain: -1.0 },
        { freq: 1000,  type: 'peaking',   gain: 0.0  },
        { freq: 5000,  type: 'peaking',   gain: 2.0  },
        { freq: 16000, type: 'highshelf', gain: 1.5  },
      ],
    },
    stereoWidth: 120,
    midGainDb: 0,
    sideGainDb: 1.5,
    noiseReduction: { enabled: true, reductionDb: 15, sensitivity: 0.5 },
  },
  mastered: {
    targetLufs: -9,
    truePeak: -0.3,
    eq: {
      enabled: true,
      bands: [
        { freq: 60,    type: 'lowshelf',  gain: 2.0  },
        { freq: 250,   type: 'peaking',   gain: -0.5 },
        { freq: 1000,  type: 'peaking',   gain: 0.5  },
        { freq: 5000,  type: 'peaking',   gain: 1.5  },
        { freq: 16000, type: 'highshelf', gain: 2.0  },
      ],
    },
    stereoWidth: 140,
    midGainDb: 0,
    sideGainDb: 2.0,
    noiseReduction: { enabled: true, reductionDb: 8, sensitivity: 0.3 },
  },
  vocals: {
    targetLufs: -14,
    truePeak: -1,
    eq: {
      enabled: true,
      bands: [
        { freq: 60,    type: 'lowshelf',  gain: -1.0 },
        { freq: 250,   type: 'peaking',   gain: -2.0 },
        { freq: 1000,  type: 'peaking',   gain: 2.0  },
        { freq: 5000,  type: 'peaking',   gain: 3.0  },
        { freq: 16000, type: 'highshelf', gain: 1.0  },
      ],
    },
    stereoWidth: 100,
    midGainDb: 2,
    sideGainDb: 0,
    noiseReduction: { enabled: true, reductionDb: 25, sensitivity: 0.7 },
  },
  vinyl: {
    targetLufs: -18,
    truePeak: -2,
    eq: {
      enabled: true,
      bands: [
        { freq: 60,    type: 'lowshelf',  gain: 3.0  },
        { freq: 250,   type: 'peaking',   gain: 2.0  },
        { freq: 1000,  type: 'peaking',   gain: 0.0  },
        { freq: 5000,  type: 'peaking',   gain: -1.0 },
        { freq: 16000, type: 'highshelf', gain: -2.0 },
      ],
    },
    stereoWidth: 80,
    midGainDb: 1,
    sideGainDb: -0.5,
    noiseReduction: { enabled: false, reductionDb: 5, sensitivity: 0.2 },
  },
  custom: {
    targetLufs: -14,
    truePeak: -1,
    eq: {
      enabled: true,
      bands: [
        { freq: 60,    type: 'lowshelf',  gain: 0 },
        { freq: 250,   type: 'peaking',   gain: 0 },
        { freq: 1000,  type: 'peaking',   gain: 0 },
        { freq: 5000,  type: 'peaking',   gain: 0 },
        { freq: 16000, type: 'highshelf', gain: 0 },
      ],
    },
    stereoWidth: 100,
    midGainDb: 0,
    sideGainDb: 0,
    noiseReduction: { enabled: true, reductionDb: 10, sensitivity: 0.5 },
  },
};
```

---

## STATE HOOK — src/features/audio-enhancement/hooks/useEnhancerStore.ts

```typescript
import { useReducer, useCallback } from 'react';
import { EnhancerState, EnhancementSettings, PresetId, ProcessingStatus } from '../types/enhancer.types';
import { PRESETS } from '../constants/presets';

type Action =
  | { type: 'SET_FILE'; file: File }
  | { type: 'SET_ORIGINAL_BUFFER'; buffer: AudioBuffer }
  | { type: 'SET_ENHANCED_BUFFER'; buffer: AudioBuffer; blob: Blob }
  | { type: 'SET_ANALYSIS'; analysis: EnhancerState['analysis'] }
  | { type: 'SET_PRESET'; preset: PresetId }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<EnhancementSettings> }
  | { type: 'SET_STATUS'; status: ProcessingStatus; label?: string }
  | { type: 'SET_PROGRESS'; progress: number; label: string }
  | { type: 'SET_VIEW'; view: 'original' | 'enhanced' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: EnhancerState = {
  file: null,
  originalBuffer: null,
  enhancedBuffer: null,
  enhancedBlob: null,
  analysis: null,
  settings: PRESETS.dsp,
  activePreset: 'dsp',
  activeView: 'original',
  status: 'idle',
  progress: 0,
  progressLabel: '',
  error: null,
};

function reducer(state: EnhancerState, action: Action): EnhancerState {
  switch (action.type) {
    case 'SET_FILE':
      return { ...initialState, file: action.file, status: 'loading' };
    case 'SET_ORIGINAL_BUFFER':
      return { ...state, originalBuffer: action.buffer, status: 'ready' };
    case 'SET_ENHANCED_BUFFER':
      return { ...state, enhancedBuffer: action.buffer, enhancedBlob: action.blob, status: 'done', activeView: 'enhanced', progress: 100 };
    case 'SET_ANALYSIS':
      return { ...state, analysis: action.analysis };
    case 'SET_PRESET':
      return { ...state, activePreset: action.preset, settings: PRESETS[action.preset] };
    case 'UPDATE_SETTINGS':
      return { ...state, activePreset: 'custom', settings: { ...state.settings, ...action.settings } };
    case 'SET_STATUS':
      return { ...state, status: action.status, progressLabel: action.label ?? state.progressLabel };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress, progressLabel: action.label };
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useEnhancerStore() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setFile = useCallback((file: File) => dispatch({ type: 'SET_FILE', file }), []);
  const setOriginalBuffer = useCallback((buffer: AudioBuffer) => dispatch({ type: 'SET_ORIGINAL_BUFFER', buffer }), []);
  const setEnhancedBuffer = useCallback((buffer: AudioBuffer, blob: Blob) => dispatch({ type: 'SET_ENHANCED_BUFFER', buffer, blob }), []);
  const setAnalysis = useCallback((analysis: EnhancerState['analysis']) => dispatch({ type: 'SET_ANALYSIS', analysis }), []);
  const setPreset = useCallback((preset: PresetId) => dispatch({ type: 'SET_PRESET', preset }), []);
  const updateSettings = useCallback((s: Partial<EnhancementSettings>) => dispatch({ type: 'UPDATE_SETTINGS', settings: s }), []);
  const setStatus = useCallback((status: ProcessingStatus, label?: string) => dispatch({ type: 'SET_STATUS', status, label }), []);
  const setProgress = useCallback((progress: number, label: string) => dispatch({ type: 'SET_PROGRESS', progress, label }), []);
  const setView = useCallback((view: 'original' | 'enhanced') => dispatch({ type: 'SET_VIEW', view }), []);
  const setError = useCallback((error: string) => dispatch({ type: 'SET_ERROR', error }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, setFile, setOriginalBuffer, setEnhancedBuffer, setAnalysis, setPreset, updateSettings, setStatus, setProgress, setView, setError, reset };
}
```

---

## WEB AUDIO HOOK — src/features/audio-enhancement/hooks/useAudioEnhancer.ts

```typescript
import { useRef, useCallback } from 'react';
import { EnhancementSettings } from '../types/enhancer.types';

export function useAudioEnhancer() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  // Decode a File into an AudioBuffer
  const decodeFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const ctx = getCtx();
    const arrayBuffer = await file.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }, []);

  // Decode a Blob (enhanced result from backend) into an AudioBuffer
  const decodeBlob = useCallback(async (blob: Blob): Promise<AudioBuffer> => {
    const ctx = getCtx();
    const arrayBuffer = await blob.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }, []);

  // In-browser preview processing — fast, approximate
  const processPreview = useCallback(async (
    buffer: AudioBuffer,
    settings: EnhancementSettings
  ): Promise<AudioBuffer> => {
    const offCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    const src = offCtx.createBufferSource();
    src.buffer = buffer;
    let lastNode: AudioNode = src;

    // EQ
    if (settings.eq.enabled) {
      for (const band of settings.eq.bands) {
        if (Math.abs(band.gain) < 0.01) continue;
        const f = offCtx.createBiquadFilter();
        f.type = band.type;
        f.frequency.value = band.freq;
        f.Q.value = 0.707;
        f.gain.value = band.gain;
        lastNode.connect(f);
        lastNode = f;
      }
    }

    // Stereo widening (M/S)
    if (buffer.numberOfChannels >= 2 && settings.stereoWidth !== 100) {
      const splitter = offCtx.createChannelSplitter(2);
      const merger = offCtx.createChannelMerger(2);
      const gL = offCtx.createGain();
      const gR = offCtx.createGain();
      const w = settings.stereoWidth / 100;
      gL.gain.value = Math.sqrt((1 + w) / 2);
      gR.gain.value = Math.sqrt(Math.max(0, (1 - w) / 2));
      lastNode.connect(splitter);
      splitter.connect(gL, 0);
      splitter.connect(gR, 1);
      gL.connect(merger, 0, 0);
      gR.connect(merger, 0, 1);
      lastNode = merger;
    }

    // LUFS gain (approximate RMS-based)
    const gainNode = offCtx.createGain();
    const data = buffer.getChannelData(0);
    // Downsample for speed on long files
    const step = Math.max(1, Math.floor(data.length / 44100));
    let sum = 0; let count = 0;
    for (let i = 0; i < data.length; i += step) { sum += data[i] * data[i]; count++; }
    const rms = Math.sqrt(sum / count);
    const measuredLufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -40;
    const gainDb = settings.targetLufs - measuredLufs;
    gainNode.gain.value = Math.min(10, Math.pow(10, gainDb / 20));
    lastNode.connect(gainNode);
    gainNode.connect(offCtx.destination);

    src.start(0);
    return offCtx.startRendering();
  }, []);

  // Encode AudioBuffer to WAV Blob for local preview download
  const encodeToWav = useCallback((buffer: AudioBuffer): Blob => {
    const nc = buffer.numberOfChannels;
    const len = buffer.length;
    const sr = buffer.sampleRate;
    const wav = new ArrayBuffer(44 + len * nc * 2);
    const view = new DataView(wav);
    const ws = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    ws(0, 'RIFF'); view.setUint32(4, 36 + len * nc * 2, true); ws(8, 'WAVE');
    ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, nc, true); view.setUint32(24, sr, true);
    view.setUint32(28, sr * nc * 2, true); view.setUint16(32, nc * 2, true);
    view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, len * nc * 2, true);
    let offset = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nc; c++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
        offset += 2;
      }
    }
    return new Blob([wav], { type: 'audio/wav' });
  }, []);

  return { decodeFile, decodeBlob, processPreview, encodeToWav };
}
```

---

## API CLIENT — src/features/audio-enhancement/api/audioEnhancerApi.ts

```typescript
import { EnhancementSettings, AudioAnalysis } from '../types/enhancer.types';

// Set VITE_ENHANCER_API_URL in your .env file
// e.g. VITE_ENHANCER_API_URL=http://localhost:8000
const BASE = import.meta.env.VITE_ENHANCER_API_URL ?? 'http://localhost:8000';

export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/audio/analyze`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function enhanceAudio(
  file: File,
  settings: EnhancementSettings,
  onProgress?: (pct: number, label: string) => void
): Promise<Blob> {
  const form = new FormData();
  form.append('file', file);

  // Flat fields — matches backend Form() params exactly
  form.append('target_lufs',      String(settings.targetLufs));
  form.append('true_peak',        String(settings.truePeak));
  form.append('eq_enabled',       String(settings.eq.enabled));
  form.append('eq_60hz',          String(settings.eq.bands[0].gain));
  form.append('eq_250hz',         String(settings.eq.bands[1].gain));
  form.append('eq_1khz',          String(settings.eq.bands[2].gain));
  form.append('eq_5khz',          String(settings.eq.bands[3].gain));
  form.append('eq_16khz',         String(settings.eq.bands[4].gain));
  form.append('stereo_width',     String(settings.stereoWidth));
  form.append('mid_gain_db',      String(settings.midGainDb));
  form.append('side_gain_db',     String(settings.sideGainDb));
  form.append('nr_enabled',       String(settings.noiseReduction.enabled));
  form.append('nr_reduction_db',  String(settings.noiseReduction.reductionDb));
  form.append('nr_sensitivity',   String(settings.noiseReduction.sensitivity));
  form.append('output_format',    'wav');

  // Use XMLHttpRequest for upload progress
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/audio/enhance`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 40); // upload = 0–40%
        onProgress?.(pct, 'Uploading audio…');
      }
    };

    xhr.onprogress = () => {
      onProgress?.(60, 'Processing on server…');
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(95, 'Finalizing…');
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Enhancement failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.responseType = 'blob';
    xhr.send(form);
  });
}
```

---

## WAVEFORM HOOK — src/features/audio-enhancement/hooks/useWaveform.ts

```typescript
import { useRef, useCallback, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface UseWaveformOptions {
  color: string;        // waveform bar color
  progressColor: string;
}

export function useWaveform(containerId: string, options: UseWaveformOptions) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const isReadyRef = useRef(false);

  const init = useCallback(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    wsRef.current?.destroy();
    wsRef.current = WaveSurfer.create({
      container,
      waveColor: options.color,
      progressColor: options.progressColor,
      cursorColor: '#ff2d6b',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 64,
      normalize: true,
      interact: true,
      backend: 'WebAudio',
    });
    isReadyRef.current = false;
    wsRef.current.on('ready', () => { isReadyRef.current = true; });
    return wsRef.current;
  }, [containerId, options.color, options.progressColor]);

  const loadBlob = useCallback(async (blob: Blob) => {
    if (!wsRef.current) return;
    const url = URL.createObjectURL(blob);
    await wsRef.current.load(url);
  }, []);

  const loadBuffer = useCallback(async (buffer: AudioBuffer) => {
    // Convert AudioBuffer to Blob then load into WaveSurfer
    const nc = buffer.numberOfChannels;
    const len = buffer.length;
    const sr = buffer.sampleRate;
    const wav = new ArrayBuffer(44 + len * nc * 2);
    const view = new DataView(wav);
    const ws = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    ws(0, 'RIFF'); view.setUint32(4, 36 + len * nc * 2, true); ws(8, 'WAVE');
    ws(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, nc, true); view.setUint32(24, sr, true);
    view.setUint32(28, sr * nc * 2, true); view.setUint16(32, nc * 2, true);
    view.setUint16(34, 16, true); ws(36, 'data'); view.setUint32(40, len * nc * 2, true);
    let offset = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nc; c++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
        offset += 2;
      }
    }
    const blob = new Blob([wav], { type: 'audio/wav' });
    await loadBlob(blob);
  }, [loadBlob]);

  const play = useCallback(() => wsRef.current?.play(), []);
  const pause = useCallback(() => wsRef.current?.pause(), []);
  const toggle = useCallback(() => wsRef.current?.playPause(), []);
  const seek = useCallback((pct: number) => wsRef.current?.seekTo(pct), []);
  const isPlaying = useCallback(() => wsRef.current?.isPlaying() ?? false, []);
  const destroy = useCallback(() => { wsRef.current?.destroy(); wsRef.current = null; }, []);

  useEffect(() => () => { wsRef.current?.destroy(); }, []);

  return { init, loadBlob, loadBuffer, play, pause, toggle, seek, isPlaying, destroy, ws: wsRef };
}
```

---

## MAIN PAGE — src/features/audio-enhancement/AudioEnhancementPage.tsx

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useEnhancerStore } from './hooks/useEnhancerStore';
import { useAudioEnhancer } from './hooks/useAudioEnhancer';
import { analyzeAudio, enhanceAudio } from './api/audioEnhancerApi';
import PresetSidebar from './components/PresetSidebar';
import FileDropZone from './components/FileDropZone';
import DualWaveform from './components/DualWaveform';
import SettingsPanel from './components/SettingsPanel';
import ExportActions from './components/ExportActions';
import { cn } from '@/lib/utils'; // your existing cn utility

export default function AudioEnhancementPage() {
  const store = useEnhancerStore();
  const { state, setFile, setOriginalBuffer, setEnhancedBuffer, setAnalysis,
          setPreset, updateSettings, setStatus, setProgress, setView, setError, reset } = store;
  const { decodeFile, decodeBlob } = useAudioEnhancer();
  const fileNameRef = useRef<string>('audio');

  // Handle file drop / selection
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }
    fileNameRef.current = file.name.replace(/\.[^.]+$/, '');
    setFile(file);

    try {
      // Decode for Web Audio API
      const buffer = await decodeFile(file);
      setOriginalBuffer(buffer);

      // Analyze on backend (non-blocking)
      analyzeAudio(file)
        .then(setAnalysis)
        .catch(() => {}); // non-critical
    } catch (err) {
      setError('Could not decode audio file. Please try WAV, MP3, or FLAC.');
      toast.error('Failed to load audio file');
    }
  }, [decodeFile, setFile, setOriginalBuffer, setAnalysis, setError]);

  // Enhance & Export — hits backend, premium gated
  const handleEnhance = useCallback(async () => {
    if (!state.file) return;

    // PREMIUM GATE: replace this block with your real auth check
    // e.g. if (!user?.isPremium) { setShowUpgradeModal(true); return; }
    // For now it is open — wire your Firebase user plan check here.

    setStatus('processing', 'Preparing…');
    setProgress(5, 'Preparing…');

    const steps = [
      { pct: 15, label: 'Uploading audio…' },
      { pct: 35, label: 'Analyzing noise floor…' },
      { pct: 55, label: 'Applying EQ…' },
      { pct: 70, label: 'Widening stereo…' },
      { pct: 85, label: 'Normalizing loudness…' },
      { pct: 95, label: 'Finalizing…' },
    ];

    // Fake step progress while XHR uploads
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      if (stepIdx < steps.length) {
        const s = steps[stepIdx++];
        setProgress(s.pct, s.label);
      }
    }, 2500);

    try {
      const blob = await enhanceAudio(
        state.file,
        state.settings,
        (pct, label) => setProgress(Math.max(state.progress, pct), label)
      );
      clearInterval(stepTimer);
      setProgress(98, 'Decoding result…');
      const enhancedBuffer = await decodeBlob(blob);
      setEnhancedBuffer(enhancedBuffer, blob);
      setView('enhanced');
      toast.success('Enhancement complete');
    } catch (err: any) {
      clearInterval(stepTimer);
      setError(err.message ?? 'Enhancement failed');
      toast.error('Enhancement failed — please try again');
    }
  }, [state.file, state.settings, state.progress, decodeBlob,
      setStatus, setProgress, setEnhancedBuffer, setView, setError]);

  // Download enhanced file
  const handleDownload = useCallback(() => {
    if (!state.enhancedBlob) return;
    const url = URL.createObjectURL(state.enhancedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameRef.current}_enhanced.wav`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download started');
  }, [state.enhancedBlob]);

  const isProcessing = state.status === 'processing' || state.status === 'loading';
  const hasFile = !!state.file && !!state.originalBuffer;

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Replace with your actual back navigation */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            ← Back to Studio
          </button>
        </div>
        <h1 className="text-sm font-medium tracking-widest uppercase text-white/60"
            style={{ fontFamily: "'DM Mono', monospace" }}>
          Audio Enhancement
        </h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff2d6b]" />
          {/* Replace with your real plan badge */}
          <span className="text-xs text-white/40">Free</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Preset Sidebar */}
        <PresetSidebar
          activePreset={state.activePreset}
          onSelectPreset={setPreset}
          disabled={isProcessing}
        />

        {/* Center — Main Panel */}
        <main className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto min-w-0">
          <AnimatePresence mode="wait">
            {!hasFile ? (
              <motion.div key="drop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <FileDropZone onFile={handleFile} />
              </motion.div>
            ) : (
              <motion.div key="wave" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4">
                <DualWaveform
                  file={state.file!}
                  originalBuffer={state.originalBuffer}
                  enhancedBuffer={state.enhancedBuffer}
                  enhancedBlob={state.enhancedBlob}
                  activeView={state.activeView}
                  onViewChange={setView}
                  status={state.status}
                  progress={state.progress}
                  progressLabel={state.progressLabel}
                  onReset={reset}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right — Settings + Export */}
        <aside className="w-72 border-l border-white/[0.06] flex flex-col overflow-y-auto">
          <SettingsPanel
            settings={state.settings}
            analysis={state.analysis}
            onUpdate={updateSettings}
            disabled={isProcessing}
          />
          <div className="p-4 border-t border-white/[0.06]">
            <ExportActions
              status={state.status}
              hasEnhanced={!!state.enhancedBlob}
              onEnhance={handleEnhance}
              onDownload={handleDownload}
              // Wire your premium check here:
              // isPremium={user?.isPremium ?? false}
              isPremium={true} // remove this line when auth is wired
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
```

---

## PRESET SIDEBAR — src/features/audio-enhancement/components/PresetSidebar.tsx

```tsx
import { motion } from 'framer-motion';
import { Waves, Zap, Mic2, Disc3, SlidersHorizontal } from 'lucide-react';
import { PresetId } from '../types/enhancer.types';
import { PRESET_LABELS } from '../constants/presets';
import { cn } from '@/lib/utils';

const PRESET_ICONS: Record<PresetId, React.ReactNode> = {
  dsp:      <Zap size={15} />,
  mastered: <Waves size={15} />,
  vocals:   <Mic2 size={15} />,
  vinyl:    <Disc3 size={15} />,
  custom:   <SlidersHorizontal size={15} />,
};

interface Props {
  activePreset: PresetId;
  onSelectPreset: (p: PresetId) => void;
  disabled?: boolean;
}

const PRESET_ORDER: PresetId[] = ['dsp', 'mastered', 'vocals', 'vinyl', 'custom'];

export default function PresetSidebar({ activePreset, onSelectPreset, disabled }: Props) {
  return (
    <aside className="w-56 border-r border-white/[0.06] flex flex-col p-4 gap-1 shrink-0">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-white/30 mb-3 px-1"
         style={{ fontFamily: "'DM Mono', monospace" }}>
        Mastering Presets
      </p>
      {PRESET_ORDER.map((id) => {
        const { name, description } = PRESET_LABELS[id];
        const isActive = activePreset === id;
        return (
          <motion.button
            key={id}
            onClick={() => !disabled && onSelectPreset(id)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full text-left px-3 py-3 rounded-lg transition-all duration-150 group',
              isActive
                ? 'bg-[#ff2d6b]/10 border border-[#ff2d6b]/30'
                : 'border border-transparent hover:bg-white/[0.04]',
              disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('transition-colors', isActive ? 'text-[#ff2d6b]' : 'text-white/40 group-hover:text-white/60')}>
                {PRESET_ICONS[id]}
              </span>
              <span className={cn('text-[13px] font-medium transition-colors',
                isActive ? 'text-white' : 'text-white/70 group-hover:text-white')}>
                {name}
              </span>
            </div>
            <p className="text-[11px] text-white/35 leading-snug pl-[23px]">{description}</p>
          </motion.button>
        );
      })}
    </aside>
  );
}
```

---

## FILE DROP ZONE — src/features/audio-enhancement/components/FileDropZone.tsx

```tsx
import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { onFile: (f: File) => void; }

export default function FileDropZone({ onFile }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <motion.label
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed',
        'min-h-[320px] cursor-pointer transition-all duration-200',
        isDragging
          ? 'border-[#ff2d6b]/60 bg-[#ff2d6b]/5'
          : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
      )}
    >
      <input type="file" accept="audio/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
        isDragging ? 'bg-[#ff2d6b]/20' : 'bg-white/[0.05]'
      )}>
        {isDragging ? <Music size={24} className="text-[#ff2d6b]" /> : <Upload size={24} className="text-white/30" />}
      </div>
      <div className="text-center">
        <p className="text-sm text-white/60 mb-1">Drop your audio file here</p>
        <p className="text-xs text-white/25">WAV · MP3 · FLAC · AIFF · up to 200MB</p>
      </div>
    </motion.label>
  );
}
```

---

## DUAL WAVEFORM — src/features/audio-enhancement/components/DualWaveform.tsx

```tsx
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { AudioBuffer as WebAudioBuffer } from 'standardized-audio-context'; // use native AudioBuffer
import { ProcessingStatus } from '../types/enhancer.types';
import { cn } from '@/lib/utils';

interface Props {
  file: File;
  originalBuffer: AudioBuffer | null;
  enhancedBuffer: AudioBuffer | null;
  enhancedBlob: Blob | null;
  activeView: 'original' | 'enhanced';
  onViewChange: (v: 'original' | 'enhanced') => void;
  status: ProcessingStatus;
  progress: number;
  progressLabel: string;
  onReset: () => void;
}

function bufferToBlob(buffer: AudioBuffer): Blob {
  const nc = buffer.numberOfChannels;
  const len = buffer.length;
  const sr = buffer.sampleRate;
  const wav = new ArrayBuffer(44 + len * nc * 2);
  const view = new DataView(wav);
  const ws = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  ws(0,'RIFF'); view.setUint32(4,36+len*nc*2,true); ws(8,'WAVE');
  ws(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true);
  view.setUint16(22,nc,true); view.setUint32(24,sr,true);
  view.setUint32(28,sr*nc*2,true); view.setUint16(32,nc*2,true);
  view.setUint16(34,16,true); ws(36,'data'); view.setUint32(40,len*nc*2,true);
  let offset = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < nc; c++) {
    const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
    view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true); offset += 2;
  }
  return new Blob([wav], { type: 'audio/wav' });
}

export default function DualWaveform({
  file, originalBuffer, enhancedBuffer, enhancedBlob,
  activeView, onViewChange, status, progress, progressLabel, onReset
}: Props) {
  const origWsRef = useRef<WaveSurfer | null>(null);
  const enhWsRef  = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Init WaveSurfer for original
  useEffect(() => {
    if (!originalBuffer) return;
    const ws = WaveSurfer.create({
      container: '#ws-original',
      waveColor: '#333333',
      progressColor: '#ff2d6b',
      cursorColor: '#ff2d6b',
      cursorWidth: 2,
      barWidth: 2, barGap: 1, barRadius: 2,
      height: 64, normalize: true, interact: true,
    });
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    const url = URL.createObjectURL(bufferToBlob(originalBuffer));
    ws.load(url);
    origWsRef.current = ws;
    return () => { ws.destroy(); URL.revokeObjectURL(url); };
  }, [originalBuffer]);

  // Init WaveSurfer for enhanced
  useEffect(() => {
    if (!enhancedBuffer || !enhancedBlob) return;
    const ws = WaveSurfer.create({
      container: '#ws-enhanced',
      waveColor: '#ff2d6b44',
      progressColor: '#ff2d6b',
      cursorColor: '#ff2d6b',
      cursorWidth: 2,
      barWidth: 2, barGap: 1, barRadius: 2,
      height: 64, normalize: true, interact: true,
    });
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    const url = URL.createObjectURL(enhancedBlob);
    ws.load(url);
    enhWsRef.current = ws;
    return () => { ws.destroy(); URL.revokeObjectURL(url); };
  }, [enhancedBuffer, enhancedBlob]);

  const activeWs = () => activeView === 'original' ? origWsRef.current : enhWsRef.current;

  const togglePlay = () => {
    const ws = activeWs();
    if (!ws) return;
    if (ws.isPlaying()) ws.pause(); else ws.play();
  };

  const isProcessing = status === 'processing';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-medium text-white">{file.name}</p>
          <p className="text-xs text-white/35 mt-0.5">
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Original | Enhanced toggle */}
          <div className="flex bg-white/[0.05] rounded-lg p-0.5 text-xs">
            {(['original', 'enhanced'] as const).map((v) => (
              <button
                key={v}
                onClick={() => v === 'enhanced' && !enhancedBuffer ? undefined : onViewChange(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md capitalize transition-all duration-150',
                  activeView === v
                    ? 'bg-[#ff2d6b] text-white'
                    : v === 'enhanced' && !enhancedBuffer
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/50 hover:text-white/80'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={onReset} className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Waveforms */}
      <div className="px-5 py-4 space-y-3">
        {/* Original waveform */}
        <div className={cn('transition-opacity', activeView === 'enhanced' && 'opacity-30')}>
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2"
             style={{ fontFamily: "'DM Mono', monospace" }}>Original</p>
          <div id="ws-original" className="rounded-lg overflow-hidden" />
        </div>

        {/* Enhanced waveform */}
        <div className={cn('transition-opacity', activeView === 'original' && 'opacity-30')}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest"
               style={{ fontFamily: "'DM Mono', monospace" }}>Enhanced</p>
            {!enhancedBuffer && !isProcessing && (
              <span className="text-[10px] text-white/20">Pending</span>
            )}
          </div>
          {isProcessing ? (
            <div className="h-16 rounded-lg bg-white/[0.03] flex flex-col items-center justify-center gap-2">
              <div className="w-48 h-1 bg-white/[0.08] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#ff2d6b] rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-[11px] text-white/40">{progressLabel}</p>
            </div>
          ) : (
            <div id="ws-enhanced" className={cn('rounded-lg overflow-hidden', !enhancedBuffer && 'min-h-[64px] bg-white/[0.02]')} />
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!originalBuffer}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all',
            originalBuffer
              ? 'bg-[#ff2d6b] hover:bg-[#ff2d6b]/80 text-white'
              : 'bg-white/[0.05] text-white/20 cursor-not-allowed'
          )}
        >
          {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
        </button>
        <span className="text-xs text-white/30" style={{ fontFamily: "'DM Mono', monospace" }}>
          {activeView === 'original' ? 'Original' : 'Enhanced'}
        </span>
      </div>
    </div>
  );
}
```

---

## SETTINGS PANEL — src/features/audio-enhancement/components/SettingsPanel.tsx

```tsx
import { EnhancementSettings, AudioAnalysis } from '../types/enhancer.types';
import LUFSModule from './LUFSModule';
import EQModule from './EQModule';
import StereoModule from './StereoModule';
import NoiseModule from './NoiseModule';

interface Props {
  settings: EnhancementSettings;
  analysis: AudioAnalysis | null;
  onUpdate: (s: Partial<EnhancementSettings>) => void;
  disabled?: boolean;
}

export default function SettingsPanel({ settings, analysis, onUpdate, disabled }: Props) {
  return (
    <div className="flex flex-col gap-0 divide-y divide-white/[0.05] p-4 gap-4">
      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-white/30 pb-3"
         style={{ fontFamily: "'DM Mono', monospace" }}>
        Enhancement Settings
      </p>
      <LUFSModule settings={settings} analysis={analysis} onUpdate={onUpdate} disabled={disabled} />
      <EQModule settings={settings} onUpdate={onUpdate} disabled={disabled} />
      <StereoModule settings={settings} onUpdate={onUpdate} disabled={disabled} />
      <NoiseModule settings={settings} onUpdate={onUpdate} disabled={disabled} />
    </div>
  );
}
```

---

## LUFS MODULE — src/features/audio-enhancement/components/LUFSModule.tsx

```tsx
import { EnhancementSettings, AudioAnalysis } from '../types/enhancer.types';
import { cn } from '@/lib/utils';

interface Props {
  settings: EnhancementSettings;
  analysis: AudioAnalysis | null;
  onUpdate: (s: Partial<EnhancementSettings>) => void;
  disabled?: boolean;
}

const LUFS_TARGETS = [
  { label: 'Spotify', value: -14 },
  { label: 'Apple', value: -16 },
  { label: 'YouTube', value: -13 },
  { label: 'CD', value: -9 },
];

export default function LUFSModule({ settings, analysis, onUpdate, disabled }: Props) {
  return (
    <div className="pt-4 flex flex-col gap-3">
      <p className="text-[11px] font-medium text-white/50">Loudness (LUFS)</p>

      {/* Quick targets */}
      <div className="flex gap-1 flex-wrap">
        {LUFS_TARGETS.map(({ label, value }) => (
          <button
            key={label}
            disabled={disabled}
            onClick={() => onUpdate({ targetLufs: value })}
            className={cn(
              'px-2 py-1 rounded text-[10px] border transition-all',
              settings.targetLufs === value
                ? 'bg-[#ff2d6b]/15 border-[#ff2d6b]/40 text-[#ff2d6b]'
                : 'border-white/[0.08] text-white/30 hover:border-white/20 hover:text-white/50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <input
          type="range" min={-24} max={-6} step={0.5}
          value={settings.targetLufs} disabled={disabled}
          onChange={(e) => onUpdate({ targetLufs: parseFloat(e.target.value) })}
          className="flex-1 accent-[#ff2d6b] h-1"
        />
        <span className="text-xs text-white/60 w-16 text-right tabular-nums"
              style={{ fontFamily: "'DM Mono', monospace" }}>
          {settings.targetLufs.toFixed(1)} LUFS
        </span>
      </div>

      {/* Input analysis */}
      {analysis?.lufs !== null && analysis?.lufs !== undefined && (
        <p className="text-[11px] text-white/30">
          Input: <span className="text-white/50">{analysis.lufs.toFixed(1)} LUFS</span>
          {' '}→ <span className="text-[#ff2d6b]">{(settings.targetLufs - analysis.lufs > 0 ? '+' : '')}{(settings.targetLufs - analysis.lufs).toFixed(1)} dB</span>
        </p>
      )}
    </div>
  );
}
```

---

## EQ MODULE — src/features/audio-enhancement/components/EQModule.tsx

```tsx
import { EnhancementSettings } from '../types/enhancer.types';
import { cn } from '@/lib/utils';

interface Props {
  settings: EnhancementSettings;
  onUpdate: (s: Partial<EnhancementSettings>) => void;
  disabled?: boolean;
}

const BAND_LABELS = ['60Hz', '250Hz', '1kHz', '5kHz', '16kHz'];

export default function EQModule({ settings, onUpdate, disabled }: Props) {
  const updateBand = (i: number, gain: number) => {
    const bands = settings.eq.bands.map((b, idx) => idx === i ? { ...b, gain } : b);
    onUpdate({ eq: { ...settings.eq, bands } });
  };

  return (
    <div className="pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-white/50">EQ / Frequency</p>
        <button
          onClick={() => onUpdate({ eq: { ...settings.eq, enabled: !settings.eq.enabled } })}
          disabled={disabled}
          className={cn(
            'w-8 h-4 rounded-full transition-colors relative',
            settings.eq.enabled ? 'bg-[#ff2d6b]' : 'bg-white/[0.12]'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all',
            settings.eq.enabled ? 'left-[18px]' : 'left-0.5'
          )} />
        </button>
      </div>
      <div className={cn('grid grid-cols-5 gap-2 transition-opacity', !settings.eq.enabled && 'opacity-30')}>
        {settings.eq.bands.map((band, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-white/30">{BAND_LABELS[i]}</span>
            <input
              type="range" min={-12} max={12} step={0.5}
              value={band.gain} disabled={disabled || !settings.eq.enabled}
              onChange={(e) => updateBand(i, parseFloat(e.target.value))}
              orient="vertical"
              className="h-16 accent-[#ff2d6b] cursor-pointer"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
            />
            <span className="text-[9px] text-white/40 tabular-nums"
                  style={{ fontFamily: "'DM Mono', monospace" }}>
              {band.gain > 0 ? '+' : ''}{band.gain.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## STEREO MODULE — src/features/audio-enhancement/components/StereoModule.tsx

```tsx
import { EnhancementSettings } from '../types/enhancer.types';

interface Props {
  settings: EnhancementSettings;
  onUpdate: (s: Partial<EnhancementSettings>) => void;
  disabled?: boolean;
}

export default function StereoModule({ settings, onUpdate, disabled }: Props) {
  return (
    <div className="pt-4 flex flex-col gap-3">
      <p className="text-[11px] font-medium text-white/50">Stereo Width</p>
      <div className="flex items-center gap-3">
        <input type="range" min={0} max={200} step={1}
          value={settings.stereoWidth} disabled={disabled}
          onChange={(e) => onUpdate({ stereoWidth: parseInt(e.target.value) })}
          className="flex-1 accent-[#ff2d6b] h-1"
        />
        <span className="text-xs text-white/60 w-10 text-right tabular-nums"
              style={{ fontFamily: "'DM Mono', monospace" }}>
          {settings.stereoWidth}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/30 w-16">Mid gain</span>
        <input type="range" min={-6} max={6} step={0.5}
          value={settings.midGainDb} disabled={disabled}
          onChange={(e) => onUpdate({ midGainDb: parseFloat(e.target.value) })}
          className="flex-1 accent-[#ff2d6b] h-1"
        />
        <span className="text-xs text-white/40 w-10 text-right tabular-nums"
              style={{ fontFamily: "'DM Mono', monospace" }}>
          {settings.midGainDb > 0 ? '+' : ''}{settings.midGainDb.toFixed(1)}dB
        </span>
      </div>
    </div>
  );
}
```

---

## NOISE MODULE — src/features/audio-enhancement/components/NoiseModule.tsx

```tsx
import { EnhancementSettings } from '../types/enhancer.types';
import { cn } from '@/lib/utils';

interface Props {
  settings: EnhancementSettings;
  onUpdate: (s: Partial<EnhancementSettings>) => void;
  disabled?: boolean;
}

export default function NoiseModule({ settings, onUpdate, disabled }: Props) {
  const nr = settings.noiseReduction;
  return (
    <div className="pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-white/50">Noise Reduction</p>
        <button
          onClick={() => onUpdate({ noiseReduction: { ...nr, enabled: !nr.enabled } })}
          disabled={disabled}
          className={cn('w-8 h-4 rounded-full transition-colors relative', nr.enabled ? 'bg-[#ff2d6b]' : 'bg-white/[0.12]')}
        >
          <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', nr.enabled ? 'left-[18px]' : 'left-0.5')} />
        </button>
      </div>
      <div className={cn('flex flex-col gap-3 transition-opacity', !nr.enabled && 'opacity-30')}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 w-20">Reduction</span>
          <input type="range" min={0} max={40} step={1}
            value={nr.reductionDb} disabled={disabled || !nr.enabled}
            onChange={(e) => onUpdate({ noiseReduction: { ...nr, reductionDb: parseInt(e.target.value) } })}
            className="flex-1 accent-[#ff2d6b] h-1"
          />
          <span className="text-xs text-white/40 w-10 text-right tabular-nums"
                style={{ fontFamily: "'DM Mono', monospace" }}>
            {nr.reductionDb}dB
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 w-20">Sensitivity</span>
          <input type="range" min={0} max={100} step={1}
            value={nr.sensitivity * 100} disabled={disabled || !nr.enabled}
            onChange={(e) => onUpdate({ noiseReduction: { ...nr, sensitivity: parseInt(e.target.value) / 100 } })}
            className="flex-1 accent-[#ff2d6b] h-1"
          />
          <span className="text-xs text-white/40 w-10 text-right tabular-nums"
                style={{ fontFamily: "'DM Mono', monospace" }}>
            {Math.round(nr.sensitivity * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## EXPORT ACTIONS — src/features/audio-enhancement/components/ExportActions.tsx

```tsx
import { motion } from 'framer-motion';
import { Sparkles, Download, Lock } from 'lucide-react';
import { ProcessingStatus } from '../types/enhancer.types';
import { cn } from '@/lib/utils';

interface Props {
  status: ProcessingStatus;
  hasEnhanced: boolean;
  isPremium: boolean;
  onEnhance: () => void;
  onDownload: () => void;
}

export default function ExportActions({ status, hasEnhanced, isPremium, onEnhance, onDownload }: Props) {
  const isProcessing = status === 'processing';
  const isReady = status === 'ready' || status === 'done';

  return (
    <div className="flex flex-col gap-2">
      {/* Enhance & Export button */}
      {!isPremium ? (
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          bg-white/[0.04] border border-white/[0.08] text-white/30 text-sm cursor-not-allowed">
          <Lock size={14} />
          Enhance & Export
          <span className="ml-auto text-[10px] bg-[#ff2d6b]/20 text-[#ff2d6b] px-2 py-0.5 rounded-full">
            Premium
          </span>
        </button>
      ) : (
        <motion.button
          onClick={onEnhance}
          disabled={!isReady || isProcessing}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
            isReady && !isProcessing
              ? 'bg-[#ff2d6b] text-white hover:bg-[#ff2d6b]/85'
              : 'bg-white/[0.05] text-white/25 cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Processing…
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Enhance & Export
            </>
          )}
        </motion.button>
      )}

      {/* Download button (after processing) */}
      {hasEnhanced && (
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onDownload}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm
            border border-white/[0.1] text-white/60 hover:text-white hover:border-white/20 transition-all"
        >
          <Download size={14} />
          Download Enhanced WAV
        </motion.button>
      )}
    </div>
  );
}
```

---

## ROUTE WIRING

In your React Router setup, add this route. Replace the existing audio enhancement route:

```tsx
// In your router file (e.g. src/App.tsx or src/router.tsx)
// Remove the old audio enhancement import and replace with:

import AudioEnhancementPage from '@/features/audio-enhancement/AudioEnhancementPage';

// Inside your <Routes>:
<Route path="/audio-enhancement" element={<AudioEnhancementPage />} />
// Adjust the path to match your existing route
```

---

## .ENV

Add to your `.env` file:
```
VITE_ENHANCER_API_URL=http://localhost:8000
```
For production:
```
VITE_ENHANCER_API_URL=https://your-api-domain.com
```

---

## FONTS — add to your index.html <head>

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## PREMIUM GATE — wiring instructions

When you are ready to add premium gating, find this comment in AudioEnhancementPage.tsx:
```
// PREMIUM GATE: replace this block with your real auth check
```
And replace with your Firebase user check, for example:
```typescript
const { user } = useAuth(); // your existing auth hook
if (!user?.isPremium) {
  toast.error('Upgrade to Premium to export enhanced audio');
  return;
}
```
Also pass `isPremium={user?.isPremium ?? false}` to `<ExportActions>`.

---

## CHECKLIST BEFORE RUNNING

- [ ] `VITE_ENHANCER_API_URL` set in `.env`
- [ ] DM Mono + DM Sans fonts added to `index.html`
- [ ] Old audio enhancement files deleted
- [ ] Route updated to point to new `AudioEnhancementPage`
- [ ] Backend running at the URL above (see backend prompt)
