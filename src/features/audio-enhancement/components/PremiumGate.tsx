import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

export default function PremiumGate({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-foreground">Premium Required</div>
            <div className="text-sm text-muted-foreground">Enhance & Export is a Premium feature. Upgrade to process full songs and download broadcast-ready mastered audio.</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary/70"><X size={18} /></button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button onClick={()=>{ navigate('/billing'); onClose(); }} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Upgrade to Premium</button>
          <button onClick={onClose} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary/50">Maybe later</button>
        </div>
      </motion.div>
    </div>
  );
}
