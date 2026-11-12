import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  ChevronDown,
  Heart,
  Share2,
  MoreHorizontal,
  ListMusic,
  X,
  GripVertical,
  SquarePlus,
  Youtube,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { PlayerSettingsModal } from "@/components/modals/PlayerSettingsModal";
import { toast } from "sonner";
import { useAuth } from "@/context/FirebaseAuthContext";
import { buildTimedLyrics, hasAuthoredTimestamps } from "@/lib/timedLyrics";
import { ShareTrackDialog } from "@/components/social/ShareTrackDialog";
import { useNavigate } from "react-router-dom";

type YouTubePlayerApi = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume?: (volume: number) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  getPlayerState?: () => number;
};
let youtubeApiPromise: Promise<void> | null = null;
function loadYouTubePlayerApi() {
  if ((window as any).YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise(resolve => {
    const previous = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
    if (!document.querySelector('script[data-musicinsta-youtube-api]')) { const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.dataset.musicinstaYoutubeApi='true';document.head.appendChild(script); }
  });
  return youtubeApiPromise;
}

function YouTubeGlobalPlayback({ visible }: { visible: boolean }) {
  const { currentTrack, isPlaying, isExpanded, volume, syncExternalPlayback, externalEnded } = usePlayer();
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YouTubePlayerApi | null>(null);
  const wantedPlaying = useRef(isPlaying);
  const endedVideo = useRef<string | null>(null);
  const videoId = currentTrack?.provider === "youtube" ? currentTrack.youtubeVideoId : undefined;

  useEffect(() => {
    wantedPlaying.current = isPlaying;
    const instance = player.current;
    if (!instance) return;
    const state = typeof instance.getPlayerState === 'function' ? instance.getPlayerState() : -1;
    if (isPlaying && state !== 1 && state !== 3) instance.playVideo?.();
    if (!isPlaying && state !== 2 && state !== 0) instance.pauseVideo?.();
  }, [isPlaying]);
  useEffect(() => { player.current?.setVolume?.(volume); }, [volume]);
  useEffect(() => {
    if (!videoId || !frame.current) return;
    let cancelled=false; let poll=0;
    const seek = (event: Event) => {
      const detail=(event as CustomEvent<{percent:number}>).detail;
      const instance=player.current;
      if (!instance || typeof instance.getDuration !== 'function' || typeof instance.seekTo !== 'function') return;
      const mediaDuration=Number(instance.getDuration()) || 0;
      if(mediaDuration>0){const target=Math.max(0,Math.min(mediaDuration,mediaDuration*detail.percent/100));instance.seekTo(target,true);syncExternalPlayback(target,mediaDuration);if(wantedPlaying.current)instance.playVideo?.();}
    };
    window.addEventListener('musicinsta:youtube-seek', seek);
    void loadYouTubePlayerApi().then(() => {
      if(cancelled||!frame.current)return;
      const instance = new (window as any).YT.Player(frame.current,{events:{onReady:(event:any)=>{const target=event.target as YouTubePlayerApi;target.setVolume?.(volume);if(wantedPlaying.current)target.playVideo?.();const duration=Number(target.getDuration?.())||0;syncExternalPlayback(Number(target.getCurrentTime?.())||0,duration,wantedPlaying.current);},onStateChange:(event:any)=>{const target=event.target as YouTubePlayerApi;const state=Number(event.data);const duration=Number(target.getDuration?.())||0;syncExternalPlayback(Number(target.getCurrentTime?.())||0,duration,state===1?true:state===2||state===0?false:undefined);if(state===1)endedVideo.current=null;if(state===0&&endedVideo.current!==videoId){endedVideo.current=videoId;externalEnded();}}}}) as YouTubePlayerApi;
      player.current=instance;
      poll=window.setInterval(()=>{const active=player.current;if(!active||typeof active.getDuration!=='function'||typeof active.getCurrentTime!=='function')return;const mediaDuration=Number(active.getDuration())||0;if(mediaDuration>0)syncExternalPlayback(Number(active.getCurrentTime())||0,mediaDuration);},250);
    });
    return()=>{cancelled=true;window.removeEventListener('musicinsta:youtube-seek',seek);window.clearInterval(poll);player.current?.pauseVideo?.();player.current=null;};
  },[externalEnded,syncExternalPlayback,videoId]);
  if (!videoId) return null;
  const src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&autoplay=1&controls=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
  return <div className={cn("overflow-hidden bg-black shadow-2xl", isExpanded && visible ? "fixed left-1/2 top-1/2 z-[60] aspect-square w-[calc(100%-4rem)] max-w-sm -translate-x-1/2 -translate-y-[63%] rounded-2xl lg:aspect-video lg:max-w-2xl lg:-translate-y-[74%]" : "fixed -left-[9999px] top-0 h-[180px] w-[320px]")}><iframe key={videoId} ref={frame} title={`${currentTrack?.title || 'YouTube'} video`} src={src} className="h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture" /></div>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Extract dominant color from image (simplified - returns theme color)
function useDominantColor(imageUrl: string) {
  // In a real app, we'd use a color extraction library
  // For now, return a themed gradient
  return "hsl(330, 85%, 60%)";
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
    closeMiniPlayer,
  } = usePlayer();

  if (!currentTrack || !isMiniPlayerVisible) return null;

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
              if (isPlaying) pauseTrack();
              else resumeTrack();
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentTrack,
    isPlaying,
    isExpanded,
    progress,
    volume,
    isShuffled,
    repeatMode,
    showLyrics,
    currentTime,
    duration,
    queue,
    listeningHistory,
    playbackError,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    playTrack,
    likeTrack,
    setExpanded,
    setProgress,
    setVolume,
    setQueue,
    toggleShuffle,
    toggleRepeat,
    toggleLyrics,
  } = usePlayer();
  const [showSettings, setShowSettings] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showYouTubeVideo, setShowYouTubeVideo] = useState(false);
  const lyricContainerRef = useRef<HTMLDivElement>(null);

  const timedLyrics = useMemo(
    () =>
      currentTrack?.timestampedLyrics?.length
        ? currentTrack.timestampedLyrics
        : buildTimedLyrics(
            currentTrack?.lyrics || "",
            duration || currentTrack?.duration || 0,
            currentTrack?.lyricStartTime,
          ),
    [currentTrack, duration],
  );
  const hasTimestampedLyrics = Boolean(
    currentTrack?.timestampedLyrics?.length ||
    hasAuthoredTimestamps(currentTrack?.lyrics || ""),
  );
  // Authored timestamps remain exact. Untimed lyrics reserve the estimated intro
  // and are compressed into the likely vocal window so they do not drift late.
  const lyricClock = currentTime + (hasTimestampedLyrics ? 0 : 1.5);
  const activeLyricIndex = timedLyrics.findIndex(
    (line) => lyricClock >= line.startTime && lyricClock < line.endTime,
  );

  useEffect(() => {
    if (activeLyricIndex < 0) return;
    const container = lyricContainerRef.current;
    const line = container?.querySelector<HTMLElement>(
      `[data-lyric-index="${activeLyricIndex}"]`,
    );
    if (container && line)
      container.scrollTo({
        top: Math.max(0, line.offsetTop - container.clientHeight * 0.38),
        behavior: "smooth",
      });
  }, [activeLyricIndex]);

  useEffect(() => {
    lyricContainerRef.current?.scrollTo({ top: 0 });
  }, [currentTrack?.id, showLyrics]);

  useEffect(() => setShowYouTubeVideo(false), [currentTrack?.id]);

  useEffect(() => {
    setIsLiked(
      Boolean(
        currentTrack &&
        listeningHistory.find((entry) => entry.trackId === currentTrack.id)
          ?.liked,
      ),
    );
  }, [currentTrack, listeningHistory]);

  const toggleLike = () => {
    if (!currentTrack) return;
    if (!user) {
      toast.info(
        "Sign in to like music and save it to your Liked Music playlist.",
      );
      return;
    }
    const next = !isLiked;
    setIsLiked(next);
    likeTrack(currentTrack, next);
    toast.success(
      next ? "Added to your liked music" : "Removed from liked music",
    );
  };

  const shareTrack = () => setShowShare(true);

  if (!currentTrack) return null;

  return (
    <>
      <YouTubeGlobalPlayback visible={showYouTubeVideo && !showQueue && !showSettings} />
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="player-full fixed inset-0 z-50 flex flex-col overflow-hidden"
          >
            {/* Dynamic background based on album art */}
            <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
              <img
                src={currentTrack.coverArt}
                alt=""
                className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-3xl saturate-[1.9]"
              />
              <img src={currentTrack.coverArt} alt="" className="absolute inset-0 h-full w-full scale-150 object-cover opacity-35 blur-[90px] mix-blend-screen saturate-[2.2]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent_0%,hsl(var(--background)/.28)_48%,hsl(var(--background)/.82)_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/35 to-background/80" />
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
              <div className="flex items-center gap-2">
                {currentTrack?.lyrics && (
                  <button
                    onClick={toggleLyrics}
                    className={cn(
                      "p-2 rounded-full hover:bg-muted/50 transition-colors",
                      showLyrics && "text-primary",
                    )}
                    title={showLyrics ? "Hide Lyrics" : "Show Lyrics"}
                  >
                    📝
                  </button>
                )}
                {currentTrack.provider === 'youtube' && <button onClick={() => setShowYouTubeVideo(value => !value)} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold hover:bg-muted/50", showYouTubeVideo && "bg-primary/15 text-primary")} title={showYouTubeVideo ? 'Show artwork' : 'Watch video'}><Youtube className="h-4 w-4" />{showYouTubeVideo ? 'Artwork' : 'Video'}</button>}
                <button
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                  onClick={() => setShowSettings(true)}
                >
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Album Art or Lyrics */}
            <div className="player-artwork-stage flex min-h-0 flex-1 items-center justify-center px-8">
              {showLyrics && currentTrack?.lyrics ? (
                <motion.div
                  ref={lyricContainerRef}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="player-artwork aspect-square w-full max-w-sm overflow-y-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-6"
                >
                  <div
                    className="w-full space-y-4 pb-40 pt-4 text-center"
                    aria-label="Synchronized lyrics"
                  >
                    {timedLyrics.map((line, index) => (
                      <p
                        key={`${line.startTime}-${index}`}
                        data-lyric-index={index}
                        className={cn(
                          "transition-all duration-300",
                          index === activeLyricIndex
                            ? "scale-105 text-lg font-bold text-foreground"
                            : "text-sm text-muted-foreground/60",
                        )}
                      >
                        {line.text}
                      </p>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className={cn(
                    "player-artwork aspect-square w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl lg:max-w-[25rem] xl:max-w-[27rem]",
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
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              )}
            </div>

            {/* Track Info */}
            <div className="player-track-info px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-lg text-muted-foreground truncate">
                    {currentTrack.artist.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentTrack.provider === 'youtube' && currentTrack.youtubeVideoId && <button onClick={() => navigate(`/upload?type=video&youtubeVideoId=${encodeURIComponent(currentTrack.youtubeVideoId!)}&title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist.name)}&thumbnail=${encodeURIComponent(currentTrack.coverArt)}`)} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-2 text-xs font-semibold text-primary"><SquarePlus className="h-4 w-4" />Post</button>}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleLike}
                    aria-label={isLiked ? "Unlike track" : "Like track"}
                    className="p-3 rounded-full hover:bg-muted/50 transition-colors"
                  >
                    <Heart
                      className={cn("w-6 h-6", isLiked && "text-red-500")}
                      fill={isLiked ? "currentColor" : "none"}
                    />
                  </motion.button>
                  <button
                    onClick={() => void shareTrack()}
                    aria-label="Share track"
                    className="p-3 rounded-full hover:bg-muted/50 transition-colors"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {playbackError && (
              <p role="alert" className="px-8 text-sm text-destructive">
                {playbackError}
              </p>
            )}

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
                <span>{formatTime(duration || currentTrack.duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="player-main-controls flex items-center justify-center gap-6 py-6">
              <button
                onClick={toggleShuffle}
                aria-label={
                  isShuffled ? "Turn shuffle off" : "Shuffle upcoming tracks"
                }
                className={cn(
                  "p-3 rounded-full transition-colors",
                  isShuffled
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={previousTrack}
                aria-label="Previous track"
                className="p-3 rounded-full hover:bg-muted/50 transition-colors"
              >
                <SkipBack className="w-7 h-7" fill="currentColor" />
              </button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => (isPlaying ? pauseTrack() : resumeTrack())}
                aria-label={isPlaying ? "Pause" : "Play"}
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
                      <Pause
                        className="w-7 h-7 text-primary-foreground"
                        fill="currentColor"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="play"
                      initial={{ scale: 0, rotate: 180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -180 }}
                    >
                      <Play
                        className="w-7 h-7 text-primary-foreground ml-1"
                        fill="currentColor"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <button
                onClick={nextTrack}
                aria-label="Next recommended track"
                className="p-3 rounded-full hover:bg-muted/50 transition-colors"
              >
                <SkipForward className="w-7 h-7" fill="currentColor" />
              </button>

              <button
                onClick={toggleRepeat}
                aria-label={`Repeat mode: ${repeatMode}`}
                className={cn(
                  "p-3 rounded-full transition-colors",
                  repeatMode !== "off"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Volume & Queue */}
            <div className="player-volume-queue flex items-center justify-between px-8 pb-8 safe-bottom">
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
              <button
                onClick={() => setShowQueue((current) => !current)}
                aria-label="Show play queue"
                className="p-3 rounded-full hover:bg-muted/50 transition-colors"
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>

            {showQueue && (
              <div className="player-up-next absolute inset-x-0 bottom-0 z-[80] max-h-[55vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Up next</h3>
                    <p className="text-xs text-muted-foreground">
                      Drag tracks to reorder, or select one to play it now.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowQueue(false)}
                    aria-label="Close queue"
                    className="rounded-full p-2 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Reorder.Group
                  axis="y"
                  values={queue}
                  onReorder={setQueue}
                  className="space-y-1"
                >
                  {queue.map((track, index) => (
                    <Reorder.Item
                      key={track.id}
                      value={track}
                      className={cn(
                        "flex w-full cursor-grab items-center gap-2 rounded-xl p-2 active:cursor-grabbing",
                        track.id === currentTrack.id && "bg-primary/10",
                      )}
                    >
                      <GripVertical
                        className="h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          playTrack(track, queue);
                          setShowQueue(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left hover:bg-muted"
                      >
                        <span className="w-6 text-center text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        <img
                          src={track.coverArt}
                          alt=""
                          className="h-10 w-10 rounded-md object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {track.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {track.artist.name}
                          </span>
                        </span>
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                {!queue.length && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Your queue is empty.
                  </p>
                )}
              </div>
            )}

            {/* Settings Modal */}
            <PlayerSettingsModal
              track={currentTrack}
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <ShareTrackDialog
        open={showShare}
        track={{
          id: currentTrack.id,
          title: currentTrack.title,
          audioUrl: currentTrack.audioUrl,
          coverArt: currentTrack.coverArt,
          artistName: currentTrack.artist.name,
          youtubeVideoId: currentTrack.youtubeVideoId,
        }}
        onClose={() => setShowShare(false)}
      />
    </>
  );
}
