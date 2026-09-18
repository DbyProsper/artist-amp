import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { EmojiPicker } from '@/components/chat/EmojiPicker';

interface CommentItem {
  id: string;
  text: string;
  authorName: string;
  avatar: string;
}

interface Props {
  postId: string;
  ownerId: string;
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export function PostCommentsModal({ postId, ownerId, open, onClose, onAdded }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open) return;
    const commentsQuery = query(collection(db, 'posts', postId, 'comments'), orderBy('created_at', 'asc'));
    return onSnapshot(commentsQuery, snapshot => {
      setComments(snapshot.docs.map(item => {
        const data = item.data();
        return {
          id: item.id,
          text: data.text || '',
          authorName: data.author_name || 'MusicInsta user',
          avatar: data.avatar_url || '/placeholder.svg',
        };
      }));
    }, () => toast.error('Comments could not be loaded.'));
  }, [open, postId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !text.trim()) return;
    const cleanText = text.trim();
    setText('');
    await addDoc(collection(db, 'posts', postId, 'comments'), {
      text: cleanText,
      author_id: user.uid,
      author_name: profile?.name || user.displayName || 'MusicInsta user',
      avatar_url: profile?.avatar_url || user.photoURL || '/placeholder.svg',
      created_at: serverTimestamp(),
    });
    if (ownerId && ownerId !== user.uid) {
      await addDoc(collection(db, 'notifications'), {
        profile_id: ownerId,
        from_profile_id: user.uid,
        post_id: postId,
        type: 'comment',
        message: `commented: “${cleanText.slice(0, 80)}”`,
        read: false,
        created_at: serverTimestamp(),
      });
    }
    onAdded?.();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <section className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card sm:rounded-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display font-bold">Comments</h2>
          <button aria-label="Close comments" onClick={onClose}><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {comments.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Be the first to comment.</p>}
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <img src={comment.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
              <div className="rounded-2xl bg-muted px-3 py-2 text-sm"><strong>{comment.authorName}</strong><p>{comment.text}</p></div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t border-border p-4">
          <Input value={text} onChange={event => setText(event.target.value)} placeholder={user ? 'Add a comment…' : 'Sign in to comment'} disabled={!user} />
          <EmojiPicker onEmojiSelect={emoji => setText(current => current + emoji)} />
          <Button type="submit" disabled={!user || !text.trim()}>Post</Button>
        </form>
      </section>
    </div>
  );
}
