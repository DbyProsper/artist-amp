import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Download, FolderOpen, Loader2, Mic, Pause, Play, Plus, Redo2, Save, Scissors, Send, SlidersHorizontal, Sparkles, Square, Trash2, Undo2, Upload, ZoomIn } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/context/FirebaseAuthContext';
import { API_BASE } from '@/config/api';
import { audioBufferToWavBlob, triggerDownload } from '@/features/audio-enhancement/api/audioEnhancerApi';
import { storeDawAudio, takeDawAudio } from '@/lib/dawTransfer';
import { deleteDawProject, getDawProject, listDawProjects, saveDawProject, type StoredDawProject } from '@/lib/dawProjects';
import { toast } from 'sonner';
import { generateBeats } from '@/lib/api';
import { DawMixerPopup } from '@/components/studio/DawMixerPopup';
import { DawEffects, defaultDawEffects, estimatePitch, nearestScaleCorrectionCents, normalizeDawEffects } from '@/lib/dawEffects';

interface DawTrack {
  id: string; name: string; buffer: AudioBuffer; sourceBlob: Blob; audioUrl?: string;
  gain: number; pan: number; muted: boolean; solo: boolean;
  offset: number; trimStart: number; length: number; color: string;
  eqLow: number; eqMid: number; eqHigh: number; delay: number; reverb: number;
  effects?: DawEffects;
  eqEnabled?: boolean; delayEnabled?: boolean; reverbEnabled?: boolean; compressorEnabled?: boolean;
  compressorAmount?: number; pitchEnabled?: boolean; pitchKey?: string; pitchScale?: string; pitchAmount?: number;
}
interface ProjectSummary { id: string; name: string; updatedAt: string; trackCount: number }
interface ActiveNodes { source: AudioBufferSourceNode; harmonySource?: AudioBufferSourceNode; gain: GainNode; pan: StereoPannerNode; eq: BiquadFilterNode[]; compressor: DynamicsCompressorNode; compressorWet: GainNode; delay: DelayNode; delayWet: GainNode; delayFeedback: GainNode; reverbWet: GainNode }

const TRACK_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];
const DRUMS = ['Kick', 'Snare', 'Hi-hat', 'Clap'] as const;
type DrumName = typeof DRUMS[number];
const MELODY_NOTES = [
  { name: 'A4', frequency: 440 },
  { name: 'G4', frequency: 392 },
  { name: 'E4', frequency: 329.63 },
  { name: 'D4', frequency: 293.66 },
  { name: 'C4', frequency: 261.63 },
] as const;
type MelodyName = typeof MELODY_NOTES[number]['name'];

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => withoutUndefined(item)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).map(([key, item]) => [key, withoutUndefined(item)])) as T;
  return value;
}

function Waveform({ buffer, color }: { buffer: AudioBuffer; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = 1000, height = 80;
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / width));
    context.clearRect(0, 0, width, height);
    context.strokeStyle = 'rgba(255,255,255,.92)'; context.lineWidth = 1.2; context.beginPath();
    for (let x = 0; x < width; x += 1) {
      let min = 1, max = -1;
      for (let index = x * step; index < Math.min(data.length, (x + 1) * step); index += 1) { min = Math.min(min, data[index]); max = Math.max(max, data[index]); }
      context.moveTo(x, (1 + min) * height / 2); context.lineTo(x, (1 + max) * height / 2);
    }
    context.stroke();
  }, [buffer, color]);
  return <canvas ref={canvasRef} className="h-full w-full" />;
}

function createImpulse(context: BaseAudioContext, seconds = 1.3, decay = 2.5, damping = .5) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    let filtered = 0;
    for (let i = 0; i < length; i += 1) { filtered += ((Math.random() * 2 - 1) - filtered) * (.08 + (1 - damping) * .5); data[i] = filtered * Math.pow(1 - i / length, decay); }
  }
  return impulse;
}

function tempoDelaySeconds(division: string, bpm: number) {
  const beat = 60 / Math.max(30, bpm);
  return ({ '1/1': beat * 4, '1/2': beat * 2, '1/4': beat, '1/8': beat / 2, '1/16': beat / 4, '1/8 dotted': beat * .75 } as Record<string, number>)[division] || beat;
}

function schedulePitchCorrection(source: AudioBufferSourceNode, track: DawTrack, when: number, bufferOffset: number, duration: number, additionalCents = 0) {
  const settings = normalizeDawEffects(track.effects, track as unknown as Record<string, unknown>).pitch;
  source.detune.cancelScheduledValues(when); source.detune.setValueAtTime(0, when);
  if (!settings.enabled || !track.buffer || duration <= 0) return;
  const samples = track.buffer.getChannelData(0), sampleRate = track.buffer.sampleRate;
  const windowSize = Math.min(4096, Math.max(1024, 2 ** Math.floor(Math.log2(sampleRate / Math.max(45, settings.minFrequency) * 3))));
  const interval = .08, timeConstant = .01 + (100 - settings.retuneSpeed) / 100 * .11;
  for (let relative = 0; relative < duration; relative += interval) {
    const start = Math.floor((bufferOffset + relative) * sampleRate); if (start + windowSize >= samples.length) break;
    const frequency = estimatePitch(samples.subarray(start, start + windowSize), sampleRate, settings.minFrequency, 1200);
    if (!frequency) continue;
    const corrected = nearestScaleCorrectionCents(frequency, settings) * (1 - settings.humanize / 180) + settings.octave * 1200 + additionalCents;
    source.detune.setTargetAtTime(corrected, when + relative, timeConstant);
  }
}

