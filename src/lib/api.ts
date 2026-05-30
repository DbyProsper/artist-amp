/**
 * API Layer - Unified endpoint interface
 * Connects to FastAPI backend with Google Cloud Storage (GCS) signed URLs
 * 
 * Backend: https://musicinsta-ai-973497466485.us-central1.run.app
 * Files are stored in GCS and returned as signed URLs (no CORS needed)
 */

import { API_BASE, API_TIMEOUTS, DEFAULT_USER_TIER } from '@/config/api';

export interface ApiResponse {
  success: boolean;
  data?: {
    audio_url?: string;
    image_url?: string;
    url?: string;
    audio?: { url?: string };
    image?: { url?: string };
    lyrics?: { text?: string };
    text?: string;
    [key: string]: any;
  };
  error?: string;
  message?: string;
  lyrics?: string;
  // Legacy response fields (backward compatibility)
  audio_url?: string;
  audio_base64?: string;
  cover_url?: string;
  improved_prompt?: string;
  plan?: string;
}

function buildUrl(endpoint: string): string {
  const baseUrl = API_BASE;
  return `${baseUrl.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

/**
 * Fetch with timeout support
 * Times out after specified milliseconds
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[API] fetch error for ${url}:`, error);

    if ((error as any).name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs / 1000} seconds`);
    }

    const msg = (error as Error).message || 'Network error';
    if (/certificate|ssl|secure/i.test(msg)) {
      throw new Error('SSL error: secure connection issue');
    }

    throw new Error(msg || 'Network error');
  }
}

/**
 * Core API request handler
 * Handles endpoint calls with appropriate timeout
 */
async function callApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: FormData | object,
  timeoutMs: number = API_TIMEOUTS.default
): Promise<ApiResponse> {
  const url = buildUrl(endpoint);

  try {
    const headers: HeadersInit = {};

    // Only set Content-Type for non-FormData requests
    const isFormData = body instanceof FormData;
    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json';
    }
    headers['Accept'] = 'application/json';

    console.log(`[API] ${method} ${endpoint}`, body);

    const response = await fetchWithTimeout(
      url,
      {
        method,
        headers,
        body:
          method === 'POST'
            ? isFormData
              ? body
              : body
              ? JSON.stringify(body)
              : undefined
            : undefined,
      },
      timeoutMs
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const errorMessage = text || `HTTP ${response.status}`;
      console.error(`[API] Error response:`, errorMessage);
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

    console.log(`[API] Response:`, json);

    // Handle success response
    if (json.success === false) {
      return {
        success: false,
        error: json.error || json.message || 'API returned failure',
      };
    }

    // Normalize response - backend returns data in different formats
    // Handle: data.audio_url, data.image_url, data.url, data.audio.url, etc.
    // Also handle audio enhancement responses with previews object
    const audioUrl =
      json.data?.audio_url ||
      json.data?.audio?.url ||
      json.audio_url ||
      json.file ||
      json.audio ||
      json.file_url ||
      (json.previews && Object.values(json.previews)[0]) || // Get first preview URL if previews object exists
      undefined;

    const imageUrl =
      json.data?.image_url ||
      json.data?.image?.url ||
      json.data?.url ||
      json.cover_url ||
      json.image_url ||
      json.image ||
      json.url ||
      json.file; // Sometimes image is returned as 'file'

    const lyrics = json.data?.lyrics?.text || json.data?.lyrics || json.lyrics || json.text;

    // Extract reply/message for chat responses
    const reply = json.data?.reply || json.reply;
    const message = json.data?.message || json.message;

    // Log for debugging
    if (!audioUrl && !imageUrl && !lyrics && !reply && !message) {
      console.warn('[API] No recognized output fields in response:', json);
    }

    return {
      success: true,
      data: json.data || json,
      // Normalized fields for easy access
      audio_url: audioUrl,
      cover_url: imageUrl,
      image_url: imageUrl, // Also provide as image_url for consistency
      lyrics: lyrics,
      reply: reply,
      // Pass through original data
      message: message ?? '',
      error: undefined,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[API] Request failed: ${errMsg}`);
    return {
      success: false,
      error: errMsg,
    };
  }
}

