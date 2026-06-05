import { motion } from 'framer-motion';
import { Download, Lock } from 'lucide-react';
import React from 'react';

interface Props {
  hasFile: boolean;
  isPremium: boolean;
  isProcessing: boolean;
  progress: number;
  onExport: () => void;
}

export default function ExportActions({ hasFile, isPremium, isProcessing, progress, onExport }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {isProcessing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-md bg-card border border-border">
          <div className="text-sm">Enhancing… {progress}%</div>
        </motion.div>
      )}

      <button disabled={!hasFile || isProcessing} onClick={onExport}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          isPremium
            ? 'bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50'
            : 'border border-border hover:border-primary/50 disabled:opacity-50'
        }`}>
        {!isPremium ? <Lock size={16} /> : <Download size={16} />}
        {isProcessing ? 'Enhancing…' : 'Enhance & Export'}
      </button>
    </div>
  );
}