export default function StudioDawPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const ownerId = user?.uid || 'local';
  const [tracks, setTracks] = useState<DawTrack[]>([]);
  const [projectId, setProjectId] = useState(() => localStorage.getItem('musicinsta_active_daw_project') || crypto.randomUUID());
  const [projectName, setProjectName] = useState('Untitled MusicInsta Session');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [masterGain, setMasterGain] = useState(90);
  const [compression, setCompression] = useState(18);
  const [masterDelay, setMasterDelay] = useState(0);
  const [zoom, setZoom] = useState(75);
  const [playhead, setPlayhead] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [beatOpen, setBeatOpen] = useState(false);
  const [beatMode, setBeatMode] = useState<'choice' | 'manual' | 'ai'>('choice');
  const [bpm, setBpm] = useState(112);
  const [steps, setSteps] = useState<Record<DrumName, boolean[]>>(() => Object.fromEntries(DRUMS.map(name => [name, Array(16).fill(false)])) as Record<DrumName, boolean[]>);
  const [melodySteps, setMelodySteps] = useState<Record<MelodyName, boolean[]>>(() => Object.fromEntries(MELODY_NOTES.map(note => [note.name, Array(16).fill(false)])) as Record<MelodyName, boolean[]>);
  const [aiBeatPrompt, setAiBeatPrompt] = useState('Warm amapiano groove with log drums, soulful keys and a memorable instrumental hook');
  const [aiBeatGenre, setAiBeatGenre] = useState('amapiano');
  const [aiBeatMood, setAiBeatMood] = useState('energetic');
  const [aiBeatUrl, setAiBeatUrl] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [exportState, setExportState] = useState<{ format: 'wav' | 'mp3'; progress: number; label: string } | null>(null);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [recordingLevels, setRecordingLevels] = useState<number[]>([]);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [mixerMinimized, setMixerMinimized] = useState(false);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [microphoneId, setMicrophoneId] = useState('');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const activeNodesRef = useRef<Map<string, ActiveNodes>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const playbackStartedAt = useRef(0);
  const playheadRef = useRef(0);
  const playbackAnchorRef = useRef(0);
  const isPlayingRef = useRef(false);
  const tracksRef = useRef<DawTrack[]>([]);
  const undoRef = useRef<DawTrack[][]>([]);
  const redoRef = useRef<DawTrack[][]>([]);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);

  const getContext = () => contextRef.current ||= new AudioContext();
  const timelineDuration = useMemo(() => Math.max(30, ...tracks.map(track => track.offset + track.length)), [tracks]);
  const timelineWidth = Math.max(900, timelineDuration * zoom);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { playheadRef.current = playhead; }, [playhead]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const followPlayhead = useCallback((seconds: number) => {
    const viewport = timelineScrollRef.current;
    if (!viewport) return;
    const playheadX = 240 + seconds * zoomRef.current;
    const target = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, playheadX - viewport.clientWidth * .42));
    viewport.scrollLeft = target;
  }, []);

  const decodeBlob = useCallback(async (blob: Blob) => getContext().decodeAudioData(await blob.arrayBuffer()), []);
  const projectToTracks = useCallback(async (saved: StoredDawProject | Record<string, unknown>) => {
    const savedTracks = (saved.tracks || []) as Array<Record<string, unknown>>;
    return (await Promise.all(savedTracks.map(async (item, index) => {
      try {
        let blob = item.blob as Blob | undefined;
        if (!blob && item.audioUrl) {
          const response = await fetch(item.audioUrl as string);
          if (!response.ok) return null;
          blob = await response.blob();
        }
        if (!blob) return null;
        const buffer = await decodeBlob(blob);
        const legacy = item as Record<string, unknown>;
        return {
          ...item, blob: undefined, buffer, sourceBlob: blob,
          color: (item.color as string) || TRACK_COLORS[index % TRACK_COLORS.length],
          eqLow: Number(item.eqLow || 0), eqMid: Number(item.eqMid || 0), eqHigh: Number(item.eqHigh || 0),
          delay: Number(item.delay || 0), reverb: Number(item.reverb || 0),
          eqEnabled: item.eqEnabled !== false, delayEnabled: item.delayEnabled !== false, reverbEnabled: item.reverbEnabled !== false,
          compressorEnabled: Boolean(item.compressorEnabled), compressorAmount: Number(item.compressorAmount || 0),
          pitchEnabled: item.pitchEnabled !== false, pitchKey: String(item.pitchKey || 'C'), pitchScale: String(item.pitchScale || 'Major'), pitchAmount: Number(item.pitchAmount || 0),
          effects: normalizeDawEffects(item.effects as Partial<DawEffects> | undefined, legacy),
        } as DawTrack;
      } catch { return null; }
    }))).filter(Boolean) as DawTrack[];
  }, [decodeBlob]);

  const refreshProjects = useCallback(async () => {
    const local = await listDawProjects(ownerId);
    const summaries = new Map(local.map(project => [project.id, { id: project.id, name: project.name, updatedAt: project.updatedAt, trackCount: project.tracks.length }]));
    if (user) {
      try {
        const remote = await getDocs(query(collection(db, 'studio_projects'), where('owner_id', '==', user.uid)));
        remote.docs.forEach(item => {
          const value = item.data();
          const updatedAt = value.updated_at?.toDate?.()?.toISOString?.() || value.updatedAt || new Date(0).toISOString();
          const current = summaries.get(item.id);
          if (!current || updatedAt > current.updatedAt) summaries.set(item.id, { id: item.id, name: value.name || 'Untitled project', updatedAt, trackCount: value.tracks?.length || 0 });
        });
      } catch (error) { console.warn('Could not list cloud DAW projects', error); }
    }
    setProjects([...summaries.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, [ownerId, user]);

  const applyProject = useCallback(async (saved: StoredDawProject | Record<string, unknown>) => {
    const restored = await projectToTracks(saved);
    setProjectId(String(saved.id)); setProjectName(String(saved.name || 'Untitled MusicInsta Session'));
    setMasterGain(Number(saved.masterGain ?? 90)); setCompression(Number(saved.compression ?? 18));
    setMasterDelay(Number(saved.masterDelay ?? saved.delay ?? 0)); setZoom(Number(saved.zoom ?? 75));
    setTracks(restored); setSelectedTrackIds(new Set()); setPlayhead(0); playbackAnchorRef.current = 0; undoRef.current = []; redoRef.current = []; setCanUndo(false); setCanRedo(false);
    localStorage.setItem('musicinsta_active_daw_project', String(saved.id));
  }, [projectToTracks]);

  function stopSources() {
    cancelAnimationFrame(animationRef.current || 0);
    sourcesRef.current.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
    sourcesRef.current = []; activeNodesRef.current.clear(); setIsPlaying(false);
  }

  const loadProject = useCallback(async (id: string) => {
    stopSources(); setLoaded(false);
    try {
      let saved: StoredDawProject | Record<string, unknown> | null = await getDawProject(id);
      if (!saved && user) {
        const remote = await getDoc(doc(db, 'studio_projects', id));
        if (remote.exists()) saved = { id: remote.id, ...remote.data() };
      }
      if (saved) await applyProject(saved);
    } finally { setLoaded(true); setProjectsOpen(false); }
  }, [applyProject, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await getDawProject(projectId);
        if (existing) await applyProject(existing);
        else {
          const legacyRemote = user ? await getDoc(doc(db, 'studio_sessions', user.uid)) : null;
          const legacyLocal = JSON.parse(localStorage.getItem('musicinsta_daw_state') || 'null');
          const legacy = legacyRemote?.exists() ? { id: projectId, name: legacyRemote.data().projectName, ...legacyRemote.data() } : legacyLocal ? { id: projectId, name: legacyLocal.projectName, ...legacyLocal } : null;
          if (legacy) await applyProject(legacy);
        }
        if (!cancelled) await refreshProjects();
      } catch (error) { console.warn('DAW project restore failed', error); }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const now = new Date().toISOString();
      const project: StoredDawProject = {
        id: projectId, ownerId, name: projectName, masterGain, compression, masterDelay, zoom,
        tracks: tracks.map(({ buffer: _buffer, sourceBlob, ...track }) => ({ ...track, blob: sourceBlob })),
        createdAt: projects.find(item => item.id === projectId)?.updatedAt || now, updatedAt: now,
      };
      try {
        await saveDawProject(project);
        localStorage.setItem('musicinsta_active_daw_project', projectId);
        if (user) {
          const cloudTracks = withoutUndefined(tracks.map(({ buffer: _buffer, sourceBlob: _blob, ...track }) => track));
          await setDoc(doc(db, 'studio_projects', projectId), { owner_id: user.uid, name: projectName, masterGain, compression, masterDelay, zoom, tracks: cloudTracks, updated_at: serverTimestamp() }, { merge: true });
        }
        await refreshProjects();
      } catch (error) { console.warn('DAW project save failed', error); }
      setSaving(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [tracks, projectId, projectName, masterGain, compression, masterDelay, zoom, loaded, ownerId, user]);

  const addDecodedTrack = useCallback(async (buffer: AudioBuffer, blob: Blob, name: string, offset = 0) => {
    undoRef.current = [...undoRef.current.slice(-49), tracksRef.current]; redoRef.current = []; setCanUndo(true); setCanRedo(false);
    const id = crypto.randomUUID();
    const next: DawTrack = {
      id, name, buffer, sourceBlob: blob, gain: 80, pan: 0, muted: false, solo: false,
      offset, trimStart: 0, length: buffer.duration, color: TRACK_COLORS[tracksRef.current.length % TRACK_COLORS.length],
      eqLow: 0, eqMid: 0, eqHigh: 0, delay: 0, reverb: 0,
      eqEnabled: true, delayEnabled: true, reverbEnabled: true, compressorEnabled: false, compressorAmount: 0,
      pitchEnabled: true, pitchKey: 'C', pitchScale: 'Major', pitchAmount: 0,
      effects: defaultDawEffects(),
    };
    setTracks(current => [...current, next]); setSelectedTrackIds(new Set([id]));
    if (user) {
      try {
        const object = ref(storage, `studio-sessions/${user.uid}/${projectId}/${id}`);
        await uploadBytes(object, blob); const audioUrl = await getDownloadURL(object);
        setTracks(current => current.map(track => track.id === id ? { ...track, audioUrl } : track));
      } catch { toast.error('Track is saved locally, but cloud upload failed.'); }
    }
  }, [projectId, user]);

  const addAudioBlob = useCallback(async (blob: Blob, name: string, offset = 0) => {
    try { await addDecodedTrack(await decodeBlob(blob), blob, name, offset); }
    catch { toast.error('This audio could not be decoded. Try WAV, MP3, M4A, or OGG.'); }
  }, [addDecodedTrack, decodeBlob]);

  useEffect(() => {
    const key = searchParams.get('importEnhanced');
    if (!key || !loaded) return;
    takeDawAudio(key).then(result => result && addAudioBlob(result.blob, result.name, playheadRef.current));
  }, [addAudioBlob, loaded, searchParams]);

  useEffect(() => {
    const refreshMicrophones = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMicrophones(devices.filter(device => device.kind === 'audioinput'));
      } catch { setMicrophones([]); }
    };
    void refreshMicrophones();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshMicrophones);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshMicrophones);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(animationRef.current || 0); stopSources();
    streamRef.current?.getTracks().forEach(track => track.stop());
    const context = contextRef.current; contextRef.current = null;
    if (context && context.state !== 'closed') { try { void context.close().catch(() => undefined); } catch { /* already closing */ } }
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) await addAudioBlob(file, file.name.replace(/\.[^.]+$/, ''), playheadRef.current);
  };

  const rememberTracks = () => {
    undoRef.current = [...undoRef.current.slice(-49), tracksRef.current];
    redoRef.current = [];
    setCanUndo(true); setCanRedo(false);
  };
  const undo = () => {
    const previous = undoRef.current.pop(); if (!previous) return;
    redoRef.current.push(tracksRef.current); setTracks(previous); setCanUndo(Boolean(undoRef.current.length)); setCanRedo(true);
    if (isPlayingRef.current) void startPlayback(previous, playheadRef.current);
  };
  const redo = () => {
    const next = redoRef.current.pop(); if (!next) return;
    undoRef.current.push(tracksRef.current); setTracks(next); setCanUndo(true); setCanRedo(Boolean(redoRef.current.length));
    if (isPlayingRef.current) void startPlayback(next, playheadRef.current);
  };

  const connectTrack = (context: AudioContext | OfflineAudioContext, track: DawTrack, master: AudioNode) => {
    const effects = normalizeDawEffects(track.effects, track as unknown as Record<string, unknown>);
    const source = context.createBufferSource(), gain = context.createGain(), pan = context.createStereoPanner(); source.buffer = track.buffer;
    gain.gain.value = track.gain / 100; pan.pan.value = track.pan / 100; gain.connect(pan).connect(master);

    const pitchInput = context.createGain(), pitchOutput = context.createGain(), pitchFormant = context.createBiquadFilter(), pitchPan = context.createStereoPanner();
    pitchFormant.type = 'peaking'; pitchFormant.frequency.value = 1200 * Math.pow(2, (effects.pitch.formantShift + effects.pitch.gender / 20) / 12); pitchFormant.Q.value = .75; pitchFormant.gain.value = effects.pitch.enabled ? (effects.pitch.formantShift + effects.pitch.gender / 20) * .65 : 0; pitchPan.pan.value = effects.pitch.enabled ? effects.pitch.stereoSpread / 200 : 0; pitchInput.connect(pitchFormant).connect(pitchPan).connect(pitchOutput);

    const eqInput = context.createGain(), eqOutput = context.createGain(), eqDry = context.createGain(), eqWet = context.createGain();
    eqDry.gain.value = effects.equalizer.enabled ? 1 - effects.equalizer.wet / 100 : 1; eqWet.gain.value = effects.equalizer.enabled ? effects.equalizer.wet / 100 : 0;
    eqInput.connect(eqDry).connect(eqOutput);
    const eqNodes = effects.equalizer.bands.map(band => { const node = context.createBiquadFilter(); node.type = band.type; node.frequency.value = band.frequency; node.gain.value = band.enabled ? band.gain : 0; node.Q.value = band.q; return node; });
    eqNodes.reduce<AudioNode>((previous, node) => previous.connect(node), eqInput).connect(eqWet).connect(eqOutput);

    const compressorInput = context.createGain(), compressorOutput = context.createGain(), compressorDry = context.createGain(), compressorWet = context.createGain(), trackCompressor = context.createDynamicsCompressor(), makeup = context.createGain();
    compressorDry.gain.value = effects.compressor.enabled ? 1 - effects.compressor.wet / 100 : 1; compressorWet.gain.value = effects.compressor.enabled ? effects.compressor.wet / 100 : 0;
    trackCompressor.threshold.value = effects.compressor.threshold - effects.compressor.sidechain / 20; trackCompressor.ratio.value = effects.compressor.ratio; trackCompressor.knee.value = effects.compressor.type === 'Hard' ? 0 : effects.compressor.type === 'Medium' ? Math.min(16, effects.compressor.knee) : effects.compressor.knee; trackCompressor.attack.value = effects.compressor.attack / 1000; trackCompressor.release.value = effects.compressor.release / 1000;
    makeup.gain.value = Math.pow(10, (effects.compressor.autoGain ? Math.max(0, -effects.compressor.threshold) / effects.compressor.ratio * .35 : effects.compressor.makeupGain) / 20);
    compressorInput.connect(compressorDry).connect(compressorOutput); compressorInput.connect(trackCompressor).connect(makeup).connect(compressorWet).connect(compressorOutput);

    const delayInput = context.createGain(), delayOutput = context.createGain(), delayDry = context.createGain(), delayWet = context.createGain(), delayNode = context.createDelay(4), diffusionTap = context.createDelay(1), diffusionGain = context.createGain(), delayFeedback = context.createGain(), delayFilter = context.createBiquadFilter(), delayTone = context.createBiquadFilter(), delayPan = context.createStereoPanner(), delayDistortion = context.createWaveShaper(), delayLfo = context.createOscillator(), delayLfoDepth = context.createGain();
    const delaySeconds = effects.delay.tempoSync ? tempoDelaySeconds(effects.delay.division, bpm) : effects.delay.timeMs / 1000;
    delayNode.delayTime.value = Math.min(3.9, Math.max(.001, delaySeconds + effects.delay.offset / 1000)); delayFeedback.gain.value = effects.delay.enabled ? Math.min(.92, effects.delay.feedback / 100) : 0; delayWet.gain.value = effects.delay.enabled && effects.delay.mode !== 'Off' ? effects.delay.wet / 100 : 0; delayDry.gain.value = effects.delay.enabled ? effects.delay.dry / 100 : 1;
    delayFilter.type = effects.delay.filterMode === 'HP' ? 'highpass' : effects.delay.filterMode === 'BP' ? 'bandpass' : 'lowpass'; delayFilter.frequency.value = effects.delay.filterMode === 'Off' ? 20000 : effects.delay.feedbackCutoff; delayFilter.Q.value = effects.delay.resonance / 8;
    delayPan.pan.value = effects.delay.mode === 'Mono' ? 0 : (effects.delay.stereo / 100) * (effects.delay.mode === 'Ping pong' ? .9 : .45);
    delayTone.type = effects.delay.tone < 50 ? 'lowpass' : 'highshelf'; delayTone.frequency.value = effects.delay.tone < 50 ? 1200 + effects.delay.tone * 180 : 2500; delayTone.gain.value = effects.delay.tone >= 50 ? (effects.delay.tone - 50) / 4 : 0;
    const curve = new Float32Array(257), drive = 1 + effects.delay.distortionLevel / 7, levels = Math.pow(2, Math.min(12, effects.delay.bits) - 1); for (let i = 0; i < curve.length; i += 1) { const x = i / 128 - 1, shaped = Math.tanh((x + (effects.delay.distortionSymmetry - 50) / 250) * drive); curve[i] = Math.round(shaped * levels) / levels; } delayDistortion.curve = curve;
    delayLfo.frequency.value = .05 + effects.delay.modulationRate / 100 * 8; delayLfoDepth.gain.value = effects.delay.enabled ? effects.delay.modulationTime / 1000 * effects.delay.modulationWet / 100 : 0; delayLfo.connect(delayLfoDepth).connect(delayNode.delayTime); delayLfo.start();
    diffusionTap.delayTime.value = .012 + effects.delay.diffusionSpread / 100 * .08; diffusionGain.gain.value = effects.delay.enabled ? effects.delay.diffusionLevel / 200 : 0;
    delayInput.connect(delayDry).connect(delayOutput); delayInput.connect(delayNode); delayNode.connect(delayFilter).connect(delayDistortion).connect(delayFeedback).connect(delayNode); delayNode.connect(delayTone).connect(delayPan).connect(delayWet).connect(delayOutput); delayNode.connect(diffusionTap).connect(diffusionGain).connect(delayOutput);

    const reverbInput = context.createGain(), reverbOutput = context.createGain(), reverbDry = context.createGain(), reverbWet = context.createGain(), earlyWet = context.createGain(), preDelay = context.createDelay(1), earlyDelay = context.createDelay(1), lowCut = context.createBiquadFilter(), highCut = context.createBiquadFilter(), bassShape = context.createBiquadFilter(), convolver = context.createConvolver(), reverbPan = context.createStereoPanner(), reverbLfo = context.createOscillator(), reverbLfoDepth = context.createGain();
    reverbDry.gain.value = effects.reverb.enabled ? effects.reverb.dry / 100 : 1; reverbWet.gain.value = effects.reverb.enabled ? effects.reverb.wet / 100 : 0; earlyWet.gain.value = effects.reverb.enabled ? effects.reverb.early / 100 : 0; preDelay.delayTime.value = effects.reverb.preDelay / 1000; earlyDelay.delayTime.value = Math.max(.003, effects.reverb.preDelay / 2000 + .012);
    lowCut.type = 'highpass'; lowCut.frequency.value = effects.reverb.lowCut; highCut.type = 'lowpass'; highCut.frequency.value = effects.reverb.highCut; bassShape.type = 'lowshelf'; bassShape.frequency.value = effects.reverb.crossover; bassShape.gain.value = (effects.reverb.bass - 50) / 3; convolver.buffer = createImpulse(context, .35 + effects.reverb.size / 22, 1.2 + (100 - effects.reverb.decay) / 25, effects.reverb.damping / 100); reverbPan.pan.value = effects.reverb.separation / 100;
    reverbLfo.frequency.value = .03 + effects.reverb.speed / 100 * 2.5; reverbLfoDepth.gain.value = effects.reverb.enabled ? effects.reverb.modulation / 100000 : 0; reverbLfo.connect(reverbLfoDepth).connect(preDelay.delayTime); reverbLfo.start();
    reverbInput.connect(reverbDry).connect(reverbOutput); reverbInput.connect(earlyDelay).connect(earlyWet).connect(reverbOutput); reverbInput.connect(lowCut).connect(highCut).connect(bassShape).connect(preDelay).connect(convolver).connect(reverbPan).connect(reverbWet).connect(reverbOutput);

    const processors: Record<string, { input: AudioNode; output: AudioNode }> = { pitch: { input: pitchInput, output: pitchOutput }, equalizer: { input: eqInput, output: eqOutput }, compressor: { input: compressorInput, output: compressorOutput }, delay: { input: delayInput, output: delayOutput }, reverb: { input: reverbInput, output: reverbOutput } };
    const orderedProcessors = effects.order.map(effect => processors[effect]).filter(Boolean);
    let current: AudioNode = source; orderedProcessors.forEach(processor => { current.connect(processor.input); current = processor.output; }); current.connect(gain);
    let harmonySource: AudioBufferSourceNode | undefined;
    if (effects.pitch.enabled && effects.pitch.midiMode && effects.pitch.harmony !== 0 && effects.order.includes('pitch')) { const harmonyGain = context.createGain(); harmonyGain.gain.value = .32; harmonySource = context.createBufferSource(); harmonySource.buffer = track.buffer; harmonySource.connect(harmonyGain).connect(orderedProcessors[0]?.input || gain); }
    source.addEventListener('ended', () => { try { delayLfo.stop(); reverbLfo.stop(); } catch { /* already stopped */ } });
    return { source, harmonySource, nodes: { source, harmonySource, gain, pan, eq: eqNodes, compressor: trackCompressor, compressorWet, delay: delayNode, delayWet, delayFeedback, reverbWet } };
  };

  const startPlayback = async (playTracks = tracksRef.current, startAt = playheadRef.current) => {
    if (!playTracks.length) return;
    stopSources(); const context = getContext(); await context.resume();
    const endAt = Math.max(30, ...playTracks.map(track => track.offset + track.length));
    const playbackStart = startAt >= endAt - .02 ? 0 : Math.max(0, Math.min(startAt, endAt));
    const master = context.createGain(); master.gain.value = masterGain / 100;
    const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -8 - compression / 3; compressor.ratio.value = 2 + compression / 12;
    const masterDelayNode = context.createDelay(1); masterDelayNode.delayTime.value = masterDelay / 1000;
    master.connect(compressor); compressor.connect(context.destination);
    if (masterDelay > 0) { compressor.connect(masterDelayNode); masterDelayNode.connect(context.destination); }
    const soloed = playTracks.some(track => track.solo);
    playTracks.filter(track => !track.muted && (!soloed || track.solo)).forEach(track => {
      if (track.offset + track.length <= playbackStart) return;
      const { source, harmonySource, nodes } = connectTrack(context, track, master);
      const startDelay = Math.max(0, track.offset - playbackStart), consumed = Math.max(0, playbackStart - track.offset);
      const when = context.currentTime + startDelay, bufferOffset = track.trimStart + consumed, remaining = Math.max(.01, track.length - consumed);
      if (normalizeDawEffects(track.effects, track as unknown as Record<string, unknown>).order.includes('pitch')) schedulePitchCorrection(source, track, when, bufferOffset, remaining);
      source.start(when, bufferOffset, remaining);
      if (harmonySource) { const pitch = normalizeDawEffects(track.effects).pitch; schedulePitchCorrection(harmonySource, track, when, bufferOffset, remaining, pitch.harmony * 100); harmonySource.start(when, bufferOffset, remaining); sourcesRef.current.push(harmonySource); }
      sourcesRef.current.push(source); activeNodesRef.current.set(track.id, nodes);
    });
    playbackStartedAt.current = performance.now() - playbackStart * 1000;
    playheadRef.current = playbackStart; setPlayhead(playbackStart); followPlayhead(playbackStart); setIsPlaying(true);
    const tick = () => {
      const elapsed = (performance.now() - playbackStartedAt.current) / 1000;
      const next = Math.min(endAt, elapsed);
      playheadRef.current = next; setPlayhead(next); followPlayhead(next);
      if (elapsed >= endAt) {
        stopSources();
        playheadRef.current = 0; setPlayhead(0); followPlayhead(0);
        void startPlayback(playTracks, 0);
      }
      else animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
  };

  const seekPlayhead = (seconds: number) => {
    const next = Math.max(0, Math.min(timelineDuration, seconds));
    playbackAnchorRef.current = next; playheadRef.current = next; setPlayhead(next); followPlayhead(next);
    if (isPlayingRef.current) void startPlayback(tracksRef.current, next);
  };

  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      stopSources();
      playheadRef.current = playbackAnchorRef.current; setPlayhead(playbackAnchorRef.current); followPlayhead(playbackAnchorRef.current);
    } else void startPlayback(tracksRef.current, playbackAnchorRef.current);
  }, [masterGain, compression, masterDelay, followPlayhead]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.code !== 'Space' || target.matches('input, textarea, select, button') || target.isContentEditable) return;
      event.preventDefault(); togglePlayback();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [togglePlayback]);

  const updateTrack = (id: string, patch: Partial<DawTrack>) => {
    rememberTracks();
    const nextTracks = tracksRef.current.map(track => track.id === id ? { ...track, ...patch } : track);
    setTracks(nextTracks);
    if (patch.effects && isPlayingRef.current) { void startPlayback(nextTracks, playheadRef.current); return; }
    const nodes = activeNodesRef.current.get(id), now = getContext().currentTime;
    if (!nodes) return;
    const currentTrack = tracksRef.current.find(track => track.id === id);
    if (patch.gain != null) nodes.gain.gain.setTargetAtTime(patch.gain / 100, now, .01);
    if (patch.pan != null) nodes.pan.pan.setTargetAtTime(patch.pan / 100, now, .01);
    if (patch.eqLow != null) nodes.eq.slice(0, 2).forEach(node => node.gain.setTargetAtTime(patch.eqLow!, now, .01));
    if (patch.eqMid != null) nodes.eq.slice(2, 5).forEach(node => node.gain.setTargetAtTime(patch.eqMid!, now, .01));
    if (patch.eqHigh != null) nodes.eq.slice(5).forEach(node => node.gain.setTargetAtTime(patch.eqHigh!, now, .01));
    if (patch.delay != null) nodes.delayWet.gain.setTargetAtTime(patch.delay / 100 * .55, now, .01);
    if (patch.reverb != null) nodes.reverbWet.gain.setTargetAtTime(patch.reverb / 100 * .65, now, .01);
    if (patch.eqEnabled != null && currentTrack) {
      nodes.eq.forEach((node, index) => node.gain.setTargetAtTime(patch.eqEnabled ? [currentTrack.eqLow, currentTrack.eqMid, currentTrack.eqHigh][Math.min(2, Math.floor(index / 3))] : 0, now, .01));
    }
    if (patch.delayEnabled != null && currentTrack) nodes.delayWet.gain.setTargetAtTime(patch.delayEnabled ? currentTrack.delay / 100 * .55 : 0, now, .01);
    if (patch.reverbEnabled != null && currentTrack) nodes.reverbWet.gain.setTargetAtTime(patch.reverbEnabled ? currentTrack.reverb / 100 * .65 : 0, now, .01);
    if (patch.pitchAmount != null) nodes.source.detune.setTargetAtTime(patch.pitchAmount * 2, now, .01);
    if ((patch.compressorEnabled != null || patch.compressorAmount != null) && currentTrack) {
      const amount = (patch.compressorEnabled ?? currentTrack.compressorEnabled) ? (patch.compressorAmount ?? currentTrack.compressorAmount ?? 0) : 0;
      nodes.compressor.threshold.setTargetAtTime(-4 - amount * .36, now, .01); nodes.compressor.ratio.setTargetAtTime(1 + amount * .11, now, .01);
    }
  };
  const updateAudibility = (id: string, field: 'muted' | 'solo') => {
    rememberTracks();
    const next = tracksRef.current.map(track => track.id === id ? { ...track, [field]: !track[field] } : track);
    setTracks(next); if (isPlayingRef.current) void startPlayback(next, playheadRef.current);
  };
  const moveTrack = (index: number, direction: number) => { rememberTracks(); setTracks(current => { const next = [...current], target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; }); };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setRecordingLevels([]);
      setIsFinalizingRecording(true);
      stopSources(); playbackAnchorRef.current = 0; playheadRef.current = 0; setPlayhead(0); followPlayhead(0);
      recorderRef.current?.stop();
      return;
    }
    if (isFinalizingRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: microphoneId ? { deviceId: { exact: microphoneId } } : true });
      const devices = await navigator.mediaDevices.enumerateDevices(); setMicrophones(devices.filter(device => device.kind === 'audioinput'));
      streamRef.current = stream; chunksRef.current = [];
      const context = getContext(), input = context.createMediaStreamSource(stream), analyser = context.createAnalyser(); analyser.fftSize = 128; input.connect(analyser);
      const recorder = new MediaRecorder(stream); recorderRef.current = recorder;
      recorder.ondataavailable = event => event.data.size && chunksRef.current.push(event.data);
      const recordOffset = playheadRef.current;
      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          await addAudioBlob(blob, `Recording ${tracksRef.current.length + 1}`, recordOffset);
        } finally {
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false); setRecordingLevels([]); setIsFinalizingRecording(false);
        }
      };
      recorder.onerror = () => { stream.getTracks().forEach(track => track.stop()); setIsRecording(false); setRecordingLevels([]); setIsFinalizingRecording(false); toast.error('Recording stopped because the microphone stream failed.'); };
      recorder.start(100); setIsRecording(true); if (tracksRef.current.length && !isPlayingRef.current) void startPlayback();
      const levels = new Uint8Array(analyser.frequencyBinCount);
      const meter = () => { if (recorder.state === 'inactive') return; analyser.getByteFrequencyData(levels); setRecordingLevels(Array.from(levels)); requestAnimationFrame(meter); }; meter();
    } catch { toast.error('Microphone access is required to record.'); }
  };

  const renderMix = async (onlyTrack?: DawTrack) => {
    const selection = onlyTrack ? [onlyTrack] : tracksRef.current;
    const duration = Math.max(.1, ...selection.map(track => track.offset + track.length));
    const sampleRate = Math.max(44100, ...selection.map(track => track.buffer.sampleRate));
    const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
    const master = offline.createGain(), compressor = offline.createDynamicsCompressor();
    master.gain.value = masterGain / 100; compressor.threshold.value = -8 - compression / 3; compressor.ratio.value = 2 + compression / 12; master.connect(compressor).connect(offline.destination);
    const soloed = selection.some(track => track.solo);
    selection.filter(track => !track.muted && (!soloed || track.solo)).forEach(track => { const { source, harmonySource } = connectTrack(offline, track, master); const effects = normalizeDawEffects(track.effects, track as unknown as Record<string, unknown>); if (effects.order.includes('pitch')) schedulePitchCorrection(source, track, track.offset, track.trimStart, track.length); source.start(track.offset, track.trimStart, track.length); if (harmonySource) { schedulePitchCorrection(harmonySource, track, track.offset, track.trimStart, track.length, effects.pitch.harmony * 100); harmonySource.start(track.offset, track.trimStart, track.length); } });
    return offline.startRendering();
  };

  const exportMix = async (format: 'wav' | 'mp3') => {
    if (!tracks.length || exportState) return;
    setExportState({ format, progress: 10, label: 'Rendering mix' });
    try {
      const blob = audioBufferToWavBlob(await renderMix());
      setExportState({ format, progress: format === 'wav' ? 90 : 55, label: format === 'wav' ? 'Preparing download' : 'Encoding MP3' });
      if (format === 'wav') triggerDownload(blob, `${projectName}.wav`);
      else {
        const form = new FormData(); form.append('file', new File([blob], `${projectName}.wav`, { type: 'audio/wav' })); form.append('output_format', 'mp3');
        const response = await fetch(`${API_BASE}/audio/convert`, { method: 'POST', body: form });
        if (!response.ok) throw new Error('MP3 export is unavailable. WAV export still works.');
        setExportState({ format, progress: 90, label: 'Preparing download' });
        triggerDownload(await response.blob(), `${projectName}.mp3`);
      }
      setExportState({ format, progress: 100, label: 'Export complete' });
      toast.success(`${format.toUpperCase()} mix exported.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The mix could not be exported.');
    } finally {
      window.setTimeout(() => setExportState(null), 700);
    }
  };
  const addEmptyTrack = async () => {
    const context = getContext(), buffer = context.createBuffer(2, Math.ceil(context.sampleRate * 30), context.sampleRate);
    await addDecodedTrack(buffer, audioBufferToWavBlob(buffer), `Empty channel ${tracksRef.current.length + 1}`, 0);
  };
  const createPostFromMix = async () => {
    if (!tracks.length) return;
    try {
      toast.info('Preparing your mix for a new post…');
      const blob = audioBufferToWavBlob(await renderMix());
      const key = await storeDawAudio(blob, `${projectName}.wav`);
      navigate(`/upload?fromDaw=${key}&title=${encodeURIComponent(projectName)}`);
    } catch { toast.error('The mix could not be prepared for posting.'); }
  };
  const enhance = async (track?: DawTrack) => {
    if (!tracks.length) return;
    toast.info('Preparing audio for enhancement…'); const blob = audioBufferToWavBlob(await renderMix(track));
    const key = await storeDawAudio(blob, `${track?.name || projectName} enhanced.wav`); navigate(`/studio/enhance?source=daw&key=${key}&project=${projectId}`);
  };

  const dragClip = (track: DawTrack, event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).dataset.resize) return;
    if (event.ctrlKey || event.metaKey) setSelectedTrackIds(current => { const next = new Set(current); if (next.has(track.id)) next.delete(track.id); else next.add(track.id); return next; });
    else setSelectedTrackIds(new Set([track.id]));
    const startX = event.clientX, startOffset = track.offset;
    const move = (moveEvent: PointerEvent) => updateTrack(track.id, { offset: Math.max(0, startOffset + (moveEvent.clientX - startX) / zoom) });
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
  };
  const resizeClip = (track: DawTrack, edge: 'left' | 'right', event: React.PointerEvent) => {
    event.stopPropagation(); const startX = event.clientX, startLength = track.length, startTrim = track.trimStart, startOffset = track.offset;
    const move = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) / zoom;
      if (edge === 'right') updateTrack(track.id, { length: Math.max(.2, Math.min(track.buffer.duration - track.trimStart, startLength + delta)) });
      else { const applied = Math.max(-startTrim, Math.min(startLength - .2, delta)); updateTrack(track.id, { trimStart: startTrim + applied, offset: Math.max(0, startOffset + applied), length: startLength - applied }); }
    };
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
  };
  const splitSelected = () => {
    const ids = selectedTrackIds.size ? selectedTrackIds : new Set(tracks.filter(track => playhead > track.offset && playhead < track.offset + track.length).map(track => track.id));
    let splits = 0;
    rememberTracks();
    setTracks(current => current.flatMap(track => {
      if (!ids.has(track.id) || playhead <= track.offset || playhead >= track.offset + track.length) return [track];
      const leftLength = playhead - track.offset, rightLength = track.length - leftLength; splits += 1;
      return [{ ...track, length: leftLength }, { ...track, id: crypto.randomUUID(), name: `${track.name} split`, offset: playhead, trimStart: track.trimStart + leftLength, length: rightLength }];
    }));
    toast.success(splits ? `Split ${splits} selected track${splits === 1 ? '' : 's'}.` : 'Move the playhead inside a selected clip first.');
  };

  const makeBeatBuffer = () => {
    const context = getContext(), sampleRate = context.sampleRate, stepDuration = 60 / bpm / 4, bars = 4, duration = stepDuration * 16 * bars;
    const buffer = context.createBuffer(2, Math.ceil(duration * sampleRate), sampleRate);
    for (let bar = 0; bar < bars; bar += 1) for (let step = 0; step < 16; step += 1) {
      const start = Math.floor((bar * 16 + step) * stepDuration * sampleRate);
      const add = (channel: Float32Array, index: number, value: number) => { if (index < channel.length) channel[index] = Math.max(-1, Math.min(1, channel[index] + value)); };
      for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
        const channel = buffer.getChannelData(channelIndex);
        if (steps.Kick[step]) for (let i = 0; i < sampleRate * .35; i += 1) add(channel, start + i, Math.sin(2 * Math.PI * (120 - 75 * i / (sampleRate * .35)) * i / sampleRate) * Math.exp(-i / (sampleRate * .09)) * .9);
        if (steps.Snare[step] || steps.Clap[step]) for (let i = 0; i < sampleRate * .18; i += 1) add(channel, start + i, (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * (steps.Clap[step] ? .05 : .09))) * .45);
        if (steps['Hi-hat'][step]) for (let i = 0; i < sampleRate * .06; i += 1) add(channel, start + i, (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * .018)) * .28);
        MELODY_NOTES.forEach(note => {
          if (!melodySteps[note.name][step]) return;
          const noteLength = Math.min(Math.floor(stepDuration * sampleRate * .92), Math.floor(sampleRate * .55));
          for (let i = 0; i < noteLength; i += 1) {
            const attack = Math.min(1, i / (sampleRate * .018));
            const release = Math.exp(-i / (sampleRate * .3));
            const tone = Math.sin(2 * Math.PI * note.frequency * i / sampleRate) + .28 * Math.sin(2 * Math.PI * note.frequency * 2 * i / sampleRate);
            add(channel, start + i, tone * attack * release * .16);
          }
        });
      }
    }
    return buffer;
  };
  const previewBeat = () => { stopSources(); const context = getContext(), source = context.createBufferSource(); source.buffer = makeBeatBuffer(); source.connect(context.destination); source.start(); sourcesRef.current = [source]; setIsPlaying(true); source.onended = () => setIsPlaying(false); };
  const insertBeat = async () => { const buffer = makeBeatBuffer(), blob = audioBufferToWavBlob(buffer); await addDecodedTrack(buffer, blob, `Beat ${bpm} BPM`, playheadRef.current); setBeatOpen(false); toast.success('Beat added to the playlist.'); };
  const generateAiBeat = async () => {
    if (!aiBeatPrompt.trim()) { toast.error('Describe the beat you want first.'); return; }
    setAiGenerating(true); setAiBeatUrl('');
    try {
      const result = await generateBeats(aiBeatPrompt.trim(), { genre: aiBeatGenre, mood: aiBeatMood, bpm });
      const audioUrl = result.audio_url || result.data?.audio_url;
      if (!result.success || !audioUrl) throw new Error(result.error || 'The AI service did not return beat audio.');
      setAiBeatUrl(audioUrl);
      toast.success('AI beat generated. Preview it, then add it to the playlist.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'AI beat generation failed.'); }
    finally { setAiGenerating(false); }
  };
  const insertAiBeat = async () => {
    if (!aiBeatUrl) return;
    try {
      const response = await fetch(aiBeatUrl);
      if (!response.ok) throw new Error('The generated beat could not be downloaded.');
      await addAudioBlob(await response.blob(), `AI beat · ${aiBeatGenre} · ${bpm} BPM`, playheadRef.current);
      setBeatOpen(false); toast.success('AI beat added to the playlist.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'The AI beat could not be added.'); }
  };
  const newProject = () => { stopSources(); const id = crypto.randomUUID(); setProjectId(id); setProjectName('Untitled MusicInsta Session'); setTracks([]); setSelectedTrackIds(new Set()); setPlayhead(0); setMasterGain(90); setCompression(18); setMasterDelay(0); localStorage.setItem('musicinsta_active_daw_project', id); setProjectsOpen(false); toast.success('New project created.'); };
  const removeProject = async (id: string) => { await deleteDawProject(id); if (user) await deleteDoc(doc(db, 'studio_projects', id)).catch(() => undefined); await refreshProjects(); if (id === projectId) newProject(); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/studio')}><ArrowLeft className="h-5 w-5" /></Button>
          <img src="/MusicInsta_Logo.png" alt="MusicInsta" className="h-8 w-auto" />
          <Input aria-label="Project name" value={projectName} onChange={event => setProjectName(event.target.value)} className="min-w-[190px] flex-1 sm:max-w-sm" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : user ? 'Saved locally and in the cloud' : 'Saved on this device'}</span>
          <Button variant="outline" onClick={() => setProjectsOpen(true)}><FolderOpen className="mr-2 h-4 w-4" />Projects</Button>
          <Button variant="outline" onClick={() => { setBeatOpen(value => !value); setBeatMode('choice'); }}><Sparkles className="mr-2 h-4 w-4" />Beat maker</Button>
          <Button variant="outline" onClick={() => void createPostFromMix()} disabled={!tracks.length}><Send className="mr-2 h-4 w-4" />New post</Button>
          <Button onClick={() => void exportMix('wav')} disabled={!tracks.length || Boolean(exportState)}>{exportState?.format === 'wav' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{exportState?.format === 'wav' ? `${exportState.progress}%` : 'WAV'}</Button>
          <Button variant="outline" onClick={() => void exportMix('mp3')} disabled={!tracks.length || Boolean(exportState)}>{exportState?.format === 'mp3' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{exportState?.format === 'mp3' ? `${exportState.progress}%` : 'MP3'}</Button>
        </div>
        {exportState && <div className="mx-auto mt-2 max-w-[1600px]"><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{exportState.label}</span><span>{exportState.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${exportState.progress}%` }} /></div></div>}
      </header>

      {projectsOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setProjectsOpen(false)}><div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5" onClick={event => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">DAW projects</h2><p className="text-sm text-muted-foreground">Recent projects retain uploaded audio, recordings and mixer settings.</p></div><Button onClick={newProject}><Plus className="mr-2 h-4 w-4" />New project</Button></div><div className="space-y-2">{projects.map(project => <div key={project.id} className={`flex items-center gap-3 rounded-xl border p-3 ${project.id === projectId ? 'border-primary bg-primary/5' : 'border-border'}`}><button className="min-w-0 flex-1 text-left" onClick={() => void loadProject(project.id)}><p className="truncate font-semibold">{project.name}</p><p className="text-xs text-muted-foreground">{project.trackCount} tracks · {new Date(project.updatedAt).toLocaleString()}</p></button><Button variant="ghost" size="icon" onClick={() => void removeProject(project.id)}><Trash2 className="h-4 w-4" /></Button></div>)}{!projects.length && <p className="py-8 text-center text-muted-foreground">No saved projects yet.</p>}</div></div></div>}

      {beatOpen && <section className="mx-auto mt-4 max-w-[1550px] rounded-2xl border border-border bg-card p-4">
        {beatMode === 'choice' && <div><h2 className="text-lg font-bold">Create a beat</h2><p className="mt-1 text-sm text-muted-foreground">Build the rhythm and melody yourself, or describe a beat for MusicInsta AI.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => setBeatMode('manual')} className="rounded-2xl border border-border p-5 text-left transition hover:border-primary"><SlidersHorizontal className="mb-3 h-6 w-6 text-primary" /><p className="font-semibold">Manual beat maker</p><p className="mt-1 text-sm text-muted-foreground">Program drums and a five-note melody on the 16-step sequencer.</p></button><button onClick={() => setBeatMode('ai')} className="rounded-2xl border border-border p-5 text-left transition hover:border-primary"><Sparkles className="mb-3 h-6 w-6 text-primary" /><p className="font-semibold">Generate with AI</p><p className="mt-1 text-sm text-muted-foreground">Use the same MusicInsta beat generator, preview here, then send the result to the playlist.</p></button></div></div>}
        {beatMode === 'manual' && <><div className="mb-4 flex flex-wrap items-center gap-3"><Button size="sm" variant="ghost" onClick={() => setBeatMode('choice')}><ArrowLeft className="mr-2 h-4 w-4" />Methods</Button><div><h2 className="font-bold">16-step beat and melody maker</h2><p className="text-xs text-muted-foreground">Program a four-bar loop, preview it, then insert it at the playhead.</p></div><label className="ml-auto flex items-center gap-2 text-sm">BPM <Input className="w-24" type="number" min={60} max={200} value={bpm} onChange={event => setBpm(Math.max(60, Math.min(200, Number(event.target.value) || 60)))} /></label><Button variant="outline" onClick={previewBeat}><Play className="mr-2 h-4 w-4" />Preview</Button><Button onClick={() => void insertBeat()}><Plus className="mr-2 h-4 w-4" />Add to playlist</Button></div><div className="overflow-x-auto"><div className="min-w-[780px] space-y-2">{DRUMS.map(drum => <div key={drum} className="grid grid-cols-[90px_repeat(16,1fr)] gap-1"><span className="py-2 text-sm font-medium">{drum}</span>{steps[drum].map((active, index) => <button key={index} aria-label={`${drum} step ${index + 1}`} onClick={() => setSteps(current => ({ ...current, [drum]: current[drum].map((value, i) => i === index ? !value : value) }))} className={`aspect-square rounded ${active ? 'bg-primary shadow-[0_0_12px_hsl(var(--primary)/.55)]' : index % 4 === 0 ? 'bg-muted-foreground/30' : 'bg-muted'}`} />)}</div>)}<div className="my-3 border-t border-border" />{MELODY_NOTES.map(note => <div key={note.name} className="grid grid-cols-[90px_repeat(16,1fr)] gap-1"><span className="py-2 text-sm font-medium text-primary">{note.name}</span>{melodySteps[note.name].map((active, index) => <button key={index} aria-label={`${note.name} step ${index + 1}`} onClick={() => setMelodySteps(current => ({ ...current, [note.name]: current[note.name].map((value, i) => i === index ? !value : value) }))} className={`aspect-square rounded ${active ? 'bg-accent shadow-[0_0_12px_hsl(var(--accent)/.55)]' : index % 4 === 0 ? 'bg-muted-foreground/30' : 'bg-muted'}`} />)}</div>)}</div></div></>}
        {beatMode === 'ai' && <div><div className="mb-4 flex items-center gap-3"><Button size="sm" variant="ghost" onClick={() => setBeatMode('choice')}><ArrowLeft className="mr-2 h-4 w-4" />Methods</Button><div><h2 className="font-bold">MusicInsta AI beat generator</h2><p className="text-xs text-muted-foreground">Your generated beat stays in the DAW until you add it to the playlist.</p></div></div><textarea value={aiBeatPrompt} onChange={event => setAiBeatPrompt(event.target.value)} placeholder="Describe the rhythm, instruments and vibe…" className="min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs text-muted-foreground">Genre<Input className="mt-1" value={aiBeatGenre} onChange={event => setAiBeatGenre(event.target.value)} /></label><label className="text-xs text-muted-foreground">Mood<Input className="mt-1" value={aiBeatMood} onChange={event => setAiBeatMood(event.target.value)} /></label><label className="text-xs text-muted-foreground">BPM<Input className="mt-1" type="number" min={60} max={180} value={bpm} onChange={event => setBpm(Math.max(60, Math.min(180, Number(event.target.value) || 60)))} /></label></div><div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={() => void generateAiBeat()} disabled={aiGenerating}>{aiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}{aiGenerating ? 'Generating beat…' : 'Generate beat'}</Button>{aiBeatUrl && <><audio src={aiBeatUrl} controls className="h-10 min-w-64 flex-1" /><Button onClick={() => void insertAiBeat()}><Plus className="mr-2 h-4 w-4" />Send to playlist</Button></>}</div></div>}
      </section>}

      <main className="mx-auto max-w-[1600px] p-3 lg:p-6">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
            <Button onClick={togglePlayback}>{isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{isPlaying ? 'Pause' : 'Play mix'}</Button>
            <Button variant={isRecording ? 'destructive' : 'outline'} disabled={isFinalizingRecording} onClick={() => void toggleRecording()}>{isRecording ? <Square className="mr-2 h-4 w-4" /> : isFinalizingRecording ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}{isRecording ? 'Stop recording' : 'Record overdub'}</Button>
            <select aria-label="Recording microphone" value={microphoneId} onChange={event => setMicrophoneId(event.target.value)} className="h-10 max-w-52 rounded-md border border-input bg-background px-3 text-sm"><option value="">Default microphone</option>{microphones.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${microphones.indexOf(device) + 1}`}</option>)}</select>
            {isFinalizingRecording && <span className="text-xs text-muted-foreground">Finishing the recorded take…</span>}
            <Button asChild variant="outline"><label className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Upload audio<input multiple type="file" accept="audio/*" className="hidden" onChange={event => void handleFiles(event.target.files)} /></label></Button>
            <Button variant="outline" onClick={() => void addEmptyTrack()}><Plus className="mr-2 h-4 w-4" />Empty track</Button>
            <Button variant="ghost" size="icon" aria-label="Undo" disabled={!canUndo} onClick={undo}><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Redo" disabled={!canRedo} onClick={redo}><Redo2 className="h-4 w-4" /></Button>
            <Button variant="outline" disabled={!tracks.length} onClick={splitSelected}><Scissors className="mr-2 h-4 w-4" />Split selected</Button>
            <Button variant={mixerOpen ? 'secondary' : 'outline'} onClick={() => { setMixerOpen(true); setMixerMinimized(false); }}><SlidersHorizontal className="mr-2 h-4 w-4" />Mixer</Button>
            <span className="text-xs text-muted-foreground">Spacebar plays/pauses · Ctrl-click selects multiple clips</span>
            <span className="ml-auto tabular-nums text-sm text-muted-foreground">{playhead.toFixed(2)}s</span>
            <ZoomIn className="h-4 w-4 text-muted-foreground" /><Slider className="w-28" min={35} max={180} value={[zoom]} onValueChange={value => setZoom(value[0])} />
          </div>
          {isRecording && <div className="flex h-16 items-end gap-1 rounded-xl border border-destructive/30 bg-destructive/5 p-3">{recordingLevels.map((level, index) => <span key={index} className="flex-1 rounded-t bg-destructive transition-all" style={{ height: `${Math.max(4, level / 3)}%` }} />)}</div>}
          <div ref={timelineScrollRef} data-testid="daw-playlist-scroll" className="overflow-x-auto rounded-2xl border border-border bg-card">
            <div style={{ width: 240 + timelineWidth }}>
              <div className="grid grid-cols-[240px_1fr] border-b border-border text-xs uppercase tracking-widest text-muted-foreground"><div className="p-3">Playlist tracks</div><div data-testid="daw-timeline-ruler" className="relative h-12 cursor-pointer bg-muted/30" onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); seekPlayhead((event.clientX - bounds.left) / zoom); }}>{Array.from({ length: Math.ceil(timelineDuration / 5) + 1 }, (_, i) => <span key={i} className="pointer-events-none absolute top-2" style={{ left: i * 5 * zoom }}>{i * 5}s</span>)}</div></div>
              {tracks.length === 0 && <div className="w-[calc(100vw-2rem)] p-14 text-center text-muted-foreground">Upload audio, build a beat, or record a synchronized overdub to begin.</div>}
              {tracks.map((track, index) => <div key={track.id} className="grid grid-cols-[240px_1fr] border-b border-border">
                <div className="space-y-3 border-r border-border p-3">
                  <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded text-xs text-white" style={{ backgroundColor: track.color }}>{index + 1}</span><input value={track.name} onChange={event => updateTrack(track.id, { name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" /><input aria-label="Track color" type="color" value={track.color} onChange={event => updateTrack(track.id, { color: event.target.value })} className="h-6 w-6 rounded border-0 bg-transparent p-0" /><button onClick={() => { rememberTracks(); setTracks(current => current.filter(item => item.id !== track.id)); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></button></div>
                  <div className="flex gap-1"><button title="Mute" onClick={() => updateAudibility(track.id, 'muted')} className={`rounded px-2 py-1 text-xs ${track.muted ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>M</button><button title="Solo this track and mute all others" onClick={() => updateAudibility(track.id, 'solo')} className={`rounded px-2 py-1 text-xs ${track.solo ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>S</button><button title="Move track up" onClick={() => moveTrack(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></button><button title="Move track down" onClick={() => moveTrack(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></button><button title="Enhance track" onClick={() => void enhance(track)}><Sparkles className="h-3.5 w-3.5 text-primary" /></button></div>
                </div>
                <div className="relative h-24 overflow-hidden" style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)', backgroundSize: `${zoom}px 100%` }}><div data-testid="daw-playhead" className="absolute inset-y-0 z-20 w-0.5 bg-primary" style={{ left: playhead * zoom }} /><div onPointerDown={event => dragClip(track, event)} className={`absolute top-3 h-16 cursor-grab overflow-hidden rounded-lg border-2 shadow-sm ${selectedTrackIds.has(track.id) ? 'border-white ring-2 ring-primary' : 'border-white/20'} ${track.muted ? 'opacity-35' : ''}`} style={{ left: track.offset * zoom, width: Math.max(18, track.length * zoom), background: `linear-gradient(90deg, ${track.color}, ${track.color}bb)` }}><button data-resize="true" aria-label="Trim clip start" onPointerDown={event => resizeClip(track, 'left', event)} className="absolute inset-y-0 left-0 z-10 w-3 cursor-ew-resize bg-white/25" /><Waveform buffer={track.buffer} color={track.color} /><span className="absolute left-4 top-1 text-[10px] font-medium text-white drop-shadow">{track.name}</span><button data-resize="true" aria-label="Trim clip end" onPointerDown={event => resizeClip(track, 'right', event)} className="absolute inset-y-0 right-0 z-10 w-3 cursor-ew-resize bg-white/25" /></div></div>
              </div>)}
            </div>
          </div>
        </section>
      </main>

      {mixerOpen && <DawMixerPopup
        tracks={tracks}
        minimized={mixerMinimized}
        masterGain={masterGain}
        compression={compression}
        masterDelay={masterDelay}
        onMinimize={() => setMixerMinimized(true)}
        onRestore={() => setMixerMinimized(false)}
        onClose={() => { setMixerOpen(false); setMixerMinimized(false); }}
        onUpdateTrack={(id, patch) => updateTrack(id, patch as Partial<DawTrack>)}
        onToggleAudibility={updateAudibility}
        onMasterGainChange={setMasterGain}
        onCompressionChange={setCompression}
        onMasterDelayChange={setMasterDelay}
        onEnhance={trackId => void enhance(trackId ? tracks.find(track => track.id === trackId) : undefined)}
      />}
    </div>
  );
}
