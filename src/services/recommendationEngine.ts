import type { Post, Track } from '@/types';

export interface ListeningHistoryEntry {
  trackId: string;
  userId?: string;
  playCount: number;
  completedCount: number;
  skipCount: number;
  liked: boolean;
  lastPlayedAt: number;
  lastPosition?: number;
}

export interface RankedTrack {
  track: Track;
  score: number;
  reason: string;
  familiar: boolean;
}

const WORDS = /[\p{L}\p{N}]+/gu;
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'feat', 'music', 'song']);

function clean(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function addTokens(vector: Map<string, number>, value: unknown, weight: number) {
  const words = clean(value).match(WORDS) ?? [];
  for (const word of words) {
    if (word.length < 2 || STOP_WORDS.has(word)) continue;
    vector.set(word, (vector.get(word) ?? 0) + weight);
  }
}

function trackVector(track: Track): Map<string, number> {
  const vector = new Map<string, number>();
  addTokens(vector, track.genre, 5);
  addTokens(vector, track.mood, 4);
  addTokens(vector, track.artist.genres, 4);
  addTokens(vector, track.tags, 3);
  addTokens(vector, track.title, 1.5);
  addTokens(vector, track.lyrics?.slice(0, 1800), 0.35);
  return vector;
}

function cosine(left: Map<string, number>, right: Map<string, number>): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const value of left.values()) leftNorm += value * value;
  for (const value of right.values()) rightNorm += value * value;
  if (!leftNorm || !rightNorm) return 0;
  for (const [key, value] of left) dot += value * (right.get(key) ?? 0);
  return dot / Math.sqrt(leftNorm * rightNorm);
}

function numericSimilarity(left: Track, right: Track): number {
  const measures: number[] = [];
  if (left.bpm && right.bpm) measures.push(Math.max(0, 1 - Math.abs(left.bpm - right.bpm) / 80));
  if (Number.isFinite(left.energy) && Number.isFinite(right.energy)) {
    measures.push(Math.max(0, 1 - Math.abs(Number(left.energy) - Number(right.energy))));
  }
  if (Number.isFinite(left.loudness) && Number.isFinite(right.loudness)) {
    measures.push(Math.max(0, 1 - Math.abs(Number(left.loudness) - Number(right.loudness)) / 24));
  }
  return measures.length ? measures.reduce((sum, value) => sum + value, 0) / measures.length : 0;
}

export function contentSimilarity(left: Track, right: Track): number {
  if (left.id === right.id) return 1;
  const text = cosine(trackVector(left), trackVector(right));
  const numeric = numericSimilarity(left, right);
  const artistGenreOverlap = left.artist.genres.some(genre => right.artist.genres.map(clean).includes(clean(genre))) ? 0.12 : 0;
  return Math.min(1, text * 0.72 + numeric * 0.16 + artistGenreOverlap);
}

function historyAffinity(entry?: ListeningHistoryEntry): number {
  if (!entry) return 0;
  const positive = Math.log1p(entry.playCount) * 0.18 + entry.completedCount * 0.08 + (entry.liked ? 0.42 : 0);
  const penalty = entry.skipCount * 0.16;
  return Math.max(-0.5, Math.min(1, positive - penalty));
}

function historyMap(history: ListeningHistoryEntry[]) {
  return new Map(history.map(entry => [entry.trackId, entry]));
}

function historyProfile(catalog: Track[], history: ListeningHistoryEntry[]): Array<{ track: Track; weight: number }> {
  const tracks = new Map(catalog.map(track => [track.id, track]));
  return history
    .map(entry => ({ track: tracks.get(entry.trackId), weight: Math.max(0, historyAffinity(entry)) }))
    .filter((item): item is { track: Track; weight: number } => Boolean(item.track && item.weight > 0));
}

function preferenceSimilarity(candidate: Track, profile: Array<{ track: Track; weight: number }>): number {
  if (!profile.length) return 0;
  let weighted = 0;
  let total = 0;
  for (const item of profile) {
    weighted += contentSimilarity(candidate, item.track) * item.weight;
    total += item.weight;
  }
  return total ? weighted / total : 0;
}

