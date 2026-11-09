import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';
import type { Artist } from '@/types';
import { CallDialog } from './CallDialog';

function toArtist(id: string, data: DocumentData): Artist {
  return {
    id,
    name: data.name || 'MusicInsta user',
    username: data.username || 'user',
    avatar: data.avatar_url || DEFAULT_MEDIA_IMAGE,
    coverImage: data.cover_url || DEFAULT_MEDIA_IMAGE,
    bio: data.bio || '',
    location: data.location || '',
    genres: Array.isArray(data.genres) ? data.genres : [],
    isVerified: Boolean(data.is_verified),
    followers: 0,
    following: 0,
    tracks: 0,
  };
}

export function GlobalCallManager() {
  const { user, profile } = useAuth();
  const [caller, setCaller] = useState<Artist | null>(null);

  useEffect(() => {
    if (!user) { setCaller(null); return; }
    const identityId = profile?.id || user.uid;
    let lastNotifiedCall = '';
    return onSnapshot(query(collection(db, 'calls'), where('recipient_id', '==', identityId)), snapshot => {
      const pending = snapshot.docs.find(item => ['preparing', 'ringing', 'active'].includes(item.data().status));
      if (!pending) { setCaller(null); return; }
      void getDoc(doc(db, 'profiles', pending.data().caller_id)).then(person => {
        if (!person.exists()) return;
        const artist = toArtist(person.id, person.data());
        setCaller(artist);
        if (pending.id !== lastNotifiedCall && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          lastNotifiedCall = pending.id;
          const notification = new Notification(`MusicInsta ${pending.data().kind === 'video' ? 'video' : 'voice'} call`, {
            body: `${artist.name} is calling`,
            icon: artist.avatar,
            tag: `musicinsta-call-${pending.id}`,
            requireInteraction: true,
          });
          notification.onclick = () => { window.focus(); notification.close(); };
        }
      });
    });
  }, [profile?.id, user]);

  return caller ? <CallDialog recipient={caller} requestedKind={null} onRequestHandled={() => undefined} /> : null;
}
