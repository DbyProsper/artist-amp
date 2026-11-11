import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Youtube, Play, ExternalLink, SquarePlus } from "lucide-react";
import { API_BASE } from "@/config/api";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "@/context/PlayerContext";
import type { Artist, Track } from "@/types";

interface YouTubeEmbedProps {
  channelUrl: string;
  artistName: string;
}

function buildEmbedUrl(url: string): string | null {
  const playlist = url.match(/[?&]list=([\w-]+)/)?.[1];
  if (playlist)
    return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlist)}`;
  const video = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/,
  )?.[1];
  if (video)
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video)}`;
  const channelMatch = url.match(/\/channel\/(UC[\w-]+)/);
  if (channelMatch)
    return `https://www.youtube-nocookie.com/embed/videoseries?list=UU${channelMatch[1].slice(2)}`;
  return null;
}

export function YouTubeEmbed({ channelUrl, artistName }: YouTubeEmbedProps) {
  const navigate = useNavigate();
  const { openInMainPlayer } = usePlayer();
  const [isLoaded, setIsLoaded] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(() =>
    buildEmbedUrl(channelUrl),
  );
  const [resolveError, setResolveError] = useState("");
  const [videos, setVideos] = useState<Array<{ id: string; title: string; artistOrChannel: string; thumbnail: string }>>([]);

  useEffect(() => {
    const direct = buildEmbedUrl(channelUrl);
    if (direct) {
      setIframeUrl(direct);
      setResolveError("");
      return;
    }
    const controller = new AbortController();
    setIframeUrl(null);
    setResolveError("");
    void fetch(
      `${API_BASE}/youtube/channel?url=${encodeURIComponent(channelUrl)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.detail || "Channel unavailable");
        const base =
          value.kind === "video" ? "embed" : "embed/videoseries?list=";
        setIframeUrl(
          value.kind === "video"
            ? `https://www.youtube-nocookie.com/${base}/${encodeURIComponent(value.id)}`
            : `https://www.youtube-nocookie.com/${base}${encodeURIComponent(value.id)}`,
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setResolveError(error.message);
      });
    return () => controller.abort();
  }, [channelUrl]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${API_BASE}/youtube/channel/videos?url=${encodeURIComponent(channelUrl)}&max_results=12`, { signal: controller.signal })
      .then(async response => { const value = await response.json(); if (!response.ok) throw new Error(value.detail || 'Videos unavailable'); setVideos(Array.isArray(value.videos) ? value.videos : []); })
      .catch(error => { if (error.name !== 'AbortError') console.warn('YouTube channel video list unavailable', error); });
    return () => controller.abort();
  }, [channelUrl]);

  const playVideo = (selected: typeof videos[number]) => {
    const artist: Artist = { id: `youtube-channel-${selected.artistOrChannel}`, name: selected.artistOrChannel || artistName, username: selected.artistOrChannel || artistName, avatar: selected.thumbnail, coverImage: selected.thumbnail, bio: 'YouTube artist', location: 'YouTube', genres: [], isVerified: false, followers: 0, following: 0, tracks: videos.length };
    const queue: Track[] = videos.map(video => ({ id: `youtube-${video.id}`, title: video.title, artist: { ...artist, id: `youtube-channel-${video.artistOrChannel}`, name: video.artistOrChannel || artistName }, coverArt: video.thumbnail, duration: 0, plays: 0, likes: 0, provider: 'youtube', youtubeVideoId: video.id, source: 'youtube' }));
    const track = queue.find(item => item.youtubeVideoId === selected.id);
    if (track) openInMainPlayer(track, queue);
  };

  if (!iframeUrl) {
    return (
      <div className="rounded-xl bg-muted/30 p-6 text-center">
        <Youtube className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {resolveError || "Resolving YouTube channel…"}
        </p>
        {resolveError && (
          <a
            href={channelUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm text-primary hover:underline"
          >
            Open channel on YouTube
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
            <Youtube className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-semibold text-sm">YouTube Channel</span>
        </div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => navigate('/upload?type=video')} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"><SquarePlus className="h-3.5 w-3.5" />Post a video</button><a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        >
          View Channel
          <ExternalLink className="w-3 h-3" />
        </a></div>
      </div>

      {videos.length > 0 && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a channel video</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{videos.map(video => <button key={video.id} type="button" onClick={() => playVideo(video)} className="overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary/60"><div className="relative aspect-video overflow-hidden bg-muted"><img src={video.thumbnail} alt="" className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-black/15 opacity-0 transition hover:opacity-100"><Play className="h-8 w-8 fill-white text-white" /></span></div><p className="line-clamp-2 p-2 text-xs font-medium">{video.title}</p></button>)}</div></div>}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted/30"
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
            title={`${artistName}'s YouTube videos`}
            src={iframeUrl}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </motion.div>
    </div>
  );
}
