import React from 'react';
import { PRESET_META, PRESETS } from '../presets';
import { PresetKey } from '../types';

export default function PresetSidebar({ active, onSelect }: { active: PresetKey; onSelect: (k: PresetKey) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Mastering Presets</h3>
      { (Object.keys(PRESET_META) as PresetKey[]).map(k => (
        <button key={k} onClick={()=>onSelect(k)}
          className={`text-left p-3 rounded-lg transition border ${active===k ? 'bg-primary/10 border-primary' : 'border-border hover:border-primary/50'}`}>
          <div className="flex items-center justify-between gap-2 text-sm font-medium"><span>{PRESET_META[k].name}</span>{k === 'mastered' && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Recommended</span>}</div>
          <div className="text-xs text-muted-foreground">{PRESET_META[k].description}</div>
        </button>
      )) }
    </div>
  );
}
