import { usePlan } from '@/hooks/usePlan';

const PLAN_STYLES = {
  free: { label: 'Free', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' },
  pro: { label: 'Pro', bg: 'rgba(255,45,107,0.15)', color: '#ff2d6b' },
  studio: { label: 'Studio', bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
};

export default function PlanBadge() {
  const { plan, loading } = usePlan();
  if (loading) return null;
  const { label, bg, color } = PLAN_STYLES[plan] ?? PLAN_STYLES.free;
  return (
    <div
      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold"
      style={{ background: bg, color }}
    >
      {label}
    </div>
  );
}
