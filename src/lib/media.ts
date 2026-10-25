import type { Track } from '@/types';

export const DEFAULT_MEDIA_IMAGE = '/musicinsta-default-cover.webp';

const durationCache = new Map<string, number>();

export function formatMediaDuration(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '--:--';
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function readMediaDuration(source: string | Blob): Promise<number> {
  const cacheKey = typeof source === 'string' ? source : '';
  if (cacheKey && durationCache.has(cacheKey)) return Promise.resolve(durationCache.get(cacheKey)!);
  return new Promise(resolve => {
    const audio = document.createElement('audio');
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const finish = (duration = 0) => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      if (cacheKey && duration > 0) durationCache.set(cacheKey, duration);
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(), 8000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      finish(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => { window.clearTimeout(timeout); finish(); };
    audio.src = url;
  });
}

export async function hydrateTrackDurations(tracks: Track[], concurrency = 5): Promise<Track[]> {
  const next = [...tracks];
  let cursor = 0;
  async function worker() {
    while (cursor < next.length) {
      const index = cursor++;
      const track = next[index];
      if (track.duration > 0 || !track.audioUrl) continue;
      const duration = await readMediaDuration(track.audioUrl);
      if (duration > 0) next[index] = { ...track, duration };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, next.length) }, worker));
  return next;
}
