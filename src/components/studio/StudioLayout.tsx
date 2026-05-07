import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Music, Mic2, AudioWaveform, Image, Shirt, MessageCircle, History, ArrowLeft, Megaphone, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BPMSlider } from './BPMSlider';
import { PromptBox } from './PromptBox';
import { PresetButtons } from './PresetButtons';
import { MoodPresets } from './MoodPresets';
import { LanguagePresets } from './LanguagePresets';
import { AudioPlayer } from './AudioPlayer';
import { GenerationHistory } from './GenerationHistory';
import { StudioFeature } from './StudioEntryScreen';

interface StudioLayoutProps {
  feature: StudioFeature;
  onFeatureChange: (feature: StudioFeature) => void;
  onBack: () => void;
  onChatOpen?: () => void;

  // Generation state
  prompt: string;
  onPromptChange: (prompt: string) => void;
  bpm: number;
  onBPMChange: (bpm: number) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  selectedMood: string;
  onMoodChange: (mood: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;

  // Generation
  onGenerate: () => void;
  isGenerating: boolean;
  error?: string;
  buttonText?: string;
  promptPlaceholder?: string;
  generatedTitle?: string;
  onTitleChange?: (title: string) => void;

  // Output
  audioUrl?: string;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  isSaving?: boolean;

  // History
  history?: Array<{ id: string; prompt: string; audioUrl?: string; imageUrl?: string; lyrics?: string; feature: string; createdAt: Date; metadata?: any }>;
  onHistorySelect?: (item: any) => void;
  onHistoryDelete?: (id: string) => void;
}

const featureIcons: Record<StudioFeature, ReactNode> = {
  beat: <Music className="w-4 h-4" />,
  lyrics: <Mic2 className="w-4 h-4" />,
  song: <AudioWaveform className="w-4 h-4" />,
  cover: <Image className="w-4 h-4" />,
  poster: <Megaphone className="w-4 h-4" />,
  merch: <Shirt className="w-4 h-4" />,
  chat: <MessageCircle className="w-4 h-4" />,
};

const featureLabels: Record<StudioFeature, string> = {
  beat: 'Beat',
  lyrics: 'Lyrics',
  song: 'Full Song',
  cover: 'Cover Art',
  poster: 'Posters',
  merch: 'Merch',
  chat: 'Chat',
};

export function StudioLayout({
  feature,
  onFeatureChange,
  onBack,
  onChatOpen,
  prompt,
  onPromptChange,
  bpm,
  onBPMChange,
  selectedGenre,
  onGenreChange,
  selectedMood,
  onMoodChange,
  selectedLanguage,
  onLanguageChange,
  onGenerate,
  isGenerating,
  error,
  buttonText,
  promptPlaceholder,
  generatedTitle,
  onTitleChange,
  audioUrl,
  onPlayToggle,
  onDownload,
  onSave,
  isSaving,
  history = [],
  onHistorySelect,
  onHistoryDelete,
}: StudioLayoutProps) {
  const features: StudioFeature[] = ['beat', 'lyrics', 'song', 'cover', 'poster', 'merch'];

  const isAudioFeature = feature === 'beat' || feature === 'song';
  const shouldShowBPM = feature !== 'lyrics' && (feature === 'beat' || feature === 'song' || feature === 'cover' || feature === 'poster' || feature === 'merch');

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
            Back
          </Button>
          <h1 className="text-xl font-bold">{featureLabels[feature]}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info('Upgrade to Premium coming soon!')}
              className="gap-2 text-primary"
            >
              <Zap className="w-4 h-4" />
              Upgrade
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onChatOpen}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Controls */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 border-r border-border/40 bg-muted/20 overflow-y-auto p-4 space-y-6"
        >
          {/* Feature Switcher */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tools
            </p>
            <div className="grid grid-cols-2 gap-2">
              {features.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={feature === f ? 'default' : 'outline'}
                  onClick={() => onFeatureChange(f)}
                  className="gap-2 h-auto py-2 px-2"
                >
                  {featureIcons[f]}
                  <span className="text-xs">{featureLabels[f]}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* BPM Control */}
          {shouldShowBPM && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tempo
              </p>
              <BPMSlider
                genre={selectedGenre}
                bpm={bpm}
                onBPMChange={onBPMChange}
                disabled={isGenerating}
              />
            </div>
          )}

          {/* Mood Selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mood
            </p>
            <MoodPresets
              selected={selectedMood}
              onSelect={onMoodChange}
              disabled={isGenerating}
            />
          </div>

          {/* Language Selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Language
            </p>
            <LanguagePresets
              selected={selectedLanguage}
              onSelect={onLanguageChange}
              disabled={isGenerating}
            />
          </div>

          {/* Additional Tools */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Tools
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => toast.info('Provide your own lyrics coming soon!')}
              >
                <Music className="w-4 h-4" />
                Provide Lyrics
              </Button>
              {(feature === 'beat' || feature === 'song') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => toast.info('Record feature coming soon!')}
                >
                  <Mic2 className="w-4 h-4" />
                  Record
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => toast.info('Upload feature coming soon!')}
              >
                <AudioWaveform className="w-4 h-4" />
                Upload Track
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* History */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <History className="w-3 h-3" />
              Recent
            </div>
            {history.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {history.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onHistorySelect?.(item)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <p className="text-xs font-medium line-clamp-2 group-hover:text-primary">
                      {item.prompt}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.createdAt.toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No history yet</p>
            )}
          </div>
        </motion.div>

        {/* CENTER PANEL - Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-y-auto p-8 flex flex-col"
        >
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {/* Presets */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Presets
              </p>
              <PresetButtons
                feature={feature}
                onPresetSelect={(preset) => {
                  onGenreChange(preset.genre);
                  onMoodChange(preset.mood);
                  if (shouldShowBPM) {
                    onBPMChange(preset.bpm);
                  }
                  if (preset.prompt) {
                    onPromptChange(preset.prompt);
                  }
                }}
                disabled={isGenerating}
              />
            </div>

            {/* Prompt Box */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Describe Your {featureLabels[feature]}
              </p>
              <PromptBox
                value={prompt}
                onChange={onPromptChange}
                onSubmit={onGenerate}
                loading={isGenerating}
                disabled={isGenerating}
                buttonText={buttonText}
                placeholder={promptPlaceholder}
              />
            </div>

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-destructive/10 border border-destructive/50 rounded-2xl"
              >
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </motion.div>
            )}

            {/* Output */}
            {audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preview
                </p>
                {onTitleChange && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Track Title
                    </label>
                    <input
                      value={generatedTitle || prompt}
                      onChange={(e) => onTitleChange(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter a title for your generated track"
                    />
                  </div>
                )}
                <AudioPlayer
                  src={audioUrl}
                  title={generatedTitle || prompt || 'Generated Track'}
                  genre={selectedGenre}
                  bpm={bpm}
                  onDownload={onDownload}
                />
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? 'Saving...' : '💾 Save to Library'}
                  </Button>
                  <Button
                    onClick={onDownload}
                    variant="outline"
                    className="flex-1"
                  >
                    ⬇️ Download
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  💡 Save to Library if you want to play this outside the studio
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* RIGHT PANEL - Info & History */}
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 border-l border-border/40 bg-muted/20 overflow-y-auto p-4 space-y-6"
        >
          {/* Current Settings */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Current Settings
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Genre</span>
                <span className="font-medium capitalize">{selectedGenre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">BPM</span>
                <span className="font-medium">{bpm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mood</span>
                <span className="font-medium capitalize">{selectedMood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium capitalize">{selectedLanguage}</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/40" />

          {/* Tips */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              💡 Tips
            </p>
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li>• Be specific in your prompt</li>
              <li>• Mention mood and instrumentation</li>
              <li>• Try different presets</li>
              <li>• Use chat for inspiration</li>
            </ul>
          </div>

          <div className="h-px bg-border/40" />

          {/* Generation History */}
          <GenerationHistory
            history={history || []}
            onSelect={onHistorySelect || (() => {})}
            onDelete={onHistoryDelete || (() => {})}
            isLoading={false}
          />
        </motion.div>
      </div>
    </div>
  );
}
