import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { generateBeats } from '@/lib/api';
import { toast } from 'sonner';
import { AppLogo } from '@/components/ui/AppLogo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Import new studio components
import { PromptBox } from '@/components/studio/PromptBox';
import { BPMSlider } from '@/components/studio/BPMSlider';
import { PresetButtons } from '@/components/studio/PresetButtons';
import { MoodPresets } from '@/components/studio/MoodPresets';
import { LanguagePresets } from '@/components/studio/LanguagePresets';
import { StudioView, StudioViewData } from '@/components/studio/StudioView';

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

export default function StudioPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // ==================== STATE MANAGEMENT ====================

  // Creation Mode State
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('amapiano');
  const [selectedMood, setSelectedMood] = useState('chill');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [bpm, setBpm] = useState(112);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creationError, setCreationError] = useState('');

  // Studio Mode State
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [studioData, setStudioData] = useState<StudioViewData | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [studioError, setStudioError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Audio ref for direct playback
  const audioRef = useRef<HTMLAudioElement>(null);

  // ==================== HANDLERS ====================

  /**
   * Handle preset selection from genre presets
   */
  const handlePresetSelect = (preset: any) => {
    setSelectedGenre(preset.genre);
    setBpm(preset.bpm);
    setSelectedMood(preset.mood);
    toast.success(`Preset "${preset.name}" loaded!`, {
      description: `${preset.genre} • ${preset.bpm} BPM • ${preset.mood}`,
    });
  };

  /**
   * Main generation handler
   */
  const handleGenerateTrack = async () => {
    if (!prompt.trim()) {
      setCreationError('Please describe your song idea');
      return;
    }

    if (!user?.uid) {
      setCreationError('Please sign in to create tracks');
      return;
    }

    setIsGenerating(true);
    setCreationError('');

    try {
      // Build the full prompt with metadata
      const fullPrompt = `${prompt} // Genre: ${selectedGenre}, BPM: ${bpm}, Mood: ${selectedMood}, Language: ${selectedLanguage}`;

      // Call the beat generation API
      const result = await generateBeats(fullPrompt);

      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to generate track');
      }

      // Extract audio data
      const audioBase64 = result.audio_base64;
      if (!audioBase64) {
        throw new Error('Backend did not return audio data');
      }

      const audioSrc = `data:audio/wav;base64,${audioBase64}`;

      // Set studio data for studio mode
      setStudioData({
        audioUrl: audioSrc,
        title: prompt.charAt(0).toUpperCase() + prompt.slice(1),
        genre: selectedGenre,
        bpm: bpm,
        mood: selectedMood,
        language: selectedLanguage,
        lyrics: result.improved_prompt || undefined,
        coverUrl: result.cover_url || undefined,
      });

      // Transition to studio mode
      setIsStudioMode(true);
      toast.success('Track generated! 🎉', {
        description: 'Welcome to Studio Mode',
      });

      // Auto-play (if user permits)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = audioSrc;
          audioRef.current.play().catch(() => {
            console.log('Auto-play prevented by browser');
          });
        }
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate track';
      setCreationError(message);
      console.error('Generation error:', error);
      toast.error('Generation failed', {
        description: message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle regeneration with updated parameters
   */
  const handleRegenerate = async () => {
    if (!studioData) return;

    setIsRegenerating(true);
    setStudioError('');

    try {
      const fullPrompt = `${prompt} // Genre: ${selectedGenre}, BPM: ${bpm}, Mood: ${selectedMood}, Language: ${selectedLanguage}`;
      const result = await generateBeats(fullPrompt);

      if (!result.success) {
        throw new Error(result.error || 'Failed to regenerate track');
      }

      const audioBase64 = result.audio_base64;
      if (!audioBase64) {
        throw new Error('Backend did not return audio data');
      }

      const audioSrc = `data:audio/wav;base64,${audioBase64}`;

      // Update studio data
      setStudioData((prev) =>
        prev
          ? {
              ...prev,
              audioUrl: audioSrc,
              lyrics: result.improved_prompt || prev.lyrics,
            }
          : null
      );

      toast.success('Track regenerated! ✨', {
        description: 'Updated with new parameters',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate';
      setStudioError(message);
      toast.error('Regeneration failed', { description: message });
    } finally {
      setIsRegenerating(false);
    }
  };

  /**
   * Handle save to library
   */
  const handleSaveTrack = async () => {
    if (!studioData) return;

    setIsSaving(true);
    try {
      // TODO: Implement save to library using SongService
      // For now, just show success message
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Track saved to library! 📚');
    } catch (error) {
      toast.error('Failed to save track');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle download
   */
  const handleDownloadTrack = async () => {
    if (!studioData) return;

    try {
      const response = await fetch(studioData.audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${studioData.title}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Track downloaded! ⬇️');
    } catch (error) {
      toast.error('Failed to download track');
      console.error('Download error:', error);
    }
  };

  /**
   * Handle back to creation mode
   */
  const handleBackToCreation = () => {
    setIsStudioMode(false);
    setStudioData(null);
    setStudioError('');
    setPrompt('');
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-border/40 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <AppLogo size="lg" />
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {!isStudioMode ? (
          // ==================== CREATION MODE ====================
          <motion.div
            key="creation-mode"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4"
          >
            <div className="w-full max-w-3xl space-y-8">
              {/* Welcome Section */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center space-y-2"
              >
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Create Your Sound
                </h1>
                <p className="text-muted-foreground text-lg">
                  Describe your track idea and let AI bring it to life
                </p>
              </motion.div>

              {/* BPM Slider */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <BPMSlider
                  genre={selectedGenre}
                  bpm={bpm}
                  onBPMChange={setBpm}
                  disabled={isGenerating}
                />
              </motion.div>

              {/* Prompt Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <PromptBox
                  value={prompt}
                  onChange={setPrompt}
                  onSubmit={handleGenerateTrack}
                  loading={isGenerating}
                  disabled={isGenerating}
                />
              </motion.div>

              {/* Preset Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-2 mb-3">
                    Quick Presets
                  </p>
                </div>
                <PresetButtons
                  onPresetSelect={handlePresetSelect}
                  disabled={isGenerating}
                />
              </motion.div>

              {/* Mood Presets */}
              <MoodPresets
                selected={selectedMood}
                onSelect={setSelectedMood}
                disabled={isGenerating}
              />

              {/* Language Presets */}
              <LanguagePresets
                selected={selectedLanguage}
                onSelect={setSelectedLanguage}
                disabled={isGenerating}
              />

              {/* Error Display */}
              {creationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-destructive/10 border border-destructive/50 rounded-2xl flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80">{creationError}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          // ==================== STUDIO MODE ====================
          <motion.div
            key="studio-mode"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {studioData && (
              <StudioView
                data={studioData}
                onBPMChange={(newBpm) => {
                  setBpm(newBpm);
                  if (studioData) {
                    setStudioData({ ...studioData, bpm: newBpm });
                  }
                }}
                onMoodChange={(mood) => {
                  setSelectedMood(mood);
                  if (studioData) {
                    setStudioData({ ...studioData, mood });
                  }
                }}
                onLanguageChange={(lang) => {
                  setSelectedLanguage(lang);
                  if (studioData) {
                    setStudioData({ ...studioData, language: lang });
                  }
                }}
                onRegenerate={handleRegenerate}
                onBack={handleBackToCreation}
                onDownload={handleDownloadTrack}
                isSaving={isSaving}
                isRegenerating={isRegenerating}
                error={studioError}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden audio element for direct playback */}
      <audio ref={audioRef} crossOrigin="anonymous" />
    </div>
  );
}
