export interface Recommendation {
  song: string;
  genre?: string;
  mood?: string;
  artist?: string;
  [key: string]: any;
}

export async function fetchRecommendations(song: string): Promise<Recommendation[]> {
  if (!song.trim()) {
    throw new Error('Please provide a song name to fetch recommendations.');
  }

  const url = `/api/recommend?song=${encodeURIComponent(song)}`;
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
