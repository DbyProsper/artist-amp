import { API_BASE } from '@/config/api';
import { auth } from '@/lib/firebase';
import type { Track } from '@/types';

export interface YouTubeMedia {
  id: string;
  title: string;
  artistOrChannel: string;
  thumbnail: string;
  publishedAt: string;
  play_count?: number;
}

export function youtubeMediaToTrack(item: YouTubeMedia): Track {
  return {
    id: `youtube-${item.id}`,
    title: item.title,
    artist: { id: `youtube-channel-${item.artistOrChannel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: item.artistOrChannel, username: item.artistOrChannel, avatar: item.thumbnail, coverImage: item.thumbnail, bio: '', location: 'YouTube', genres: ['Music'], isVerified: false, followers: 0, following: 0, tracks: 0 },
    coverArt: item.thumbnail,
    duration: 0,
    plays: Number(item.play_count) || 0,
    likes: 0,
    source: 'youtube',
    sourceCollection: 'external_media',
    sourceDocumentId: `youtube-${item.id}`,
    provider: 'youtube',
    youtubeVideoId: item.id,
    genre: 'Music',
  };
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
