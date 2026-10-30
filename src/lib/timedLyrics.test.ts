import { describe, expect, it } from 'vitest';
import { buildTimedLyrics, hasAuthoredTimestamps } from './timedLyrics';

describe('timed lyrics', () => {
  it('uses Lyria second ranges exactly', () => {
    const lyrics = '[0,1] Opening line\n[4.5,7.2] Second line';
    expect(hasAuthoredTimestamps(lyrics)).toBe(true);
    expect(buildTimedLyrics(lyrics, 30)).toEqual([
      { text: 'Opening line', startTime: 0, endTime: 1 },
      { text: 'Second line', startTime: 4.5, endTime: 7.2 },
    ]);
  });

  it('supports minute and second timestamps', () => {
    expect(buildTimedLyrics('[00:08.5] First vocal\n[00:12] Next vocal', 30)).toEqual([
      { text: 'First vocal', startTime: 8.5, endTime: 12 },
      { text: 'Next vocal', startTime: 12, endTime: 30 },
    ]);
  });
});
