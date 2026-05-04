import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Share2, Plus, ListMusic, Download, Eye,
  Music, MessageSquare, Heart, Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/FirebaseAuthContext';

interface StudioAudioOptionsProps {
  track: {
    id: string;
    title: string;
    audioUrl?: string;
    imageUrl?: string;
    lyrics?: string;
    genre?: string;
    bpm?: number;
    mood?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function StudioAudioOptions({ track, isOpen, onClose }: StudioAudioOptionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const options = [
    {
      icon: Plus,
      label: 'Add to Playlist',
      action: () => {
        if (!user) {
          toast.error('Sign in to add to playlist');
          navigate('/auth');
          return;
        }
        toast.success('Added to playlist');
        onClose();
      }
    },
    {
      icon: ListMusic,
      label: 'Play Next',
      action: () => {
        toast.success('Added to play next');
        onClose();
      }
    },
    {
      icon: Eye,
      label: 'View Metadata',
      action: () => {
        // Show metadata modal or navigate to metadata view
        toast.info('Metadata view coming soon');
        onClose();
      }
    },
    ...(track.audioUrl ? [{
      icon: Download,
      label: 'Download',
      action: () => {
        if (track.audioUrl) {
          const link = document.createElement('a');
          link.href = track.audioUrl;
          link.download = `${track.title}.mp3`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success('Download started');
        }
        onClose();
      }
    }] : []),
    {
      icon: Share2,
      label: 'Share',
      action: async () => {
        try {
          await navigator.share({
            title: track.title,
            text: `Check out this track: ${track.title}`,
          });
        } catch {
          navigator.clipboard.writeText(`${track.title}`);
          toast.success('Copied to clipboard');
        }
        onClose();
      }
    },
    {
      icon: Music,
      label: 'Add to Story',
      action: () => {
        if (!user) {
          toast.error('Sign in to add to story');
          navigate('/auth');
          return;
        }
        toast.success('Added to story');
        onClose();
      }
    },
    {
      icon: MessageSquare,
      label: 'Post to Feed',
      action: () => {
        if (!user) {
          toast.error('Sign in to post to feed');
          navigate('/auth');
          return;
        }
        navigate('/feed', { state: { trackToPost: track } });
        onClose();
      }
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl overflow-hidden max-h-[80vh]"
          >
            <div className="p-4 border-b border-border flex items-center gap-4">
              {track.imageUrl ? (
                <img
                  src={track.imageUrl}
                  alt={track.title}
                  className="w-14 h-14 rounded-lg object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                  <Music className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{track.title}</p>
                <div className="text-sm text-muted-foreground">
                  {track.genre && <span>{track.genre}</span>}
                  {track.bpm && <span> • {track.bpm} BPM</span>}
                  {track.mood && <span> • {track.mood}</span>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {options.map((option, index) => (
                <motion.button
                  key={option.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={option.action}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <option.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}