import React from 'react';
import { EnhancementSettings } from '../../types';

export default function LUFSModule({ settings, onChange }: { settings: EnhancementSettings; onChange: (p: Partial<EnhancementSettings>) => void }) {
  return (
    <div className="border border-border bg-card rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Target LUFS</div>
      <input className="w-full" type="range" min={-24} max={-6} step={0.5} value={settings.targetLufs} onChange={e=>onChange({ targetLufs: Number(e.target.value) })} />
      <div className="flex justify-between mt-2 text-sm text-muted-foreground"><div>{settings.targetLufs} LUFS</div><div>True Peak {settings.truePeak} dB</div></div>
    </div>
  );
}
