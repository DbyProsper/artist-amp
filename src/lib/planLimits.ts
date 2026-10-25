export type Plan = 'free' | 'pro' | 'premium' | 'studio';
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
    fullSongs:            6,
    beats:                10,
    clips30s:             10,
    images:               15,
    lyrics:               UNLIMITED,
    audioEnhance:         UNLIMITED,
    audioEnhanceStandard: UNLIMITED,
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
  premium: {
    fullSongs:            UNLIMITED,
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
    fullSongs:            2,
    beats:                4,
    clips30s:             4,
    images:               5,
    lyrics:               UNLIMITED,
    audioEnhanceStandard: UNLIMITED,
  },
  pro: {},
  premium: {},
  studio: {},
};

export const PLAN_PRICES = {
  free:   { monthly: 0,   annual: 0,   label: 'Free'   },
  pro:    { monthly: 199, annual: 1990, label: 'Pro'    },
  premium:{ monthly: 399, annual: 3990, label: 'Premium' },
  studio: { monthly: 399, annual: 3990, label: 'Premium' },
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
