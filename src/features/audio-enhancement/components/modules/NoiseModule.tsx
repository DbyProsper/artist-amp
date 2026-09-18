import React from 'react';
import { EnhancementSettings } from '../../types';

const PROFILES = ['Auto','Room Hum','A/C Noise','Tape Hiss'];

export default function NoiseModule({ settings, onChange }: { settings: EnhancementSettings; onChange: (p: Partial<EnhancementSettings>) => void }) {
  return (
    <div className="border border-border bg-card rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Noise Reduction</div>
        <label className="text-sm text-muted-foreground"><input type="checkbox" checked={settings.noiseReduction.enabled} onChange={e=>onChange({ noiseReduction: { ...settings.noiseReduction, enabled: e.target.checked } })} className="mr-1" /> Enabled</label>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-2">Reduction: {settings.noiseReduction.reductionDb} dB</div>
        <input className="w-full" type="range" min={0} max={40} value={settings.noiseReduction.reductionDb} onChange={e=>onChange({ noiseReduction: { ...settings.noiseReduction, reductionDb: Number(e.target.value) } })} />
        <input aria-label="Noise reduction dB" className="mt-2 h-9 w-full rounded border border-input bg-background px-2" type="number" min={0} max={40} value={settings.noiseReduction.reductionDb} onChange={e=>onChange({ noiseReduction: { ...settings.noiseReduction, reductionDb: Number(e.target.value) } })} onWheel={e => { e.preventDefault(); onChange({ noiseReduction: { ...settings.noiseReduction, reductionDb: Math.max(0, Math.min(40, settings.noiseReduction.reductionDb + (e.deltaY < 0 ? 1 : -1))) } }); }} />
        <div className="text-xs text-muted-foreground mt-3 mb-2">Sensitivity: {Math.round(settings.noiseReduction.sensitivity*100)}%</div>
        <input className="w-full" type="range" min={0} max={100} value={Math.round(settings.noiseReduction.sensitivity*100)} onChange={e=>onChange({ noiseReduction: { ...settings.noiseReduction, sensitivity: Number(e.target.value)/100 } })} />
        <input aria-label="Noise sensitivity percent" className="mt-2 h-9 w-full rounded border border-input bg-background px-2" type="number" min={0} max={100} value={Math.round(settings.noiseReduction.sensitivity*100)} onChange={e=>onChange({ noiseReduction: { ...settings.noiseReduction, sensitivity: Number(e.target.value)/100 } })} />
        <div className="mt-3">
          <select className="w-full p-2 rounded-md border border-border bg-background text-foreground">
            {PROFILES.map(p=> <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
