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

export function loadPostLike(postId: string, profileId: string) {
  return request<{ liked: boolean; likes: number }>(`/api/social/posts/${encodeURIComponent(postId)}/like?profile_id=${encodeURIComponent(profileId)}`);
}

export function loadPostLikes(profileId: string) {
  return request<{ postIds: string[] }>(`/api/social/likes?profile_id=${encodeURIComponent(profileId)}`);
}

export interface ShareProfile { id: string; name: string; username: string; avatar: string }
let shareProfilesCache: ShareProfile[] | null = null;
export async function loadShareProfiles() {
  if (shareProfilesCache) return shareProfilesCache;
  const response = await request<{ profiles: ShareProfile[] }>('/api/social/profiles');
  shareProfilesCache = response.profiles || [];
  return shareProfilesCache;
}

export interface PersistedComment {
  id: string; text: string; authorName: string; avatar: string; authorId: string; authUserId?: string;
  likes: number; likedBy: string[]; parentId?: string; replyToName?: string;
  mediaType?: 'gif' | 'sticker'; mediaUrl?: string; sticker?: string; createdAt?: string;
}

export function loadPostComments(postId: string) {
  return request<{ comments: PersistedComment[]; count: number }>(`/api/social/posts/${encodeURIComponent(postId)}/comments`);
}

export function createPostComment(postId: string, value: object) {
  return request<{ comment: PersistedComment }>(`/api/social/posts/${encodeURIComponent(postId)}/comments`, value);
}

async function mutate<T>(path: string, method: 'POST' | 'DELETE'): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`, { method, headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(String(payload?.detail || `Request failed (${response.status})`)); }
  return response.json() as Promise<T>;
}

export function persistCommentLike(postId: string, commentId: string, liked: boolean, profileId: string) {
  return mutate<{ saved: boolean }>(`/api/social/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/like?liked=${liked}&profile_id=${encodeURIComponent(profileId)}`, 'POST');
}

export function removePostComment(postId: string, commentId: string, profileId: string) {
  return mutate<{ deleted: boolean }>(`/api/social/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}?profile_id=${encodeURIComponent(profileId)}`, 'DELETE');
}

export function loadViewedStories() { return request<{ storyIds: string[] }>('/api/social/stories/viewed'); }
export function loadStoryState(storyId: string) { return request<{ liked: boolean; viewed: boolean; likes: number; views: number }>(`/api/social/stories/${encodeURIComponent(storyId)}/state`); }
export function markStoryViewed(storyId: string, actorProfileId: string, actorName: string) { return request<{ viewed: boolean }>(`/api/social/stories/${encodeURIComponent(storyId)}/view`, { actorProfileId, actorName }); }
export function persistStoryLike(storyId: string, liked: boolean, actorProfileId: string, actorName: string) { return request<{ liked: boolean; likes: number }>(`/api/social/stories/${encodeURIComponent(storyId)}/like`, { liked, actorProfileId, actorName }); }

export function persistPostPlay(postId: string) {
  return request<{ saved: boolean }>(`/api/social/posts/${encodeURIComponent(postId)}/play`, {});
}

export function persistTrackLike(userId: string, creatorId: string, track: Track, liked: boolean) {
  const sourceCollection = track.sourceCollection ?? (track.provider === 'youtube' ? 'external_media' : track.id.startsWith('song-') ? 'songs' : 'tracks');
  const sourceDocumentId = track.sourceDocumentId ?? (track.provider === 'youtube' ? track.id : track.id.startsWith('song-') ? track.id.slice(5) : track.id);
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
