import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';
import { AudioAnalysis } from '../types';

interface Props {
  file: File;
  enhancedBuffer: AudioBuffer | null;
  activeView: 'original' | 'enhanced';
  onViewChange: (v: 'original'|'enhanced') => void;
  analysis: AudioAnalysis | null;
  onChangeFile: () => void;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const result = audioBufferToWav(buffer, { float32: false });
  return new Blob([result], { type: 'audio/wav' });
}

// minimal WAV encoder (uses channel interleaving)
function audioBufferToWav(buffer: AudioBuffer, opts: any = {}) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const bufferOut = new ArrayBuffer(length);
  const view = new DataView(bufferOut);
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  }
  let offset = 0;
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + buffer.length * numChannels * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4;
  view.setUint16(offset, numChannels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, buffer.length * numChannels * 2, true); offset += 4;
  const channels = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
  let pos = offset;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
  }
  return view;
}

export default function DualWaveform({ file, enhancedBuffer, activeView, onViewChange, analysis, onChangeFile }: Props) {
  const origRef = useRef<HTMLDivElement | null>(null);
  const enhRef = useRef<HTMLDivElement | null>(null);
  const wsOrig = useRef<any>(null);
  const wsEnh = useRef<any>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(()=>{
    if (!origRef.current) return;
    wsOrig.current?.destroy?.();
    const ws = WaveSurfer.create({ container: origRef.current, waveColor: '#3a3a3a', progressColor: 'var(--ae-accent)', cursorColor: 'var(--ae-accent)' });
    ws.load(URL.createObjectURL(file));
    ws.on('finish', ()=>setPlaying(false));
    wsOrig.current = ws;
    return ()=>ws.destroy();
  }, [file]);

  useEffect(()=>{
    if (!enhRef.current || !enhancedBuffer) return;
    wsEnh.current?.destroy?.();
    const blob = audioBufferToWavBlob(enhancedBuffer);
    const ws = WaveSurfer.create({ container: enhRef.current, waveColor: 'rgba(255,45,107,0.3)', progressColor: 'var(--ae-accent)', cursorColor: 'var(--ae-accent)' });
    ws.load(URL.createObjectURL(blob));
    ws.on('finish', ()=>setPlaying(false));
    wsEnh.current = ws;
    return ()=>ws.destroy();
  }, [enhancedBuffer]);

  const togglePlay = () => {
    const ws = activeView === 'original' ? wsOrig.current : wsEnh.current;
    if (!ws) return;
    ws.playPause();
    setPlaying(p=>!p);
  };

  useEffect(() => {
    if (!playing) return;
    const oldWs = activeView === 'original' ? wsEnh.current : wsOrig.current;
    const newWs = activeView === 'original' ? wsOrig.current : wsEnh.current;
    if (!newWs) return;
    const currentTime = oldWs?.getCurrentTime?.() ?? 0;
    oldWs?.pause?.();
    const duration = newWs.getDuration?.() ?? 1;
    if (duration > 0) {
      newWs.seekTo(Math.min(1, currentTime / duration));
    }
    newWs.play();
  }, [activeView, playing]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{file.name}</div>
          {analysis && <div className="text-xs text-muted-foreground">{analysis.duration_sec.toFixed(1)}s · {analysis.channels}ch · {(analysis.sample_rate/1000).toFixed(1)} kHz {analysis.lufs!==null && `· ${analysis.lufs.toFixed(1)} LUFS`}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>onViewChange('original')} className={`px-3 py-1 rounded-md transition ${activeView==='original' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>Original</button>
          <button onClick={()=>onViewChange('enhanced')} className={`px-3 py-1 rounded-md transition ${activeView==='enhanced' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>Enhanced</button>
        </div>
      </div>

      <div className="relative rounded-md border border-border bg-card" style={{ height: 160 }}>
        <div ref={origRef} style={{ display: activeView==='original' ? 'block' : 'none', height: '100%' }} />
        <div ref={enhRef} style={{ display: activeView==='enhanced' ? 'block' : 'none', height: '100%' }} />
        {activeView==='enhanced' && !enhancedBuffer && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Enhanced preview not ready</div>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className="p-2 rounded-md bg-secondary hover:bg-secondary/80 border border-border">{playing ? <Pause/> : <Play/>}</button>
        <button onClick={onChangeFile} className="text-xs text-muted-foreground hover:text-foreground transition">Change Audio</button>
      </div>
    </div>
  );
}
