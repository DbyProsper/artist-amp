import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, BadgeCheck, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Artist } from '@/types';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EmojiPicker } from './EmojiPicker';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatWindowProps {
  recipient: Artist;
  onBack: () => void;
}

export function ChatWindow({ recipient, onBack }: ChatWindowProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const conversationId = [user.uid, recipient.id].sort().join('_');
    return onSnapshot(query(collection(db, 'messages'), where('conversation_id', '==', conversationId)), snapshot => {
      const next = snapshot.docs.map(item => {
        const value = item.data();
        return { id: item.id, content: value.content || '', senderId: value.sender_id, timestamp: value.created_at?.toDate?.() || new Date(), isOwn: value.sender_id === user.uid };
      }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setMessages(next);
    }, () => toast.error('Messages could not be loaded.'));
  }, [recipient.id, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !profile) return;

    const content = newMessage.trim(); setNewMessage('');
    try {
      const conversationId = [user.uid, recipient.id].sort().join('_');
      await addDoc(collection(db, 'messages'), { conversation_id: conversationId, sender_id: user.uid, recipient_id: recipient.id, content, created_at: serverTimestamp(), read: false });
      await addDoc(collection(db, 'notifications'), { profile_id: recipient.id, from_profile_id: profile.id, type: 'message', message: 'sent you a message', read: false, created_at: serverTimestamp() });
    } catch { setNewMessage(content); toast.error('Message could not be sent.'); }
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
              src={recipient.avatar}
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
              <p className="text-sm">{message.content}</p>
              <p className={`text-[10px] mt-1 ${message.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card safe-bottom">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
            <Image className="w-5 h-5 text-muted-foreground" />
          </button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-muted border-none"
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
