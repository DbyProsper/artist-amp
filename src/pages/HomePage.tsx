import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Bell, MessageCircle, Plus, TrendingUp, Disc, Sparkles, Wand2, Zap, BarChart3, ArrowRight, X } from 'lucide-react';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { FeedPost } from '@/components/feed/FeedPost';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { TrackRow } from '@/components/tracks/TrackRow';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { Button } from '@/components/ui/button';
import { mockArtists, mockTracks } from '@/data/mockData';
import { useFeedPosts } from '@/hooks/useFeedPosts';
import { Story } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';
import { clearUploadProgress, readUploadProgress, UPLOAD_PROGRESS_EVENT, type UploadProgressState } from '@/lib/uploadProgress';
import { useStories } from '@/hooks/useStories';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';

export default function HomePage() {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { posts, loading: postsLoading } = useFeedPosts();
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(() => readUploadProgress());
  const stories = useStories();
  const { notifications, unreadCount, markAsRead } = useRealTimeNotifications();
  const unreadMessages = notifications.filter(notification => notification.type === 'message' && !notification.read);
  const groupedStories = useMemo(() => {
    const groups = new Map<string, Story[]>();
    stories.forEach(story => groups.set(story.artist.id, [...(groups.get(story.artist.id) || []), story]));
    return [...groups.values()].flat();
  }, [stories]);
  const storyBubbles = useMemo(() => groupedStories.filter((story, index) => groupedStories.findIndex(item => item.artist.id === story.artist.id) === index), [groupedStories]);

  useEffect(() => {
    const update = (event: Event) => setUploadProgress((event as CustomEvent<UploadProgressState>).detail);
    window.addEventListener(UPLOAD_PROGRESS_EVENT, update);
    return () => window.removeEventListener(UPLOAD_PROGRESS_EVENT, update);
  }, []);

  const handleStoryClick = (story: Story) => {
    const index = groupedStories.findIndex(s => s.id === story.id);
    setSelectedStoryIndex(index);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.reload();
  };

  const handleAddStory = () => {
    if (!user) {
      toast.error('Sign in to upload a story');
      navigate('/auth');
      return;
    }
    navigate('/upload');
  };

  const realArtists = posts.map(post => post.artist).filter((artist, index, list) => list.findIndex(item => item.id === artist.id) === index);
  const trendingArtists = [...realArtists, ...mockArtists.filter(mock => !realArtists.some(real => real.id === mock.id))].slice(0, 8);
  const realReleases = posts.filter(post => post.track && (post.isNewRelease || post.type === 'audio')).map(post => post.track!).filter((track, index, list) => list.findIndex(item => item.id === track.id) === index);
  const newReleases = realReleases.length ? realReleases : mockTracks.slice(0, 3);

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
                  'drop-shadow(0 0 10px hsla(330, 85%, 60%, 0.3))',
                  'drop-shadow(0 0 20px hsla(330, 85%, 60%, 0.6))',
                  'drop-shadow(0 0 10px hsla(330, 85%, 60%, 0.3))'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <h1 className="text-xl font-display font-bold text-gradient">MusicInsta</h1>
          </button>
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
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
            </button>
            
            {/* Messages */}
            <button
              onClick={() => { unreadMessages.forEach(item => void markAsRead(item.id)); navigate('/messages'); }}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadMessages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
      {uploadProgress && (uploadProgress.active || uploadProgress.progress === 100 || uploadProgress.error) && <div className="sticky top-14 z-30 border-b border-border bg-card px-4 py-3 shadow-sm"><div className="mx-auto max-w-[630px]"><div className="flex items-center justify-between gap-3 text-sm"><span>{uploadProgress.label}</span><span className="ml-auto">{uploadProgress.error ? 'Try again' : `${uploadProgress.progress}%`}</span>{!uploadProgress.active && <button aria-label="Close upload notification" onClick={() => { clearUploadProgress(); setUploadProgress(null); }} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full transition-all ${uploadProgress.error ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.max(2, uploadProgress.progress)}%` }} /></div></div></div>}

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

      {/* Trending Artists Section */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Trending Artists</h2>
          </div>
          <button 
            onClick={() => navigate('/discover')}
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
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="font-medium text-sm truncate">{artist.name}</p>
              <p className="text-xs text-muted-foreground">{artist.genres[0]}</p>
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
            onClick={() => navigate('/discover')}
            className="text-sm text-primary hover:underline"
          >
            See all
          </button>
        </div>
        <div className="space-y-1">
          {newReleases.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index + 1} showIndex queue={newReleases} />
          ))}
        </div>
      </section>

      {/* AI Features for Artists Section */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg">AI Studio Features</h2>
          </div>
          <button 
            onClick={() => navigate('/studio')}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Explore <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Unlock professional music production tools powered by AI. Available for artists.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Lyrics Generator */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate('/studio')}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Lyrics Generation</h3>
                <p className="text-xs text-muted-foreground">AI-generated lyrics in any style</p>
              </div>
            </div>
          </motion.div>

          {/* Beat Production */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-secondary/10 border border-accent/20 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => navigate('/studio')}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Music2 className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Beat Production</h3>
                <p className="text-xs text-muted-foreground">Create original royalty-free beats</p>
              </div>
            </div>
          </motion.div>

          {/* Professional Mixing */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-500/50 transition-colors cursor-pointer"
            onClick={() => navigate('/studio')}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Mixing & Mastering</h3>
                <p className="text-xs text-muted-foreground">Professional mixing from Free to Premium</p>
              </div>
            </div>
          </motion.div>

          {/* AI Analytics */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-500/50 transition-colors cursor-pointer"
            onClick={() => navigate('/studio')}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">AI Analytics</h3>
                <p className="text-xs text-muted-foreground">Listener insights & performance analytics</p>
              </div>
            </div>
          </motion.div>
        </div>
        {user?.user_metadata?.is_artist && (
          <Button 
            className="w-full mt-4"
            onClick={() => navigate('/studio')}
          >
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
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
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
