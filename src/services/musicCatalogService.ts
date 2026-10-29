import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Artist, Track } from '@/types';
import type { ListeningHistoryEntry } from '@/services/recommendationEngine';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';

const HISTORY_VERSION = 1;
const HISTORY_EVENT = 'musicinsta:listening-history';
const CATALOG_CACHE_MS = 5 * 60 * 1000;
const catalogCache = new Map<string, { tracks: Track[]; loadedAt: number }>();
const catalogRequests = new Map<string, Promise<Track[]>>();

function historyKey(userId: string) {
  return `musicinsta_listening_history_v${HISTORY_VERSION}_${userId}`;
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function date(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function artistFrom(data: Record<string, unknown>, profiles: Map<string, Record<string, unknown>>): Artist {
  const profileId = String(data.profile_id || data.artist_id || data.user_id || data.userId || 'musicinsta');
  const profile = profiles.get(profileId) ?? {};
  const embedded = (data.artist && typeof data.artist === 'object' ? data.artist : {}) as Record<string, unknown>;
  return {
    id: profileId,
    name: String(profile.name || embedded.name || data.artist_name || 'MusicInsta Artist'),
    username: String(profile.username || embedded.username || 'musicinsta'),
    avatar: String(profile.avatar_url || embedded.avatar || DEFAULT_MEDIA_IMAGE),
    coverImage: String(profile.cover_url || embedded.coverImage || DEFAULT_MEDIA_IMAGE),
    bio: String(profile.bio || ''),
    location: String(profile.location || ''),
    genres: Array.isArray(profile.genres) ? profile.genres.map(String) : [],
    isVerified: Boolean(profile.is_verified || embedded.isVerified),
    followers: number(profile.followers),
    following: number(profile.following),
    tracks: number(profile.tracks),
  };
}

function trackFrom(id: string, data: Record<string, unknown>, profiles: Map<string, Record<string, unknown>>, source: Track['source']): Track | null {
  const metadata = (data.metadata && typeof data.metadata === 'object' ? data.metadata : {}) as Record<string, unknown>;
  const audioUrl = String(data.audio_url || data.audioUrl || data.url || metadata.audio_url || '');
  if (!audioUrl) return null;
  const artist = artistFrom(data, profiles);
  const genres = [data.genre, metadata.genre, ...(artist.genres || [])].filter(Boolean).map(String);
  return {
    id,
    title: String(data.title || data.song_name || data.name || 'Untitled track'),
    artist,
    coverArt: String(data.cover_url || data.coverArt || data.image_url || metadata.cover_url || DEFAULT_MEDIA_IMAGE),
    duration: number(data.duration || metadata.duration),
    plays: number(data.plays),
    likes: number(data.likes),
    audioUrl,
    lyrics: String(data.lyrics || metadata.lyrics || metadata.plan || '') || undefined,
    timestampedLyrics: (data.timestamped_lyrics || metadata.timestamped_lyrics) as Track['timestampedLyrics'],
    lyricStartTime: number(data.lyric_start_time || metadata.lyric_start_time) || undefined,
    credits: (data.credits || metadata.credits) as Track['credits'],
    genre: genres[0],
    mood: String(data.mood || metadata.mood || '') || undefined,
    bpm: number(data.bpm || metadata.bpm) || undefined,
    energy: number(data.energy || metadata.energy, Number.NaN),
    loudness: number(data.loudness || metadata.loudness, Number.NaN),
    tags: [...new Set([...genres, ...(Array.isArray(data.tags) ? data.tags.map(String) : [])])],
    storagePath: String(data.storage_path || metadata.storage_path || '') || undefined,
    source,
    isPublic: data.is_public !== false,
    createdAt: date(data.created_at || data.createdAt),
    albumId: String(data.album_id || metadata.album_id || '') || undefined,
    trackNumber: number(data.track_number || metadata.track_number) || undefined,
  };
}

function mergeTracks(groups: Track[][]): Track[] {
  const tracks = new Map<string, Track>();
  const urls = new Set<string>();
  for (const group of groups) {
    for (const track of group) {
      if (!track.audioUrl || tracks.has(track.id) || urls.has(track.audioUrl)) continue;
      tracks.set(track.id, track);
      urls.add(track.audioUrl);
    }
  }
  return [...tracks.values()];
}

async function loadFirestoreCatalog(userId?: string): Promise<Track[]> {
  const [tracksResult, songsResult, profilesResult] = await Promise.allSettled([
    getDocs(collection(db, 'tracks')),
    getDocs(collection(db, 'songs')),
    getDocs(collection(db, 'profiles')),
  ]);
  const profiles = new Map<string, Record<string, unknown>>();
  if (profilesResult.status === 'fulfilled') profilesResult.value.docs.forEach(item => profiles.set(item.id, item.data()));
  const result: Track[] = [];
  if (tracksResult.status === 'fulfilled') {
    for (const item of tracksResult.value.docs) {
      const data = item.data();
      const owner = String(data.profile_id || data.user_id || '');
      if (data.is_public === false && owner !== userId) continue;
      const track = trackFrom(item.id, data, profiles, data.metadata?.mode ? 'generated' : 'firestore');
      if (track) result.push(track);
    }
  }
  if (songsResult.status === 'fulfilled') {
    for (const item of songsResult.value.docs) {
      const data = item.data();
      const owner = String(data.profile_id || data.user_id || data.userId || '');
      if (data.is_public === false && owner !== userId) continue;
      const track = trackFrom(`song-${item.id}`, data, profiles, 'gcs');
      if (track) result.push(track);
    }
  }
  return result;
}

async function loadBackendCatalog(userId?: string): Promise<Track[]> {
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (!base) return [];
  const token = userId ? await auth.currentUser?.getIdToken() : null;
  const response = await fetch(`${base}/api/catalog`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const items = Array.isArray(payload?.tracks) ? payload.tracks : [];
  const profiles = new Map<string, Record<string, unknown>>();
  return items.flatMap((item: Record<string, unknown>) => {
    const track = trackFrom(String(item.id || item.track_id || item.song_name), item, profiles, 'gcs');
    return track ? [track] : [];
  });
}

export async function loadMusicCatalog(userId?: string): Promise<Track[]> {
  const cacheKey = userId || 'guest';
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < CATALOG_CACHE_MS) return cached.tracks;
  const pending = catalogRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    // Firestore is the canonical catalogue and now has persistent IndexedDB
    // caching. Only call the backend catalogue as a fallback, avoiding the old
    // behaviour that downloaded the complete catalogue twice on every visit.
    const firestore = await loadFirestoreCatalog(userId).catch(() => []);
    const tracks = firestore.length ? firestore : await loadBackendCatalog(userId).catch(() => []);
    const merged = mergeTracks([tracks]);
    catalogCache.set(cacheKey, { tracks: merged, loadedAt: Date.now() });
    return merged;
  })().finally(() => catalogRequests.delete(cacheKey));

  catalogRequests.set(cacheKey, request);
  return request;
}

