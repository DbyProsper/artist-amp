import type { PianoDifficulty, PianoTrack } from '../configuration/manifest';
import keysAtFullTiltChart from './keys_at_full_tilt_chart.json';

export type PianoNoteType='tap'|'hold'|'chord';
export interface PianoNote {id:string;lane:0|1|2|3;time:number;duration:number;type:PianoNoteType;pitch:number;}

const DENSITY:Record<PianoDifficulty,number>={learn:4,easy:3,normal:2,hard:1,expert:1};
const SEED_LANES=[[0,1,2,3],[0,2,1,3],[1,0,3,2],[2,1,3,0],[0,3,1,2],[3,1,2,0]] as const;

export function generatePianoChart(track:PianoTrack,difficulty:PianoDifficulty):PianoNote[]{
  if(track.id==='keys-at-full-tilt'){
    const raw=(keysAtFullTiltChart as Array<{id:string;lane:number;timestampMs:number;durationMs?:number;type:'TAP'|'HOLD'|'CHORD'}>).map((note,index)=>({
      id:note.id,lane:note.lane as 0|1|2|3,time:note.timestampMs/1000,duration:(note.durationMs||0)/1000,type:note.type.toLowerCase() as PianoNoteType,pitch:60+note.lane*3+(index%2),
    }));
    // Retain the musical anchors without reproducing every transcription event.
    // Normal presents one note at a time; harder modes permit limited chords.
    const spacing=difficulty==='normal'?.34:difficulty==='hard'?.25:.19;
    const simultaneous=difficulty==='normal'?1:2;
    const imported:PianoNote[]=[];let lastAccepted=-10;let group='';let groupCount=0;
    for(const note of raw){const key=note.time.toFixed(3);if(key!==group){group=key;groupCount=0;}if(groupCount>=simultaneous)continue;if(note.time-lastAccepted<spacing&&groupCount===0)continue;imported.push({...note,type:simultaneous===1&&note.type==='chord'?'tap':note.type,duration:Math.min(note.duration,1.4)});groupCount++;lastAccepted=note.time;}
    for(let lane=0;lane<4;lane++){
      const laneNotes=imported.filter(note=>note.lane===lane).sort((a,b)=>a.time-b.time);
      laneNotes.forEach((note,index)=>{const next=laneNotes[index+1];if(next&&note.duration&&note.time+note.duration>next.time-.05)note.duration=Math.max(.05,next.time-note.time-.05);});
    }
    return imported;
  }
  const beat=60/track.bpm, step=beat*(difficulty==='expert'?.5:1), density=DENSITY[difficulty];
  const lanes=SEED_LANES[Math.max(0,Number(track.id.length)%SEED_LANES.length)]; const notes:PianoNote[]=[]; const lastEnd=[-1,-1,-1,-1]; let index=0;
  for(let t=4;t<track.duration-2;t+=step){
    if(index%density!==0 && difficulty!=='hard'&&difficulty!=='expert'){index++;continue;}
    if(Math.floor(t/(beat*8))%4===3 && index%3===0){index++;continue;}
    const lane=lanes[(index+Math.floor(t/(beat*8)))%4] as 0|1|2|3;
    const hold=(difficulty!=='learn'&&index%(difficulty==='easy'?16:12)===7);
    const chord=(['normal','hard','expert'].includes(difficulty)&&index%(difficulty==='expert'?10:14)===8);
    const time=Number(t.toFixed(3)),duration=hold?Number((beat*1.5).toFixed(3)):0,other=((lane+2)%4) as 0|1|2|3;
    if(time>=lastEnd[lane]&&(!chord||time>=lastEnd[other])){notes.push({id:`${track.id}-${difficulty}-${index}-a`,lane,time,duration,type:hold?'hold':chord?'chord':'tap',pitch:60+lane*2+(index%3)});lastEnd[lane]=time+Math.max(duration,.18);if(chord){notes.push({id:`${track.id}-${difficulty}-${index}-b`,lane:other,time,duration:0,type:'chord',pitch:67+other});lastEnd[other]=time+.18;}}
    index++;
  }
  return notes;
}

export function validatePianoChart(notes:PianoNote[]){
  const errors:string[]=[]; const lanes=[0,1,2,3].map(l=>notes.filter(n=>n.lane===l).sort((a,b)=>a.time-b.time));
  lanes.forEach((lane,laneIndex)=>lane.forEach((note,index)=>{const next=lane[index+1];if(next&&next.time<note.time+Math.max(note.duration,.05))errors.push(`Lane ${laneIndex} overlaps at ${note.time}`);}));
  const byTime=new Map<string,number>();notes.forEach(n=>{const key=n.time.toFixed(3);byTime.set(key,(byTime.get(key)||0)+1);});
  byTime.forEach((count,time)=>{if(count>4)errors.push(`${count} simultaneous notes at ${time}`);});
  if(new Set(notes.map(n=>n.id)).size!==notes.length)errors.push('Duplicate note IDs');
  return errors;
}
