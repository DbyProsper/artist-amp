import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Copy, Download, Save } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { BPMSlider } from './BPMSlider';
import { MoodPresets } from './MoodPresets';
import { LanguagePresets } from './LanguagePresets';
import { AlertCircle } from 'lucide-react';

export interface StudioViewData {
  audioUrl: string;
  title: string;
  genre: string;
  bpm: number;
  mood: string;
  language: string;
  lyrics?: string;
  coverUrl?: string;
  frontMerchImage?: string;
  backMerchImage?: string;
}

interface StudioViewProps {
  data: StudioViewData;
  onBPMChange?: (bpm: number) => void;
  onMoodChange?: (mood: string) => void;
  onLanguageChange?: (language: string) => void;
  onRegenerate?: () => void;
  onBack?: () => void;
  onDownload?: () => void;
  isSaving?: boolean;
  isRegenerating?: boolean;
  error?: string;
}

export function StudioView({
  data,
  onBPMChange,
  onMoodChange,
  onLanguageChange,
  onRegenerate,
  onBack,
  onDownload,
  isSaving = false,
  isRegenerating = false,
  error,
}: StudioViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen pb-20"
    >
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/40 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Back to creation mode"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <h1 className="text-xl font-bold">Studio Mode</h1>

          <div className="flex items-center gap-2">
            <Button
              onClick={onRegenerate}
              disabled={isRegenerating}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player - Left/Top */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Audio Player */}
            <AudioPlayer
              src={data.audioUrl}
              title={data.title}
              genre={data.genre}
              bpm={data.bpm}
              onDownload={onDownload}
              isLoading={isRegenerating}
            />

            {/* Content Tabs */}
            <Tabs defaultValue="lyrics" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
                <TabsTrigger value="cover">Cover Art</TabsTrigger>
                <TabsTrigger value="merch">Merch</TabsTrigger>
              </TabsList>

              {/* Lyrics Tab */}
              <TabsContent value="lyrics" className="space-y-4">
                <Card className="border border-border/40 bg-background/40">
                  <CardHeader>
                    <CardTitle className="text-base">Generated Lyrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.lyrics ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap text-muted-foreground max-h-96 overflow-y-auto">
                          {data.lyrics}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(data.lyrics || '');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          Copy Lyrics
                        </Button>
                      </motion.div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No lyrics available for this track
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cover Art Tab */}
              <TabsContent value="cover" className="space-y-4">
                <Card className="border border-border/40 bg-background/40">
                  <CardHeader>
                    <CardTitle className="text-base">Album Cover</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.coverUrl ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        <img
                          src={data.coverUrl}
                          alt="Album Cover"
                          className="w-full aspect-square object-cover rounded-lg border border-border"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 w-full"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = data.coverUrl || '';
                            a.download = `${data.title}_cover.jpg`;
                            a.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Download Cover
                        </Button>
                      </motion.div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No cover art available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Merch Tab */}
              <TabsContent value="merch" className="space-y-4">
                <Card className="border border-border/40 bg-background/40">
                  <CardHeader>
                    <CardTitle className="text-base">Merchandise Designs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.frontMerchImage || data.backMerchImage ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-2 gap-4"
                      >
                        {data.frontMerchImage && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Front Design</p>
                              <img
                                src={data.frontMerchImage}
                                alt="Front Design"
                                className="w-full aspect-square object-cover rounded-lg border border-border"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 w-full"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = data.frontMerchImage || '';
                                a.download = `${data.title}_merch_front.jpg`;
                                a.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                              Download Front
                            </Button>
                          </div>
                        )}
                        {data.backMerchImage && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Back Design</p>
                              <img
                                src={data.backMerchImage}
                                alt="Back Design"
                                className="w-full aspect-square object-cover rounded-lg border border-border"
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 w-full"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = data.backMerchImage || '';
                                a.download = `${data.title}_merch_back.jpg`;
                                a.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                              Download Back
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No merch designs available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Control Sidebar - Right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* BPM Control */}
            {onBPMChange && (
              <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">BPM</CardTitle>
                </CardHeader>
                <CardContent>
                  <BPMSlider
                    genre={data.genre}
                    bpm={data.bpm}
                    onBPMChange={onBPMChange}
                    disabled={isRegenerating}
                  />
                </CardContent>
              </Card>
            )}

            {/* Mood Control */}
            {onMoodChange && (
              <Card className="border border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Mood</CardTitle>
                </CardHeader>
                <CardContent>
                  <MoodPresets
                    selected={data.mood}
                    onSelect={onMoodChange}
                    disabled={isRegenerating}
                  />
                </CardContent>
              </Card>
            )}

            {/* Language Control */}
            {onLanguageChange && (
              <Card className="border border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Language</CardTitle>
                </CardHeader>
                <CardContent>
                  <LanguagePresets
                    selected={data.language}
                    onSelect={onLanguageChange}
                    disabled={isRegenerating}
                  />
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <Button
              size="lg"
              className="w-full gap-2 rounded-2xl font-semibold"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save to Library
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
