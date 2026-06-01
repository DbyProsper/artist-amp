import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WaveSurfer from 'wavesurfer.js';
import { ArrowLeft, Download, Music2, Sparkles, Volume2, Zap, Lock, Play, Pause, Share2, Link2, Sliders, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { enhanceAudio, exportEnhancedAudio } from '@/lib/api';
import { downloadAudio } from '@/lib/audioUtils';
import { saveGeneratedAudio } from '@/lib/aiMusicStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type EnhanceHistoryItem = {
  id: string;
  title?: string;
  prompt: string;
  audioUrl?: string;
  createdAt: string | Date;
};

type EnhancementVariant = 'balanced' | 'bass' | 'vocal' | 'loud';

const ENHANCEMENT_VARIANTS: Array<{
  id: EnhancementVariant;
  label: string;
  description: string;
  backendType: 'enhance' | 'compress' | 'normalize' | 'reverb';
  icon: React.ReactNode;
}> = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Polished, even sound across the mix.',
    backendType: 'enhance',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: 'bass',
    label: 'Bass Boost',
    description: 'Deeper low end with extra punch.',
    backendType: 'compress',
    icon: <Music2 className="w-5 h-5" />,
  },
  {
    id: 'vocal',
    label: 'Vocal',
    description: 'Clearer vocals with presence and warmth.',
    backendType: 'normalize',
    icon: <Volume2 className="w-5 h-5" />,
  },
  {
    id: 'loud',
    label: 'Loud',
    description: 'Increased loudness and energy for playback.',
    backendType: 'reverb',
    icon: <Zap className="w-5 h-5" />,
  },
];

interface AudioEnhancementPanelProps {
  onBack: () => void;
  generatedAudioUrl?: string | null;
  generatedTracks?: EnhanceHistoryItem[];
  userTier: 'free' | 'premium';
  profileId?: string;
}

function parseAudioFileExt(url: string) {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1] : 'mp3';
}

