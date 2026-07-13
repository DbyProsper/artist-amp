import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { Plan } from '@/lib/planLimits';

export interface UserQuota {
  fullSongs: number;
  beats: number;
  clips30s: number;
  images: number;
  lyrics: number;
  audioEnhance: number;
  audioEnhanceStandard: number;
}

export interface UserQuotaDaily {
  beats: number;
  clips30s: number;
  images: number;
  lyrics: number;
  audioEnhanceStandard: number;
}

export interface PlanState {
  plan: Plan;
  quota: UserQuota;
  quotaDaily: UserQuotaDaily;
  quotaMonth: string;
  quotaDay: string;
  payfastToken: string | null;
  payfastEmail: string | null;
  stripeCustomerId: string | null;
  loading: boolean;
}

const EMPTY_QUOTA: UserQuota = {
  fullSongs: 0,
  beats: 0,
  clips30s: 0,
  images: 0,
  lyrics: 0,
  audioEnhance: 0,
  audioEnhanceStandard: 0,
};

const EMPTY_DAILY: UserQuotaDaily = {
  beats: 0,
  clips30s: 0,
  images: 0,
  lyrics: 0,
  audioEnhanceStandard: 0,
};

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>({
    plan: 'free',
    quota: EMPTY_QUOTA,
    quotaDaily: EMPTY_DAILY,
    quotaMonth: '',
    quotaDay: '',
    payfastToken: null,
    payfastEmail: null,
    stripeCustomerId: null,
    loading: true,
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }

      user.getIdToken(true).catch(() => {});

      const unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        const d = snap.data();
        setState({
          plan: (d.plan as Plan) ?? 'free',
          quota: { ...EMPTY_QUOTA, ...(d.quota ?? {}) },
          quotaDaily: { ...EMPTY_DAILY, ...(d.quotaDaily ?? {}) },
          quotaMonth: d.quotaMonth ?? '',
          quotaDay: d.quotaDay ?? '',
          payfastToken: d.payfastToken ?? null,
          payfastEmail: d.payfastEmail ?? null,
          stripeCustomerId: d.stripeCustomerId ?? null,
          loading: false,
        });
      });

      return () => unsubDoc();
    });

    return () => unsubAuth();
  }, []);

  return state;
}
