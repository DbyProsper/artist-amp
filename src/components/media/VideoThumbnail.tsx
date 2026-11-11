import { useRef, useState } from 'react';

interface VideoThumbnailProps {
  src: string;
  poster?: string;
  alt?: string;
  className?: string;
}

export function VideoThumbnail({ src, poster, alt = 'Video thumbnail', className = '' }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  const youtubeId = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)?.[1];
  return (
    <div className={`relative overflow-hidden bg-black ${className}`} aria-label={alt}>
      {youtubeId ? <img src={poster || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt={alt} className="h-full w-full object-cover" /> : <>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        className={`h-full w-full object-cover transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (!video) return;
          if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(1, video.duration / 3);
          else setReady(true);
        }}
        onSeeked={() => setReady(true)}
      />
      {!ready && poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {!ready && !poster && <div className="absolute inset-0 animate-pulse bg-muted" />}
      </>}
    </div>
  );
}
