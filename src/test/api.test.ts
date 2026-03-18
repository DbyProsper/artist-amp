import { describe, it, expect, vi } from 'vitest';
import { generateMusic, generateLyrics, generateCover } from '@/lib/api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate music successfully', async () => {
    const mockResponse = {
      status: 'success',
      file: 'outputs/music.mp3',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateMusic('test prompt');
    expect(result).toBe('http://127.0.0.1:8000/outputs/music.mp3');
    expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/generate-music', {
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

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateLyrics('test prompt');
    expect(result).toBe('Verse 1: Sample lyrics...');
  });

  it('should generate cover art successfully', async () => {
    const mockResponse = {
      status: 'success',
      file: 'outputs/cover.jpg',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateCover('test prompt');
    expect(result).toBe('http://127.0.0.1:8000/outputs/cover.jpg');
  });

  it('should handle API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server error' }),
    });

    await expect(generateMusic('test prompt')).rejects.toThrow('Server error');
  });
});
