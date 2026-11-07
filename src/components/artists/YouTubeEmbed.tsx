import { useState } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Play, ExternalLink } from 'lucide-react';

interface YouTubeEmbedProps {
  channelUrl: string;
  artistName: string;
}

function buildEmbedUrl(url: string): string | null {
  const playlist = url.match(/[?&]list=([\w-]+)/)?.[1];
  if (playlist) return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlist)}`;
  const video = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)?.[1];
  if (video) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}`;
  const channelMatch = url.match(/\/channel\/(UC[\w-]+)/);
  if (channelMatch) return `https://www.youtube-nocookie.com/embed/videoseries?list=UU${channelMatch[1].slice(2)}`;
  const handleMatch = url.match(/\/@([\w-]+)/);
  if (handleMatch) return `https://www.youtube-nocookie.com/embed?listType=user_uploads&list=${encodeURIComponent(handleMatch[1])}`;
  const userMatch = url.match(/\/user\/([\w-]+)/);
  if (userMatch) return `https://www.youtube-nocookie.com/embed?listType=user_uploads&list=${encodeURIComponent(userMatch[1])}`;
  return null;
}

export function YouTubeEmbed({ channelUrl, artistName }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const iframeUrl = buildEmbedUrl(channelUrl);
  
  if (!iframeUrl) {
    return (
      <div className="rounded-xl bg-muted/30 p-6 text-center">
        <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">YouTube channel not available</p>
      </div>
    );
  }

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
        
        {isLoaded && <iframe title={`${artistName}'s YouTube videos`} src={iframeUrl} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
      </motion.div>
    </div>
  );
}
