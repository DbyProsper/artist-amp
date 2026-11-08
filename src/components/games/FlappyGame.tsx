import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Award, CheckCircle2, Lock, Pause, Play, RefreshCw, Volume2, VolumeX, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createGameSession, saveGamePreferences, submitGameResult, type GameProfile } from '@/lib/games/gameApi';
import {
  FLAPPY_ENVIRONMENTS, FLAPPY_BRAND, loadFlappyAssets, type FlappyEnvironmentId, type LoadedFlappyAssets,
} from '@/lib/games/flappyAssets';
import {
  advanceFlappyRun, beginFlappyRun, createFlappyRun, difficultyAt, flapRun, FLAPPY_HEIGHT, FLAPPY_RULESET_VERSION,
  FLAPPY_STEP, FLAPPY_TARGETS, FLAPPY_WIDTH, levelTarget, mascotTilt, type FlappyRun, type FlappyRunStatus,
} from '@/lib/games/flappyEngine';

type RewardGrant = { points: number; kind: string; amount: number };
type VerificationStatus = 'idle' | 'pending' | 'verified' | 'error';

interface FlappyGameProps {
  profile: GameProfile;
  onExit: () => void;
  onVerified: (profile: GameProfile, grants: RewardGrant[]) => void;
}

interface HudState {
  gatesCleared: number;
  baseScore: number;
  bonusScore: number;
  totalRunScore: number;
}

const EMPTY_HUD: HudState = { gatesCleared: 0, baseScore: 0, bonusScore: 0, totalRunScore: 0 };
const ENVIRONMENT_KEY = 'musicinsta:flappy-environment';
const SOUND_KEY = 'musicinsta:flappy-sound';

