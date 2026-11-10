import { API_BASE } from '@/config/api';
import { auth } from '@/lib/firebase';
import type { Track } from '@/types';

async function request<T>(path: string, body?: object): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(String(payload?.detail || payload?.message || `Request failed (${response.status})`));
  }
  return response.json() as Promise<T>;
}

export function persistPostLike(postId: string, liked: boolean, actor: { profileId: string; name: string; avatar: string }) {
  return request<{ liked: boolean; likes: number }>(`/api/social/posts/${encodeURIComponent(postId)}/like`, {
    liked,
    actorProfileId: actor.profileId,
    actorName: actor.name,
    actorAvatar: actor.avatar,
  });
}

export function persistPostPlay(postId: string) {
  return request<{ saved: boolean }>(`/api/social/posts/${encodeURIComponent(postId)}/play`, {});
}

export function persistTrackLike(userId: string, creatorId: string, track: Track, liked: boolean) {
  const sourceCollection = track.sourceCollection ?? (track.id.startsWith('song-') ? 'songs' : 'tracks');
  const sourceDocumentId = track.sourceDocumentId ?? (track.id.startsWith('song-') ? track.id.slice(5) : track.id);
  return request<{ liked: boolean; changed: boolean; playlistId: string }>('/api/social/tracks/like', {
    liked,
    trackId: track.id,
    creatorId,
    title: track.title,
    coverArt: track.coverArt,
    sourceCollection,
    sourceDocumentId,
  });
}

export function persistTrackPlay(track: Track) {
  const sourceCollection = track.sourceCollection ?? (track.id.startsWith('song-') ? 'songs' : 'tracks');
  const sourceDocumentId = track.sourceDocumentId ?? (track.id.startsWith('song-') ? track.id.slice(5) : track.id);
  return request<{ saved: boolean }>(`/api/social/tracks/${sourceCollection}/${encodeURIComponent(sourceDocumentId)}/play`, {});
}