// =============================================================================
// API EXPORT FUNCTIONS
// =============================================================================

/**
 * Generate music from a text prompt
 * POST /music/generate
 * Takes 45-60 seconds
 */
export async function generateMusic(
  prompt: string,
  options?: {
    genre?: string;
    mood?: string;
    language?: string;
    bpm?: number;
    user_tier?: 'free' | 'premium';
  }
): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest(
    '/music/generate',
    'POST',
    {
      prompt,
      genre: options?.genre || 'electronic',
      mood: options?.mood || 'upbeat',
      language: options?.language || 'en',
      bpm: options?.bpm || 128,
      user_tier: options?.user_tier || DEFAULT_USER_TIER,
    },
    API_TIMEOUTS.music // 120 second timeout for music generation
  );
}

/**
 * Generate a complete song (music + lyrics + cover art)
 * POST /song/generate
 * Takes 90-150 seconds (parallel generation)
 */
export async function generateSong(
  prompt: string,
  options?: {
    genre?: string;
    mood?: string;
    language?: string;
    bpm?: number;
    user_tier?: 'free' | 'premium';
  }
): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest(
    '/song/generate',
    'POST',
    {
      prompt,
      genre: options?.genre || 'electronic',
      mood: options?.mood || 'upbeat',
      language: options?.language || 'en',
      bpm: options?.bpm || 128,
      user_tier: options?.user_tier || DEFAULT_USER_TIER,
    },
    API_TIMEOUTS.song // 300 second timeout for complete song
  );
}

/**
 * Generate lyrics from a prompt
 * POST /lyrics/generate
 * Takes 5-10 seconds
 */
export async function generateLyrics(
  prompt: string,
  options?: {
    mood?: string;
    genre?: string;
    language?: string;
  }
): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest(
    '/lyrics/generate',
    'POST',
    {
      prompt,
      mood: options?.mood || 'upbeat',
      genre: options?.genre || 'pop',
      language: options?.language || 'en',
    },
    API_TIMEOUTS.default // 30 second timeout
  );
}

/**
 * Generate beats/instrumental from a prompt
 * Alias for generateMusic() - uses /music/generate endpoint
 */
export async function generateBeats(
  prompt: string,
  options?: {
    genre?: string;
    mood?: string;
    language?: string;
    bpm?: number;
    user_tier?: 'free' | 'premium';
  }
): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest(
    '/beats/generate',
    'POST',
    {
      prompt,
      genre: options?.genre || 'electronic',
      mood: options?.mood || 'upbeat',
      language: options?.language || 'en',
      bpm: options?.bpm || 128,
      user_tier: options?.user_tier || DEFAULT_USER_TIER,
    },
    API_TIMEOUTS.music
  );
}

/**
 * Generate images from a text prompt
 * POST /image/generate
 * Takes 30-45 seconds
 */
export async function generateImage(
  prompt: string,
  options?: {
    image_type?: 'cover' | 'merch' | 'poster';
    genre?: string;
    user_tier?: 'free' | 'premium';
    language?: string;
  }
): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApiRequest(
    '/image/generate',
    'POST',
    {
      prompt,
      image_type: options?.image_type || 'cover',
      genre: options?.genre,
      user_tier: options?.user_tier || DEFAULT_USER_TIER,
      language: options?.language || 'en',
    },
    API_TIMEOUTS.default // 30 second timeout
  );
}

/**
 * Generate merchandise images
 * Alias for generateImage with type='merch'
 */
export async function generateMerch(
  prompt: string,
  options?: {
    genre?: string;
    user_tier?: 'free' | 'premium';
  }
): Promise<ApiResponse> {
  return generateImage(prompt, {
    image_type: 'merch',
    genre: options?.genre,
    user_tier: options?.user_tier,
  });
}

/**
 * Generate event posters
 * Alias for generateImage with type='poster'
 */
