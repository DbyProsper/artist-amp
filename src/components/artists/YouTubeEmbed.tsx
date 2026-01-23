import { useState } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YouTubeEmbedProps {
  channelUrl: string;
  artistName: string;
}

// Extract channel ID from various YouTube URL formats
function extractChannelId(url: string): string | null {
  // Handle /channel/UCxxxxxx format
  const channelMatch = url.match(/\/channel\/(UC[\w-]+)/);
  if (channelMatch) return channelMatch[1];
  
  // Handle /@username format
  const handleMatch = url.match(/\/@([\w-]+)/);
  if (handleMatch) return handleMatch[1];
  
  return null;
}

export function YouTubeEmbed({ channelUrl, artistName }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const channelId = extractChannelId(channelUrl);
  
  if (!channelId) {
    return (
      <div className="rounded-xl bg-muted/30 p-6 text-center">
        <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">YouTube channel not available</p>
      </div>
    );
  }

  // Use channel ID for embed - show channel videos
  const embedUrl = channelId.startsWith('UC') 
    ? `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}`
    : `https://www.youtube.com/embed?listType=playlist&list=UU${channelId.slice(2)}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
            <Youtube className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-semibold text-sm">YouTube Channel</span>
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        >
          View Channel
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative aspect-video rounded-xl overflow-hidden bg-muted/30"
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/10">
            <button
              onClick={() => setIsLoaded(true)}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Load {artistName}'s Videos
              </span>
            </button>
          </div>
        )}
        
        {isLoaded && (
          <iframe
            src={`https://www.youtube.com/embed/videoseries?list=UU${channelId.slice(2)}&autoplay=0`}
            title={`${artistName}'s YouTube Channel`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </motion.div>
      
      {/* Quick video links */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 text-xs"
          onClick={() => window.open(`${channelUrl}/videos`, '_blank')}
        >
          All Videos
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 text-xs"
          onClick={() => window.open(`${channelUrl}/playlists`, '_blank')}
        >
          Playlists
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 text-xs"
          onClick={() => window.open(`${channelUrl}/community`, '_blank')}
        >
          Community
        </Button>
      </div>
    </div>
  );
}