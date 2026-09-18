import { useMutation } from '@tanstack/react-query';
import { enhanceAudio, triggerDownload } from '../api/audioEnhancerApi';
import { EnhancementSettings, EnhancementTimings } from '../types';
import { toast } from 'sonner';

interface EnhanceParams {
  file: File;
  settings: EnhancementSettings;
  onProgress?: (pct: number, stage: 'uploading' | 'downloading') => void;
  onTimings: (timings: EnhancementTimings) => void;
  outputFormat?: 'wav' | 'mp3';
  onResult?: (blob: Blob) => void;
  onError?: (message: string) => void;
}

export function useEnhancement() {
  return useMutation({
    mutationFn: ({ file, settings, onProgress, outputFormat }: EnhanceParams) =>
      enhanceAudio(file, settings, onProgress, outputFormat),
    onSuccess: ({ blob, timings }, { file, onTimings, onResult }: EnhanceParams) => {
      triggerDownload(blob, file.name);
      onResult?.(blob);
      onTimings(timings);
      const t = timings.totalTime ? ` in ${timings.totalTime}` : '';
      toast.success(`Audio enhanced and downloaded${t}`);
    },
    onError: (err: any, { onError }: EnhanceParams) => {
      onError?.(err?.message ?? 'unknown');
      toast.error(`Enhancement failed: ${err?.message ?? 'unknown'}`);
    },
  });
}
