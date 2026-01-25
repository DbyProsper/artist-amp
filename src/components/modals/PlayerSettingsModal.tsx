import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Share2, Plus, Flag, UserMinus, ExternalLink, 
  Radio, ListMusic, Download, Heart, BadgeCheck,
  Clock, MessageSquare
} from 'lucide-react';
import { Track } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PlayerSettingsModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerSettingsModal({ track, isOpen, onClose }: PlayerSettingsModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const options = [
    {
      icon: Heart,
      label: 'Like',
      action: () => {
        if (!user) {
          toast.error('Sign in to like tracks');
          navigate('/auth');
          return;
        }
        toast.success('Added to liked songs');
        onClose();
      }
    },
    {
      icon: Plus,
      label: 'Add to playlist',
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
      label: 'Add to queue',
      action: () => {
        toast.success('Added to queue');
        onClose();
      }
    },
    {
      icon: Radio,
      label: 'Go to radio',
      action: () => {
        toast.success('Starting radio based on this track');
        onClose();
      }
    },
    {
      icon: Clock,
      label: 'Sleep timer',
      action: () => {
        toast.info('Sleep timer feature coming soon');
        onClose();
      }
    },
    {
      icon: Share2,
      label: 'Share',
      action: async () => {
        try {
          await navigator.share({
            title: track.title,
            text: `Listen to ${track.title} by ${track.artist.name} on MusicInsta`,
          });
        } catch {
          navigator.clipboard.writeText(`${track.title} - ${track.artist.name}`);
          toast.success('Copied to clipboard');
        }
        onClose();
      }
    },
    {
      icon: BadgeCheck,
      label: 'View artist',
      action: () => {
        navigate(`/user/${track.artist.id}`);
        onClose();
      }
    },
    {
      icon: MessageSquare,
      label: 'View comments',
      action: () => {
        toast.info('Comments feature coming soon');
        onClose();
      }
    },
    {
      icon: Flag,
      label: 'Report',
      action: () => {
        toast.success('Thank you for reporting. We will review this.');
        onClose();
      },
      danger: true
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
              <img
                src={track.coverArt}
                alt={track.title}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{track.title}</p>
                <p className="text-sm text-muted-foreground truncate">{track.artist.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {options.map((option, index) => (
                <motion.button
                  key={option.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={option.action}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors ${
                    option.danger ? 'text-destructive' : ''
                  }`}
                >
                  <option.icon className="w-5 h-5" />
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
