import { MEMORY_ASSETS, type MemoryAsset } from './memoryHeistAssets';

export type MemoryMode = 'classic' | 'timed' | 'practice';
export type MemoryRoundState = 'loading' | 'ready' | 'previewing' | 'playing' | 'resolving' | 'paused' | 'completed' | 'failed';
export type MemoryTile = { id: string; pairId: number; asset: MemoryAsset; matched: boolean; open: boolean };
export type MemoryLevel = { level: number; chapter: number; pairs: number; preview: number; timedSeconds: number; threeStarMoves: number; twoStarMoves: number };

const pairCounts = [4,4,5,5,6,6,8,8,9,9,10,10,10,10,11,11,12,12,12,12,13,13,14,15];
const previewByChapter = [[8,7.6,7.2,6.8,6.4,6],[7,6.6,6.2,5.8,5.4,5],[6,5.6,5.2,4.8,4.4,4],[5,4.8,4.6,4.4,4.2,4]];

export const MEMORY_LEVELS_V2: MemoryLevel[] = pairCounts.map((pairs,index) => {
  const chapter = Math.floor(index / 6) + 1;
  const preview = previewByChapter[chapter - 1][index % 6];
  return { level:index+1, chapter, pairs, preview, timedSeconds:Math.round(32 + pairs * 5.5 + chapter * 3), threeStarMoves:pairs, twoStarMoves:pairs + Math.max(2,Math.ceil(pairs*.35)) };
});

export const MEMORY_RULESET_VERSION = 'memory-v2';

export function hashSeed(seed:string) { let value=2166136261; for(const char of seed){ value^=char.charCodeAt(0); value=Math.imul(value,16777619); } return value>>>0 || 1; }
export function seededRandom(seed:string){let state=hashSeed(seed);return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};}

export function selectAssets(level:number,count:number,seed:string){
  const chapter=Math.ceil(level/6); const rng=seededRandom(`${seed}:assets`);
  const preferred=chapter===1?['studio','instruments']:chapter===2?['studio','instruments','backstage']:['studio','instruments','backstage','cosmic'];
  const pool=MEMORY_ASSETS.filter(asset=>preferred.includes(asset.collection));
  const shuffled=[...pool].sort(()=>rng()-.5);
  if(chapter<3){const picked:MemoryAsset[]=[];for(const item of shuffled){if(picked.some(other=>other.similarity.some(tag=>item.similarity.includes(tag))))continue;picked.push(item);if(picked.length===count)break;}for(const item of shuffled)if(picked.length<count&&!picked.includes(item))picked.push(item);return picked.slice(0,count);}
  return shuffled.slice(0,count);
}

function adjacentPairCount(order:number[],columns:number){let count=0;for(let i=0;i<order.length;i++){for(let j=i+1;j<order.length;j++)if(order[i]===order[j]){const sameRow=Math.floor(i/columns)===Math.floor(j/columns);if((sameRow&&Math.abs(i-j)===1)||Math.abs(i-j)===columns)count++;}}return count;}

export function buildBoard(level:number,seed:string,columns=4){
  const config=MEMORY_LEVELS_V2[level-1]; const assets=selectAssets(level,config.pairs,seed); let fallback:number[]=[];
  for(let attempt=0;attempt<8;attempt++){
    const rng=seededRandom(`${seed}:layout:${attempt}`); const order=assets.flatMap((_,pairId)=>[pairId,pairId]);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    fallback=order;if(adjacentPairCount(order,columns)<=Math.max(1,Math.floor(config.pairs*.22)))break;
  }
  return fallback.map((pairId,index)=>({id:`${seed}-${index}`,pairId,asset:assets[pairId],matched:false,open:false}));
}

export function calculateMemoryScore(level:number,moves:number,comboBonus:number,elapsedMs:number,mode:MemoryMode){
  const config=MEMORY_LEVELS_V2[level-1]; const base=level*150+config.pairs*90; const efficiency=Math.max(0,(config.pairs*2-moves)*18); const timeBonus=mode==='timed'?Math.max(0,Math.round((config.timedSeconds-elapsedMs/1000)*8)):0;
  return {base,efficiency,comboBonus:Math.min(comboBonus,config.pairs*24),timeBonus,total:base+efficiency+Math.min(comboBonus,config.pairs*24)+timeBonus};
}

export function calculateStars(level:number,moves:number,completed=true){const c=MEMORY_LEVELS_V2[level-1];if(!completed)return 0;if(moves<=c.threeStarMoves)return 3;if(moves<=c.twoStarMoves)return 2;return 1;}

