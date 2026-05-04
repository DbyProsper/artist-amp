import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { generateBeats, generateLyrics, generateSong, generateImage, generateMerch, generatePoster } from '@/lib/api';
import { saveGeneratedAudio, checkDuplicateTrack } from '@/lib/aiMusicStorage';
import { toast } from 'sonner';

// Import studio components
import { StudioEntryScreen, StudioFeature } from '@/components/studio/StudioEntryScreen';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { StudioAIChat } from '@/components/studio/StudioAIChat';
import { GenerationHistory } from '@/components/studio/GenerationHistory';
import { GlobalMusicPlayer, GlobalTrack } from '@/components/studio/GlobalMusicPlayer';
import { ResultDisplayModal } from '@/components/studio/ResultDisplayModal';
import { ImageEditorModal } from '@/components/studio/ImageEditorModal';
import { downloadAudio } from '@/lib/audioUtils';
import { saveEditedImage } from '@/services/imageEditorService';
import { EditorOverlay } from '@/types/imageEditor';

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
  title?: string;
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
  const [showEntry, setShowEntry] = useState(() => {
    const saved = localStorage.getItem('studio_showEntry');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [currentFeature, setCurrentFeature] = useState<StudioFeature>(() => {
    const saved = localStorage.getItem('studio_currentFeature');
    return (saved as StudioFeature) || 'beat';
  });
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
  const [generatedTitle, setGeneratedTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<GlobalTrack | null>(null);

  // ==================== HISTORY STATE ====================
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [showGlobalPlayer, setShowGlobalPlayer] = useState(false);

  // ==================== RESULT MODAL STATE ====================
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState({
    audioUrl: '',
    imageUrl: '',
    lyrics: '',
    prompt: '',
  });

  // ==================== IMAGE EDITOR STATE ====================
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);

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

  // Save studio state to localStorage
  useEffect(() => {
    localStorage.setItem('studio_showEntry', JSON.stringify(showEntry));
  }, [showEntry]);

  useEffect(() => {
    localStorage.setItem('studio_currentFeature', currentFeature);
  }, [currentFeature]);

  // ==================== HANDLERS ====================

  /**
   * Handle feature selection from entry screen
   */
  const handleFeatureSelect = (feature: StudioFeature) => {
    if (feature === 'enhance') {
      toast.info('Audio Enhancement tool coming soon!');
      return;
    }

    setCurrentFeature(feature);
    setShowEntry(false);

    // Open chat in fullscreen if selected
    if (feature === 'chat') {
      setChatOpen(true);
      setChatExpanded(true); // Open fullscreen directly
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

    setGeneratedTitle(prompt);
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
          // Beats endpoint also returns an image
          imageUrl = result.image_url || result.cover_url;
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

      // Log response for debugging
      console.log('[Studio] Generation result:', {
        feature: currentFeature,
        audioUrl,
        imageUrl: imageUrl || result.image_url || result.cover_url,
        lyrics,
        fullResult: result,
      });

      // Validate that we got at least something (check all possible fields)
      const finalAudioUrl = audioUrl || result.audio_url;
      const finalImageUrl = imageUrl || result.image_url || result.cover_url;
      const finalLyrics = lyrics || result.lyrics;

      if (!finalAudioUrl && !finalImageUrl && !finalLyrics) {
        console.error('[Studio] No content in response:', result);
        throw new Error(`No content returned for ${currentFeature}. Response: ${JSON.stringify(result)}`);
      }

      // Update state based on what was generated
      if (finalAudioUrl) setGeneratedAudioUrl(finalAudioUrl);
      if (finalImageUrl) setGeneratedImageUrl(finalImageUrl);
      if (finalLyrics) setGeneratedLyrics(finalLyrics);

      // Show result modal
      setResultModalData({
        audioUrl: finalAudioUrl || '',
        imageUrl: finalImageUrl || '',
        lyrics: finalLyrics || '',
        prompt,
      });
      setShowResultModal(true);

      // Add to history
      const newItem: GeneratedItem = {
        id: Date.now().toString(),
        feature: currentFeature,
        prompt,
        title: generatedTitle || prompt,
        audioUrl: finalAudioUrl,
        imageUrl: finalImageUrl,
        lyrics: finalLyrics,
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
      if (finalAudioUrl) {
        setCurrentTrack({
          id: newItem.id,
          title: generatedTitle || prompt,
          audioUrl: finalAudioUrl,
          lyrics: finalLyrics,
          imageUrl: finalImageUrl,
        });
      } else if (finalImageUrl) {
        toast.success('🎨 Image generated!');
      } else if (finalLyrics) {
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

    if (!user?.uid || !profile?.id) {
      toast.error('Please sign in to save tracks');
      return;
    }

    const trackTitle = generatedTitle || prompt || `${currentFeature} - ${new Date().toLocaleString()}`;

    setIsSaving(true);
    try {
      console.log('[Studio] Saving track:', {
        profileId: profile.id,
        title: trackTitle,
        audioUrl: generatedAudioUrl,
        coverUrl: generatedImageUrl,
      });

      // Check for duplicate track
      const isDuplicate = await checkDuplicateTrack(profile.id, trackTitle);
      if (isDuplicate) {
        toast.error(`⚠️ Song already exists with the name "${trackTitle}"`);
        setIsSaving(false);
        return;
      }

      // Save to Firebase using the aiMusicStorage service
      const { track } = await saveGeneratedAudio(profile.id, {
        title: trackTitle,
        audio_url: generatedAudioUrl,
        cover_url: generatedImageUrl,
        duration: currentTrack?.duration,
      });

      toast.success('💾 Saved to library!');
      console.log('[Studio] Track saved:', track.id);
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
      await downloadAudio(generatedAudioUrl, generatedTitle || prompt || 'track', 'mp3');
      toast.success('⬇️ Downloaded!');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  /**
   * Handle image editor save
   */
  const handleEditImageSave = async (overlays: EditorOverlay[]) => {
    if (!editingImageUrl) {
      toast.error('No image to edit');
      return;
    }

    try {
      // Save edited image via backend
      const editedImageUrl = await saveEditedImage(editingImageUrl, overlays);
      
      if (editedImageUrl) {
        setGeneratedImageUrl(editedImageUrl);
        setResultModalData((prev) => ({
          ...prev,
          imageUrl: editedImageUrl,
        }));
        toast.success('🎨 Image edited successfully!');
      } else {
        toast.error('Failed to save edited image');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error editing image';
      toast.error(message);
      console.error('[Studio] Image edit error:', error);
    }
  };

  /**
   * Open image editor for generated image
   */
  const handleOpenImageEditor = (imageUrl: string) => {
    setEditingImageUrl(imageUrl);
    setShowImageEditor(true);
  };

  /**
   * Handle back to entry
   */
  const handleBackToEntry = () => {
    setShowEntry(true);
    setGeneratedAudioUrl(null);
    setGeneratedImageUrl(null);
    setGeneratedLyrics(null);
    setGeneratedTitle('');
    setResultModalData({ audioUrl: '', imageUrl: '', lyrics: '', prompt: '' });
    setShowResultModal(false);
    setPrompt('');
    setGenerationError('');
    setChatOpen(false);
  };

  /**
   * Get dynamic button text based on current feature
   */
  const getButtonText = () => {
    const buttonMap: Record<StudioFeature, string> = {
      'beat': 'Generate Beat',
      'lyrics': 'Generate Lyrics',
      'song': 'Create Song',
      'cover': 'Generate Cover',
      'poster': 'Create Poster',
      'merch': 'Design Merch',
      'chat': 'Chat',
    };
    return buttonMap[currentFeature] || 'Generate';
  };

  const promptPlaceholder = (() => {
    switch (currentFeature) {
      case 'lyrics':
        return 'Describe the theme, mood, style, and story for the lyrics you want to write.';
      case 'cover':
        return 'Describe the album cover concept, color palette, atmosphere, and visual style.';
      case 'poster':
        return 'Describe the poster layout, event theme, bold text, and visual energy.';
      case 'merch':
        return 'Describe the merch design: brand style, logo placement, colors, and mockup only (no people).';
      case 'song':
        return 'Describe the full song: mood, genre, instrumentation, vocals, and story.';
      case 'beat':
      default:
        return 'Describe the beat idea: tempo, instruments, atmosphere, and energy.';
    }
  })();

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
              buttonText={getButtonText()}
              promptPlaceholder={promptPlaceholder}
              generatedTitle={generatedTitle}
              onTitleChange={setGeneratedTitle}
              audioUrl={generatedAudioUrl || undefined}
              onDownload={handleDownloadTrack}
              onSave={handleSaveTrack}
              isSaving={isSaving}
              history={history.filter((h) => h.feature === currentFeature)}
              onHistorySelect={(item) => {
                if (item.audioUrl) {
                  // Play the audio directly in the studio player
                  setGeneratedAudioUrl(item.audioUrl);
                  setGeneratedImageUrl(item.imageUrl || null);
                  setGeneratedLyrics(item.lyrics || null);
                  setPrompt(item.prompt);
                } else {
                  // For non-audio items, show the result modal
                  setResultModalData({
                    audioUrl: item.audioUrl || '',
                    imageUrl: item.imageUrl || '',
                    lyrics: item.lyrics || '',
                    prompt: item.prompt,
                  });
                }
              }}
                setShowResultModal(true);

                if (item.audioUrl) {
                  setCurrentTrack({
                    id: item.id,
                    title: item.prompt,
                    audioUrl: item.audioUrl,
                    lyrics: item.lyrics,
                    imageUrl: item.imageUrl,
                  });
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
        isOpen={chatOpen}
        isFullscreen={chatExpanded}
        onClose={() => {
          setChatOpen(false);
          setChatExpanded(false);
        }}
        onToggleFullscreen={() => {
          setChatExpanded(!chatExpanded);
          setChatOpen(true); // Keep chat open when toggling
        }}
      />

      {/* Result Display Modal */}
      <ResultDisplayModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        audioUrl={resultModalData.audioUrl}
        imageUrl={resultModalData.imageUrl}
        lyrics={resultModalData.lyrics}
        prompt={resultModalData.prompt}
        onPlay={(audioUrl) => {
          setCurrentTrack({
            id: Date.now().toString(),
            title: resultModalData.prompt,
            audioUrl,
            lyrics: resultModalData.lyrics,
            imageUrl: resultModalData.imageUrl,
          });
          setShowGlobalPlayer(true);
        }}
        onReuse={(prompt) => {
          setPrompt(prompt);
          setShowResultModal(false);
        }}
        onEditImage={handleOpenImageEditor}
        title={`${currentFeature} - ${resultModalData.prompt}`}
      />

      {/* Image Editor Modal */}
      <ImageEditorModal
        isOpen={showImageEditor}
        baseImageUrl={editingImageUrl || ''}
        onClose={() => {
          setShowImageEditor(false);
          setEditingImageUrl(null);
        }}
        onSaveEdits={handleEditImageSave}
        title="Edit Image"
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