export function FlappyGame({ profile, onExit, onVerified }: FlappyGameProps) {
  const reduceMotion = useReducedMotion();
  const savedEnvironment = profile.preferences?.flappyEnvironment as FlappyEnvironmentId | undefined;
  const [environmentId, setEnvironmentId] = useState<FlappyEnvironmentId>(() => savedEnvironment || readEnvironment());
  const [sound, setSound] = useState(() => profile.preferences?.flappySound ?? localStorage.getItem(SOUND_KEY) === '1');
  const [level, setLevel] = useState(Math.min(10, profile.progress.flappy?.unlocked || 1));
  const [localUnlocked, setLocalUnlocked] = useState(Math.min(10, profile.progress.flappy?.unlocked || 1));
  const [status, setStatus] = useState<FlappyRunStatus | 'loading'>('loading');
  const [assets, setAssets] = useState<LoadedFlappyAssets | null>(null);
  const [assetError, setAssetError] = useState(false);
  const [assetAttempt, setAssetAttempt] = useState(0);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [countdown, setCountdown] = useState(0);
  const [verification, setVerification] = useState<VerificationStatus>('idle');
  const [verifiedPoints, setVerifiedPoints] = useState(0);
  const [collectionBurst, setCollectionBurst] = useState<{ value: 2 | 4; x: number; y: number; key: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<FlappyRun | null>(null);
  const statusRef = useRef<typeof status>(status);
  const assetsRef = useRef<LoadedFlappyAssets | null>(null);
  const environmentRef = useRef(environmentId);
  const soundRef = useRef(sound);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);
  const accumulatorRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const sessionRef = useRef('');
  const flapTimesRef = useRef<number[]>([]);
  const verifyingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPickupTotalRef = useRef(0);

  const environment = FLAPPY_ENVIRONMENTS[environmentId];
  const target = levelTarget(level);
  const personalBest = profile.progress.flappy?.best || 0;

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { environmentRef.current = environmentId; }, [environmentId]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { setLocalUnlocked(Math.min(10, profile.progress.flappy?.unlocked || 1)); }, [profile.progress.flappy?.unlocked]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }, []);

  const stopLoop = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    lastFrameRef.current = 0;
    accumulatorRef.current = 0;
  }, []);

  useEffect(() => {
    let active = true;
    stopLoop();
    clearTimers();
    setStatus('loading');
    setAssetError(false);
    setAssets(null);
    void loadFlappyAssets(environmentId)
      .then(loaded => {
        if (!active) return;
        setAssets(loaded);
        const preview = createFlappyRun(`preview-${environmentId}-${level}`, level);
        runRef.current = preview;
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setAssetError(true);
        setStatus('loading');
      });
    return () => { active = false; };
  }, [assetAttempt, clearTimers, environmentId, level, stopLoop]);

  const playTone = useCallback((frequency: number, duration = .07, gainValue = .028) => {
    if (!soundRef.current) return;
    const AudioContextType = window.AudioContext;
    if (!AudioContextType) return;
    const context = audioContextRef.current || new AudioContextType();
    audioContextRef.current = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, []);

  const syncHud = useCallback((run: FlappyRun) => {
    setHud(current => current.gatesCleared === run.gatesCleared && current.totalRunScore === run.totalRunScore
      ? current
      : { gatesCleared: run.gatesCleared, baseScore: run.baseScore, bonusScore: run.bonusScore, totalRunScore: run.totalRunScore });
    if (run.bonusScore > lastPickupTotalRef.current) {
      const collected = run.pickups.find(pickup => pickup.collected);
      const value = (run.bonusScore - lastPickupTotalRef.current) as 2 | 4;
      lastPickupTotalRef.current = run.bonusScore;
      setCollectionBurst({ value, x: collected?.x || 82, y: collected?.y || run.y, key: Date.now() });
      playTone(value === 4 ? 880 : 660, .12, .04);
      timersRef.current.push(window.setTimeout(() => setCollectionBurst(null), 600));
    }
  }, [playTone]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const run = runRef.current;
    const loaded = assetsRef.current;
    if (!canvas || !run || !loaded) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const difficulty = difficultyAt(run.level, run.gatesCleared);
    context.clearRect(0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
    context.drawImage(loaded.far, 0, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
    drawTiledLayer(context, loaded.mid, -(run.time * difficulty.speed * .06) % FLAPPY_WIDTH, .82);
    drawTiledLayer(context, loaded.near, -(run.time * difficulty.speed * .13) % FLAPPY_WIDTH, .92);

    for (const obstacle of run.obstacles) {
      const visualX = obstacle.x - 5;
      const visualWidth = 68;
      const topHeight = Math.max(36, obstacle.gapCenter - difficulty.gap / 2);
      const bottomY = obstacle.gapCenter + difficulty.gap / 2;
      context.save();
      context.translate(visualX + visualWidth / 2, topHeight / 2);
      context.rotate(Math.PI);
      context.drawImage(loaded.obstacleTop, -visualWidth / 2, -topHeight / 2, visualWidth, topHeight + 8);
      context.restore();
      context.drawImage(loaded.obstacleBottom, visualX, bottomY - 8, visualWidth, FLAPPY_HEIGHT - bottomY + 12);
    }

    for (const pickup of run.pickups) {
      if (pickup.collected) continue;
      const image = pickup.value === 4 ? loaded.note4 : loaded.note2;
      const size = pickup.value === 4 ? 34 : 30;
      context.save();
      context.globalAlpha = .78 + Math.sin(run.time * 7 + pickup.id) * .18;
      context.drawImage(image, pickup.x - size / 2, pickup.y - size / 2, size, size);
      context.restore();
    }

    if (run.status === 'playing') {
      for (let index = 3; index > 0; index -= 1) {
        context.beginPath();
        context.fillStyle = `rgba(244,114,182,${.07 * index})`;
        context.arc(82 - index * 9, run.y + index * 2, 4 + index, 0, Math.PI * 2);
        context.fill();
      }
    }

    const mascot = run.status === 'failed' ? loaded.mascotFall : run.flapPulse > 0 ? loaded.mascotFlap : loaded.mascotIdle;
    const bob = run.status === 'ready' && !reduceMotion ? Math.sin(Date.now() / 320) * 5 : 0;
    const tilt = run.status === 'ready' ? -6 : mascotTilt(run);
    const squash = run.flapPulse > 0 && !reduceMotion ? 1.08 : 1;
    context.save();
    context.translate(82, run.y + bob);
    context.rotate(tilt * Math.PI / 180);
    context.scale(squash, 1 / squash);
    context.drawImage(mascot, -31, -31, 62, 62);
    context.restore();
  }, [reduceMotion]);

  const verifyCompletion = useCallback(async (run: FlappyRun) => {
    if (!sessionRef.current || verifyingRef.current) {
      if (!sessionRef.current) setVerification('error');
      return;
    }
    verifyingRef.current = true;
    setVerification('pending');
    try {
      const response = await submitGameResult({
        sessionId: sessionRef.current,
        game: 'flappy',
        level: run.level,
        score: run.totalRunScore,
        durationMs: Math.round(run.time * 1000),
        completed: true,
        actions: flapTimesRef.current,
        rulesetVersion: FLAPPY_RULESET_VERSION,
      });
      setVerifiedPoints(response.pointsAwarded);
      setVerification('verified');
      onVerified(response.profile, response.milestones);
      toast.success(`${response.pointsAwarded} verified reward points earned.`);
    } catch (error) {
      setVerification('error');
      toast.error(error instanceof Error ? error.message : 'Reward verification pending.');
    } finally {
      verifyingRef.current = false;
    }
  }, [onVerified]);

  const gameLoop = useCallback((now: number) => {
    const run = runRef.current;
    if (!run || statusRef.current !== 'playing') return;
    if (!lastFrameRef.current) lastFrameRef.current = now;
    const elapsed = Math.min(.05, (now - lastFrameRef.current) / 1000);
    lastFrameRef.current = now;
    accumulatorRef.current += elapsed;
    while (accumulatorRef.current >= FLAPPY_STEP && run.status === 'playing') {
      advanceFlappyRun(run, FLAPPY_STEP);
      accumulatorRef.current -= FLAPPY_STEP;
    }
    syncHud(run);
    draw();
    if (run.status === 'failed') {
      stopLoop();
      setStatus('failed');
      playTone(145, .18, .045);
      return;
    }
    if (run.status === 'completed') {
      stopLoop();
      setStatus('completed');
      setLocalUnlocked(current => Math.min(10, Math.max(current, run.level + 1)));
      playTone(784, .24, .05);
      void verifyCompletion(run);
      return;
    }
    frameRef.current = window.requestAnimationFrame(gameLoop);
  }, [draw, playTone, stopLoop, syncHud, verifyCompletion]);

  const runCountdown = useCallback((after: () => void) => {
    clearTimers();
    setCountdown(3);
    [2, 1].forEach((value, index) => timersRef.current.push(window.setTimeout(() => setCountdown(value), (index + 1) * 550)));
    timersRef.current.push(window.setTimeout(() => { setCountdown(0); after(); }, 1_650));
  }, [clearTimers]);

  const startRun = useCallback(async () => {
    if (!assetsRef.current) return;
    stopLoop();
    clearTimers();
    setVerification('idle');
    setVerifiedPoints(0);
    verifyingRef.current = false;
    flapTimesRef.current = [];
    lastPickupTotalRef.current = 0;
    setHud(EMPTY_HUD);
    let seed = `offline-${Date.now()}-${level}`;
    sessionRef.current = '';
    try {
      const session = await createGameSession('flappy', level, `flappy-v2-${level}-${Date.now()}`);
      sessionRef.current = session.sessionId;
      seed = session.seed;
    } catch {
      toast.info('Playing offline. Reward verification will remain pending until a verified run is available.');
    }
    const run = createFlappyRun(seed, level);
    runRef.current = run;
    setStatus('ready');
    draw();
    runCountdown(() => {
      beginFlappyRun(run);
      statusRef.current = 'playing';
      setStatus('playing');
      lastFrameRef.current = 0;
      accumulatorRef.current = 0;
      frameRef.current = window.requestAnimationFrame(gameLoop);
    });
  }, [clearTimers, draw, gameLoop, level, runCountdown, stopLoop]);

  const handleFlap = useCallback(() => {
    const run = runRef.current;
    if (!run || !flapRun(run)) return;
    const at = Math.round(run.time * 1000);
    const previous = flapTimesRef.current.at(-1) ?? -1;
    if (at > previous) flapTimesRef.current.push(at);
    playTone(520);
  }, [playTone]);

  const pause = useCallback(() => {
    const run = runRef.current;
    if (!run || run.status !== 'playing') return;
    run.status = 'paused';
    statusRef.current = 'paused';
    stopLoop();
    setStatus('paused');
  }, [stopLoop]);

  const resume = useCallback(() => {
    const run = runRef.current;
    if (!run || run.status !== 'paused') return;
    runCountdown(() => {
      run.status = 'playing';
      statusRef.current = 'playing';
      setStatus('playing');
      lastFrameRef.current = 0;
      accumulatorRef.current = 0;
      frameRef.current = window.requestAnimationFrame(gameLoop);
    });
  }, [gameLoop, runCountdown]);

  const chooseEnvironment = useCallback((next: FlappyEnvironmentId) => {
    if (statusRef.current === 'playing') return;
    setEnvironmentId(next);
    localStorage.setItem(ENVIRONMENT_KEY, next);
    void saveGamePreferences({ flappyEnvironment: next }).catch(() => undefined);
  }, []);

  const toggleSound = useCallback(() => {
    setSound(current => {
      const next = !current;
      localStorage.setItem(SOUND_KEY, next ? '1' : '0');
      void saveGamePreferences({ flappySound: next }).catch(() => undefined);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      handleFlap();
    };
    const onVisibility = () => { if (document.hidden) pause(); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [handleFlap, pause]);

  useEffect(() => {
    draw();
  }, [assets, draw, status, environmentId]);

  useEffect(() => () => {
    stopLoop();
    clearTimers();
    if (audioContextRef.current) void audioContextRef.current.close();
  }, [clearTimers, stopLoop]);

  const selectLevel = (next: number) => {
    if (next > localUnlocked || status === 'playing') return;
    stopLoop();
    clearTimers();
    setLevel(next);
    setHud(EMPTY_HUD);
    setVerification('idle');
  };

  const nextLevel = () => {
    const next = Math.min(10, level + 1);
    selectLevel(next);
  };

  const overlay = useMemo(() => {
    if (status === 'loading') return null;
    if (status === 'playing') return null;
    if (countdown > 0) return <Overlay title={String(countdown)} body="Get ready…" />;
    if (status === 'ready') return <Overlay title={`Level ${level}`} body={`Clear ${target} gates. Tap, click, or press Space to flap.`}><Button size="lg" onClick={event => { event.stopPropagation(); void startRun(); }}><Play className="mr-2 h-5 w-5"/>Start run</Button></Overlay>;
    if (status === 'paused') return <Overlay title="Paused" body="Physics and scoring are frozen."><Button size="lg" onClick={event => { event.stopPropagation(); resume(); }}><Play className="mr-2 h-5 w-5"/>Resume</Button></Overlay>;
    if (status === 'failed') return <Overlay icon={<XCircle className="h-12 w-12 text-rose-400"/>} title="Run ended" body={`You cleared ${hud.gatesCleared} of ${target} gates.`}><Button size="lg" onClick={event => { event.stopPropagation(); void startRun(); }}><RefreshCw className="mr-2 h-5 w-5"/>Replay</Button></Overlay>;
    return null;
  }, [countdown, hud.gatesCleared, level, resume, startRun, status, target]);

  return (
    <main className="min-h-screen bg-[#09070d] pb-12 text-white">
      <header className="sticky top-0 z-50 border-b border-fuchsia-500/20 bg-[#0b0910]/95 px-4 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3">
          <button onClick={onExit} aria-label="Back to Games" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-pink-400"><ArrowLeft className="h-5 w-5"/></button>
          <img src={FLAPPY_BRAND.logo} alt="MusicInsta" className="h-11 w-auto object-contain"/>
          <div className="hidden h-7 w-px bg-white/20 sm:block"/>
          <h1 className="font-display text-base font-black sm:text-xl">Flappy Bird</h1>
          <div className="ml-auto flex gap-2">
            <button onClick={toggleSound} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 hover:border-pink-400/60">{sound?<Volume2 className="h-5 w-5"/>:<VolumeX className="h-5 w-5"/>}</button>
            <button onClick={pause} disabled={status !== 'playing'} aria-label="Pause game" className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 hover:border-pink-400/60 disabled:opacity-35"><Pause className="h-5 w-5"/></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 p-3 sm:p-5 lg:grid-cols-[minmax(420px,1fr)_320px] lg:items-start">
        <section className="min-w-0">
          <div
            className="relative mx-auto aspect-[360/560] w-full max-w-[560px] touch-none overflow-hidden rounded-[24px] border-2 bg-[#130c20] shadow-[0_0_55px_rgba(236,72,153,.18)]"
            style={{ borderColor: environment.accent }}
            onPointerDown={event => { event.preventDefault(); handleFlap(); }}
          >
            <canvas ref={canvasRef} width={FLAPPY_WIDTH} height={FLAPPY_HEIGHT} className="h-full w-full" aria-label="MusicInsta Flappy game playfield"/>
            <div className="pointer-events-none absolute inset-x-3 top-3 z-20 grid grid-cols-3 gap-2 text-center text-[11px] font-bold sm:text-xs">
              <div className="rounded-full border border-white/15 bg-black/55 px-2 py-2 backdrop-blur">Level {level}</div>
              <div className="rounded-full border border-white/15 bg-black/55 px-2 py-2 backdrop-blur">Gates {hud.gatesCleared}/{target}</div>
              <div className="rounded-full border border-white/15 bg-black/55 px-2 py-2 backdrop-blur">Score {hud.totalRunScore}</div>
            </div>

            {collectionBurst && <motion.div key={collectionBurst.key} initial={{ opacity: 1, y: 0, scale: .8 }} animate={{ opacity: 0, y: -34, scale: 1.2 }} transition={{ duration: .55 }} className={`pointer-events-none absolute z-30 text-2xl font-black ${collectionBurst.value===4?'text-amber-300':'text-pink-300'}`} style={{ left: `${collectionBurst.x / FLAPPY_WIDTH * 100}%`, top: `${collectionBurst.y / FLAPPY_HEIGHT * 100}%` }}>+{collectionBurst.value}</motion.div>}
            {overlay}
            {status === 'completed' && <CompletionOverlay reduceMotion={Boolean(reduceMotion)} level={level} hud={hud} verification={verification} verifiedPoints={verifiedPoints} onRetry={() => runRef.current && void verifyCompletion(runRef.current)} onReplay={() => void startRun()} onNext={nextLevel} onChoose={() => { setStatus('ready'); setVerification('idle'); }} hasNext={level < 10}/>} 
          </div>
          <div className="mx-auto mt-3 flex max-w-[560px] items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold text-white/80">Tap, click, or press Space to flap.</div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <div className="flex items-center justify-between"><h2 className="font-bold">Level progression</h2><span className="text-xs text-white/55">Best {personalBest}</span></div>
            <div className="mt-3 grid grid-cols-5 gap-2">{FLAPPY_TARGETS.map((gateTarget,index)=>{const value=index+1;const locked=value>localUnlocked;return <button key={value} disabled={locked||status==='playing'} onClick={()=>selectLevel(value)} className={`relative h-11 rounded-xl border text-sm font-bold transition ${value===level?'border-pink-400 bg-pink-500/20':'border-white/10 bg-black/20 hover:border-pink-400/45'} disabled:opacity-35`}>{locked?<Lock className="mx-auto h-3.5 w-3.5"/>:value}<span className="sr-only">{gateTarget} gates</span></button>;})}</div>
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-black/25 p-3"><Award className="mt-0.5 h-5 w-5 text-pink-400"/><div><p className="text-sm font-semibold">{target} gates to complete</p><p className="text-xs leading-5 text-white/55">Difficulty rises smoothly as you approach the final gate. Bonus notes raise score, not gate progress.</p></div></div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
            <h2 className="font-bold">Environment</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-1">{Object.values(FLAPPY_ENVIRONMENTS).map(item=><button key={item.id} disabled={status==='playing'} onClick={()=>chooseEnvironment(item.id)} className={`group overflow-hidden rounded-xl border text-left transition ${item.id===environmentId?'border-pink-400 ring-1 ring-pink-400':'border-white/10 hover:border-pink-400/50'} disabled:opacity-45`}><div className="relative aspect-[16/8] overflow-hidden lg:aspect-[16/6]"><img src={item.preview} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/><span className="absolute bottom-2 left-2 text-xs font-bold">{item.name}</span>{item.id===environmentId&&<CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-pink-300"/>}</div></button>)}</div>
            <p className="mt-3 text-xs leading-5 text-white/55">{environment.description}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center"><ScoreStat label="Base" value={hud.baseScore}/><ScoreStat label="Bonus" value={hud.bonusScore}/><ScoreStat label="Total" value={hud.totalRunScore}/></div>
            <p className="mt-3 text-xs leading-5 text-white/50">Run score, verified reward points and AI Studio credits remain separate.</p>
          </section>
        </aside>
      </div>

      {status === 'loading' && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#09070d] p-6"><div className="text-center"><img src={FLAPPY_BRAND.symbol} alt="MusicInsta" className="mx-auto h-28 w-28 object-contain"/>{assetError?<><h2 className="mt-4 text-xl font-bold">This environment could not load</h2><p className="mt-2 text-sm text-white/60">Check your connection and retry without losing progress.</p><div className="mt-5 flex justify-center gap-2"><Button onClick={()=>setAssetAttempt(value=>value+1)}>Retry assets</Button><Button variant="outline" onClick={onExit}>Exit</Button></div></>:<><div className="mx-auto mt-4 h-6 w-6 animate-spin rounded-full border-2 border-pink-400 border-t-transparent"/><p className="mt-3 text-sm text-white/65">Loading {environment.name}…</p></>}</div></div>}
    </main>
  );
}

function Overlay({ title, body, icon, children }: { title: string; body: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return <div className="absolute inset-0 z-30 grid place-items-center bg-black/48 p-6 text-center backdrop-blur-[2px]" onPointerDown={event=>event.stopPropagation()}><motion.div initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm rounded-3xl border border-white/15 bg-[#160d22]/90 p-6 shadow-2xl">{icon}<h2 className="mt-2 text-3xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-white/70">{body}</p>{children&&<div className="mt-5 flex justify-center">{children}</div>}</motion.div></div>;
}

function CompletionOverlay({ reduceMotion, level, hud, verification, verifiedPoints, onRetry, onReplay, onNext, onChoose, hasNext }: { reduceMotion:boolean;level:number;hud:HudState;verification:VerificationStatus;verifiedPoints:number;onRetry:()=>void;onReplay:()=>void;onNext:()=>void;onChoose:()=>void;hasNext:boolean }) {
  const confetti = useMemo(()=>Array.from({length:28},(_,index)=>({left:(index*37)%100,delay:(index%7)*.06,color:['#ff4fb8','#a855f7','#ffd046'][index%3],rotate:(index*53)%180})),[]);
  return <div className="absolute inset-0 z-40 grid place-items-center overflow-hidden bg-black/62 p-4 backdrop-blur-sm" onPointerDown={event=>event.stopPropagation()}>{!reduceMotion&&<div className="pointer-events-none absolute inset-0">{confetti.map((item,index)=><motion.span key={index} initial={{y:-40,opacity:0,rotate:0}} animate={{y:600,opacity:[0,1,1,0],rotate:item.rotate+360}} transition={{duration:2.2,delay:item.delay,ease:'easeOut'}} className="absolute top-0 h-3 w-2 rounded-sm" style={{left:`${item.left}%`,background:item.color}}/>)}</div>}<motion.section initial={{opacity:0,scale:.86}} animate={{opacity:1,scale:1}} className="relative w-full max-w-sm rounded-3xl border border-pink-400/55 bg-[#160d22]/95 p-5 text-center shadow-[0_0_70px_rgba(236,72,153,.35)]"><img src={FLAPPY_BRAND.effects.partyPopper} alt="" className="mx-auto h-16 w-16"/><h2 className="mt-1 text-3xl font-black">Level complete!</h2><p className="mt-1 text-sm text-white/65">Level {level} cleared. The next challenge is ready.</p><div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm"><div className="flex justify-between"><span>Base (gates)</span><b>{hud.baseScore}</b></div><div className="flex justify-between"><span>Bonus (pickups)</span><b>{hud.bonusScore}</b></div><div className="flex justify-between border-t border-white/10 pt-2 text-base"><span>Total run score</span><b className="text-pink-300">{hud.totalRunScore}</b></div></div><p className={`mt-3 text-xs font-semibold ${verification==='verified'?'text-emerald-300':verification==='error'?'text-amber-300':'text-white/60'}`}>{verification==='pending'?'Reward verification pending…':verification==='verified'?`${verifiedPoints} verified reward points added.`:verification==='error'?'Reward verification pending. Your session can be retried safely.':'Preparing reward verification…'}</p>{verification==='error'&&<Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>Retry verification</Button>}<div className="mt-4 grid gap-2">{hasNext&&<Button onClick={onNext}><Play className="mr-2 h-4 w-4"/>Next level</Button>}<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={onReplay}><RefreshCw className="mr-2 h-4 w-4"/>Replay</Button><Button variant="outline" onClick={onChoose}>Environment</Button></div></div></motion.section></div>;
}

function ScoreStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-black/25 p-2"><b className="block text-lg text-pink-300">{value}</b><span className="text-[10px] uppercase tracking-wider text-white/45">{label}</span></div>;
}

function drawTiledLayer(context: CanvasRenderingContext2D, image: HTMLImageElement, offset: number, opacity: number) {
  context.save();
  context.globalAlpha = opacity;
  context.drawImage(image, offset, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
  context.drawImage(image, offset + FLAPPY_WIDTH, 0, FLAPPY_WIDTH, FLAPPY_HEIGHT);
  context.restore();
}

function readEnvironment(): FlappyEnvironmentId {
  const value = localStorage.getItem(ENVIRONMENT_KEY);
  return value === 'neon-studio' || value === 'jozi-skyline' || value === 'cosmic-groove' ? value : 'cosmic-groove';
}
