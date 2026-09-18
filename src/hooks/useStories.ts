import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Artist, Story } from '@/types';

export function useStories() {
  const [stories, setStories] = useState<Story[]>([]);
  useEffect(() => {
    const storiesQuery = query(collection(db, 'posts'), where('is_story', '==', true));
    return onSnapshot(storiesQuery, async snapshot => {
      const now = Date.now();
      const realStories = (await Promise.all(snapshot.docs.map(async item => {
        const data = item.data();
        const createdAt = data.created_at?.toDate?.() || new Date(data.created_at || 0);
        const expires = data.expires_at?.toDate?.()?.getTime?.() ?? new Date(data.expires_at || createdAt.getTime() + 24 * 60 * 60 * 1000).getTime();
        if (expires < now) { void deleteDoc(item.ref).catch(() => undefined); return null; }
        const profile = await getDoc(doc(db, 'profiles', data.profile_id));
        if (!profile.exists()) return null;
        const person = profile.data();
        const artist: Artist = {
          id: profile.id, name: person.name || 'MusicInsta artist', username: person.username || 'artist',
          avatar: person.avatar_url || '/placeholder.svg', coverImage: person.cover_url || '/placeholder.svg',
          bio: person.bio || '', location: person.location || '', genres: person.genres || [],
          isVerified: Boolean(person.is_verified), followers: 0, following: 0, tracks: 0,
        };
        return { id: item.id, artist, imageUrl: data.image_url || '/placeholder.svg', videoUrl: data.video_url || undefined, caption: data.caption || '', attachedMusic: data.attached_music || '', viewed: false, createdAt, clipStart: Number(data.story_start_time || 0), clipEnd: data.story_end_time == null ? undefined : Number(data.story_end_time) } as Story;
      }))).filter(Boolean) as Story[];
      realStories.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
      setStories(realStories);
    }, () => setStories([]));
  }, []);
  return stories;
}
