import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ChevronLeft, ChevronRight, BadgeCheck, MessageCircle, Pause, Play } from 'lucide-react';
import { Story } from '@/types';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';
import { PostCommentsModal } from '@/components/feed/PostCommentsModal';
import { formatDistanceToNow } from 'date-fns';
import { aspectRatioValue, socialFilter } from '@/types/socialEditor';
import { loadStoryState, markStoryViewed, persistStoryLike } from '@/services/backendPersistenceService';

interface StoryViewerProps { stories: Story[]; initialIndex: number; onClose: () => void; }

const DEFAULT_IMAGE_STORY_DURATION = 10;
const MAX_STORY_DURATION = 60;

export function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const clipEndRef = useRef(MAX_STORY_DURATION);
  const { user, profile } = useAuth();
  const currentStory = stories[currentIndex];
  const musicStart = Math.max(0, Number(currentStory?.attachedMusicData?.clipStart) || 0);
  const musicEnd = Math.max(musicStart + 15, Math.min(musicStart + MAX_STORY_DURATION, Number(currentStory?.attachedMusicData?.clipEnd) || musicStart + 15));
  const imageDurationMs = (currentStory?.attachedMusicData?.audioUrl ? musicEnd - musicStart : DEFAULT_IMAGE_STORY_DURATION) * 1000;

  const handleNext = useCallback(() => {
    if (currentIndex >= stories.length - 1) { onClose(); return; }
    setCurrentIndex(currentIndex + 1);
    setProgress(0); setIsLiked(false); setIsPaused(false);
  }, [currentIndex, onClose, stories.length]);

  const handlePrev = () => {
    if (currentIndex <= 0) return;
    setCurrentIndex(index => index - 1); setProgress(0); setIsLiked(false); setIsPaused(false);
  };

  useEffect(() => {
    setProgress(0); setIsPaused(false);
  }, [currentIndex, currentStory?.videoUrl]);

  useEffect(() => {
    if (showComments || isPaused || currentStory?.videoUrl) return;
    const timer = window.setInterval(() => {
      setProgress(previous => {
        const next = previous + (100 * 100) / imageDurationMs;
        if (next >= 100) { window.setTimeout(handleNext, 0); return 100; }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [currentStory?.videoUrl, handleNext, imageDurationMs, isPaused, showComments]);

  useEffect(() => {
    if (!user || !currentStory) { setIsLiked(false); return; }
    loadStoryState(currentStory.id).then(state => setIsLiked(state.liked)).catch(() => undefined);
  }, [currentStory, user]);

  useEffect(() => {
    if (!user || !currentStory) return;
    window.dispatchEvent(new CustomEvent('musicinsta:story-viewed', { detail: { storyId: currentStory.id } }));
    void markStoryViewed(currentStory.id, profile?.id || user.uid, profile?.name || user.displayName || 'MusicInsta user').catch(() => undefined);
  }, [currentStory?.id, profile?.id, profile?.name, user]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused || showComments) video.pause();
    else void video.play().catch(() => setIsPaused(true));
  }, [isPaused, showComments, currentIndex]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (isPaused || showComments) music.pause(); else void music.play().catch(() => undefined);
  }, [currentIndex, isPaused, showComments]);

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like stories'); return; }
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    if (nextLiked) toast.success('Story liked.');
    try { await persistStoryLike(currentStory.id, nextLiked, profile?.id || user.uid, profile?.name || user.displayName || 'MusicInsta user'); }
    catch { setIsLiked(!nextLiked); toast.error('The story like could not be saved.'); }
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
        <div className="absolute left-4 right-4 top-4 z-30 flex gap-1">
          {stories.map((_, index) => <div key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"><motion.div className="h-full rounded-full bg-white" animate={{ width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%' }} /></div>)}
        </div>
        <button onClick={onClose} aria-label="Close stories" className="absolute right-4 top-12 z-30 rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"><X className="h-6 w-6 text-white" /></button>

        <div className="relative mx-auto flex h-full w-full max-w-md items-center justify-center overflow-hidden">
          <div className="relative max-h-full w-full overflow-hidden" style={currentStory.aspectRatio && currentStory.aspectRatio !== 'original' ? { aspectRatio: aspectRatioValue(currentStory.aspectRatio as Parameters<typeof aspectRatioValue>[0]) } : { height: '100%' }}>
          {currentStory.videoUrl ? <video key={currentStory.id} ref={videoRef} src={currentStory.videoUrl} poster={currentStory.imageUrl} autoPlay muted={Boolean(currentStory.attachedMusicData?.audioUrl)} playsInline style={{ filter: socialFilter(currentStory.visualAdjustments) }} className="h-full w-full object-contain" onLoadedMetadata={event => { const video = event.currentTarget; const start = Math.max(0, Math.min(currentStory.clipStart || 0, video.duration)); const requestedEnd = currentStory.clipEnd ?? start + MAX_STORY_DURATION; clipEndRef.current = Math.min(video.duration, start + MAX_STORY_DURATION, Math.max(start, requestedEnd)); video.currentTime = start; setProgress(0); }} onTimeUpdate={event => { const start = currentStory.clipStart || 0; const end = clipEndRef.current; const elapsed = Math.max(0, event.currentTarget.currentTime - start); setProgress(Math.min(100, elapsed / Math.max(.1, end - start) * 100)); if (event.currentTarget.currentTime >= end - .05) handleNext(); }} onEnded={handleNext} /> : <img src={currentStory.imageUrl} alt={`${currentStory.artist.name}'s story`} style={{ filter: socialFilter(currentStory.visualAdjustments) }} className="h-full w-full object-contain" />}
          {currentStory.drawingOverlay && <img src={currentStory.drawingOverlay} alt="" className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain" />}
          {(currentStory.visualAdjustments?.vignette || 0) > 0 && <div className="pointer-events-none absolute inset-0 z-10" style={{ boxShadow: `inset 0 0 ${30 + currentStory.visualAdjustments!.vignette * 1.4}px rgba(0,0,0,${currentStory.visualAdjustments!.vignette / 130})` }} />}
          {(currentStory.visualAdjustments?.tiltShift || 0) > 0 && <div className="pointer-events-none absolute inset-0 z-10 backdrop-blur-sm" style={{ clipPath: `polygon(0 0,100% 0,100% ${Math.max(5, 45 - currentStory.visualAdjustments!.tiltShift / 3)}%,0 ${Math.max(5, 45 - currentStory.visualAdjustments!.tiltShift / 3)}%,0 ${Math.min(95, 55 + currentStory.visualAdjustments!.tiltShift / 3)}%,100% ${Math.min(95, 55 + currentStory.visualAdjustments!.tiltShift / 3)}%,100% 100%,0 100%)` }} />}
          {currentStory.mediaOverlays?.map(overlay => <div key={overlay.id} className="pointer-events-none absolute z-20 whitespace-pre-wrap text-center font-bold drop-shadow-lg" style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`, color: overlay.color, fontSize: overlay.type === 'sticker' ? 42 : 24 }}>{overlay.content}</div>)}
          </div>
          {currentStory.attachedMusicData?.audioUrl && <audio key={`${currentStory.id}-music`} ref={musicRef} src={currentStory.attachedMusicData.audioUrl} autoPlay onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(musicStart, Math.max(0, event.currentTarget.duration - .1)); }} onTimeUpdate={event => { if (event.currentTarget.currentTime >= musicEnd - .05) { event.currentTarget.pause(); if (!currentStory.videoUrl) handleNext(); } }} />}

          <button onClick={() => setIsPaused(value => !value)} aria-label={isPaused ? 'Resume story' : 'Pause story'} className="absolute inset-x-[20%] inset-y-0 z-10 cursor-pointer">
            {isPaused && <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55"><Play className="h-8 w-8 fill-white text-white" /></span>}
          </button>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/60" />
          <div className="pointer-events-none absolute left-4 top-16 z-20 flex items-center gap-3"><div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white"><img src={currentStory.artist.avatar} alt={currentStory.artist.name} className="h-full w-full object-cover" /></div><div><div className="flex items-center gap-1"><span className="font-semibold text-white">{currentStory.artist.name}</span>{currentStory.artist.isVerified && <BadgeCheck className="h-4 w-4 text-primary" fill="currentColor" />}</div><span className="text-xs text-white/70">{currentStory.createdAt ? formatDistanceToNow(currentStory.createdAt, { addSuffix: true }) : 'Recently'}</span></div>{isPaused && <span className="ml-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white"><Pause className="h-3 w-3" />Paused</span>}</div>

          <button onClick={handlePrev} aria-label="Previous story" className="absolute inset-y-0 left-0 z-20 w-[20%]" />
          <button onClick={handleNext} aria-label="Next story" className="absolute inset-y-0 right-0 z-20 w-[20%]" />
          {currentIndex > 0 && <button onClick={handlePrev} aria-label="Previous story" className="absolute left-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70"><ChevronLeft className="h-6 w-6 text-white" /></button>}
          {currentIndex < stories.length - 1 && <button onClick={handleNext} aria-label="Next story" className="absolute right-4 top-1/2 z-30 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70"><ChevronRight className="h-6 w-6 text-white" /></button>}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleLike} className="absolute bottom-8 right-4 z-30 rounded-full bg-black/50 p-4 hover:bg-black/70"><Heart className={`h-8 w-8 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} /></motion.button>
          <button onClick={() => setShowComments(true)} className="absolute bottom-8 right-24 z-30 rounded-full bg-black/50 p-4 hover:bg-black/70"><MessageCircle className="h-8 w-8 text-white" /></button>
          <div className="pointer-events-none absolute bottom-8 left-4 right-44 z-20"><p className="font-medium text-white">{currentStory.caption || '🔥 New music dropping soon! Stay tuned...'}</p>{currentStory.attachedMusic && <p className="mt-1 text-sm text-white/75">♫ {currentStory.attachedMusic}</p>}</div>
        </div>
        <PostCommentsModal postId={currentStory.id} ownerId={currentStory.artist.id} open={showComments} onClose={() => setShowComments(false)} />
      </motion.div>
    </AnimatePresence>
  );
}
