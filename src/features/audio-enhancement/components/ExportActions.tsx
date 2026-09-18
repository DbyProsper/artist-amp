import { motion } from 'framer-motion';
import { Download, Upload, Cpu, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { ProcessingStage, EnhancementTimings } from '../types';
import React from 'react';

interface Props {
  hasFile: boolean;
  isProcessing: boolean;
  stage: ProcessingStage;
  progress: number;
  timings: EnhancementTimings | null;
  onExport: () => void;
  onPreviewExport: () => void;
  hasPreview: boolean;
}

const STAGE_LABELS: Record<ProcessingStage, { label: string; icon: React.ReactNode }> = {
  idle: { label: 'Ready to export', icon: <Download size={16} /> },
  analyzing: { label: 'Analyzing…', icon: <Cpu size={16} /> },
  uploading: { label: 'Uploading…', icon: <Upload size={16} /> },
  processing: { label: 'Processing…', icon: <Cpu size={16} /> },
  downloading: { label: 'Downloading result…', icon: <ArrowDownRight size={16} /> },
  done: { label: 'Done', icon: <CheckCircle2 size={16} /> },
  error: { label: 'Error', icon: <Cpu size={16} /> },
};

export default function ExportActions({
  hasFile,
  isProcessing,
  stage,
  progress,
  timings,
  onExport,
  onPreviewExport,
  hasPreview,
}: Props) {
  const stageInfo = STAGE_LABELS[stage];
  const showSuccess = stage === 'done' && !isProcessing;

  return (
    <div className="flex flex-col gap-3">
      {isProcessing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-md bg-card border border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {stageInfo.icon}
            <span>{stageInfo.label}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{progress}% complete</div>
        </motion.div>
      )}

      {showSuccess && timings?.totalTime && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-md bg-card border border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 size={16} /> Enhanced in {timings.totalTime}
          </div>
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            {timings.processTime && <div>DSP: {timings.processTime}</div>}
            {timings.encodeTime && <div>Encode: {timings.encodeTime}</div>}
          </div>
        </motion.div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          disabled={!hasPreview || isProcessing}
          onClick={onPreviewExport}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold transition hover:border-primary/50 disabled:opacity-50"
        >
          <Download size={16} /> Download preview
        </button>
        <button
          disabled={!hasFile || isProcessing}
          onClick={onExport}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <Download size={16} />
          {isProcessing
            ? stageInfo.label
            : showSuccess
            ? 'Export Again'
            : 'Full-quality export'}
        </button>
      </div>
    </div>
  );
}
