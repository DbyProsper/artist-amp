import { describe, expect, it } from 'vitest';
import { GAME_CATALOGUE, REWARD_MILESTONES, MEMORY_LEVELS, FLAPPY_LEVELS } from '@/lib/games/gameConfig';
import { applyReleaseChoice, campaignEvents, initialReleaseState, releaseResult } from '@/lib/games/releaseDayEngine';

describe('MusicInsta Games', () => {
  it('keeps the required catalogue order and only three playable games', () => {
    expect(GAME_CATALOGUE.map(game => game.title)).toEqual(['Release Day Simulator','Flappy Bird','One More Floor','Memory Heist','Angry Birds','Stack','2048','Whack-a-Mole']);
    expect(GAME_CATALOGUE.filter(game => game.playable).map(game => game.id)).toEqual(['release-day','flappy','memory-heist']);
  });
  it('has the exact typed milestone totals', () => {
    const totals = REWARD_MILESTONES.reduce((sum, item) => ({ ...sum, [item.kind]: sum[item.kind] + item.amount }), { images: 0, beats: 0, fullSongs: 0 });
    expect(totals).toEqual({ images: 3, beats: 2, fullSongs: 2 });
  });
  it('produces deterministic release events and consequences', () => {
    const first = campaignEvents('same-seed', 1), second = campaignEvents('same-seed', 1);
    expect(first.map(event => event.id)).toEqual(second.map(event => event.id));
    const state = initialReleaseState(6000), next = applyReleaseChoice(state, first[0], first[0].choices[0]);
    expect(next.turn).toBe(1); expect(next.history).toHaveLength(1); expect(releaseResult(next).score).toBeGreaterThanOrEqual(0);
  });
  it('ships all requested playable levels within safe ranges', () => {
    expect(MEMORY_LEVELS).toHaveLength(12); expect(Math.min(...MEMORY_LEVELS.map(level => level.pairs))).toBeGreaterThanOrEqual(3);
    expect(FLAPPY_LEVELS).toHaveLength(10); expect(Math.min(...FLAPPY_LEVELS.map(level => level.gap))).toBeGreaterThanOrEqual(120);
  });
});
