import { useRef, useState } from 'react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { ImagePlus, LoaderCircle, Sticker, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'sonner';

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
  const gifInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);

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
      <PopoverContent side="top" align="end" className="z-[260] w-72 border-border bg-card p-3">
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
