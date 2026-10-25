import { API_BASE } from '@/config/api';

export interface StemFileResult {
  url: string;
  filename: string;
  size: number;
}

export interface StemSeparationResult {
  sourceName: string;
  model: string;
  duration: number;
  vocals: StemFileResult;
  instrumental: StemFileResult;
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { getAuth } = await import('firebase/auth');
    const token = await getAuth().currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function separateAudio(file: File, onProgress?: (progress: number, label: string) => void): Promise<StemSeparationResult> {
  const headers = await authHeaders();
  const form = new FormData();
  form.append('file', file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE}/audio/separate`);
    request.timeout = 15 * 60 * 1000;
    Object.entries(headers).forEach(([key, value]) => request.setRequestHeader(key, value));
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 20), 'Uploading source audio');
    };
    request.upload.onload = () => onProgress?.(24, 'Separating vocals and instrumental');
    request.onprogress = () => onProgress?.(88, 'Receiving separated stems');
    request.onerror = () => reject(new Error('Could not reach the stem-separation service.'));
    request.ontimeout = () => reject(new Error('Stem separation took too long. Try a shorter track.'));
    request.onload = () => {
      let response: { success?: boolean; data?: Record<string, unknown>; detail?: string; error?: string } | null = null;
      try { response = JSON.parse(request.responseText); } catch { /* handled below */ }
      if (request.status < 200 || request.status >= 300 || !response?.success || !response.data) {
        reject(new Error(response?.detail || response?.error || `Stem separation failed (${request.status}).`));
        return;
      }
      const data = response.data;
      onProgress?.(100, 'Stems ready');
      resolve({
        sourceName: String(data.source_name || file.name.replace(/\.[^.]+$/, '')),
        model: String(data.model || 'htdemucs'),
        duration: Number(data.duration) || 0,
        vocals: data.vocals as unknown as StemFileResult,
        instrumental: data.instrumental as unknown as StemFileResult,
      });
    };
    request.send(form);
  });
}

export async function downloadStem(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The stem could not be downloaded.');
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
