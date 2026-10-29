import { useEffect, useRef, useState } from 'react';
import { Download, ListMusic, Loader2, Mic2, Music2, Pause, Play, Scissors, Upload, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_MEDIA_IMAGE, formatMediaDuration, readMediaDuration } from '@/lib/media';
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
  const [duration, setDuration] = useState(0);
  const maxDuration = 300;
  useEffect(() => { setFile(initialFile); setResult(null); setProgress(0); setStatus(''); }, [initialFile]);

  const run = async () => {
    if (!user) { toast.info('Sign in to use the Stem Separator.'); return; }
    if (!file) { toast.error('Choose an audio file first.'); return; }
    setBusy(true); setResult(null); setProgress(0); setStatus('Preparing audio');
    let stageTimer: number | null = null;
    try {
      stageTimer = window.setInterval(() => setProgress(current => Math.min(86, current < 24 ? current : current + 1)), 1800);
      const separated = await separateAudio(file, (value, label) => { setProgress(value); setStatus(label); });
      setProgress(100); setStatus('Stems ready'); setResult(separated);
    }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Stem separation failed.'); setStatus(''); }
    finally { if (stageTimer) window.clearInterval(stageTimer); setBusy(false); }
  };

  const chooseFile = async (selected: File | null) => {
    setResult(null); setDuration(0);
    if (!selected) { setFile(null); return; }
    const mediaDuration = await readMediaDuration(selected);
    if (mediaDuration > maxDuration) {
      setFile(null);
      toast.error(`This audio is ${formatMediaDuration(mediaDuration)}. Stem separation accepts tracks up to 5:00.`);
      return;
    }
    setDuration(mediaDuration);
    setFile(selected);
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
      <Upload className="mb-3 h-7 w-7 text-primary" /><strong>{file ? file.name : 'Choose a song or beat'}</strong>
      <span className="mt-1 text-sm text-muted-foreground">WAV, MP3, M4A, FLAC, OGG or WebM · maximum 5 minutes</span>
      {file && duration > 0 && <span className="mt-1 text-xs text-muted-foreground">Duration: {formatMediaDuration(duration)}</span>}
      <input type="file" accept="audio/*" className="hidden" onChange={event => void chooseFile(event.target.files?.[0] || null)} />
    </label>
    <Button className="w-full" size="lg" disabled={!file || busy} onClick={() => void run()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scissors className="mr-2 h-4 w-4" />}{busy ? status : 'Extract vocals and instrumental'}</Button>
    {busy && <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{status}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">Short clips usually finish first. A full five-minute track can take several minutes because both high-quality stems are rendered before upload.</p></div>}
    {result && <div className="space-y-3">
      <StemPlaylist result={result} />
      <div className="grid gap-2 sm:grid-cols-2">
        {onSendToDaw && <Button onClick={() => void onSendToDaw(result)}><ListMusic className="mr-2 h-4 w-4" />Send both to DAW playlist</Button>}
        <Button variant={onSendToDaw ? 'outline' : 'default'} disabled={saving} onClick={() => void saveToLibrary()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListMusic className="mr-2 h-4 w-4" />}Save both to music library</Button>
      </div>
    </div>}
  </div>;
}

function StemPlaylist({ result }: { result: StemSeparationResult }) {
  const vocalsRef = useRef<HTMLAudioElement>(null);
  const beatRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(result.duration || 0);
  const [vocalsMuted, setVocalsMuted] = useState(false);
  const [beatMuted, setBeatMuted] = useState(false);

  const toggle = async () => {
    const vocals = vocalsRef.current; const beat = beatRef.current;
    if (!vocals || !beat) return;
    if (playing) { vocals.pause(); beat.pause(); setPlaying(false); return; }
    const start = Math.min(vocals.currentTime, beat.currentTime);
    vocals.currentTime = start; beat.currentTime = start;
    await Promise.all([vocals.play(), beat.play()]); setPlaying(true);
  };
  const seek = (value: number) => { if (vocalsRef.current) vocalsRef.current.currentTime = value; if (beatRef.current) beatRef.current.currentTime = value; setPosition(value); };
  const lanes = [
    { title: 'Vocals', Icon: Mic2, stem: result.vocals, muted: vocalsMuted, setMuted: setVocalsMuted },
    { title: 'Instrumental / beat', Icon: Music2, stem: result.instrumental, muted: beatMuted, setMuted: setBeatMuted },
  ];

  return <div className="overflow-hidden rounded-2xl border border-border bg-[#11151b] text-white shadow-xl">
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
      <Button size="icon" onClick={() => void toggle()}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
      <div className="min-w-0 flex-1"><strong>Separated stem playlist</strong><p className="text-xs text-white/55">Both stems play together. Mute a lane to solo the other.</p></div>
      <span className="text-xs tabular-nums text-white/60">{formatMediaDuration(position)} / {formatMediaDuration(length)}</span>
    </div>
    <div className="relative space-y-2 p-4">
      <div className="pointer-events-none absolute bottom-4 top-4 w-px bg-primary shadow-[0_0_12px_hsl(var(--primary))]" style={{ left: `calc(1rem + ${(position / Math.max(length, 1)) * 100}%)` }} />
      {lanes.map(({ title, Icon, stem, muted, setMuted }) => <div key={title} className="grid grid-cols-[130px_minmax(0,1fr)] items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="flex items-center gap-2 border-r border-white/10 p-3">
          <Icon className="h-4 w-4 text-primary" />
          <span className="truncate text-xs font-semibold">{title}</span>
          <button className="ml-auto rounded p-1 hover:bg-white/10" title={`Mute ${title}`} onClick={() => setMuted(!muted)}>{muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}</button>
        </div>
        <div className="relative h-14 overflow-hidden bg-gradient-to-r from-primary/15 via-accent/20 to-primary/15">
          <div className="absolute inset-y-2 left-2 right-2 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 5px, rgba(255,255,255,.35) 5px 7px)', clipPath: 'polygon(0 45%, 4% 20%, 8% 58%, 12% 30%, 16% 70%, 20% 35%, 24% 65%, 28% 25%, 32% 60%, 36% 38%, 40% 72%, 44% 28%, 48% 60%, 52% 35%, 56% 68%, 60% 22%, 64% 55%, 68% 32%, 72% 70%, 76% 25%, 80% 60%, 84% 40%, 88% 72%, 92% 30%, 96% 58%, 100% 45%, 100% 55%, 0 55%)' }} />
          <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7 text-white" title={`Download ${title}`} onClick={() => void downloadStem(stem.url, stem.filename)}><Download className="h-3.5 w-3.5" /></Button>
        </div>
      </div>)}
    </div>
    <input aria-label="Stem playback position" type="range" min={0} max={Math.max(length, 0.1)} step={0.05} value={position} onChange={event => seek(Number(event.target.value))} className="block w-full accent-pink-500" />
    <audio ref={vocalsRef} src={result.vocals.url} muted={vocalsMuted} preload="metadata" />
    <audio ref={beatRef} src={result.instrumental.url} muted={beatMuted} preload="metadata" onLoadedMetadata={event => setLength(event.currentTarget.duration || result.duration)} onTimeUpdate={event => { const time = event.currentTarget.currentTime; setPosition(time); if (vocalsRef.current && Math.abs(vocalsRef.current.currentTime - time) > .12) vocalsRef.current.currentTime = time; }} onEnded={() => { vocalsRef.current?.pause(); setPlaying(false); setPosition(0); seek(0); }} />
  </div>;
}
