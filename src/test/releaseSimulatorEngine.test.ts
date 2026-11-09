import { describe,expect,it } from 'vitest';
import { RELEASE_CAMPAIGNS_V2,actionAvailability,applyReleaseAction,initialReleaseState,releaseScore } from '@/lib/games/releaseSimulatorEngine';

describe('Release Day Simulator v2',()=>{
  it('provides six differentiated campaigns with sufficient authored depth',()=>{
    expect(RELEASE_CAMPAIGNS_V2).toHaveLength(6);
    expect(new Set(RELEASE_CAMPAIGNS_V2.map(item=>item.workspace)).size).toBe(6);
    for(const campaign of RELEASE_CAMPAIGNS_V2){expect(campaign.actions.length).toBeGreaterThanOrEqual(12);expect(campaign.events.length).toBeGreaterThanOrEqual(8);expect(campaign.scenes).toHaveLength(4);}
  });
  it('replays the same action log deterministically for the same seed',()=>{
    const campaign=RELEASE_CAMPAIGNS_V2[1];
    const play=()=>campaign.actions.slice(0,5).reduce((state,action)=>applyReleaseAction(state,action,campaign),initialReleaseState(campaign,'professional','core','stable-seed'));
    expect(play()).toEqual(play());
  });
  it('rejects actions that overspend available cash',()=>{
    const campaign=RELEASE_CAMPAIGNS_V2[0];const state=initialReleaseState(campaign,'expert','core','cash-seed');state.cashCents=0;
    expect(()=>applyReleaseAction(state,campaign.actions.find(action=>action.costCents>0)!,campaign)).toThrow(/cash/i);
  });
  it('keeps score components normalized and distinct from reward points',()=>{
    const campaign=RELEASE_CAMPAIGNS_V2[2];const state=campaign.actions.slice(0,6).reduce((current,action)=>applyReleaseAction(current,action,campaign),initialReleaseState(campaign,'starter','replay','score-seed'));const result=releaseScore(state,campaign);
    expect(result.score).toBeGreaterThanOrEqual(0);expect(result.score).toBeLessThanOrEqual(100);expect(result.stars).toBeGreaterThanOrEqual(1);expect(result.stars).toBeLessThanOrEqual(3);
  });
  it('keeps every difficulty and replay variant playable to a terminal result',()=>{
    for(const campaign of RELEASE_CAMPAIGNS_V2)for(const difficulty of ['starter','professional','expert'] as const)for(const variant of ['core','replay'] as const){
      let state=initialReleaseState(campaign,difficulty,variant,`${campaign.id}-${difficulty}-${variant}`);
      while(state.status==='planning'){
        const action=campaign.actions.filter(item=>!actionAvailability(state,item)).sort((a,b)=>(b.readiness+b.planning+b.trust)-(a.readiness+a.planning+a.trust))[0];
        expect(action,`${campaign.id} ${difficulty} ${variant} has no valid action at turn ${state.turn}`).toBeTruthy();
        state=applyReleaseAction(state,action,campaign);
      }
      const result=releaseScore(state,campaign);
      expect(result.score).toBeGreaterThanOrEqual(0);expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});
