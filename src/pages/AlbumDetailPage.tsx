import { useEffect, useState } from 'react';
import { ArrowLeft, Disc3, Play } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { usePlayer } from '@/context/PlayerContext';
import { DEFAULT_MEDIA_IMAGE, formatMediaDuration } from '@/lib/media';
import type { Track } from '@/types';

export default function AlbumDetailPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const { catalog, openInMainPlayer } = usePlayer();
  const [album, setAlbum] = useState<Record<string, unknown> | null>(null);
  const [trackIds, setTrackIds] = useState<string[]>([]);
  useEffect(() => { if (!id) return; void getDoc(doc(db, 'albums', id)).then(snapshot => { if (!snapshot.exists()) return; setAlbum({ id: snapshot.id, ...snapshot.data() }); setTrackIds((snapshot.data().track_ids || []) as string[]); }); }, [id]);
  const tracks = trackIds.map(trackId => catalog.find(track => track.id === trackId)).filter(Boolean) as Track[];
  if (!album) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading release...</div>;
  const cover = String(album.cover_url || DEFAULT_MEDIA_IMAGE); const title = String(album.title || 'Untitled release');
  const play = (track = tracks[0]) => track && openInMainPlayer(track, tracks);
  return <div className="min-h-screen pb-36"><section className="relative overflow-hidden border-b border-border"><img src={cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-3xl" /><div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:flex-row sm:items-end sm:p-10"><Button variant="ghost" size="icon" className="absolute left-3 top-3" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button><img src={cover} alt={title} className="aspect-square w-56 rounded-2xl object-cover shadow-2xl" /><div className="pb-2"><p className="text-xs font-bold uppercase tracking-[.25em] text-primary">{String(album.release_type || 'album')}</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">{title}</h1><p className="mt-3 text-muted-foreground">{String(album.genre || '')} · {tracks.length} tracks · {formatMediaDuration(Number(album.total_duration))}</p><p className="mt-3 max-w-xl text-sm text-muted-foreground">{String(album.description || '')}</p><Button className="mt-5 rounded-full" onClick={() => play()} disabled={!tracks.length}><Play className="mr-2 h-4 w-4" fill="currentColor" />Play release</Button></div></div></section><main className="mx-auto max-w-5xl p-4 sm:p-8"><div className="space-y-1">{tracks.map((track, index) => <button key={track.id} onClick={() => play(track)} className="group flex w-full items-center gap-4 rounded-xl p-3 text-left hover:bg-muted"><span className="w-7 text-center text-sm text-muted-foreground group-hover:hidden">{index + 1}</span><Play className="hidden h-4 w-7 text-primary group-hover:block" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{track.title}</p><p className="truncate text-sm text-muted-foreground">{track.artist.name}</p></div><span className="text-sm text-muted-foreground">{formatMediaDuration(track.duration)}</span></button>)}{!tracks.length && <div className="py-16 text-center"><Disc3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground" /><p>The tracks for this release are still loading.</p></div>}</div></main></div>;
}
