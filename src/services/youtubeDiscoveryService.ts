import { API_BASE } from '@/config/api';
import { auth } from '@/lib/firebase';

export interface YouTubeMedia {
  id: string;
  title: string;
  artistOrChannel: string;
  thumbnail: string;
  publishedAt: string;
}

interface SearchResponse {
  results: YouTubeMedia[];
  cached?: boolean;
  stale?: boolean;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(String(payload?.detail || 'YouTube search is temporarily unavailable.'));
  }
  return response.json() as Promise<T>;
}

export function searchYouTube(query: string) {
  return api<SearchResponse>(`/api/discover/search?q=${encodeURIComponent(query)}&maxResults=20`);
}

export function loadYouTubeHistory() {
  return api<SearchResponse>('/api/discover/history');
}

export function saveYouTubeHistory(item: YouTubeMedia) {
  return api<{ saved: boolean }>('/api/discover/history', { method: 'POST', body: JSON.stringify(item) });
}

export function addYouTubeToPlaylist(playlistId: string, item: YouTubeMedia) {
  return api<{ saved: boolean; trackId: string }>('/api/discover/playlist', {
    method: 'POST',
    body: JSON.stringify({ playlistId, ...item }),
  });
}
