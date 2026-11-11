import { useEffect } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/FirebaseAuthContext';
import { db } from '@/lib/firebase';

export function GlobalPresenceManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, 'profiles', user.uid);
    const publish = (online: boolean) => setDoc(profileRef, { is_online: online, last_active: serverTimestamp() }, { merge: true }).catch(() => undefined);
    const onVisibility = () => void publish(document.visibilityState === 'visible');
    const onPageHide = () => void publish(false);
    void publish(true);
    const heartbeat = window.setInterval(() => { if (document.visibilityState === 'visible') void publish(true); }, 60_000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => { window.clearInterval(heartbeat); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide); void publish(false); };
  }, [user]);

  return null;
}
