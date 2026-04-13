import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Download, Volume2, Volume1, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AudioPlayerProps {
  src: string;
  title: string;
  genre?: string;
  bpm?: number;
  duration?: number;
  onDownload?: () => void;
  isLoading?: boolean;
}

export function AudioPlayer({
  src,
  title,
  genre = 'AI Generated',
  bpm = 120,
  duration = 0,
  onDownload,
  isLoading = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !totalTime) {
        setTotalTime(audio.duration);
      }
    };

    const updateEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', updateEnded);
    audio.addEventListener('loadedmetadata', () => {
      setTotalTime(audio.duration);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', updateEnded);
      audio.removeEventListener('loadedmetadata', () => {});
    };
  }, [totalTime]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Handle volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const progressPercent = (currentTime / totalTime) * 100 || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-xl overflow-hidden">
        {/* Song Info */}
        <div className="p-6 pb-4 space-y-2">
          <h2 className="text-xl font-bold truncate">{title}</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="px-3 py-1 bg-primary/10 rounded-full">{genre}</span>
            <span className="flex items-center gap-1">♫ {bpm} BPM</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={totalTime || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={!src || isLoading}
              className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span>{formatTime(totalTime)}</span>
          </div>

          {/* Progress visual */}
          <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.1 }}
              className="h-full bg-gradient-to-r from-primary via-accent to-primary"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 pt-4 flex items-center gap-4">
          {/* Play Button */}
          <motion.button
            whileHover={!isLoading && src ? { scale: 1.1 } : {}}
            whileTap={!isLoading && src ? { scale: 0.95 } : {}}
            onClick={togglePlayPause}
            disabled={!src || isLoading}
            className="p-3 rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </motion.button>

          {/* Volume Control */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowVolume(!showVolume)}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            >
              {volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </motion.button>

            {/* Volume Slider */}
            {showVolume && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-background border border-border rounded-lg p-2 shadow-lg"
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </motion.div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Download Button */}
          {onDownload && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDownload}
              disabled={isLoading}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download audio"
            >
              <Download className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </Card>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} crossOrigin="anonymous" />
    </motion.div>
  );
}
