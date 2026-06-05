import React from 'react';
import { EnhancementSettings } from '../../types';

export default function EQModule({ settings, onChange }: { settings: EnhancementSettings; onChange: (p: Partial<EnhancementSettings>) => void }) {
  return (
    <div className="border border-border bg-card rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">EQ</div>
        <label className="text-sm text-muted-foreground"><input type="checkbox" checked={settings.eq.enabled} onChange={e=>onChange({ eq: { ...settings.eq, enabled: e.target.checked } })} className="mr-1" /> Enabled</label>
      </div>
      <div className="grid grid-cols-5 gap-3 items-end">
        {settings.eq.bands.map((b, i) => (
          <div key={b.freq} className="flex min-w-0 flex-col items-center gap-2">
            <div className="h-32 flex items-center justify-center">
              <input
                className="cursor-pointer"
                style={{ width: 90, height: 18, transform: 'rotate(-90deg)', appearance: 'slider-horizontal' }}
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={b.gain}
                onChange={e => {
                  const bands = settings.eq.bands.slice();
                  bands[i] = { ...bands[i], gain: Number(e.target.value) };
                  onChange({ eq: { ...settings.eq, bands } });
                }}
              />
            </div>
            <div className="text-xs font-medium">{b.freq}Hz</div>
            <div className="text-xs text-muted-foreground">{b.gain} dB</div>
          </div>
        ))}
      </div>
    </div>
  );
}
