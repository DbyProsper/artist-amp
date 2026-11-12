import { useEffect, useState } from 'react';
import { ListPlus, LoaderCircle, Play, Trash2, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import {
  addYouTubeToPlaylist,
  loadYouTubeHistory,
  removeYouTubeHistory,
  searchYouTube,
  saveYouTubeHistory,
  type YouTubeMedia,
  youtubeMediaToTrack,
} from '@/services/youtubeDiscoveryService';
import { usePlayer } from '@/context/PlayerContext';
import { genreMatches } from '@/lib/genres';

interface Props {
  query?: string;
  historyOnly?: boolean;
  genre?: string | null;
}

export function YouTubeDiscoverResults({ query: searchQuery = '', historyOnly = false, genre = null }: Props) {
  const { user, profile } = useAuth();
  const { playTrack, catalog } = usePlayer();
  const [items, setItems] = useState<YouTubeMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playlistItem, setPlaylistItem] = useState<YouTubeMedia | null>(null);
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (historyOnly) {
      if (!user) { setItems([]); return; }
      setLoading(true);
      loadYouTubeHistory().then(response => setItems((response.results || []).filter(item => !genre || genreMatches(youtubeMediaToTrack(item).genre, genre)))).catch(() => setItems([])).finally(() => setLoading(false));
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 2) { setItems([]); setError(''); return; }
    setLoading(true); setError('');
    searchYouTube(query)
      .then(response => setItems(response.results || []))
      .catch(cause => { setItems([]); setError(cause instanceof Error ? cause.message : 'Search is unavailable.'); })
      .finally(() => setLoading(false));
  }, [genre, historyOnly, searchQuery, user]);

  const play = (item: YouTubeMedia) => {
    const enriched = { ...item, genre: youtubeMediaToTrack(item).genre };
    const youtubeQueue = items.map(youtubeMediaToTrack);
    playTrack(youtubeMediaToTrack(enriched), [...youtubeQueue, ...catalog]);
    if (user) void saveYouTubeHistory(enriched).catch(() => undefined);
  };

  const openPlaylistPicker = async (item: YouTubeMedia) => {
    if (!user || !profile) { toast.info('Sign in to save this to a playlist.'); return; }
    const [byCreator, byAuth] = await Promise.all([
      getDocs(query(collection(db, 'playlists'), where('creator_id', '==', profile.id))),
      profile.id === user.uid ? Promise.resolve(null) : getDocs(query(collection(db, 'playlists'), where('auth_user_id', '==', user.uid))),
    ]);
    const unique = new Map([...byCreator.docs, ...(byAuth?.docs || [])].map(doc => [doc.id, { id: doc.id, name: String(doc.data().name || 'Untitled playlist') }]));
    setPlaylists([...unique.values()]);
    setPlaylistItem(item);
  };

  const saveToPlaylist = async (playlistId: string) => {
    if (!playlistItem) return;
    try {
      await addYouTubeToPlaylist(playlistId, playlistItem);
      toast.success('Added to playlist.');
      setPlaylistItem(null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not add this video.');
    }
  };

  const removeFromHistory = async (item: YouTubeMedia) => {
    const previous = items;
    setItems(current => current.filter(value => value.id !== item.id));
    try {
      await removeYouTubeHistory(item.id);
      toast.success('Removed from YouTube Listen Again.');
    } catch (cause) {
      setItems(previous);
      toast.error(cause instanceof Error ? cause.message : 'This item could not be removed.');
    }
  };

  if (!loading && !error && items.length === 0) return null;

  return <section className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-display text-lg font-bold">{historyOnly ? 'YouTube — Listen again' : 'YouTube Music & music videos'}</h3>
        <p className="text-xs text-muted-foreground">{historyOnly ? 'Music and videos you previously opened in Discover.' : 'Search results are cached to conserve daily API quota.'}</p>
      </div>
      {loading && <LoaderCircle className="h-5 w-5 animate-spin text-primary" />}
    </div>
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(item => <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
        <button type="button" onClick={() => play(item)} className="group relative block aspect-video w-full overflow-hidden bg-muted text-left">
          <img src={item.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
          <span className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl"><Play className="h-5 w-5 fill-current" /></span></span>
        </button>
        <div className="p-3">
          <span className="mb-2 inline-flex rounded-full bg-red-600/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-400">YouTube</span>
          <p className="line-clamp-2 font-semibold">{item.title}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{item.artistOrChannel}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => play(item)}><Play className="mr-1 h-4 w-4" />Play</Button>
            <Button size="icon" variant="outline" aria-label="Add to playlist" onClick={() => void openPlaylistPicker(item)}><ListPlus className="h-4 w-4" /></Button>
            {historyOnly && <Button size="icon" variant="outline" aria-label={`Remove ${item.title} from Listen Again`} onClick={() => void removeFromHistory(item)}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
      </article>)}
    </div>

    {playlistItem && <div className="fixed inset-0 z-[150] grid place-items-center bg-black/70 p-4" onClick={() => setPlaylistItem(null)}><div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4" onClick={event => event.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Add to playlist</h3><button type="button" onClick={() => setPlaylistItem(null)}><X className="h-5 w-5" /></button></div><div className="space-y-2">{playlists.map(playlist => <button type="button" key={playlist.id} onClick={() => void saveToPlaylist(playlist.id)} className="w-full rounded-xl bg-muted p-3 text-left hover:bg-muted/80">{playlist.name}</button>)}{playlists.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Create a playlist in your Library first.</p>}</div></div></div>}
  </section>;
}
