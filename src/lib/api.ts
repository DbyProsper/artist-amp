/**
 * API Layer - Unified endpoint interface
 * All requests use VITE_API_BASE_URL from environment
 * Follows unified backend endpoint structure
 */

import { API_BASE } from '@/config/api';

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  // Legacy response fields (for backward compatibility)
  audio_url?: string;
  audio_base64?: string;
  lyrics?: string;
  cover_url?: string;
  improved_prompt?: string;
  plan?: string;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 second timeout for AI generation

function buildUrl(endpoint: string): string {
  const baseUrl = API_BASE;
  return `${baseUrl.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    });
    return res;
  } catch (error) {
    console.error(`[API] fetch error for ${url}:`, error);

    if ((error as any).name === 'AbortError') {
      throw new Error('Request timeout');
    }

    const msg = (error as Error).message || 'Network error';
    if (/certificate|ssl|secure/i.test(msg)) {
      throw new Error('SSL error: secure connection issue');
    }

    throw new Error('Network error or SSL issue');
  } finally {
    clearTimeout(id);
  }
}

async function callApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: FormData | object
): Promise<ApiResponse> {
  const url = buildUrl(endpoint);

  try {
    const headers: HeadersInit = {};

    // Only set Content-Type for non-FormData requests
    const isFormData = body instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    headers['Accept'] = 'application/json';

    const response = await fetchWithTimeout(url, {
      method,
      headers,
      body:
        method === 'POST'
          ? isFormData
            ? body
            : JSON.stringify(body ?? {})
          : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const errorMessage = text || `HTTP ${response.status}`;
      return {
        success: false,
        error: `API error: ${errorMessage}`,
      };
    }

    const json = await response.json().catch((err) => {
      console.error('[API] invalid JSON payload', err);
      return null;
    });

    if (!json || typeof json !== 'object') {
      return {
        success: false,
        error: 'Invalid JSON response from API',
      };
    }

    // Normalize response to unified format
    return {
      success: json.success !== undefined ? json.success : true,
      // Support legacy field names for backward compatibility
      audio_url: json.audio_url || json.file || json.data?.audio_url,
      audio_base64: json.audio_base64 || json.audio || json.data?.audio_base64 || json.data?.audio || json.file,
      cover_url: json.cover_url || json.url || json.data?.cover_url || json.image_url,
      lyrics:
        json.lyrics ||
        json.data?.lyrics ||
        (typeof json.data === 'string' ? json.data : undefined),
      improved_prompt: json.improved_prompt || json.data?.improved_prompt,
      plan: json.plan || json.data?.plan,
      data: json.data ?? json,
      message: json.message ?? '',
      error: json.error ?? (json.success === false ? 'API returned failure' : undefined),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errMsg,
    };
  }
}

// =============================================================================
// API EXPORT FUNCTIONS - Clean, unified interface
// =============================================================================

/**
 * Generate music from a text prompt
 * POST /music/generate
 */
export async function generateMusic(prompt: string, metadata?: any): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest('/music/generate', 'POST', {
    prompt,
    ...metadata,
  });
}

/**
 * Generate a complete song (music + lyrics)
 * POST /song/generate
 */
export async function generateSong(prompt: string, metadata?: any): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest('/song/generate', 'POST', {
    prompt,
    ...metadata,
  });
}

/**
 * Generate lyrics from a prompt
 * POST /lyrics/generate
 */
export async function generateLyrics(prompt: string, model: string = 'gemini'): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest('/lyrics/generate', 'POST', {
    prompt,
    model,
  });
}

/**
 * Generate beats/rhythm from a prompt
 * POST /beats/generate
 */
export async function generateBeats(prompt: string, metadata?: any): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest('/beats/generate', 'POST', {
    prompt,
    ...metadata,
  });
}

/**
 * Generate images from a prompt
 * POST /image/generate
 * @param type - Optional type: 'merch' for merchandise, 'album-cover' for covers, default for general images
 */
export async function generateImage(prompt: string, type?: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest('/image/generate', 'POST', {
    prompt,
    type: type || 'image',
  });
}

/**
 * Generate merchandise images from a prompt
 * POST /image/generate (with type: 'merch')
 */
export async function generateMerch(prompt: string, productType?: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest('/image/generate', 'POST', {
    prompt,
    type: 'merch',
    product_type: productType,
  });
}

/**
 * Generate music from an audio file
 * POST /music/generate (with file upload)
 */
export async function generateMusicFromAudio(
  audioFile: File,
  prompt: string,
  model: string = 'gemini'
): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('prompt', prompt);
  formData.append('model', model);

  return callApiRequest('/music/generate', 'POST', formData);
}

/**
 * Generate image from an image file upload
 * POST /image/generate (with file upload)
 */
export async function generateImageFromUpload(
  imageFile: File,
  prompt: string,
  model: string = 'gemini'
): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('prompt', prompt);
  formData.append('model', model);

  return callApiRequest('/image/generate', 'POST', formData);
}

/**
 * Enhance audio quality
 * POST /audio/enhance
 */
export async function enhanceAudio(audioFile: File, enhancementType: string = 'denoise'): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('type', enhancementType);

  return callApiRequest('/audio/enhance', 'POST', formData);
}

/**
 * Chat with AI assistant
 * POST /ai/chat
 */
export async function chatWithAI(
  message: string,
  model: string = 'gemini',
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<ApiResponse> {
  if (!message?.trim()) {
    return { success: false, error: 'Message cannot be empty' };
  }

  const payload: any = {
    message,
    model,
  };

  if (conversationHistory && conversationHistory.length > 0) {
    payload.conversation_history = conversationHistory;
  }

  return callApiRequest('/ai/chat', 'POST', payload);
}

