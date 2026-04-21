/**
 * EXAMPLE: Using the new API with Studio Components
 * 
 * This shows how to properly use the backend API endpoints
 * with the Studio redesign components from Phase 3
 */

import {
  generateMusic,
  generateSong,
  generateLyrics,
  generateImage,
  generateMerch,
  healthCheck,
} from '@/lib/api';
import { useState } from 'react';

// ============================================================================
// EXAMPLE 1: Music Generation with Loading State
// ============================================================================

export function MusicGenerationExample() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Call API with proper options
      const response = await generateMusic(prompt, {
        genre: 'amapiano',
        mood: 'upbeat',
        language: 'en',
        bpm: 128,
        user_tier: 'free', // or 'premium'
      });

      // Handle success
      if (response.success && response.audio_url) {
        setAudioUrl(response.audio_url); // GCS signed URL - works directly!
        console.log('Generated audio:', response.audio_url);
      } else {
        // Handle API error
        setError(response.error || 'Failed to generate music');
      }
    } catch (err) {
      // Handle network error
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the music you want to generate..."
        disabled={isGenerating}
      />

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? 'Generating music... (1-2 minutes)' : 'Generate Music'}
      </button>

      {error && <div className="text-red-500">{error}</div>}

      {audioUrl && (
        <audio
          src={audioUrl}
          controls
          autoPlay
          className="w-full"
        />
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Complete Song Generation (Music + Lyrics + Cover)
// ============================================================================

export function SongGenerationExample() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [song, setSong] = useState<{
    audioUrl?: string;
    imageUrl?: string;
    lyrics?: string;
  } | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // This takes 90-150 seconds (parallel generation)
      const response = await generateSong(prompt, {
        genre: 'electronic',
        mood: 'energetic',
        user_tier: 'free',
      });

      if (response.success && response.data) {
        setSong({
          audioUrl: response.audio_url,        // Normalized field
          imageUrl: response.cover_url,        // Normalized field
          lyrics: response.lyrics,             // Normalized field
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your song concept..."
        disabled={isGenerating}
      />

      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating complete song... (2-3 minutes)' : 'Create Full Song'}
      </button>

      {song && (
        <div className="space-y-4">
          {song.imageUrl && (
            <img src={song.imageUrl} alt="Cover art" className="w-full rounded-lg" />
          )}

          {song.audioUrl && (
            <audio src={song.audioUrl} controls autoPlay className="w-full" />
          )}

          {song.lyrics && (
            <div className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
              {song.lyrics}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Image Generation (Covers, Merchandise, Posters)
// ============================================================================

export function ImageGenerationExample() {
  const [prompt, setPrompt] = useState('');
  const [imageType, setImageType] = useState<'cover' | 'merch' | 'poster'>('cover');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    const response = await generateImage(prompt, {
      image_type: imageType,
      user_tier: 'free',
    });

    if (response.success) {
      setImageUrl(response.cover_url || response.data?.image_url);
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={imageType}
        onChange={(e) => setImageType(e.target.value as any)}
      >
        <option value="cover">Album Cover</option>
        <option value="merch">Merchandise</option>
        <option value="poster">Poster</option>
      </select>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image..."
      />

      <button onClick={handleGenerate}>Generate Image</button>

      {imageUrl && (
        <img src={imageUrl} alt="Generated" className="w-full rounded-lg" />
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Lyrics Generation
// ============================================================================

export function LyricsGenerationExample() {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState<string | null>(null);

  const handleGenerate = async () => {
    const response = await generateLyrics(prompt, {
      mood: 'upbeat',
      genre: 'pop',
    });

    if (response.success) {
      setLyrics(response.lyrics || response.data?.lyrics?.text);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the song theme..."
      />

      <button onClick={handleGenerate}>Generate Lyrics</button>

      {lyrics && (
        <div className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
          {lyrics}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Health Check (Verify Backend is Online)
// ============================================================================

export function HealthCheckExample() {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');

  const checkHealth = async () => {
    setStatus('checking');
    const response = await healthCheck();
    setStatus(response.success ? 'healthy' : 'offline');
  };

  return (
    <div>
      <button onClick={checkHealth}>Check Backend Status</button>
      <div>
        Status: {' '}
        <span className={status === 'healthy' ? 'text-green-500' : 'text-red-500'}>
          {status}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Integration with Studio Components (StudioPage)
// ============================================================================

export async function handleStudioGeneration(
  feature: 'beat' | 'lyrics' | 'song' | 'cover' | 'merch' | 'chat',
  prompt: string,
  metadata: {
    genre?: string;
    mood?: string;
    language?: string;
    bpm?: number;
  }
) {
  const userTier = 'free'; // or 'premium'

  try {
    let response;

    // Route to appropriate endpoint based on feature
    switch (feature) {
      case 'beat':
        response = await generateMusic(prompt, { ...metadata, user_tier: userTier });
        break;

      case 'lyrics':
        response = await generateLyrics(prompt, metadata);
        break;

      case 'song':
        response = await generateSong(prompt, { ...metadata, user_tier: userTier });
        break;

      case 'cover':
        response = await generateImage(prompt, {
          image_type: 'cover',
          user_tier: userTier,
        });
        break;

      case 'merch':
        response = await generateMerch(prompt, { user_tier: userTier });
        break;

      default:
        throw new Error(`Unknown feature: ${feature}`);
    }

    if (response.success) {
      return {
        success: true,
        audioUrl: response.audio_url,
        imageUrl: response.cover_url,
        lyrics: response.lyrics,
        data: response.data,
      };
    } else {
      throw new Error(response.error || 'Generation failed');
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 7: Storing Generated Items in History
// ============================================================================

export interface GeneratedItem {
  id: string;
  feature: string;
  prompt: string;
  audioUrl?: string;
  imageUrl?: string;
  lyrics?: string;
  createdAt: Date;
  metadata: {
    genre?: string;
    mood?: string;
    bpm?: number;
    language?: string;
  };
}

export function useGenerationHistory() {
  const [history, setHistory] = useState<GeneratedItem[]>(() => {
    const saved = localStorage.getItem('studio_history');
    return saved ? JSON.parse(saved) : [];
  });

  const addToHistory = (item: GeneratedItem) => {
    const updated = [item, ...history].slice(0, 50); // Keep last 50 items
    setHistory(updated);
    localStorage.setItem('studio_history', JSON.stringify(updated));
  };

  return { history, addToHistory };
}

// Usage:
// const { history, addToHistory } = useGenerationHistory();
//
// const response = await generateMusic(prompt, options);
// if (response.success) {
//   addToHistory({
//     id: Date.now().toString(),
//     feature: 'beat',
//     prompt,
//     audioUrl: response.audio_url,
//     createdAt: new Date(),
//     metadata: { genre: 'amapiano', mood: 'upbeat', bpm: 128 }
//   });
// }
