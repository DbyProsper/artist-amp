import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Wand2,
  Music,
  Sliders,
  BarChart3,
  Lock,
  Star,
  Zap,
  Sparkles,
  Check,
  AlertCircle,
  X,
  Play,
  Pause,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { generateMusic, generateBeats, generateLyrics, generateCover, generateSmart, generateGeminiAudio } from '@/lib/api';
import { AppLogo } from '@/components/ui/AppLogo';
import { saveGeneratedAudio, saveCompositionAudio } from '@/lib/aiMusicStorage';
import { toast } from 'sonner';

export default function OnlineStudioPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedTab, setSelectedTab] = useState('lyrics');

  // Lyrics Generator State
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsResult, setLyricsResult] = useState('');
  const [lyricsError, setLyricsError] = useState('');

  // Beat/Music Generator State
  const [beatPrompt, setBeatPrompt] = useState('');
  const [beatMode, setBeatMode] = useState<'musicgen' | 'smart' | 'gemini-audio'>('musicgen');
  const [beatLoading, setBeatLoading] = useState(false);
  const [beatUrl, setBeatUrl] = useState('');
  const [beatError, setBeatError] = useState('');
  const [beatImprovedPrompt, setBeatImprovedPrompt] = useState('');
  const [beatPlan, setBeatPlan] = useState('');

  // Composition Generator State
  const [compositionPrompt, setCompositionPrompt] = useState('');
  const [compositionLoading, setCompositionLoading] = useState(false);
  const [compositionLyrics, setCompositionLyrics] = useState('');
  const [compositionBeatUrl, setCompositionBeatUrl] = useState('');
  const [compositionError, setCompositionError] = useState('');
  const [compositionSuccess, setCompositionSuccess] = useState('');

  // Audio Playback State
  const [beatIsPlaying, setBeatIsPlaying] = useState(false);
  const [compositionBeatIsPlaying, setCompositionBeatIsPlaying] = useState(false);
  const beatAudioRef = useRef<HTMLAudioElement>(null);
  const compositionAudioRef = useRef<HTMLAudioElement>(null);

  // Cover Art Generator State
  const [coverPrompt, setCoverPrompt] = useState('');
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverError, setCoverError] = useState('');

  /**
   * Handle lyrics generation
   */
  const handleGenerateLyrics = async () => {
    if (!lyricsPrompt.trim()) {
      setLyricsError('Please enter a prompt');
      return;
    }

    setLyricsLoading(true);
    setLyricsError('');
    setLyricsResult('');

    try {
      const result = await generateLyrics(lyricsPrompt);
      if (!result.success) {
        setLyricsError(result.error || result.message || 'Failed to generate lyrics');
      } else {
        const lyricText =
          result.lyrics ||
          (typeof result.data === 'string' ? result.data : '') ||
          (result.data?.lyrics ?? '') ||
          '';
        setLyricsResult(lyricText || 'No lyrics returned');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate lyrics';
      setLyricsError(message);
      console.error('Lyrics generation error:', error);
    } finally {
      setLyricsLoading(false);
    }
  };

  /**
   * Handle beat/music generation
   */
  const handleGenerateBeat = async () => {
    if (!beatPrompt.trim()) {
      setBeatError('Please enter a prompt');
      return;
    }

    setBeatLoading(true);
    setBeatError('');
    setBeatUrl('');
    setBeatImprovedPrompt('');
    setBeatPlan('');
    setBeatIsPlaying(false);

    try {
      let result;
      if (beatMode === 'musicgen') {
        result = await generateBeats(beatPrompt);
      } else if (beatMode === 'smart') {
        result = await generateSmart(beatPrompt);
      } else if (beatMode === 'gemini-audio') {
        result = await generateGeminiAudio(beatPrompt);
      } else {
        throw new Error('Invalid mode selected');
      }

      if (!result.success) {
        setBeatError(result.error || result.message || 'Failed to generate beat');
      } else {
        // Handle base64 audio data
        const audioBase64 = result.audio_base64;
        if (!audioBase64) {
          setBeatError('Backend did not return audio data');
          console.error('[Beat Gen] No audio_base64 in response:', result);
        } else {
          const audioSrc = `data:audio/wav;base64,${audioBase64}`;
          console.log('[Beat Gen] Generated audio with base64 data');
          setBeatUrl(audioSrc);

          // Store additional data if available
          if (result.improved_prompt) {
            setBeatImprovedPrompt(result.improved_prompt);
          }
          if (result.plan) {
            setBeatPlan(result.plan);
          }

          // Save to library
          if (profile?.id) {
            try {
              const timestamp = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              await saveGeneratedAudio(profile.id, {
                title: `🎵 ${beatMode.toUpperCase()} - ${beatPrompt.slice(0, 40)}... (${timestamp})`,
                audio_url: audioSrc,
                mode: beatMode,
                improved_prompt: result.improved_prompt,
                plan: result.plan,
              });
              toast.success('Beat saved to library!', {
                description: 'Find it in your "AI Generated Music" playlist',
              });
            } catch (err) {
              console.error('[Beat Gen] Failed to save to library:', err);
              toast.error('Beat generated but failed to save to library', {
                description: 'You can still download it below',
              });
            }
          }

          // Auto-play the beat
          setTimeout(() => {
            if (beatAudioRef.current) {
              beatAudioRef.current.play().catch((err) => {
                console.error('[Beat Gen] Auto-play failed:', err);
              });
            }
          }, 200);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate beat';
      setBeatError(message);
      console.error('Beat generation error:', error);
    } finally {
      setBeatLoading(false);
    }
  };

  /**
   * Handle full composition generation (lyrics + beat)
   */
  const handleGenerateComposition = async () => {
    if (!compositionPrompt.trim()) {
      setCompositionError('Please enter a prompt');
      return;
    }

    setCompositionLoading(true);
    setCompositionError('');
    setCompositionSuccess('');
    setCompositionLyrics('');
    setCompositionBeatUrl('');
    setCompositionBeatIsPlaying(false);

    try {
      // Generate lyrics first
      console.log('[Composition] Generating lyrics...');
      const lyricsResult = await generateLyrics(compositionPrompt);
      if (!lyricsResult.success) {
        setCompositionError('Lyrics generation failed: ' + (lyricsResult.error || lyricsResult.message));
        return;
      }

      const lyrics =
        lyricsResult.lyrics ||
        (typeof lyricsResult.data === 'string' ? lyricsResult.data : '') ||
        (lyricsResult.data?.lyrics ?? '') ||
        '';

      if (!lyrics) {
        setCompositionError('No lyrics generated');
        return;
      }

      setCompositionLyrics(lyrics);
      console.log('[Composition] Lyrics generated successfully');

      // Generate beat with same prompt
      console.log('[Composition] Generating beat...');
      const beatResult = await generateBeats(compositionPrompt);
      if (!beatResult.success) {
        setCompositionError('Beat generation failed: ' + (beatResult.error || beatResult.message));
        return;
      }

      const audioUrl = beatResult.audio_url || beatResult.data?.audio_url || beatResult.data?.file || '';
      if (!audioUrl) {
        setCompositionError('No beat audio URL returned');
        return;
      }

      setCompositionBeatUrl(audioUrl);
      console.log('[Composition] Beat generated successfully');
      setCompositionSuccess('✨ Full composition generated! Lyrics and beat ready.');

      // Save composition to library
      if (profile?.id) {
        try {
          console.log('[Composition] Saving to library...');
          await saveCompositionAudio(profile.id, compositionPrompt, lyrics, audioUrl);
          toast.success('Composition saved to library!', {
            description: 'Find it in your "AI Generated Music" playlist',
          });
        } catch (err) {
          console.error('[Composition] Failed to save to library:', err);
          toast.error('Composition generated but failed to save to library', {
            description: 'You can still download it above',
          });
        }
      }

      // Auto-play the beat
      setTimeout(() => {
        if (compositionAudioRef.current) {
          compositionAudioRef.current.play().catch((err) => {
            console.error('[Composition] Auto-play failed:', err);
          });
        }
      }, 300);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate composition';
      setCompositionError(message);
      console.error('Composition generation error:', error);
    } finally {
      setCompositionLoading(false);
    }
  };

  /**
   * Handle cover art generation
   */
  const handleGenerateCover = async () => {
    if (!coverPrompt.trim()) {
      setCoverError('Please enter a prompt');
      return;
    }

    setCoverLoading(true);
    setCoverError('');
    setCoverUrl('');

    try {
      const result = await generateCover(coverPrompt);
      if (!result.success) {
        setCoverError(result.error || result.message || 'Failed to generate cover art');
      } else {
        const url = result.cover_url || result.data?.cover_url || result.data?.url || result.data?.file || '';
        if (!url) {
          setCoverError('Backend did not return cover image URL');
        } else {
          setCoverUrl(url);
          toast.success('Cover art generated!', {
            description: 'Ready to use with your tracks',
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate cover';
      setCoverError(message);
      console.error('Cover generation error:', error);
    } finally {
      setCoverLoading(false);
    }
  };

  /**
   * Quick template handler for lyrics
   */
  const handleLyricsTemplate = (template: string) => {
    setLyricsPrompt(template);
  };

  /**
   * Quick template handler for beats
   */
  const handleBeatTemplate = (genre: string) => {
    setBeatPrompt(`Create a ${genre} beat with engaging rhythm and modern production`);
  };

  if (!user) {
    return (
      <div className="min-h-screen pb-36">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-4 px-4 h-14">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Welcome to Online Studio</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Sign in to access AI-powered music production tools and analytics.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Only allow artists to access this page
  if (!profile?.is_artist) {
    return (
      <div className="min-h-screen pb-36">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-4 px-4 h-14">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Artist Only Feature</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Online Studio is available for artists only. Please upgrade your account to access these
            AI-powered music production tools.
          </p>
          <Button onClick={() => navigate('/settings/edit-profile')} size="lg">
            Upgrade to Artist
          </Button>
        </div>
      </div>
    );
  }

  const PricingTier = ({ name, icon: Icon, features, isFree = false }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className={`p-6 rounded-xl border transition-all ${
        isFree
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/50 bg-muted/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold">{name}</h3>
        {isFree && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Current</span>}
      </div>
      <div className="space-y-2">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{feature}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-4 px-4 h-16">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AppLogo size="lg" />
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Music Production</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-8 bg-gradient-to-b from-primary/10 to-transparent">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-2xl">Welcome back, {profile?.name || 'Artist'}!</h2>
            <p className="text-muted-foreground text-sm">Your AI-powered music studio awaits</p>
          </div>
        </div>
      </section>

      {/* Main Tabs */}
      <Tabs defaultValue="lyrics" className="w-full" onValueChange={setSelectedTab}>
        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4">
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent rounded-none border-b-0">
            <TabsTrigger value="lyrics" className="gap-2">
              <Wand2 className="w-4 h-4" />
              Lyrics
            </TabsTrigger>
            <TabsTrigger value="beats" className="gap-2">
              <Music className="w-4 h-4" />
              Beats
            </TabsTrigger>
            <TabsTrigger value="cover" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Cover Art
            </TabsTrigger>
            <TabsTrigger value="composition" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Composition
            </TabsTrigger>
            <TabsTrigger value="mixing" className="gap-2">
              <Sliders className="w-4 h-4" />
              Mixing
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Lyrics Generator Tab */}
        <TabsContent value="lyrics" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  AI Lyrics Generator
                </CardTitle>
                <CardDescription>
                  Generate creative, unique lyrics powered by advanced AI technology
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {lyricsError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{lyricsError}</p>
                    </div>
                    <button
                      onClick={() => setLyricsError('')}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Generate lyrics by describing your idea:</p>
                  <textarea
                    placeholder="e.g., A love song about summer romance, upbeat pop style..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none"
                    rows={4}
                    value={lyricsPrompt}
                    onChange={(e) => setLyricsPrompt(e.target.value)}
                    disabled={lyricsLoading}
                  />
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={handleGenerateLyrics}
                    disabled={lyricsLoading}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {lyricsLoading ? 'Generating...' : 'Generate Lyrics'}
                  </Button>
                </div>

                {/* Quick Templates */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Love Song', template: 'A romantic love song about deep connection and commitment' },
                    { label: 'Hip Hop', template: 'A hip-hop track with clever wordplay and strong messaging' },
                    { label: 'Rap Battle', template: 'High-energy rap battle lyrics with competitive spirit' },
                    { label: 'Rock Song', template: 'A powerful rock anthem with emotional depth and energy' },
                  ].map((item) => (
                    <motion.button
                      key={item.label}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleLyricsTemplate(item.template)}
                      className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                      disabled={lyricsLoading}
                    >
                      <Sparkles className="w-4 h-4 mb-2 group-hover:text-primary transition-colors" />
                      {item.label}
                    </motion.button>
                  ))}
                </div>

                {/* Display Generated Lyrics */}
                {lyricsResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Generated Lyrics</h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lyricsResult);
                        }}
                        className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto bg-background/50 p-3 rounded border">
                      {lyricsResult.split('\n').map((line, index) => {
                        const trimmedLine = line.trim();
                        if (trimmedLine.toLowerCase().includes('verse') || trimmedLine.toLowerCase().includes('hook') || trimmedLine.toLowerCase().includes('chorus')) {
                          return (
                            <div key={index} className="font-semibold text-primary mb-2 mt-4 first:mt-0">
                              {trimmedLine}
                            </div>
                          );
                        }
                        return trimmedLine ? (
                          <div key={index} className="mb-1">
                            {trimmedLine}
                          </div>
                        ) : (
                          <br key={index} />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Beat Production Tab */}
        <TabsContent value="beats" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Beat Production
                </CardTitle>
                <CardDescription>
                  Create original, royalty-free beats with AI-powered music generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {beatError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{beatError}</p>
                    </div>
                    <button
                      onClick={() => setBeatError('')}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe the music you want:</p>
                  
                  {/* Mode Selector */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">AI Mode:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setBeatMode('musicgen')}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          beatMode === 'musicgen'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50'
                        }`}
                        disabled={beatLoading}
                      >
                        🎧 MusicGen
                      </button>
                      <button
                        onClick={() => setBeatMode('smart')}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          beatMode === 'smart'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50'
                        }`}
                        disabled={beatLoading}
                      >
                        🧠 Smart AI
                      </button>
                      <button
                        onClick={() => setBeatMode('gemini-audio')}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          beatMode === 'gemini-audio'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background hover:border-primary/50'
                        }`}
                        disabled={beatLoading}
                      >
                        🎼 Gemini AI
                      </button>
                    </div>
                  </div>

                  <textarea
                    placeholder="e.g., An upbeat pop song with catchy melody and modern production..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none"
                    rows={4}
                    value={beatPrompt}
                    onChange={(e) => setBeatPrompt(e.target.value)}
                    disabled={beatLoading}
                  />
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={handleGenerateBeat}
                    disabled={beatLoading}
                  >
                    <Music className="w-4 h-4 mr-2" />
                    {beatLoading ? 'Generating...' : `Generate with ${beatMode === 'musicgen' ? 'MusicGen' : beatMode === 'smart' ? 'Smart AI' : 'Gemini AI'}`}
                  </Button>
                </div>

                {/* Quick Genre Templates */}
                <div className="grid grid-cols-2 gap-2">
                  {['Hip Hop', 'Pop', 'Electronic', 'R&B', 'Reggae', 'Rock'].map((genre) => (
                    <motion.button
                      key={genre}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleBeatTemplate(genre)}
                      className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                      disabled={beatLoading}
                    >
                      <Music className="w-4 h-4 mb-2 group-hover:text-primary transition-colors" />
                      {genre}
                    </motion.button>
                  ))}
                </div>

                {/* Display Generated Beat with Player */}
                {beatUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">🎵 Generated Music ({beatMode.toUpperCase()})</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateBeat()}
                        disabled={beatLoading}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>

                    {/* Display improved prompt if available */}
                    {beatImprovedPrompt && (
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">IMPROVED PROMPT:</p>
                        <p className="text-sm">{beatImprovedPrompt}</p>
                      </div>
                    )}

                    {/* Display plan if available */}
                    {beatPlan && (
                      <div className="p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">GENERATION PLAN:</p>
                        <p className="text-sm whitespace-pre-wrap">{beatPlan}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <audio
                        ref={beatAudioRef}
                        className="w-full"
                        src={beatUrl}
                        preload="metadata"
                        onPlay={() => setBeatIsPlaying(true)}
                        onPause={() => setBeatIsPlaying(false)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (beatAudioRef.current) {
                              if (beatIsPlaying) {
                                beatAudioRef.current.pause();
                              } else {
                                beatAudioRef.current.play();
                              }
                            }
                          }}
                          variant="outline"
                        >
                          {beatIsPlaying ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Play
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              // Convert base64 to blob for download
                              const response = await fetch(beatUrl);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `ai_music_${beatMode}_${Date.now()}.wav`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Download failed:', error);
                              setBeatError('Failed to download file');
                            }
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cover Art Generator Tab */}
        <TabsContent value="cover" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Cover Art Generator
                </CardTitle>
                <CardDescription>
                  Generate stunning album cover art with AI-powered design
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {coverError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{coverError}</p>
                    </div>
                    <button
                      onClick={() => setCoverError('')}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe your cover art concept:</p>
                  <textarea
                    placeholder="e.g., A futuristic cityscape with neon lights, cyberpunk style..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    rows={4}
                    value={coverPrompt}
                    onChange={(e) => setCoverPrompt(e.target.value)}
                    disabled={coverLoading}
                  />
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={handleGenerateCover}
                    disabled={coverLoading || !coverPrompt.trim()}
                  >
                    {coverLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Cover Art
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Style Templates */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Pop', template: 'Vibrant pop album cover with bright colors and modern typography' },
                    { label: 'Hip Hop', template: 'Urban hip-hop cover with graffiti elements and bold text' },
                    { label: 'Rock', template: 'Edgy rock album art with dark colors and dramatic lighting' },
                    { label: 'Electronic', template: 'Futuristic electronic cover with neon lights and digital effects' },
                  ].map((item) => (
                    <motion.button
                      key={item.label}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCoverPrompt(item.template)}
                      className="p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                      disabled={coverLoading}
                    >
                      <Sparkles className="w-4 h-4 mb-2 group-hover:text-primary transition-colors" />
                      {item.label}
                    </motion.button>
                  ))}
                </div>

                {/* Display Generated Cover Art */}
                {coverUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
                  >
                    <h3 className="font-semibold text-sm">Generated Cover Art</h3>
                    <div className="flex justify-center">
                      <img
                        src={coverUrl}
                        alt="Generated cover art"
                        className="max-w-full h-auto rounded-lg shadow-lg"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const response = await fetch(coverUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `cover_${Date.now()}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          } catch (error) {
                            console.error('Download failed:', error);
                            setCoverError('Failed to download image');
                          }
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(coverUrl);
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Full Song Composition Tab */}
        <TabsContent value="composition" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Full Song Composition
                </CardTitle>
                <CardDescription>
                  Generate complete song compositions with lyrics, melody, and instrumentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {compositionError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{compositionError}</p>
                    </div>
                    <button
                      onClick={() => setCompositionError('')}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe your song concept:</p>
                  <textarea
                    placeholder="e.g., An emotional ballad about overcoming challenges, indie folk style..."
                    className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none"
                    rows={4}
                    value={compositionPrompt}
                    onChange={(e) => setCompositionPrompt(e.target.value)}
                    disabled={compositionLoading}
                  />
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={handleGenerateComposition}
                    disabled={compositionLoading || !compositionPrompt.trim()}
                  >
                    {compositionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Full Composition
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Your composition will include:</p>
                  <ul className="space-y-1">
                    {[
                      'Verse, Chorus & Bridge structure',
                      'AI-generated lyrics',
                      'Melody composition',
                      'Instrumentation arrangement',
                      'Production suggestions',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Display Generated Composition */}
                {compositionSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-600">Success</p>
                      <p className="text-sm text-green-600/80">{compositionSuccess}</p>
                    </div>
                  </div>
                )}

                {compositionLyrics && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">✍️ Generated Lyrics</h3>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(compositionLyrics);
                        }}
                        className="text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto bg-background/50 p-3 rounded border">
                      {compositionLyrics.split('\n').map((line, index) => {
                        const trimmedLine = line.trim();
                        if (
                          trimmedLine.toLowerCase().includes('verse') ||
                          trimmedLine.toLowerCase().includes('hook') ||
                          trimmedLine.toLowerCase().includes('chorus')
                        ) {
                          return (
                            <div key={index} className="font-semibold text-primary mb-2 mt-4 first:mt-0">
                              {trimmedLine}
                            </div>
                          );
                        }
                        return trimmedLine ? (
                          <div key={index} className="mb-1">
                            {trimmedLine}
                          </div>
                        ) : (
                          <br key={index} />
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {compositionBeatUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">🎵 Composition Beat (30s loop)</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateComposition()}
                        disabled={compositionLoading}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <audio
                        ref={compositionAudioRef}
                        className="w-full"
                        src={compositionBeatUrl}
                        loop
                        preload="metadata"
                        onPlay={() => setCompositionBeatIsPlaying(true)}
                        onPause={() => setCompositionBeatIsPlaying(false)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (compositionAudioRef.current) {
                              if (compositionBeatIsPlaying) {
                                compositionAudioRef.current.pause();
                              } else {
                                compositionAudioRef.current.play();
                              }
                            }
                          }}
                          variant="outline"
                        >
                          {compositionBeatIsPlaying ? (
                            <>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Play
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch(compositionBeatUrl);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `composition_beat_${Date.now()}.mp3`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Download failed:', error);
                              setCompositionError('Failed to download beat');
                            }
                          }}
                        >
                          Download Beat
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mixing & Mastering Tab */}
        <TabsContent value="mixing" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  Mixing & Mastering
                </CardTitle>
                <CardDescription>
                  Professional AI-powered mixing and mastering services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing Tiers */}
                <div>
                  <h3 className="font-display font-bold mb-4">Choose Your Plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PricingTier
                      name="Free"
                      icon={Zap}
                      isFree={true}
                      features={[
                        'Basic EQ & compression',
                        '2 tracks per month',
                        'Standard mastering',
                        'MP3 export',
                      ]}
                    />
                    <PricingTier
                      name="Pro"
                      icon={Star}
                      features={[
                        'Advanced mixing tools',
                        'Unlimited tracks',
                        'Professional mastering',
                        'WAV export',
                        'Stem export',
                        'Priority support',
                      ]}
                    />
                    <PricingTier
                      name="Premium"
                      icon={Sparkles}
                      features={[
                        'Full mixing studio suite',
                        'Unlimited tracks',
                        'Mastering + Distribution',
                        'All formats (WAV, FLAC, etc)',
                        'Stem export + Acapellas',
                        '24/7 priority support',
                        'Royalty insights',
                      ]}
                    />
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  <Sliders className="w-4 h-4 mr-2" />
                  Upload Track for Mixing
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  AI Performance Analytics
                </CardTitle>
                <CardDescription>
                  Deep insights into listener behavior, engagement patterns, and revenue trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Analytics Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-primary/10 border border-primary/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Total Plays</p>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-primary mt-2">Share your tracks to get started</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-accent/10 border border-accent/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Engagement Rate</p>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-xs text-accent mt-2">Likes, comments & shares</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Revenue</p>
                    <p className="text-2xl font-bold">$0</p>
                    <p className="text-xs text-green-500 mt-2">From streams & tips</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  >
                    <p className="text-sm text-muted-foreground mb-1">Audience Growth</p>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-xs text-blue-500 mt-2">Monthly followers</p>
                  </motion.div>
                </div>

                {/* Analytics Features */}
                <div className="space-y-3">
                  <p className="font-medium">AI Insights Include:</p>
                  <ul className="space-y-2">
                    {[
                      'Listener demographics & location analysis',
                      'Engagement pattern detection',
                      'Optimal posting times & days',
                      'Genre & mood trend analysis',
                      'Revenue predictions',
                      'Audience preference insights',
                      'Competitor benchmarking',
                      'Growth recommendations',
                    ].map((insight, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <Button className="w-full" size="lg" variant="outline">
                  View Detailed Analytics Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
