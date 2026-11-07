import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { Brush, Check, Download, Music2, RotateCcw, Search, Smile, Type, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { AttachedPlatformMusic, SocialAdjustments, SocialAspectRatio, SocialEditState, SocialOverlay } from '@/types/socialEditor';
import { DEFAULT_SOCIAL_ADJUSTMENTS, EMPTY_SOCIAL_EDIT_STATE, aspectRatioValue, socialFilter } from '@/types/socialEditor';
import { DEFAULT_MEDIA_IMAGE } from '@/lib/media';
import { renderSocialImage } from '@/lib/socialMediaEditor';
import { toast } from 'sonner';

interface SocialMediaEditorProps {
  open: boolean;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  initialState?: SocialEditState;
  onClose: () => void;
  onSave: (state: SocialEditState) => Promise<void> | void;
}

const adjustmentLabels: Array<[keyof SocialAdjustments, string]> = [
  ['adjust', 'Adjust'], ['lux', 'Lux'], ['brightness', 'Brightness'], ['contrast', 'Contrast'],
  ['structure', 'Structure'], ['warmth', 'Warmth'], ['saturation', 'Saturation'], ['color', 'Colour'],
  ['fade', 'Fade'], ['highlights', 'Highlights'], ['shadows', 'Shadows'], ['vignette', 'Vignette'],
  ['tiltShift', 'Tilt shift'], ['sharpen', 'Sharpen'],
];

const stickers = ['🔥', '✨', '❤️', '🎵', '🎤', '🎧', '💿', '⭐', '🎸', '🥁', '👑', '🚀'];
const normalizeEditState = (value?: SocialEditState): SocialEditState => ({
  ...EMPTY_SOCIAL_EDIT_STATE,
  ...(value || {}),
  adjustments: { ...DEFAULT_SOCIAL_ADJUSTMENTS, ...(value?.adjustments || {}) },
  overlays: Array.isArray(value?.overlays) ? value.overlays.map(item => ({ ...item, x: Number.isFinite(item.x) ? Math.max(3, Math.min(97, item.x)) : 50, y: Number.isFinite(item.y) ? Math.max(3, Math.min(97, item.y)) : 50, scale: Number.isFinite(item.scale) ? item.scale : 1, rotation: Number.isFinite(item.rotation) ? item.rotation : 0 })) : [],
});

export function SocialMediaEditor({ open, mediaUrl, mediaType, initialState, onClose, onSave }: SocialMediaEditorProps) {
  const [state, setState] = useState<SocialEditState>(() => normalizeEditState(initialState));
  const [activeTool, setActiveTool] = useState<'adjust' | 'text' | 'stickers' | 'draw' | 'music'>('adjust');
  const [text, setText] = useState('');
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [drawSize, setDrawSize] = useState(5);
  const [drawing, setDrawing] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [tracks, setTracks] = useState<AttachedPlatformMusic[]>([]);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setState(normalizeEditState(initialState));
    setActiveTool('adjust'); setSelectedOverlay(null);
    void getDocs(query(collection(db, 'tracks'), limit(100))).then(snapshot => {
      setTracks(snapshot.docs.map(item => {
        const value = item.data();
        return { trackId: item.id, title: String(value.title || 'Untitled track'), artist: String(value.credits?.primaryArtist || value.artist_name || 'MusicInsta artist'), audioUrl: String(value.audio_url || ''), coverArt: value.cover_url || DEFAULT_MEDIA_IMAGE, duration: Math.max(0, Number(value.duration) || 0) };
      }).filter(item => item.audioUrl));
    }).catch(() => setTracks([]));
  }, [initialState, open]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current; const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(bounds.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(bounds.height * devicePixelRatio));
    const context = canvas.getContext('2d'); context?.scale(devicePixelRatio, devicePixelRatio);
    if (state.drawingDataUrl) {
      const image = new Image(); image.onload = () => context?.drawImage(image, 0, 0, bounds.width, bounds.height); image.src = state.drawingDataUrl;
    }
  }, [open, state.drawingDataUrl]);

  const selected = state.overlays.find(item => item.id === selectedOverlay);
  const filteredTracks = useMemo(() => {
    const needle = musicQuery.trim().toLowerCase();
    return tracks.filter(track => !needle || `${track.title} ${track.artist}`.toLowerCase().includes(needle)).slice(0, 12);
  }, [musicQuery, tracks]);

  if (!open) return null;

  const addOverlay = (type: 'text' | 'sticker', content: string) => {
    if (!content.trim()) return;
    const overlay: SocialOverlay = { id: `${type}-${Date.now()}`, type, content: content.trim(), x: 50, y: 50, scale: 1, rotation: 0, color: '#ffffff' };
    setState(current => ({ ...current, overlays: [...current.overlays, overlay] })); setSelectedOverlay(overlay.id); setText('');
  };
  const updateOverlay = (updates: Partial<SocialOverlay>) => setState(current => ({ ...current, overlays: current.overlays.map(item => item.id === selectedOverlay ? { ...item, ...updates } : item) }));
  const moveOverlay = (event: ReactPointerEvent<HTMLButtonElement>, overlayId: string) => {
    const bounds = previewRef.current?.getBoundingClientRect(); if (!bounds) return;
    const x = Math.max(3, Math.min(97, (event.clientX - bounds.left) / bounds.width * 100));
    const y = Math.max(3, Math.min(97, (event.clientY - bounds.top) / bounds.height * 100));
    setState(current => ({ ...current, overlays: current.overlays.map(item => item.id === overlayId ? { ...item, x, y } : item) }));
  };
  const updateAdjustment = (key: keyof SocialAdjustments, value: number) => setState(current => ({ ...current, adjustments: { ...current.adjustments, [key]: value } }));
  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }; };
  const beginDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (activeTool !== 'draw') return; setDrawing(true); event.currentTarget.setPointerCapture(event.pointerId); const context = event.currentTarget.getContext('2d'); const p = point(event); context?.beginPath(); context?.moveTo(p.x, p.y); };
  const continueDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => { if (!drawing || activeTool !== 'draw') return; const context = event.currentTarget.getContext('2d'); const p = point(event); if (!context) return; context.strokeStyle = drawColor; context.lineWidth = drawSize; context.lineCap = 'round'; context.lineJoin = 'round'; context.lineTo(p.x, p.y); context.stroke(); };
  const endDraw = () => { setDrawing(false); if (canvasRef.current) setState(current => ({ ...current, drawingDataUrl: canvasRef.current?.toDataURL('image/png') })); };
  const clearDrawing = () => { const canvas = canvasRef.current; canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); setState(current => ({ ...current, drawingDataUrl: undefined })); };
  const attachTrack = (track: AttachedPlatformMusic) => {
    if (track.duration && track.duration < 15) { toast.error('Story music must be at least 15 seconds long.'); return; }
    const maximum = track.duration && track.duration > 0 ? Math.min(60, track.duration) : 60;
    const duration = Math.max(15, Math.min(30, maximum));
    setState(current => ({ ...current, attachedMusic: { ...track, clipStart: 0, clipEnd: duration } }));
  };
  const updateMusicClip = ([requestedStart, requestedEnd]: number[]) => setState(current => {
    if (!current.attachedMusic) return current;
    const previousStart = current.attachedMusic.clipStart || 0;
    const previousEnd = current.attachedMusic.clipEnd || previousStart + 15;
    const total = Math.max(15, current.attachedMusic.duration || 60);
    let start = requestedStart, end = requestedEnd;
    if (end - start > 60) {
      if (Math.abs(start - previousStart) >= Math.abs(end - previousEnd)) end = start + 60;
      else start = end - 60;
    }
    start = Math.max(0, Math.min(start, total - 15));
    end = Math.min(total, Math.max(start + 15, end));
    return { ...current, attachedMusic: { ...current.attachedMusic, clipStart: Number(start.toFixed(1)), clipEnd: Number(end.toFixed(1)) } };
  });
  const save = async () => { setSaving(true); try { await onSave(state); } finally { setSaving(false); } };
  const downloadEditedImage = async () => {
    if (mediaType !== 'image') return;
    try { const file = await renderSocialImage(mediaUrl, state); const url = URL.createObjectURL(file); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); toast.success('Edited image downloaded.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'The edited image could not be downloaded.'); }
  };

  return <div className="fixed inset-0 z-[120] flex flex-col bg-black text-white">
    <header className="flex h-14 items-center justify-between border-b border-white/10 px-3"><button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X className="h-5 w-5" /></button><div><p className="text-center font-semibold">Edit {mediaType === 'video' ? 'video' : 'photo'}</p><p className="text-center text-[10px] text-white/55">Preview and customise before publishing</p></div><div className="flex items-center gap-2">{mediaType === 'image' && <Button size="icon" variant="outline" className="border-white/20 bg-transparent" title="Download edited image" onClick={() => void downloadEditedImage()}><Download className="h-4 w-4"/></Button>}<Button size="sm" disabled={saving} onClick={() => void save()}><Check className="mr-1 h-4 w-4" />{saving ? 'Saving…' : 'Done'}</Button></div></header>
    <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-h-[52vh] place-items-center bg-neutral-950 p-3">
        <div ref={previewRef} className="relative max-h-[72vh] w-full max-w-3xl overflow-hidden rounded-xl bg-neutral-900" style={{ aspectRatio: aspectRatioValue(state.aspectRatio) }}>
          {mediaType === 'video' ? <video src={mediaUrl} controls loop playsInline className="h-full w-full object-cover" style={{ filter: socialFilter(state.adjustments) }} /> : <img src={mediaUrl} alt="Edit preview" className="h-full w-full object-cover" style={{ filter: socialFilter(state.adjustments) }} />}
          {state.adjustments.vignette > 0 && <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 ${30 + state.adjustments.vignette * 1.4}px rgba(0,0,0,${state.adjustments.vignette / 130})` }} />}
          {state.adjustments.tiltShift > 0 && <div className="pointer-events-none absolute inset-0 backdrop-blur-sm" style={{ clipPath: `polygon(0 0,100% 0,100% ${Math.max(5, 45 - state.adjustments.tiltShift / 3)}%,0 ${Math.max(5, 45 - state.adjustments.tiltShift / 3)}%,0 ${Math.min(95, 55 + state.adjustments.tiltShift / 3)}%,100% ${Math.min(95, 55 + state.adjustments.tiltShift / 3)}%,100% 100%,0 100%)` }} />}
          {state.overlays.map(overlay => <button key={overlay.id} onClick={() => setSelectedOverlay(overlay.id)} onPointerDown={event => { event.stopPropagation(); setSelectedOverlay(overlay.id); event.currentTarget.setPointerCapture(event.pointerId); moveOverlay(event, overlay.id); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveOverlay(event, overlay.id); }} onKeyDown={event => { const step = event.shiftKey ? 5 : 1; if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); setState(current => ({ ...current, overlays: current.overlays.map(item => item.id === overlay.id ? { ...item, x: Math.max(3, Math.min(97, item.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0))), y: Math.max(3, Math.min(97, item.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))) } : item) })); }} className={`absolute touch-none select-none -translate-x-1/2 -translate-y-1/2 cursor-move whitespace-nowrap rounded px-2 py-1 ${selectedOverlay === overlay.id ? 'ring-2 ring-primary' : ''}`} style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, transform: `translate(-50%,-50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`, color: overlay.color, fontSize: overlay.type === 'sticker' ? 44 : 28, textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{overlay.content}</button>)}
          <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${activeTool === 'draw' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`} onPointerDown={beginDraw} onPointerMove={continueDraw} onPointerUp={endDraw} onPointerCancel={endDraw} />
          {state.attachedMusic && <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-black/70 p-2 backdrop-blur"><img src={state.attachedMusic.coverArt || DEFAULT_MEDIA_IMAGE} alt="" className="h-9 w-9 rounded object-cover" /><div className="min-w-0"><p className="truncate text-sm font-semibold">♫ {state.attachedMusic.title}</p><p className="truncate text-xs text-white/60">{state.attachedMusic.artist}</p></div><button className="ml-auto p-1" onClick={() => setState(current => ({ ...current, attachedMusic: undefined }))}><X className="h-4 w-4" /></button></div>}
        </div>
      </div>
      <aside className="border-l border-white/10 bg-neutral-900 p-4">
        <div className="mb-4 grid grid-cols-5 gap-1">{([['adjust', RotateCcw, 'Adjust'], ['text', Type, 'Text'], ['stickers', Smile, 'Stickers'], ['draw', Brush, 'Draw'], ['music', Music2, 'Music']] as const).map(([tool, Icon, label]) => <button key={tool} onClick={() => setActiveTool(tool)} className={`rounded-lg px-1 py-2 text-[10px] ${activeTool === tool ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-white/70'}`}><Icon className="mx-auto mb-1 h-4 w-4" />{label}</button>)}</div>
        {activeTool === 'adjust' && <div className="space-y-4"><div><p className="mb-2 text-xs text-white/60">Aspect ratio</p><div className="flex flex-wrap gap-2">{(['original','1:1','4:5','9:16','16:9'] as SocialAspectRatio[]).map(ratio => <button key={ratio} onClick={() => setState(current => ({ ...current, aspectRatio: ratio }))} className={`rounded-full px-3 py-1 text-xs ${state.aspectRatio === ratio ? 'bg-primary' : 'bg-white/10'}`}>{ratio}</button>)}</div></div>{adjustmentLabels.map(([key,label]) => <div key={key}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{state.adjustments[key]}</span></div><Slider min={-100} max={100} step={1} value={[state.adjustments[key]]} onValueChange={value => updateAdjustment(key, value[0])} /></div>)}<Button variant="outline" className="w-full border-white/20 bg-transparent" onClick={() => setState(current => ({ ...current, adjustments: { ...DEFAULT_SOCIAL_ADJUSTMENTS } }))}>Reset adjustments</Button></div>}
        {activeTool === 'text' && <div className="space-y-3"><Input value={text} onChange={event => setText(event.target.value)} placeholder="Add text…" className="border-white/15 bg-black/30" /><Button className="w-full" onClick={() => addOverlay('text', text)}>Add text</Button>{selected && <OverlayControls overlay={selected} update={updateOverlay} remove={() => { setState(current => ({ ...current, overlays: current.overlays.filter(item => item.id !== selected.id) })); setSelectedOverlay(null); }} />}</div>}
        {activeTool === 'stickers' && <div className="grid grid-cols-4 gap-2">{stickers.map(sticker => <button key={sticker} onClick={() => addOverlay('sticker', sticker)} className="rounded-xl bg-white/5 p-3 text-3xl hover:bg-white/10">{sticker}</button>)}</div>}
        {activeTool === 'draw' && <div className="space-y-4"><div className="flex items-center gap-3"><input type="color" value={drawColor} onChange={event => setDrawColor(event.target.value)} className="h-10 w-14" /><div className="flex-1"><p className="mb-1 text-xs">Brush size</p><Slider min={1} max={30} value={[drawSize]} onValueChange={value => setDrawSize(value[0])} /></div></div><Button variant="outline" className="w-full border-white/20 bg-transparent" onClick={clearDrawing}>Clear drawing</Button></div>}
        {activeTool === 'music' && <div className="space-y-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" /><Input value={musicQuery} onChange={event => setMusicQuery(event.target.value)} placeholder="Search MusicInsta music" className="border-white/15 bg-black/30 pl-9" /></div><p className="text-xs text-white/55">Only music available on MusicInsta can be added. Choose a 15–60 second section for the story.</p>{state.attachedMusic && <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/10 p-3"><p className="text-sm font-semibold">{state.attachedMusic.title}</p><audio src={state.attachedMusic.audioUrl} controls preload="metadata" className="h-9 w-full" onPlay={event => { const start = state.attachedMusic?.clipStart || 0; const end = state.attachedMusic?.clipEnd || start + 15; if (event.currentTarget.currentTime < start || event.currentTarget.currentTime >= end) event.currentTarget.currentTime = start; }} onTimeUpdate={event => { const end = state.attachedMusic?.clipEnd || 15; if (event.currentTarget.currentTime >= end) event.currentTarget.pause(); }} onLoadedMetadata={event => { const audio = event.currentTarget; if (audio.duration < 15) { toast.error('This track is too short for a music story.'); setState(current => ({ ...current, attachedMusic: undefined })); return; } if (!state.attachedMusic?.duration && Number.isFinite(audio.duration)) setState(current => current.attachedMusic ? ({ ...current, attachedMusic: { ...current.attachedMusic, duration: audio.duration, clipEnd: Math.min(30, audio.duration) } }) : current); }} /><Slider min={0} max={Math.max(15, Math.min(state.attachedMusic.duration || 60, 600))} step={.1} minStepsBetween={150} value={[state.attachedMusic.clipStart || 0, Math.max((state.attachedMusic.clipStart || 0) + 15, state.attachedMusic.clipEnd || 15)]} onValueChange={updateMusicClip} /><div className="flex justify-between text-xs text-white/65"><span>Starts {(state.attachedMusic.clipStart || 0).toFixed(1)}s</span><span>{Math.min(60, Math.max(15, (state.attachedMusic.clipEnd || 15) - (state.attachedMusic.clipStart || 0))).toFixed(1)}s story music</span><span>Ends {(state.attachedMusic.clipEnd || 15).toFixed(1)}s</span></div></div>}<div className="max-h-[42vh] space-y-1 overflow-y-auto">{filteredTracks.map(track => <button key={track.trackId} onClick={() => attachTrack(track)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"><img src={track.coverArt || DEFAULT_MEDIA_IMAGE} alt="" className="h-10 w-10 rounded object-cover" /><div className="min-w-0"><p className="truncate text-sm font-medium">{track.title}</p><p className="truncate text-xs text-white/55">{track.artist}</p></div></button>)}</div></div>}
      </aside>
    </div>
  </div>;
}

function OverlayControls({ overlay, update, remove }: { overlay: SocialOverlay; update: (updates: Partial<SocialOverlay>) => void; remove: () => void }) {
  return <div className="space-y-3 rounded-xl border border-white/10 p-3"><p className="text-xs font-semibold">Selected overlay</p>{(['x','y','scale','rotation'] as const).map(key => <div key={key}><div className="mb-1 flex justify-between text-xs capitalize"><span>{key}</span><span>{overlay[key]}</span></div><Slider min={key === 'scale' ? .3 : key === 'rotation' ? -180 : 0} max={key === 'scale' ? 3 : key === 'rotation' ? 180 : 100} step={key === 'scale' ? .1 : 1} value={[overlay[key]]} onValueChange={value => update({ [key]: value[0] })} /></div>)}{overlay.type === 'text' && <input type="color" value={overlay.color || '#ffffff'} onChange={event => update({ color: event.target.value })} />}<Button variant="destructive" size="sm" className="w-full" onClick={remove}>Remove overlay</Button></div>;
}
