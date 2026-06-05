import { EnhancementSettings, PresetKey } from './types';

export const PRESET_META: Record<PresetKey, { name: string; description: string; icon: string }> = {
  dsp:      { name: 'DSP Quality',  description: 'Streaming-ready. Hits -14 LUFS with clean transients and balanced EQ.',      icon: 'Radio' },
  mastered: { name: 'Mastered',     description: 'Industry-standard loudness and clarity. Ideal for professional releases.',    icon: 'Disc3' },
  vocals:   { name: 'Vocals',       description: 'Cleans vocal recordings. Reduces noise and enhances presence and warmth.',    icon: 'Mic2' },
  vinyl:    { name: 'Vinyl Warmth', description: 'Rich low-end, narrowed stereo image, analogue warmth.',                       icon: 'Music2' },
  custom:   { name: 'Custom',       description: 'Manually adjust Loudness, EQ, Stereo Width and Noise Reduction.',             icon: 'SlidersHorizontal' },
};

export const PRESETS: Record<PresetKey, EnhancementSettings> = {
  dsp: {
    targetLufs: -14, truePeak: -1,
    eq: { enabled: true, bands: [
      { freq: 60,    type: 'lowshelf',  gain: 1.0  },
      { freq: 250,   type: 'peaking',   gain: -1.0 },
      { freq: 1000,  type: 'peaking',   gain: 0.0  },
      { freq: 5000,  type: 'peaking',   gain: 2.0  },
      { freq: 16000, type: 'highshelf', gain: 1.5  },
    ]},
    stereoWidth: 120, midGainDb: 0, sideGainDb: 1.5,
    noiseReduction: { enabled: true, reductionDb: 15, sensitivity: 0.5 },
  },
  mastered: {
    targetLufs: -9, truePeak: -0.3,
    eq: { enabled: true, bands: [
      { freq: 60,    type: 'lowshelf',  gain: 2.0  },
      { freq: 250,   type: 'peaking',   gain: -0.5 },
      { freq: 1000,  type: 'peaking',   gain: 0.5  },
      { freq: 5000,  type: 'peaking',   gain: 1.5  },
      { freq: 16000, type: 'highshelf', gain: 2.0  },
    ]},
    stereoWidth: 140, midGainDb: 0, sideGainDb: 2.0,
    noiseReduction: { enabled: true, reductionDb: 8, sensitivity: 0.3 },
  },
  vocals: {
    targetLufs: -16, truePeak: -1.5,
    eq: { enabled: true, bands: [
      { freq: 60,    type: 'lowshelf',  gain: -2.0 },
      { freq: 250,   type: 'peaking',   gain: -3.0 },
      { freq: 1000,  type: 'peaking',   gain: 2.0  },
      { freq: 5000,  type: 'peaking',   gain: 3.5  },
      { freq: 16000, type: 'highshelf', gain: 1.0  },
    ]},
    stereoWidth: 90, midGainDb: 2, sideGainDb: 0,
    noiseReduction: { enabled: true, reductionDb: 25, sensitivity: 0.7 },
  },
  vinyl: {
    targetLufs: -18, truePeak: -2,
    eq: { enabled: true, bands: [
      { freq: 60,    type: 'lowshelf',  gain: 3.5  },
      { freq: 250,   type: 'peaking',   gain: 2.0  },
      { freq: 1000,  type: 'peaking',   gain: 0.0  },
      { freq: 5000,  type: 'peaking',   gain: -1.5 },
      { freq: 16000, type: 'highshelf', gain: -2.5 },
    ]},
    stereoWidth: 75, midGainDb: 1, sideGainDb: -0.5,
    noiseReduction: { enabled: false, reductionDb: 5, sensitivity: 0.2 },
  },
  custom: {
    targetLufs: -14, truePeak: -1,
    eq: { enabled: true, bands: [
      { freq: 60,    type: 'lowshelf',  gain: 0 },
      { freq: 250,   type: 'peaking',   gain: 0 },
      { freq: 1000,  type: 'peaking',   gain: 0 },
      { freq: 5000,  type: 'peaking',   gain: 0 },
      { freq: 16000, type: 'highshelf', gain: 0 },
    ]},
    stereoWidth: 100, midGainDb: 0, sideGainDb: 0,
    noiseReduction: { enabled: true, reductionDb: 0, sensitivity: 0.5 },
  },
};