export async function generatePoster(
  prompt: string,
  options?: {
    genre?: string;
    user_tier?: 'free' | 'premium';
    language?: string;
  }
): Promise<ApiResponse> {
  return generateImage(prompt, {
    image_type: 'poster',
    genre: options?.genre,
    user_tier: options?.user_tier,
    language: options?.language,
  });
}

/**
 * Chat with AI - Conversational interface
 * POST /chat
 * Takes 5-30 seconds
 */
export async function chatWithAI(
  message: string,
  model?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<ApiResponse> {
  if (!message?.trim()) {
    return { success: false, error: 'Message cannot be empty' };
  }

  // Build request payload - backend expects just the message
  // Conversation history can be included if backend supports it
  const payload: Record<string, any> = {
    message: message.trim(),
  };

  // Add model if specified (backend may support this)
  if (model && model !== 'default') {
    payload.model = model;
  }

  // Add conversation history if available (for context)
  if (conversationHistory && conversationHistory.length > 0) {
    payload.conversation_history = conversationHistory;
  }

  const response = await callApiRequest(
    '/chat',
    'POST',
    payload,
    API_TIMEOUTS.default // 30 second timeout
  );

  // Normalize the response to include 'message' field
  if (response.success) {
    // Try to extract message from various possible fields
    let messageContent = '';
    
    if (response.data?.response) {
      messageContent = response.data.response;
    } else if (response.data?.message) {
      messageContent = response.data.message;
    } else if (response.data?.text) {
      messageContent = response.data.text;
    } else if (response.reply) {
      // Handle backend returning 'reply' directly
      messageContent = response.reply;
    } else if (typeof response.data === 'string') {
      messageContent = response.data;
    }

    return {
      ...response,
      message: messageContent,
      reply: messageContent, // Also include 'reply' for compatibility
    };
  }

  return response;
}

/**
 * Generate music from uploaded audio file
 * POST /music/generate (with file)
 * Takes 45-120 seconds
 * Converts/transforms audio file based on prompt
 */
export async function generateMusicFromAudio(
  audioFile: File,
  prompt: string,
  model?: string,
  options?: {
    genre?: string;
    mood?: string;
    language?: string;
    bpm?: number;
    user_tier?: 'free' | 'premium';
  }
): Promise<ApiResponse> {
  if (!audioFile) {
    return { success: false, error: 'Audio file is required' };
  }
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  // Build FormData for multipart file upload
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('prompt', prompt.trim());
  
  if (model) {
    formData.append('model', model);
  }
  if (options?.genre) {
    formData.append('genre', options.genre);
  }
  if (options?.mood) {
    formData.append('mood', options.mood);
  }
  if (options?.language) {
    formData.append('language', options.language);
  }
  if (options?.bpm) {
    formData.append('bpm', options.bpm.toString());
  }
  if (options?.user_tier) {
    formData.append('user_tier', options.user_tier);
  }

  return callApiRequest(
    '/music/generate',
    'POST',
    formData,
    API_TIMEOUTS.music // 120 second timeout
  );
}

/**
 * Generate image from uploaded image file
 * POST /image/generate (with file)
 * Takes 30-45 seconds
 * Transforms/reimagines image based on prompt
 */
export async function generateImageFromUpload(
  imageFile: File,
  prompt: string,
  model?: string,
  options?: {
    image_type?: 'cover' | 'merch' | 'poster';
    genre?: string;
    user_tier?: 'free' | 'premium';
    language?: string;
  }
): Promise<ApiResponse> {
  if (!imageFile) {
    return { success: false, error: 'Image file is required' };
  }
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  // Build FormData for multipart file upload
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('prompt', prompt.trim());
  
  if (model) {
    formData.append('model', model);
  }
  if (options?.image_type) {
    formData.append('image_type', options.image_type);
  }
  if (options?.genre) {
    formData.append('genre', options.genre);
  }
  if (options?.user_tier) {
    formData.append('user_tier', options.user_tier);
  }
  if (options?.language) {
    formData.append('language', options.language);
  }

  return callApiRequest(
    '/image/generate',
    'POST',
    formData,
    API_TIMEOUTS.default // 45 second timeout
  );
}

/**
 * Poll job status until complete or failed
 * Helper for async enhancement jobs
 */
async function pollJobStatus(
  jobId: string,
  maxWaitMs: number = API_TIMEOUTS.enhance
): Promise<ApiResponse> {
  const startTime = Date.now();
  const pollIntervalMs = 2000; // 2 second poll interval

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const statusUrl = buildUrl(`/audio/enhance/status/${jobId}`);
      const response = await fetchWithTimeout(statusUrl, { method: 'GET' }, 10000);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.error(`[API] Job status fetch failed: ${text}`);
        continue;
      }

      const json = await response.json().catch(() => null);
      if (!json || typeof json !== 'object') {
        console.warn('[API] Invalid job status response');
        continue;
      }

      console.log(`[API] Job ${jobId} status:`, json.status, json);

      // Check if job is complete
      if (json.status === 'done') {
        // Normalize response to match expected format
        return {
          success: true,
          data: {
            previews: json.previews || {},
            export_locked: json.export_locked ?? false,
          },
          // Also provide at top level for backward compatibility
          audio_url: json.export_url || (json.previews && Object.values(json.previews)[0]) || undefined,
        };
      }

      if (json.status === 'failed') {
        return {
          success: false,
          error: json.error || 'Enhancement job failed',
        };
      }

      // Still processing, wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Poll error';
      console.warn(`[API] Error polling job ${jobId}:`, msg);
      // Continue polling despite errors
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  // Timeout waiting for job to complete
  return {
    success: false,
    error: `Enhancement job timeout after ${maxWaitMs / 1000} seconds`,
  };
}

