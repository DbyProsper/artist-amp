import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { generateBeats } from '@/lib/api';
import { toast } from 'sonner';

// Import studio components
import { StudioEntryScreen, StudioFeature } from '@/components/studio/StudioEntryScreen';
import { StudioLayout } from '@/components/studio/StudioLayout';
import { StudioAIChat } from '@/components/studio/StudioAIChat';
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

    try {
      // Generate music with all proper parameters
      const result = await generateBeats(prompt, {
        genre: selectedGenre,
        mood: selectedMood,
        language: selectedLanguage,
        bpm: bpm,
        user_tier: profile?.tier === 'premium' ? 'premium' : 'free', // Use user tier
      });

      if (!result.success) {
        throw new Error(result.error || 'Generation failed');
      }

      // Get audio URL from normalized field (works with all response formats)
      const audioUrl = result.audio_url;
      if (!audioUrl) {
        throw new Error('Backend did not return audio URL');
      }

      // Set generated audio
      setGeneratedAudioUrl(audioUrl);

      // Add to history
      const newItem: GeneratedItem = {
        id: Date.now().toString(),
        feature: currentFeature,
        prompt,
        audioUrl,
        createdAt: new Date(),
        metadata: {
          genre: selectedGenre,
          bpm,
          mood: selectedMood,
          language: selectedLanguage,
        },
      };

      setHistory((prev) => [newItem, ...prev].slice(0, 50)); // Keep last 50

      // Show player
      setCurrentTrack({
        id: newItem.id,
        title: prompt,
        audioUrl,
      });
      setShowGlobalPlayer(true);

      toast.success('✨ Track generated!');
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
    if (!generatedAudioUrl) return;

    setIsSaving(true);
    try {
      // TODO: Implement actual save to library (Firebase or backend)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('💾 Saved to library!');
    } catch (error) {
      toast.error('Failed to save');
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
                  setCurrentTrack({
                    id: item.id,
                    title: item.prompt,
                    audioUrl: item.audioUrl,
                  });
                  setShowGlobalPlayer(true);
                }
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
