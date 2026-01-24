import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Link2, ListPlus, UserPlus, Radio, Heart, Download, Flag } from 'lucide-react';
import { Track } from '@/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface TrackOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export function TrackOptionsModal({ isOpen, onClose, track }: TrackOptionsModalProps) {
  const navigate = useNavigate();

  if (!track) return null;

  const handleShare = () => {
    toast.success('Share link copied to clipboard!');
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
    onClose();
  };

  const handleAddToPlaylist = () => {
    navigate('/playlists');
    onClose();
  };

  const handleAddToQueue = () => {
    toast.success(`Added "${track.title}" to queue`);
    onClose();
  };

  const handleGoToArtist = () => {
    navigate(`/user/${track.artist.id}`);
    onClose();
  };

  const handleLike = () => {
    toast.success(`Liked "${track.title}"!`);
    onClose();
  };

  const handleDownload = () => {
    toast.success('Download started...');
    onClose();
  };

  const handleReport = () => {
    toast.success('Track reported. We\'ll review it shortly.');
    onClose();
  };

  const options = [
    { icon: Heart, label: 'Like', onClick: handleLike },
    { icon: ListPlus, label: 'Add to Playlist', onClick: handleAddToPlaylist },
    { icon: Radio, label: 'Add to Queue', onClick: handleAddToQueue },
    { icon: UserPlus, label: 'Go to Artist', onClick: handleGoToArtist },
    { icon: Share2, label: 'Share', onClick: handleShare },
    { icon: Link2, label: 'Copy Link', onClick: handleCopyLink },
    { icon: Download, label: 'Download', onClick: handleDownload },
    { icon: Flag, label: 'Report', onClick: handleReport, destructive: true },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-4"
          >
            <div className="w-12 h-1 rounded-full bg-muted mx-auto mb-4" />
            
            {/* Track preview */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50">
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img
                  src={track.coverArt}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{track.title}</p>
                <p className="text-sm text-muted-foreground truncate">{track.artist.name}</p>
              </div>
            </div>
            
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.label}
                  onClick={option.onClick}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-colors ${
                    option.destructive ? 'text-destructive' : ''
                  }`}
                >
                  <option.icon className="w-5 h-5" />
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 p-4 rounded-xl bg-muted text-center font-medium hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
