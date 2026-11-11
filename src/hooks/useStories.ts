import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Artist, Story } from '@/types';
import { useAuth } from '@/context/FirebaseAuthContext';
import { loadViewedStories } from '@/services/backendPersistenceService';

export function useStories() {
  const { user, profile: currentProfile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) { setViewedIds(new Set()); return; }
    void loadViewedStories().then(value => setViewedIds(new Set(value.storyIds || []))).catch(() => undefined);
    const viewed = (event: Event) => { const id=(event as CustomEvent<{storyId:string}>).detail?.storyId;if(id)setViewedIds(current=>new Set(current).add(id)); };
    window.addEventListener('musicinsta:story-viewed', viewed);
    return () => window.removeEventListener('musicinsta:story-viewed', viewed);
  }, [user?.uid]);
  useEffect(() => {
    const storiesQuery = query(collection(db, 'posts'), where('is_story', '==', true));
    return onSnapshot(storiesQuery, async snapshot => {
      const now = Date.now();
      const realStories = (await Promise.all(snapshot.docs.map(async item => {
        const data = item.data();
        const excluded = Array.isArray(data.excluded_user_ids) ? data.excluded_user_ids.map(String) : [];
        if (data.profile_id !== currentProfile?.id && excluded.some(id => id === user?.uid || id === currentProfile?.id)) return null;
        const createdAt = data.created_at?.toDate?.() || new Date(data.created_at || 0);
        const expires = data.expires_at?.toDate?.()?.getTime?.() ?? new Date(data.expires_at || createdAt.getTime() + 24 * 60 * 60 * 1000).getTime();
        if (expires < now) { void deleteDoc(item.ref).catch(() => undefined); return null; }
        const profile = await getDoc(doc(db, 'profiles', data.profile_id));
        if (!profile.exists()) return null;
        const person = profile.data();
        const artist: Artist = {
          id: profile.id, name: person.name || 'MusicInsta artist', username: person.username || 'artist',
          avatar: person.avatar_url || '/musicinsta-default-cover.webp', coverImage: person.cover_url || '/musicinsta-default-cover.webp',
          bio: person.bio || '', location: person.location || '', genres: person.genres || [],
          isVerified: Boolean(person.is_verified), followers: 0, following: 0, tracks: 0,
        };
        return { id: item.id, artist, imageUrl: data.image_url || '/musicinsta-default-cover.webp', videoUrl: data.video_url || undefined, caption: data.caption || '', attachedMusic: data.attached_music || '', viewed: viewedIds.has(item.id), createdAt, clipStart: Number(data.story_start_time || 0), clipEnd: data.story_end_time == null ? undefined : Number(data.story_end_time), excludedUserIds: excluded, aspectRatio: data.aspect_ratio || undefined, mediaOverlays: data.media_overlays || [], drawingOverlay: data.drawing_overlay || undefined, visualAdjustments: data.visual_adjustments || undefined, attachedMusicData: data.attached_music_data || undefined } as Story;
      }))).filter(Boolean) as Story[];
      realStories.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
      setStories(realStories);
    }, () => setStories([]));
  }, [currentProfile?.id, user?.uid, viewedIds]);
  return stories;
}
