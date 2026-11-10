import { useEffect, useRef, useState } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ImagePlus, LoaderCircle, Search, Sticker, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';
import { findGiphyMedia, type GiphyKind, type GiphyResult } from '@/services/giphyService';

export interface SocialMediaAttachment {
  type: 'gif' | 'sticker';
  url?: string;
  sticker?: string;
}

interface Props {
  onSelect: (attachment: SocialMediaAttachment) => void;
  disabled?: boolean;
}

const STICKERS = ['🔥', '💜', '😂', '😍', '🎉', '👏', '🙌', '💯', '🎸', '🎤', '🎧', '✨', '🚀', '😎', '🥹', '🤯'];
const MAX_GIF_BYTES = 10 * 1024 * 1024;
const MAX_STICKER_BYTES = 5 * 1024 * 1024;

export function GifStickerPicker({ onSelect, disabled = false }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState<'gif' | 'sticker' | null>(null);
  const [kind, setKind] = useState<GiphyKind>('gifs');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !import.meta.env.VITE_GIPHY_API_KEY) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearching(true);
      void findGiphyMedia(kind, search, controller.signal)
        .then(setResults)
        .catch(error => { if (error?.name !== 'AbortError') toast.error('GIPHY could not be loaded.'); })
        .finally(() => setSearching(false));
    }, search ? 300 : 0);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [kind, open, search]);

  const upload = async (file: File, type: 'gif' | 'sticker') => {
    if (!user) { toast.info('Sign in to add GIFs or stickers.'); return; }
    const allowed = type === 'gif'
      ? file.type === 'image/gif'
      : ['image/png', 'image/webp', 'image/gif'].includes(file.type);
    const maximum = type === 'gif' ? MAX_GIF_BYTES : MAX_STICKER_BYTES;
    if (!allowed) { toast.error(type === 'gif' ? 'Choose a GIF file.' : 'Choose a PNG, WebP or GIF sticker.'); return; }
    if (file.size > maximum) { toast.error(`${type === 'gif' ? 'GIFs' : 'Stickers'} must be smaller than ${maximum / 1024 / 1024} MB.`); return; }

    setUploading(type);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (type === 'gif' ? 'gif' : 'webp');
      const object = ref(storage, `uploads/${user.uid}/social-media/${Date.now()}-${crypto.randomUUID()}.${extension}`);
      await uploadBytes(object, file, { contentType: file.type, customMetadata: { mediaType: type } });
      onSelect({ type, url: await getDownloadURL(object) });
      setOpen(false);
    } catch {
      toast.error(`${type === 'gif' ? 'GIF' : 'Sticker'} could not be uploaded.`);
    } finally {
      setUploading(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-label="Add GIF or sticker" className="rounded-full p-2 transition-colors hover:bg-muted disabled:opacity-50">
          <Sticker className="h-5 w-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="z-[260] w-80 border-border bg-card p-3">
        <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
          {(['gifs', 'stickers'] as GiphyKind[]).map(value => <button key={value} type="button" onClick={() => setKind(value)} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${kind === value ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>{value}</button>)}
        </div>
        {import.meta.env.VITE_GIPHY_API_KEY ? <>
          <label className="relative mb-3 block"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search GIPHY ${kind}`} className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"/></label>
          <div className="mb-3 grid max-h-52 grid-cols-3 gap-1 overflow-y-auto rounded-lg">
            {results.map(item => <button key={item.id} type="button" title={item.title} onClick={() => { onSelect({ type: kind === 'gifs' ? 'gif' : 'sticker', url: item.url }); setOpen(false); }} className="aspect-square overflow-hidden rounded-md bg-muted"><img src={item.previewUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover"/></button>)}
            {searching && <div className="col-span-3 grid h-20 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-primary"/></div>}
          </div>
          <p className="mb-3 text-right text-[10px] font-semibold text-muted-foreground">Powered by GIPHY</p>
        </> : <p className="mb-3 rounded-lg bg-muted p-2 text-xs text-muted-foreground">GIPHY search will appear after the site key is configured. File uploads and quick stickers still work.</p>}
        <div className="mb-3 flex gap-2">
          <button type="button" disabled={Boolean(uploading)} onClick={() => gifInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
            {uploading === 'gif' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload GIF
          </button>
          <button type="button" disabled={Boolean(uploading)} onClick={() => stickerInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
            {uploading === 'sticker' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Sticker
          </button>
          <input ref={gifInputRef} type="file" accept="image/gif" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file, 'gif'); }} />
          <input ref={stickerInputRef} type="file" accept="image/png,image/webp,image/gif" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void upload(file, 'sticker'); }} />
        </div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Quick stickers</p>
        <div className="grid grid-cols-4 gap-1">
          {STICKERS.map(sticker => <button key={sticker} type="button" aria-label={`Add ${sticker} sticker`} onClick={() => { onSelect({ type: 'sticker', sticker }); setOpen(false); }} className="rounded-lg p-2 text-3xl transition hover:bg-muted hover:scale-110">{sticker}</button>)}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SocialAttachment({ attachment, className = '' }: { attachment: SocialMediaAttachment; className?: string }) {
  if (attachment.sticker) return <div role="img" aria-label="Sticker" className={`select-none text-6xl leading-none ${className}`}>{attachment.sticker}</div>;
  if (!attachment.url) return null;
  return <img src={attachment.url} alt={attachment.type === 'gif' ? 'GIF' : 'Sticker'} loading="lazy" decoding="async" draggable={false} className={`${attachment.type === 'sticker' ? 'max-h-40 max-w-40 object-contain' : 'max-h-64 w-full rounded-xl object-cover'} ${className}`} />;
}
