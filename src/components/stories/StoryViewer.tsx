import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';
import { Story } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const currentStory = stories[currentIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setIsLiked(false);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setIsLiked(false);
    }
  };

  const handleLike = () => {
    if (!user) {
      toast.error('Sign in to like stories');
      return;
    }
    setIsLiked(!isLiked);
    if (!isLiked) {
      toast.success(`${currentStory.artist.name} was notified that you liked their story! ❤️`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        {/* Progress bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-12 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Story content */}
        <div className="relative w-full h-full max-w-md mx-auto">
          <img
            src={currentStory.imageUrl}
            alt={`${currentStory.artist.name}'s story`}
            className="w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50" />

          {/* Artist info */}
          <div className="absolute top-16 left-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              <img
                src={currentStory.artist.avatar}
                alt={currentStory.artist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-white">{currentStory.artist.name}</span>
                {currentStory.artist.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                )}
              </div>
              <span className="text-xs text-white/70">2h ago</span>
            </div>
          </div>

          {/* Navigation areas */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-0 bottom-0 w-1/3"
          />
          <button
            onClick={handleNext}
            className="absolute right-0 top-0 bottom-0 w-1/3"
          />

          {/* Navigation arrows */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}

          {/* Like button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className="absolute bottom-8 right-4 p-4 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <Heart
              className={`w-8 h-8 transition-colors ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-white'
              }`}
            />
          </motion.button>

          {/* Sample content text */}
          <div className="absolute bottom-8 left-4 right-20">
            <p className="text-white font-medium">
              🔥 New music dropping soon! Stay tuned...
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
