/**
 * Audio utilities for handling different formats and tier restrictions
 */

import { API_BASE } from '@/config/api';

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
 * Convert backend relative path to full API URL
 * The backend serves audio files at /outputs via StaticFiles mount in main.py
 */
export function getAudioUrl(relativePath: string): string {
  // If already a full URL, return as-is
  if (relativePath.startsWith('http')) {
    return relativePath;
  }

  // If relative path starts with /outputs, prepend API_BASE
  if (relativePath.startsWith('/outputs/') || relativePath.startsWith('outputs/')) {
    const path = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return `${API_BASE}/${path}`;
  }

  // For relative paths, assume they're output files
  return `${API_BASE}/${relativePath}`;
}

/**
 * Fetch audio file and convert to base64
 * Handles both MP3 and WAV formats from backend /outputs endpoint
 */
export async function fetchAudioAsBase64(url: string): Promise<string> {
  try {
    // Construct full backend URL for relative paths
    const fullUrl = getAudioUrl(url);

    console.log('[audioUtils] Fetching audio from:', fullUrl);

    const response = await fetch(fullUrl, {
      mode: 'cors',
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('[audioUtils] Fetch failed with status:', response.status);
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    // Validate blob is audio
    if (!blob.type.startsWith('audio/')) {
      console.error('[audioUtils] Invalid blob type:', blob.type, 'Size:', blob.size);
      throw new Error(`Invalid audio format: ${blob.type}`);
    }

    // Convert blob to base64
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log('[audioUtils] Successfully converted to base64, size:', base64.length);
    return base64;
  } catch (error) {
    console.error('[audioUtils] Error fetching audio:', error);
    throw error;
  }
}

/**
 * Download audio file
 */
export async function downloadAudio(
  audioBase64: string,
  filename: string,
  format: 'mp3' | 'wav' = 'mp3'
): Promise<void> {
  try {
    const mimeType = AUDIO_FORMATS[format].mimeType;
    const byteCharacters = atob(audioBase64);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(0)
      .map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

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
