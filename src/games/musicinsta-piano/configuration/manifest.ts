export type PianoTheme = 'cosmic-keys' | 'neon-studio' | 'jozi-nights';
export type PianoDifficulty = 'learn' | 'easy' | 'normal' | 'hard' | 'expert';

export interface PianoTrack {
  id: string; title: string; direction: string; bpm: number; duration: number; key: string;
  cover: string; audio: string; difficulties: PianoDifficulty[]; chartVersion: string;
}

export const PIANO_THEMES: Array<{id:PianoTheme;name:string;background:string;preview:string}> = [
  {id:'cosmic-keys',name:'Cosmic Keys',background:'/assets/games/musicinsta-piano/backgrounds/cosmic-keys.jpg',preview:'/assets/games/musicinsta-piano/theme-previews/cosmic-keys.jpg'},
  {id:'neon-studio',name:'Neon Studio',background:'/assets/games/musicinsta-piano/backgrounds/neon-studio.jpg',preview:'/assets/games/musicinsta-piano/theme-previews/neon-studio.jpg'},
  {id:'jozi-nights',name:'Jozi Nights',background:'/assets/games/musicinsta-piano/backgrounds/jozi-nights.jpg',preview:'/assets/games/musicinsta-piano/theme-previews/jozi-nights.jpg'},
];

export const PIANO_TRACKS:PianoTrack[] = [
  {id:'keys-at-full-tilt',title:'Keys at Full Tilt',direction:'A slightly more challenging precision track with its essential notes retained',bpm:120,duration:160,key:'Dynamic',cover:'/assets/games/musicinsta-piano/song-covers/keys-at-full-tilt.png',audio:'/assets/games/musicinsta-piano/audio/keys-at-full-tilt/keys-at-full-tilt.mp3',difficulties:['normal','hard','expert'],chartVersion:'2.1.0'},
  {id:'first-light',title:'First Light',direction:'Gentle introductory piano',bpm:82,duration:66,key:'C major',cover:'/assets/games/musicinsta-piano/song-covers/first-light.jpg',audio:'/assets/games/musicinsta-piano/audio/first-light/backing.wav',difficulties:['learn','easy','normal','hard'],chartVersion:'1.0.0'},
  {id:'midnight-orbit',title:'Midnight Orbit',direction:'Atmospheric cinematic groove',bpm:92,duration:72,key:'A minor',cover:'/assets/games/musicinsta-piano/song-covers/midnight-orbit.jpg',audio:'/assets/games/musicinsta-piano/audio/midnight-orbit/backing.wav',difficulties:['easy','normal','hard'],chartVersion:'1.0.0'},
  {id:'campus-afterglow',title:'Campus Afterglow',direction:'Warm R&B-inspired piano',bpm:76,duration:70,key:'E♭ major',cover:'/assets/games/musicinsta-piano/song-covers/campus-afterglow.jpg',audio:'/assets/games/musicinsta-piano/audio/campus-afterglow/backing.wav',difficulties:['easy','normal','hard'],chartVersion:'1.0.0'},
  {id:'jozi-pulse',title:'Jozi Pulse',direction:'Amapiano-inspired rhythm and piano',bpm:112,duration:72,key:'F minor',cover:'/assets/games/musicinsta-piano/song-covers/jozi-pulse.jpg',audio:'/assets/games/musicinsta-piano/audio/jozi-pulse/backing.wav',difficulties:['easy','normal','hard','expert'],chartVersion:'1.0.0'},
  {id:'velvet-keys',title:'Velvet Keys',direction:'Afro House-inspired progression',bpm:118,duration:72,key:'D minor',cover:'/assets/games/musicinsta-piano/song-covers/velvet-keys.jpg',audio:'/assets/games/musicinsta-piano/audio/velvet-keys/backing.wav',difficulties:['easy','normal','hard'],chartVersion:'1.0.0'},
  {id:'starlight-finale',title:'Starlight Finale',direction:'Energetic advanced piano',bpm:126,duration:76,key:'G minor',cover:'/assets/games/musicinsta-piano/song-covers/starlight-finale.jpg',audio:'/assets/games/musicinsta-piano/audio/starlight-finale/backing.wav',difficulties:['easy','normal','hard','expert'],chartVersion:'1.0.0'},
];

export const PIANO_ASSET_MANIFEST = {
  id:'musicinsta-piano', version:'1.0.0', logo:'/assets/games/musicinsta-piano/brand/musicinsta-logo.png',
  symbol:'/assets/games/musicinsta-piano/brand/musicinsta-symbol.png', cover:'/assets/games/musicinsta-piano/ui/game-cover.jpg',
  themes:PIANO_THEMES, tracks:PIANO_TRACKS,
  provenance:'Original MusicInsta artwork generated for this project; original programmatic compositions rendered with the project custom synthesizer. No third-party samples.',
} as const;
