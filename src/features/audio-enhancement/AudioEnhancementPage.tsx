import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Send, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PRESETS } from './presets';
import { PresetKey } from './types';
import PresetSidebar from './components/PresetSidebar';
import FileDropZone from './components/FileDropZone';
import DualWaveform from './components/DualWaveform';
import SettingsPanel from './components/SettingsPanel';
import ExportActions from './components/ExportActions';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useEnhancement } from './hooks/useEnhancement';
import { analyzeAudio, audioBufferToWavBlob, downloadAudioBuffer } from './api/audioEnhancerApi';
import { storeDawAudio, takeDawAudio } from '@/lib/dawTransfer';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';

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
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
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
    processingKind: null,
    stage: 'idle',
    progress: 0,
    error: null,
    timings: null,
  });
  const [sourceType, setSourceType] = useState<'upload' | 'generated' | 'library'>('upload');
  const [sourceLabel, setSourceLabel] = useState('Upload from device');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [outputFormat, setOutputFormat] = useState<'wav' | 'mp3'>('wav');
  const [libraryTracks, setLibraryTracks] = useState<Array<{ id: string; title: string; audioUrl: string; coverUrl?: string }>>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const { decodeFile, previewProcess } = useAudioEngine();
  const enhancement = useEnhancement();

  const stageLabels: Record<string, string> = {
    idle: 'Preview ready',
    analyzing: 'Analyzing file',
    uploading: state.processingKind === 'export' ? 'Uploading for full-quality export' : 'Uploading',
    processing: state.processingKind === 'export' ? 'Enhancing full-quality audio' : 'Processing preview',
    downloading: state.processingKind === 'export' ? 'Receiving full-quality export' : 'Receiving enhanced audio',
    done: 'Export complete',
    error: 'Error',
  };

  const activeBack = onBack ?? (() => navigate(searchParams.get('source') === 'daw' ? `/studio/daw${searchParams.get('project') ? `?project=${searchParams.get('project')}` : ''}` : '/studio'));

  const loadFileFromUrl = useCallback(async (url: string, label: string) => {
    setSourceType('generated');
    setSourceLabel(label);
    setState((s:any) => ({
      ...s,
      file: null,
      originalBuffer: null,
      enhancedBuffer: null,
      enhancedBlob: null,
      status: 'Analyzing',
      processingKind: 'preview',
      stage: 'analyzing',
      progress: 5,
      timings: null,
    }));

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not load the audio source.');
      const blob = await response.blob();
      const extension = blob.type.split('/')[1] || 'mp3';
      const safeName = label.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 32) || 'generated_audio';
      const file = new File([blob], `${safeName}.${extension}`, { type: blob.type || 'audio/mpeg' });
      const [buffer, analysis] = await Promise.all([decodeFile(file), analyzeAudio(file)]);
      setState((s:any) => ({ ...s, file, originalBuffer: buffer, analysis, status: 'Idle', processingKind: null, stage: 'idle', progress: 100 }));
    } catch (error: any) {
      setState((s:any) => ({ ...s, status: 'Error', stage: 'error', error: error?.message || 'Could not load selected track.' }));
    }
  }, [decodeFile]);

  const handleFile = useCallback(async (file: File) => {
    setSourceType('upload');
    setSourceLabel('Upload from device');
    setState((s:any)=>({ ...s, file, status: 'Analyzing', processingKind: 'preview', stage: 'analyzing', progress: 0, enhancedBuffer: null, enhancedBlob: null, activeView: 'original', timings: null }));
    try {
      const [buffer, analysis] = await Promise.all([decodeFile(file), analyzeAudio(file)]);
      setState((s:any)=>({ ...s, originalBuffer: buffer, analysis, status: 'Idle', processingKind: null, stage: 'idle', progress: 100 }));
      setPreviewNonce(value => value + 1);
    } catch (e:any) {
      setState((s:any)=>({ ...s, status: 'Error', stage: 'error', error: 'Could not load audio file.' }));
    }
  }, [decodeFile]);

  useEffect(() => {
    const key = searchParams.get('key');
    if (searchParams.get('source') !== 'daw' || !key) return;
    takeDawAudio(key).then(result => {
      if (!result) return;
      void handleFile(new File([result.blob], result.name, { type: result.blob.type || 'audio/wav' })).then(() => {
        setSourceType('generated');
        setSourceLabel('MusicInsta DAW');
      });
    });
  }, [handleFile, searchParams]);

  useEffect(()=>{
    if (!state.originalBuffer) return;
    let cancelled = false;
    setState((s:any)=>({ ...s, status:'Processing preview', processingKind: 'preview', stage:'processing', progress: 0 }));
    previewProcess(state.originalBuffer, state.settings, update => {
      if (cancelled) return;
      setState((s:any)=>({ ...s, status: 'Processing preview', processingKind: 'preview', stage: 'processing', progress: update.progress }));
    }).then(buf=>{
      if (!cancelled) setState((s:any)=>({ ...s, enhancedBuffer: buf, status: 'Preview ready', processingKind: null, stage: 'idle', progress: 100 }));
    }).catch(()=>{
      if (!cancelled) setState((s:any)=>({ ...s, enhancedBuffer: null, status: 'Error', stage: 'error', error: 'Could not create enhanced preview.' }));
    });
    return ()=>{ cancelled = true; };
  }, [state.originalBuffer, previewNonce, previewProcess]);

  const handlePreset = useCallback((key: PresetKey)=> {
    setState((s:any)=>(
      {
      ...s,
      activePreset: key,
      settings: PRESETS[key],
      status: s.status,
      stage: s.stage,
      progress: s.progress,
      timings: s.timings,
      }
    ));
    if (state.originalBuffer) setPreviewNonce(value => value + 1);
  }, [state.originalBuffer]);

  const handleSettings = useCallback((patch:any) => setState((s:any)=>(
    {
      ...s,
      activePreset: 'custom',
      settings: { ...s.settings, ...patch },
      status: s.originalBuffer ? 'Processing preview' : s.status,
      processingKind: s.originalBuffer ? 'preview' : s.processingKind,
      stage: s.originalBuffer ? 'processing' : s.stage,
      progress: s.originalBuffer ? 0 : s.progress,
      timings: s.originalBuffer ? null : s.timings,
    }
  )), []);

  const handleExport = useCallback(()=>{
    if (!state.file) return;

    setState((s:any) => ({ ...s, status: 'Processing full-quality export', processingKind: 'export', stage: 'uploading', progress: 0, timings: null }));

    enhancement.mutate({
      file: state.file,
      settings: state.settings,
      onProgress: (pct, stage) => {
        setState((s:any) => ({
          ...s,
          progress: pct,
          stage: pct >= 35 ? 'downloading' : pct >= 33 ? 'processing' : 'uploading',
        }));
      },
      onTimings: (timings) => {
        setState((s:any) => ({ ...s, status: 'Export complete', processingKind: null, timings, stage: 'done', progress: 100 }));
      },
      outputFormat,
      onResult: (blob) => setState((s:any) => ({ ...s, enhancedBlob: blob })),
      onError: (message) => setState((s:any) => ({ ...s, status: 'Error', processingKind: null, stage: 'error', error: message })),
    });
  }, [state.file, state.settings, enhancement, outputFormat]);

  const handlePreviewExport = useCallback(() => {
    if (!state.enhancedBuffer) return;
    downloadAudioBuffer(state.enhancedBuffer, state.file?.name || 'musicinsta-preview.wav');
  }, [state.enhancedBuffer, state.file]);

  useEffect(() => {
    if (state.stage === 'done' && state.enhancedBuffer) {
      setState((s:any) => ({ ...s, activeView: 'enhanced' }));
    }
  }, [state.stage, state.enhancedBuffer]);

  const openLibrary = useCallback(async () => {
    setSourceType('library');
    const owner = profile?.id || user?.uid;
    if (!owner) return;
    setLibraryLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'tracks'), where('profile_id', '==', owner)));
      setLibraryTracks(snapshot.docs.map(item => {
        const value = item.data();
        return { id: item.id, title: value.title || 'Untitled track', audioUrl: value.audio_url || '', coverUrl: value.cover_url || undefined };
      }).filter(track => Boolean(track.audioUrl)));
    } finally { setLibraryLoading(false); }
  }, [profile?.id, user?.uid]);

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
            <img src="/MusicInsta_Logo.png" alt="MusicInsta" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <h1 className="text-xl font-semibold">Audio Enhancement</h1>
              <p className="text-sm text-muted-foreground">Preview mastering in your browser, then download the preview or render the full-quality version.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Preview and export enabled</div>
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
                {sourceType === 'library' && <div className="rounded-2xl border border-border bg-background p-4"><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Your library</p><p className="text-sm text-muted-foreground">Choose a saved track without leaving enhancement.</p></div><Button size="sm" variant="outline" onClick={() => void openLibrary()}>Refresh</Button></div>{libraryLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading library…</p> : libraryTracks.length ? <div className="grid gap-2 sm:grid-cols-2">{libraryTracks.map(track => <button key={track.id} onClick={() => void loadFileFromUrl(track.audioUrl, track.title)} className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-primary"><img src={track.coverUrl || '/placeholder.svg'} alt="" className="h-12 w-12 rounded-lg object-cover" /><span className="min-w-0 truncate text-sm font-medium">{track.title}</span></button>)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No saved audio tracks found.</p>}</div>}
              </div>

              <FileDropZone onFile={handleFile} />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold">Status: {state.status}</div>
                  <div className="text-xs text-muted-foreground">{stageLabels[state.stage] ?? state.stage}</div>
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
                <ExportActions
                  hasFile={!!state.file}
                  isProcessing={enhancement.isPending || Boolean(state.processingKind)}
                  stage={state.stage}
                  progress={state.progress}
                  timings={state.timings}
                  onExport={handleExport}
                  onPreviewExport={handlePreviewExport}
                  hasPreview={Boolean(state.enhancedBuffer)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6">
          <SettingsPanel settings={state.settings} onChange={handleSettings} />
          <Button className="mt-4 w-full" disabled={!state.originalBuffer || Boolean(state.processingKind)} onClick={() => setPreviewNonce(value => value + 1)}>Save settings and process preview</Button>
          <label className="mt-4 block text-sm font-medium">Export format<select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3" value={outputFormat} onChange={event => setOutputFormat(event.target.value as 'wav' | 'mp3')}><option value="wav">WAV lossless</option><option value="mp3">MP3 320 kbps</option></select></label>
          {searchParams.get('source') === 'daw' && (state.enhancedBlob || state.enhancedBuffer) && <Button className="mt-3 w-full" variant="outline" onClick={async () => { const blob = state.enhancedBlob || audioBufferToWavBlob(state.enhancedBuffer); const key = await storeDawAudio(blob, state.file?.name?.replace(/\.[^.]+$/, ' enhanced.wav') || 'Enhanced track.wav'); navigate(`/studio/daw?importEnhanced=${key}`); }}><SlidersHorizontal className="mr-2 h-4 w-4" />Export enhanced audio back to DAW</Button>}
          {(state.enhancedBlob || state.enhancedBuffer) && <Button className="mt-3 w-full" onClick={async () => { const blob = state.enhancedBlob || audioBufferToWavBlob(state.enhancedBuffer); const title = state.file?.name?.replace(/\.[^.]+$/, ' enhanced') || 'Enhanced track'; const key = await storeDawAudio(blob, `${title}.wav`); navigate(`/upload?fromDaw=${key}&title=${encodeURIComponent(title)}`); }}><Send className="mr-2 h-4 w-4" />Start a new post</Button>}
        </div>
      </div>

    </div>
  );
}
