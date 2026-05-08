import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Music2, Sparkles, Volume2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AudioPlayer } from './AudioPlayer';
import { enhanceAudio, exportEnhancedAudio } from '@/lib/api';
import { downloadAudio } from '@/lib/audioUtils';
import { saveGeneratedAudio } from '@/lib/aiMusicStorage';
import { toast } from 'sonner';

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
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: 'bass',
    label: 'Bass Boost',
    description: 'Deeper low end with extra punch.',
    backendType: 'compress',
    icon: <Music2 className="w-4 h-4" />,
  },
  {
    id: 'vocal',
    label: 'Vocal',
    description: 'Clearer vocals with presence and warmth.',
    backendType: 'normalize',
    icon: <Volume2 className="w-4 h-4" />,
  },
  {
    id: 'loud',
    label: 'Loud',
    description: 'Increased loudness and energy for playback.',
    backendType: 'reverb',
    icon: <Zap className="w-4 h-4" />,
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
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewReady, setPreviewReady] = useState(false);

  const isPremium = userTier === 'premium';
  const activeVariantConfig = ENHANCEMENT_VARIANTS.find((item) => item.id === activeVariant);
  const activePreviewUrl = previewUrls[activeVariant];
  const activeMetadata = previewMetadata[activeVariant] || {};
  const isLocked = activeMetadata.export_locked ?? false;

  useEffect(() => {
    setSourceUrl(generatedAudioUrl || '');
  }, [generatedAudioUrl]);

  useEffect(() => {
    if (!sourceFile && !sourceUrl) {
      setSourceLabel('Upload audio file');
    }
  }, [sourceFile, sourceUrl]);

  useEffect(() => {
    setPreviewReady(!!activePreviewUrl);
  }, [activePreviewUrl]);

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
    setActiveVariant(variant);

    if (!hasSource) {
      setError('Upload audio or choose a generated track first.');
      return;
    }

    if (previewUrls[variant]) {
      return;
    }

    setIsEnhancing(true);
    try {
      const sourceFileObject = await resolveSourceFile();
      const result = await enhanceAudio(sourceFileObject, activeVariantConfig?.backendType || 'enhance');

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
      toast.success('Audio preview ready!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enhance audio';
      setError(message);
      console.error('[AudioEnhancement] Enhance error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleVariantChange = async (variant: EnhancementVariant) => {
    setActiveVariant(variant);
    if (!previewUrls[variant]) {
      await handleEnhanceVariant(variant);
    }
  };

  const handleExport = async () => {
    if (!currentPlaybackUrl) {
      setError('Nothing to export yet. Generate a preview first.');
      return;
    }

    if (isLocked && !isPremium) {
      setError('Premium membership required to export full-quality audio.');
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

      toast.success('Export started!');
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

  const hasGeneratedSources = Boolean(generatedAudioUrl || generatedTracks.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Studio
            </button>
            <h1 className="mt-3 text-3xl font-bold">Audio Enhancement</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Upload your own audio or choose a generated track, then preview DistroKid-style mastering modes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => handleVariantChange(activeVariant)} disabled={!hasSource || isEnhancing}>
              {previewUrls[activeVariant] ? 'Refresh variant' : 'Enhance current variant'}
            </Button>
            <Button onClick={handleExport} disabled={!previewUrls[activeVariant] || (isLocked && !isPremium) || isExporting}>
              {isLocked ? (isPremium ? 'Export Premium' : 'Unlock Premium') : 'Export'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="space-y-6 p-6">
            <div className="rounded-3xl border border-border/70 bg-muted p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Original Source</p>
                  <h2 className="text-xl font-semibold">Preview Player</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Download className="w-4 h-4" /> {sourceLabel || 'No source selected'}
                </span>
              </div>
              <div className="mt-4">
                {currentPlaybackUrl ? (
                  <AudioPlayer
                    src={currentPlaybackUrl}
                    title={previewUrls[activeVariant] ? `${activeVariantConfig?.label} Preview` : 'Original Source'}
                    genre={previewUrls[activeVariant] ? 'Enhanced' : 'Original'}
                    bpm={120}
                    onDownload={() => downloadAudio(currentPlaybackUrl, `${activeVariantConfig?.label || 'audio-preview'}`, 'mp3')}
                    isLoading={isEnhancing}
                  />
                ) : (
                  <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-border/70 bg-background/80 text-center text-sm text-muted-foreground">
                    Select an audio source and choose a variant to listen to enhancements.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/70 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Source</p>
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">Upload audio</label>
                  <Input type="file" accept="audio/*" onChange={handleFileChange} />
                  {hasGeneratedSources && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Generated tracks</p>
                      {generatedAudioUrl && (
                        <Button
                          variant={sourceUrl === generatedAudioUrl ? 'secondary' : 'outline'}
                          onClick={() => handleSelectGeneratedTrack(generatedAudioUrl, 'Current Generated Track')}
                          className="w-full"
                        >
                          Use current generated track
                        </Button>
                      )}
                      {generatedTracks.slice(0, 3).map((track) => (
                        track.audioUrl ? (
                          <Button
                            key={track.id}
                            variant={sourceUrl === track.audioUrl ? 'secondary' : 'outline'}
                            onClick={() => handleSelectGeneratedTrack(track.audioUrl!, track.title)}
                            className="w-full justify-between"
                          >
                            <span>{track.title || 'Generated audio'}</span>
                            <span className="text-xs text-muted-foreground">Select</span>
                          </Button>
                        ) : null
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border-border/70 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Details</p>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Enhancement mode</span>
                    <span className="font-medium capitalize">{activeVariant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preview cached</span>
                    <span className="font-medium">{previewReady ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Export access</span>
                    <span className="font-medium">{isLocked ? 'Premium only' : 'Available'}</span>
                  </div>
                  <div className="rounded-2xl bg-background p-3 text-xs text-muted-foreground">
                    {isLocked
                      ? 'This enhancement variant requires premium export access for high-quality downloads.'
                      : 'Preview downloads are available for any active variant.'}
                  </div>
                </div>
              </Card>
            </div>
          </Card>

          <Card className="space-y-6 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Enhancement modes</p>
              <h2 className="text-xl font-semibold mt-2">Choose a mastering style</h2>
            </div>

            <Tabs value={activeVariant} onValueChange={handleVariantChange} className="space-y-4">
              <TabsList>
                {ENHANCEMENT_VARIANTS.map((variant) => (
                  <TabsTrigger key={variant.id} value={variant.id} className="capitalize">
                    {variant.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {activeVariantConfig && (
                <div className="rounded-3xl border border-border/70 bg-muted p-5">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {activeVariantConfig.icon}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{activeVariantConfig.label}</p>
                      <p>{activeVariantConfig.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-3xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-3">
                <Button
                  onClick={() => handleEnhanceVariant(activeVariant)}
                  disabled={!hasSource || isEnhancing}
                >
                  {previewUrls[activeVariant]
                    ? 'Regenerate preview'
                    : hasSource
                    ? 'Enhance now'
                    : 'Upload or select source to begin'}
                </Button>

                {previewUrls[activeVariant] && (
                  <div className="grid gap-2">
                    <Button
                      onClick={handleExport}
                      disabled={isExporting || (isLocked && !isPremium)}
                    >
                      {isLocked ? (isPremium ? 'Export Full Quality' : 'Upgrade for Full Quality') : 'Export Full Quality'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSaveToLibrary}
                      disabled={isSaving}
                    >
                      Save Enhanced Track to Library
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
