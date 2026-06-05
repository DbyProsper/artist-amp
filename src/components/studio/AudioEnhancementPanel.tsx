import React from 'react';
import AudioEnhancementPage from '@/features/audio-enhancement';

export function AudioEnhancementPanel(props: any) {
  // This wrapper maintains the previous import path while delegating
  // rendering to the new feature located at src/features/audio-enhancement
  return <AudioEnhancementPage {...props} />;
}