export function getLocalListeningHistory(userId: string): ListeningHistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(historyKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(historyKey(userId));
    return [];
  }
}

function saveLocalListeningHistory(userId: string, history: ListeningHistoryEntry[]) {
  localStorage.setItem(historyKey(userId), JSON.stringify(history.slice(0, 500)));
  window.dispatchEvent(new CustomEvent(HISTORY_EVENT, { detail: history }));
}

export async function loadListeningHistory(userId: string): Promise<ListeningHistoryEntry[]> {
  const local = getLocalListeningHistory(userId);
  try {
    const snapshot = await getDocs(query(collection(db, 'listening_history'), where('user_id', '==', userId)));
    const remote = snapshot.docs.map(item => {
      const data = item.data();
      return {
        trackId: String(data.track_id), userId,
        playCount: number(data.play_count), completedCount: number(data.completed_count), skipCount: number(data.skip_count),
        liked: Boolean(data.liked), lastPlayedAt: date(data.last_played_at)?.getTime() || 0, lastPosition: number(data.last_position),
      } satisfies ListeningHistoryEntry;
    });
    const merged = new Map(local.map(item => [item.trackId, item]));
    for (const entry of remote) {
      const previous = merged.get(entry.trackId);
      merged.set(entry.trackId, previous ? {
        ...entry,
        playCount: Math.max(entry.playCount, previous.playCount),
        completedCount: Math.max(entry.completedCount, previous.completedCount),
        skipCount: Math.max(entry.skipCount, previous.skipCount),
        liked: entry.liked || previous.liked,
        lastPlayedAt: Math.max(entry.lastPlayedAt, previous.lastPlayedAt),
      } : entry);
    }
    const result = [...merged.values()].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    saveLocalListeningHistory(userId, result);
    return result;
  } catch {
    return local;
  }
}

