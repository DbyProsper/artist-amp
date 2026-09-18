export type DawEffectId = 'pitch' | 'delay' | 'equalizer' | 'compressor' | 'reverb';

export interface PitchEffectSettings {
  enabled: boolean; wet: number; key: string; scale: string; enabledNotes: number[];
  minFrequency: number; referenceFrequency: number; retuneSpeed: number; correctionStrength: number;
  fineTune: number; preserveFormants: boolean; formantShift: number; gender: number;
  stereoSpread: number; octave: number; harmony: number; midiMode: boolean; humanize: number;
}
export interface DelayEffectSettings {
  enabled: boolean; wet: number; dry: number; timeMs: number; tempoSync: boolean; division: string;
  smoothing: number; offset: number; mode: 'Mono' | 'Stereo' | 'Ping pong' | 'Off'; stereo: number;
  feedback: number; feedbackCutoff: number; resonance: number; filterMode: 'LP' | 'HP' | 'BP' | 'Off';
  sampleRate: number; bits: number; modulationWet: number; modulationRate: number; modulationTime: number;
  modulationCutoff: number; diffusionLevel: number; diffusionSpread: number; distortionLevel: number;
  distortionKnee: number; distortionSymmetry: number; tone: number;
}
export interface EqBandSettings { frequency: number; gain: number; q: number; type: BiquadFilterType; enabled: boolean }
export interface EqualizerEffectSettings {
  enabled: boolean; wet: number; hq: boolean; monitor: boolean; compare: boolean; spectrum: boolean; bands: EqBandSettings[];
}
export interface CompressorEffectSettings {
  enabled: boolean; wet: number; threshold: number; ratio: number; knee: number; attack: number;
  release: number; makeupGain: number; autoGain: boolean; type: 'Soft' | 'Medium' | 'Hard'; sidechain: number;
}
export interface ReverbEffectSettings {
  enabled: boolean; dry: number; early: number; wet: number; mode: 'Mid' | 'Side'; highCut: number;
  lowCut: number; preDelay: number; tempoSync: boolean; size: number; modulation: number;
  diffusion: number; speed: number; bass: number; decay: number; crossover: number;
  damping: number; separation: number;
}
export interface DawEffects {
  order: DawEffectId[]; pitch: PitchEffectSettings; delay: DelayEffectSettings;
  equalizer: EqualizerEffectSettings; compressor: CompressorEffectSettings; reverb: ReverbEffectSettings;
}

export const EFFECT_LABELS: Record<DawEffectId, string> = {
  pitch: 'Voice Pitch Tuner', delay: 'Delay', equalizer: 'Parametric EQ', compressor: 'Compressor', reverb: 'Reverb',
};
export const ALL_DAW_EFFECTS: DawEffectId[] = ['pitch', 'delay', 'equalizer', 'compressor', 'reverb'];
export const PITCH_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SCALE_INTERVALS: Record<string, number[]> = {
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10], Pentatonic: [0, 2, 4, 7, 9], Blues: [0, 3, 5, 6, 7, 10],
};

export function defaultDawEffects(): DawEffects {
  return {
    order: [...ALL_DAW_EFFECTS],
    pitch: { enabled: false, wet: 100, key: 'C', scale: 'Major', enabledNotes: [], minFrequency: 80, referenceFrequency: 440, retuneSpeed: 65, correctionStrength: 85, fineTune: 0, preserveFormants: true, formantShift: 0, gender: 0, stereoSpread: 0, octave: 0, harmony: 0, midiMode: false, humanize: 18 },
    delay: { enabled: false, wet: 22, dry: 100, timeMs: 320, tempoSync: false, division: '1/4', smoothing: 25, offset: 0, mode: 'Stereo', stereo: 55, feedback: 32, feedbackCutoff: 7200, resonance: 10, filterMode: 'LP', sampleRate: 100, bits: 16, modulationWet: 0, modulationRate: 20, modulationTime: 12, modulationCutoff: 8000, diffusionLevel: 8, diffusionSpread: 35, distortionLevel: 0, distortionKnee: 30, distortionSymmetry: 50, tone: 50 },
    equalizer: { enabled: true, wet: 100, hq: true, monitor: false, compare: false, spectrum: true, bands: [
      { frequency: 60, gain: 0, q: .7, type: 'lowshelf', enabled: true }, { frequency: 120, gain: 0, q: 1, type: 'peaking', enabled: true },
      { frequency: 250, gain: 0, q: 1, type: 'peaking', enabled: true }, { frequency: 500, gain: 0, q: 1, type: 'peaking', enabled: true },
      { frequency: 1000, gain: 0, q: 1, type: 'peaking', enabled: true }, { frequency: 4000, gain: 0, q: 1, type: 'peaking', enabled: true },
      { frequency: 10000, gain: 0, q: .7, type: 'highshelf', enabled: true },
    ] },
    compressor: { enabled: false, wet: 100, threshold: -18, ratio: 3.2, knee: 18, attack: 10.8, release: 117, makeupGain: 3.4, autoGain: false, type: 'Soft', sidechain: 0 },
    reverb: { enabled: false, dry: 100, early: 18, wet: 22, mode: 'Mid', highCut: 14000, lowCut: 90, preDelay: 22, tempoSync: false, size: 52, modulation: 12, diffusion: 70, speed: 24, bass: 48, decay: 48, crossover: 620, damping: 46, separation: 0 },
  };
}

