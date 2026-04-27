import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  ChevronUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export interface GlobalTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration?: number;
  lyrics?: string;
  imageUrl?: string;
}

interface GlobalMusicPlayerProps {
  currentTrack?: GlobalTrack | null;
  onTrackChange?: (track: GlobalTrack) => void;
  onClose?: () => void;
}

export function GlobalMusicPlayer({
  currentTrack,
  onTrackChange,
  onClose,
}: GlobalMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isExpanded, setIsExpanded] = useState(false);

  // Set audio source and play
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.play().catch(() => {
        console.log('Autoplay prevented');
      });
      setIsPlaying(true);
    }
  }, [currentTrack]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (newTime: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        crossOrigin="anonymous"
      />

      {/* Collapsed player - sticky at bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border/40 backdrop-blur-lg bg-card/80"
      >
        <div className="max-w-full mx-auto px-4 py-3">
          {/* Progress bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentTrack.title}</p>
              {currentTrack.artist && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack.artist}
                </p>
              )}
            </div>

            {/* Time Display */}
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                size="sm"
                variant="ghost"
                onClick={togglePlayPause}
                className="h-8 w-8"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2 min-w-fit">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() =>
                    setVolume(volume === 0 ? 0.8 : 0)
                  }
                >
                  {volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => setVolume(v[0])}
                  className="w-20 cursor-pointer"
                />
              </div>

              {/* Expand */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(true)}
                className="h-8 w-8"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>

              {/* Close */}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Expanded player - fullscreen modal */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-50 max-h-screen bg-gradient-to-b from-card to-background rounded-t-3xl p-6 space-y-6"
          >
            {/* Close Button */}
            <div className="flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronUp className="w-5 h-5" />
              </Button>
            </div>

            {/* Artwork or Lyrics Display */}
            {currentTrack.imageUrl ? (
              <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center overflow-hidden">
                <img
                  src={currentTrack.imageUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : currentTrack.lyrics ? (
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center p-4 overflow-y-auto">
                <p className="text-sm text-center text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {currentTrack.lyrics}
                </p>
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center">
                <span className="text-muted-foreground">🎵</span>
              </div>
            )}

            {/* Track Info */}
            <div className="text-center">
              <h2 className="text-2xl font-bold">{currentTrack.title}</h2>
              {currentTrack.artist && (
                <p className="text-muted-foreground mt-1">{currentTrack.artist}</p>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-8">
              {/* Skip Back */}
              <Button
                size="lg"
                variant="ghost"
                className="h-12 w-12 rounded-full"
              >
                <SkipBack className="w-6 h-6" />
              </Button>

              {/* Play/Pause - Large */}
              <Button
                size="lg"
                onClick={togglePlayPause}
                className="h-16 w-16 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8" />
                )}
              </Button>

              {/* Skip Forward */}
              <Button
                size="lg"
                variant="ghost"
                className="h-12 w-12 rounded-full"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-4">
              {volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={(v) => setVolume(v[0])}
                className="flex-1 cursor-pointer"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
