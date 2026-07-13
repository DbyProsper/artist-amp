export type Plan = 'free' | 'pro' | 'studio';
export type QuotaKey =
  | 'fullSongs'
  | 'beats'
  | 'clips30s'
  | 'images'
  | 'lyrics'
  | 'audioEnhance'
  | 'audioEnhanceStandard';

export const UNLIMITED = 999999;

export const MONTHLY_LIMITS: Record<Plan, Record<QuotaKey, number>> = {
  free: {
    fullSongs:            2,
    beats:                30,
    clips30s:             20,
    images:               30,
    lyrics:               UNLIMITED,
    audioEnhance:         0,
    audioEnhanceStandard: 15,
  },
  pro: {
    fullSongs:            30,
    beats:                UNLIMITED,
    clips30s:             UNLIMITED,
    images:               UNLIMITED,
    lyrics:               UNLIMITED,
    audioEnhance:         UNLIMITED,
    audioEnhanceStandard: UNLIMITED,
  },
  studio: {
    fullSongs:            UNLIMITED,
    beats:                UNLIMITED,
    clips30s:             UNLIMITED,
    images:               UNLIMITED,
    lyrics:               UNLIMITED,
    audioEnhance:         UNLIMITED,
    audioEnhanceStandard: UNLIMITED,
  },
};

export const DAILY_LIMITS: Record<Plan, Partial<Record<QuotaKey, number>>> = {
  free: {
    beats:                5,
    clips30s:             3,
    images:               5,
    lyrics:               10,
    audioEnhanceStandard: 3,
  },
  pro: {},
  studio: {},
};

export const PLAN_PRICES = {
  free:   { monthly: 0,   annual: 0,   label: 'Free'   },
  pro:    { monthly: 19,  annual: 190, label: 'Pro'    },
  studio: { monthly: 49,  annual: 490, label: 'Studio' },
} as const;

export const ONCE_OFF_PRICES = {
  audioEnhance: { amountZAR: 100, label: 'Single audio enhancement' },
} as const;

export function isUnlimited(val: number): boolean {
  return val >= UNLIMITED;
}

export function isAtMonthlyLimit(plan: Plan, key: QuotaKey, used: number): boolean {
  const limit = MONTHLY_LIMITS[plan][key];
  return !isUnlimited(limit) && used >= limit;
}

export function isAtDailyLimit(plan: Plan, key: QuotaKey, used: number): boolean {
  const limit = DAILY_LIMITS[plan]?.[key];
  if (limit === undefined) return false;
  return used >= limit;
}

export function monthlyRemaining(plan: Plan, key: QuotaKey, used: number): number | null {
  const limit = MONTHLY_LIMITS[plan][key];
  if (isUnlimited(limit)) return null;
  return Math.max(0, limit - used);
}

export function dailyRemaining(plan: Plan, key: QuotaKey, used: number): number | null {
  const limit = DAILY_LIMITS[plan]?.[key];
  if (limit === undefined) return null;
  return Math.max(0, limit - used);
}
