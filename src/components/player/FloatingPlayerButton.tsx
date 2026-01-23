import { motion, AnimatePresence } from 'framer-motion';
import { Music2 } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';

export function FloatingPlayerButton() {
  const { currentTrack, isMiniPlayerVisible, openMiniPlayer } = usePlayer();

  // Only show when there's a track but mini player is hidden
  if (!currentTrack || isMiniPlayerVisible) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.9 }}
        onClick={openMiniPlayer}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        <Music2 className="w-5 h-5 text-primary-foreground" />
      </motion.button>
    </AnimatePresence>
  );
}