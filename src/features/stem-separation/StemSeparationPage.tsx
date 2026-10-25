import { ArrowLeft, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { storeDawAudio } from '@/lib/dawTransfer';
import { StemSeparatorPanel } from './StemSeparatorPanel';
import type { StemSeparationResult } from './api';

export default function StemSeparationPage() {
  const navigate = useNavigate();
  const sendToDaw = async (result: StemSeparationResult) => {
    const [vocalsResponse, instrumentalResponse] = await Promise.all([fetch(result.vocals.url), fetch(result.instrumental.url)]);
    if (!vocalsResponse.ok || !instrumentalResponse.ok) throw new Error('The separated stems could not be downloaded.');
    const [vocalsKey, instrumentalKey] = await Promise.all([
      storeDawAudio(await vocalsResponse.blob(), result.vocals.filename),
      storeDawAudio(await instrumentalResponse.blob(), result.instrumental.filename),
    ]);
    navigate(`/studio/daw?importStemVocals=${vocalsKey}&importStemInstrumental=${instrumentalKey}`);
  };
  return <div className="min-h-screen bg-background pb-20"><header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate('/studio')}><ArrowLeft className="h-5 w-5" /></Button><Scissors className="h-5 w-5 text-primary" /><strong>Stem Separator</strong></div></header><main className="mx-auto max-w-4xl px-4 py-10"><div className="mb-7"><p className="font-semibold uppercase tracking-[.22em] text-primary">MusicInsta Studio</p><h1 className="mt-2 font-display text-3xl font-black sm:text-5xl">Extract vocals from any song.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Separate a track into a clean vocal stem and an instrumental beat. Preview, download, save to your library or send both directly to the DAW playlist.</p></div><StemSeparatorPanel onSendToDaw={sendToDaw} /></main></div>;
}
