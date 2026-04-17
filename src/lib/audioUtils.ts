/**
 * Audio utilities for handling different formats and tier restrictions
 */

export interface AudioFormat {
  type: 'mp3' | 'wav';
  label: string;
  mimeType: string;
  isPremium: boolean;
  description: string;
}

export const AUDIO_FORMATS: Record<'mp3' | 'wav', AudioFormat> = {
  mp3: {
    type: 'mp3',
    label: 'MP3 (Standard)',
    mimeType: 'audio/mpeg',
    isPremium: false,
    description: 'Compressed format, smaller file size, universal compatibility',
  },
  wav: {
    type: 'wav',
    label: 'WAV (Premium)',
    mimeType: 'audio/wav',
    isPremium: true,
    description: 'Uncompressed format, highest quality, larger file size',
  },
};

/**
 * Download audio file by direct URL
 * Uses simple anchor tag approach - no fetch needed (avoids CORS issues)
 */
export async function downloadAudio(
  audioUrl: string,
  filename: string,
  format: 'mp3' | 'wav' = 'mp3'
): Promise<void> {
  try {
    console.log('[Audio Download] Starting download:', { audioUrl, filename });
    
    // Create download link directly from URL (no fetch needed)
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${filename}.${format}`;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('[audioUtils] Download initiated:', filename, format);
  } catch (error) {
    console.error('[audioUtils] Download error:', error);
    throw new Error(`Failed to download audio: ${error}`);
  }
}

/**
 * Format bytes to human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