function uniquePlayable(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter(track => {
    const key = track.id || track.audioUrl;
    if (!key || !track.audioUrl || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function rankCatalog(
  catalog: Track[],
  history: ListeningHistoryEntry[],
  seed?: Track | null,
  preferredGenres: string[] = [],
): RankedTrack[] {
  const playable = uniquePlayable(catalog);
  const byHistory = historyMap(history);
  const profile = historyProfile(playable, history);
  const familiarArtists = new Set(profile.map(item => item.track.artist.id));
  const preferred = new Set(preferredGenres.map(clean));

  return playable
    .filter(track => track.id !== seed?.id)
    .map(track => {
      const entry = byHistory.get(track.id);
      const familiar = Boolean(entry && (entry.playCount > 0 || entry.liked));
      const seedScore = seed ? contentSimilarity(seed, track) : 0;
      const preferenceScore = preferenceSimilarity(track, profile);
      const affinity = historyAffinity(entry);
      const candidateGenres = [track.genre, ...track.artist.genres].filter(Boolean).map(clean);
      const onboardingAffinity = candidateGenres.some(genre => preferred.has(genre)) ? 1 : 0;
      const discoveryBoost = familiarArtists.has(track.artist.id) ? 0 : 0.08;
      const score = seedScore * 0.38 + preferenceScore * 0.28 + affinity * 0.16 + onboardingAffinity * 0.28 + discoveryBoost;
      const reason = familiar
        ? entry?.liked ? 'liked before' : 'played before'
        : onboardingAffinity ? 'matches your preferred genres' : seedScore >= preferenceScore && seed ? `similar to ${seed.title}` : 'a new genre to explore';
      return { track, score, reason, familiar };
    })
    .sort((a, b) => b.score - a.score || (b.track.createdAt?.getTime() ?? 0) - (a.track.createdAt?.getTime() ?? 0));
}

function diversifyArtists(items: RankedTrack[]): RankedTrack[] {
  const remaining = [...items];
  const result: RankedTrack[] = [];
  let previousArtist = '';
  while (remaining.length) {
    const nextIndex = remaining.findIndex(item => item.track.artist.id !== previousArtist);
    const [next] = remaining.splice(nextIndex < 0 ? 0 : nextIndex, 1);
    result.push(next);
    previousArtist = next.track.artist.id;
  }
  return result;
}

export function buildPersonalizedQueue(
  seed: Track,
  catalog: Track[],
  history: ListeningHistoryEntry[],
  limit = 100,
  preferredGenres: string[] = [],
): Track[] {
  const completeCatalog = uniquePlayable([seed, ...catalog]);
  const ranked = rankCatalog(completeCatalog, history, seed, preferredGenres);
  const familiar = ranked.filter(item => item.familiar);
  const discovery = diversifyArtists(ranked.filter(item => !item.familiar));
  return [seed, ...familiar.map(item => item.track), ...discovery.map(item => item.track)].slice(0, limit);
}

export function rankFeedPosts(posts: Post[], history: ListeningHistoryEntry[], preferredGenres: string[] = []): Post[] {
  const audioTracks = posts.flatMap(post => post.track?.audioUrl ? [post.track] : []);
  const scoreById = new Map(rankCatalog(audioTracks, history, null, preferredGenres).map((item, index) => [item.track.id, item.score - index * 0.00001]));
  const newestCutoff = Date.now() - 48 * 60 * 60 * 1000;
  const newest = posts.filter(post => post.createdAt.getTime() >= newestCutoff).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const ranked = posts.filter(post => post.createdAt.getTime() < newestCutoff).sort((left, right) => {
    const leftScore = left.track ? scoreById.get(left.track.id) ?? 0 : 0;
    const rightScore = right.track ? scoreById.get(right.track.id) ?? 0 : 0;
    return rightScore - leftScore || right.createdAt.getTime() - left.createdAt.getTime();
  });
  return [...newest, ...ranked];
}

export function shuffleUpcoming(queue: Track[], currentTrackId: string): Track[] {
  const currentIndex = queue.findIndex(track => track.id === currentTrackId);
  if (currentIndex < 0) return queue;
  const before = queue.slice(0, currentIndex + 1);
  const upcoming = queue.slice(currentIndex + 1);
  for (let index = upcoming.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [upcoming[index], upcoming[swap]] = [upcoming[swap], upcoming[index]];
  }
  return [...before, ...upcoming];
}
