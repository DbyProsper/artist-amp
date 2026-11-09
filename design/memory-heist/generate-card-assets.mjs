import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from 'lucide-react';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const items = [
  ['studio','condenser-microphone','Mic2'],['studio','dynamic-microphone','MicVocal'],['studio','over-ear-headphones','Headphones'],['studio','studio-monitor','Speaker'],
  ['studio','mixing-console','SlidersHorizontal'],['studio','audio-interface','AudioWaveform'],['studio','midi-pad-controller','Grid3X3'],['studio','drum-machine','DiscAlbum'],
  ['studio','reel-to-reel-recorder','Reel'],['studio','turntable','Disc3'],['studio','portable-recorder','Radio'],['studio','synthesiser-module','CircuitBoard'],
  ['instruments','acoustic-guitar','Guitar'],['instruments','electric-guitar','Zap'],['instruments','bass-guitar','AudioLines'],['instruments','keyboard','Piano'],
  ['instruments','grand-piano','Music'],['instruments','drum-kit','Drum'],['instruments','saxophone','Music2'],['instruments','trumpet','Megaphone'],
  ['instruments','violin','Music3'],['instruments','hand-drum','CircleDot'],['instruments','marimba','PanelTop'],['instruments','accordion','Rows3'],
  ['backstage','vocalist','MicVocal'],['backstage','dj-booth','Disc3'],['backstage','concert-stage','Presentation'],['backstage','stage-light-rig','Spotlight'],
  ['backstage','backstage-pass','Badge'],['backstage','flight-case','BriefcaseBusiness'],['backstage','pedalboard','PanelsTopLeft'],['backstage','festival-crowd','Users'],
  ['backstage','rehearsal-room','Warehouse'],['backstage','acoustic-performance','Guitar'],['backstage','recording-booth','DoorOpen'],['backstage','merchandise-stand','Shirt'],
  ['cosmic','musical-planet','Orbit'],['cosmic','gold-record','DiscAlbum'],['cosmic','crystal-microphone','Gem'],['cosmic','orbital-headphones','Headphones'],
  ['cosmic','meteor-drum','CircleDotDashed'],['cosmic','holographic-cassette','CassetteTape'],['cosmic','nebula-guitar','Guitar'],['cosmic','cosmic-keyboard','Piano'],
  ['cosmic','satellite-speaker','Satellite'],['cosmic','star-synthesiser','Sparkles'],['cosmic','lunar-turntable','MoonStar'],['cosmic','music-note-crystal','BadgeMusic'],
];

const palettes = {
  studio: ['#090614','#24103d','#f32f9b','#9b5cff'], instruments: ['#14070d','#4b1734','#ffb12e','#f32f9b'],
  backstage: ['#10090b','#40192a','#ff7a2f','#b82cff'], cosmic: ['#060717','#172559','#8d49ff','#ff4db8'],
};

for (const [index, [collection, id, iconName]] of items.entries()) {
  const palette = palettes[collection];
  const Icon = Icons[iconName] || Icons.Music2;
  const markup = renderToStaticMarkup(createElement(Icon, { x: 128, y: 128, width: 256, height: 256, strokeWidth: 1.55, color: '#fff7ff' }))
    .replace(/^<svg[^>]*>/, '').replace('</svg>', '');
  const rings = Array.from({ length: 4 }, (_, ring) => `<circle cx="${80 + ((index * 53 + ring * 91) % 360)}" cy="${65 + ((index * 71 + ring * 47) % 380)}" r="${8 + ring * 5}" fill="none" stroke="${palette[3]}" opacity="${0.12 + ring * .04}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset=".62" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect width="512" height="512" rx="58" fill="url(#g)"/><path d="M0 ${360 + index % 5 * 12} Q180 ${300 - index % 7 * 8} 512 ${390 + index % 3 * 18}V512H0Z" fill="${palette[0]}" opacity=".72"/>${rings}
  <circle cx="256" cy="256" r="153" fill="${palette[2]}" opacity=".13" filter="url(#glow)"/><g transform="translate(128 128) scale(10.6667)" filter="url(#glow)" fill="none" stroke="#fff7ff" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${markup}</g>
  <path d="M92 430h${112 + index % 6 * 30}" stroke="${palette[3]}" stroke-width="8" stroke-linecap="round" opacity=".8"/><circle cx="420" cy="90" r="12" fill="${palette[2]}"/></svg>`;
  const out = resolve('public/assets/games/memory-heist/cards', collection, `${id}.svg`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, svg);
}

const backs = [
  ['neon-vault','#080510','#ef3b9c','#813cff'],['backstage-pass','#13080b','#ff8b33','#d32fff'],['cosmic-archive','#050718','#7c4dff','#ff42b3'],
];
for (const [id,bg,a,b] of backs) {
  await writeFile(resolve(`public/assets/games/memory-heist/card-backs/${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="g"><stop stop-color="${b}"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs><rect width="512" height="512" rx="58" fill="url(#g)"/><circle cx="256" cy="256" r="130" fill="none" stroke="${a}" stroke-width="14" opacity=".85"/><ellipse cx="256" cy="256" rx="190" ry="62" fill="none" stroke="${b}" stroke-width="15" transform="rotate(-16 256 256)"/><path d="M235 165v152c-17-10-52-5-58 20-7 28 31 42 58 20 10-8 13-20 13-33V220l86-18v83c-19-9-52-3-57 21-5 28 34 40 60 17 8-8 11-18 11-30V145Z" fill="${a}" stroke="#fff" stroke-width="5"/></svg>`);
}

await writeFile(resolve('public/assets/games/memory-heist/effects/sparkle.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#ff4db8" d="M32 2l7 23 23 7-23 7-7 23-7-23-23-7 23-7z"/></svg>');
await writeFile(resolve('public/assets/games/memory-heist/effects/party-popper.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#ff3b9e" d="M10 54l11-34 23 23z"/><path fill="#ffd43b" d="M31 12l4-10 4 10-4 9zM49 22l12-3-8 10z"/><path fill="#9b5cff" d="M45 8c9 5 10 10 4 16l-4-4c3-3 2-5-3-8z"/></svg>');
console.log(`Generated ${items.length} card faces, 3 card backs and 2 effects.`);
