import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, BadgeCheck, Pencil, Trash2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Artist } from '@/types';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EmojiPicker } from './EmojiPicker';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';
import { GifStickerPicker, SocialAttachment, type SocialMediaAttachment } from '@/components/social/GifStickerPicker';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  isOwn: boolean;
  edited: boolean;
  attachment?: SocialMediaAttachment;
}

interface ChatWindowProps {
  recipient: Artist;
  onBack: () => void;
}

export function ChatWindow({ recipient, onBack }: ChatWindowProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [attachment, setAttachment] = useState<SocialMediaAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const identityId = profile?.id || user.uid;
    const conversationId = [identityId, recipient.id].sort().join('_');
    return onSnapshot(query(collection(db, 'messages'), where('conversation_id', '==', conversationId)), snapshot => {
      const next = snapshot.docs.map(item => {
        const value = item.data();
        const mediaType = value.media_type === 'gif' || value.media_type === 'sticker' ? value.media_type : undefined;
        return { id: item.id, content: value.content || '', senderId: value.sender_id, timestamp: value.created_at?.toDate?.() || new Date(), isOwn: value.sender_id === identityId, edited: Boolean(value.edited_at), attachment: mediaType ? { type: mediaType, url: value.media_url || undefined, sticker: value.sticker || undefined } : undefined };
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(next);
      const unread = snapshot.docs.filter(item => item.data().recipient_id === identityId && !item.data().read);
      if (unread.length) { const batch = writeBatch(db); unread.forEach(item => batch.update(item.ref, { read: true, read_at: serverTimestamp() })); void batch.commit(); }
    }, () => toast.error('Messages could not be loaded.'));
  }, [profile?.id, recipient.id, user]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachment) || !user || !profile) return;

    const content = newMessage.trim(); const selectedAttachment = attachment; setNewMessage(''); setAttachment(null); setSending(true);
    try {
      const identityId = profile.id || user.uid;
      const conversationId = [identityId, recipient.id].sort().join('_');
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'messages')), { conversation_id: conversationId, sender_id: identityId, actor_uid: user.uid, recipient_id: recipient.id, content, media_type: selectedAttachment?.type || null, media_url: selectedAttachment?.url || null, sticker: selectedAttachment?.sticker || null, created_at: serverTimestamp(), read: false });
      batch.set(doc(db, 'conversations', conversationId), { participant_ids: [identityId, recipient.id], actor_uids: [user.uid], last_message: content || (selectedAttachment?.type === 'gif' ? 'Sent a GIF' : 'Sent a sticker'), last_sender_id: identityId, updated_at: serverTimestamp() }, { merge: true });
      batch.set(doc(collection(db, 'notifications')), { profile_id: recipient.id, from_profile_id: profile.id, type: 'message', message: 'sent you a message', read: false, created_at: serverTimestamp() });
      await batch.commit();
    } catch { setNewMessage(content); setAttachment(selectedAttachment); toast.error('Message could not be sent.'); }
    finally { setSending(false); }
  };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    await updateDoc(doc(db, 'messages', editingId), { content: editingText.trim(), edited_at: serverTimestamp() });
    setEditingId(null); setEditingText('');
  };

  const removeMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return;
    await deleteDoc(doc(db, 'messages', messageId));
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={recipient.avatar || DEFAULT_MEDIA_IMAGE}
              alt={recipient.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{recipient.name}</span>
              {recipient.isVerified && (
                <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">Active now</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                message.isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              }`}
            >
              {message.attachment && <SocialAttachment attachment={message.attachment} className={message.content ? 'mb-2' : ''} />}
              {editingId === message.id ? <div className="flex items-center gap-1"><Input value={editingText} onChange={event => setEditingText(event.target.value)} className="h-8 min-w-48 bg-background text-foreground" autoFocus /><button aria-label="Save message" onClick={() => void saveEdit()}><Check className="h-4 w-4" /></button><button aria-label="Cancel editing" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></button></div> : message.content ? <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p> : null}
              <p className={`text-[10px] mt-1 ${message.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}{message.edited ? ' · edited' : ''}
              </p>
              {message.isOwn && editingId !== message.id && <div className="mt-1 flex justify-end gap-2 opacity-70">{message.content && <button aria-label="Edit message" onClick={() => { setEditingId(message.id); setEditingText(message.content); }}><Pencil className="h-3.5 w-3.5" /></button>}<button aria-label="Delete message" onClick={() => void removeMessage(message.id)}><Trash2 className="h-3.5 w-3.5" /></button></div>}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card safe-bottom">
        {attachment && <div className="mb-2 flex items-end gap-2 rounded-xl bg-muted/60 p-2"><SocialAttachment attachment={attachment} /><button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)} className="rounded-full bg-background p-1"><X className="h-4 w-4" /></button></div>}
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-none"
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <GifStickerPicker onSelect={setAttachment} disabled={sending} />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={(!newMessage.trim() && !attachment) || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
