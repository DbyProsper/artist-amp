/**
 * API Integration for FastAPI Backend
 * Handles all communication with the local FastAPI server at http://127.0.0.1:8000
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

interface ApiResponse {
  status: string;
  file?: string;
  error?: string;
}

/**
 * Helper function to make API requests
 * @param endpoint - The endpoint path (e.g., '/generate-music')
 * @param prompt - The user prompt
 * @returns Promise with parsed JSON response
 */
async function fetchFromAPI(endpoint: string, prompt: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Generate music from a text prompt
 * @param prompt - Description of the beat/music to generate
 * @returns Promise with file path to generated music
 */
export async function generateMusic(prompt: string): Promise<string> {
  const response = await fetchFromAPI('/generate-music', prompt);
  if (response.status !== 'success' || !response.file) {
    throw new Error('Failed to generate music');
  }
  return `${API_BASE_URL}/${response.file}`;
}

/**
 * Generate lyrics from a text prompt
 * @param prompt - Description of the lyrics to generate
 * @returns Promise with generated lyrics
 */
export async function generateLyrics(prompt: string): Promise<string> {
  const response = await fetchFromAPI('/generate-lyrics', prompt);
  if (response.status !== 'success' || !response.file) {
    throw new Error('Failed to generate lyrics');
  }
  // The file path contains the lyrics content
  return response.file;
}

/**
 * Generate cover art from a text prompt
 * @param prompt - Description of the cover art to generate
 * @returns Promise with file path to generated cover image
 */
export async function generateCover(prompt: string): Promise<string> {
  const response = await fetchFromAPI('/generate-cover', prompt);
  if (response.status !== 'success' || !response.file) {
    throw new Error('Failed to generate cover art');
  }
  return `${API_BASE_URL}/${response.file}`;
}
