import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PRESETS } from './presets';
import { PresetKey } from './types';
import PresetSidebar from './components/PresetSidebar';
import FileDropZone from './components/FileDropZone';
import DualWaveform from './components/DualWaveform';
import SettingsPanel from './components/SettingsPanel';
import ExportActions from './components/ExportActions';
import PremiumGate from './components/PremiumGate';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useEnhancement } from './hooks/useEnhancement';
import { analyzeAudio } from './api/audioEnhancerApi';

interface GeneratedTrack {
  id: string;
  title: string;
  prompt: string;
  audioUrl: string;
  createdAt: string | Date;
}

interface AudioEnhancementPageProps {
  onBack?: () => void;
  generatedAudioUrl?: string;
  generatedTracks?: GeneratedTrack[];
}

export default function AudioEnhancementPage({ onBack, generatedAudioUrl, generatedTracks = [] }: AudioEnhancementPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<any>({
    file: null,
    originalBuffer: null,
    enhancedBuffer: null,
    enhancedBlob: null,
    analysis: null,
    settings: PRESETS.dsp,
    activePreset: 'dsp',
    activeView: 'original',
    status: 'Idle',
    stage: 'Idle',
    progress: 0,
    error: null,
  });
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [sourceType, setSourceType] = useState<'upload' | 'generated' | 'library'>('upload');
  const [sourceLabel, setSourceLabel] = useState('Upload from device');
  const isPremium = false; // replace with real Firebase plan check

  const { decodeFile, previewProcess } = useAudioEngine();
  const enhancement = useEnhancement();

  const activeBack = onBack ?? (() => navigate('/studio'));

  const loadFileFromUrl = useCallback(async (url: string, label: string) => {
    setSourceType('generated');
    setSourceLabel(label);
    setState((s:any) => ({
      ...s,
      file: null,
      originalBuffer: null,
      enhancedBuffer: null,
      enhancedBlob: null,
      status: 'Processing',
      stage: 'Loading selected track',
      progress: 5,
    }));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not load the audio source.');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'mp3';
      const safeName = label.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 32) || 'generated_audio';
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type || 'audio/mpeg' });
      const [buffer, analysis] = await Promise.all([decodeFile(file), analyzeAudio(file)]);
      setState((s:any) => ({ ...s, file, originalBuffer: buffer, analysis, status: 'Idle', stage: 'Preview ready', progress: 100 }));
    } catch (error: any) {
      setState((s:any) => ({ ...s, status: 'Error', stage: 'Could not load selected track', error: error?.message || 'Could not load selected track.' }));
    }
  }, [decodeFile]);

  const handleFile = useCallback(async (file: File) => {
    setSourceType('upload');
    setSourceLabel('Upload from device');
    setState((s:any)=>({ ...s, file, status: 'Processing', stage: 'Analyzing file', progress: 0, enhancedBuffer: null, enhancedBlob: null, activeView: 'original' }));
    try {
      const [buffer, analysis] = await Promise.all([decodeFile(file), analyzeAudio(file)]);
      setState((s:any)=>({ ...s, originalBuffer: buffer, analysis, status: 'Idle', stage: 'Preview ready', progress: 100 }));
    } catch (e:any) {
      setState((s:any)=>({ ...s, status: 'Error', stage: 'Could not load audio file', error: 'Could not load audio file.' }));
    }
  }, [decodeFile]);

  useEffect(()=>{
    if (!state.originalBuffer) return;
    let cancelled = false;
    setState((s:any)=>({ ...s, status:'Processing', stage:'Preparing preview', progress: 0 }));
    previewProcess(state.originalBuffer, state.settings, update => {
      if (cancelled) return;
      setState((s:any)=>({ ...s, status: 'Processing', stage: update.stage, progress: update.progress }));
    }).then(buf=>{
      if (!cancelled) setState((s:any)=>({ ...s, enhancedBuffer: buf, status: 'Idle', stage: 'Preview ready', progress: 100 }));
    }).catch(()=>{
      if (!cancelled) setState((s:any)=>({ ...s, enhancedBuffer: null, status: 'Error', stage: 'Preview failed', error: 'Could not create enhanced preview.' }));
    });
    return ()=>{ cancelled = true; };
  }, [state.originalBuffer, state.settings, previewProcess]);

  const handlePreset = useCallback((key: PresetKey)=> setState((s:any)=>(
    {
      ...s,
      activePreset: key,
      settings: PRESETS[key],
      status: s.originalBuffer ? 'Processing' : s.status,
      stage: s.originalBuffer ? 'Applying preset' : s.stage,
      progress: s.originalBuffer ? 0 : s.progress,
    }
  )), []);

  const handleSettings = useCallback((patch:any) => setState((s:any)=>(
    {
      ...s,
      activePreset: 'custom',
      settings: { ...s.settings, ...patch },
      status: s.originalBuffer ? 'Processing' : s.status,
      stage: s.originalBuffer ? 'Updating settings' : s.stage,
      progress: s.originalBuffer ? 0 : s.progress,
    }
  )), []);

  const handleExport = useCallback(()=>{
    if (!state.file) return;
    if (!isPremium) { setShowPremiumGate(true); return; }
    enhancement.mutate({ file: state.file, settings: state.settings, onProgress: (p:number)=> setState((s:any)=>({ ...s, progress: p })) });
  }, [state.file, state.settings, isPremium, enhancement]);

  const openLibrary = useCallback(() => {
    setSourceType('library');
    navigate('/library');
  }, [navigate]);

  const handleSelectGeneratedTrack = useCallback((track: GeneratedTrack) => {
    loadFileFromUrl(track.audioUrl, track.title || 'Generated Track');
  }, [loadFileFromUrl]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button onClick={activeBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Audio Enhancement</h1>
              <p className="text-sm text-muted-foreground">Upload audio, pick a generated track, or browse your library to preview mastering and export it with Premium.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Preview mode • Export requires Premium</div>
        </div>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
        <div><PresetSidebar active={state.activePreset} onSelect={handlePreset} /></div>

        <div className="space-y-4">
          {!state.file ? (
            <>
              <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Pick audio source</div>
                    <div className="text-base font-semibold">Select a track to enhance</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Source: {sourceLabel}</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSourceType('upload')}
                    className={`rounded-2xl border p-4 text-left transition ${sourceType === 'upload' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-primary/50'}`}>
                    <div className="font-semibold">Upload from device</div>
                    <p className="text-sm text-muted-foreground">Drag or browse files from your computer.</p>
                  </button>

                  <div className={`rounded-2xl border p-4 transition ${sourceType === 'generated' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">AI-generated audio</div>
                        <p className="text-sm text-muted-foreground">Enhance tracks generated in the studio.</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{generatedTracks.length} available</span>
                    </div>
                    {generatedTracks.length > 0 ? (
                      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                        {generatedTracks.slice(0, 4).map((track) => (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => handleSelectGeneratedTrack(track)}
                            className="w-full rounded-2xl border border-border/70 bg-background p-3 text-left text-sm transition hover:border-primary/70 hover:bg-primary/5"
                          >
                            <div className="font-medium">{track.title || 'Generated track'}</div>
                            <div className="text-xs text-muted-foreground truncate">{track.prompt}</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-muted-foreground">No generated tracks yet. Create a song or beat first, then return to enhance it.</p>
                        {generatedAudioUrl && (
                          <button
                            type="button"
                            onClick={() => loadFileFromUrl(generatedAudioUrl, 'Latest generated audio')}
                            className="text-sm font-medium text-primary hover:text-primary/80"
                          >
                            Load the latest generated audio for enhancement
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openLibrary}
                    className={`rounded-2xl border p-4 text-left transition ${sourceType === 'library' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-primary/50'}`}>
                    <div className="font-semibold">Browse your library</div>
                    <p className="text-sm text-muted-foreground">Select saved audio from your personal library.</p>
                  </button>
                </div>
              </div>

              <FileDropZone onFile={handleFile} />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold">Status: {state.status}</div>
                  <div className="text-xs text-muted-foreground">{state.stage}</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${state.progress}%` }} />
                </div>
              </div>

              <DualWaveform
                file={state.file}
                enhancedBuffer={state.enhancedBuffer}
                activeView={state.activeView}
                onViewChange={(v) => setState((s:any)=>({ ...s, activeView: v }))}
                analysis={state.analysis}
                onChangeFile={() => setState((s:any)=>({ ...s, file: null, originalBuffer: null, enhancedBuffer: null, enhancedBlob: null }))}
              />

              <div className="mt-3">
                <ExportActions hasFile={!!state.file} isPremium={isPremium} isProcessing={enhancement.isPending || state.status === 'Processing'} progress={state.progress} onExport={handleExport} />
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6">
          <SettingsPanel settings={state.settings} onChange={handleSettings} />
        </div>
      </div>

      {showPremiumGate && <PremiumGate onClose={()=>setShowPremiumGate(false)} />}
    </div>
  );
}
