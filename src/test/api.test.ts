import { describe, it, expect, vi } from 'vitest';
import { generateMusic, generateLyrics, generateImage } from '@/lib/api';

// Mock fetch globally
const mockFetch = vi.fn() as any;
global.fetch = mockFetch;

describe('API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate music successfully', async () => {
    const mockResponse = {
      status: 'success',
      file: 'outputs/music.mp3',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateMusic('test prompt');
    expect(result).toBe('http://127.0.0.1:8000/outputs/music.mp3');
    expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:8000/generate-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test prompt' }),
    });
  });

  it('should generate lyrics successfully', async () => {
    const mockResponse = {
      status: 'success',
      file: 'Verse 1: Sample lyrics...',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateLyrics('test prompt');
    expect(result).toBe('Verse 1: Sample lyrics...');
  });

  it('should generate image successfully', async () => {
    const mockResponse = {
      status: 'success',
      file: 'outputs/image.jpg',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateImage('test prompt', 'album-cover');
    expect(result.success).toBe(true);
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    await expect(generateMusic('test prompt')).rejects.toThrow('Server error');
  });
});
