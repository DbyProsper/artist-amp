import { API_BASE } from '@/config/api';

// AI Backend URL for music generation
const AI_BASE_URL = 'https://clinical-created-agent-ray.trycloudflare.com';

export interface ApiResponse {
  success: boolean;
  audio_url?: string;
  audio_base64?: string;
  lyrics?: string;
  cover_url?: string;
  data?: any;
  error?: string;
  message?: string;
  improved_prompt?: string;
  plan?: string;
}

const DEFAULT_TIMEOUT_MS = 30000; // Increased timeout for AI generation

function buildUrl(endpoint: string, isAI: boolean = false): string {
  const baseUrl = isAI ? AI_BASE_URL : API_BASE;
  const url = `${baseUrl.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  return url;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
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
      throw new Error('SSL error: secure connection issue (if using ngrok, open URL once in browser and accept cert)');
    }

    throw new Error('Network error or SSL issue');
  } finally {
    clearTimeout(id);
  }
}

async function callApi(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: object, isAI: boolean = false): Promise<ApiResponse> {
  const url = buildUrl(endpoint, isAI);

  try {
    const response = await fetchWithTimeout(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const errorMessage = text || `HTTP ${response.status}`;
      return { success: false, error: `API error: ${errorMessage}` };
    }

    const json = await response.json().catch((err) => {
      console.error('[API] invalid JSON payload', err);
      return null;
    });

    if (!json || typeof json !== 'object') {
      return { success: false, error: 'Invalid JSON response from API' };
    }

    return {
      success: Boolean(json.success ?? (json.status === 'success') ?? true), // AI endpoints might not have success field
      audio_url: json.audio_url || json.file || json.data?.audio_url,
      audio_base64: json.audio_base64 || json.audio || json.data?.audio_base64,
      cover_url: json.cover_url || json.url || json.data?.cover_url,
      lyrics: json.lyrics || json.data?.lyrics || (typeof json.data === 'string' ? json.data : undefined),
      improved_prompt: json.improved_prompt || json.data?.improved_prompt,
      plan: json.plan || json.data?.plan,
      data: json.data ?? json,
      message: json.message ?? '',
      error: json.error ?? (json.success === false ? 'API returned failure' : undefined),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errMsg };
  }
}

export async function generateMusic(prompt: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApi('/generate', 'POST', { prompt });
}

export async function generateBeats(prompt: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApi('/beats', 'POST', { prompt }, true);
}

export async function generateSmart(prompt: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApi('/generate-smart', 'POST', { prompt }, true);
}

export async function generateGeminiAudio(prompt: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApi('/generate-gemini-audio', 'POST', { prompt }, true);
}

export async function generateLyrics(prompt: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApi('/lyrics', 'POST', { prompt });
}

export async function generateCover(prompt: string): Promise<ApiResponse> {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt cannot be empty' };
  }

  return callApi('/cover', 'POST', { prompt });
}

