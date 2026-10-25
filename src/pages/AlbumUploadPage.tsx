import { useMemo, useState } from 'react';
import { ArrowLeft, Disc3, Loader2, Music2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/FirebaseAuthContext';
import { db, storage } from '@/lib/firebase';
import { DEFAULT_MEDIA_IMAGE, formatMediaDuration, readMediaDuration } from '@/lib/media';
import { toast } from 'sonner';

interface PendingTrack { file: File; title: string; duration: number }

export default function AlbumUploadPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseType, setReleaseType] = useState<'album' | 'ep'>('album');
  const [label, setLabel] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [tracks, setTracks] = useState<PendingTrack[]>([]);
  const [publishing, setPublishing] = useState(false);
  const coverPreview = useMemo(() => cover ? URL.createObjectURL(cover) : DEFAULT_MEDIA_IMAGE, [cover]);

  const selectTracks = async (files: FileList | null) => {
    if (!files) return;
    const selected = await Promise.all([...files].filter(file => file.type.startsWith('audio/')).map(async file => ({ file, title: file.name.replace(/\.[^.]+$/, ''), duration: await readMediaDuration(file) })));
    setTracks(selected);
  };

  const publish = async () => {
    if (!user || !profile) { navigate('/auth'); return; }
    if (!title.trim() || !genre || !tracks.length) { toast.error('Add an album title, genre, and at least one track.'); return; }
    setPublishing(true);
    try {
      const albumRef = doc(collection(db, 'albums'));
      let coverUrl = DEFAULT_MEDIA_IMAGE;
      if (cover) { const coverObject = ref(storage, `albums/${user.uid}/${albumRef.id}/cover-${cover.name}`); await uploadBytes(coverObject, cover); coverUrl = await getDownloadURL(coverObject); }
      const uploaded = await Promise.all(tracks.map(async (track, index) => {
        const audioObject = ref(storage, `audio/${user.uid}/albums/${albumRef.id}/${String(index + 1).padStart(2, '0')}-${track.file.name}`);
        await uploadBytes(audioObject, track.file);
        return { ...track, audioUrl: await getDownloadURL(audioObject), ref: doc(collection(db, 'tracks')), trackNumber: index + 1 };
      }));
      const artistName = profile.name || user.displayName || 'MusicInsta artist';
      const batch = writeBatch(db);
      for (const track of uploaded) batch.set(track.ref, { profile_id: profile.id || user.uid, title: track.title, genre, audio_url: track.audioUrl, cover_url: coverUrl, duration: track.duration, album_id: albumRef.id, track_number: track.trackNumber, is_public: true, credits: { primaryArtist: artistName, label: label || null, releaseType }, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      batch.set(albumRef, { profile_id: profile.id || user.uid, title: title.trim(), description: description.trim(), genre, release_type: releaseType, label: label.trim() || null, cover_url: coverUrl, track_ids: uploaded.map(track => track.ref.id), track_count: uploaded.length, total_duration: uploaded.reduce((sum, track) => sum + track.duration, 0), is_public: true, created_at: serverTimestamp(), updated_at: serverTimestamp() });
      batch.set(doc(collection(db, 'posts')), { profile_id: profile.id || user.uid, type: 'album', album_id: albumRef.id, image_url: coverUrl, caption: description.trim() || `${artistName} released ${title.trim()}`, likes: 0, comments: 0, shares: 0, is_story: false, is_new_release: true, is_new_post: true, created_at: serverTimestamp() });
      await batch.commit(); toast.success(`${releaseType === 'ep' ? 'EP' : 'Album'} published.`); navigate(`/albums/${albumRef.id}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The release could not be published.'); }
    finally { setPublishing(false); }
  };

  if (!user) return <div className="grid min-h-screen place-items-center"><Button onClick={() => navigate('/auth')}>Sign in to upload an album</Button></div>;
  return <div className="min-h-screen pb-32"><header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur"><Button variant="ghost" size="icon" onClick={() => navigate('/upload')}><ArrowLeft className="h-5 w-5" /></Button><Disc3 className="h-5 w-5 text-primary" /><h1 className="font-display text-lg font-bold">New album or EP</h1></header><main className="mx-auto max-w-3xl space-y-6 p-4">
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]"><label className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border"><img src={coverPreview} alt="Release cover" className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-black/70 p-2 text-center text-xs text-white">Choose cover</span><input type="file" accept="image/*" className="hidden" onChange={event => setCover(event.target.files?.[0] || null)} /></label><div className="space-y-4"><div><Label>Release title</Label><Input value={title} onChange={event => setTitle(event.target.value)} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><select value={releaseType} onChange={event => setReleaseType(event.target.value as 'album' | 'ep')} className="h-10 w-full rounded-md border border-input bg-background px-3"><option value="album">Album</option><option value="ep">EP</option></select></div><div><Label>Genre</Label><Input value={genre} onChange={event => setGenre(event.target.value)} placeholder="Amapiano, R&B..." /></div></div><div><Label>Label</Label><Input value={label} onChange={event => setLabel(event.target.value)} placeholder="Independent" /></div><div><Label>Description</Label><Textarea value={description} onChange={event => setDescription(event.target.value)} /></div></div></div>
    <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary"><Upload className="mx-auto mb-2 h-8 w-8 text-primary" /><p className="font-semibold">Choose all tracks in tracklist order</p><p className="text-sm text-muted-foreground">MP3, WAV, FLAC, M4A or OGG</p><input type="file" multiple accept="audio/*" className="hidden" onChange={event => void selectTracks(event.target.files)} /></label>
    <div className="space-y-2">{tracks.map((track, index) => <div key={`${track.file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-border p-3"><span className="w-6 text-sm text-muted-foreground">{index + 1}</span><Music2 className="h-5 w-5 text-primary" /><Input value={track.title} onChange={event => setTracks(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className="flex-1" /><span className="text-xs text-muted-foreground">{formatMediaDuration(track.duration)}</span></div>)}</div>
    <Button className="w-full" size="lg" disabled={publishing || !tracks.length} onClick={() => void publish()}>{publishing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing release...</> : `Publish ${releaseType === 'ep' ? 'EP' : 'album'}`}</Button>
  </main></div>;
}
