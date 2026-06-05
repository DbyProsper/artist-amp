import { useRef, useCallback } from 'react';
import { EnhancementSettings } from '../types';

export function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null as AudioContext | null);

  function getCtx() {
    if (!ctxRef.current || (ctxRef.current as any).state === 'closed') {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current as AudioContext;
  }

  const decodeFile = useCallback(async (file: File): Promise<AudioBuffer> => {
    const buf = await file.arrayBuffer();
    return await getCtx().decodeAudioData(buf);
  }, []);

  const previewProcess = useCallback(async (buffer: AudioBuffer, settings: EnhancementSettings, onUpdate?: (update: { stage: string; progress: number }) => void): Promise<AudioBuffer> => {
    const { numberOfChannels, length, sampleRate } = buffer;
    const off = new OfflineAudioContext(numberOfChannels, length, sampleRate);
    const src = off.createBufferSource();
    src.buffer = buffer;
    let last: AudioNode = src as unknown as AudioNode;

    onUpdate?.({ stage: 'Preparing preview', progress: 5 });

    if (settings.eq.enabled) {
      onUpdate?.({ stage: 'Applying EQ', progress: 25 });
      for (const band of settings.eq.bands) {
        const f = off.createBiquadFilter();
        f.type = band.type as any;
        f.frequency.value = band.freq;
        f.Q.value = 0.707;
        f.gain.value = band.gain;
        last.connect(f);
        last = f;
      }
    }

    if (numberOfChannels >= 2 && settings.stereoWidth !== 100) {
      onUpdate?.({ stage: 'Applying stereo width', progress: 55 });
      const sp = off.createChannelSplitter(2);
      const mg = off.createChannelMerger(2);
      const gL = off.createGain();
      const gR = off.createGain();
      const w = Math.max(0, settings.stereoWidth / 100);
      gL.gain.value = Math.sqrt((1 + w) / 2);
      gR.gain.value = Math.sqrt(Math.max(0.01, (2 - w) / 2));
      last.connect(sp);
      sp.connect(gL, 0); sp.connect(gR, 1);
      gL.connect(mg, 0, 0); gR.connect(mg, 0, 1);
      last = mg as unknown as AudioNode;
    }

    onUpdate?.({ stage: 'Applying Target LUFS', progress: 75 });
    const gn = off.createGain();
    const d = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
    const rms = Math.sqrt(sum / d.length);
    const curLufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -40;
    gn.gain.value = Math.pow(10, (settings.targetLufs - curLufs) / 20);
    last.connect(gn as unknown as AudioNode);
    gn.connect(off.destination);
    src.start(0);

    onUpdate?.({ stage: 'Rendering preview', progress: 90 });
    const rendered = await off.startRendering();
    onUpdate?.({ stage: 'Preview complete', progress: 100 });
    return rendered;
  }, []);

  return { decodeFile, previewProcess };
}
