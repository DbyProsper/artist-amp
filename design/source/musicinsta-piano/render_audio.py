"""Render MusicInsta Piano's original backing-only arrangements.

The playable piano line is deliberately absent. It is synthesised by the browser
only when the player hits a chart event, preventing doubled melody.
Uses only Python's standard library; no third-party samples or licences.
"""
from __future__ import annotations
import json, math, random, struct, wave
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=ROOT/'public'/'assets'/'games'/'musicinsta-piano'/'audio'
SR=22050

def hz(midi:int)->float:return 440.0*2**((midi-69)/12)
def env(t:float,length:float,attack=.02,release=.2)->float:
    return min(1,t/attack,max(0,(length-t)/release))
def render(track:dict)->None:
    random.seed(track['id']); duration=track['duration']; total=int(duration*SR); data=[0.0]*total
    beat=60/track['bpm']; root=track['root']; prog=track['progression']; style=track['style']
    # Warm chord pads create sections and leave the interactive piano melody open.
    for bar,start in enumerate([i*beat*4 for i in range(math.ceil(duration/(beat*4)))]):
        degree=prog[bar%len(prog)]; chord=[root+degree,root+degree+7,root+degree+12]
        section=min(3,int(start/max(1,duration/4))); pad_gain=[.08,.11,.13,.09][section]
        for note in chord:
            f=hz(note); length=min(beat*3.8,duration-start)
            for j in range(int(length*SR)):
                i=int(start*SR)+j
                if i>=total:break
                t=j/SR; shimmer=math.sin(2*math.pi*f*t)+.28*math.sin(2*math.pi*f*2*t)
                data[i]+=pad_gain*env(t,length,.15,.5)*shimmer
        # Bass foundation, deliberately not charted.
        for b in (0,2):
            st=start+b*beat; length=beat*.72; f=hz(root+degree-12)
            for j in range(int(length*SR)):
                i=int(st*SR)+j
                if i>=total:break
                t=j/SR; data[i]+=.13*env(t,length,.008,.15)*math.sin(2*math.pi*f*t)*(1-t/length*.45)
    # Original rhythmic bed: soft kick, hat and genre-specific log-drum pulse.
    steps=math.ceil(duration/(beat/2))
    for step in range(steps):
        st=step*beat/2
        if step%2==0:
            length=.18
            for j in range(int(length*SR)):
                i=int(st*SR)+j
                if i>=total:break
                t=j/SR; data[i]+=.22*math.exp(-t*24)*math.sin(2*math.pi*(68-30*t)*t)
        if step%2 or style in ('amapiano','afro-house','finale'):
            length=.045
            for j in range(int(length*SR)):
                i=int(st*SR)+j
                if i>=total:break
                data[i]+=.045*(random.random()*2-1)*math.exp(-(j/SR)*70)
        if style=='amapiano' and step%4==3:
            f=hz(root-12);length=.35
            for j in range(int(length*SR)):
                i=int(st*SR)+j
                if i>=total:break
                t=j/SR;data[i]+=.16*math.exp(-t*7)*math.sin(2*math.pi*f*t)
    peak=max(1e-9,max(abs(v) for v in data));scale=.84/peak
    target=OUT/track['id'];target.mkdir(parents=True,exist_ok=True)
    with wave.open(str(target/'backing.wav'),'wb') as w:
        w.setparams((1,2,SR,total,'NONE','not compressed'))
        block=bytearray()
        for value in data:block.extend(struct.pack('<h',max(-32767,min(32767,int(value*scale*32767)))))
        w.writeframes(block)
    print(track['id'],duration,'seconds')

if __name__=='__main__':
    tracks=json.loads((HERE/'compositions.json').read_text(encoding='utf-8'))
    for item in tracks:render(item)
