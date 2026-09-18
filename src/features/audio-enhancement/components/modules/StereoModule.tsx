import React from 'react';
import { EnhancementSettings } from '../../types';

export default function StereoModule({ settings, onChange }: { settings: EnhancementSettings; onChange: (p: Partial<EnhancementSettings>) => void }) {
  return (
    <div className="border border-border bg-card rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">Stereo</div>
      <div>
        <div className="text-xs text-muted-foreground mb-2">Width: {settings.stereoWidth}%</div>
        <input className="w-full" type="range" min={0} max={200} value={settings.stereoWidth} onChange={e=>onChange({ stereoWidth: Number(e.target.value) })} />
        <input aria-label="Stereo width" className="mt-2 h-9 w-full rounded border border-input bg-background px-2" type="number" min={0} max={200} value={settings.stereoWidth} onChange={e=>onChange({ stereoWidth: Number(e.target.value) })} onWheel={e => { e.preventDefault(); onChange({ stereoWidth: Math.max(0, Math.min(200, settings.stereoWidth + (e.deltaY < 0 ? 1 : -1))) }); }} />
        <div className="flex justify-between text-xs text-muted-foreground mt-3 mb-3"><div>Mid {settings.midGainDb} dB</div><div>Side {settings.sideGainDb} dB</div></div>
        <div className="flex gap-2">
          <div className="flex-1">
            <input className="w-full" type="range" min={-6} max={6} step={0.1} value={settings.midGainDb} onChange={e=>onChange({ midGainDb: Number(e.target.value) })} />
          </div>
          <div className="flex-1">
            <input className="w-full" type="range" min={-6} max={6} step={0.1} value={settings.sideGainDb} onChange={e=>onChange({ sideGainDb: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2"><input aria-label="Mid gain" className="h-9 rounded border border-input bg-background px-2" type="number" min={-6} max={6} step={0.1} value={settings.midGainDb} onChange={e=>onChange({ midGainDb: Number(e.target.value) })} /><input aria-label="Side gain" className="h-9 rounded border border-input bg-background px-2" type="number" min={-6} max={6} step={0.1} value={settings.sideGainDb} onChange={e=>onChange({ sideGainDb: Number(e.target.value) })} /></div>
      </div>
    </div>
  );
}
