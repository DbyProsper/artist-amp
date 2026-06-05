import { useMutation } from '@tanstack/react-query';
import { enhanceAudio, triggerDownload } from '../api/audioEnhancerApi';
import { EnhancementSettings } from '../types';
import { toast } from 'sonner';

export function useEnhancement() {
  return useMutation({
    mutationFn: ({ file, settings, onProgress }: { file: File; settings: EnhancementSettings; onProgress?: (p: number) => void }) =>
      enhanceAudio(file, settings, onProgress),
    onSuccess: (blob, vars: any) => {
      triggerDownload(blob as Blob, vars.file.name);
      toast.success('Audio enhanced and downloaded!');
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
