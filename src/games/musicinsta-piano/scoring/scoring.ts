export type Judgement='perfect'|'great'|'good'|'miss';
export const PIANO_WINDOWS={perfect:45,great:90,good:135} as const;
export const JUDGEMENT_WEIGHT:Record<Judgement,number>={perfect:1,great:.8,good:.5,miss:0};
export const JUDGEMENT_SCORE:Record<Judgement,number>={perfect:1000,great:700,good:400,miss:0};
export function judgePianoTiming(deltaMs:number):Judgement{const d=Math.abs(deltaMs);return d<=45?'perfect':d<=90?'great':d<=135?'good':'miss';}
export function pianoAccuracy(counts:Record<Judgement,number>){const total=Object.values(counts).reduce((a,b)=>a+b,0);return total?100*(counts.perfect+counts.great*.8+counts.good*.5)/total:100;}
export function pianoStars(accuracy:number,misses:number){return accuracy>=96&&misses===0?3:accuracy>=85?2:accuracy>=70?1:0;}
