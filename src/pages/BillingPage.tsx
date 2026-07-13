import { useState } from 'react';
import { Check, Zap, Building2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';
import { getAuth } from 'firebase/auth';

const BASE = import.meta.env.VITE_ENHANCER_API_URL;

async function getAuthHeader() {
  const token = await getAuth().currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

async function createCheckout(plan: 'pro' | 'studio') {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Unable to create checkout session');
  }

  const { url } = await res.json();
  window.location.href = url;
}

async function openPortal() {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/billing/create-portal-session`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Unable to create portal session');
  }

  const { url } = await res.json();
  window.location.href = url;
}

const PLANS = [
  {
    key: 'free' as const,
    name: 'Free',
    price: 0,
    icon: null,
    features: [
      '2 full songs / month',
      '5 beats / day · 30 / month',
      '3 clips / day · 20 / month',
      '5 images / day · 30 / month',
      'Unlimited lyrics',
      'Standard audio export · 3/day · 15/month',
    ],
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: 19,
    icon: Zap,
    featured: true,
    features: [
      '30 full songs / month',
      'Unlimited beats',
      'Unlimited clips',
      'Unlimited images',
      'Unlimited lyrics',
      'Mastered audio export · unlimited',
    ],
  },
  {
    key: 'studio' as const,
    name: 'Studio',
    price: 49,
    icon: Building2,
    features: [
      'Unlimited full songs',
      'Unlimited beats',
      'Unlimited clips',
      'Unlimited images',
      'Unlimited lyrics',
      'Mastered audio · priority queue',
    ],
  },
];

export default function BillingPage() {
  const { plan, stripeCustomerId, loading } = usePlan();
  const [loadingPlan, setLoadingPlan] = useState<'pro' | 'studio' | null>(null);

  const handleUpgrade = async (planKey: 'pro' | 'studio') => {
    setLoadingPlan(planKey);
    try {
      await createCheckout(planKey);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Subscription</p>
          <h1 className="mt-3 text-4xl font-bold">Choose your plan</h1>
          <p className="mt-4 max-w-2xl mx-auto text-base text-muted-foreground">
            Upgrade anytime. Cancel anytime. No contracts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = plan === p.key;
            const isFeatured = p.featured;
            const Icon = p.icon;

            return (
              <div
                key={p.key}
                className={`rounded-3xl border p-6 shadow-sm transition ${
                  isFeatured ? 'border-primary/20 bg-primary/5 shadow-primary/10' : 'border-border bg-card'
                }`}
              >
                {isFeatured && (
                  <div className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Most popular
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {Icon ? <Icon className="h-6 w-6 text-primary" /> : null}
                  <h2 className="text-2xl font-semibold">{p.name}</h2>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">${p.price}</span>
                  {p.price > 0 && <span className="text-sm text-muted-foreground">/month</span>}
                </div>

                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-1 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm font-semibold text-primary">
                      Current plan
                    </div>
                  ) : p.key !== 'free' ? (
                    <Button
                      onClick={() => handleUpgrade(p.key)}
                      disabled={!!loadingPlan}
                      className="w-full"
                    >
                      {loadingPlan === p.key ? 'Redirecting…' : `Upgrade to ${p.name}`}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {stripeCustomerId && plan !== 'free' && (
          <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Manage your subscription</p>
                <p>Open Stripe Billing Portal to update or cancel your plan.</p>
              </div>
              <Button onClick={openPortal} className="w-full sm:w-auto">
                Open Billing Portal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
