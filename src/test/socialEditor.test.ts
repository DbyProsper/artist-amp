import { describe, expect, it } from 'vitest';
import { DEFAULT_SOCIAL_ADJUSTMENTS, aspectRatioValue, socialFilter } from '@/types/socialEditor';

describe('social media editor', () => {
  it('maps supported publishing ratios to CSS ratios', () => {
    expect(aspectRatioValue('4:5')).toBe('4 / 5');
    expect(aspectRatioValue('9:16')).toBe('9 / 16');
    expect(aspectRatioValue('original')).toBeUndefined();
  });

  it('turns image adjustments into a safe filter', () => {
    const filter = socialFilter({ ...DEFAULT_SOCIAL_ADJUSTMENTS, brightness: 20, warmth: 15, sharpen: 25 });
    expect(filter).toContain('brightness(120%)');
    expect(filter).toContain('sepia(5.25%)');
    expect(filter).not.toContain('NaN');
  });

  it('safely renders legacy stories without saved adjustments', () => {
    expect(() => socialFilter(undefined)).not.toThrow();
    expect(socialFilter(undefined)).toContain('brightness(100%)');
  });
});
