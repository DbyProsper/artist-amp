import {describe,expect,it} from 'vitest';
import {PIANO_TRACKS} from '../configuration/manifest';
import {generatePianoChart,validatePianoChart} from './charts';
describe('MusicInsta Piano charts',()=>{it('keeps every launch chart playable and deterministic',()=>{for(const track of PIANO_TRACKS)for(const difficulty of track.difficulties){const first=generatePianoChart(track,difficulty);expect(first).toEqual(generatePianoChart(track,difficulty));expect(validatePianoChart(first)).toEqual([]);expect(first.length).toBeGreaterThan(8);}});});
