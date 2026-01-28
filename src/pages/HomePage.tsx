import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Bell, MessageCircle, Plus, TrendingUp, Disc } from 'lucide-react';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { FeedPost } from '@/components/feed/FeedPost';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { TrackRow } from '@/components/tracks/TrackRow';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { mockStories, mockArtists, mockTracks } from '@/data/mockData';
import { useFeedPosts } from '@/hooks/useFeedPosts';
import { Story } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function HomePage() {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { posts, loading: postsLoading } = useFeedPosts();
  const { user } = useAuth();

  const handleStoryClick = (story: Story) => {
    const index = mockStories.findIndex(s => s.id === story.id);
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

  // Get trending artists (top 4)
  const trendingArtists = mockArtists.slice(0, 4);
  // Get new releases (first 3 tracks)
  const newReleases = mockTracks.slice(0, 3);

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center">
              <Music2 className="w-5 h-5 text-white" />
            </div>
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
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            
            {/* Messages */}
            <button
              onClick={() => navigate('/messages')}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />

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
          
          <StoriesRow stories={mockStories} onStoryClick={handleStoryClick} />
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
              onClick={() => navigate(`/user/f671f1d1-85e5-4ee4-baa0-965e851936e4`)}
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
            <TrackRow key={track.id} track={track} index={index + 1} showIndex />
          ))}
        </div>
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
          stories={mockStories}
          initialIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
        />
      )}
    </div>
  );
}
