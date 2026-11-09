import { describe, expect, it } from 'vitest';
import { buildBoard, calculateStars, MEMORY_LEVELS_V2 } from '@/lib/games/memoryHeistEngine';
import { MEMORY_ASSETS } from '@/lib/games/memoryHeistAssets';

describe('Memory Heist engine',()=>{
  it('ships 24 centrally configured levels and 48 stable assets',()=>{expect(MEMORY_LEVELS_V2).toHaveLength(24);expect(MEMORY_LEVELS_V2[0].pairs).toBe(4);expect(MEMORY_LEVELS_V2[23].pairs).toBe(15);expect(MEMORY_ASSETS).toHaveLength(48);expect(new Set(MEMORY_ASSETS.map(x=>x.id)).size).toBe(48);});
  it('generates exactly two copies of every selected pair',()=>{const board=buildBoard(24,'test-seed',5);expect(board).toHaveLength(30);const counts=new Map<number,number>();board.forEach(tile=>counts.set(tile.pairId,(counts.get(tile.pairId)||0)+1));expect([...counts.values()].every(x=>x===2)).toBe(true);});
  it('is deterministic but varies by seed',()=>{expect(buildBoard(12,'same').map(x=>x.pairId)).toEqual(buildBoard(12,'same').map(x=>x.pairId));expect(buildBoard(12,'same').map(x=>x.pairId)).not.toEqual(buildBoard(12,'different').map(x=>x.pairId));});
  it('awards transparent stars from move targets',()=>{expect(calculateStars(1,4)).toBe(3);expect(calculateStars(1,5)).toBe(2);expect(calculateStars(1,20)).toBe(1);});
});
