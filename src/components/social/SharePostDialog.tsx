import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ExternalLink, Search, Send, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Person { id: string; name: string; username: string; avatar: string }

export function SharePostDialog({ open, postId, title, onClose }: { open: boolean; postId: string; title: string; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    void getDocs(collection(db, 'profiles')).then(snapshot => setPeople(snapshot.docs.map(item => ({ id: item.id, name: item.data().name || 'MusicInsta user', username: item.data().username || 'user', avatar: item.data().avatar_url || DEFAULT_MEDIA_IMAGE })).filter(item => item.id !== profile?.id)));
  }, [open, profile?.id]);
  const visible = useMemo(() => people.filter(person => `${person.name} ${person.username}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30), [people, search]);
  const url = `${window.location.origin}/?post=${postId}`;
  const send = async (person: Person) => {
    if (!user || !profile) return;
    setSending(person.id);
    try {
      const conversationId = [profile.id, person.id].sort().join('_');
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'messages')), { conversation_id: conversationId, sender_id: profile.id, actor_uid: user.uid, recipient_id: person.id, content: `Shared a post: ${title}\n${url}`, shared_post_id: postId, created_at: serverTimestamp(), read: false });
      batch.set(doc(db, 'conversations', conversationId), { participant_ids: [profile.id, person.id], actor_uids: [user.uid], last_message: `Shared: ${title}`, last_sender_id: profile.id, updated_at: serverTimestamp() }, { merge: true });
      await batch.commit(); toast.success(`Sent to ${person.name}.`);
    } catch { toast.error('The post could not be sent.'); }
    finally { setSending(null); }
  };
  const external = async () => {
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); toast.success('Link copied.'); } }
    catch (error) { if ((error as DOMException).name !== 'AbortError') toast.error('The post could not be shared.'); }
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/75 p-4" onClick={onClose}><section className="w-full max-w-md rounded-2xl border border-border bg-card p-4" onClick={event => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Share on MusicInsta</h2><p className="text-xs text-muted-foreground">Send to people here before sharing elsewhere.</p></div><button onClick={onClose}><X className="h-5 w-5" /></button></div><div className="relative mb-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people" /></div><div className="max-h-72 space-y-1 overflow-y-auto">{visible.map(person => <div key={person.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"><img src={person.avatar} alt="" className="h-10 w-10 rounded-full object-cover"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="truncate text-xs text-muted-foreground">@{person.username}</p></div><Button size="sm" disabled={sending === person.id} onClick={() => void send(person)}><Send className="mr-1 h-4 w-4"/>Send</Button></div>)}</div><Button variant="outline" className="mt-4 w-full" onClick={() => void external()}><ExternalLink className="mr-2 h-4 w-4"/>Share outside MusicInsta</Button></section></div>;
}
