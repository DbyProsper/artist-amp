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
  genre?: string;
}

const YOUTUBE_HISTORY_CACHE_KEY = 'musicinsta:youtube-history:v2';
const YOUTUBE_HISTORY_CACHE_MS = 30 * 60 * 1000;

export function inferYouTubeGenre(item: Pick<YouTubeMedia, 'title' | 'artistOrChannel' | 'genre'>): string {
  if (item.genre && item.genre !== 'Music') return item.genre;
  const value = `${item.title} ${item.artistOrChannel}`.toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ['Amapiano', /amapiano|kabza|mdu aka trp|kelvin momo|scorpion kings|log drum/],
    ['Afrosoul', /afrosoul|afro soul|soulful afro/],
    ['Afrobeats', /afrobeats?|burna boy|wizkid|davido|tems|rema|ayra starr/],
    ['Gospel', /gospel|worship|praise|spirit of praise|joyous celebration/],
    ['R&B', /r&b|rnb|rhythm and blues|sza|summer walker|partynextdoor|brent faiyaz/],
    ['Trap', /trap|trapsoul|melodic trap|future|young thug|metro boomin/],
    ['Hip-Hop', /hip[ -]?hop|rap|rapper|freestyle|drake|kendrick|j\. cole/],
    ['Rock', /rock|metal|punk|guitar band|linkin park|coldplay/],
    ['Pop', /pop|taylor swift|dua lipa|ariana grande|the weeknd/],
    ['House', /house|deep house|black coffee|shimza/],
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] || 'Music';
}

export function youtubeMediaToTrack(item: YouTubeMedia): Track {
  const genre = inferYouTubeGenre(item);
  return {
    id: `youtube-${item.id}`,
    title: item.title,
    artist: { id: `youtube-channel-${item.artistOrChannel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: item.artistOrChannel, username: item.artistOrChannel, avatar: item.thumbnail, coverImage: item.thumbnail, bio: '', location: 'YouTube', genres: [genre], isVerified: false, followers: 0, following: 0, tracks: 0 },
    coverArt: item.thumbnail,
    duration: 0,
    plays: Number(item.play_count) || 0,
    likes: 0,
    source: 'youtube',
    sourceCollection: 'external_media',
    sourceDocumentId: `youtube-${item.id}`,
    provider: 'youtube',
    youtubeVideoId: item.id,
    genre,
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
  try {
    const cached = JSON.parse(localStorage.getItem(YOUTUBE_HISTORY_CACHE_KEY) || 'null');
    if (cached?.savedAt && Date.now() - cached.savedAt < YOUTUBE_HISTORY_CACHE_MS && Array.isArray(cached.results)) return Promise.resolve({ results: cached.results, cached: true } as SearchResponse);
  } catch { /* refresh below */ }
  return api<SearchResponse>('/api/discover/history').then(response => {
    try { localStorage.setItem(YOUTUBE_HISTORY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), results: response.results || [] })); } catch { /* storage can be unavailable */ }
    return response;
  });
}

export function saveYouTubeHistory(item: YouTubeMedia) {
  try {
    const cached = JSON.parse(localStorage.getItem(YOUTUBE_HISTORY_CACHE_KEY) || 'null');
    const results = Array.isArray(cached?.results) ? cached.results.filter((value: YouTubeMedia) => value.id !== item.id) : [];
    localStorage.setItem(YOUTUBE_HISTORY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), results: [{ ...item, genre: inferYouTubeGenre(item) }, ...results] }));
  } catch { /* best effort */ }
  return api<{ saved: boolean }>('/api/discover/history', { method: 'POST', body: JSON.stringify({ ...item, genre: inferYouTubeGenre(item) }) });
}

export function addYouTubeToPlaylist(playlistId: string, item: YouTubeMedia) {
  return api<{ saved: boolean; trackId: string }>('/api/discover/playlist', {
    method: 'POST',
    body: JSON.stringify({ playlistId, ...item }),
  });
}
