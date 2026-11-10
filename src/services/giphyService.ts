export type GiphyKind = 'gifs' | 'stickers';

export interface GiphyResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

export async function findGiphyMedia(kind: GiphyKind, search: string, signal?: AbortSignal): Promise<GiphyResult[]> {
  const apiKey = String(import.meta.env.VITE_GIPHY_API_KEY || '').trim();
  if (!apiKey) return [];
  const endpoint = search.trim() ? 'search' : 'trending';
  const params = new URLSearchParams({ api_key: apiKey, limit: '24', rating: 'pg-13' });
  if (search.trim()) params.set('q', search.trim());
  const response = await fetch(`https://api.giphy.com/v1/${kind}/${endpoint}?${params}`, { signal });
  if (!response.ok) throw new Error('GIPHY is temporarily unavailable.');
  const payload = await response.json();
  return (Array.isArray(payload?.data) ? payload.data : []).flatMap((item: any) => {
    const original = item?.images?.fixed_height?.url || item?.images?.original?.url;
    const preview = item?.images?.fixed_height_small?.url || item?.images?.preview_gif?.url || original;
    return original ? [{ id: String(item.id), title: String(item.title || 'GIPHY media'), url: String(original), previewUrl: String(preview) }] : [];
  });
}
