import { AudioAnalysis, EnhancementSettings } from '../types';

const BASE = import.meta.env.VITE_ENHANCER_API_URL ?? 'http://localhost:8000';

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { getAuth } = await import('firebase/auth');
    const user = getAuth().currentUser;
    const token = user ? await user.getIdToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function createAudioContext(): Promise<AudioContext> {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = await createAudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const durationSec = audioBuffer.duration;
  let peak = 0;
  let sumSquares = 0;
  let totalSamples = 0;

  for (let ch = 0; ch < channels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const value = Math.abs(data[i]);
      peak = Math.max(peak, value);
      sumSquares += data[i] * data[i];
      totalSamples += 1;
    }
  }

  const rms = totalSamples > 0 ? Math.sqrt(sumSquares / totalSamples) : 0;
  const lufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -Infinity;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;

  return {
    lufs: Number.isFinite(lufs) ? Number(lufs.toFixed(2)) : null,
    peak_db: Number.isFinite(peakDb) ? Number(peakDb.toFixed(2)) : -Infinity,
    duration_sec: Number(durationSec.toFixed(2)),
    sample_rate: sampleRate,
    channels,
  };
}

export async function enhanceAudio(
  file: File,
  settings: EnhancementSettings,
  onProgress?: (pct: number, stage: 'uploading' | 'downloading') => void,
): Promise<{ blob: Blob; timings: EnhancementTimings }> {
  const headers = await getAuthHeader();
  const form = new FormData();
  form.append('file', file);
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

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/audio/enhance`);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.responseType = 'blob';

    // Upload progress: 0% → 30%
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 30), 'uploading');
      }
    };

    // Upload complete — backend is now processing (30% → 35% indeterminate)
    xhr.upload.onload = () => {
      onProgress?.(33, 'uploading');
    };

    // Download progress: 35% → 98%
    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const dlPct = Math.round((e.loaded / e.total) * 63);
        onProgress?.(35 + dlPct, 'downloading');
      }
    };

    xhr.onload = () => {
      if (xhr.status === 403) return reject(new Error('PREMIUM_REQUIRED'));
      if (xhr.status !== 200) return reject(new Error(`Server error ${xhr.status}`));

      const timings: EnhancementTimings = {
        loadTime:    xhr.getResponseHeader('X-Enhance-Load-Time')    ?? null,
        processTime: xhr.getResponseHeader('X-Enhance-Process-Time') ?? null,
        encodeTime:  xhr.getResponseHeader('X-Enhance-Encode-Time')  ?? null,
        totalTime:   xhr.getResponseHeader('X-Enhance-Total-Time')   ?? null,
      };

      onProgress?.(100, 'downloading');
      resolve({ blob: xhr.response as Blob, timings });
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(form);
  });
}

export function triggerDownload(blob: Blob, originalFilename: string): void {
  const stem = originalFilename.replace(/\.[^/.]+$/, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${stem}_enhanced.wav`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
