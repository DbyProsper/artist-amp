import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Music2, Sparkles, Volume2, Zap, Lock, Zap as Lightning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AudioPlayer } from './AudioPlayer';
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

  const currentPlaybackUrl = activePreviewUrl || sourcePreviewUrl;
  const hasSource = Boolean(sourceFile || sourceUrl);
  const hasGeneratedSources = Boolean(generatedAudioUrl || generatedTracks.length > 0);
  const isEnhancing = enhancingVariant !== null;

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Studio
          </button>
          <div>
            <h1 className="text-4xl font-bold mb-2">Audio Enhancement</h1>
            <p className="text-muted-foreground max-w-2xl">
              Upload or select a track, then preview professional mastering styles. Export full-quality audio with a premium subscription.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* LEFT: Original Source & Upload */}
          <div className="space-y-6">
            <Card className="p-6 border-border/70">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Original Source</p>
                <h2 className="text-xl font-bold mt-2">Upload or Select</h2>
              </div>

              {/* Source Selection */}
              <div className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload audio file</label>
                  <Input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileChange}
                    className="h-10"
                  />
                </div>

                {/* Generated Tracks */}
                {hasGeneratedSources && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Or choose from generated</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {generatedAudioUrl && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectGeneratedTrack(generatedAudioUrl, 'Current Generated Track')}
                          className={cn(
                            "w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                            sourceUrl === generatedAudioUrl
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>Current Generated Track</span>
                            <Music2 className="w-4 h-4" />
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
                              "w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                              sourceUrl === track.audioUrl
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{track.title || 'Generated audio'}</span>
                              <Music2 className="w-4 h-4 flex-shrink-0" />
                            </div>
                          </motion.button>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Source Info */}
              {sourcePreviewUrl && (
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">SELECTED:</p>
                  <p className="text-sm font-medium truncate">{sourceLabel}</p>
                </div>
              )}
            </Card>

            {/* Original Audio Player */}
            {sourcePreviewUrl && (
              <Card className="p-6 border-border/70">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4">Listen</p>
                <AudioPlayer
                  src={sourcePreviewUrl}
                  title={sourceLabel}
                  genre="Original"
                  isLoading={false}
                />
              </Card>
            )}
          </div>

          {/* RIGHT: Enhancement Modes & Preview */}
          <div className="space-y-6">
            <Card className="p-6 border-border/70">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">Mastering Styles</p>
                <h2 className="text-xl font-bold mt-2">Choose a preset</h2>
              </div>

              {/* Enhancement Variant Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {ENHANCEMENT_VARIANTS.map((variant) => (
                  <motion.button
                    key={variant.id}
                    onClick={() => handleEnhanceVariant(variant.id)}
                    disabled={!hasSource || (enhancingVariant === variant.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "relative p-4 rounded-xl transition-all duration-200 font-medium text-sm",
                      activeVariant === variant.id && previewUrls[variant.id]
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                        : "bg-muted hover:bg-muted/80 text-foreground",
                      !hasSource && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {enhancingVariant === variant.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, easing: (t) => t }}
                        >
                          <Lightning className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        variant.icon
                      )}
                      <span>{variant.label}</span>
                    </div>
                    {previewUrls[variant.id] && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Variant Description */}
              <AnimatePresence mode="wait">
                {activeVariantConfig && previewUrls[activeVariant] && (
                  <motion.div
                    key={activeVariant}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-lg bg-muted/50 border border-border/70"
                  >
                    <p className="text-sm text-muted-foreground mb-2">
                      {activeVariantConfig.description}
                    </p>
                    {isLocked && (
                      <div className="flex items-center gap-2 mt-3 p-2 rounded bg-primary/10 border border-primary/20">
                        <Lock className="w-4 h-4 text-primary" />
                        <span className="text-xs text-primary font-medium">Premium export only</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Enhanced Preview Player */}
            {previewUrls[activeVariant] && (
              <Card className="p-6 border-border/70 border-primary/30">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-4">Preview</p>
                <AudioPlayer
                  src={previewUrls[activeVariant]}
                  title={activeVariantConfig?.label || 'Enhanced'}
                  genre="Enhanced"
                  isLoading={false}
                />
              </Card>
            )}

            {/* Export Actions */}
            {previewUrls[activeVariant] && (
              <Card className="p-6 border-border/70">
                <div className="space-y-3">
                  {isLocked && !isPremium ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold flex items-center justify-center gap-2"
                      onClick={() => toast.info('Upgrade to premium to export full-quality audio')}
                    >
                      <Lock className="w-4 h-4" />
                      Upgrade to Export Full Quality
                    </motion.button>
                  ) : (
                    <Button
                      onClick={handleExport}
                      disabled={isExporting}
                      size="lg"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exporting...' : 'Export Full Quality'}
                    </Button>
                  )}

                  <Button
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Save to My Library
                  </Button>
                </div>
              </Card>
            )}

            {/* Info Box */}
            {!previewUrls[activeVariant] && hasSource && (
              <Card className="p-4 border-border/70 bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  Click a mastering style to preview enhancement
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 right-4 max-w-sm p-4 rounded-lg bg-destructive/10 border border-destructive/50 text-destructive text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
