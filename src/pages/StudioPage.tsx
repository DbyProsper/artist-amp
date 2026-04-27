import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { generateBeats, generateLyrics, generateSong, generateImage, generateMerch, generatePoster } from '@/lib/api';
import { saveGeneratedAudio } from '@/lib/aiMusicStorage';
import { toast } from 'sonner';

// Import studio components
import { StudioEntryScreen, StudioFeature } from '@/components/studio/StudioEntryScreen';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { StudioAIChat } from '@/components/studio/StudioAIChat';
import { GenerationHistory } from '@/components/studio/GenerationHistory';
import { GlobalMusicPlayer, GlobalTrack } from '@/components/studio/GlobalMusicPlayer';
import { downloadAudio } from '@/lib/audioUtils';

// Import for genre mapping
const GENRE_PRESETS = {
  'amapiano-soulful': 'amapiano',
  'amapiano-club': 'amapiano',
  'gqom-deep': 'gqom',
  'trap-hard': 'trap',
  'afrobeats-groove': 'afrobeats',
  'rnb-smooth': 'rnb',
  'house-dance': 'house',
  'hiphop-boom': 'hiphop',
};

interface GeneratedItem {
  id: string;
  feature: StudioFeature;
  prompt: string;
  audioUrl?: string;
  imageUrl?: string;
  lyrics?: string;
  createdAt: Date;
  metadata: {
    genre: string;
    bpm: number;
    mood: string;
    language: string;
  };
}

