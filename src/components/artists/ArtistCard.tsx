import { motion } from 'framer-motion';
import { Play, BadgeCheck } from 'lucide-react';
import { Artist } from '@/types';
import { cn } from '@/lib/utils';

interface ArtistCardProps {
  artist: Artist;
  variant?: 'default' | 'compact' | 'featured';
  onClick?: () => void;
  isFollowing?: boolean;
  onFollow?: () => void;
  showFollow?: boolean;
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function ArtistCard({ artist, variant = 'default', onClick, isFollowing = false, onFollow, showFollow = false }: ArtistCardProps) {
  if (variant === 'compact') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        role="button"
        tabIndex={0}
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors w-full cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <img
            src={artist.avatar}
            alt={artist.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm truncate">{artist.name}</span>
            {artist.isVerified && (
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
            )}
          </div>
          <span className="block truncate text-xs text-muted-foreground">{artist.genres.length ? artist.genres.join(' • ') : 'Artist'}</span>
          <span className="text-xs text-muted-foreground">{formatCount(artist.followers)} followers</span>
        </div>
        {showFollow && <button onClick={(event) => { event.stopPropagation(); onFollow?.(); }} className={cn('px-4 py-1.5 rounded-full text-sm font-medium', isFollowing ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground')}>
          {isFollowing ? 'Following' : 'Follow'}
        </button>}
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="relative mx-auto aspect-square w-full max-w-56 overflow-hidden rounded-2xl group cursor-pointer"
      >
        <img
          src={artist.coverImage}
          alt={artist.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30">
              <img
                src={artist.avatar}
                alt={artist.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-white">{artist.name}</span>
                {artist.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                )}
              </div>
              <span className="text-xs text-white/70">{artist.genres.join(' • ')}</span>
            </div>
          </div>
          <p className="text-sm text-white/80 line-clamp-2">{artist.bio}</p>
        </div>
        
        {/* Play button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4"
        >
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center glow-primary">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card-gradient rounded-2xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden gradient-border">
          <img
            src={artist.avatar}
            alt={artist.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold truncate">{artist.name}</span>
            {artist.isVerified && (
              <BadgeCheck className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" />
            )}
          </div>
          <span className="text-sm text-muted-foreground block truncate">
            {artist.genres.join(' • ')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatCount(artist.followers)} followers
          </span>
        </div>
      </div>
    </motion.div>
  );
}
