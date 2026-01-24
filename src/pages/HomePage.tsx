import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { FeedPost } from '@/components/feed/FeedPost';
import { StoryViewer } from '@/components/stories/StoryViewer';
import { mockStories, mockPosts } from '@/data/mockData';
import { Story } from '@/types';

export default function HomePage() {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);

  const handleStoryClick = (story: Story) => {
    const index = mockStories.findIndex(s => s.id === story.id);
    setSelectedStoryIndex(index);
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.reload();
  };

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
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </header>

      {/* Stories */}
      <section className="border-b border-border">
        <StoriesRow stories={mockStories} onStoryClick={handleStoryClick} />
      </section>

      {/* Feed */}
      <section>
        {mockPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <FeedPost post={post} />
          </motion.div>
        ))}
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
