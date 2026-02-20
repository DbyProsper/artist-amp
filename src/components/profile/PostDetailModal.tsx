import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Post } from '@/types';
import { FeedPost } from '@/components/feed/FeedPost';
import { useState } from 'react';

interface PostDetailModalProps {
  posts: Post[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PostDetailModal({ posts, initialIndex, isOpen, onClose }: PostDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!isOpen || posts.length === 0) return null;

  const currentPost = posts[currentIndex];

  const goNext = () => {
    if (currentIndex < posts.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 glass border-b border-border">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">{currentIndex + 1} / {posts.length}</span>
          <div className="w-9" />
        </div>

        {/* Post */}
        <div className="max-w-lg mx-auto">
          <FeedPost post={currentPost} />
        </div>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button onClick={goPrev} className="fixed left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-muted/80 hover:bg-muted">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentIndex < posts.length - 1 && (
          <button onClick={goNext} className="fixed right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-muted/80 hover:bg-muted">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
