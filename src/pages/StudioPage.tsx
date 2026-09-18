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
import { AudioEnhancementPanel } from '@/components/studio/AudioEnhancementPanel';
import { GenerationHistory } from '@/components/studio/GenerationHistory';
import { ResultDisplayModal } from '@/components/studio/ResultDisplayModal';
import { ImageEditorModal } from '@/components/studio/ImageEditorModal';
import { downloadAudio } from '@/lib/audioUtils';
import { saveEditedImage } from '@/services/imageEditorService';
import { EditorOverlay } from '@/types/imageEditor';
import { usePlayer } from '@/context/PlayerContext';
import type { Track } from '@/types';
import { addDoc, arrayUnion, collection, getDocs, getDoc, query, serverTimestamp, setDoc, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storeDawAudio } from '@/lib/dawTransfer';

// Import for genre mapping
const GENRE_PRESETS = {
  'afrosoul-live': 'afrosoul',
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
  const { openInMainPlayer, duration: playerDuration } = usePlayer();

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
  const [generationMode, setGenerationMode] = useState<'clip' | 'full'>('clip');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');

  // ==================== OUTPUT STATE ====================
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // ==================== HISTORY STATE ====================
  const [history, setHistory] = useState<GeneratedItem[]>([]);
  const [studioStateLoaded, setStudioStateLoaded] = useState(false);

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
  const [savedTrackId, setSavedTrackId] = useState<string | null>(null);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playlistChoices, setPlaylistChoices] = useState<Array<{ id: string; name: string }>>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const toPlayerTrack = (id: string, title: string, audioUrl: string, lyrics?: string, imageUrl?: string): Track => ({
    id,
    title,
    artist: {
      id: profile?.id || user?.uid || 'studio',
      name: profile?.name || user?.displayName || 'MusicInsta Studio',
      username: profile?.username || 'studio',
      avatar: profile?.avatar_url || '/placeholder.svg',
      coverImage: profile?.cover_url || '/placeholder.svg',
      bio: '', location: '', genres: [selectedGenre], isVerified: Boolean(profile?.is_verified), followers: 0, following: 0, tracks: 0,
    },
    coverArt: imageUrl || '/placeholder.svg',
    duration: 0,
    plays: 0,
    likes: 0,
    audioUrl,
    lyrics,
  });

  // Load the local cache immediately, then replace it with the authenticated
  // cloud state so Studio work follows the user to another device.
  useEffect(() => {
    const load = async () => {
      const remote = user ? await getDoc(doc(db, 'studio_states', user.uid)).catch(() => null) : null;
      let localState = null;
      try { localState = JSON.parse(localStorage.getItem('studio_state') || 'null'); } catch { localStorage.removeItem('studio_state'); }
      const saved = remote?.exists() ? remote.data() : localState;
      if (saved) {
      try {
        const parsed = (saved.history || []).map((item: any) => ({
          ...item,
          createdAt: item.createdAt?.toDate?.() || new Date(item.createdAt),
        }));
        setHistory(parsed);
        if (typeof saved.showEntry === 'boolean') setShowEntry(saved.showEntry);
        if (saved.currentFeature) setCurrentFeature(saved.currentFeature);
        if (saved.prompt) setPrompt(saved.prompt);
        if (saved.selectedGenre) setSelectedGenre(saved.selectedGenre);
        if (saved.selectedMood) setSelectedMood(saved.selectedMood);
        if (saved.selectedLanguage) setSelectedLanguage(saved.selectedLanguage);
        if (saved.bpm) setBpm(saved.bpm);
        if (saved.generationMode) setGenerationMode(saved.generationMode);
      } catch (e) {
        console.error('Failed to load history:', e);
      }
      }
      setStudioStateLoaded(true);
    };
    void load();
  }, [user]);

  useEffect(() => {
    if (!studioStateLoaded) return;
    const timer = window.setTimeout(() => {
      const state = JSON.parse(JSON.stringify({ history, showEntry, currentFeature, prompt, selectedGenre, selectedMood, selectedLanguage, bpm, generationMode }));
      localStorage.setItem('studio_state', JSON.stringify(state));
      document.cookie = 'musicinsta_studio_state=saved; max-age=31536000; path=/; SameSite=Lax';
      if (user) void setDoc(doc(db, 'studio_states', user.uid), { ...state, updated_at: serverTimestamp() }, { merge: true });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [history, showEntry, currentFeature, prompt, selectedGenre, selectedMood, selectedLanguage, bpm, generationMode, studioStateLoaded, user]);

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
    if (feature === 'daw') {
      navigate('/studio/daw');
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
    setSavedTrackId(null);

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
            generation_mode: generationMode,
            music_model: generationMode === 'full' ? 'lyria-3-pro' : 'lyria-3-clip',
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
        openInMainPlayer(toPlayerTrack(newItem.id, generatedTitle || prompt, finalAudioUrl, finalLyrics, finalImageUrl));
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
      return undefined;
    }

    if (!user?.uid || !profile?.id) {
      toast.error('Please sign in to save tracks');
      return undefined;
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
        return undefined;
      }

      // Save to Firebase using the aiMusicStorage service
      const { track } = await saveGeneratedAudio(profile.id, {
        title: trackTitle,
        audio_url: generatedAudioUrl,
        cover_url: generatedImageUrl,
        duration: playerDuration || undefined,
      });

      toast.success('💾 Saved to library!');
      console.log('[Studio] Track saved:', track.id);
      setSavedTrackId(track.id);
      return track.id as string;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      toast.error(errorMessage);
      console.error('[Studio] Save track error:', error);
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };

  const openPlaylistPicker = async () => {
    if (!profile?.id) return;
    const snapshot = await getDocs(query(collection(db, 'playlists'), where('creator_id', '==', profile.id)));
    setPlaylistChoices(snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name || 'Untitled playlist') })));
    setShowPlaylistPicker(true);
  };

  const saveToPlaylist = async (playlistId?: string) => {
    if (!profile?.id) return;
    let targetId = playlistId;
    if (!targetId && newPlaylistName.trim()) {
      const created = await addDoc(collection(db, 'playlists'), { creator_id: profile.id, name: newPlaylistName.trim(), description: 'Created from MusicInsta Studio', is_public: false, tracks: [], created_at: new Date(), updated_at: new Date() });
      targetId = created.id;
    }
    if (!targetId) return;
    const trackId = savedTrackId || await handleSaveTrack();
    if (!trackId) return;
    await updateDoc(doc(db, 'playlists', targetId), { tracks: arrayUnion(trackId), updated_at: new Date() });
    setShowPlaylistPicker(false);
    setNewPlaylistName('');
    toast.success('Saved to playlist.');
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

  const transferGeneratedContent = async (destination: 'post' | 'daw') => {
    try {
      if (destination === 'daw' && !resultModalData.audioUrl) throw new Error('Generate audio before sending content to the DAW.');
      let sourceUrl = destination === 'daw' ? resultModalData.audioUrl : (resultModalData.audioUrl || resultModalData.imageUrl);
      let blob: Blob;
      let filename: string;
      if (sourceUrl) {
        const response = await fetch(sourceUrl); if (!response.ok) throw new Error('The generated file could not be prepared.');
        blob = await response.blob();
        filename = `${generatedTitle || currentFeature}-${Date.now()}.${blob.type.startsWith('image/') ? 'png' : 'wav'}`;
      } else if (resultModalData.lyrics) {
        const safeTitle = (generatedTitle || 'Generated lyrics').replace(/[<>&]/g, '');
        const preview = resultModalData.lyrics.split('\n').filter(Boolean).slice(0, 5).join(' · ').replace(/[<>&]/g, '');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#120712"/><stop offset="1" stop-color="#45103f"/></linearGradient></defs><rect width="1080" height="1080" fill="url(#g)"/><circle cx="880" cy="170" r="160" fill="#ec4899" opacity=".28"/><text x="80" y="130" fill="#ec4899" font-family="Arial" font-size="38" font-weight="700">MusicInsta Lyrics</text><text x="80" y="270" fill="white" font-family="Arial" font-size="70" font-weight="700">${safeTitle.slice(0, 24)}</text><foreignObject x="80" y="360" width="900" height="520"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#eee;font:34px Arial;line-height:1.5">${preview}</div></foreignObject></svg>`;
        blob = new Blob([svg], { type: 'image/svg+xml' }); filename = `${safeTitle}.svg`;
      } else throw new Error('There is no generated content to transfer.');
      const key = await storeDawAudio(blob, filename);
      setShowResultModal(false);
      if (destination === 'daw') navigate(`/studio/daw?importEnhanced=${key}`);
      else navigate(`/upload?fromDaw=${key}&title=${encodeURIComponent(generatedTitle || prompt || 'Generated content')}&caption=${encodeURIComponent(resultModalData.lyrics || prompt)}&lyrics=${encodeURIComponent(resultModalData.lyrics || '')}&genre=${encodeURIComponent(selectedGenre)}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The generated content could not be transferred.'); }
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
        ) : currentFeature === 'enhance' ? (
          <motion.div key="audio-enhancement">
            <AudioEnhancementPanel
              onBack={handleBackToEntry}
              generatedAudioUrl={generatedAudioUrl || undefined}
              generatedTracks={history.filter((item) => item.audioUrl).map((item) => ({
                id: item.id,
                title: item.title,
                prompt: item.prompt,
                audioUrl: item.audioUrl,
                createdAt: item.createdAt,
              }))}
              userTier={profile?.tier === 'premium' ? 'premium' : 'free'}
              profileId={profile?.id}
            />
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
              generationMode={generationMode}
              onGenerationModeChange={setGenerationMode}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              error={generationError}
              buttonText={getButtonText()}
              promptPlaceholder={promptPlaceholder}
              generatedTitle={generatedTitle}
              onTitleChange={setGeneratedTitle}
              audioUrl={generatedAudioUrl || undefined}
              onPlayToggle={() => {
                if (generatedAudioUrl) openInMainPlayer(toPlayerTrack(`studio-${Date.now()}`, generatedTitle || prompt || 'Generated Track', generatedAudioUrl, generatedLyrics || undefined, generatedImageUrl || undefined));
              }}
              onDownload={handleDownloadTrack}
              onSave={handleSaveTrack}
              onSaveToPlaylist={openPlaylistPicker}
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
                  setShowResultModal(true);
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
          openInMainPlayer(toPlayerTrack(Date.now().toString(), resultModalData.prompt, audioUrl, resultModalData.lyrics, resultModalData.imageUrl));
        }}
        onReuse={(prompt) => {
          setPrompt(prompt);
          setShowResultModal(false);
        }}
        onEditImage={handleOpenImageEditor}
        onCreatePost={() => void transferGeneratedContent('post')}
        onSendToDaw={resultModalData.audioUrl ? () => void transferGeneratedContent('daw') : undefined}
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

      {showPlaylistPicker && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" onClick={() => setShowPlaylistPicker(false)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-5" onClick={event => event.stopPropagation()}>
            <h2 className="text-lg font-bold">Save to playlist</h2>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {playlistChoices.map(playlist => <Button key={playlist.id} variant="outline" className="w-full justify-start" onClick={() => saveToPlaylist(playlist.id)}>{playlist.name}</Button>)}
            </div>
            <div className="flex gap-2"><Input value={newPlaylistName} onChange={event => setNewPlaylistName(event.target.value)} placeholder="New playlist name" /><Button disabled={!newPlaylistName.trim()} onClick={() => saveToPlaylist()}>Create & save</Button></div>
            <Button variant="ghost" className="w-full" onClick={() => setShowPlaylistPicker(false)}>Cancel</Button>
          </div>
        </div>
      )}

    </div>
  );
}
