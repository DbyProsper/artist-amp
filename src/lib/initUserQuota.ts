import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function initUserQuota(uid: string): Promise<void> {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const day = now.toISOString().slice(0, 10);

  await setDoc(doc(db, 'users', uid), {
    plan: 'free',
    planActivatedAt: null,
    planExpiresAt: null,
    payfastToken: null,
    payfastEmail: null,
    quotaMonth: month,
    quota: {
      fullSongs: 0,
      beats: 0,
      clips30s: 0,
      images: 0,
      lyrics: 0,
      audioEnhance: 0,
      audioEnhanceStandard: 0,
    },
    quotaDay: day,
    quotaDaily: {
      beats: 0,
      clips30s: 0,
      images: 0,
      lyrics: 0,
      audioEnhanceStandard: 0,
    },
  }, { merge: true });
}
