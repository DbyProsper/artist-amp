export interface UploadProgressState { active: boolean; progress: number; label: string; error?: string }
export const UPLOAD_PROGRESS_KEY = 'musicinsta_upload_progress';
export const UPLOAD_PROGRESS_EVENT = 'musicinsta:upload-progress';

export function publishUploadProgress(state: UploadProgressState) {
  localStorage.setItem(UPLOAD_PROGRESS_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(UPLOAD_PROGRESS_EVENT, { detail: state }));
}

export function readUploadProgress(): UploadProgressState | null {
  try { return JSON.parse(localStorage.getItem(UPLOAD_PROGRESS_KEY) || 'null'); }
  catch { return null; }
}

export function clearUploadProgress() {
  localStorage.removeItem(UPLOAD_PROGRESS_KEY);
  window.dispatchEvent(new CustomEvent(UPLOAD_PROGRESS_EVENT, { detail: null }));
}
