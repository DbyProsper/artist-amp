export interface Recommendation {
  song?: string;
  song_name?: string;
  title?: string;
  name?: string;
  genre?: string;
  mood?: string;
  artist?: string;
  score?: number;
  reason?: string;
}

export async function fetchRecommendations(song: string, userId?: string): Promise<Recommendation[]> {
  if (!song.trim()) {
    throw new Error('Please provide a song name to fetch recommendations.');
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const url = `${apiBase}/api/recommend?song=${encodeURIComponent(song)}&top_n=12${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unable to load recommendations.');
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const json = await response.json().catch(() => null);
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid recommendations response.');
  }

  if (json.success === false) {
    throw new Error(json.error || json.message || 'Failed to fetch recommendations.');
  }

  const recommendations = json.recommendations || json.data?.recommendations || json.data || [];

  if (!Array.isArray(recommendations)) {
    throw new Error('Unexpected recommendations format.');
  }

  return recommendations;
}
