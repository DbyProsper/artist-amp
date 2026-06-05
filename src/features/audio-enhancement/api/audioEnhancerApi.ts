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

export async function analyzeAudio(file: File): Promise<AudioAnalysis> {
  const form = new FormData();
  form.append('file', file);
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/audio/analyze`, { method: 'POST', headers, body: form });
  if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
  return res.json();
}

export async function enhanceAudio(
  file: File,
  settings: EnhancementSettings,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
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
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 35));
    };
    xhr.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(35 + Math.round((e.loaded / e.total) * 60));
    };
    xhr.onload = () => {
      if (xhr.status === 403) return reject(new Error('PREMIUM_REQUIRED'));
      if (xhr.status !== 200) return reject(new Error(`Server error ${xhr.status}`));
      onProgress?.(100);
      resolve(xhr.response as Blob);
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