export type ListeningEvent = 'play' | 'complete' | 'skip' | 'like' | 'unlike';

export async function syncLikedTrack(userId: string, creatorId: string, track: Track, liked: boolean) {
  const likeId = `${userId}_${track.id}`.replaceAll('/', '_').slice(0, 1400);
  const likeRef = doc(db, 'track_likes', likeId);
  const wasLiked = (await getDoc(likeRef)).exists();
  if (liked) await setDoc(likeRef, { user_id: userId, track_id: track.id, created_at: serverTimestamp() }, { merge: true });
  else await deleteDoc(likeRef).catch(() => undefined);

  const playlists = await getDocs(query(collection(db, 'playlists'), where('creator_id', '==', creatorId)));
  const likedPlaylist = playlists.docs.find(item => item.data().system_kind === 'liked_music' || String(item.data().name || '').toLowerCase() === 'liked music');
  if (likedPlaylist) {
    await updateDoc(likedPlaylist.ref, {
      tracks: liked ? arrayUnion(track.id) : arrayRemove(track.id),
      updated_at: serverTimestamp(),
    });
  } else if (liked) {
    await addDoc(collection(db, 'playlists'), {
      creator_id: creatorId,
      auth_user_id: userId,
      name: 'Liked Music',
      description: 'Songs you like on MusicInsta',
      system_kind: 'liked_music',
      tracks: [track.id],
      is_public: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  if (wasLiked !== liked) {
    const isSong = track.id.startsWith('song-');
    const trackRef = doc(db, isSong ? 'songs' : 'tracks', isSong ? track.id.slice(5) : track.id);
    await updateDoc(trackRef, { likes: increment(liked ? 1 : -1) }).catch(() => undefined);
    await addDoc(collection(db, 'analytics_events'), {
      artist_id: track.artist.id,
      track_id: track.id,
      event: liked ? 'like' : 'unlike',
      genre: track.genre || null,
      actor_id: userId,
      created_at: serverTimestamp(),
    }).catch(() => undefined);
  }
}

export function recordListeningInteraction(userId: string, track: Track, event: ListeningEvent, lastPosition = 0): ListeningHistoryEntry[] {
  const current = getLocalListeningHistory(userId);
  const previous = current.find(item => item.trackId === track.id) ?? {
    trackId: track.id, userId, playCount: 0, completedCount: 0, skipCount: 0, liked: false, lastPlayedAt: 0,
  };
  const updated: ListeningHistoryEntry = {
    ...previous,
    playCount: previous.playCount + (event === 'play' ? 1 : 0),
    completedCount: previous.completedCount + (event === 'complete' ? 1 : 0),
    skipCount: previous.skipCount + (event === 'skip' ? 1 : 0),
    liked: event === 'like' ? true : event === 'unlike' ? false : previous.liked,
    lastPlayedAt: Date.now(), lastPosition,
  };
  const next = [updated, ...current.filter(item => item.trackId !== track.id)];
  saveLocalListeningHistory(userId, next);

  const safeId = `${userId}_${track.id}`.replaceAll('/', '_').slice(0, 1400);
  const increments: Record<string, unknown> = {
    user_id: userId, track_id: track.id, artist_id: track.artist.id, genre: track.genre || track.artist.genres[0] || null,
    liked: updated.liked, last_position: lastPosition, last_played_at: serverTimestamp(), updated_at: serverTimestamp(),
  };
  if (event === 'play') increments.play_count = increment(1);
  if (event === 'complete') increments.completed_count = increment(1);
  if (event === 'skip') increments.skip_count = increment(1);
  void setDoc(doc(db, 'listening_history', safeId), increments, { merge: true }).catch(() => undefined);
  if (event === 'play' || event === 'complete' || event === 'skip') {
    void addDoc(collection(db, 'analytics_events'), {
      artist_id: track.artist.id, track_id: track.id, event, genre: track.genre || null,
      actor_id: userId, created_at: serverTimestamp(),
    }).catch(() => undefined);
  }
  return next;
}

export { HISTORY_EVENT };
