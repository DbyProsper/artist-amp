import { motion } from 'framer-motion';
import { Play, MoreHorizontal } from 'lucide-react';
import { Track } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';

interface TrackRowProps {
  track: Track;
  index?: number;
  showIndex?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function TrackRow({ track, index, showIndex }: TrackRowProps) {
  const { currentTrack, isPlaying, playTrack, pauseTrack, resumeTrack } = usePlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isCurrentTrack) {
      isPlaying ? pauseTrack() : resumeTrack();
    } else {
      playTrack(track);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer",
        isCurrentTrack && "bg-muted/30"
      )}
      onClick={handlePlay}
    >
      {showIndex && (
        <div className="w-6 text-center">
          {isCurrentTrack && isPlaying ? (
            <div className="flex justify-center gap-0.5">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-primary rounded-full"
                  animate={{ height: [4, 12, 4] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          ) : (
            <span className={cn(
              "text-sm",
              isCurrentTrack ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {index}
            </span>
          )}
        </div>
      )}
      
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={track.coverArt}
          alt={track.title}
          className="w-full h-full object-cover"
        />
        <div className={cn(
          "absolute inset-0 bg-black/40 flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}>
          <Play className="w-5 h-5 text-white" fill="currentColor" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate",
          isCurrentTrack && "text-primary"
        )}>
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {track.artist.name}
        </p>
      </div>
      
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="text-xs hidden sm:block">{formatCount(track.plays)}</span>
        <span className="text-xs">{formatDuration(track.duration)}</span>
        <button 
          className="p-1.5 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
