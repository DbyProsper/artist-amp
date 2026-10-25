import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BadgeCheck, PenSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/context/FirebaseAuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChatWindow } from '@/components/chat/ChatWindow';
import type { Artist } from '@/types';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';

interface Conversation { id: string; artist: Artist; lastMessage: string; timestamp: Date; unread: number }

function artistFromProfile(id: string, data: DocumentData): Artist {
  return { id, name: data.name || 'MusicInsta user', username: data.username || 'user', avatar: data.avatar_url || DEFAULT_MEDIA_IMAGE, coverImage: data.cover_url || DEFAULT_MEDIA_IMAGE, bio: data.bio || '', location: data.location || '', genres: Array.isArray(data.genres) ? data.genres : [], isVerified: Boolean(data.is_verified), followers: 0, following: 0, tracks: 0 };
}

function formatTimeAgo(date: Date): string {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [sent, setSent] = useState<Array<{ id: string; data: DocumentData }>>([]);
  const [received, setReceived] = useState<Array<{ id: string; data: DocumentData }>>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toId = searchParams.get('to');
    if (!toId || selectedArtist?.id === toId) return;
    void getDoc(doc(db, 'profiles', toId)).then(snapshot => snapshot.exists() && setSelectedArtist(artistFromProfile(snapshot.id, snapshot.data())));
  }, [searchParams, selectedArtist?.id]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const identityId = profile?.id || user.uid;
    const unsubscribeSent = onSnapshot(query(collection(db, 'messages'), where('sender_id', '==', identityId)), snapshot => setSent(snapshot.docs.map(item => ({ id: item.id, data: item.data() }))), () => setLoading(false));
    const unsubscribeReceived = onSnapshot(query(collection(db, 'messages'), where('recipient_id', '==', identityId)), snapshot => setReceived(snapshot.docs.map(item => ({ id: item.id, data: item.data() }))), () => setLoading(false));
    return () => { unsubscribeSent(); unsubscribeReceived(); };
  }, [profile?.id, user]);

  useEffect(() => {
    if (!user) return;
    const identityId = profile?.id || user.uid;
    const all = [...sent, ...received];
    const participantIds = [...new Set(all.map(item => item.data.sender_id === identityId ? item.data.recipient_id : item.data.sender_id).filter(Boolean))];
    void Promise.all(participantIds.map(async id => { const snapshot = await getDoc(doc(db, 'profiles', String(id))); return snapshot.exists() ? artistFromProfile(snapshot.id, snapshot.data()) : null; })).then(artists => {
      const byId = new Map(artists.filter(Boolean).map(artist => [artist!.id, artist!]));
      const grouped = new Map<string, Conversation>();
      for (const item of all) {
        const data = item.data;
        const otherId = String(data.sender_id === identityId ? data.recipient_id : data.sender_id);
        const artist = byId.get(otherId); if (!artist) continue;
        const timestamp = data.created_at?.toDate?.() || new Date(0);
        const current = grouped.get(otherId);
        if (!current || timestamp > current.timestamp) grouped.set(otherId, { id: data.conversation_id || otherId, artist, lastMessage: data.content || 'Attachment', timestamp, unread: 0 });
        if (data.recipient_id === identityId && !data.read) grouped.get(otherId)!.unread += 1;
      }
      setConversations([...grouped.values()].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())); setLoading(false);
    });
  }, [profile?.id, received, sent, user]);

  useEffect(() => {
    if (!user || searchQuery.trim().length < 2) { setPeople([]); return; }
    const needle = searchQuery.trim().toLowerCase();
    void getDocs(collection(db, 'profiles')).then(snapshot => setPeople(snapshot.docs.filter(item => item.id !== user.uid).map(item => artistFromProfile(item.id, item.data())).filter(artist => `${artist.name} ${artist.username}`.toLowerCase().includes(needle)).slice(0, 20)));
  }, [searchQuery, user]);

  const visibleConversations = useMemo(() => { const needle = searchQuery.trim().toLowerCase(); return conversations.filter(item => !needle || `${item.artist.name} ${item.artist.username}`.toLowerCase().includes(needle)); }, [conversations, searchQuery]);

  if (!user) return <div className="min-h-screen pb-36 flex items-center justify-center"><div className="text-center p-8"><PenSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h2 className="font-display font-bold text-xl mb-2">Messages</h2><p className="text-muted-foreground mb-6">Sign in to message artists</p><Button onClick={() => navigate('/auth')}>Sign In</Button></div></div>;
  if (selectedArtist) return <div className="min-h-screen pb-16"><ChatWindow recipient={selectedArtist} onBack={() => { setSelectedArtist(null); const next = new URLSearchParams(searchParams); next.delete('to'); setSearchParams(next, { replace: true }); }} /></div>;

  const unread = conversations.reduce((sum, item) => sum + item.unread, 0);
  return <div className="min-h-screen pb-36">
    <header className="sticky top-0 z-40 glass border-b border-border"><div className="flex items-center justify-between px-4 h-14"><div className="flex items-center gap-3"><BackButton /><h1 className="font-display font-bold text-lg">Messages</h1></div><span className="text-xs text-muted-foreground">{unread ? `${unread} new` : 'All caught up'}</span></div></header>
    <div className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" /><Input placeholder="Search conversations or artists..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="pl-10 bg-muted border-none h-11 rounded-xl" /></div></div>
    <div className="divide-y divide-border">
      {searchQuery.trim().length >= 2 && people.map(artist => <button key={`person-${artist.id}`} onClick={() => setSelectedArtist(artist)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50"><img src={artist.avatar} alt="" className="h-12 w-12 rounded-full object-cover" /><div><p className="font-semibold">{artist.name}</p><p className="text-sm text-muted-foreground">Start a conversation · @{artist.username}</p></div></button>)}
      {visibleConversations.map((conversation, index) => <motion.button key={conversation.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .03 }} onClick={() => setSelectedArtist(conversation.artist)} className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 text-left"><div className="relative"><img src={conversation.artist.avatar} alt={conversation.artist.name} className="w-14 h-14 rounded-full object-cover" />{conversation.unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{conversation.unread}</span>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><span className="truncate text-sm font-semibold">{conversation.artist.name}</span>{conversation.artist.isVerified && <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />}</div><p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p></div><span className="text-xs text-muted-foreground">{formatTimeAgo(conversation.timestamp)}</span></motion.button>)}
      {!loading && !visibleConversations.length && searchQuery.trim().length < 2 && <div className="px-6 py-16 text-center"><PenSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No conversations yet</p><p className="mt-1 text-sm text-muted-foreground">Search for an artist above to send the first message.</p></div>}
    </div>
  </div>;
}
