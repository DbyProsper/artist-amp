import { useState, useRef, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { generateMusic, generateBeats, generateLyrics, generateCover, generateSmart, generateGeminiAudio, generateSong, generateMerch, generateMusicFromAudio, generateImageFromUpload, enhanceAudio } from '@/lib/api';
import { AppLogo } from '@/components/ui/AppLogo';
import { saveGeneratedAudio, saveCompositionAudio, saveGeneratedLyrics } from '@/lib/aiMusicStorage';
import { FileUpload } from '@/components/ui/FileUpload';
import { ImageDisplay } from '@/components/ui/ImageDisplay';
import { AIChat } from '@/components/ui/AIChat';
import { SongService, Song } from '@/lib/songService';
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
  const [lyricsModel, setLyricsModel] = useState('gemini');

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

  // AI Music Generator State
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicError, setMusicError] = useState('');
  const [musicIsPlaying, setMusicIsPlaying] = useState(false);
  const musicAudioRef = useRef<HTMLAudioElement>(null);

  // Merch Generator State
  const [merchPrompt, setMerchPrompt] = useState('');
  const [merchProductType, setMerchProductType] = useState('T-shirt');
  const [merchLoading, setMerchLoading] = useState(false);
  const [merchUrl, setMerchUrl] = useState('');
  const [merchError, setMerchError] = useState('');

  // Saved Items State
  const [savedItems, setSavedItems] = useState<Array<{
    id: string;
    prompt: string;
    audioUrl?: string;
    imageUrl?: string;
    productType?: string;
    createdAt: string;
    type: 'audio' | 'merch';
  }>>([]);

  // File Upload State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  // Music Generation from Audio State
  const [musicFromAudioPrompt, setMusicFromAudioPrompt] = useState('');
  const [musicFromAudioLoading, setMusicFromAudioLoading] = useState(false);
  const [musicFromAudioError, setMusicFromAudioError] = useState('');
  const [musicFromAudioUrl, setMusicFromAudioUrl] = useState('');
  const [musicFromAudioModel, setMusicFromAudioModel] = useState('gemini');
  const musicFromAudioRef = useRef<HTMLAudioElement>(null);

  // Image Generation from Upload State
  const [imageFromUploadPrompt, setImageFromUploadPrompt] = useState('');
  const [imageFromUploadLoading, setImageFromUploadLoading] = useState(false);
  const [imageFromUploadError, setImageFromUploadError] = useState('');
  const [imageFromUploadUrl, setImageFromUploadUrl] = useState('');
  const [imageFromUploadModel, setImageFromUploadModel] = useState('gemini');

  // Audio Enhancement State
  const [enhancementFile, setEnhancementFile] = useState<File | null>(null);
  const [enhancementType, setEnhancementType] = useState('denoise');
  const [enhancementLoading, setEnhancementLoading] = useState(false);
  const [enhancementError, setEnhancementError] = useState('');
  const [enhancedAudioUrl, setEnhancedAudioUrl] = useState('');
  const enhancedAudioRef = useRef<HTMLAudioElement>(null);

  // Generated Image URLs State
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState('');
  const [generatedMerchUrl, setGeneratedMerchUrl] = useState('');

  // Firebase Songs State
  const [userSongs, setUserSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);

  // Subscribe to real-time song updates
  useEffect(() => {
    if (!user?.uid) return;

    setSongsLoading(true);
    const unsubscribe = SongService.subscribeToUserSongs(user.uid, (songs) => {
      setUserSongs(songs);
      setSongsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

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
      const result = await generateLyrics(lyricsPrompt, lyricsModel);
      if (!result.success) {
        setLyricsError(result.error || result.message || 'Failed to generate lyrics');
      } else {
        const lyricText =
          result.lyrics ||
          (typeof result.data === 'string' ? result.data : '') ||
          (result.data?.lyrics ?? '') ||
          '';
        setLyricsResult(lyricText || 'No lyrics returned');
        
        // Save to playlist
        if (profile?.id) {
          try {
            const timestamp = new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            await saveGeneratedLyrics(profile.id, {
              title: `🎵 AI Lyrics - ${lyricsPrompt.slice(0, 40)}... (${timestamp})`,
              content: lyricText,
              model: lyricsModel,
            });
            toast.success('Lyrics saved to library!', {
              description: 'Find it in your "AI Generated Music" playlist',
            });
          } catch (err) {
            console.error('[Lyrics Gen] Failed to save to library:', err);
            toast.error('Lyrics generated but failed to save to library', {
              description: 'You can still copy them above',
            });
          }
        }
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

  /**
   * Handle music generation with presets
   */
  const handleMusicPreset = (preset: string) => {
    const prompts = {
      'Afrobeats': 'Afrobeats beat with log drums and deep bass',
      'Amapiano': 'Amapiano beat with log drums and deep bass',
      'RnB': 'RnB beat with smooth melodies and soulful vibes',
      'Trap': 'Trap beat with heavy 808s and hi-hats'
    };
    setMusicPrompt(prompts[preset as keyof typeof prompts] || preset);
  };

  /**
   * Handle AI music generation
   */
  const handleGenerateSong = async () => {
    if (!musicPrompt.trim()) {
      setMusicError('Please enter a prompt');
      return;
    }

    if (!user?.uid) {
      setMusicError('Please sign in to generate songs');
      return;
    }

    setMusicLoading(true);
    setMusicError('');
    setMusicUrl('');
    setMusicIsPlaying(false);

    let songId: string | null = null;

    try {
      // Create song entry in Firestore first
      songId = await SongService.createSongForGeneration(
        user.uid,
        `AI Generated Song - ${musicPrompt.slice(0, 30)}...`,
        musicPrompt,
        'gemini'
      );

      // Call backend API
      const result = await generateSong(musicPrompt);

      if (!result.success) {
        setMusicError(result.error || result.message || 'Failed to generate song');
        if (songId) {
          await SongService.markSongAsFailed(songId, result.error);
        }
      } else {
        const audioUrl = result.audio_url || result.data?.audio_url || '';
        const coverUrl = result.cover_url || result.data?.cover_url || '';
        const lyrics = result.lyrics || result.data?.lyrics || '';

        if (!audioUrl) {
          setMusicError('Backend did not return audio URL');
          if (songId) {
            await SongService.markSongAsFailed(songId, 'No audio URL returned');
          }
        } else {
          setMusicUrl(audioUrl);

          // Update song with results
          if (songId) {
            await SongService.updateSongWithResults(songId, {
              audioUrl,
              coverUrl: coverUrl || undefined,
              lyrics: lyrics || undefined,
              genre: 'AI Generated',
            });
          }

          toast.success('Song generated!', {
            description: 'Saved to your collection',
          });

          // Auto-play the song
          setTimeout(() => {
            if (musicAudioRef.current) {
              musicAudioRef.current.play().catch((err) => {
                console.error('[Music] Auto-play failed:', err);
              });
            }
          }, 300);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate song';
      setMusicError(message);
      console.error('Song generation error:', error);

      if (songId) {
        await SongService.markSongAsFailed(songId, message);
      }
    } finally {
      setMusicLoading(false);
    }
  };

  /**
   * Handle merch generation
   */
  const handleGenerateMerch = async () => {
    if (!merchPrompt.trim()) {
      setMerchError('Please enter a prompt');
      return;
    }

    setMerchLoading(true);
    setMerchError('');
    setMerchUrl('');

    try {
      const result = await generateMerch(merchPrompt, merchProductType);
      if (!result.success) {
        setMerchError(result.error || result.message || 'Failed to generate merch');
      } else {
        const imageUrl = result.cover_url || result.data?.image_url || '';
        if (!imageUrl) {
          setMerchError('Backend did not return image URL');
        } else {
          setMerchUrl(imageUrl);
          toast.success('Merch design generated!', {
            description: 'Ready to save',
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate merch';
      setMerchError(message);
      console.error('Merch generation error:', error);
    } finally {
      setMerchLoading(false);
    }
  };

  /**
   * Save generated item
   */
  const handleSaveItem = (type: 'audio' | 'merch') => {
    const newItem = {
      id: Date.now().toString(),
      prompt: type === 'audio' ? musicPrompt : merchPrompt,
      [type === 'audio' ? 'audioUrl' : 'imageUrl']: type === 'audio' ? musicUrl : merchUrl,
      ...(type === 'merch' && { productType: merchProductType }),
      createdAt: new Date().toISOString(),
      type,
    };

    setSavedItems(prev => [...prev, newItem]);
    toast.success(`${type === 'audio' ? 'Song' : 'Design'} saved!`, {
      description: 'Added to your collection',
    });
  };

  /**
   * Handle music generation from audio file
   */
  const handleGenerateMusicFromAudio = async () => {
    if (!audioFile) {
      setMusicFromAudioError('Please upload an audio file');
      return;
    }
    if (!musicFromAudioPrompt.trim()) {
      setMusicFromAudioError('Please enter a prompt');
      return;
    }

    setMusicFromAudioLoading(true);
    setMusicFromAudioError('');
    setMusicFromAudioUrl('');

    try {
      const result = await generateMusicFromAudio(audioFile, musicFromAudioPrompt, musicFromAudioModel);
      if (!result.success) {
        setMusicFromAudioError(result.error || 'Failed to generate music');
      } else {
        const audioBase64 = result.audio_base64;
        if (!audioBase64) {
          setMusicFromAudioError('Backend did not return audio data');
        } else {
          const audioSrc = `data:audio/wav;base64,${audioBase64}`;
          setMusicFromAudioUrl(audioSrc);
          toast.success('Music generated!', { description: 'Ready to play' });

          // Save to playlist
          if (profile?.id) {
            try {
              await saveGeneratedAudio(profile.id, {
                title: `🎵 Music from Audio - ${musicFromAudioPrompt.slice(0, 40)}...`,
                audio_url: audioSrc,
                mode: musicFromAudioModel,
              });
              toast.success('Saved to library!', { description: 'Find it in your "AI Generated Music" playlist' });
            } catch (err) {
              console.error('Failed to save:', err);
            }
          }
        }
      }
    } catch (error) {
      setMusicFromAudioError(error instanceof Error ? error.message : 'Failed to generate music');
    } finally {
      setMusicFromAudioLoading(false);
    }
  };

  /**
   * Handle image generation from upload
   */
  const handleGenerateImageFromUpload = async () => {
    if (!imageFile) {
      setImageFromUploadError('Please upload an image file');
      return;
    }
    if (!imageFromUploadPrompt.trim()) {
      setImageFromUploadError('Please enter a prompt');
      return;
    }

    setImageFromUploadLoading(true);
    setImageFromUploadError('');
    setImageFromUploadUrl('');

    try {
      const result = await generateImageFromUpload(imageFile, imageFromUploadPrompt, imageFromUploadModel);
      if (!result.success) {
        setImageFromUploadError(result.error || 'Failed to generate image');
      } else {
        const imageUrl = result.cover_url || result.data?.image_url || '';
        if (!imageUrl) {
          setImageFromUploadError('Backend did not return image URL');
        } else {
          setImageFromUploadUrl(imageUrl);
          setGeneratedImageUrl(imageUrl);
          toast.success('Image generated!', { description: 'Ready to save' });
        }
      }
    } catch (error) {
      setImageFromUploadError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setImageFromUploadLoading(false);
    }
  };

  /**
   * Handle audio enhancement
   */
  const handleEnhanceAudio = async () => {
    if (!enhancementFile) {
      setEnhancementError('Please upload an audio file');
      return;
    }

    setEnhancementLoading(true);
    setEnhancementError('');
    setEnhancedAudioUrl('');

    try {
      const result = await enhanceAudio(enhancementFile, enhancementType);
      if (!result.success) {
        setEnhancementError(result.error || 'Failed to enhance audio');
      } else {
        const audioBase64 = result.audio_base64;
        if (!audioBase64) {
          setEnhancementError('Backend did not return audio data');
        } else {
          const audioSrc = `data:audio/wav;base64,${audioBase64}`;
          setEnhancedAudioUrl(audioSrc);
          toast.success('Audio enhanced!', { description: 'Ready to download' });

          if (profile?.id) {
            try {
              await saveGeneratedAudio(profile.id, {
                title: `🎵 Enhanced Audio - ${enhancementType}`,
                audio_url: audioSrc,
                mode: `enhancement_${enhancementType}`,
              });
              toast.success('Saved to library!', { description: 'Find it in your "AI Generated Music" playlist' });
            } catch (err) {
              console.error('Failed to save:', err);
            }
          }
        }
      }
    } catch (error) {
      setEnhancementError(error instanceof Error ? error.message : 'Failed to enhance audio');
    } finally {
      setEnhancementLoading(false);
    }
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

  // Allow all authenticated users to access the studio (not just artists)
  if (!user) {
    return (
      <div className="min-h-screen pb-36">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center gap-4 px-4 h-14">
            <button
              onClick={() => navigate('/auth')}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-lg">Online Studio</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Please sign in to access the AI-powered music studio.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Sign In
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
            <TabsTrigger value="music-composition" className="gap-2">
              <Music className="w-4 h-4" />
              Music Composition
            </TabsTrigger>
            <TabsTrigger value="cover" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Cover Art
            </TabsTrigger>
            <TabsTrigger value="merch" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Merch
            </TabsTrigger>
            <TabsTrigger value="mixing-mastering" className="gap-2">
              <Sliders className="w-4 h-4" />
              Mixing & Mastering
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <Wand2 className="w-4 h-4" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="my-songs" className="gap-2">
              <Music className="w-4 h-4" />
              My Songs
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
                  
                  {/* Model Selection */}
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-2 block">AI Model:</label>
                    <Select value={lyricsModel} onValueChange={setLyricsModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Gemini AI</SelectItem>
                        <SelectItem value="musicgen">MusicGen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
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
                        onPlay={() => {
                          setBeatIsPlaying(true);
                          // Pause other audio elements
                          if (musicAudioRef.current) musicAudioRef.current.pause();
                          if (compositionAudioRef.current) compositionAudioRef.current.pause();
                          setMusicIsPlaying(false);
                          setCompositionBeatIsPlaying(false);
                        }}
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

        {/* Music Composition Tab */}
        <TabsContent value="music-composition" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Music Composition
                </CardTitle>
                <CardDescription>
                  Create complete songs with AI-powered music generation and composition tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {musicError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{musicError}</p>
                    </div>
                    <button
                      onClick={() => setMusicError('')}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe the song you want:</p>

                  {/* Preset Buttons */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Quick Presets:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Afrobeats', 'Amapiano', 'RnB', 'Trap'].map((preset) => (
                        <motion.button
                          key={preset}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleMusicPreset(preset)}
                          className="p-3 rounded-lg bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
                          disabled={musicLoading}
                        >
                          <Music className="w-4 h-4 mb-2 group-hover:text-primary transition-colors" />
                          {preset}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={musicPrompt}
                    onChange={(e) => setMusicPrompt(e.target.value)}
                    placeholder="e.g., Afrobeats beat with log drums and deep bass"
                    className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    rows={3}
                    disabled={musicLoading}
                  />
                </div>

                {/* Music from Audio Button */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Show coming soon message
                      setMusicError('Music from Audio feature is coming soon! Transform your uploaded audio with AI.');
                      setTimeout(() => setMusicError(''), 5000);
                    }}
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Music from Audio (Coming Soon)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload your own audio and let AI transform it into something new
                  </p>
                </div>

                <Button
                  onClick={handleGenerateSong}
                  disabled={musicLoading || !musicPrompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {musicLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Generating Song...
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4 mr-2" />
                      Generate Song
                    </>
                  )}
                </Button>

                {/* Display Generated Music */}
                {musicUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Generated Song</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveItem('audio')}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <audio
                        ref={musicAudioRef}
                        className="w-full"
                        src={musicUrl}
                        preload="metadata"
                        onPlay={() => {
                          setMusicIsPlaying(true);
                          // Pause other audio elements
                          if (beatAudioRef.current) beatAudioRef.current.pause();
                          if (compositionAudioRef.current) compositionAudioRef.current.pause();
                          setBeatIsPlaying(false);
                          setCompositionBeatIsPlaying(false);
                        }}
                        onPause={() => setMusicIsPlaying(false)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (musicAudioRef.current) {
                              if (musicIsPlaying) {
                                musicAudioRef.current.pause();
                              } else {
                                musicAudioRef.current.play();
                              }
                            }
                          }}
                          variant="outline"
                        >
                          {musicIsPlaying ? (
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
                              const response = await fetch(musicUrl);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `ai_song_${Date.now()}.wav`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Download failed:', error);
                              setMusicError('Failed to download file');
                            }
                          }}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Full Song Composition Section */}
                <div className="border-t border-border pt-4">
                  <h3 className="font-semibold mb-3">Full Song Composition</h3>

                  {/* Error Alert */}
                  {compositionError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3 mb-4">
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

                  <div className="p-4 bg-muted/50 rounded-lg border border-border mb-4">
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
                    <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start gap-3 mt-4">
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
                      className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4 mt-4"
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
                      className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-4 mt-4"
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
                          onPlay={() => {
                            setCompositionBeatIsPlaying(true);
                            // Pause other audio elements
                            if (beatAudioRef.current) beatAudioRef.current.pause();
                            if (musicAudioRef.current) musicAudioRef.current.pause();
                            setBeatIsPlaying(false);
                            setMusicIsPlaying(false);
                          }}
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Merch Generator Tab */}
        <TabsContent value="merch" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Merch Generator
                </CardTitle>
                <CardDescription>
                  Generate custom merch designs with AI-powered creativity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Error Alert */}
                {merchError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Error</p>
                      <p className="text-sm text-destructive/80">{merchError}</p>
                    </div>
                    <button
                      onClick={() => setMerchError('')}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Describe your merch design:</p>
                  
                  {/* Product Selector */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Product Type:</p>
                    <select
                      value={merchProductType}
                      onChange={(e) => setMerchProductType(e.target.value)}
                      className="w-full p-3 rounded-lg border border-border bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      disabled={merchLoading}
                    >
                      <option value="T-shirt">T-shirt</option>
                      <option value="Hoodie">Hoodie</option>
                      <option value="Sweater">Sweater</option>
                      <option value="Cap">Cap</option>
                    </select>
                  </div>

                  <textarea
                    value={merchPrompt}
                    onChange={(e) => setMerchPrompt(e.target.value)}
                    placeholder="e.g., Minimalist logo with geometric shapes and vibrant colors"
                    className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    rows={3}
                    disabled={merchLoading}
                  />
                </div>

                <Button
                  onClick={handleGenerateMerch}
                  disabled={merchLoading || !merchPrompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {merchLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Generating Design...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Merch
                    </>
                  )}
                </Button>

                {/* Display Generated Merch */}
                {merchUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Generated Design - {merchProductType}</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveItem('merch')}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save Design
                      </Button>
                    </div>

                    <div className="flex justify-center">
                      <img
                        src={merchUrl}
                        alt={`Generated ${merchProductType} design`}
                        className="max-w-full h-auto rounded-lg border border-border"
                      />
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

                {/* Image from Upload Button */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Show coming soon message
                      setCoverError('Image from Upload feature is coming soon! Transform your photos into stunning album covers.');
                      setTimeout(() => setCoverError(''), 5000);
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Image from Upload (Coming Soon)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload your own images and let AI transform them into album covers
                  </p>
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

        {/* Mixing & Mastering Tab */}
        <TabsContent value="mixing-mastering" className="px-4 py-6">
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
                {/* Free Tier Notice */}
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-600">You are currently on "free" tier</p>
                      <p className="text-sm text-yellow-600/80">
                        Upgrade to unlock professional mixing & mastering, longer music generation, and licensing options.
                      </p>
                    </div>
                  </div>
                  <Button className="w-full mt-3" variant="outline">
                    <Star className="w-4 h-4 mr-2" />
                    View Upgrade Options
                  </Button>
                </div>

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

                {/* What You Get */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Mixing & Mastering Includes:</h3>
                  <ul className="space-y-2">
                    {[
                      'AI-powered audio enhancement',
                      'Professional mixing algorithms',
                      'Multi-band compression & EQ',
                      'Reverb & spatial processing',
                      'Mastering for all platforms',
                      'Stem separation & isolation',
                      'Loudness optimization',
                      'Format conversion & export',
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Additional Benefits */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Upgrade Benefits:</h3>
                  <ul className="space-y-2">
                    {[
                      'Generate longer music (up to 10 minutes)',
                      'Lyria Pro for advanced lyrics generation',
                      'License to sell generated beats',
                      'Commercial use rights',
                      'High-resolution audio export',
                      'Advanced AI models access',
                    ].map((benefit, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button className="w-full" size="lg" variant="outline">
                  <Sliders className="w-4 h-4 mr-2" />
                  Upgrade to Access Mixing & Mastering
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Songs Tab */}
        <TabsContent value="my-songs" className="px-4 py-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  My Generated Songs
                </CardTitle>
                <CardDescription>
                  View all your AI-generated songs and music
                </CardDescription>
              </CardHeader>
              <CardContent>
                {songsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading songs...</span>
                  </div>
                ) : userSongs.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No songs yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate your first song using the Music tab
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {userSongs.map((song) => (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border border-border rounded-lg bg-card"
                      >
                        <div className="flex items-start gap-4">
                          {/* Cover Image */}
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {song.coverUrl ? (
                              <img
                                src={song.coverUrl}
                                alt={song.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Music className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>

                          {/* Song Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{song.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <span>{song.genre || 'AI Generated'}</span>
                              {song.bpm && <span>• {song.bpm} BPM</span>}
                              <span>• {song.createdAt.toLocaleDateString()}</span>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  song.status === 'completed'
                                    ? 'bg-green-500/10 text-green-600'
                                    : song.status === 'generating'
                                      ? 'bg-yellow-500/10 text-yellow-600'
                                      : 'bg-red-500/10 text-red-600'
                                }`}
                              >
                                {song.status}
                              </span>
                              {song.modelUsed && (
                                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                  {song.modelUsed}
                                </span>
                              )}
                            </div>

                            {/* Audio Player */}
                            {song.audioUrl && song.status === 'completed' && (
                              <audio
                                controls
                                className="w-full"
                                preload="none"
                              >
                                <source src={song.audioUrl} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            )}

                            {/* Lyrics Preview */}
                            {song.lyrics && (
                              <div className="mt-3">
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80">
                                    View Lyrics
                                  </summary>
                                  <div className="mt-2 p-3 bg-muted/50 rounded text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                                    {song.lyrics}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            {song.audioUrl && (
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = song.audioUrl!;
                                  link.download = `${song.title}.mp3`;
                                  link.click();
                                }}
                                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                title="Download"
                              >
                                <ArrowLeft className="w-4 h-4 rotate-180" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="px-4 py-6">
          <div className="space-y-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  AI Chat Assistant
                </CardTitle>
                <CardDescription>
                  Chat with AI to get creative suggestions and assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <AIChat
                  title="Music Production Assistant"
                  description="Ask me anything about music generation and production"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
