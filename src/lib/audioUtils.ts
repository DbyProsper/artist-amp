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
 * Download audio file by URL
 * Browser will handle CORS and file type automatically
 */
export async function downloadAudio(
  audioUrl: string,
  filename: string,
  format: 'mp3' | 'wav' = 'mp3'
): Promise<void> {
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[audioUtils] Downloaded:', filename, format);
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
