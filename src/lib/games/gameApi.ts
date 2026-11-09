import { auth } from '@/lib/firebase';
import { API_BASE } from '@/config/api';

async function gameRequest<T>(path:string, body?:unknown, method?:'GET'|'POST'|'PATCH'):Promise<T>{
  const token=await auth.currentUser?.getIdToken();
  if(!token) throw new Error('Sign in to save progress and earn verified rewards.');
  const response=await fetch(`${API_BASE}${path}`,{method:method || (body?'POST':'GET'),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!response.ok) throw new Error((await response.json().catch(()=>null))?.detail?.message || 'Reward verification is temporarily unavailable.');
  return response.json();
}
export interface GameProgress { unlocked:number;best:number;completed?:number[];starsByLevel?:Record<string,number>;bestByMode?:Record<string,number> }
export interface GamePreferences { flappyEnvironment?:'cosmic-groove'|'neon-studio'|'jozi-skyline';flappySound?:boolean;memoryTheme?:'neon-vault'|'backstage-pass'|'cosmic-archive';memorySound?:boolean }
export interface GameProfile { points:number; progress:Record<string,GameProgress>; promotionalCredits:{images:number;beats:number;fullSongs:number}; claimedMilestones:number[]; preferences?:GamePreferences; }
export const getGameProfile=()=>gameRequest<GameProfile>('/games/profile');
export const createGameSession=(game:string,level:number,seed:string,mode='ranked')=>gameRequest<{sessionId:string;seed:string;rulesetVersion?:string}>('/games/session',{game,level,seed,mode});
export const submitGameResult=(payload:Record<string,unknown>)=>gameRequest<{verified:boolean;pointsAwarded:number;profile:GameProfile;milestones:Array<{points:number;kind:string;amount:number}>}>('/games/result',payload);
export const saveGamePreferences=(preferences:Partial<GamePreferences>)=>gameRequest<{preferences:GamePreferences}>('/games/profile/preferences',preferences,'PATCH');
