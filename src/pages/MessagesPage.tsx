import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BadgeCheck, PenSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { mockArtists } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Artist } from '@/types';

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(() => {
    const toId = searchParams.get('to');
    if (toId) {
      return mockArtists.find(a => a.id === toId) || null;
    }
    return null;
  });

  const mockConversations = mockArtists.slice(0, 5).map((artist, index) => ({
    id: `conv-${index}`,
    artist,
    lastMessage: index === 0 
      ? "Hey! Love your latest track 🔥" 
      : index === 1 
      ? "Collab soon?" 
      : "Thanks for the support!",
    timestamp: new Date(Date.now() - (index * 1000 * 60 * 60 * 4)),
    unread: index < 2,
  }));

  const filteredConversations = mockConversations.filter(conv =>
    conv.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen pb-36 flex items-center justify-center">
        <div className="text-center p-8">
          <PenSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display font-bold text-xl mb-2">Messages</h2>
          <p className="text-muted-foreground mb-6">Sign in to message artists</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (selectedArtist) {
    return (
      <div className="min-h-screen pb-16">
        <ChatWindow
          recipient={selectedArtist}
          onBack={() => setSelectedArtist(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-display font-bold text-lg">Messages</h1>
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-xs text-muted-foreground">
              {mockConversations.filter(c => c.unread).length} new
            </span>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-none h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="divide-y divide-border">
        {filteredConversations.map((conv, index) => (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedArtist(conv.artist)}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden">
                <img
                  src={conv.artist.avatar}
                  alt={conv.artist.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {conv.unread && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={`font-semibold text-sm truncate ${conv.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {conv.artist.name}
                </span>
                {conv.artist.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
                )}
              </div>
              <p className={`text-sm truncate ${conv.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {conv.lastMessage}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(conv.timestamp)}
              </span>
              {conv.unread && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
