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
  fullSongs: number;
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
  fullSongs: 0,
  beats: 0,
  clips30s: 0,
  images: 0,
  lyrics: 0,
  audioEnhanceStandard: 0,
};

const INITIAL_STATE: PlanState = {
  plan: 'free',
  quota: EMPTY_QUOTA,
  quotaDaily: EMPTY_DAILY,
  quotaMonth: '',
  quotaDay: '',
  payfastToken: null,
  payfastEmail: null,
  stripeCustomerId: null,
  loading: true,
};

export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>(INITIAL_STATE);

  useEffect(() => {
    const auth = getAuth();
    let unsubDoc = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubDoc();
      if (!user) {
        setState({ ...INITIAL_STATE, loading: false });
        return;
      }

      setState(current => ({ ...current, loading: true }));
      user.getIdToken(true).catch(() => {});

      unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) {
          setState({ ...INITIAL_STATE, loading: false });
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
      }, () => setState(current => ({ ...current, loading: false })));
    });

    return () => {
      unsubDoc();
      unsubAuth();
    };
  }, []);

  return state;
}
