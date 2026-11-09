import type { Artist, Post, Track } from "@/types";
import { canonicalGenre } from "@/lib/genres";

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
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "feat",
  "music",
  "song",
]);

function clean(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function cleanGenre(value: unknown): string {
  return canonicalGenre(String(value ?? ""))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function trackGenres(track: Track): string[] {
  return [
    ...new Set(
      [track.genre, ...track.artist.genres]
        .filter(Boolean)
        .map(cleanGenre)
        .filter(Boolean),
    ),
  ];
}

export function trackMatchesGenres(track: Track, genres: string[]): boolean {
  const requested = new Set(genres.map(cleanGenre).filter(Boolean));
  return trackGenres(track).some((genre) => requested.has(genre));
}

function addTokens(
  vector: Map<string, number>,
  value: unknown,
  weight: number,
) {
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
  if (left.bpm && right.bpm)
    measures.push(Math.max(0, 1 - Math.abs(left.bpm - right.bpm) / 80));
  if (Number.isFinite(left.energy) && Number.isFinite(right.energy)) {
    measures.push(
      Math.max(0, 1 - Math.abs(Number(left.energy) - Number(right.energy))),
    );
  }
  if (Number.isFinite(left.loudness) && Number.isFinite(right.loudness)) {
    measures.push(
      Math.max(
        0,
        1 - Math.abs(Number(left.loudness) - Number(right.loudness)) / 24,
      ),
    );
  }
  return measures.length
    ? measures.reduce((sum, value) => sum + value, 0) / measures.length
    : 0;
}

export function contentSimilarity(left: Track, right: Track): number {
  if (left.id === right.id) return 1;
  const text = cosine(trackVector(left), trackVector(right));
  const numeric = numericSimilarity(left, right);
  const artistGenreOverlap = left.artist.genres.some((genre) =>
    right.artist.genres.map(clean).includes(clean(genre)),
  )
    ? 0.12
    : 0;
  return Math.min(1, text * 0.72 + numeric * 0.16 + artistGenreOverlap);
}

function historyAffinity(entry?: ListeningHistoryEntry): number {
  if (!entry) return 0;
  const positive =
    Math.log1p(entry.playCount) * 0.18 +
    entry.completedCount * 0.08 +
    (entry.liked ? 0.42 : 0);
  const penalty = entry.skipCount * 0.16;
  return Math.max(-0.5, Math.min(1, positive - penalty));
}

function historyMap(history: ListeningHistoryEntry[]) {
  return new Map(history.map((entry) => [entry.trackId, entry]));
}

function historyProfile(
  catalog: Track[],
  history: ListeningHistoryEntry[],
): Array<{ track: Track; weight: number }> {
  const tracks = new Map(catalog.map((track) => [track.id, track]));
  return history
    .map((entry) => ({
      track: tracks.get(entry.trackId),
      weight: Math.max(0, historyAffinity(entry)),
    }))
    .filter((item): item is { track: Track; weight: number } =>
      Boolean(item.track && item.weight > 0),
    );
}

function preferenceSimilarity(
  candidate: Track,
  profile: Array<{ track: Track; weight: number }>,
): number {
  if (!profile.length) return 0;
  let weighted = 0;
  let total = 0;
  for (const item of profile) {
    weighted += contentSimilarity(candidate, item.track) * item.weight;
    total += item.weight;
  }
  return total ? weighted / total : 0;
}

function learnedGenreProfile(
  profile: Array<{ track: Track; weight: number }>,
): Map<string, number> {
  const weights = new Map<string, number>();
  for (const item of profile) {
    for (const genre of trackGenres(item.track))
      weights.set(genre, (weights.get(genre) ?? 0) + item.weight);
  }
  const maximum = Math.max(0, ...weights.values());
  if (maximum > 0)
    weights.forEach((value, genre) => weights.set(genre, value / maximum));
  return weights;
}

function uniquePlayable(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
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
  const familiarArtists = new Set(profile.map((item) => item.track.artist.id));
  const preferred = new Set(preferredGenres.map(cleanGenre).filter(Boolean));
  const learnedGenres = learnedGenreProfile(profile);

  return playable
    .filter((track) => track.id !== seed?.id)
    .map((track) => {
      const entry = byHistory.get(track.id);
      const familiar = Boolean(entry && (entry.playCount > 0 || entry.liked));
      const seedScore = seed ? contentSimilarity(seed, track) : 0;
      const preferenceScore = preferenceSimilarity(track, profile);
      const affinity = historyAffinity(entry);
      const candidateGenres = trackGenres(track);
      const onboardingAffinity = candidateGenres.some((genre) =>
        preferred.has(genre),
      )
        ? 1
        : 0;
      const learnedGenreAffinity = Math.max(
        0,
        ...candidateGenres.map((genre) => learnedGenres.get(genre) ?? 0),
      );
      const discoveryBoost = familiarArtists.has(track.artist.id) ? 0 : 0.08;
      // Explicit onboarding choices dominate cold-start results. Listening and
      // likes then refine the order without permanently hiding other genres.
      const score =
        onboardingAffinity * 1.4 +
        learnedGenreAffinity * 0.72 +
        seedScore * 0.32 +
        preferenceScore * 0.24 +
        affinity * 0.14 +
        discoveryBoost;
      const reason = familiar
        ? entry?.liked
          ? "liked before"
          : "played before"
        : onboardingAffinity
          ? "matches your preferred genres"
          : seedScore >= preferenceScore && seed
            ? `similar to ${seed.title}`
            : "a new genre to explore";
      return { track, score, reason, familiar };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.track.createdAt?.getTime() ?? 0) -
          (a.track.createdAt?.getTime() ?? 0),
    );
}

function diversifyArtists(items: RankedTrack[]): RankedTrack[] {
  const remaining = [...items];
  const result: RankedTrack[] = [];
  let previousArtist = "";
  while (remaining.length) {
    const nextIndex = remaining.findIndex(
      (item) => item.track.artist.id !== previousArtist,
    );
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
  const familiar = ranked.filter((item) => item.familiar);
  const discovery = diversifyArtists(ranked.filter((item) => !item.familiar));
  return [
    seed,
    ...familiar.map((item) => item.track),
    ...discovery.map((item) => item.track),
  ].slice(0, limit);
}

function stableUserVariation(userId: string, postId: string): number {
  let hash = 2166136261;
  const value = `${userId}:${postId}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

export function rankFeedPosts(
  posts: Post[],
  history: ListeningHistoryEntry[],
  preferredGenres: string[] = [],
  userId = "guest",
): Post[] {
  const audioTracks = posts.flatMap((post) =>
    post.track?.audioUrl ? [post.track] : [],
  );
  const scoreById = new Map(
    rankCatalog(audioTracks, history, null, preferredGenres).map(
      (item, index) => [item.track.id, item.score - index * 0.00001],
    ),
  );
  const artistScores = new Map<string, number>();
  posts.forEach((post) => {
    if (!post.track) return;
    artistScores.set(
      post.artist.id,
      Math.max(
        artistScores.get(post.artist.id) ?? 0,
        scoreById.get(post.track.id) ?? 0,
      ),
    );
  });
  const preferred = new Set(preferredGenres.map(cleanGenre).filter(Boolean));
  const scorePost = (post: Post) => {
    const personalTieBreak = stableUserVariation(userId, post.id) * 0.025;
    const ageHours = Math.max(
      0,
      (Date.now() - post.createdAt.getTime()) / 3_600_000,
    );
    const freshness = Math.max(0, 1 - ageHours / 48) * 0.18;
    if (post.track)
      return (scoreById.get(post.track.id) ?? 0) + personalTieBreak + freshness;
    const explicitArtistMatch = post.artist.genres.some((genre) =>
      preferred.has(cleanGenre(genre)),
    )
      ? 1.4
      : 0;
    return (
      explicitArtistMatch +
      (artistScores.get(post.artist.id) ?? 0) +
      personalTieBreak +
      freshness
    );
  };
  const comparePersonalized = (left: Post, right: Post) => {
    const leftScore = scorePost(left);
    const rightScore = scorePost(right);
    return (
      rightScore - leftScore ||
      right.createdAt.getTime() - left.createdAt.getTime()
    );
  };
  return [...posts].sort(comparePersonalized);
}

export function rankArtists(
  artists: Artist[],
  catalog: Track[],
  history: ListeningHistoryEntry[],
  preferredGenres: string[] = [],
): Artist[] {
  const rankedTracks = rankCatalog(catalog, history, null, preferredGenres);
  const trackScores = new Map(
    rankedTracks.map((item) => [item.track.id, item.score]),
  );
  const artistScores = new Map<string, number>();
  for (const track of catalog) {
    const taste = trackScores.get(track.id) ?? 0;
    const popularity =
      Math.log1p(Math.max(0, track.plays)) * 0.012 +
      Math.log1p(Math.max(0, track.likes)) * 0.02;
    artistScores.set(
      track.artist.id,
      Math.max(artistScores.get(track.artist.id) ?? 0, taste + popularity),
    );
  }
  const preferred = new Set(preferredGenres.map(cleanGenre).filter(Boolean));
  return [...artists].sort((left, right) => {
    const leftExplicit = left.genres.some((genre) =>
      preferred.has(cleanGenre(genre)),
    )
      ? 1
      : 0;
    const rightExplicit = right.genres.some((genre) =>
      preferred.has(cleanGenre(genre)),
    )
      ? 1
      : 0;
    return (
      rightExplicit - leftExplicit ||
      (artistScores.get(right.id) ?? 0) - (artistScores.get(left.id) ?? 0) ||
      right.followers - left.followers ||
      left.name.localeCompare(right.name)
    );
  });
}

export function shuffleUpcoming(
  queue: Track[],
  currentTrackId: string,
): Track[] {
  const currentIndex = queue.findIndex((track) => track.id === currentTrackId);
  if (currentIndex < 0) return queue;
  const before = queue.slice(0, currentIndex + 1);
  const upcoming = queue.slice(currentIndex + 1);
  for (let index = upcoming.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [upcoming[index], upcoming[swap]] = [upcoming[swap], upcoming[index]];
  }
  return [...before, ...upcoming];
}
