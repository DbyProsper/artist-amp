import { motion } from 'framer-motion';
import { X, Zap, Lock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QuotaKey } from '@/lib/planLimits';

interface Props {
  reason: 'monthly_limit' | 'daily_limit' | 'plan_blocked' | null;
  quotaKey: QuotaKey;
  currentPlan: string;
  onClose: () => void;
}

const TOOL_LABELS: Record<QuotaKey, string> = {
  fullSongs: 'Full Song Production',
  beats: 'Beat Production',
  clips30s: '30s Clip Generation',
  images: 'Image Generation',
  lyrics: 'Lyrics Generation',
  audioEnhance: 'Audio Enhancement (Mastered)',
  audioEnhanceStandard: 'Audio Enhancement (Standard)',
};

const REASON_COPY = {
  monthly_limit: {
    title: 'Monthly limit reached',
    icon: RefreshCw,
    sub: 'Resets on the 1st of next month, or upgrade for more.',
  },
  daily_limit: {
    title: 'Daily limit reached',
    icon: RefreshCw,
    sub: 'Resets at midnight UTC, or upgrade for more.',
  },
  plan_blocked: {
    title: 'Premium feature',
    icon: Lock,
    sub: 'This feature is not available on your current plan.',
  },
};

export default function UpgradeModal({ reason, quotaKey, currentPlan, onClose }: Props) {
  const navigate = useNavigate();

  if (!reason) return null;

  const { title, icon: Icon, sub } = REASON_COPY[reason];
  const tool = TOOL_LABELS[quotaKey] ?? quotaKey;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-3xl bg-background p-6 shadow-2xl border border-border"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-3xl bg-muted p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
            <h2 className="mt-2 text-2xl font-bold">{tool}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{sub}</p>
          </div>

          {currentPlan !== 'studio' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/billing');
              }}
              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              {currentPlan === 'free' ? 'Upgrade to Pro — $19/mo' : 'Upgrade to Studio — $49/mo'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted"
          >
            {reason === 'daily_limit' ? 'Try again tomorrow' : 'Maybe later'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
