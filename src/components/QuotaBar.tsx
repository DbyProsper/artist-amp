import { usePlan } from '@/hooks/usePlan';
import { DAILY_LIMITS, MONTHLY_LIMITS, type QuotaKey } from '@/lib/planLimits';
import { useUserRole } from '@/hooks/useUserRole';

interface Props {
  quotaKey: QuotaKey;
  label: string;
  type?: 'monthly' | 'daily';
}

export default function QuotaBar({ quotaKey, label, type = 'monthly' }: Props) {
  const { plan, quota, quotaDaily, quotaMonth, quotaDay } = usePlan();
  const { isAdmin } = useUserRole();
  if (isAdmin) {
    return <div className="rounded-3xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">{label}: unlimited for admins</div>;
  }

  const limit = type === 'monthly' ? MONTHLY_LIMITS[plan][quotaKey] : DAILY_LIMITS[plan]?.[quotaKey];
  const now = new Date();
  const periodMatches = type === 'monthly'
    ? quotaMonth === `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    : quotaDay === now.toISOString().slice(0, 10);
  const used = periodMatches
    ? (type === 'monthly' ? (quota as any)[quotaKey] ?? 0 : (quotaDaily as any)[quotaKey] ?? 0)
    : 0;

  if (limit === undefined || limit >= 999999) return null;
  if (limit === 0) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
        {label}: not available on {plan} plan
      </div>
    );
  }

  const pct = Math.min(100, Math.round((used / limit) * 100));
  const left = Math.max(0, limit - used);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>{label}</span>
        <span>{left} / {limit} left</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
