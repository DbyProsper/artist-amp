import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WaveSurfer from 'wavesurfer.js';
import { ArrowLeft, Download, Music2, Sparkles, Volume2, Zap, Lock, Zap as Lightning, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  const [previewMetadata, setPreviewMetadata] = useState<Record<EnhancementVariant, { export_locked?: boolean }>>({});
  const [enhancingVariant, setEnhancingVariant] = useState<EnhancementVariant | null>(null);
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
      height: 110,
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
      height: 110,
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
    if (!compareMode) return;
    if (compareMode === 'original') {
      if (originalWaveSurfer.current && duration) {
        originalWaveSurfer.current.seekTo(duration ? currentTime / duration : 0);
      }
    } else {
      if (enhancedWaveSurfer.current && duration) {
        enhancedWaveSurfer.current.seekTo(duration ? currentTime / duration : 0);
      }
    }
  }, [currentTime, duration, compareMode]);

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
  const isEnhancing = enhancingVariant !== null;

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

  const handleSeek = (value: number) => {
    setCurrentTime(value);
    const position = duration ? value / duration : 0;
    if (compareMode === 'original' && originalWaveSurfer.current) {
      originalWaveSurfer.current.seekTo(position);
    }
    if (compareMode === 'enhanced' && enhancedWaveSurfer.current) {
      enhancedWaveSurfer.current.seekTo(position);
    }
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

  const resolveSourceFile = async (): Promise<File> => {
    if (sourceFile) {
      return sourceFile;
    }
    if (!sourceUrl) {
      throw new Error('Please select or upload an audio source first.');
    }
    return fetchAudioFileFromUrl(sourceUrl);
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
      const sourceFileObject = await resolveSourceFile();
      const result = await enhanceAudio(sourceFileObject, variantConfig?.backendType || 'enhance');

      if (!result.success) {
        throw new Error(result.error || 'Enhancement failed');
      }

      // Handle audio enhancement responses that return multiple preview URLs
      // Backend returns: {success: true, previews: {balanced: url, bass_boost: url, vocal: url, loud: url}, export_locked: true}
      if (result.data?.previews && typeof result.data.previews === 'object') {
        // Map backend preview names to component variant names
        const previewMap: Record<string, EnhancementVariant> = {
          balanced: 'balanced',
          bass_boost: 'bass',
          vocal: 'vocal',
          loud: 'loud',
        };

        // Cache all preview URLs
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
        // Fallback for single audio URL response
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enhance audio';
      setError(message);
      console.error('[AudioEnhancement] Enhance error:', err);
    } finally {
      setEnhancingVariant(null);
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Studio
              </button>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">Audio Enhancement</h1>
                <p className="mt-3 max-w-2xl text-slate-400">
                  Compare original and mastered audio in one premium experience.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full bg-slate-950/80 px-4 py-2 text-sm text-slate-300">
              <span className="rounded-full bg-slate-800 px-3 py-1">{userTier === 'premium' ? 'Premium' : 'Free'}</span>
              <span>{userTier === 'premium' ? 'Export ready' : 'Export locked'}</span>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Source</p>
                  <h2 className="mt-2 text-2xl font-semibold">Upload & compare</h2>
                </div>
                <div className="rounded-full bg-slate-950/80 px-4 py-2 text-sm text-slate-300">
                  {sourcePreviewUrl ? 'Ready to master' : 'Drop a file to begin'}
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'mt-6 rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition-all',
                  dragActive
                    ? 'border-sky-400/80 bg-sky-500/10 shadow-[0_0_0_8px_rgba(56,189,248,0.08)]'
                    : 'border-slate-700 bg-slate-950/80 hover:border-slate-500'
                )}
              >
                <p className="text-slate-300 text-sm font-medium">Drag & drop audio here</p>
                <p className="mt-2 text-sm text-slate-500">Upload MP3, WAV, or any supported track.</p>
                <label
                  htmlFor="audio-upload"
                  className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-100/10 px-5 py-3 text-sm font-semibold text-slate-100 shadow-lg shadow-slate-950/20 transition hover:bg-slate-100/15"
                >
                  Choose a file
                </label>
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {hasGeneratedSources && (
                <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-inner shadow-slate-950/20">
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
                    <span>Or select a generated track</span>
                    <span className="rounded-full bg-slate-900 px-3 py-1">Quick pick</span>
                  </div>
                  <div className="mt-4 space-y-3 max-h-52 overflow-y-auto pr-2">
                    {generatedAudioUrl && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectGeneratedTrack(generatedAudioUrl, 'Current Generated Track')}
                        className={cn(
                          'w-full rounded-3xl border px-4 py-3 text-left text-sm transition',
                          sourceUrl === generatedAudioUrl
                            ? 'border-sky-400 bg-sky-500/10 text-white'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>Current Generated Track</span>
                          <Music2 className="w-4 h-4 text-sky-400" />
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
                          className={cn(
                            'w-full rounded-3xl border px-4 py-3 text-left text-sm transition',
                            sourceUrl === track.audioUrl
                              ? 'border-sky-400 bg-sky-500/10 text-white'
                              : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{track.title || 'Generated audio'}</span>
                            <Music2 className="w-4 h-4 text-sky-400" />
                          </div>
                        </motion.button>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {sourcePreviewUrl && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected</p>
                    <p className="mt-2 text-sm font-semibold text-white truncate">{sourceLabel}</p>
                  </div>
                  <div className="rounded-[28px] bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Duration</p>
                    <p className="mt-2 text-sm font-semibold text-white">{formatTime(sourceDuration)}</p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Compare</p>
                  <h2 className="mt-2 text-2xl font-semibold">Dual waveform preview</h2>
                </div>
                <div className="inline-flex rounded-full bg-slate-950/80 p-1 text-sm text-slate-300">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('original')}
                    className={cn(
                      'rounded-[24px] px-4 py-2 transition',
                      compareMode === 'original'
                        ? 'bg-slate-100 text-slate-950 shadow-sky-500/20'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('enhanced')}
                    className={cn(
                      'rounded-[24px] px-4 py-2 transition',
                      compareMode === 'enhanced'
                        ? 'bg-slate-100 text-slate-950 shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-white'
                    )}
                  >
                    Enhanced
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-[28px] bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                    <span>Original waveform</span>
                    <span className="text-slate-400">{compareMode === 'original' ? 'active' : 'reference'}</span>
                  </div>
                  <div ref={originalWaveformRef} className="mt-4 h-28 overflow-hidden rounded-[24px] bg-slate-900" />
                </div>
                <div className="rounded-[28px] bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                    <span>Enhanced waveform</span>
                    <span className="text-slate-400">{previewUrls[activeVariant] ? 'ready' : 'waiting'}</span>
                  </div>
                  <div ref={enhancedWaveformRef} className="mt-4 h-28 overflow-hidden rounded-[24px] bg-slate-900" />
                </div>
              </div>

              <div className="mt-6 rounded-[28px] bg-slate-950/80 p-5">
                <div className="flex items-center gap-4">
                  <motion.button
                    whileHover={currentPlaybackUrl ? { scale: 1.05 } : {}}
                    whileTap={currentPlaybackUrl ? { scale: 0.98 } : {}}
                    onClick={handleTogglePlayback}
                    disabled={!currentPlaybackUrl}
                    className={cn(
                      'inline-flex h-14 w-14 items-center justify-center rounded-full transition-shadow',
                      currentPlaybackUrl
                        ? 'bg-gradient-to-br from-sky-400 to-indigo-500 text-slate-950 shadow-2xl shadow-sky-500/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    )}
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </motion.button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
                      <span>{compareMode === 'original' ? 'Original' : 'Enhanced'} track</span>
                      <span>{previewUrls[activeVariant] ? 'Preview ready' : 'Preview pending'}</span>
                    </div>
                    <div className="mt-4">
                      <input
                        type="range"
                        min={0}
                        max={duration || sourceDuration || 0}
                        value={currentTime}
                        step={0.1}
                        onChange={(event) => handleSeek(Number(event.target.value))}
                        disabled={!currentPlaybackUrl}
                        className="w-full h-2 cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
                      />
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration || sourceDuration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Mastering Presets</p>
                <h2 className="mt-2 text-2xl font-semibold">Choose your vibe</h2>
              </div>
              <div className="grid gap-4">
                {ENHANCEMENT_VARIANTS.map((variant) => (
                  <motion.button
                    key={variant.id}
                    onClick={() => handleEnhanceVariant(variant.id)}
                    disabled={!hasSource || enhancingVariant === variant.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'rounded-[28px] border px-5 py-4 text-left transition-all duration-200',
                      activeVariant === variant.id && previewUrls[variant.id]
                        ? 'border-sky-400 bg-sky-500/10 text-white shadow-sky-500/10'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:bg-slate-900',
                      !hasSource && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sky-400">
                          {variant.icon}
                        </span>
                        <div>
                          <p className="text-base font-semibold">{variant.label}</p>
                          <p className="text-sm text-slate-400">{variant.description}</p>
                        </div>
                      </div>
                      {enhancingVariant === variant.id ? (
                        <span className="text-sm text-slate-300">Processing</span>
                      ) : previewUrls[variant.id] ? (
                        <span className="text-sm text-emerald-300">Ready</span>
                      ) : (
                        <span className="text-sm text-slate-500">Preview</span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Mastering controls</p>
                  <h2 className="mt-2 text-2xl font-semibold">Intensity & EQ</h2>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-300">{intensity}%</span>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Intensity</span>
                    <span>{intensity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={intensity}
                    onChange={(event) => setIntensity(Number(event.target.value))}
                    className="w-full h-2 cursor-pointer appearance-none rounded-full bg-slate-800 accent-sky-400"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>EQ Balance</span>
                    <span>{eqLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={eqLevel}
                    onChange={(event) => setEqLevel(Number(event.target.value))}
                    className="w-full h-2 cursor-pointer appearance-none rounded-full bg-slate-800 accent-indigo-400"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">Export</p>
                  <h2 className="mt-2 text-2xl font-semibold">Mastered download</h2>
                </div>
                <div className="rounded-full bg-slate-950 px-3 py-1 text-xs text-slate-300">
                  {isPremium ? 'Unlocked' : 'Premium only'}
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {(!isPremium || isLocked) ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toast.info('Upgrade to premium to export mastered audio')}
                    className="w-full rounded-[24px] bg-slate-800 px-5 py-4 text-base font-semibold text-slate-400 transition hover:bg-slate-700"
                  >
                    Export (Premium)
                  </motion.button>
                ) : (
                  <Button
                    onClick={handleExport}
                    disabled={!previewUrls[activeVariant] || isExporting}
                    size="lg"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export Master'}
                  </Button>
                )}
                <Button
                  onClick={handleSaveToLibrary}
                  disabled={!previewUrls[activeVariant] || isSaving}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Save to My Library
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed right-4 top-4 z-50 max-w-sm rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200 shadow-2xl shadow-rose-950/20"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
