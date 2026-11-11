import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Music2,
  Bell,
  MessageCircle,
  Plus,
  TrendingUp,
  Disc,
  Sparkles,
  Wand2,
  Zap,
  SlidersHorizontal,
  ArrowRight,
  X,
} from "lucide-react";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { FeedPost } from "@/components/feed/FeedPost";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { TrackRow } from "@/components/tracks/TrackRow";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { Button } from "@/components/ui/button";
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { Story } from "@/types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/FirebaseAuthContext";
import { toast } from "sonner";
import {
  clearUploadProgress,
  readUploadProgress,
  UPLOAD_PROGRESS_EVENT,
  type UploadProgressState,
} from "@/lib/uploadProgress";
import { useStories } from "@/hooks/useStories";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";
import { usePlayer } from "@/context/PlayerContext";
import {
  rankArtists,
  rankCatalog,
  rankFeedPosts,
} from "@/services/recommendationEngine";

const FEED_SCROLL_KEY = "musicinsta:feed-scroll-position";
const feedOrders = new Map<string, string[]>();
const feedReloadSeed = crypto.getRandomValues(new Uint32Array(1))[0];

export default function HomePage() {
  const reduceMotion = useReducedMotion();
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(
    null,
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { posts, loading: postsLoading } = useFeedPosts();
  const { user } = useAuth();
  const { catalog, listeningHistory, preferredGenres, catalogLoading } =
    usePlayer();
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState | null>(() => readUploadProgress());
  const stories = useStories();
  const { notifications, unreadCount, markAsRead } = useRealTimeNotifications();
  const unreadMessages = notifications.filter(
    (notification) => notification.type === "message" && !notification.read,
  );
  const groupedStories = useMemo(() => {
    const groups = new Map<string, Story[]>();
    stories.forEach((story) =>
      groups.set(story.artist.id, [
        ...(groups.get(story.artist.id) || []),
        story,
      ]),
    );
    return [...groups.values()].flat();
  }, [stories]);
  const storyBubbles = useMemo(
    () =>
      groupedStories.filter(
        (story, index) =>
          groupedStories.findIndex(
            (item) => item.artist.id === story.artist.id,
          ) === index,
      ),
    [groupedStories],
  );

  useEffect(() => {
    const update = (event: Event) =>
      setUploadProgress((event as CustomEvent<UploadProgressState>).detail);
    window.addEventListener(UPLOAD_PROGRESS_EVENT, update);
    return () => window.removeEventListener(UPLOAD_PROGRESS_EVENT, update);
  }, []);

  useEffect(() => {
    const savedPosition = Number(sessionStorage.getItem(FEED_SCROLL_KEY) || 0);
    const frame = window.requestAnimationFrame(() =>
      window.scrollTo({ top: savedPosition, behavior: "auto" }),
    );
    return () => {
      window.cancelAnimationFrame(frame);
      sessionStorage.setItem(FEED_SCROLL_KEY, String(window.scrollY));
    };
  }, []);

  const handleStoryClick = (story: Story) => {
    const index = groupedStories.findIndex((s) => s.id === story.id);
    setSelectedStoryIndex(index);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddStory = () => {
    if (!user) {
      toast.error("Sign in to upload a story");
      navigate("/auth");
      return;
    }
    navigate("/upload");
  };

  const openStudioTool = (feature: "beat" | "song") => {
    if (!user) {
      toast.info("Sign in to use MusicInsta AI Studio");
      navigate("/auth");
      return;
    }
    localStorage.setItem("studio_currentFeature", feature);
    localStorage.setItem("studio_showEntry", "false");
    navigate("/studio");
  };

  const identity = user?.uid || "guest";
  const rankedPosts = useMemo(
    () => rankFeedPosts(posts, listeningHistory, preferredGenres, identity),
    [identity, listeningHistory, posts, preferredGenres],
  );
  const [stablePostIds, setStablePostIds] = useState<string[]>(() => feedOrders.get(identity) ?? []);
  const previousIdentity = useRef(identity);

  useEffect(() => {
    if (previousIdentity.current !== identity) {
      previousIdentity.current = identity;
      setStablePostIds(feedOrders.get(identity) ?? []);
      return;
    }
    setStablePostIds((current) => {
      const available = new Set(rankedPosts.map((post) => post.id));
      const retained = current.filter((id) => available.has(id));
      const retainedSet = new Set(retained);
      const additions = rankedPosts
        .filter((post) => !retainedSet.has(post.id))
        .map((post) => post.id);
      let next = current.length ? [...retained, ...additions] : rankedPosts.map((post) => post.id);
      const priorityId = sessionStorage.getItem('musicinsta:priority-post-id');
      if (priorityId && available.has(priorityId)) {
        next = [priorityId, ...next.filter(id => id !== priorityId)];
        sessionStorage.removeItem('musicinsta:priority-post-id');
      }
      if (!current.length && next.length > 1) {
        const maximum = Math.min(8, next.length);
        const lastFirst = sessionStorage.getItem(`musicinsta:last-feed-first:${identity}`);
        let choice = feedReloadSeed % maximum;
        if (next[choice] === lastFirst) choice = (choice + 1) % maximum;
        next = [next[choice], ...next.slice(0, choice), ...next.slice(choice + 1)];
        sessionStorage.setItem(`musicinsta:last-feed-first:${identity}`, next[0]);
      }
      feedOrders.set(identity, next);
      return next;
    });
  }, [identity, rankedPosts]);

  const personalizedPosts = useMemo(() => {
    const byId = new Map(posts.map((post) => [post.id, post]));
    return stablePostIds
      .map((id) => byId.get(id))
      .filter((post): post is (typeof posts)[number] => Boolean(post));
  }, [posts, stablePostIds]);
  const isSignedIn = Boolean(user?.uid);
  const realArtists = useMemo(
    () =>
      [
        ...catalog.map((track) => track.artist),
        ...posts.map((post) => post.artist),
      ].filter(
        (artist, index, list) =>
          list.findIndex((item) => item.id === artist.id) === index,
      ),
    [catalog, posts],
  );
  const trendingArtists = useMemo(
    () =>
      rankArtists(
        realArtists.filter(
          (artist) =>
            artist.id !== "musicinsta-official" &&
            artist.username !== "musicinsta" &&
            !artist.id.startsWith('youtube-channel-') &&
            artist.location !== 'YouTube',
        ),
        catalog.filter(track => track.provider !== 'youtube'),
        listeningHistory,
        preferredGenres,
      ).slice(0, 8),
    [catalog, listeningHistory, preferredGenres, realArtists],
  );
  const newReleases = useMemo(() => {
    const realReleases = posts
      .filter(
        (post) => post.track && (post.isNewRelease || post.type === "audio"),
      )
      .map((post) => post.track!)
      .filter(
        (track, index, list) =>
          list.findIndex((item) => item.id === track.id) === index,
      );
    const releasePool = catalog.length ? catalog : realReleases;
    const playable = releasePool.filter((track) => track.audioUrl);
    if (!isSignedIn) {
      return [...playable]
        .sort(
          (left, right) =>
            right.plays - left.plays ||
            (right.createdAt?.getTime() || 0) -
              (left.createdAt?.getTime() || 0),
        )
        .slice(0, 6);
    }
    return rankCatalog(playable, listeningHistory, null, preferredGenres)
      .map((item) => item.track)
      .slice(0, 6);
  }, [catalog, isSignedIn, listeningHistory, posts, preferredGenres]);

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <motion.img
              src="/MusicInsta_Logo.png"
              alt="MusicInsta Logo"
              className="h-10 w-auto"
              animate={{
                filter: [
                  "drop-shadow(0 0 10px hsla(330, 85%, 60%, 0.3))",
                  "drop-shadow(0 0 20px hsla(330, 85%, 60%, 0.6))",
                  "drop-shadow(0 0 10px hsla(330, 85%, 60%, 0.3))",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <h1 className="text-xl font-display font-bold text-gradient">
              MusicInsta
            </h1>
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <span className="text-xs text-muted-foreground">Live</span>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-muted transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>

              {/* Messages */}
              <button
                onClick={() => {
                  unreadMessages.forEach((item) => void markAsRead(item.id));
                  navigate("/messages");
                }}
                className="relative p-2 rounded-full hover:bg-muted transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {unreadMessages.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </div>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      {uploadProgress &&
        (uploadProgress.active ||
          uploadProgress.progress === 100 ||
          uploadProgress.error) && (
          <div className="sticky top-14 z-30 border-b border-border bg-card px-4 py-3 shadow-sm">
            <div className="mx-auto max-w-[630px]">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{uploadProgress.label}</span>
                <span className="ml-auto">
                  {uploadProgress.error
                    ? "Try again"
                    : `${uploadProgress.progress}%`}
                </span>
                {!uploadProgress.active && (
                  <button
                    aria-label="Close upload notification"
                    onClick={() => {
                      clearUploadProgress();
                      setUploadProgress(null);
                    }}
                    className="rounded-full p-1 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${uploadProgress.error ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.max(2, uploadProgress.progress)}%` }}
                />
              </div>
            </div>
          </div>
        )}

      {/* Stories with Add Story button */}
      <section className="border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
          {/* Add Story Button */}
          <button
            onClick={handleAddStory}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground">Add Story</span>
          </button>

          <StoriesRow stories={storyBubbles} onStoryClick={handleStoryClick} />
        </div>
      </section>

      {/* Upcoming Artists Section */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Upcoming Artists</h2>
          </div>
          <button
            onClick={() => navigate("/discover?tab=trending#trending-artists")}
            className="text-sm text-primary hover:underline"
          >
            See all
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {trendingArtists.map((artist) => (
            <motion.div
              key={artist.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/user/${artist.id}`)}
              className="flex-shrink-0 w-28"
            >
              <div className="w-28 h-28 rounded-xl overflow-hidden mb-2">
                <img
                  src={artist.avatar}
                  alt={artist.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="font-medium text-sm truncate">{artist.name}</p>
              <p className="text-xs text-muted-foreground">
                {artist.genres[0]}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* New Releases Section */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-accent" />
            <h2 className="font-display font-bold text-lg">New Releases</h2>
          </div>
          <button
            onClick={() => navigate("/discover")}
            className="text-sm text-primary hover:underline"
          >
            See all
          </button>
        </div>
        <div className="space-y-1">
          {newReleases.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index + 1}
              showIndex
              queue={newReleases}
            />
          ))}
          {!catalogLoading && newReleases.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No playable releases are available yet.
            </p>
          )}
        </div>
      </section>

      {/* AI Features for Artists Section */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">
              AI Studio Features
            </h2>
          </div>
          <button
            onClick={() => navigate("/studio")}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Explore <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Unlock professional music production tools powered by AI. Available
          for artists.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Beat generation */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => openStudioTool("beat")}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Music2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Beat Generation</h3>
                <p className="text-xs text-muted-foreground">
                  Create original royalty-free instrumentals
                </p>
              </div>
            </div>
          </motion.div>

          {/* Full song generation */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-secondary/10 border border-accent/20 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => openStudioTool("song")}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Wand2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">
                  Full Song Generation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Generate a complete song from your creative brief
                </p>
              </div>
            </div>
          </motion.div>

          {/* Professional Mixing */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/50 transition-colors cursor-pointer"
            onClick={() => (user ? navigate("/studio/daw") : navigate("/auth"))}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">
                  Mixing & Mastering
                </h3>
                <p className="text-xs text-muted-foreground">
                  Professional mixing from Free to Premium
                </p>
              </div>
            </div>
          </motion.div>

          {/* Audio enhancement */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/50 transition-colors cursor-pointer"
            onClick={() =>
              user ? navigate("/studio/enhance") : navigate("/auth")
            }
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">
                  Audio Enhancement
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clean, balance and master uploaded audio
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        {user?.user_metadata?.is_artist && (
          <Button className="w-full mt-4" onClick={() => navigate("/studio")}>
            <Sparkles className="w-4 h-4 mr-2" />
            Access Online Studio
          </Button>
        )}
      </section>

      {/* Feed */}
      <section>
        <div className="px-4 py-3">
          <h2 className="font-display font-bold text-lg">Feed</h2>
        </div>
        {postsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          personalizedPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: 24, scale: 0.992, filter: "blur(3px)" }
              }
              whileInView={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
              }
              viewport={{ once: true, amount: 0.08, margin: "0px 0px -6% 0px" }}
              transition={{
                duration: 0.48,
                delay: reduceMotion ? 0 : Math.min((index % 5) * 0.035, 0.14),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <FeedPost post={post} />
            </motion.div>
          ))
        )}
      </section>

      {/* Story Viewer Modal */}
      {selectedStoryIndex !== null && (
        <StoryViewer
          stories={groupedStories}
          initialIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
        />
      )}
    </div>
  );
}
