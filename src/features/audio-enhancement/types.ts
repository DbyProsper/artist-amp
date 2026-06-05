export type PresetKey = 'dsp' | 'mastered' | 'vocals' | 'vinyl' | 'custom';

export interface EQBand {
  freq: 60 | 250 | 1000 | 5000 | 16000;
  type: 'lowshelf' | 'peaking' | 'highshelf';
  gain: number; // dB, -12 to +12
}

export interface EnhancementSettings {
  targetLufs: number;    // -24 to -6
  truePeak: number;      // -4 to 0
  eq: { enabled: boolean; bands: EQBand[] };
  stereoWidth: number;   // 0–200%
  midGainDb: number;
  sideGainDb: number;
  noiseReduction: { enabled: boolean; reductionDb: number; sensitivity: number };
}

export interface AudioAnalysis {
  lufs: number | null;
  peak_db: number;
  duration_sec: number;
  sample_rate: number;
  channels: number;
}

export type ProcessingStage = 'idle' | 'analyzing' | 'enhancing' | 'done' | 'error';

export interface EnhancementState {
  file: File | null;
  originalBuffer: AudioBuffer | null;
  enhancedBuffer: AudioBuffer | null;
  enhancedBlob: Blob | null;
  analysis: AudioAnalysis | null;
  settings: EnhancementSettings;
  activePreset: PresetKey;
  activeView: 'original' | 'enhanced';
  stage: ProcessingStage;
  progress: number;
  error: string | null;
}