async function fetchAudioFileFromUrl(sourceUrl: string): Promise<File> {
  const response = await fetch(sourceUrl, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to fetch audio source: ${response.statusText}`);
  }

  const blob = await response.blob();
  const ext = parseAudioFileExt(sourceUrl).toLowerCase();
  const mimeType = blob.type || 'audio/mpeg';
  return new File([blob], `enhancement-source.${ext}`, { type: mimeType });
}

export function AudioEnhancementPanel({
  onBack,
  generatedAudioUrl,
  generatedTracks = [],
  userTier,
  profileId,
}: AudioEnhancementPanelProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>(generatedAudioUrl || '');
  const [sourceLabel, setSourceLabel] = useState<string>(generatedAudioUrl ? 'Generated track' : 'Upload audio file');
  const [activeVariant, setActiveVariant] = useState<EnhancementVariant>('balanced');
  const [previewUrls, setPreviewUrls] = useState<Record<EnhancementVariant, string>>({});
  const [allPreviewUrls, setAllPreviewUrls] = useState<Record<string, string>>({});
  const [previewMetadata, setPreviewMetadata] = useState<Record<EnhancementVariant, { export_locked?: boolean }>>({});
  const [enhancingVariant, setEnhancingVariant] = useState<EnhancementVariant | null>(null);
  const [enhancementPhase, setEnhancementPhase] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'failed'>('idle');
  const [pollProgress, setPollProgress] = useState(0);
  const [pollStatusText, setPollStatusText] = useState('');
  const [previewOptionsOpen, setPreviewOptionsOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [compareMode, setCompareMode] = useState<'original' | 'enhanced'>('original');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sourceDuration, setSourceDuration] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [intensity, setIntensity] = useState(68);
  const [eqLevel, setEqLevel] = useState(42);
  const originalWaveformRef = useRef<HTMLDivElement>(null);
  const enhancedWaveformRef = useRef<HTMLDivElement>(null);
  const originalWaveSurfer = useRef<any>(null);
  const enhancedWaveSurfer = useRef<any>(null);
  const enhancementAbortController = useRef<AbortController | null>(null);

  const isPremium = userTier === 'premium';
  const activeVariantConfig = ENHANCEMENT_VARIANTS.find((item) => item.id === activeVariant);
  const activePreviewUrl = previewUrls[activeVariant];
  const activeMetadata = previewMetadata[activeVariant] || {};
  const isLocked = activeMetadata.export_locked ?? false;

  useEffect(() => {
    setSourceUrl(generatedAudioUrl || '');
  }, [generatedAudioUrl]);

  useEffect(() => {
    if (sourceFile || sourceUrl) {
      setPreviewUrls({});
      setPreviewMetadata({});
    }
  }, [sourceFile, sourceUrl]);

  const sourcePreviewUrl = useMemo(() => {
    if (sourceFile) {
      return URL.createObjectURL(sourceFile);
    }
    return sourceUrl;
  }, [sourceFile, sourceUrl]);

  useEffect(() => {
    return () => {
      if (sourceFile) {
        URL.revokeObjectURL(sourcePreviewUrl);
      }
    };
  }, [sourceFile, sourcePreviewUrl]);

  // Waveform setup - original
  useEffect(() => {
    if (!originalWaveformRef.current || originalWaveSurfer.current) return;

    originalWaveSurfer.current = WaveSurfer.create({
      container: originalWaveformRef.current,
      waveColor: 'rgba(56, 189, 248, 0.15)',
      progressColor: '#38bdf8',
      cursorColor: '#ffffff',
      cursorWidth: 2,
      barWidth: 3,
      barRadius: 3,
      height: 80,
      normalize: true,
      responsive: true,
      hideScrollbar: true,
      interact: false,
    });

    originalWaveSurfer.current.on('audioprocess', () => {
      const current = originalWaveSurfer.current.getCurrentTime();
      const total = originalWaveSurfer.current.getDuration();
      setCurrentTime(current);
      setDuration(total || duration);
      if (enhancedWaveSurfer.current && typeof enhancedWaveSurfer.current.seekTo === 'function') {
        enhancedWaveSurfer.current.seekTo(total ? current / total : 0);
      }
    });

    originalWaveSurfer.current.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      originalWaveSurfer.current?.destroy();
      originalWaveSurfer.current = null;
    };
  }, []);

  // Waveform setup - enhanced
  useEffect(() => {
    if (!enhancedWaveformRef.current || enhancedWaveSurfer.current) return;

    enhancedWaveSurfer.current = WaveSurfer.create({
      container: enhancedWaveformRef.current,
      waveColor: 'rgba(167, 139, 250, 0.14)',
      progressColor: '#a78bfa',
      cursorColor: '#f8fafc',
      cursorWidth: 2,
      barWidth: 3,
      barRadius: 3,
      height: 80,
      normalize: true,
      responsive: true,
      hideScrollbar: true,
      interact: false,
    });

    enhancedWaveSurfer.current.on('audioprocess', () => {
      const current = enhancedWaveSurfer.current.getCurrentTime();
      const total = enhancedWaveSurfer.current.getDuration();
      setCurrentTime(current);
      setDuration(total || duration);
      if (originalWaveSurfer.current && typeof originalWaveSurfer.current.seekTo === 'function') {
        originalWaveSurfer.current.seekTo(total ? current / total : 0);
      }
    });

    enhancedWaveSurfer.current.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      enhancedWaveSurfer.current?.destroy();
      enhancedWaveSurfer.current = null;
    };
  }, []);

  useEffect(() => {
    if (sourcePreviewUrl && originalWaveSurfer.current) {
      originalWaveSurfer.current.load(sourcePreviewUrl);
    }
  }, [sourcePreviewUrl]);

  useEffect(() => {
    if (activePreviewUrl && enhancedWaveSurfer.current) {
      enhancedWaveSurfer.current.load(activePreviewUrl);
    }
  }, [activePreviewUrl]);

  useEffect(() => {
    if (!sourcePreviewUrl) {
      setSourceDuration(0);
      return;
    }

    const audio = new Audio(sourcePreviewUrl);
    const handleLoaded = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setSourceDuration(audio.duration);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('error', () => setSourceDuration(0));

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.src = '';
    };
  }, [sourcePreviewUrl]);

  const currentPlaybackUrl = activePreviewUrl || sourcePreviewUrl;
  const hasSource = Boolean(sourceFile || sourceUrl);
  const hasGeneratedSources = Boolean(generatedAudioUrl || generatedTracks.length > 0);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    setSourceFile(file);
    setSourceUrl('');
    setSourceLabel(file.name);
  };

  const handleTogglePlayback = () => {
    const activeWave = compareMode === 'original' ? originalWaveSurfer.current : enhancedWaveSurfer.current;
    if (!activeWave) return;

    if (isPlaying) {
      activeWave.pause();
      setIsPlaying(false);
      return;
    }

    activeWave.play();
    setIsPlaying(true);
  };

  const handleSwitchMode = (mode: 'original' | 'enhanced') => {
    if (mode === compareMode) return;
    const activeWave = compareMode === 'original' ? originalWaveSurfer.current : enhancedWaveSurfer.current;
    const nextWave = mode === 'original' ? originalWaveSurfer.current : enhancedWaveSurfer.current;
    const time = activeWave?.getCurrentTime() ?? currentTime;

    if (activeWave) {
      activeWave.pause();
    }
    setCompareMode(mode);
    setCurrentTime(time);

    if (nextWave) {
      nextWave.seekTo(duration ? time / duration : 0);
      if (isPlaying) {
        nextWave.play();
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setSourceFile(file);
    setSourceUrl('');
    setSourceLabel(file.name);
  };

  const handleSelectGeneratedTrack = (audioUrl: string, title?: string) => {
    setError('');
    setSourceFile(null);
    setSourceUrl(audioUrl);
    setSourceLabel(title || 'Generated track');
  };

  const handleSelectPreview = async (variant: EnhancementVariant) => {
    if (previewUrls[variant]) {
      setActiveVariant(variant);
      return;
    }
    await handleEnhanceVariant(variant);
  };

  const handleCopyPreviewLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Preview link copied to clipboard');
    } catch (err) {
      console.error('[AudioEnhancement] Copy failed', err);
      toast.error('Unable to copy link');
    }
  };

  const handleDownloadPreviewLink = async (url: string, variant: EnhancementVariant) => {
    try {
      const ext = parseAudioFileExt(url);
      await downloadAudio(url, `enhanced-${variant}`, ext);
      toast.success(`${variant} preview downloaded`);
    } catch (err) {
      console.error('[AudioEnhancement] Download failed', err);
      toast.error('Unable to download preview');
    }
  };

  const resolveSourceFile = async (): Promise<File> => {
    if (sourceFile) {
      return sourceFile;
    }
    if (!sourceUrl) {
      throw new Error('Please select or upload an audio source first.');
    }
    return fetchAudioFileFromUrl(sourceUrl);
  };

  const handleCancelEnhancement = () => {
    if (enhancementAbortController.current) {
      enhancementAbortController.current.abort();
      enhancementAbortController.current = null;
    }
    setCurrentJobId(null);
    setEnhancingVariant(null);
    setEnhancementPhase('idle');
    setPollProgress(0);
    setPollStatusText('Enhancement cancelled');
    setError('Enhancement cancelled by user');
    toast.info('Enhancement cancelled');
  };

  const handleEnhanceVariant = async (variant: EnhancementVariant) => {
    setError('');

    if (!hasSource) {
      setError('Upload audio or choose a generated track first.');
      return;
    }

    if (previewUrls[variant]) {
      setActiveVariant(variant);
      return;
    }

    const variantConfig = ENHANCEMENT_VARIANTS.find((v) => v.id === variant);
    setActiveVariant(variant);
    setEnhancingVariant(variant);

    try {
      enhancementAbortController.current = new AbortController();
      const signal = enhancementAbortController.current.signal;
      const startTime = Date.now();

      const sourceFileObject = await resolveSourceFile();
      setEnhancementPhase('uploading');
      setPollStatusText('Uploading source audio...');
      setPollProgress(15);

      const result = await enhanceAudio(sourceFileObject, variant, {
        uploadSignal: signal,
        uploadTimeoutMs: 60000,
        pollOptions: {
          maxWaitMs: 600000,
          initialDelayMs: 1000,
          maxBackoffMs: 10000,
          backoffMultiplier: 1.8,
          signal: signal,
          onProgress: (status: any) => {
            setEnhancementPhase('processing');
            setPollStatusText(`Processing preview (${status.status || 'waiting'})`);
            const elapsed = Date.now() - startTime;
            const estimated = Math.min(98, Math.max(20, Math.floor((elapsed / 600000) * 100)));
            setPollProgress(estimated);
          },
        },
      });

      if (result.data?.job_id) {
        setCurrentJobId(result.data.job_id);
      }

      if (!result.success) {
        throw new Error(result.error || 'Enhancement failed');
      }

      if (result.data?.previews && typeof result.data.previews === 'object') {
        const previewMap: Record<string, EnhancementVariant> = {
          balanced: 'balanced',
          bass_boost: 'bass',
          vocal: 'vocal',
          loud: 'loud',
        };

        setAllPreviewUrls(result.data.previews);

        const newPreviews: Record<EnhancementVariant, string> = {} as Record<EnhancementVariant, string>;
        Object.entries(result.data.previews).forEach(([backendKey, url]) => {
          const componentVariant = previewMap[backendKey];
          if (componentVariant && typeof url === 'string') {
            newPreviews[componentVariant] = url;
          }
        });

        setPreviewUrls((prev) => ({ ...prev, ...newPreviews }));
        setPreviewMetadata((prev) => ({
          ...prev,
          [variant]: {
            export_locked: result.data?.export_locked ?? false,
          },
        }));
        toast.success(`All audio enhancements ready!`);
      } else {
        const audioUrl =
          result.audio_url ||
          (typeof result.audio_base64 === 'string' ? `data:audio/wav;base64,${result.audio_base64}` : '');

        if (!audioUrl) {
          throw new Error('Backend did not return an enhanced audio URL.');
        }

        setPreviewUrls((prev) => ({ ...prev, [variant]: audioUrl }));
        setPreviewMetadata((prev) => ({
          ...prev,
          [variant]: {
            export_locked: result.data?.export_locked ?? false,
          },
        }));
        toast.success(`${variantConfig?.label} preview ready!`);
      }
      setEnhancementPhase('done');
      setPollProgress(100);
      setPollStatusText('Preview ready');
    } catch (err) {
      setEnhancementPhase('failed');
      setPollStatusText('Preview failed');
      const message = err instanceof Error ? err.message : 'Failed to enhance audio';
      setError(message);
      console.error('[AudioEnhancement] Enhance error:', err);
    } finally {
      setEnhancingVariant(null);
      setCurrentJobId(null);
      enhancementAbortController.current = null;
    }
  };

  const handleExport = async () => {
    if (!currentPlaybackUrl) {
      setError('Nothing to export yet. Generate a preview first.');
      return;
    }

    if (isLocked && !isPremium) {
      toast.error('Premium membership required to export full-quality audio.');
      return;
    }

    setIsExporting(true);
    setError('');
    try {
      const result = await exportEnhancedAudio(currentPlaybackUrl, 'wav');
      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      const url = result.audio_url || result.data?.audio_url;
      const base64 = result.audio_base64 || result.data?.audio_base64;
      const filename = `${activeVariantConfig?.label ?? 'enhanced-audio'}-${Date.now()}`;

      if (url) {
        await downloadAudio(url, filename, 'wav');
      } else if (typeof base64 === 'string') {
        const link = document.createElement('a');
        link.href = `data:audio/wav;base64,${base64}`;
        link.download = `${filename}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Export response did not include a downloadable URL');
      }

      toast.success('Audio exported successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      console.error('[AudioEnhancement] Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!previewUrls[activeVariant]) {
      setError('Generate a preview before saving to library.');
      return;
    }
    if (!profileId) {
      setError('Sign in to save enhanced audio to your library.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await saveGeneratedAudio(profileId, {
        title: `Enhanced - ${activeVariantConfig?.label}`,
        audio_url: previewUrls[activeVariant],
        mode: `enhancement_${activeVariant}`,
      });
      toast.success('Enhanced audio saved to your library!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      console.error('[AudioEnhancement] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-border/40 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </Button>
          <h1 className="text-xl font-bold">Audio Enhancement</h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              {userTier === 'premium' ? 'Premium' : 'Free'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Preset Controls */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 border-r border-border/40 bg-muted/20 overflow-y-auto p-4 space-y-6"
        >
          {/* Presets Section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mastering Presets
            </p>
            <div className="space-y-2">
              {ENHANCEMENT_VARIANTS.map((variant) => (
                <motion.button
                  key={variant.id}
                  onClick={() => handleEnhanceVariant(variant.id)}
                  disabled={!hasSource || enhancingVariant === variant.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-200',
                    activeVariant === variant.id && previewUrls[variant.id]
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/40 bg-background text-muted-foreground hover:border-border hover:bg-muted/30',
                    !hasSource && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded text-primary">
                      {variant.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-semibold">{variant.label}</p>
                      <p className="text-[10px] text-muted-foreground">{variant.description}</p>
                    </div>
                    {enhancingVariant === variant.id ? (
                      <span className="text-[10px] text-primary">Processing</span>
                    ) : previewUrls[variant.id] ? (
                      <span className="text-[10px] text-emerald-400">✓ Ready</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Preview</span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/40" />

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewOptionsOpen(true)}
              disabled={Object.keys(previewUrls).length === 0}
              className="w-full justify-start gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share / Download
            </Button>
          </div>

          <div className="h-px bg-border/40" />

          {/* Recent History */}
          {hasGeneratedSources && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="w-3 h-3" />
                Recent
              </div>
              <div className="space-y-2">
                {generatedAudioUrl && (
                  <button
                    type="button"
                    onClick={() => handleSelectGeneratedTrack(generatedAudioUrl, 'Current Track')}
                    className={cn(
                      'w-full text-left p-2 rounded-lg text-xs transition-colors',
                      sourceUrl === generatedAudioUrl
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/30'
                    )}
                  >
                    <p className="font-medium line-clamp-1">Current Generated Track</p>
                  </button>
                )}
                {generatedTracks.slice(0, 4).map((track) =>
                  track.audioUrl ? (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleSelectGeneratedTrack(track.audioUrl!, track.title)}
                      className={cn(
                        'w-full text-left p-2 rounded-lg text-xs transition-colors',
                        sourceUrl === track.audioUrl
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/30'
                      )}
                    >
                      <p className="font-medium line-clamp-1">{track.title || 'Generated audio'}</p>
                    </button>
                  ) : null
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* CENTER PANEL - Upload or Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-y-auto p-8 flex flex-col"
        >
          <div className="max-w-4xl mx-auto w-full space-y-8">
            <AnimatePresence mode="wait">
              {!hasSource ? (
                // Upload Section
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Upload Your Audio</h2>
                    <p className="text-sm text-muted-foreground">
                      Choose an audio file or select a generated track to enhance
                    </p>
                  </div>

                  {/* Drag & Drop Upload */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'rounded-xl border-2 border-dashed px-8 py-16 text-center transition-all',
                      dragActive
                        ? 'border-primary/80 bg-primary/10 shadow-lg shadow-primary/20'
                        : 'border-border/40 bg-muted/30 hover:border-border'
                    )}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Music2 className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Drag and drop your audio file</p>
                        <p className="text-sm text-muted-foreground">MP3, WAV, or any supported audio format</p>
                      </div>
                      <label htmlFor="audio-upload">
                        <Button asChild>
                          <span>Choose a file</span>
                        </Button>
                      </label>
                      <input
                        id="audio-upload"
                        type="file"
                        accept="audio/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Generated Tracks */}
                  {hasGeneratedSources && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Or select from your generated tracks</h3>
                      <div className="space-y-2">
                        {generatedAudioUrl && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleSelectGeneratedTrack(generatedAudioUrl, 'Current Generated Track')}
                            className="w-full rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-left text-sm transition hover:bg-muted/50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Current Generated Track</span>
                              <Music2 className="w-4 h-4 text-primary" />
                            </div>
                          </motion.button>
                        )}
                        {generatedTracks.slice(0, 5).map((track) =>
                          track.audioUrl ? (
                            <motion.button
                              key={track.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectGeneratedTrack(track.audioUrl!, track.title)}
                              className="w-full rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-left text-sm transition hover:bg-muted/50"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium line-clamp-1">{track.title || 'Generated audio'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(track.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <Music2 className="w-4 h-4 text-primary" />
                              </div>
                            </motion.button>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                // Comparison Section
                <motion.div
                  key="comparison"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Dual Waveform Preview</h2>
                      <p className="text-sm text-muted-foreground">{sourceLabel}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSourceFile(null)}>
                      Change Audio
                    </Button>
                  </div>

                  {/* Mode Switcher */}
                  <div className="inline-flex rounded-lg border border-border/40 p-1 bg-muted/30">
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('original')}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-all',
                        compareMode === 'original'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('enhanced')}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-all',
                        compareMode === 'enhanced'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Enhanced
                    </button>
                  </div>

                  {/* Waveforms */}
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>Original</span>
                        <span>{compareMode === 'original' ? 'Active' : 'Reference'}</span>
                      </div>
                      <div ref={originalWaveformRef} className="rounded-lg bg-background h-20" />
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <span>Enhanced</span>
                        <span>{previewUrls[activeVariant] ? 'Ready' : 'Pending'}</span>
                      </div>
                      <div ref={enhancedWaveformRef} className="rounded-lg bg-background h-20" />
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileHover={currentPlaybackUrl ? { scale: 1.05 } : {}}
                        whileTap={currentPlaybackUrl ? { scale: 0.98 } : {}}
                        onClick={handleTogglePlayback}
                        disabled={!currentPlaybackUrl}
                        className={cn(
                          'inline-flex h-12 w-12 items-center justify-center rounded-full transition-shadow',
                          currentPlaybackUrl
                            ? 'bg-primary text-background hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        )}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </motion.button>

                      <div className="flex-1">
                        <input
                          type="range"
                          min={0}
                          max={duration || sourceDuration || 0}
                          value={currentTime}
                          step={0.1}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setCurrentTime(value);
                            const position = (duration || sourceDuration) ? value / (duration || sourceDuration) : 0;
                            if (compareMode === 'original' && originalWaveSurfer.current) {
                              originalWaveSurfer.current.seekTo(position);
                            }
                            if (compareMode === 'enhanced' && enhancedWaveSurfer.current) {
                              enhancedWaveSurfer.current.seekTo(position);
                            }
                          }}
                          disabled={!currentPlaybackUrl}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary disabled:cursor-not-allowed"
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration || sourceDuration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhancement Progress */}
                  {enhancementPhase !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg border border-border/40 bg-muted/30 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">{pollStatusText}</p>
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          {enhancementPhase === 'uploading' ? 'Uploading' : enhancementPhase === 'processing' ? 'Processing' : 'Complete'}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            enhancementPhase === 'failed' ? 'bg-destructive' : 'bg-primary'
                          )}
                          style={{ width: `${pollProgress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg"
                    >
                      <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                  )}

                  {enhancingVariant && (
                    <Button
                      onClick={handleCancelEnhancement}
                      variant="destructive"
                      className="w-full"
                    >
                      Cancel Enhancement
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* RIGHT PANEL - Settings & Export */}
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 border-l border-border/40 bg-muted/20 overflow-y-auto p-4 space-y-6"
        >
          {/* Current Settings */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Sliders className="w-3 h-3" />
              Enhancement Settings
            </div>
            <div className="space-y-4 rounded-lg border border-border/40 bg-background p-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Intensity</span>
                  <span className="text-sm font-semibold text-foreground">{intensity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                  disabled={!hasSource}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">EQ Balance</span>
                  <span className="text-sm font-semibold text-foreground">{eqLevel}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={eqLevel}
                  onChange={(e) => setEqLevel(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-secondary"
                  disabled={!hasSource}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-border/40" />

          {/* Current Preset Info */}
          {hasSource && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Current Preset
              </p>
              <div className="rounded-lg border border-border/40 bg-background p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeVariantConfig?.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activeVariantConfig?.description}</p>
                </div>
                <div className="space-y-2">
                  {previewUrls[activeVariant] && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400">Preview ready</span>
                    </div>
                  )}
                  {isLocked && !isPremium && (
                    <div className="flex items-center gap-2 text-xs">
                      <Lock className="w-3 h-3 text-primary" />
                      <span className="text-primary">Premium export</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-border/40" />

          {/* Export Section */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Export & Save
            </p>
            <div className="space-y-2">
              {(!isPremium || isLocked) ? (
                <Button
                  onClick={() => toast.info('Upgrade to premium to export enhanced audio')}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled
                >
                  <Download className="w-4 h-4" />
                  Export (Premium)
                </Button>
              ) : (
                <Button
                  onClick={handleExport}
                  disabled={!previewUrls[activeVariant] || isExporting}
                  className="w-full justify-start gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export Master'}
                </Button>
              )}
              <Button
                onClick={handleSaveToLibrary}
                variant="outline"
                disabled={!previewUrls[activeVariant] || isSaving}
                className="w-full justify-start gap-2"
              >
                <Music2 className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save to Library'}
              </Button>
            </div>
          </div>

          <div className="h-px bg-border/40" />

          {/* Status */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Status
            </p>
            <div className="text-xs space-y-2 text-muted-foreground">
              <div className="flex justify-between">
                <span>Source</span>
                <span className="text-foreground">{hasSource ? '✓ Loaded' : '○ Empty'}</span>
              </div>
              <div className="flex justify-between">
                <span>Presets Ready</span>
                <span className="text-foreground">{Object.keys(previewUrls).length}/4</span>
              </div>
              <div className="flex justify-between">
                <span>Tier</span>
                <span className="text-foreground capitalize">{userTier}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Share/Download Modal */}
      <AlertDialog open={previewOptionsOpen} onOpenChange={setPreviewOptionsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share and download previews</AlertDialogTitle>
            <AlertDialogDescription>
              Export or copy any ready preset preview from your enhancement session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {ENHANCEMENT_VARIANTS.map((variant) => {
              const url = previewUrls[variant.id];
              return (
                <div key={variant.id} className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold">{variant.label}</p>
                      <p className="text-xs text-muted-foreground">{url ? 'Ready' : 'Waiting for preview'}</p>
                    </div>
                    {url && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">✓</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => url && handleSelectPreview(variant.id)} disabled={!url}>
                      Switch
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => url && handleDownloadPreviewLink(url, variant.id)} disabled={!url} className="gap-1">
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => url && handleCopyPreviewLink(url)} disabled={!url} className="gap-1">
                      <Link2 className="w-3 h-3" />
                      Copy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
