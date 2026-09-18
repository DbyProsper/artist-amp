import { describe, it, expect, vi } from 'vitest';
import { generateMusic, generateLyrics, generateImage } from '@/lib/api';

// Mock fetch globally
const mockFetch = vi.fn<typeof fetch>();
global.fetch = mockFetch;

describe('API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate music successfully', async () => {
    const mockResponse = {
      success: true,
      data: { audio_url: 'https://storage.example/music.mp3' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateMusic('test prompt');
    expect(result.success).toBe(true);
    expect(result.audio_url).toBe('https://storage.example/music.mp3');
  });

  it('should generate lyrics successfully', async () => {
    const mockResponse = {
      success: true,
      lyrics: '[Verse 1]\nSample lyrics...',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateLyrics('test prompt');
    expect(result.success).toBe(true);
    expect(result.lyrics).toContain('Sample lyrics');
  });

  it('should generate image successfully', async () => {
    const mockResponse = {
      success: true,
      data: { image_url: 'https://storage.example/image.jpg' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateImage('test prompt', { image_type: 'cover' });
    expect(result.success).toBe(true);
    expect(result.image_url).toBe('https://storage.example/image.jpg');
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    const result = await generateMusic('test prompt');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Server error');
  });
});
