import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Link2, Flag, UserMinus, Bookmark, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PostOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
}

export function PostOptionsModal({ isOpen, onClose, isOwner, onDelete }: PostOptionsModalProps) {
  const handleShare = () => {
    toast.success('Share link copied to clipboard!');
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
    onClose();
  };

  const handleReport = () => {
    toast.success('Post reported. We\'ll review it shortly.');
    onClose();
  };

  const handleSave = () => {
    toast.success('Post saved to your collection!');
    onClose();
  };

  const handleDownload = () => {
    toast.success('Download started...');
    onClose();
  };

  const handleUnfollow = () => {
    toast.success('Unfollowed user');
    onClose();
  };

  const options = [
    { icon: Share2, label: 'Share', onClick: handleShare },
    { icon: Link2, label: 'Copy Link', onClick: handleCopyLink },
    { icon: Bookmark, label: 'Save', onClick: handleSave },
    { icon: Download, label: 'Download', onClick: handleDownload },
    ...(isOwner ? [
      { icon: X, label: 'Delete Post', onClick: onDelete, destructive: true },
    ] : [
      { icon: UserMinus, label: 'Unfollow', onClick: handleUnfollow },
      { icon: Flag, label: 'Report', onClick: handleReport, destructive: true },
    ]),
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
            
            <div className="space-y-1">
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
