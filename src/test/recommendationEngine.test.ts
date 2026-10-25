import { describe, expect, it } from 'vitest';
import type { Artist, Post, Track } from '@/types';
import { buildPersonalizedQueue, contentSimilarity, rankCatalog, rankFeedPosts, type ListeningHistoryEntry } from '@/services/recommendationEngine';

const artist = (id: string, genres: string[]): Artist => ({
  id, name: id, username: id, avatar: '', coverImage: '', bio: '', location: '', genres,
  isVerified: false, followers: 0, following: 0, tracks: 1,
});

const track = (id: string, artistId: string, genre: string, extra: Partial<Track> = {}): Track => ({
  id, title: id, artist: artist(artistId, [genre]), coverArt: '', duration: 180,
  plays: 0, likes: 0, audioUrl: `https://storage.example/${id}.mp3`, genre, tags: [genre], ...extra,
});

describe('content-based recommendation engine', () => {
  it('does not use popularity totals in content similarity', () => {
    const seed = track('seed', 'a', 'house', { bpm: 122, energy: 0.8 });
    const lowPopularity = track('low', 'b', 'house', { bpm: 124, energy: 0.78, plays: 1, likes: 0 });
    const highPopularity = track('high', 'c', 'house', { bpm: 124, energy: 0.78, plays: 9_000_000, likes: 500_000 });
    expect(contentSimilarity(seed, lowPopularity)).toBeCloseTo(contentSimilarity(seed, highPopularity), 8);
  });

  it('places music the listener knows before new discoveries', () => {
    const seed = track('seed', 'a', 'afrobeats');
    const familiar = track('familiar', 'b', 'jazz');
    const discovery = track('discovery', 'c', 'afrobeats');
    const history: ListeningHistoryEntry[] = [{ trackId: familiar.id, playCount: 2, completedCount: 1, skipCount: 0, liked: true, lastPlayedAt: Date.now() }];
    expect(buildPersonalizedQueue(seed, [seed, discovery, familiar], history).map(item => item.id)).toEqual(['seed', 'familiar', 'discovery']);
  });

  it('penalises repeatedly skipped tracks', () => {
    const seed = track('seed', 'a', 'r&b');
    const kept = track('kept', 'b', 'r&b');
    const skipped = track('skipped', 'c', 'r&b');
    const history: ListeningHistoryEntry[] = [
      { trackId: kept.id, playCount: 1, completedCount: 1, skipCount: 0, liked: false, lastPlayedAt: 2 },
      { trackId: skipped.id, playCount: 1, completedCount: 0, skipCount: 6, liked: false, lastPlayedAt: 1 },
    ];
    const ranked = rankCatalog([seed, skipped, kept], history, seed);
    expect(ranked.findIndex(item => item.track.id === 'kept')).toBeLessThan(ranked.findIndex(item => item.track.id === 'skipped'));
  });

  it('spreads new recommendations across artists where possible', () => {
    const seed = track('seed', 'a', 'hip-hop');
    const queue = buildPersonalizedQueue(seed, [
      seed,
      track('b1', 'b', 'hip-hop'), track('b2', 'b', 'hip-hop'),
      track('c1', 'c', 'hip-hop'), track('d1', 'd', 'hip-hop'),
    ], []);
    expect(queue[1].artist.id).not.toBe(queue[2].artist.id);
  });

  it('uses onboarding genre preferences for cold-start listeners without hiding other genres', () => {
    const amapiano = track('amapiano', 'a', 'amapiano');
    const rock = track('rock', 'b', 'rock');
    const ranked = rankCatalog([rock, amapiano], [], null, ['Amapiano']);
    expect(ranked[0].track.id).toBe('amapiano');
    expect(ranked.map(item => item.track.id)).toContain('rock');
  });

  it('keeps every recent post ahead of older personalized posts', () => {
    const makePost = (id: string, createdAt: Date, music: Track): Post => ({ id, artist: music.artist, type: 'audio', track: music, caption: '', likes: 0, comments: 0, shares: 0, saves: 0, createdAt });
    const recent = makePost('recent', new Date(), track('recent-track', 'a', 'rock'));
    const olderLiked = makePost('older', new Date(Date.now() - 72 * 60 * 60 * 1000), track('liked-track', 'b', 'amapiano'));
    const history: ListeningHistoryEntry[] = [{ trackId: 'liked-track', playCount: 8, completedCount: 4, skipCount: 0, liked: true, lastPlayedAt: Date.now() }];
    expect(rankFeedPosts([olderLiked, recent], history, ['amapiano'])[0].id).toBe('recent');
  });
});
