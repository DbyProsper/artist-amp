import { useMutation } from '@tanstack/react-query';
import { enhanceAudio, triggerDownload } from '../api/audioEnhancerApi';
import { EnhancementSettings, EnhancementTimings } from '../types';
import { toast } from 'sonner';

interface EnhanceParams {
  file: File;
  settings: EnhancementSettings;
  onProgress?: (pct: number, stage: 'uploading' | 'downloading') => void;
  onTimings: (timings: EnhancementTimings) => void;
}

export function useEnhancement() {
  return useMutation({
    mutationFn: ({ file, settings, onProgress }: EnhanceParams) =>
      enhanceAudio(file, settings, onProgress),
    onSuccess: ({ blob, timings }, { file, onTimings }: EnhanceParams) => {
      triggerDownload(blob, file.name);
      onTimings(timings);
      const t = timings.totalTime ? ` in ${timings.totalTime}` : '';
      toast.success(`Audio enhanced and downloaded${t}`);
    },
    onError: (err: any) => {
      if (err?.message === 'PREMIUM_REQUIRED') {
        toast.error('Upgrade to Premium to export enhanced audio.');
      } else {
        toast.error(`Enhancement failed: ${err?.message ?? 'unknown'}`);
      }
    },
  });
}
