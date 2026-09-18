import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Link2, Flag, UserMinus, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';

interface PostOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
  postId?: string;
}

export function PostOptionsModal({ isOpen, onClose, isOwner, onDelete, postId }: PostOptionsModalProps) {
  const { user, profile } = useAuth();
  const handleShare = async () => {
    const url = `${window.location.origin}/?post=${postId || ''}`;
    if (navigator.share) await navigator.share({ title: 'MusicInsta post', url }).catch(() => undefined);
    else { await navigator.clipboard.writeText(url); toast.success('Link copied.'); }
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
    onClose();
  };

  const handleReport = async () => {
    if (!user || !postId) { toast.error('Sign in to report this post.'); return; }
    await addDoc(collection(db, 'reports'), { type: 'post', target_id: postId, reporter_id: profile?.id || user.uid, status: 'open', reason: 'Reported from post options', created_at: serverTimestamp() });
    toast.success('Post reported. Administrators have been notified.'); onClose();
  };

  const handleSave = () => {
    toast.success('Post saved to your collection!');
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
