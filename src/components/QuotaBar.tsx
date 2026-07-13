import { usePlan } from '@/hooks/usePlan';

interface Props {
  quotaKey: string;
  label: string;
  type?: 'monthly' | 'daily';
}

export default function QuotaBar({ quotaKey, label, type = 'monthly' }: Props) {
  const { plan, quota, quotaDaily } = usePlan();

  const LIMITS: any = {
    monthly: {
      free: {
        fullSongs: 2,
        beats: 30,
        clips30s: 20,
        images: 30,
        lyrics: null,
        audioEnhance: 0,
        audioEnhanceStandard: 15,
      },
      pro: {
        fullSongs: 30,
        beats: null,
        clips30s: null,
        images: null,
        lyrics: null,
        audioEnhance: null,
        audioEnhanceStandard: null,
      },
      studio: {},
    },
    daily: {
      free: {
        beats: 5,
        clips30s: 3,
        images: 5,
        lyrics: 10,
        audioEnhanceStandard: 3,
      },
      pro: {},
      studio: {},
    },
  };

  const limit = LIMITS[type]?.[plan]?.[quotaKey];
  const used = type === 'monthly' ? (quota as any)[quotaKey] ?? 0 : (quotaDaily as any)[quotaKey] ?? 0;

  if (limit === null || limit === undefined) return null;
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
