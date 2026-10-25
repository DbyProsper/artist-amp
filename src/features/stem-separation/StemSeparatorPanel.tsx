import { useEffect, useState, type ReactNode } from 'react';
import { Download, ListMusic, Loader2, Mic2, Music2, Scissors, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';
import { saveGeneratedAudio } from '@/lib/aiMusicStorage';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';
import { downloadStem, separateAudio, type StemSeparationResult } from './api';

interface StemSeparatorPanelProps {
  initialFile?: File | null;
  onSendToDaw?: (result: StemSeparationResult) => Promise<void>;
  compact?: boolean;
}

export function StemSeparatorPanel({ initialFile = null, onSendToDaw, compact = false }: StemSeparatorPanelProps) {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(initialFile);
  const [result, setResult] = useState<StemSeparationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setFile(initialFile); setResult(null); setProgress(0); setStatus(''); }, [initialFile]);

  const run = async () => {
    if (!file) { toast.error('Choose an audio file first.'); return; }
    setBusy(true); setResult(null); setProgress(0); setStatus('Preparing audio');
    try { setResult(await separateAudio(file, (value, label) => { setProgress(value); setStatus(label); })); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Stem separation failed.'); setStatus(''); }
    finally { setBusy(false); }
  };

  const saveToLibrary = async () => {
    if (!result || !user || !profile) { toast.error('Sign in to save stems to your playlist.'); return; }
    setSaving(true);
    try {
      await saveGeneratedAudio(profile.id || user.uid, { title: result.vocals.filename.replace(/\.wav$/i, ''), audio_url: result.vocals.url, cover_url: DEFAULT_MEDIA_IMAGE, duration: result.duration, mode: 'stem-vocals', plan: 'Separated with MusicInsta Stem Separator' });
      await saveGeneratedAudio(profile.id || user.uid, { title: result.instrumental.filename.replace(/\.wav$/i, ''), audio_url: result.instrumental.url, cover_url: DEFAULT_MEDIA_IMAGE, duration: result.duration, mode: 'stem-instrumental', plan: 'Separated with MusicInsta Stem Separator' });
      toast.success('Vocals and instrumental saved to Studio Generated Music.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The stems could not be saved.'); }
    finally { setSaving(false); }
  };

  return <div className={`space-y-5 ${compact ? '' : 'rounded-3xl border border-border bg-card p-5 sm:p-7'}`}>
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center transition hover:bg-primary/10">
      <Upload className="mb-3 h-7 w-7 text-primary" /><strong>{file ? file.name : 'Choose a song or beat'}</strong><span className="mt-1 text-sm text-muted-foreground">WAV, MP3, M4A, FLAC, OGG or WebM</span>
      <input type="file" accept="audio/*" className="hidden" onChange={event => { setFile(event.target.files?.[0] || null); setResult(null); }} />
    </label>
    <Button className="w-full" size="lg" disabled={!file || busy} onClick={() => void run()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}{busy ? status : 'Extract vocals and instrumental'}</Button>
    {busy && <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{status}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">Separation can take several minutes for a full song.</p></div>}
    {result && <div className="space-y-3">
      <StemCard icon={<Mic2 className="h-5 w-5" />} title="Vocals" stem={result.vocals} />
      <StemCard icon={<Music2 className="h-5 w-5" />} title="Instrumental / beat" stem={result.instrumental} />
      <div className="grid gap-2 sm:grid-cols-2">
        {onSendToDaw && <Button onClick={() => void onSendToDaw(result)}><ListMusic className="mr-2 h-4 w-4" />Send both to DAW playlist</Button>}
        <Button variant={onSendToDaw ? 'outline' : 'default'} disabled={saving} onClick={() => void saveToLibrary()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListMusic className="mr-2 h-4 w-4" />}Save both to music library</Button>
      </div>
    </div>}
  </div>;
}

function StemCard({ icon, title, stem }: { icon: ReactNode; title: string; stem: StemSeparationResult['vocals'] }) {
  return <div className="rounded-2xl border border-border bg-background p-4"><div className="mb-3 flex items-center gap-2 text-primary">{icon}<strong>{title}</strong><Button variant="ghost" size="sm" className="ml-auto" onClick={() => void downloadStem(stem.url, stem.filename)}><Download className="mr-2 h-4 w-4" />Download</Button></div><audio className="h-10 w-full" src={stem.url} controls preload="metadata" /></div>;
}
