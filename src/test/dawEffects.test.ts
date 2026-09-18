import { describe, expect, it } from 'vitest';
import { defaultDawEffects, estimatePitch, nearestScaleCorrectionCents, normalizeDawEffects } from '@/lib/dawEffects';

describe('DAW effect settings', () => {
  it('restores legacy mixer values into the new effect rack', () => {
    const effects = normalizeDawEffects(undefined, { delay: 45, reverb: 30, compressorEnabled: true, compressorAmount: 50, pitchEnabled: true, pitchAmount: 70, pitchKey: 'D', pitchScale: 'Minor' });
    expect(effects.delay).toMatchObject({ enabled: true, wet: 45 });
    expect(effects.reverb).toMatchObject({ enabled: true, wet: 30 });
    expect(effects.compressor.enabled).toBe(true);
    expect(effects.pitch).toMatchObject({ enabled: true, key: 'D', scale: 'Minor', correctionStrength: 70 });
  });

  it('creates independent defaults for every channel', () => {
    const first = defaultDawEffects(), second = defaultDawEffects();
    first.equalizer.bands[0].gain = 9;
    expect(second.equalizer.bands[0].gain).toBe(0);
  });

  it('detects a stable vocal-range tone', () => {
    const sampleRate = 44100, frequency = 220;
    const data = Float32Array.from({ length: 4096 }, (_, index) => Math.sin(2 * Math.PI * frequency * index / sampleRate) * .8);
    expect(estimatePitch(data, sampleRate, 80, 600)).toBeCloseTo(frequency, -1);
  });

  it('quantizes detected pitch to the selected key and scale', () => {
    const settings = { ...defaultDawEffects().pitch, key: 'C', scale: 'Major', correctionStrength: 100, wet: 100, referenceFrequency: 440 };
    expect(nearestScaleCorrectionCents(277.18, settings)).toBeLessThan(0);
    expect(Math.abs(nearestScaleCorrectionCents(261.63, settings))).toBeLessThan(1);
  });
});
