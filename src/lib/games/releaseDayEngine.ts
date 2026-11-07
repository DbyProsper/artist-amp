export interface ReleaseState { budget: number; energy: number; readiness: number; interest: number; trust: number; turn: number; history: Array<{ situation: string; choice: string; outcome: string }>; }
export interface ReleaseChoice { id: string; label: string; detail: string; cost: number; energy: number; readiness: number; interest: number; trust: number; delayed?: Partial<ReleaseState>; }
export interface ReleaseEvent { id: string; title: string; body: string; choices: ReleaseChoice[]; }

const events: ReleaseEvent[] = [
  { id:'art', title:'Artwork or awareness?', body:'Your visual identity needs attention, but the promotional budget is limited.', choices:[
    {id:'affordable',label:'Commission an affordable local designer',detail:'Clear brief, fair smaller fee, more budget remains.',cost:700,energy:-5,readiness:12,interest:5,trust:5},
    {id:'promo',label:'Use a clean template and fund targeted promotion',detail:'Faster, but the visual concept may be less distinctive.',cost:350,energy:-3,readiness:7,interest:11,trust:0},
    {id:'diy',label:'Create it yourself',detail:'Save cash and spend more time learning the tools.',cost:0,energy:-12,readiness:5,interest:2,trust:1}]},
  { id:'transport', title:'Studio timing and transport', body:'The preferred session ends after your reliable transport window.', choices:[
    {id:'reschedule',label:'Book an earlier session',detail:'Less studio time, but safer and more predictable.',cost:450,energy:-5,readiness:9,interest:0,trust:3},
    {id:'ride',label:'Budget for a safe ride home',detail:'Keep the full session and protect tomorrow’s energy.',cost:800,energy:-2,readiness:14,interest:0,trust:2},
    {id:'remote',label:'Finish edits remotely',detail:'Flexible, but requires careful file preparation.',cost:120,energy:-9,readiness:8,interest:0,trust:1}]},
  { id:'data', title:'Mobile data plan', body:'Your release assets are large and followers use different data plans.', choices:[
    {id:'schedule',label:'Compress and schedule content on Wi-Fi',detail:'Preparation reduces last-minute data use.',cost:100,energy:-7,readiness:8,interest:9,trust:4},
    {id:'download',label:'Prepare a small downloadable media pack',detail:'Useful for collaborators, radio and campus pages.',cost:250,energy:-9,readiness:10,interest:7,trust:5},
    {id:'live',label:'Upload everything live on release day',detail:'Less preparation, higher connectivity risk.',cost:300,energy:-4,readiness:-5,interest:5,trust:-2}]},
  { id:'channels', title:'Choose the message', body:'You can focus on WhatsApp Status, short videos, campus networks, community radio or local events.', choices:[
    {id:'language',label:'Code-switch with audience context',detail:'Use English plus isiXhosa or isiZulu where it feels natural.',cost:300,energy:-8,readiness:3,interest:12,trust:8},
    {id:'radio',label:'Prepare a community radio pitch',detail:'A clear radio edit and respectful introduction take time.',cost:200,energy:-10,readiness:7,interest:9,trust:7},
    {id:'shorts',label:'Create three short performance clips',detail:'Consistent visuals, no guaranteed virality.',cost:500,energy:-11,readiness:2,interest:14,trust:3}]},
  { id:'late', title:'A collaborator is late', body:'A promised vocal or production file has not arrived by the agreed check-in.', choices:[
    {id:'talk',label:'Check in respectfully and agree a final deadline',detail:'Protects the relationship and makes the risk visible.',cost:0,energy:-5,readiness:3,interest:0,trust:9},
    {id:'backup',label:'Prepare a version without the missing part',detail:'More work, but the release has a safe fallback.',cost:250,energy:-12,readiness:12,interest:-1,trust:2},
    {id:'blame',label:'Call them out publicly',detail:'Fast pressure can damage trust and future collaboration.',cost:0,energy:-4,readiness:-3,interest:3,trust:-14}]},
  { id:'streams', title:'Guaranteed streams?', body:'A message offers thousands of “guaranteed” streams for an urgent payment.', choices:[
    {id:'decline',label:'Decline and document the offer',detail:'Protect the release and spend on accountable activity.',cost:0,energy:-2,readiness:3,interest:1,trust:12},
    {id:'verify',label:'Ask for transparent methods and references',detail:'Due diligence without committing funds.',cost:0,energy:-5,readiness:2,interest:0,trust:6},
    {id:'buy',label:'Pay for the guarantee',detail:'The number may rise, but credibility and platform safety are at risk.',cost:1500,energy:-2,readiness:0,interest:8,trust:-20}]},
  { id:'final', title:'Release-day readiness', body:'The mix, credits, permissions and agreed ownership need one final check. This is gameplay guidance, not legal advice.', choices:[
    {id:'check',label:'Run the checklist and release on time',detail:'Confirm credits, files, links and collaborator approval.',cost:100,energy:-8,readiness:16,interest:5,trust:10},
    {id:'postpone',label:'Postpone briefly to fix a real problem',detail:'A clear explanation can protect fan trust.',cost:250,energy:-6,readiness:20,interest:-5,trust:8},
    {id:'rush',label:'Release now and fix details later',detail:'Keeps the date, but unresolved issues can compound.',cost:0,energy:-2,readiness:-12,interest:7,trust:-10}]},
  { id:'power', title:'Connectivity interruption', body:'An occasional electricity or connectivity disruption affects the final upload window.', choices:[
    {id:'backup',label:'Use the prepared offline pack and scheduled posts',detail:'Preparation keeps the campaign moving.',cost:100,energy:-3,readiness:8,interest:6,trust:4},
    {id:'communicate',label:'Update fans and move the premiere',detail:'Honest communication protects expectations.',cost:0,energy:-4,readiness:2,interest:-2,trust:8}]},
];

function hash(seed:string){ let h=2166136261; for(const c of seed){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
export function campaignEvents(seed:string, level:number){ const base=events.slice(0,7); if(level>1) base.splice(3,0,events[7]); return base.map((_,i)=>base[(i+hash(seed)%base.length)%base.length]).slice(0,7); }
export function initialReleaseState(budget:number):ReleaseState { return {budget,energy:100,readiness:25,interest:10,trust:50,turn:0,history:[]}; }
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function applyReleaseChoice(state:ReleaseState,event:ReleaseEvent,choice:ReleaseChoice):ReleaseState { return { budget:Math.max(0,state.budget-choice.cost), energy:clamp(state.energy+choice.energy), readiness:clamp(state.readiness+choice.readiness), interest:clamp(state.interest+choice.interest), trust:clamp(state.trust+choice.trust), turn:state.turn+1, history:[...state.history,{situation:event.title,choice:choice.label,outcome:choice.detail}] }; }
export function releaseResult(state:ReleaseState){ const finance=Math.round(Math.min(100,(state.budget/50)+40)); const preparation=state.readiness; const audience=state.interest; const trust=state.trust; const adaptability=Math.round((state.energy+state.readiness)/2); const score=Math.round(finance*.2+preparation*.25+audience*.2+trust*.2+adaptability*.15); return {score,components:{finance,preparation,audience,trust,adaptability},streams:Math.round(120+score*18+state.interest*9),turnout:Math.round(8+score*.45),income:Math.round(score*22),lessons:state.history.slice(-3).map(item=>`${item.situation}: ${item.outcome}`),suggestion: score>75?'Replay with a smaller budget and protect the same trust.':'Prepare earlier and choose options that strengthen readiness without exhausting your energy.'}; }
