import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface FullScreenAvatarProps {
  imageUrl: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FullScreenAvatar({ imageUrl, alt = 'Profile picture', isOpen, onClose }: FullScreenAvatarProps) {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          onClick={onClose}
        >
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <ZoomOut className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            className="flex-1 flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.img
              src={imageUrl}
              alt={alt}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-w-full max-h-full object-contain cursor-zoom-in"
              style={{ transform: `scale(${scale})` }}
              onClick={() => setScale(prev => prev === 1 ? 2 : 1)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