export default function StudioPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // ==================== FLOW STATE ====================
  const [showEntry, setShowEntry] = useState(true);
  const [currentFeature, setCurrentFeature] = useState<StudioFeature>('beat');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  // ==================== GENERATION STATE ====================
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('amapiano');
  const [selectedMood, setSelectedMood] = useState('chill');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [bpm, setBpm] = useState(112);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');

  // ==================== OUTPUT STATE ====================
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<GlobalTrack | null>(null);

  // ==================== HISTORY STATE ====================
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [showGlobalPlayer, setShowGlobalPlayer] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('studio_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }));
        setHistory(parsed);
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('studio_history', JSON.stringify(history));
    }
  }, [history]);

  // ==================== HANDLERS ====================

  /**
   * Handle feature selection from entry screen
   */
  const handleFeatureSelect = (feature: StudioFeature) => {
    setCurrentFeature(feature);
    setShowEntry(false);

    // Open chat if selected
    if (feature === 'chat') {
      setChatOpen(true);
    }
  };

  /**
   * Generate track for current feature
   */
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setGenerationError('Please describe what you want to create');
      return;
    }

    if (!user?.uid) {
      setGenerationError('Please sign in to create');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGeneratedAudioUrl(null);
    setGeneratedImageUrl(null);
    setGeneratedLyrics(null);

    try {
      let result;
      let audioUrl: string | undefined;
      let imageUrl: string | undefined;
      let lyrics: string | undefined;

      const userTier = profile?.tier === 'premium' ? 'premium' : 'free';

      // Route to appropriate generation function based on feature
      switch (currentFeature) {
        case 'beat':
          result = await generateBeats(prompt, {
            genre: selectedGenre,
            mood: selectedMood,
            language: selectedLanguage,
            bpm: bpm,
            user_tier: userTier,
          });
          audioUrl = result.audio_url;
          break;

        case 'lyrics':
          result = await generateLyrics(prompt, {
            genre: selectedGenre,
            mood: selectedMood,
            language: selectedLanguage,
            user_tier: userTier,
          });
          lyrics = result.data?.lyrics || result.lyrics;
          break;

        case 'song':
          result = await generateSong(prompt, {
            genre: selectedGenre,
            mood: selectedMood,
            language: selectedLanguage,
            bpm: bpm,
            user_tier: userTier,
          });
          audioUrl = result.audio_url;
          imageUrl = result.cover_url;
          lyrics = result.lyrics;
          break;

        case 'cover':
          result = await generateImage(prompt, {
            image_type: 'cover',
            genre: selectedGenre,
            language: selectedLanguage,
            user_tier: userTier,
          });
          imageUrl = result.image_url;
          break;

        case 'poster':
          result = await generatePoster(prompt, {
            genre: selectedGenre,
            language: selectedLanguage,
            user_tier: userTier,
          });
          imageUrl = result.image_url;
          break;

        case 'merch':
          result = await generateMerch(prompt, {
            genre: selectedGenre,
            user_tier: userTier,
          });
          imageUrl = result.image_url;
          break;

        default:
          throw new Error(`Unsupported feature: ${currentFeature}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      // Validate that we got at least something
      if (!audioUrl && !imageUrl && !lyrics) {
        throw new Error('Backend did not return any content');
      }

      // Update state based on what was generated
      if (audioUrl) setGeneratedAudioUrl(audioUrl);
      if (imageUrl) setGeneratedImageUrl(imageUrl);
      if (lyrics) setGeneratedLyrics(lyrics);

      // Add to history
      const newItem: GeneratedItem = {
        id: Date.now().toString(),
        feature: currentFeature,
        prompt,
        audioUrl,
        imageUrl,
        lyrics,
        createdAt: new Date(),
        metadata: {
          genre: selectedGenre,
          bpm,
          mood: selectedMood,
          language: selectedLanguage,
        },
      };

      setHistory((prev) => [newItem, ...prev].slice(0, 50)); // Keep last 50

      // Show player if audio was generated
      if (audioUrl) {
        setCurrentTrack({
          id: newItem.id,
          title: prompt,
          audioUrl,
          lyrics: lyrics,
          imageUrl: imageUrl,
        });
        setShowGlobalPlayer(true);
        toast.success('✨ Generated!');
      } else if (imageUrl) {
        toast.success('🎨 Image generated!');
      } else if (lyrics) {
        toast.success('📝 Lyrics generated!');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed';
      setGenerationError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Save to library
   */
  const handleSaveTrack = async () => {
    if (!generatedAudioUrl) {
      toast.error('No generated audio to save');
      return;
    }

    if (!user?.uid) {
      toast.error('Please sign in to save tracks');
      return;
    }

    setIsSaving(true);
    try {
      // Save to Firebase using the aiMusicStorage service
      const { track } = await saveGeneratedAudio(user.uid, {
        title: prompt || `${currentFeature} - ${new Date().toLocaleString()}`,
        audio_url: generatedAudioUrl,
        cover_url: generatedImageUrl,
        duration: currentTrack?.duration,
      });

      toast.success('💾 Saved to library!');
      console.log('Track saved:', track.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      toast.error(errorMessage);
      console.error('[Studio] Save track error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Download track
   */
  const handleDownloadTrack = async () => {
    if (!generatedAudioUrl) return;

    try {
      await downloadAudio(generatedAudioUrl, prompt || 'track', 'mp3');
      toast.success('⬇️ Downloaded!');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  /**
   * Handle back to entry
   */
  const handleBackToEntry = () => {
    setShowEntry(true);
    setGeneratedAudioUrl(null);
    setGeneratedImageUrl(null);
    setGeneratedLyrics(null);
    setPrompt('');
    setGenerationError('');
    setChatOpen(false);
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {showEntry ? (
          // Entry Screen
          <motion.div key="entry">
            <StudioEntryScreen onFeatureSelect={handleFeatureSelect} />
          </motion.div>
        ) : (
          // Main Studio Layout
          <motion.div key="studio">
            <StudioLayout
              feature={currentFeature}
              onFeatureChange={setCurrentFeature}
              onBack={handleBackToEntry}
              onChatOpen={() => setChatOpen(true)}
              prompt={prompt}
              onPromptChange={setPrompt}
              bpm={bpm}
              onBPMChange={setBpm}
              selectedGenre={selectedGenre}
              onGenreChange={setSelectedGenre}
              selectedMood={selectedMood}
              onMoodChange={setSelectedMood}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              error={generationError}
              audioUrl={generatedAudioUrl || undefined}
              onDownload={handleDownloadTrack}
              onSave={handleSaveTrack}
              isSaving={isSaving}
              history={history.filter((h) => h.feature === currentFeature)}
              onHistorySelect={(item) => {
                setPrompt(item.prompt);
                if (item.audioUrl) {
                  setGeneratedAudioUrl(item.audioUrl);
                  setGeneratedImageUrl(item.imageUrl || null);
                  setGeneratedLyrics(item.lyrics || null);
                  setCurrentTrack({
                    id: item.id,
                    title: item.prompt,
                    audioUrl: item.audioUrl,
                    lyrics: item.lyrics,
                    imageUrl: item.imageUrl,
                  });
                  setShowGlobalPlayer(true);
                } else if (item.lyrics) {
                  setGeneratedLyrics(item.lyrics);
                  setPrompt(item.prompt);
                } else if (item.imageUrl) {
                  setGeneratedImageUrl(item.imageUrl);
                  setPrompt(item.prompt);
                }
              }}
              onHistoryDelete={(id) => {
                setHistory((prev) => prev.filter((h) => h.id !== id));
                toast.success('Removed from history');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Panel */}
      <StudioAIChat
        isOpen={chatOpen && !chatExpanded}
        isFullscreen={chatExpanded}
        onClose={() => {
          setChatOpen(false);
          setChatExpanded(false);
        }}
        onToggleFullscreen={() => setChatExpanded(!chatExpanded)}
      />

      {/* Global Music Player */}
      {showGlobalPlayer && (
        <GlobalMusicPlayer
          currentTrack={currentTrack || undefined}
          onClose={() => setShowGlobalPlayer(false)}
        />
      )}
    </div>
  );
}
