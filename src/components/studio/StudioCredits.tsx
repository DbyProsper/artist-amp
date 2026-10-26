import { Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { useUserRole } from '@/hooks/useUserRole';
import { DAILY_LIMITS, MONTHLY_LIMITS, UNLIMITED, type QuotaKey } from '@/lib/planLimits';
import UpgradeModal from '@/components/UpgradeModal';

const CREDIT_TYPES: Array<{ key: QuotaKey; label: string }> = [
  { key: 'fullSongs', label: 'Full songs' },
  { key: 'clips30s', label: '30s clips' },
  { key: 'images', label: 'Images' },
];

function currentPeriods() {
  const now = new Date();
  return {
    month: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    day: now.toISOString().slice(0, 10),
  };
}

function balanceText(used: number, limit: number | undefined) {
  if (limit === undefined || limit >= UNLIMITED) return 'Unlimited';
  return `${Math.max(0, limit - used)} of ${limit} left`;
}

interface StudioCreditsProps {
  compact?: boolean;
}

export function StudioCredits({ compact = false }: StudioCreditsProps) {
  const [showPlans, setShowPlans] = useState(false);
  const { plan, quota, quotaDaily, quotaMonth, quotaDay, loading: planLoading } = usePlan();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const periods = currentPeriods();

  if (planLoading || roleLoading) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card/60 p-4" aria-label="Loading AI generation credits">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </section>
    );
  }

  if (isAdmin) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4" aria-label="AI generation credits">
        <InfinityIcon className="h-5 w-5 shrink-0 text-primary" />
        <div><p className="text-sm font-semibold">Unlimited AI Studio credits</p><p className="text-xs text-muted-foreground">Administrator access does not consume credits.</p></div>
      </section>
    );
  }

  const monthlyUsage = quotaMonth === periods.month ? quota : null;
  const dailyUsage = quotaDay === periods.day ? quotaDaily : null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4" aria-label="AI generation credits">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <div>
          <p className="text-sm font-semibold">Generation credits</p>
          {compact ? null : <p className="text-xs text-muted-foreground">Balances reset daily and monthly. The first limit reached applies.</p>}
        </div>
        <button type="button" onClick={() => setShowPlans(true)} className="ml-auto shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Upgrade</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {CREDIT_TYPES.map(({ key, label }) => {
          const monthlyUsed = monthlyUsage?.[key] ?? 0;
          const dailyUsed = dailyUsage?.[key as keyof typeof quotaDaily] ?? 0;
          const monthlyLimit = MONTHLY_LIMITS[plan][key];
          const dailyLimit = DAILY_LIMITS[plan]?.[key];
          return (
            <div key={key} className="rounded-xl border border-border/50 bg-background/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">{label}</p>
              <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3"><dt>Today</dt><dd className="font-medium text-foreground">{balanceText(dailyUsed, dailyLimit)}</dd></div>
                <div className="flex justify-between gap-3"><dt>This month</dt><dd className="font-medium text-foreground">{balanceText(monthlyUsed, monthlyLimit)}</dd></div>
              </dl>
            </div>
          );
        })}
      </div>
      {showPlans && <UpgradeModal reason="upgrade_options" quotaKey="fullSongs" onClose={() => setShowPlans(false)} />}
    </section>
  );
}
