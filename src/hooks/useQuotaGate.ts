import { useCallback, useState } from 'react';
import { usePlan } from './usePlan';
import { DAILY_LIMITS, MONTHLY_LIMITS, Plan, QuotaKey } from '@/lib/planLimits';

export type BlockReason = 'monthly_limit' | 'daily_limit' | 'plan_blocked' | null;

export interface QuotaGateResult {
  allowed: boolean;
  reason: BlockReason;
  upgradeRequired: boolean;
}

type BlockedState = { reason: BlockReason; key: QuotaKey } | null;

export function useQuotaGate() {
  const { plan, quota, quotaDaily } = usePlan();
  const [blocked, setBlocked] = useState<BlockedState>(null);

  const checkQuota = useCallback((key: QuotaKey): QuotaGateResult => {
    const monthlyUsed = (quota as any)[key] ?? 0;
    const dailyUsed = (quotaDaily as any)[key] ?? 0;
    const monthlyLimit = (MONTHLY_LIMITS[plan] as any)[key] ?? Infinity;
    const dailyLimit = (DAILY_LIMITS[plan] as any)[key] ?? Infinity;

    if (monthlyLimit === 0) {
      setBlocked({ reason: 'plan_blocked', key });
      return { allowed: false, reason: 'plan_blocked', upgradeRequired: true };
    }

    if (monthlyLimit !== Infinity && monthlyUsed >= monthlyLimit) {
      setBlocked({ reason: 'monthly_limit', key });
      return { allowed: false, reason: 'monthly_limit', upgradeRequired: plan !== 'studio' };
    }

    if (dailyLimit !== Infinity && dailyUsed >= dailyLimit) {
      setBlocked({ reason: 'daily_limit', key });
      return { allowed: false, reason: 'daily_limit', upgradeRequired: plan !== 'studio' };
    }

    return { allowed: true, reason: null, upgradeRequired: false };
  }, [plan, quota, quotaDaily]);

  const clearBlocked = useCallback(() => setBlocked(null), []);

  return { checkQuota, blocked, clearBlocked, plan };
}
