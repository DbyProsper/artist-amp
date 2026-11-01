import { FormEvent, useEffect, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Heart, Reply, Trash2, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { createPortal } from 'react-dom';
import { GifStickerPicker, SocialAttachment, type SocialMediaAttachment } from '@/components/social/GifStickerPicker';

interface CommentItem {
  id: string;
  text: string;
  authorName: string;
  avatar: string;
  authorId: string;
  likes: number;
  likedBy: string[];
  parentId?: string;
  replyToName?: string;
  attachment?: SocialMediaAttachment;
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
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null);
  const [attachment, setAttachment] = useState<SocialMediaAttachment | null>(null);

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
          avatar: data.avatar_url || '/musicinsta-default-cover.webp',
          authorId: data.author_id || '', likes: Number(data.likes) || 0,
          likedBy: Array.isArray(data.liked_by) ? data.liked_by : [],
          parentId: data.parent_id || undefined, replyToName: data.reply_to_name || undefined,
          attachment: data.media_type === 'gif' || data.media_type === 'sticker' ? { type: data.media_type, url: data.media_url || undefined, sticker: data.sticker || undefined } : undefined,
        };
      }));
    }, () => toast.error('Comments could not be loaded.'));
  }, [open, postId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || (!text.trim() && !attachment)) return;
    const cleanText = text.trim();
    const selectedAttachment = attachment;
    setText(''); setAttachment(null);
    await addDoc(collection(db, 'posts', postId, 'comments'), {
      text: cleanText,
      author_id: profile?.id || user.uid,
      author_name: profile?.name || user.displayName || 'MusicInsta user',
      avatar_url: profile?.avatar_url || user.photoURL || '/musicinsta-default-cover.webp',
      media_type: selectedAttachment?.type || null, media_url: selectedAttachment?.url || null, sticker: selectedAttachment?.sticker || null,
      created_at: serverTimestamp(),
      likes: 0, liked_by: [], parent_id: replyingTo?.id || null, reply_to_name: replyingTo?.authorName || null,
    });
    if (ownerId && ownerId !== (profile?.id || user.uid)) {
      await addDoc(collection(db, 'notifications'), {
        profile_id: ownerId,
        from_profile_id: profile?.id || user.uid,
        post_id: postId,
        type: 'comment',
        message: cleanText ? `commented: “${cleanText.slice(0, 80)}”` : selectedAttachment?.type === 'gif' ? 'commented with a GIF' : 'commented with a sticker',
        read: false,
        created_at: serverTimestamp(),
      });
    }
    onAdded?.();
    setReplyingTo(null);
  };

  const toggleLike = async (comment: CommentItem) => {
    if (!user) { toast.info('Sign in to like comments.'); return; }
    const actor = profile?.id || user.uid;
    const liked = comment.likedBy.includes(actor);
    await updateDoc(doc(db, 'posts', postId, 'comments', comment.id), { likes: increment(liked ? -1 : 1), liked_by: liked ? arrayRemove(actor) : arrayUnion(actor) });
  };

  const removeComment = async (comment: CommentItem) => {
    if (!user || (comment.authorId !== (profile?.id || user.uid) && ownerId !== (profile?.id || user.uid))) return;
    await deleteDoc(doc(db, 'posts', postId, 'comments', comment.id));
    await updateDoc(doc(db, 'posts', postId), { comments: increment(-1) }).catch(() => undefined);
  };

  const renderComment = (comment: CommentItem, nested = false) => {
    const actor = profile?.id || user?.uid || '';
    return <div key={comment.id} className={`flex gap-3 ${nested ? 'ml-10 border-l border-border pl-3' : ''}`}>
      <img src={comment.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
      <div className="min-w-0 flex-1"><div className="rounded-2xl bg-muted px-3 py-2 text-sm"><strong>{comment.authorName}</strong>{comment.replyToName && <span className="ml-1 text-xs text-primary">replying to @{comment.replyToName}</span>}{comment.attachment && <SocialAttachment attachment={comment.attachment} className="mt-2" />}{comment.text && <p className="mt-1 whitespace-pre-wrap break-words">{comment.text}</p>}</div><div className="mt-1 flex items-center gap-3 px-2 text-xs text-muted-foreground"><button onClick={() => void toggleLike(comment)} className={comment.likedBy.includes(actor) ? 'text-red-500' : ''}><Heart className={`mr-1 inline h-3.5 w-3.5 ${comment.likedBy.includes(actor) ? 'fill-current' : ''}`} />{comment.likes || 'Like'}</button><button onClick={() => { setReplyingTo(comment); setText(current => current || `@${comment.authorName} `); }}><Reply className="mr-1 inline h-3.5 w-3.5" />Reply</button>{user && (comment.authorId === actor || ownerId === actor) && <button onClick={() => void removeComment(comment)} className="text-destructive"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button>}</div></div>
    </div>;
  };

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <section className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card sm:rounded-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display font-bold">Comments</h2>
          <button aria-label="Close comments" onClick={onClose}><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {comments.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Be the first to comment.</p>}
          {comments.filter(comment => !comment.parentId).map(comment => <div key={comment.id} className="space-y-3">{renderComment(comment)}{comments.filter(reply => reply.parentId === comment.id).map(reply => renderComment(reply, true))}</div>)}
        </div>
        {replyingTo && <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-xs"><span>Replying to {replyingTo.authorName}</span><button onClick={() => setReplyingTo(null)}><X className="h-3.5 w-3.5" /></button></div>}
        {attachment && <div className="flex items-end gap-2 border-t border-border px-4 pt-3"><SocialAttachment attachment={attachment} /><button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)} className="rounded-full bg-muted p-1"><X className="h-4 w-4" /></button></div>}
        <form onSubmit={submit} className="flex gap-2 border-t border-border p-4">
          <Input value={text} onChange={event => setText(event.target.value)} placeholder={user ? 'Add a comment…' : 'Sign in to comment'} disabled={!user} />
          <EmojiPicker onEmojiSelect={emoji => setText(current => current + emoji)} />
          <GifStickerPicker onSelect={setAttachment} disabled={!user} />
          <Button type="submit" disabled={!user || (!text.trim() && !attachment)}>Post</Button>
        </form>
      </section>
    </div>,
    document.body,
  );
}
