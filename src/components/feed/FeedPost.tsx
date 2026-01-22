import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Bookmark, 
  Play, Pause, MoreHorizontal, BadgeCheck 
} from 'lucide-react';
import { Post } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface FeedPostProps {
  post: Post;
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function FeedPost({ post }: FeedPostProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [likes, setLikes] = useState(post.likes);
  const { currentTrack, isPlaying, playTrack, pauseTrack, resumeTrack } = usePlayer();

  const isCurrentTrack = post.track && currentTrack?.id === post.track.id;

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikes(isLiked ? likes - 1 : likes + 1);
  };

  const handlePlay = () => {
    if (!post.track) return;
    if (isCurrentTrack) {
      isPlaying ? pauseTrack() : resumeTrack();
    } else {
      playTrack(post.track);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden gradient-border">
            <img
              src={post.artist.avatar}
              alt={post.artist.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm">{post.artist.name}</span>
              {post.artist.isVerified && (
                <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(post.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-muted transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      {post.type === 'audio' && post.track && (
        <div className="relative aspect-square mx-4 rounded-2xl overflow-hidden group">
          <img
            src={post.track.coverArt}
            alt={post.track.title}
            className="w-full h-full object-cover"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Play button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePlay}
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center",
              isCurrentTrack && isPlaying && "animate-pulse"
            )}>
              {isCurrentTrack && isPlaying ? (
                <Pause className="w-7 h-7 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
              )}
            </div>
          </motion.button>
          
          {/* Track info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="font-bold text-white">{post.track.title}</p>
            <p className="text-sm text-white/70">{formatCount(post.track.plays)} plays</p>
          </div>
          
          {/* Currently playing indicator */}
          {isCurrentTrack && isPlaying && (
            <div className="absolute top-4 right-4">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: [8, 16, 8] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleLike}
            className="flex items-center gap-1"
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-colors",
                isLiked ? "text-red-500 fill-red-500" : "text-foreground"
              )}
            />
          </motion.button>
          <button className="flex items-center gap-1">
            <MessageCircle className="w-6 h-6" />
          </button>
          <button className="flex items-center gap-1">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => setIsSaved(!isSaved)}
        >
          <Bookmark
            className={cn(
              "w-6 h-6 transition-colors",
              isSaved ? "text-primary fill-primary" : "text-foreground"
            )}
          />
        </motion.button>
      </div>

      {/* Likes & Caption */}
      <div className="px-4 pb-4 space-y-2">
        <p className="font-semibold text-sm">{formatCount(likes)} likes</p>
        <p className="text-sm">
          <span className="font-semibold">{post.artist.username}</span>{' '}
          <span className="text-muted-foreground">{post.caption}</span>
        </p>
        {post.comments > 0 && (
          <button className="text-sm text-muted-foreground">
            View all {formatCount(post.comments)} comments
          </button>
        )}
      </div>
    </motion.article>
  );
}