/**
 * Enhance audio file - denoise, normalize, compress, add reverb, etc.
 * Uses async job API:
 * 1. POST /audio/enhance to create job
 * 2. Poll GET /audio/enhance/status/{job_id} until done
 * Returns previews when complete
 * Processing types: denoise, normalize, compress, reverb, enhance
 */
export async function enhanceAudio(
  audioFile: File,
  enhancementType: 'denoise' | 'normalize' | 'compress' | 'reverb' | 'enhance' = 'denoise'
): Promise<ApiResponse> {
  if (!audioFile) {
    return { success: false, error: 'Audio file is required' };
  }

  try {
    // Step 1: Create enhancement job
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('enhancement_type', enhancementType);

    console.log(`[API] Creating enhancement job for ${audioFile.name}`);
    const createJobUrl = buildUrl('/audio/enhance');
    const createResponse = await fetchWithTimeout(
      createJobUrl,
      {
        method: 'POST',
        body: formData,
      },
      30000 // 30s timeout just for upload
    );

    if (!createResponse.ok) {
      const text = await createResponse.text().catch(() => '');
      return {
        success: false,
        error: `Failed to create enhancement job: ${text}`,
      };
    }

    const createJson = await createResponse.json().catch(() => null);
    if (!createJson || !createJson.job_id) {
      return {
        success: false,
        error: 'Invalid job creation response',
      };
    }

    const jobId = createJson.job_id;
    console.log(`[API] Enhancement job created: ${jobId}, polling for completion...`);

    // Step 2: Poll job status until complete
    return pollJobStatus(jobId, API_TIMEOUTS.enhance);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Enhancement failed';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Export enhanced audio via backend
 * POST /audio/enhance/export
 */
export async function exportEnhancedAudio(
  audioUrl: string,
  format: 'mp3' | 'wav' = 'wav'
): Promise<ApiResponse> {
  if (!audioUrl) {
    return { success: false, error: 'Audio URL is required' };
  }

  return callApiRequest(
    '/audio/enhance/export',
    'POST',
    {
      audio_url: audioUrl,
      format,
    },
    API_TIMEOUTS.default
  );
}

/**
 * Health check endpoint
 * GET /health
 * Verify backend is online
 */
export async function healthCheck(): Promise<ApiResponse> {
  return callApiRequest('/health', 'GET', undefined, API_TIMEOUTS.health);
}

