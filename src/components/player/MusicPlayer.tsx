import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Repeat1, Volume2, 
  ChevronDown, Heart, Share2, MoreHorizontal,
  ListMusic, X
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { PlayerSettingsModal } from '@/components/modals/PlayerSettingsModal';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Extract dominant color from image (simplified - returns theme color)
function useDominantColor(imageUrl: string) {
  // In a real app, we'd use a color extraction library
  // For now, return a themed gradient
  return 'hsl(330, 85%, 60%)';
}

export function MiniPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    pauseTrack, 
    resumeTrack, 
    setExpanded,
    progress,
    isMiniPlayerVisible,
    closeMiniPlayer
  } = usePlayer();
  const { user } = useAuth();

  // Only show mini player when user is signed in and has a track
  if (!currentTrack || !isMiniPlayerVisible || !user) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-16 left-0 right-0 z-40 glass border-t border-border mx-2 rounded-xl overflow-hidden"
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <motion.div 
          className="h-full bg-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-center gap-3 p-3">
        {/* Album art - no spinning */}
        <motion.div 
          className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer shadow-lg"
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(true)}
        >
          <img 
            src={currentTrack.coverArt} 
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Track info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={() => setExpanded(true)}
        >
          <p className="font-medium text-sm truncate">{currentTrack.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {currentTrack.artist.name}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              isPlaying ? pauseTrack() : resumeTrack();
            }}
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Pause className="w-5 h-5" fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Play className="w-5 h-5" fill="currentColor" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <button 
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              closeMiniPlayer();
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function FullPlayer() {
  const {
    currentTrack,
    isPlaying,
    isExpanded,
    progress,
    volume,
    isShuffled,
    repeatMode,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    setExpanded,
    setProgress,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  if (!currentTrack || !user) return null;

  const currentTime = (progress / 100) * currentTrack.duration;

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
        >
          {/* Dynamic background based on album art */}
          <div className="absolute inset-0 -z-10">
            <img
              src={currentTrack.coverArt}
              alt=""
              className="w-full h-full object-cover scale-110 blur-3xl opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 safe-top">
            <button
              onClick={() => setExpanded(false)}
              className="p-2 rounded-full hover:bg-muted/50 transition-colors"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              NOW PLAYING
            </span>
            <button 
              className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              onClick={() => setShowSettings(true)}
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>

          {/* Album Art - No spinning, just scale animation */}
          <div className="flex-1 flex items-center justify-center px-8">
            <motion.div
              className={cn(
                "w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl"
              )}
              animate={{ 
                scale: isPlaying ? 1 : 0.95,
              }}
              transition={{ 
                scale: { duration: 0.3 },
              }}
            >
              <img
                src={currentTrack.coverArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          {/* Track Info */}
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold truncate">{currentTrack.title}</h2>
                <p className="text-lg text-muted-foreground truncate">
                  {currentTrack.artist.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsLiked(!isLiked)}
                  className="p-3 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <Heart 
                    className={cn("w-6 h-6", isLiked && "text-red-500")} 
                    fill={isLiked ? "currentColor" : "none"}
                  />
                </motion.button>
                <button className="p-3 rounded-full hover:bg-muted/50 transition-colors">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 py-2">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={([value]) => setProgress(value)}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-6 py-6">
            <button
              onClick={toggleShuffle}
              className={cn(
                "p-3 rounded-full transition-colors",
                isShuffled ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            
            <button
              onClick={previousTrack}
              className="p-3 rounded-full hover:bg-muted/50 transition-colors"
            >
              <SkipBack className="w-7 h-7" fill="currentColor" />
            </button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => isPlaying ? pauseTrack() : resumeTrack()}
              className="w-16 h-16 rounded-full bg-primary flex items-center justify-center glow-primary"
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                  >
                    <Pause className="w-7 h-7 text-primary-foreground" fill="currentColor" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -180 }}
                  >
                    <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            
            <button
              onClick={nextTrack}
              className="p-3 rounded-full hover:bg-muted/50 transition-colors"
            >
              <SkipForward className="w-7 h-7" fill="currentColor" />
            </button>
            
            <button
              onClick={toggleRepeat}
              className={cn(
                "p-3 rounded-full transition-colors",
                repeatMode !== 'off' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Volume & Queue */}
          <div className="flex items-center justify-between px-8 pb-8 safe-bottom">
            <div className="flex items-center gap-3 w-32">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={([value]) => setVolume(value)}
                className="flex-1"
              />
            </div>
            <button className="p-3 rounded-full hover:bg-muted/50 transition-colors">
              <ListMusic className="w-5 h-5" />
            </button>
          </div>

          {/* Settings Modal */}
          <PlayerSettingsModal
            track={currentTrack}
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
