import React from 'react';
import { EnhancementSettings } from '../../types';

export default function LUFSModule({ settings, onChange }: { settings: EnhancementSettings; onChange: (p: Partial<EnhancementSettings>) => void }) {
  return (
    <div className="border border-border bg-card rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Target LUFS</div>
      <input className="w-full" type="range" min={-24} max={-6} step={0.5} value={settings.targetLufs} onChange={e=>onChange({ targetLufs: Number(e.target.value) })} />
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><label>Target LUFS<input aria-label="Target LUFS" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" type="number" min={-24} max={-6} step={0.5} value={settings.targetLufs} onChange={e=>onChange({ targetLufs: Number(e.target.value) })} onWheel={e => { e.preventDefault(); onChange({ targetLufs: Math.max(-24, Math.min(-6, settings.targetLufs + (e.deltaY < 0 ? .5 : -.5))) }); }} /></label><label>True peak dB<input aria-label="True peak" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2" type="number" min={-4} max={0} step={0.1} value={settings.truePeak} onChange={e=>onChange({ truePeak: Number(e.target.value) })} onWheel={e => { e.preventDefault(); onChange({ truePeak: Math.max(-4, Math.min(0, settings.truePeak + (e.deltaY < 0 ? .1 : -.1))) }); }} /></label></div>
    </div>
  );
}
