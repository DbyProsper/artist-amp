import React from 'react';
import LUFSModule from './modules/LUFSModule';
import EQModule from './modules/EQModule';
import StereoModule from './modules/StereoModule';
import NoiseModule from './modules/NoiseModule';
import { EnhancementSettings } from '../types';

export default function SettingsPanel({ settings, onChange }: { settings: EnhancementSettings; onChange: (patch: Partial<EnhancementSettings>) => void }) {
  return (
    <div className="flex flex-col gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      <h3 className="text-sm font-semibold sticky top-0 bg-background">Audio Settings</h3>
      <LUFSModule settings={settings} onChange={onChange} />
      <EQModule settings={settings} onChange={onChange} />
      <StereoModule settings={settings} onChange={onChange} />
      <NoiseModule settings={settings} onChange={onChange} />
    </div>
  );
}
