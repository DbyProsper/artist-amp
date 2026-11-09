export type MemoryCollection = 'studio' | 'instruments' | 'backstage' | 'cosmic';
export type MemoryAsset = { id: string; path: string; collection: MemoryCollection; description: string; similarity: string[] };

const definitions: Array<[MemoryCollection, string, string, string[]]> = [
  ['studio','condenser-microphone','Condenser microphone',['microphone','studio']],['studio','dynamic-microphone','Dynamic microphone',['microphone','studio']],['studio','over-ear-headphones','Over-ear headphones',['listening','studio']],['studio','studio-monitor','Studio monitor speaker',['speaker','studio']],
  ['studio','mixing-console','Mixing console',['controls','studio']],['studio','audio-interface','Audio interface',['controls','studio']],['studio','midi-pad-controller','MIDI pad controller',['controls','pads']],['studio','drum-machine','Drum machine',['controls','pads']],
  ['studio','reel-to-reel-recorder','Reel-to-reel recorder',['recording','disc']],['studio','turntable','Turntable',['recording','disc']],['studio','portable-recorder','Portable recorder',['recording','studio']],['studio','synthesiser-module','Synthesiser module',['controls','synth']],
  ['instruments','acoustic-guitar','Acoustic guitar',['guitar','strings']],['instruments','electric-guitar','Electric guitar',['guitar','strings']],['instruments','bass-guitar','Bass guitar',['guitar','strings']],['instruments','keyboard','Keyboard',['keys','instrument']],
  ['instruments','grand-piano','Grand piano',['keys','instrument']],['instruments','drum-kit','Drum kit',['drum','percussion']],['instruments','saxophone','Saxophone',['brass','instrument']],['instruments','trumpet','Trumpet',['brass','instrument']],
  ['instruments','violin','Violin',['strings','instrument']],['instruments','hand-drum','Hand drum',['drum','percussion']],['instruments','marimba','Marimba',['keys','percussion']],['instruments','accordion','Accordion',['keys','instrument']],
  ['backstage','vocalist','Vocalist at a microphone',['performance','person']],['backstage','dj-booth','DJ booth',['performance','controls']],['backstage','concert-stage','Concert stage',['performance','venue']],['backstage','stage-light-rig','Stage-light rig',['performance','lighting']],
  ['backstage','backstage-pass','Backstage pass',['access','backstage']],['backstage','flight-case','Flight case',['equipment','backstage']],['backstage','pedalboard','Pedalboard',['equipment','controls']],['backstage','festival-crowd','Festival crowd',['performance','crowd']],
  ['backstage','rehearsal-room','Rehearsal room',['venue','backstage']],['backstage','acoustic-performance','Acoustic performance',['performance','guitar']],['backstage','recording-booth','Recording booth',['venue','studio']],['backstage','merchandise-stand','Merchandise stand',['venue','backstage']],
  ['cosmic','musical-planet','Ringed musical planet',['space','orbit']],['cosmic','gold-record','Floating gold record',['space','disc']],['cosmic','crystal-microphone','Crystal microphone',['space','microphone']],['cosmic','orbital-headphones','Orbital headphones',['space','listening']],
  ['cosmic','meteor-drum','Meteor drum',['space','drum']],['cosmic','holographic-cassette','Holographic cassette',['space','recording']],['cosmic','nebula-guitar','Nebula guitar',['space','guitar']],['cosmic','cosmic-keyboard','Cosmic keyboard',['space','keys']],
  ['cosmic','satellite-speaker','Satellite speaker',['space','speaker']],['cosmic','star-synthesiser','Star-shaped synthesiser',['space','synth']],['cosmic','lunar-turntable','Lunar turntable',['space','disc']],['cosmic','music-note-crystal','Glowing music-note crystal',['space','crystal']],
];

export const MEMORY_ASSETS: MemoryAsset[] = definitions.map(([collection,id,description,similarity]) => ({
  id: `${collection}-${id}`,
  path: `/assets/games/memory-heist/cards/${collection}/${id}.svg`,
  collection,
  description,
  similarity,
}));

export const MEMORY_THEMES = {
  'neon-vault': { name: 'Neon Vault', description: 'High-tech studio security with crisp neon edges.', background: '/assets/games/memory-heist/backgrounds/neon-vault.png', preview: '/assets/games/memory-heist/backgrounds/neon-vault.png', back: '/assets/games/memory-heist/card-backs/neon-vault.svg' },
  'backstage-pass': { name: 'Backstage Pass', description: 'Warm concert energy and backstage atmosphere.', background: '/assets/games/memory-heist/backgrounds/backstage-pass.png', preview: '/assets/games/memory-heist/backgrounds/backstage-pass.png', back: '/assets/games/memory-heist/card-backs/backstage-pass.svg' },
  'cosmic-archive': { name: 'Cosmic Archive', description: 'Ringed planets and rare musical artefacts.', background: '/assets/games/memory-heist/backgrounds/cosmic-archive.png', preview: '/assets/games/memory-heist/backgrounds/cosmic-archive.png', back: '/assets/games/memory-heist/card-backs/cosmic-archive.svg' },
} as const;

export type MemoryTheme = keyof typeof MEMORY_THEMES;

