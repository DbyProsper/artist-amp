import {describe,expect,it} from 'vitest';
import {judgePianoTiming,pianoAccuracy,pianoStars} from './scoring';
describe('Piano scoring',()=>{it('uses documented windows',()=>{expect(judgePianoTiming(45)).toBe('perfect');expect(judgePianoTiming(-90)).toBe('great');expect(judgePianoTiming(135)).toBe('good');expect(judgePianoTiming(136)).toBe('miss');});it('weights accuracy',()=>{expect(pianoAccuracy({perfect:1,great:1,good:1,miss:1})).toBeCloseTo(57.5);expect(pianoStars(97,0)).toBe(3);});});