function merge<T extends object>(base: T, value: unknown): T { return { ...base, ...(value && typeof value === 'object' ? value : {}) }; }
export function normalizeDawEffects(value?: Partial<DawEffects>, legacy?: Record<string, unknown>): DawEffects {
  const defaults = defaultDawEffects();
  const eq = merge(defaults.equalizer, value?.equalizer);
  const legacyPitchAmount = Number(legacy?.pitchAmount || 0);
  return {
    order: Array.isArray(value?.order) ? value!.order.filter(item => ALL_DAW_EFFECTS.includes(item)) : defaults.order,
    pitch: merge(defaults.pitch, value?.pitch || { enabled: legacy?.pitchEnabled !== false && legacyPitchAmount > 0, key: legacy?.pitchKey || 'C', scale: legacy?.pitchScale || 'Major', correctionStrength: legacyPitchAmount || defaults.pitch.correctionStrength }),
    delay: merge(defaults.delay, value?.delay || { enabled: legacy?.delayEnabled !== false && Number(legacy?.delay || 0) > 0, wet: Number(legacy?.delay || defaults.delay.wet) }),
    equalizer: { ...eq, enabled: value?.equalizer?.enabled ?? legacy?.eqEnabled !== false, bands: Array.isArray(value?.equalizer?.bands) && value!.equalizer!.bands.length ? value!.equalizer!.bands.map((band, index) => merge(defaults.equalizer.bands[index] || defaults.equalizer.bands[3], band)) : defaults.equalizer.bands.map((band, index) => ({ ...band, gain: Number([legacy?.eqLow, legacy?.eqMid, legacy?.eqHigh][Math.min(2, Math.floor(index / 3))] || 0) })) },
    compressor: merge(defaults.compressor, value?.compressor || (Number(legacy?.compressorAmount || 0) > 0 ? { enabled: Boolean(legacy?.compressorEnabled), threshold: -4 - Number(legacy?.compressorAmount || 0) * .36, ratio: 1 + Number(legacy?.compressorAmount || 0) * .11 } : { enabled: Boolean(legacy?.compressorEnabled) })),
    reverb: merge(defaults.reverb, value?.reverb || { enabled: legacy?.reverbEnabled !== false && Number(legacy?.reverb || 0) > 0, wet: Number(legacy?.reverb || defaults.reverb.wet) }),
  };
}

export function nearestScaleCorrectionCents(frequency: number, settings: PitchEffectSettings): number {
  if (!Number.isFinite(frequency) || frequency <= 0) return 0;
  const midi = 69 + 12 * Math.log2(frequency / settings.referenceFrequency);
  const root = PITCH_KEYS.indexOf(settings.key);
  const allowed = settings.enabledNotes.length ? settings.enabledNotes : SCALE_INTERVALS[settings.scale] || SCALE_INTERVALS.Chromatic;
  let target = Math.round(midi), best = Number.POSITIVE_INFINITY;
  for (let candidate = Math.floor(midi) - 12; candidate <= Math.ceil(midi) + 12; candidate += 1) {
    if (!allowed.includes((candidate - root + 1200) % 12)) continue;
    const distance = Math.abs(candidate - midi); if (distance < best) { best = distance; target = candidate; }
  }
  const strength = settings.correctionStrength / 100 * settings.wet / 100;
  return Math.max(-600, Math.min(600, (target - midi) * 100 * strength + settings.fineTune));
}

export function estimatePitch(data: Float32Array, sampleRate: number, minFrequency = 80, maxFrequency = 1000): number {
  let rms = 0; for (let index = 0; index < data.length; index += 1) rms += data[index] * data[index];
  if (Math.sqrt(rms / data.length) < .012) return 0;
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency)), maxLag = Math.min(data.length - 2, Math.ceil(sampleRate / minFrequency));
  let bestLag = 0, bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let correlation = 0, energyA = 0, energyB = 0;
    for (let index = 0; index < data.length - lag; index += 8) { const a = data[index], b = data[index + lag]; correlation += a * b; energyA += a * a; energyB += b * b; }
    const score = correlation / Math.sqrt(Math.max(1e-9, energyA * energyB));
    const weightedScore = score * (1 - lag / maxLag * .04);
    if (weightedScore > bestScore) { bestScore = weightedScore; bestLag = lag; }
  }
  return bestScore > .62 && bestLag ? sampleRate / bestLag : 0;
}
