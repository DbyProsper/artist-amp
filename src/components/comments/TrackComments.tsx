import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Clock, BadgeCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Track } from '@/types';
import { mockArtists } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  content: string;
  timestampSeconds: number;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    avatar: string;
    isVerified: boolean;
  };
}

interface TrackCommentsProps {
  track: Track;
  currentTime?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackComments({ track, currentTime = 0 }: TrackCommentsProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      content: '🔥 This drop is insane!',
      timestampSeconds: 45,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      user: mockArtists[1],
    },
    {
      id: '2',
      content: 'The production on this is crazy good',
      timestampSeconds: 120,
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      user: mockArtists[2],
    },
    {
      id: '3',
      content: 'Best track of 2024 no cap 🧢',
      timestampSeconds: 180,
      createdAt: new Date(Date.now() - 1000 * 60 * 10),
      user: mockArtists[3],
    },
  ]);

  const handleSubmit = () => {
    if (!user || !profile) {
      toast.error('Please sign in to comment');
      navigate('/auth');
      return;
    }

    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment.trim(),
      timestampSeconds: Math.floor(currentTime),
      createdAt: new Date(),
      user: {
        id: profile.id,
        name: profile.name || 'User',
        avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        isVerified: profile.is_verified || false,
      },
    };

    setComments([comment, ...comments]);
    setNewComment('');
    toast.success('Comment posted!');
  };

  const handleUserClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold">Comments</h3>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {/* New comment input */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={`Comment at ${formatTime(currentTime)}...`}
            className="bg-muted border-none pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {formatTime(currentTime)}
          </span>
        </div>
        <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {comments.map((comment, index) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <button
              onClick={() => handleUserClick(comment.user.id)}
              className="flex-shrink-0"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  src={comment.user.avatar}
                  alt={comment.user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleUserClick(comment.user.id)}
                  className="flex items-center gap-1 hover:underline"
                >
                  <span className="font-semibold text-sm">{comment.user.name}</span>
                  {comment.user.isVerified && (
                    <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                  )}
                </button>
                <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  {formatTime(comment.timestampSeconds)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
