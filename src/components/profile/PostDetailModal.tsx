import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Post } from '@/types';
import { FeedPost } from '@/components/feed/FeedPost';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PostDetailModalProps {
  posts: Post[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PostDetailModal({ posts, initialIndex, isOpen, onClose }: PostDetailModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const postElementsRef = useRef(new Map<string, HTMLDivElement>());
  const selectedPostId = posts[Math.max(0, Math.min(initialIndex, posts.length - 1))]?.id;

  useEffect(() => {
    if (!isOpen || !selectedPostId) return;
    const frame = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      const element = postElementsRef.current.get(selectedPostId);
      if (container && element) container.scrollTo({ top: element.offsetTop - 57, behavior: 'auto' });
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, selectedPostId]);

  if (!isOpen || posts.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={scrollContainerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] overflow-y-auto bg-background/95 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 glass border-b border-border">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">Scroll through posts</span>
          <div className="w-9" />
        </div>

        <div className="mx-auto max-w-lg pb-24">
          {posts.map(post => (
            <div
              key={post.id}
              ref={element => {
                if (element) postElementsRef.current.set(post.id, element);
                else postElementsRef.current.delete(post.id);
              }}
              className="scroll-mt-14"
            >
              <FeedPost post={post} />
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
