import React, { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

export default function FileDropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('audio/')) onFile(f);
  }, [onFile]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div onDragOver={(e)=>e.preventDefault()} onDrop={onDrop} onClick={handleClick}
      className="flex flex-col items-center justify-center gap-4 rounded-2xl cursor-pointer transition-all p-16 border-2 border-dashed border-border hover:border-primary/50 bg-card">
      <Upload size={32} className="text-muted-foreground" />
      <div className="text-sm font-medium">Drop your audio file here</div>
      <div className="text-xs text-muted-foreground">WAV, MP3, FLAC, AIFF · Up to 200 MB</div>
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={e=>{ const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}
